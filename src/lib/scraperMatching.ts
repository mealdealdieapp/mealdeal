/**
 * MealDeal — Ingredient Pre-Matching (Client-Side TypeScript-Port)
 *
 * Matcht Angebotsnamen gegen die Ingredients-Tabelle und schreibt
 * Ergebnisse in `offer_ingredient_matches`.
 *
 * Algorithmus identisch mit scripts/scraperMatching.mjs:
 *  1) Synonym-Lookup
 *  2) Exact Match (Token = Ingredient-Name)
 *  3) Prefix Match (Token beginnt mit Ingredient oder umgekehrt)
 *  4) Blacklist-Penalty für verarbeitete Produkte
 */

// Blacklist: Tokens die auf verarbeitete Produkte hinweisen → Score runter
const BLACKLIST_TOKENS = new Set([
  'brühe', 'brühwürfel', 'brühpulver', 'würze', 'aroma', 'geschmack',
  'suppe', 'dose', 'konserve', 'sauce', 'soße', 'dressing',
  'pulver', 'extrakt', 'öl', 'essenz',
  'fertig', 'mikrowelle', 'instant',
])

// Skip-Tokens: Adjektive/Modifier die beim Matching ignoriert werden sollen
// Diese Tokens allein sagen nichts über das Produkt aus
const SKIP_TOKENS = new Set([
  'bio', 'vegan', 'vegane', 'veganer', 'veganes',
  'deluxe', 'premium', 'original', 'classic', 'klassisch',
  'xxl', 'xl', 'mini', 'groß', 'große', 'großer', 'klein', 'kleine',
  'frisch', 'frische', 'frischer', 'neu', 'neue', 'neuer',
  'best', 'finest', 'gold', 'golden', 'extra', 'super',
  'deutsche', 'deutscher', 'deutsches', 'italienisch', 'italienische',
  'griechisch', 'griechische', 'türkisch', 'türkische',
  'mild', 'scharf', 'würzig', 'cremig', 'zart', 'fein', 'feine',
  'mit', 'und', 'oder', 'von', 'aus', 'für', 'the', 'von',
  'er', 'set', 'stk', 'stück', 'pack', 'packung', 'beutel',
])

function tokenize(text: string): string[] {
  if (!text) return []
  return text.toLowerCase()
    .replace(/[,.()!:;\-–—/+*'"]/g, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)
}

export interface MatchResult {
  ingredient_id: string
  score: number
  reason: string
}

interface Ingredient {
  id: string
  name: string
  category: string | null
}

interface Synonym {
  ingredient_id?: string
  canonical?: string
  synonym: string
}

/**
 * Erstellt einen Matcher mit vorbereiteten Lookup-Maps.
 * Wird einmal pro Scrape-Lauf gebaut, dann für jedes Angebot aufgerufen.
 */
export function buildMatcher(ingredients: Ingredient[], synonyms: Synonym[] = []) {
  const byName = new Map<string, Ingredient>()
  const byToken = new Map<string, Ingredient[]>()
  const bySynonym = new Map<string, Ingredient>()
  // Alle Ingredient-Namen für Substring-Suche in Komposita
  const allIngredients: Array<{ name: string; ing: Ingredient }> = []

  for (const ing of ingredients) {
    const name = (ing.name || '').toLowerCase().trim()
    if (!name) continue
    byName.set(name, ing)
    allIngredients.push({ name, ing })
    // Prefix-Index: bis 14 Zeichen (deutsche Komposita sind lang)
    for (let len = 3; len <= Math.min(name.length, 14); len++) {
      const prefix = name.slice(0, len)
      if (!byToken.has(prefix)) byToken.set(prefix, [])
      byToken.get(prefix)!.push(ing)
    }
  }

  for (const syn of synonyms) {
    const s = (syn.synonym || '').toLowerCase().trim()
    if (!s) continue
    // Support both canonical (text name) and ingredient_id (uuid) lookups
    const ing = syn.canonical
      ? ingredients.find(i => i.name.toLowerCase() === syn.canonical!.toLowerCase())
      : ingredients.find(i => i.id === syn.ingredient_id)
    if (ing) bySynonym.set(s, ing)
  }

  return function matchProduct(productName: string): MatchResult[] {
    if (!productName) return []
    const lower = productName.toLowerCase()
    const allTokens = tokenize(productName)
    // Skip-Tokens rausfiltern (Adjektive, Modifier, Füllwörter)
    const tokens = allTokens.filter(t => !SKIP_TOKENS.has(t))
    if (!tokens.length) return []

    const matches = new Map<string, { score: number; reason: string }>()

    const hasBlacklist = tokens.some(t => BLACKLIST_TOKENS.has(t))
    const blacklistPenalty = hasBlacklist ? 0.3 : 0

    // 1) Synonym-Match
    for (const [syn, ing] of bySynonym) {
      if (lower.includes(syn)) {
        addMatch(matches, ing.id, 0.85 - blacklistPenalty, `synonym:${syn}`)
      }
    }

    // 2) Exact & Prefix Match
    for (const token of tokens) {
      if (byName.has(token)) {
        addMatch(matches, byName.get(token)!.id, 1.0 - blacklistPenalty, 'exact')
        continue
      }
      let foundPrefix = false
      for (let len = Math.min(token.length, 14); len >= 3; len--) {
        const prefix = token.slice(0, len)
        const candidates = byToken.get(prefix)
        if (!candidates) continue
        for (const cand of candidates) {
          const candName = cand.name.toLowerCase()
          if (token.startsWith(candName) || candName.startsWith(token)) {
            const ratio = Math.min(token.length, candName.length) / Math.max(token.length, candName.length)
            const score = 0.6 + ratio * 0.15
            addMatch(matches, cand.id, score - blacklistPenalty, `prefix:${token}`)
            foundPrefix = true
          }
        }
        break
      }

      // 3) Substring-Match für Komposita: "hähnchenbrustfilet" enthält "hähnchen"
      // Nur wenn kein Prefix-Match gefunden UND Token lang genug (>= 6 Zeichen)
      if (!foundPrefix && token.length >= 6) {
        for (const { name: ingName, ing } of allIngredients) {
          if (ingName.length >= 3 && token.includes(ingName)) {
            const ratio = ingName.length / token.length
            // Längere Ingredient-Namen im Kompositum → höherer Score
            const score = 0.55 + ratio * 0.2 // 0.55..0.75
            addMatch(matches, ing.id, score - blacklistPenalty, `compound:${ingName}→${token}`)
          }
        }
      }
    }

    return Array.from(matches.entries())
      .map(([ingredient_id, m]) => ({ ingredient_id, ...m }))
      .filter(m => m.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }
}

function addMatch(map: Map<string, { score: number; reason: string }>, id: string, score: number, reason: string) {
  const existing = map.get(id)
  if (!existing || existing.score < score) {
    map.set(id, { score: Math.round(score * 100) / 100, reason })
  }
}
