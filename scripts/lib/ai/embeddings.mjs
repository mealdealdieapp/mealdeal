/**
 * Embedding-Abstraction-Layer (Phase 2)
 *
 * Switchable über Env-Variable EMBEDDING_PROVIDER (default: 'openai').
 * Aktuell unterstützt: 'openai'.
 * Andere Provider (Cohere, Voyage, self-hosted Sentence-Transformers) können
 * später drangepappt werden, ohne dass der Aufrufer was anpassen muss.
 *
 * Nutzung:
 *   import { generateEmbedding, generateEmbeddingsBatch, ACTIVE_EMBEDDING_PROVIDER, ACTIVE_EMBEDDING_MODEL } from './embeddings.mjs'
 *   const { embedding, dimensions } = await generateEmbedding('Hähnchenbrust 500g')
 */

import {
  generateEmbedding as openaiEmbedding,
  generateEmbeddingsBatch as openaiBatch,
  OPENAI_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_DIMENSIONS,
} from './providers/openai.mjs'

const PROVIDER = (process.env.EMBEDDING_PROVIDER || 'openai').toLowerCase()

export async function generateEmbedding(text, options = {}) {
  switch (PROVIDER) {
    case 'openai':
      return openaiEmbedding(text, options)
    default:
      throw new Error(
        `Unbekannter EMBEDDING_PROVIDER: "${PROVIDER}". Aktuell unterstützt: openai.`
      )
  }
}

export async function generateEmbeddingsBatch(texts, options = {}) {
  switch (PROVIDER) {
    case 'openai':
      return openaiBatch(texts, options)
    default:
      throw new Error(
        `Unbekannter EMBEDDING_PROVIDER: "${PROVIDER}". Aktuell unterstützt: openai.`
      )
  }
}

export const ACTIVE_EMBEDDING_PROVIDER = PROVIDER
export const ACTIVE_EMBEDDING_MODEL =
  PROVIDER === 'openai' ? OPENAI_EMBEDDING_MODEL : 'unknown'
export const ACTIVE_EMBEDDING_DIMENSIONS =
  PROVIDER === 'openai' ? OPENAI_EMBEDDING_DIMENSIONS : null
