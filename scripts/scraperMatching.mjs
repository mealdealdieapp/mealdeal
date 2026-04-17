/**
 * MealDeal — Ingredient Pre-Matching (für Scraper)
 *
 * Beim Scrape werden alle Angebote direkt gegen die Ingredients-Tabelle
 * gematcht. Die Ergebnisse landen in `offer_ingredient_matches`.
 *
 * Das spart pro App-Laufzeit-Rendering Dutzende ms bei 1000+ Angeboten.
 *
 * Algorithmus:
 *  1) Normalisieren: lowercase, Punkt/Komma raus, Tokens
 *  2) Synonym-Lookup (ingredient_synonyms Tabelle)
 *  3) Exact Match: Token = Ingredient-Name
 *  4) Partial Match: Token beginnt mit Ingredient-Name (z.B. "rinder" → "rind")
 *  5) Blacklist: Wenn Produkt klar Non-Match ist (z.B. "Rind" nicht in "Rinderbrühwürfel")
 *
 * Score:
 *   1.0 = exact match
 *   0.85 = synonym match
 *   0.7 = partial / token-based
 *   < 0.5 wird verworfen
 */

// ------------------------------------------------------------
// Blacklist: Wörter, die ein Match entwerten
// ------------------------------------------------------------
const BLACKLIST_TOKENS = new Set([
  'brühe', 'brühwürfel', 'brühpulver', 'würze', 'aroma', 'geschmack',
  'suppe', 'dose', 'konserve', 'sauce', 'soße', 'dressing',
  'pulver', 'extrakt', 'öl', 'essenz',
  'fertig', 'mikrowelle', 'instant',
])

// ------------------------------------------------------------
// TOKENIZE
// ------------------------------------------------------------
function tokenize(text) {
  if (!text) return []
  return text.toLowerCase()
    .replace(/[,.()!:;\-–—/+*'"]/g, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)
}

// ------------------------------------------------------------
// MATCHER FACTORY
// ------------------------------------------------------------
/**
 * Erstellt einen Matcher mit vorbereiteten Ingredient-Lookup-Maps.
 * Wird einmal pro Scrape-Lauf gebaut.
 *
 * @param {Array} ingredients - Array von { id, name, category }
 * @param {Array} synonyms - Array von { ingredient_id, synonym }
 * @returns {Function} matcher(productName) → [{ ingredient_id, score, reason }]
 */
export function buildMatcher(ingredients, synonyms = []) {
  // Ingredients per Name und per erstem Token
  const byName = new Map()      // "rind" → id
  const byToken = new Map()     // "rinder" → [ids] (prefix-matches)
  const bySynonym = new Map()   // "huhn" → ingredient_id

  for (const ing of ingredients) {
    const name = (ing.name || '').toLowerCase().trim()
    if (!name) continue
    byName.set(name, ing)
    // Token-Prefix-Index: alle Sub-Strings ab 3 Zeichen
    for (let len = 3; len <= Math.min(name.length, 8); len++) {
      const prefix = name.slice(0, len)
      if (!byToken.has(prefix)) byToken.set(prefix, [])
      byToken.get(prefix).push(ing)
    }
  }

  for (const syn of synonyms) {
    const s = (syn.synonym || '').toLowerCase().trim()
    if (!s) continue
    // Support both canonical (text name) and ingredient_id (uuid) lookups
    const ing = syn.canonical
      ? ingredients.find(i => i.name.toLowerCase() === syn.canonical.toLowerCase())
      : ingredients.find(i => i.id === syn.ingredient_id)
    if (ing) bySynonym.set(s, ing)
  }

  /**
   * Match einen Produktnamen gegen die Ingredient-Liste.
   * Liefert alle Matches mit Score.
   */
  return function matchProduct(productName) {
    if (!productName) return []
    const lower = productName.toLowerCase()
    const tokens = tokenize(productName)
    if (!tokens.length) return []

    const matches = new Map() // ingredient_id → { score, reason }

    // Hat das Produkt einen Blacklist-Token? Dann max-Score runtersetzen.
    const hasBlacklist = tokens.some(t => BLACKLIST_TOKENS.has(t))
    const blacklistPenalty = hasBlacklist ? 0.3 : 0

    // --- 1) Synonym-Match (höchste Priorität nach Exact) ---
    for (const [syn, ing] of bySynonym) {
      if (lower.includes(syn)) {
        addMatch(matches, ing.id, 0.85 - blacklistPenalty, `synonym:${syn}`)
      }
    }

    // --- 2) Exact & Prefix Match ---
    for (const token of tokens) {
      // Exact name-match
      if (byName.has(token)) {
        addMatch(matches, byName.get(token).id, 1.0 - blacklistPenalty, 'exact')
        continue
      }
      // Prefix-Match: "rinder" startet mit "rind"
      for (let len = Math.min(token.length, 8); len >= 3; len--) {
        const prefix = token.slice(0, len)
        const candidates = byToken.get(prefix)
        if (!candidates) continue
        for (const cand of candidates) {
          const candName = cand.name.toLowerCase()
          // Token muss mit Ingredient-Name beginnen ODER Ingredient-Name mit Token
          if (token.startsWith(candName) || candName.startsWith(token)) {
            const ratio = Math.min(token.length, candName.length) / Math.max(token.length, candName.length)
            const score = 0.6 + ratio * 0.15  // 0.6..0.75
            addMatch(matches, cand.id, score - blacklistPenalty, `prefix:${token}`)
          }
        }
        break // Nur längsten Prefix betrachten
      }
    }

    // Filter: Score < 0.5 rauswerfen
    return Array.from(matches.entries())
      .map(([ingredient_id, m]) => ({ ingredient_id, ...m }))
      .filter(m => m.score >= 0.5)
      // Je Ingredient den besten Score behalten (schon per addMatch erledigt)
      .sort((a, b) => b.score - a.score)
      // Maximal Top-5 Matches pro Offer (Rest ist Rauschen)
      .slice(0, 5)
  }
}

function addMatch(map, id, score, reason) {
  const existing = map.get(id)
  if (!existing || existing.score < score) {
    map.set(id, { score: Math.round(score * 100) / 100, reason })
  }
}
