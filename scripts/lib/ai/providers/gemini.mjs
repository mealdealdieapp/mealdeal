/**
 * Gemini Provider-Adapter (Phase 1, primary LLM)
 *
 * Nutzt @google/generative-ai SDK.
 * Konfiguration über Environment:
 *   GEMINI_API_KEY  (required)
 *   GEMINI_MODEL    (optional, default: 'gemini-1.5-flash')
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ProductEnrichmentSchema } from '../types.mjs'
import { PRODUCT_ENRICH_SYSTEM, buildEnrichPrompt } from '../prompts/product-enrich.mjs'
import { logAiUsage } from '../cost-logger.mjs'

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

let _client = null
function getClient() {
  if (_client) return _client
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('GEMINI_API_KEY fehlt. Setze ihn in GitHub Secrets + lokal (.env).')
  }
  _client = new GoogleGenerativeAI(key)
  return _client
}

/**
 * Preise Gemini Flash 1.5 (Stand April 2026, Google AI Studio):
 *   Input:  $0.075 / 1M tokens
 *   Output: $0.30  / 1M tokens
 * Für den Free-Tier gilt 0.0 USD — wir loggen den Listenpreis trotzdem,
 * damit wir bei Übergang auf Paid-Tier nichts anpassen müssen.
 */
function calculateGeminiCost(usage) {
  const inputTokens = usage?.promptTokenCount ?? 0
  const outputTokens = usage?.candidatesTokenCount ?? 0
  const inputCostUsd = (inputTokens * 0.075) / 1_000_000
  const outputCostUsd = (outputTokens * 0.3) / 1_000_000
  const totalUsd = inputCostUsd + outputCostUsd
  return totalUsd * 0.92 // grober USD→EUR Umrechnungskurs
}

/**
 * Führt einen Produkt-Enrichment-Call aus.
 *
 * @param {Object} raw   — RawOfferInput (siehe types.mjs)
 * @param {Object} [options]
 * @param {string} [options.referenceId]  — UUID zur Verknüpfung im Log (z.B. offer.id)
 * @returns {Promise<Object>} validiertes ProductEnrichment-Objekt
 */
export async function enrichProductGemini(raw, options = {}) {
  const client = getClient()
  const model = client.getGenerativeModel({
    model: MODEL,
    systemInstruction: PRODUCT_ENRICH_SYSTEM,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  })

  const start = Date.now()
  const prompt = buildEnrichPrompt(raw)

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (parseErr) {
      throw new Error(
        `Gemini lieferte kein valides JSON. Response: ${text.slice(0, 300)}`
      )
    }

    const validated = ProductEnrichmentSchema.parse(parsed)

    await logAiUsage({
      provider: 'gemini',
      model: MODEL,
      operation: 'enrich_product',
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
      costEur: calculateGeminiCost(response.usageMetadata),
      latencyMs: Date.now() - start,
      success: true,
      referenceId: options.referenceId ?? null,
    })

    return validated
  } catch (err) {
    await logAiUsage({
      provider: 'gemini',
      model: MODEL,
      operation: 'enrich_product',
      success: false,
      errorMessage: err?.message ? String(err.message).slice(0, 500) : String(err),
      latencyMs: Date.now() - start,
      referenceId: options.referenceId ?? null,
    })
    throw err
  }
}
