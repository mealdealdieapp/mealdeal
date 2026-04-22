/**
 * AI Types & Validation Schemas (Phase 1)
 *
 * Zod-basierte Runtime-Validation für LLM-Responses.
 * Läuft in Node-Scripts (.mjs). Bei Bedarf später auch in src/lib/ai/types.ts für Frontend.
 */

import { z } from 'zod'

export const ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'stk', 'pack']

export const ALLOWED_CATEGORIES = [
  'Milch & Eier',
  'Käse',
  'Fleisch',
  'Wurst',
  'Fisch & Meeresfrüchte',
  'Obst & Gemüse',
  'Brot & Backwaren',
  'Tiefkühl',
  'Getränke',
  'Süßwaren',
  'Snacks',
  'Kaffee & Tee',
  'Pasta & Reis',
  'Konserven',
  'Gewürze & Soßen',
  'Frühstück',
  'Fertiggerichte',
  'Sonstiges Lebensmittel',
  'Non-Food',
]

export const ProductEnrichmentSchema = z.object({
  canonicalName: z.string().min(1),
  displayName: z.string().min(1),
  brand: z.string().nullable(),
  amount: z.number().nullable(),
  unit: z.enum(ALLOWED_UNITS).nullable(),
  category: z.string().min(1),
  subcategory: z.string().nullable(),
  isFood: z.boolean(),
  isBio: z.boolean(),
  isRegional: z.boolean(),
  isVegan: z.boolean(),
  isVegetarian: z.boolean(),
  confidence: z.number().min(0).max(1),
})

/**
 * Eingabe-Struktur für enrichProduct()
 * @typedef {Object} RawOfferInput
 * @property {string} productName
 * @property {string=} description
 * @property {string=} category
 * @property {string=} store
 * @property {number=} price
 */
