/**
 * Markt-Layouts — Reihenfolge der Sektionen pro Supermarktkette
 *
 * Basis: typische deutsche Filial-Aufbauten 2024-2026 für Obst/Gemüse,
 * Frischetheken, Tiefkühl, Trocken, Getränke und Drogerie. Die genaue
 * Anordnung variiert pro Filiale; das hier ist der Median-Layout, der
 * für die meisten Filialen passt.
 *
 * Verwendet die kanonischen Kategorie-Keys aus `offerCategoryConfig.ts`,
 * damit ein Match mit `offers.category` und (sofern befüllt)
 * `ingredients.category` möglich ist.
 *
 * Spätere Erweiterung: Die `market_layouts`-Tabelle in der DB überschreibt
 * diese Defaults (siehe scripts/add-market-layouts.sql). Solange die Tabelle
 * leer oder nicht vorhanden ist, fallen wir hierauf zurück.
 */

import { OFFER_CATEGORY_ORDER } from './offerCategoryConfig'

export type MarketName =
  | 'REWE'
  | 'ALDI'
  | 'Lidl'
  | 'Edeka'
  | 'Kaufland'
  | 'Penny'
  | 'Netto'
  | 'Norma'

/**
 * Discounter-Standard-Layout (Aldi, Lidl, Penny, Netto, Norma):
 * kompakter Rundgang, Drogerie als Aktionsfläche am Eingang/Ende.
 */
const DISCOUNTER_LAYOUT: string[] = [
  'Obst',
  'Gemüse',
  'Backwaren',
  'Brot & Wraps',
  'Käse',
  'Milch & Eier',
  'Fleisch',
  'Fisch & Meeresfrüchte',
  'Tiefkühl',
  'Nudeln & Reis',
  'Hülsenfrüchte',
  'Konserven',
  'Öle & Fette',
  'Gewürze',
  'Snacks & Süßes',
  'Sonstiges Lebensmittel',
  'Getränke',
  'Drogerie',
  'Haushalt',
]

/**
 * Vollsortimenter-Layout (Rewe, Edeka, Kaufland):
 * Frischeabteilung breiter, Käse/Fleisch separat, Bio-Bereich integriert.
 */
const VOLLSORTIMENTER_LAYOUT: string[] = [
  'Obst',
  'Gemüse',
  'Backwaren',
  'Brot & Wraps',
  'Käse',
  'Milch & Eier',
  'Fleisch',
  'Fisch & Meeresfrüchte',
  'Nudeln & Reis',
  'Hülsenfrüchte',
  'Konserven',
  'Öle & Fette',
  'Gewürze',
  'Tiefkühl',
  'Snacks & Süßes',
  'Sonstiges Lebensmittel',
  'Getränke',
  'Drogerie',
  'Haushalt',
]

export const MARKET_LAYOUTS: Record<MarketName, string[]> = {
  REWE: VOLLSORTIMENTER_LAYOUT,
  Edeka: VOLLSORTIMENTER_LAYOUT,
  Kaufland: VOLLSORTIMENTER_LAYOUT,
  ALDI: DISCOUNTER_LAYOUT,
  Lidl: DISCOUNTER_LAYOUT,
  Penny: DISCOUNTER_LAYOUT,
  Netto: DISCOUNTER_LAYOUT,
  Norma: DISCOUNTER_LAYOUT,
}

const FALLBACK_LAYOUT: string[] = OFFER_CATEGORY_ORDER

/**
 * Liefert die Sektions-Reihenfolge für einen Markt. Unbekannte Märkte
 * (z. B. "Sonstige") bekommen den Ernährungspyramide-Default.
 */
export function getMarketLayout(market: string | null | undefined): string[] {
  if (!market) return FALLBACK_LAYOUT
  return MARKET_LAYOUTS[market as MarketName] ?? FALLBACK_LAYOUT
}

/**
 * Position einer Kategorie im Layout. Unbekannte Kategorien landen am Ende
 * (Index 999), damit sie konsistent unten in der Liste auftauchen.
 */
export function getSectionPosition(market: string | null | undefined, category: string | null | undefined): number {
  if (!category) return 999
  const layout = getMarketLayout(market)
  const idx = layout.indexOf(category)
  return idx >= 0 ? idx : 999
}
