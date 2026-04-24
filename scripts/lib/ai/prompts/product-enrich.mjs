/**
 * Prompt-Templates für Produkt-Enrichment (Phase 1)
 *
 * Versionierung: Wenn ein Prompt geändert wird, erhöhe ENRICHMENT_PROMPT_VERSION.
 * Beim Enrichment wird die Version in products.enrichment_version gespeichert — so
 * können wir später gezielt alle Produkte re-enrichen, die unter einem alten Prompt liefen.
 */

import { ALLOWED_CATEGORIES, ALLOWED_UNITS } from '../types.mjs'

export const ENRICHMENT_PROMPT_VERSION = 2

export const PRODUCT_ENRICH_SYSTEM = `Du bist ein Experte für deutsche Supermarkt-Produkte.
Deine Aufgabe: aus einem Rohangebot strukturierte Produktdaten extrahieren.

STRIKTE REGELN:
1. Menge ermitteln — in dieser Prioritäts-Reihenfolge:
   a) Falls "Beschreibung" eine Mengenangabe enthält (z.B. "200g Packung", "500 ml Flasche", "je 1 kg") → NUTZE DIESE
   b) Sonst: falls "Scraper-Menge (roh)" vorhanden → nutze diese
   c) Sonst: falls Produktname eine Menge enthält → nutze diese
   d) Sonst: amount=null, unit=null
   Beispiele:
   - "500g Hackfleisch" → amount=500, unit="g"
   - "1,5 l Cola" → amount=1500, unit="ml"  (normalisiere l→ml und kg→g nur wenn sauberer)
   - "6 Stück Eier" → amount=6, unit="stk"
   - "Packung Nudeln" (ohne Gewicht) → amount=null, unit=null
   WICHTIG: Erfinde niemals Mengen. Wenn nichts bekannt ist, null.

2. Erlaubte Einheiten: ${ALLOWED_UNITS.join(', ')}
   KEINE anderen Einheiten (keine "l", kein "kg" — nutze "ml" und "g" stattdessen, AUSSER das Produkt wird nativ so verkauft)

3. Erlaubte Kategorien (genau eine wählen):
${ALLOWED_CATEGORIES.map((c) => `   - ${c}`).join('\n')}

4. isFood=false NUR bei tatsächlichen Non-Food-Artikeln:
   - Waschmittel, Putzmittel, Kosmetik
   - Haushaltsartikel, Elektrogeräte
   - Zeitschriften, Bücher
   - Tierfutter
   ALLES was man essen/trinken kann: isFood=true

5. Marke (brand):
   - Echte Herstellermarken: "Coca-Cola", "Rewe Bio", "Gut & Günstig", "Ja!"
   - Generische Produkte ohne Marke: brand=null
   - Händler-Eigenmarke zählt als Marke ("Rewe Bio" ist eine Marke, "Rewe" allein nicht)

6. Flags:
   - isBio=true NUR wenn im Namen "Bio", "Organic", "Demeter", "Naturland" vorkommt
   - isVegan/isVegetarian: konservativ. Nur true wenn du sicher bist.
     Fleisch, Wurst, Fisch = weder vegan noch vegetarisch
     Milchprodukte, Käse, Eier = vegetarisch aber nicht vegan
     Pflanzliche Produkte = beides

7. confidence 0.0-1.0:
   - 1.0: Alle Infos klar, Menge im Namen
   - 0.7: Menge plausibel geschätzt
   - 0.4: Unsichere Kategorie oder Menge
   - 0.0: Raten

WICHTIG: Gib ausschließlich valides JSON zurück. Kein Fließtext, keine Erklärungen, keine Markdown-Code-Blöcke.`

/**
 * Baut den User-Prompt für enrichProduct().
 * @param {Object} raw
 * @param {string} raw.productName
 * @param {string=} raw.description       Rohbeschreibung vom Scraper (enthält oft Menge)
 * @param {number=} raw.rawQuantity       Menge, die der Scraper als Integer extrahiert hat
 * @param {string=} raw.rawUnit           Einheit vom Scraper (g, ml, stk, ...)
 * @param {string=} raw.category          Rohkategorie vom Scraper
 * @param {string=} raw.store             Händler
 * @param {number=} raw.price             Angebotspreis
 */
export function buildEnrichPrompt(raw) {
  const parts = [
    'Analysiere dieses Supermarkt-Angebot:',
    '',
    `Produktname: ${raw.productName}`,
  ]
  if (raw.description) parts.push(`Beschreibung: ${raw.description}`)
  if (typeof raw.rawQuantity === 'number' && raw.rawQuantity > 0) {
    const rawUnitPart = raw.rawUnit ? ` ${raw.rawUnit}` : ''
    parts.push(`Scraper-Menge (roh): ${raw.rawQuantity}${rawUnitPart}`)
  }
  if (raw.category) parts.push(`Rohkategorie aus Scraper: ${raw.category}`)
  if (raw.store) parts.push(`Händler: ${raw.store}`)
  if (typeof raw.price === 'number') parts.push(`Angebotspreis: ${raw.price.toFixed(2)} €`)

  parts.push(
    '',
    'Gib ausschließlich dieses JSON-Objekt zurück:',
    '{',
    '  "canonicalName": "string — normalisierter Produktname, keine Marke",',
    '  "displayName": "string — vollständiger Name wie im Markt",',
    '  "brand": "string oder null",',
    '  "amount": Zahl oder null,',
    '  "unit": "g|kg|ml|l|stk|pack" oder null,',
    '  "category": "eine aus der Liste",',
    '  "subcategory": "string oder null",',
    '  "isFood": true/false,',
    '  "isBio": true/false,',
    '  "isRegional": true/false,',
    '  "isVegan": true/false,',
    '  "isVegetarian": true/false,',
    '  "confidence": 0.0-1.0',
    '}'
  )

  return parts.join('\n')
}
