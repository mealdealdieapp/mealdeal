import { getAllowedOfferCategories } from './categoryMapping'

interface OfferCandidate {
  id: string
  product_name: string
  offer_price: number
  original_price: number | null
  discount_percent: number | null
  store: string
  category: string | null
}

export interface OfferMatch {
  offerId: string
  offerPrice: number
  originalPrice: number | null
  store: string
  discountPercent: number | null
  productName: string
}

interface ScoredOffer {
  offer: OfferCandidate
  score: number
}

const STOPWORDS = [
  'frisch', 'getrocknet', 'gemischt', 'gehackt',
  'gewürfelt', 'gerieben', 'dose', 'glas', 'tiefkühl',
  'bio', 'regional', 'natur', 'extra', 'zum', 'für',
  'oder', 'und', 'mit', 'ohne', 'nach', 'art',
  'rot', 'gelb', 'grün', 'weiß',
]

// Compound word parts for German compound splitting
const COMPOUND_SUFFIXES = [
  'hackfleisch', 'fleisch', 'wurst', 'käse', 'milch',
  'brust', 'filet', 'schenkel', 'keule',
  'sauce', 'soße', 'creme', 'sahne', 'butter', 'öl',
  'mehl', 'zucker', 'salz', 'reis', 'nudeln',
]

export function extractMainWords(ingredientName: string): string[] {
  const cleaned = ingredientName
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')  // Klammern entfernen
    .replace(/\//g, ' ')            // Schrägstriche als Trennzeichen
    .replace(/[-–]/g, ' ')          // Bindestriche als Trennzeichen
    .trim()

  const rawWords = cleaned
    .split(/[\s,]+/)
    .filter(w => w.length > 2)
    .filter(w => !STOPWORDS.includes(w))

  const words = new Set<string>(rawWords)

  // German compound word splitting
  for (const word of rawWords) {
    for (const suffix of COMPOUND_SUFFIXES) {
      if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
        const prefix = word.slice(0, word.length - suffix.length)
        if (prefix.length > 2) {
          words.add(prefix)
          // Handle "er" suffix: "rinder" → "rind"
          if (prefix.endsWith('er') && prefix.length > 4) {
            words.add(prefix.slice(0, -2))
          }
          // Handle "n" suffix: "hühner" → "hühne" - skip, too aggressive
        }
        words.add(suffix)
        break
      }
    }
  }

  return Array.from(words)
}

function wordBoundaryMatch(text: string, term: string): boolean {
  try {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|[\\s\\-\\/,.()])${escaped}([\\s\\-\\/,.()]|$)`, 'i')
    return re.test(text)
  } catch {
    return false
  }
}

function scoreOffer(offerName: string, ingredientWords: string[]): number {
  const offerLower = offerName.toLowerCase()
  let totalScore = 0

  for (const word of ingredientWords) {
    // Exact full match
    if (offerLower === word) return 200

    // Word boundary match: "Reis" matches "Basmati Reis" but NOT "Milchreis"
    if (wordBoundaryMatch(offerLower, word)) {
      totalScore += 100
      continue
    }

    // Offer starts with the word
    if (offerLower.startsWith(word)) {
      totalScore += 60
      continue
    }
  }

  return totalScore
}

export function matchIngredientToOffer(
  ingredient: { name: string; category: string | null },
  offers: OfferCandidate[],
  synonymMap?: Map<string, string[]>,
): OfferMatch | null {
  // Step 1: Get allowed offer categories
  const allowedCategories = getAllowedOfferCategories(ingredient.category)

  // Step 2: Filter by category (strict - no fallback to all offers)
  let pool: OfferCandidate[]
  if (allowedCategories) {
    pool = offers.filter(o =>
      o.category !== null && (
        allowedCategories.includes(o.category) ||
        o.category === ingredient.category  // Same category always allowed
      )
    )
    // If category filtering yields nothing, skip - don't match cross-category
    if (pool.length === 0) return null
  } else {
    // Unknown category → use all offers (ingredient has no category)
    pool = offers
  }

  // Step 3: Build search terms from ingredient name + synonyms
  const ingredientWords = extractMainWords(ingredient.name)

  // Add synonym-based terms
  if (synonymMap) {
    const nameLower = ingredient.name.toLowerCase()
      .replace(/\s*\([^)]*\)/g, '').trim()

    // Check direct synonyms
    const syns = synonymMap.get(nameLower)
    if (syns) {
      for (const s of syns) {
        for (const w of extractMainWords(s)) {
          if (!ingredientWords.includes(w)) ingredientWords.push(w)
        }
      }
    }

    // Reverse lookup
    for (const [canonical, synonyms] of synonymMap) {
      if (synonyms.includes(nameLower) || canonical === nameLower) {
        for (const w of extractMainWords(canonical)) {
          if (!ingredientWords.includes(w)) ingredientWords.push(w)
        }
        for (const s of synonyms) {
          for (const w of extractMainWords(s)) {
            if (!ingredientWords.includes(w)) ingredientWords.push(w)
          }
        }
      }
    }
  }

  // Step 4: Score all offers in pool
  const scored: ScoredOffer[] = pool.map(offer => ({
    offer,
    score: scoreOffer(offer.product_name, ingredientWords),
  }))

  // Step 5: Best match above threshold (60 = at least one prefix match)
  const best = scored
    .filter(s => s.score >= 60)
    .sort((a, b) => {
      // Higher score first
      if (b.score !== a.score) return b.score - a.score
      // Same score → higher discount wins
      return (b.offer.discount_percent ?? 0) - (a.offer.discount_percent ?? 0)
    })[0]

  if (!best) return null

  return {
    offerId: best.offer.id,
    offerPrice: best.offer.offer_price,
    originalPrice: best.offer.original_price,
    store: best.offer.store,
    discountPercent: best.offer.discount_percent,
    productName: best.offer.product_name,
  }
}
