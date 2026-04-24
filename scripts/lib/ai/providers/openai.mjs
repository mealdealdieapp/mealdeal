/**
 * OpenAI Provider-Adapter (Phase 2, primary embedding provider)
 *
 * Nutzt die OpenAI REST-API direkt via fetch (kein npm-Paket nötig).
 * Konfiguration über Environment:
 *   OPENAI_API_KEY     (required)
 *   OPENAI_EMBED_MODEL (optional, default: 'text-embedding-3-small')
 */

import { logAiUsage } from '../cost-logger.mjs'

const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'
const EMBED_DIMENSIONS = 1536 // fix für text-embedding-3-small

const API_URL = 'https://api.openai.com/v1/embeddings'

/**
 * Preise OpenAI Embeddings (Stand April 2026):
 *   text-embedding-3-small: $0.02 / 1M Input-Tokens
 *   text-embedding-3-large: $0.13 / 1M Input-Tokens
 */
const PRICE_PER_M_TOKENS_USD = {
  'text-embedding-3-small': 0.02,
  'text-embedding-3-large': 0.13,
}

const USD_TO_EUR = 0.92

function calculateCost(model, tokens) {
  const pricePerM = PRICE_PER_M_TOKENS_USD[model] ?? 0.02
  return ((tokens * pricePerM) / 1_000_000) * USD_TO_EUR
}

function isRetryableError(err) {
  const msg = String(err?.message || err || '')
  return (
    msg.includes('[OpenAI 503') ||
    msg.includes('[OpenAI 502') ||
    msg.includes('[OpenAI 504') ||
    msg.includes('[OpenAI 500') ||
    msg.includes('[OpenAI 429') ||
    msg.toLowerCase().includes('service unavailable') ||
    msg.toLowerCase().includes('too many requests') ||
    msg.toLowerCase().includes('rate limit')
  )
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getApiKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('OPENAI_API_KEY fehlt. Setze ihn in GitHub Secrets + Vercel.')
  }
  return key
}

/**
 * Roher API-Call ohne Retry. Wird intern von Embedding-Funktionen genutzt.
 * @param {string|string[]} input  einzelner Text oder Batch (max 2048)
 * @param {string} model
 * @returns {Promise<{ data: Array<{embedding: number[], index: number}>, usage: {prompt_tokens: number, total_tokens: number}, model: string }>}
 */
async function rawEmbedCall(input, model) {
  const apiKey = getApiKey()
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input }),
  })

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '')
    const snippet = errBody.slice(0, 300)
    throw new Error(`[OpenAI ${resp.status}] ${snippet}`)
  }

  return await resp.json()
}

/**
 * Generiert ein Embedding für einen einzelnen Text.
 * Mit Retry-Logik bei transienten Fehlern (1s, 3s, 9s).
 *
 * @param {string} text
 * @param {Object} [options]
 * @param {string} [options.referenceId]   UUID zur Verknüpfung im Log
 * @param {string} [options.model]         Override des Default-Modells
 * @param {string} [options.operation]     Default: 'embed_text'
 * @returns {Promise<{ embedding: number[], model: string, dimensions: number, tokenCount: number, costEur: number }>}
 */
export async function generateEmbedding(text, options = {}) {
  const model = options.model || EMBED_MODEL
  const operation = options.operation || 'embed_text'
  const maxAttempts = 4
  const backoffMs = [1000, 3000, 9000]
  let lastErr

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now()
    try {
      const result = await rawEmbedCall(text, model)
      const tokenCount = result.usage?.total_tokens ?? 0
      const costEur = calculateCost(model, tokenCount)

      await logAiUsage({
        provider: 'openai',
        model,
        operation,
        inputTokens: tokenCount,
        outputTokens: null,
        costEur,
        latencyMs: Date.now() - start,
        success: true,
        referenceId: options.referenceId ?? null,
      })

      return {
        embedding: result.data[0].embedding,
        model,
        dimensions: EMBED_DIMENSIONS,
        tokenCount,
        costEur,
      }
    } catch (err) {
      lastErr = err
      await logAiUsage({
        provider: 'openai',
        model,
        operation,
        success: false,
        errorMessage: String(err?.message || err).slice(0, 500),
        latencyMs: Date.now() - start,
        referenceId: options.referenceId ?? null,
      })

      if (isRetryableError(err) && attempt < maxAttempts) {
        const wait = backoffMs[attempt - 1] ?? 9000
        console.log(
          `      ⏳ Versuch ${attempt}/${maxAttempts} fehlgeschlagen (${String(err.message).slice(0, 80)}), warte ${wait}ms ...`
        )
        await sleep(wait)
        continue
      }
      throw err
    }
  }
  throw lastErr
}

/**
 * Generiert Embeddings für eine Liste von Texten in einem einzigen API-Call.
 * Spart Kosten und Zeit gegenüber N einzelnen Calls.
 * Maximum: 2048 Texte pro Batch (OpenAI-Limit).
 *
 * @param {string[]} texts
 * @param {Object} [options]   wie bei generateEmbedding
 * @returns {Promise<Array<{ index: number, embedding: number[] }>>}
 */
export async function generateEmbeddingsBatch(texts, options = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return []
  }
  if (texts.length > 2048) {
    throw new Error(
      `Batch zu groß: ${texts.length} Texte. OpenAI erlaubt max 2048 pro Call.`
    )
  }

  const model = options.model || EMBED_MODEL
  const operation = options.operation || 'embed_text_batch'
  const maxAttempts = 4
  const backoffMs = [1000, 3000, 9000]
  let lastErr

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now()
    try {
      const result = await rawEmbedCall(texts, model)
      const tokenCount = result.usage?.total_tokens ?? 0
      const costEur = calculateCost(model, tokenCount)

      await logAiUsage({
        provider: 'openai',
        model,
        operation,
        inputTokens: tokenCount,
        outputTokens: null,
        costEur,
        latencyMs: Date.now() - start,
        success: true,
        referenceId: options.referenceId ?? null,
      })

      // Reihenfolge erhalten: OpenAI gibt index zurück, wir sortieren danach
      return result.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((d) => ({ index: d.index, embedding: d.embedding }))
    } catch (err) {
      lastErr = err
      await logAiUsage({
        provider: 'openai',
        model,
        operation,
        success: false,
        errorMessage: String(err?.message || err).slice(0, 500),
        latencyMs: Date.now() - start,
        referenceId: options.referenceId ?? null,
      })

      if (isRetryableError(err) && attempt < maxAttempts) {
        const wait = backoffMs[attempt - 1] ?? 9000
        console.log(
          `      ⏳ Batch-Versuch ${attempt}/${maxAttempts} fehlgeschlagen (${String(err.message).slice(0, 80)}), warte ${wait}ms ...`
        )
        await sleep(wait)
        continue
      }
      throw err
    }
  }
  throw lastErr
}

export const OPENAI_EMBEDDING_MODEL = EMBED_MODEL
export const OPENAI_EMBEDDING_DIMENSIONS = EMBED_DIMENSIONS
