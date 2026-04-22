/**
 * Produkt-Fingerprint (Phase 1)
 *
 * Deterministischer Hash aus {brand, canonicalName, amount, unit}.
 * Zwei Offers mit gleichem Fingerprint → gleiches Produkt → nur 1 AI-Call.
 *
 * Dies ist die Produkt-Ebene. Nicht zu verwechseln mit offers.fingerprint,
 * das pro Angebots-Zeile (store + plz + price) existiert.
 */

/**
 * Normalisiert einen Text für Fingerprint-Zwecke.
 * Deterministisch und kollisionssicher:
 *   - Kleinbuchstaben
 *   - Umlaute → ae, oe, ue, ss
 *   - Alles außer a-z0-9 zu Leerzeichen
 *   - Whitespace-Collapse, trim
 *   - Tokens alphabetisch sortiert (Reihenfolge irrelevant)
 */
export function normalizeText(text) {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

/**
 * Erzeugt einen Produkt-Fingerprint.
 *
 * @param {string|null} brand
 * @param {string} canonicalName
 * @param {number|null} amount
 * @param {string|null} unit
 * @returns {string} — z.B. "edeka|bio heumilch|1000ml"
 */
export function productFingerprint(brand, canonicalName, amount, unit) {
  const brandPart = brand ? normalizeText(brand) : 'nobrand'
  const namePart = normalizeText(canonicalName) || 'unknown'
  const quantityPart =
    typeof amount === 'number' && unit ? `${amount}${String(unit).toLowerCase()}` : 'noqty'
  return `${brandPart}|${namePart}|${quantityPart}`
}
