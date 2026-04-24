#!/usr/bin/env node
/**
 * Match-Computation-Job (Phase 2)
 *
 * Berechnet für jede Zutat (mit Embedding) die Top-K ähnlichsten Produkte
 * via pgvector Cosine-Similarity und speichert die Matches in
 * `product_ingredient_matches`.
 *
 * Idempotent: UPSERT auf (product_id, ingredient_name).
 *
 * ENV:
 *   SUPABASE_URL                 (required)
 *   SUPABASE_SERVICE_KEY         (required)
 *   MATCH_TOP_K                  (optional, default: 5)
 *   MATCH_MIN_SCORE              (optional, default: 0.6)
 *   MATCH_MAX_INGREDIENTS        (optional, default: 5000 — Soft-Cap pro Run)
 *   DRY_RUN=1                    (optional)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const TOP_K = Math.max(1, parseInt(process.env.MATCH_TOP_K || '5', 10))
const MIN_SCORE = Math.max(0, Math.min(1, parseFloat(process.env.MATCH_MIN_SCORE || '0.6')))
const MAX_INGREDIENTS = Math.max(
  1,
  parseInt(process.env.MATCH_MAX_INGREDIENTS || '5000', 10)
)
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  console.log('🔗 Match-Computation-Job gestartet')
  console.log(`   Top-K:           ${TOP_K} Produkte pro Zutat`)
  console.log(`   Min-Score:       ${MIN_SCORE} (Cosine-Similarity)`)
  console.log(`   Max-Zutaten:     ${MAX_INGREDIENTS}`)
  console.log(`   Dry Run:         ${DRY_RUN}`)

  // --- Pre-Flight: ein paar Zahlen
  const { count: ingredientCount } = await supabase
    .from('ingredient_embeddings')
    .select('*', { count: 'exact', head: true })

  const { count: productCount } = await supabase
    .from('product_embeddings')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 ${ingredientCount} Zutaten-Embeddings, ${productCount} Produkt-Embeddings in DB`)

  if (!ingredientCount || !productCount) {
    console.log('⚠️  Mindestens eine Embedding-Tabelle ist leer. Erst embedden, dann matchen.')
    process.exit(0)
  }

  // --- Lade alle Zutaten-Embeddings, die wir matchen wollen
  const { data: ingredients, error: ingErr } = await supabase
    .from('ingredient_embeddings')
    .select('id, ingredient_id, ingredient_name')
    .limit(MAX_INGREDIENTS)

  if (ingErr) {
    console.error('❌ Fehler beim Laden der Zutaten-Embeddings:', ingErr.message)
    process.exit(1)
  }

  const stats = {
    ingredients: ingredients.length,
    matchesFound: 0,
    matchesUpserted: 0,
    primaryMarked: 0,
    errors: 0,
  }

  let progress = 0
  for (const ing of ingredients) {
    progress += 1
    const prefix = `[${progress}/${ingredients.length}]`

    try {
      // --- Cosine-Similarity-Suche via RPC oder Inline-Query
      // Wir nutzen eine direkte Query mit dem pgvector <=> Operator
      // (Cosine-Distance, nicht Similarity — wir konvertieren: similarity = 1 - distance)
      const { data: topMatches, error: matchErr } = await supabase.rpc(
        'match_products_for_ingredient',
        {
          p_ingredient_embedding_id: ing.id,
          p_top_k: TOP_K,
          p_min_similarity: MIN_SCORE,
        }
      )

      if (matchErr) {
        // Falls die RPC nicht existiert: Fallback via direktem SQL (sollte aber existieren)
        console.warn(`${prefix} ⚠️  RPC-Fehler für "${ing.ingredient_name}": ${matchErr.message}`)
        stats.errors += 1
        continue
      }

      if (!topMatches || topMatches.length === 0) {
        // Keine Matches über min_score — überspringen
        continue
      }

      stats.matchesFound += topMatches.length

      if (DRY_RUN) {
        console.log(
          `${prefix} 🧪 "${ing.ingredient_name}" → ${topMatches.length} Matches, top: "${topMatches[0].product_name}" (${topMatches[0].similarity.toFixed(3)})`
        )
        continue
      }

      // --- Bulk-UPSERT: ein Eintrag pro Match
      const rows = topMatches.map((m, idx) => ({
        product_id: m.product_id,
        ingredient_id: ing.ingredient_id,
        ingredient_name: ing.ingredient_name,
        similarity_score: m.similarity,
        is_primary_match: idx === 0, // höchster Score ist primary
        method: 'embedding',
      }))

      // ON CONFLICT: lösche alte Matches dieser Zutat erst, dann neu einfügen
      // (sonst bleiben veraltete Matches stehen, die beim nächsten Run nicht mehr top sind)
      const { error: deleteErr } = await supabase
        .from('product_ingredient_matches')
        .delete()
        .eq('ingredient_name', ing.ingredient_name)
        .eq('method', 'embedding')

      if (deleteErr) {
        console.warn(`${prefix} ⚠️  Delete-alte-Matches: ${deleteErr.message}`)
      }

      const { error: insertErr } = await supabase
        .from('product_ingredient_matches')
        .insert(rows)

      if (insertErr) {
        console.warn(`${prefix} ❌ Insert-Fehler: ${insertErr.message}`)
        stats.errors += 1
        continue
      }

      stats.matchesUpserted += rows.length
      stats.primaryMarked += 1

      if (progress % 50 === 0 || progress === ingredients.length) {
        console.log(
          `${prefix} ✅ Fortschritt: ${stats.matchesUpserted} Matches gespeichert, ${stats.errors} Fehler`
        )
      }
    } catch (err) {
      console.error(`${prefix} 💥 ${ing.ingredient_name}: ${err.message}`)
      stats.errors += 1
    }
  }

  // ----------------------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------------------
  console.log('')
  console.log('=========================================')
  console.log('📊 Zusammenfassung')
  console.log('=========================================')
  console.log(`   Zutaten verarbeitet:  ${stats.ingredients}`)
  console.log(`   Matches gefunden:     ${stats.matchesFound}`)
  console.log(`   Matches gespeichert:  ${stats.matchesUpserted}`)
  console.log(`   Primary markiert:     ${stats.primaryMarked}`)
  console.log(`   Fehler:               ${stats.errors}`)

  if (stats.errors > 0 && stats.errors > stats.ingredients * 0.5) {
    console.log('⚠️  Mehr als 50% Fehler — Workflow exit code 1')
    process.exit(1)
  }

  console.log('✅ Match-Computation erfolgreich')
}

main().catch((err) => {
  console.error('💥 Unerwarteter Fehler:', err)
  process.exit(1)
})
