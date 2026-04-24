#!/usr/bin/env node
/**
 * Produkt-Embedding-Job (Phase 2)
 *
 * Für jedes Produkt in der `products`-Tabelle, das noch kein Embedding hat,
 * wird ein OpenAI-Embedding generiert und in `product_embeddings` gespeichert.
 *
 * Idempotent: kann beliebig oft laufen, springt automatisch dort weiter, wo aufgehört.
 *
 * ENV:
 *   SUPABASE_URL                 (required)
 *   SUPABASE_SERVICE_KEY         (required)
 *   OPENAI_API_KEY               (required)
 *   EMBEDDING_PROVIDER           (optional, default: 'openai')
 *   EMBED_BATCH                  (optional, default: 100 — max 2048)
 *   EMBED_MAX_PRODUCTS           (optional, default: 1000 — Soft-Cap pro Run)
 *   DRY_RUN=1                    (optional — nur lesen, keine Embeddings generieren)
 */

import { createClient } from '@supabase/supabase-js'
import {
  generateEmbeddingsBatch,
  ACTIVE_EMBEDDING_PROVIDER,
  ACTIVE_EMBEDDING_MODEL,
  ACTIVE_EMBEDDING_DIMENSIONS,
} from './lib/ai/embeddings.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BATCH = Math.min(2048, Math.max(1, parseInt(process.env.EMBED_BATCH || '100', 10)))
const MAX_PRODUCTS = Math.max(1, parseInt(process.env.EMBED_MAX_PRODUCTS || '1000', 10))
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Baut den Text, den wir embedden. Deterministisch, damit gleicher Produkt-Datensatz
 * immer den gleichen Vektor produziert (wichtig für Caching + Idempotenz).
 */
function buildEmbedText(p) {
  const parts = [
    p.display_name,
    p.brand ? `Marke: ${p.brand}` : null,
    p.category ? `Kategorie: ${p.category}` : null,
    p.subcategory ? `Unterkategorie: ${p.subcategory}` : null,
  ].filter(Boolean)
  return parts.join(' | ')
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  console.log('🧠 Produkt-Embedding-Job gestartet')
  console.log(`   Provider:        ${ACTIVE_EMBEDDING_PROVIDER}`)
  console.log(`   Modell:          ${ACTIVE_EMBEDDING_MODEL}`)
  console.log(`   Dimensionen:     ${ACTIVE_EMBEDDING_DIMENSIONS}`)
  console.log(`   Batch-Größe:     ${BATCH}`)
  console.log(`   Max-Produkte:    ${MAX_PRODUCTS}`)
  console.log(`   Dry Run:         ${DRY_RUN}`)

  // --- Pending Products laden: alle, die noch kein Embedding für unser Modell haben
  const { data: pending, error: loadErr } = await supabase
    .from('products')
    .select(
      `id, display_name, brand, category, subcategory,
       product_embeddings!left(id, model)`
    )
    .limit(MAX_PRODUCTS * 2) // großzügig laden, dann filtern

  if (loadErr) {
    console.error('❌ Fehler beim Laden der Produkte:', loadErr.message)
    process.exit(1)
  }

  // Filter: nur die ohne Embedding für unser konkretes Modell
  const todo = (pending || [])
    .filter(
      (p) =>
        !p.product_embeddings ||
        !p.product_embeddings.some((e) => e.model === ACTIVE_EMBEDDING_MODEL)
    )
    .slice(0, MAX_PRODUCTS)

  if (todo.length === 0) {
    console.log('✨ Keine Produkte warten auf Embedding — alles aktuell.')
    process.exit(0)
  }

  console.log(`📦 ${todo.length} Produkte warten auf Embedding`)

  const stats = {
    total: todo.length,
    embedded: 0,
    failed: 0,
    batches: 0,
  }

  // In Batches arbeiten
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH)
    const texts = chunk.map(buildEmbedText)
    const batchNum = Math.floor(i / BATCH) + 1
    const totalBatches = Math.ceil(todo.length / BATCH)

    console.log(`[Batch ${batchNum}/${totalBatches}] ${chunk.length} Produkte`)

    if (DRY_RUN) {
      console.log(
        `   🧪 DRY — würde ${chunk.length} Embeddings generieren, Beispiel: "${texts[0]?.slice(0, 80)}"`
      )
      stats.embedded += chunk.length
      stats.batches += 1
      continue
    }

    try {
      const embeddings = await generateEmbeddingsBatch(texts, {
        operation: 'embed_product',
      })

      // INSERT in product_embeddings
      const rows = embeddings.map((e) => ({
        product_id: chunk[e.index].id,
        model: ACTIVE_EMBEDDING_MODEL,
        dimensions: ACTIVE_EMBEDDING_DIMENSIONS,
        embedding: e.embedding,
        source_text: texts[e.index],
      }))

      const { error: insertErr } = await supabase
        .from('product_embeddings')
        .insert(rows)

      if (insertErr) {
        // Häufigster Fall: Race-Condition / Duplikat. Nicht fatal.
        console.warn(`   ⚠️  Insert-Fehler: ${insertErr.message}`)
        stats.failed += chunk.length
      } else {
        stats.embedded += chunk.length
        console.log(`   ✅ ${chunk.length} Embeddings gespeichert`)
      }

      stats.batches += 1
    } catch (err) {
      console.error(`   ❌ Batch ${batchNum}: ${err.message}`)
      stats.failed += chunk.length
    }
  }

  // ----------------------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------------------
  console.log('')
  console.log('=========================================')
  console.log('📊 Zusammenfassung')
  console.log('=========================================')
  console.log(`   Produkte total:    ${stats.total}`)
  console.log(`   Embedded:          ${stats.embedded}`)
  console.log(`   Fehler:            ${stats.failed}`)
  console.log(`   Batches:           ${stats.batches}`)

  // Kosten
  const { data: costRows } = await supabase
    .from('ai_usage_log')
    .select('cost_eur, latency_ms, success')
    .eq('operation', 'embed_product')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if (costRows && costRows.length > 0) {
    const totalCost = costRows.reduce((s, r) => s + (Number(r.cost_eur) || 0), 0)
    const avgLatency = Math.round(
      costRows.reduce((s, r) => s + (Number(r.latency_ms) || 0), 0) / costRows.length
    )
    const failed = costRows.filter((r) => r.success === false).length
    console.log(
      `   AI-Calls (60 Min): ${costRows.length} • ${totalCost.toFixed(4)} € • ⌀ ${avgLatency} ms • ${failed} Fehler`
    )
  }

  if (stats.failed > 0 && stats.failed > stats.total * 0.5) {
    console.log('⚠️  Mehr als 50% Fehler — Workflow exit code 1')
    process.exit(1)
  }

  console.log('✅ Embedding erfolgreich')
}

main().catch((err) => {
  console.error('💥 Unerwarteter Fehler:', err)
  process.exit(1)
})
