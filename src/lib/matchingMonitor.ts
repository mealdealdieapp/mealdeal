/**
 * Matching Monitor — Debug-Tool für das Angebots-Matching
 *
 * Wird automatisch im Development-Modus geladen.
 * Nutzung in der Browser-Konsole:
 *
 *   window.__debugMatch("Tomate (frisch)", "Gemüse")
 *   → Zeigt alle Angebote die für "Tomate" gescored werden, mit Scores
 *
 *   window.__debugMatch("Zucker")
 *   → Prüft wie "Zucker" gematcht wird
 *
 *   window.__matchReport()
 *   → Zeigt eine Übersicht aller aktuellen Matches für alle Rezept-Zutaten
 */

import { debugMatchIngredient } from './offerMatching'
import { supabase } from './supabase'

interface DebugOffer {
  id: string
  product_name: string
  offer_price: number
  original_price: number | null
  discount_percent: number | null
  store: string
  category: string | null
}

let cachedOffers: DebugOffer[] | null = null

async function getOffers(): Promise<DebugOffer[]> {
  if (cachedOffers) return cachedOffers

  const { data } = await supabase
    .from('offers')
    .select('id, product_name, offer_price, original_price, discount_percent, store, category')
    .gte('valid_until', new Date().toISOString().split('T')[0])
    .limit(5000)

  cachedOffers = (data ?? []) as DebugOffer[]
  // Cache für 5 Minuten
  setTimeout(() => { cachedOffers = null }, 5 * 60 * 1000)
  return cachedOffers
}

/**
 * Debug ein einzelnes Matching: Welche Angebote matchen für eine Zutat?
 */
async function debugMatch(ingredientName: string, ingredientCategory?: string | null) {
  const offers = await getOffers()
  const results = debugMatchIngredient(
    ingredientName,
    ingredientCategory ?? null,
    offers,
  )

  console.group(`🔍 Match-Debug: "${ingredientName}" (${ingredientCategory ?? 'keine Kategorie'})`)
  console.log(`${results.length} Angebote mit Score > 0:`)

  const matched = results.filter(r => r.matched)
  const rejected = results.filter(r => !r.matched)

  if (matched.length > 0) {
    console.log(`\n✅ MATCHED (${matched.length}):`)
    console.table(matched.map(r => ({
      Produkt: r.product,
      Store: r.store,
      Kategorie: r.category,
      Score: r.score,
    })))
  }

  if (rejected.length > 0) {
    console.log(`\n❌ REJECTED (Score zu niedrig) (${rejected.length}):`)
    console.table(rejected.slice(0, 20).map(r => ({
      Produkt: r.product,
      Store: r.store,
      Kategorie: r.category,
      Score: r.score,
    })))
  }

  console.groupEnd()
  return results
}

/**
 * Übersichtsreport: Zeigt potentielle False Positives
 */
async function matchReport() {
  const offers = await getOffers()

  // Lade alle Rezept-Zutaten
  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('ingredients(name, category)')
    .limit(10000)

  if (!ingredients) {
    console.error('Keine Zutaten geladen')
    return
  }

  // Unique Zutaten
  const uniqueIngredients = new Map<string, string | null>()
  for (const row of ingredients) {
    const ing = (row as { ingredients: { name: string; category: string | null } | null }).ingredients
    if (ing?.name) {
      uniqueIngredients.set(ing.name.toLowerCase(), ing.category)
    }
  }

  console.group('📊 Matching Report — Alle Rezept-Zutaten')
  console.log(`${uniqueIngredients.size} unique Zutaten, ${offers.length} aktive Angebote\n`)

  const suspicious: Array<{ zutat: string; angebot: string; score: number; kategorie: string | null }> = []

  for (const [name, category] of uniqueIngredients) {
    const results = debugMatchIngredient(name, category, offers)
    const matched = results.filter(r => r.matched)

    for (const m of matched) {
      // Markiere als verdächtig wenn Kategorie "Sonstiges Lebensmittel" ist
      // oder Score unter 200 liegt
      if (m.category === 'Sonstiges Lebensmittel' || m.score < 200) {
        suspicious.push({
          zutat: name,
          angebot: `${m.store}: ${m.product}`,
          score: m.score,
          kategorie: m.category,
        })
      }
    }
  }

  if (suspicious.length > 0) {
    console.log(`⚠️ Verdächtige Matches (${suspicious.length}):`)
    console.table(suspicious.sort((a, b) => a.score - b.score))
  } else {
    console.log('✅ Keine verdächtigen Matches gefunden!')
  }

  console.groupEnd()
}

// Registriere in window für Browser-Konsolen-Zugriff
export function initMatchingMonitor() {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    win.__debugMatch = debugMatch
    win.__matchReport = matchReport

    console.log(
      '%c🔍 Matching Monitor geladen',
      'color: #028350; font-weight: bold',
      '\n  window.__debugMatch("Zutat", "Kategorie") — Debug einzelnes Matching',
      '\n  window.__matchReport() — Übersicht verdächtige Matches',
    )
  }
}
