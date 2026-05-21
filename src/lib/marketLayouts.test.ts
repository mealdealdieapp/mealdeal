import { describe, it, expect } from 'vitest'
import { getMarketLayout, getSectionPosition } from './marketLayouts'

describe('getMarketLayout', () => {
  it('liefert ein Layout fuer bekannte Maerkte', () => {
    const rewe = getMarketLayout('REWE')
    expect(Array.isArray(rewe)).toBe(true)
    expect(rewe.length).toBeGreaterThan(0)
    expect(rewe).toContain('Drogerie')
  })
  it('startet mit Obst (Frischebereich zuerst)', () => {
    expect(getMarketLayout('REWE')[0]).toBe('Obst')
    expect(getMarketLayout('ALDI')[0]).toBe('Obst')
  })
  it('faellt fuer unbekannte Maerkte auf das Standard-Layout zurueck', () => {
    const fallback = getMarketLayout('GibtsNicht')
    const nullFallback = getMarketLayout(null)
    expect(fallback).toEqual(nullFallback)
    expect(fallback.length).toBeGreaterThan(0)
  })
})

describe('getSectionPosition', () => {
  it('gibt die Position einer Kategorie im Marktlayout', () => {
    expect(getSectionPosition('REWE', 'Obst')).toBe(0)
  })
  it('ordnet Obst vor Drogerie ein (Lauf-Reihenfolge)', () => {
    expect(getSectionPosition('REWE', 'Obst'))
      .toBeLessThan(getSectionPosition('REWE', 'Drogerie'))
  })
  it('gibt 999 fuer unbekannte Kategorien', () => {
    expect(getSectionPosition('REWE', 'GibtsNicht')).toBe(999)
  })
  it('gibt 999 fuer fehlende Kategorie', () => {
    expect(getSectionPosition('REWE', null)).toBe(999)
    expect(getSectionPosition('REWE', undefined)).toBe(999)
  })
})
