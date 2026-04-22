/**
 * LLM Public API (Phase 1)
 *
 * Abstrahiert den konkreten Provider (Gemini, Anthropic, ...) hinter einer
 * stabilen Schnittstelle. Aufrufer kennen nur enrichProduct().
 *
 * Provider-Wahl über Env:
 *   AI_PROVIDER = 'gemini' (default)
 *   AI_PROVIDER = 'anthropic'  (Phase 2+)
 */

import { enrichProductGemini } from './providers/gemini.mjs'

const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase()

/**
 * Enrichet ein Rohangebot zu strukturierten Produktdaten.
 *
 * @param {Object} raw          — RawOfferInput (productName + optional description/category/store/price)
 * @param {Object} [options]
 * @param {string} [options.referenceId]  — UUID (z.B. offer.id) für das Kosten-Log
 * @returns {Promise<Object>}   — ProductEnrichment (validated)
 */
export async function enrichProduct(raw, options = {}) {
  switch (PROVIDER) {
    case 'gemini':
      return enrichProductGemini(raw, options)
    // case 'anthropic':  return enrichProductAnthropic(raw, options)   // Phase 2+
    default:
      throw new Error(
        `Unbekannter AI_PROVIDER: "${PROVIDER}". Erlaubt: gemini`
      )
  }
}

export { PROVIDER as ACTIVE_AI_PROVIDER }
