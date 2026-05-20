import { describe, it, expect } from 'vitest'
import {
  extractMainWords,
  isNonFoodOffer,
  doesOfferMatchIngredientSimple,
  matchIngredientToOffer,
} from './offerMatching'

interface TestOffer {
  id: string
  product_name: string
  offer_price: number
  original_price: number | null
  discount_percent: number | null
  store: string
  category: string | null
}

// Baut ein Test-Angebot mit sinnvollen Defaults.
function offer(partial: Partial<TestOffer> & { product_name: string }): TestOffer {
  return {
    id: partial.id ?? 'o1',
    product_name: partial.product_name,
    offer_price: partial.offer_price ?? 1.99,
    original_price: partial.original_price ?? null,
    discount_percent: partial.discount_percent ?? null,
    store: partial.store ?? 'REWE',
    category: partial.category ?? 'Gemüse',
  }
}

describe('isNonFoodOffer', () => {
  it('erkennt Non-Food-Artikel', () => {
    expect(isNonFoodOffer('Tefal Bratpfanne 28 cm')).toBe(true)
    expect(isNonFoodOffer('Head & Shoulders Shampoo')).toBe(true)
  })
  it('erkennt Lebensmittel als Food', () => {
    expect(isNonFoodOffer('Bio Tomaten 500g')).toBe(false)
    expect(isNonFoodOffer('Vollmilch 1L')).toBe(false)
  })
})

describe('extractMainWords', () => {
  it('extrahiert das Hauptwort einer Zutat', () => {
    expect(extractMainWords('Tomate').words).toContain('tomate')
  })
  it('entfernt Mengenangaben', () => {
    const result = extractMainWords('200g Tomaten')
    expect(result.words).toContain('tomaten')
    expect(result.words).not.toContain('200g')
  })
  it('verwirft Woerter mit hoechstens zwei Zeichen', () => {
    expect(extractMainWords('Ei').words).toHaveLength(0)
  })
})

describe('doesOfferMatchIngredientSimple', () => {
  it('matcht ein Angebot mit derselben Zutat', () => {
    expect(doesOfferMatchIngredientSimple('Frische Tomaten', null, 'Tomate', null)).toBe(true)
  })
  it('matcht nicht bei voellig anderer Zutat', () => {
    expect(doesOfferMatchIngredientSimple('Vollmilch 1L', null, 'Tomate', null)).toBe(false)
  })
})

describe('matchIngredientToOffer', () => {
  it('findet das passende Angebot aus einer Liste', () => {
    const offers = [
      offer({ id: 'milk', product_name: 'Vollmilch 1L', category: 'Milch & Eier' }),
      offer({ id: 'tom', product_name: 'Frische Tomaten 500g', category: 'Gemüse', offer_price: 0.99 }),
    ]
    const match = matchIngredientToOffer({ name: 'Tomate', category: 'Gemüse' }, offers)
    expect(match).not.toBeNull()
    expect(match?.offerId).toBe('tom')
    expect(match?.productName).toBe('Frische Tomaten 500g')
  })
  it('gibt null zurueck, wenn kein Angebot passt', () => {
    const offers = [offer({ id: 'milk', product_name: 'Vollmilch 1L', category: 'Milch & Eier' })]
    expect(matchIngredientToOffer({ name: 'Tomate', category: 'Gemüse' }, offers)).toBeNull()
  })
  it('gibt null zurueck bei leerer Angebotsliste', () => {
    expect(matchIngredientToOffer({ name: 'Tomate', category: 'Gemüse' }, [])).toBeNull()
  })
})
