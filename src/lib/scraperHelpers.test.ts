import { describe, it, expect } from 'vitest'
import {
  extractBrand,
  detectBio,
  detectRegional,
  parseQuantity,
  calcBasePrice,
  mapSubcategory,
  canonicalKey,
} from './scraperHelpers'

describe('extractBrand', () => {
  it('erkennt eine Marke am Wortanfang', () => {
    expect(extractBrand('Milka Schokolade')).toBe('Milka')
  })
  it('erkennt eine Marke mit Bindestrich', () => {
    expect(extractBrand('Coca-Cola 1,5l')).toBe('Coca-Cola')
  })
  it('gibt null zurueck, wenn keine Marke vorkommt', () => {
    expect(extractBrand('Bio Tomaten')).toBeNull()
  })
  it('behandelt leere Eingabe', () => {
    expect(extractBrand('')).toBeNull()
    expect(extractBrand(null)).toBeNull()
    expect(extractBrand(undefined)).toBeNull()
  })
})

describe('detectBio', () => {
  it('erkennt Bio-Produkte', () => {
    expect(detectBio('Bio Tomaten')).toBe(true)
    expect(detectBio('Alnatura Haferflocken')).toBe(true)
  })
  it('erkennt Nicht-Bio-Produkte', () => {
    expect(detectBio('Tomaten')).toBe(false)
    expect(detectBio(null)).toBe(false)
  })
})

describe('detectRegional', () => {
  it('erkennt regionale Produkte', () => {
    expect(detectRegional('Regionale Aepfel')).toBe(true)
    expect(detectRegional('Bayerische Brezn')).toBe(true)
  })
  it('erkennt nicht-regionale Produkte', () => {
    expect(detectRegional('Aepfel')).toBe(false)
  })
})

describe('parseQuantity', () => {
  it('parst einfache Mengen', () => {
    expect(parseQuantity('Milch 1l')).toEqual({ amount: 1, unit: 'l' })
    expect(parseQuantity('Mehl 500g')).toEqual({ amount: 500, unit: 'g' })
  })
  it('parst Multipack-Mengen (6 x 0,33l)', () => {
    expect(parseQuantity('Cola 6x0,33l')).toEqual({ amount: 1.98, unit: 'l' })
  })
  it('rechnet cl in ml um', () => {
    expect(parseQuantity('Sekt 20cl')).toEqual({ amount: 200, unit: 'ml' })
  })
  it('bevorzugt das quantityField vor dem Produktnamen', () => {
    expect(parseQuantity('Gouda Kaese', '200g')).toEqual({ amount: 200, unit: 'g' })
  })
  it('gibt null zurueck, wenn keine Menge erkennbar ist', () => {
    expect(parseQuantity('Gouda Kaese')).toEqual({ amount: null, unit: null })
  })
})

describe('calcBasePrice', () => {
  it('berechnet den Kilopreis aus Gramm', () => {
    expect(calcBasePrice(2.0, 500, 'g')).toEqual({ basePrice: 4, baseUnit: 'kg' })
  })
  it('berechnet den Literpreis aus Millilitern', () => {
    expect(calcBasePrice(3.0, 750, 'ml')).toEqual({ basePrice: 4, baseUnit: 'l' })
  })
  it('laesst 1l unveraendert', () => {
    expect(calcBasePrice(1.5, 1, 'l')).toEqual({ basePrice: 1.5, baseUnit: 'l' })
  })
  it('gibt null bei fehlenden Eingaben zurueck', () => {
    expect(calcBasePrice(null, 500, 'g')).toEqual({ basePrice: null, baseUnit: null })
    expect(calcBasePrice(2, null, 'g')).toEqual({ basePrice: null, baseUnit: null })
  })
  it('gibt null bei unbekannter Einheit zurueck', () => {
    expect(calcBasePrice(2, 500, 'xyz')).toEqual({ basePrice: null, baseUnit: null })
  })
})

describe('mapSubcategory', () => {
  it('ordnet Fleisch-Unterkategorien zu', () => {
    expect(mapSubcategory('Fleisch', 'Rinderhack 500g')).toBe('Rind')
  })
  it('ordnet Obst-Unterkategorien zu', () => {
    expect(mapSubcategory('Obst', 'Banane')).toBe('Exotisches Obst')
  })
  it('ordnet Käse-Unterkategorien zu', () => {
    expect(mapSubcategory('Käse', 'Mozzarella')).toBe('Frischkäse')
  })
  it('gibt null bei unbekannter Kategorie oder leerer Eingabe zurueck', () => {
    expect(mapSubcategory('Unbekannt', 'Banane')).toBeNull()
    expect(mapSubcategory(null, 'Banane')).toBeNull()
  })
})

describe('canonicalKey', () => {
  it('entfernt Marke, Menge und Stoppwoerter', () => {
    expect(canonicalKey('Milka Schokolade 100g', 'Milka')).toBe('schokolade')
  })
  it('funktioniert ohne Marke', () => {
    expect(canonicalKey('Bio Tomaten 500g')).toBe('tomaten')
  })
  it('gibt null bei leerer Eingabe zurueck', () => {
    expect(canonicalKey(null)).toBeNull()
  })
})
