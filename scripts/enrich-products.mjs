#!/usr/bin/env node
/**
 * Produkt-Enrichment-Job (Phase 1)
 *
 * Läuft:
 *   • nach jedem weekly-scrape / on-demand-scrape (GitHub Workflow)
 *   • manuell: `node scripts/enrich-products.mjs`
 *
 * Logik:
 *   1. Finde offers ohne product_id (valid_until >= heute).
 *   2. Gruppiere nach product_name → spart Duplikat-Calls innerhalb einer Batch.
 *   3. Für jede Gruppe:
 *        a) Lookup in products via offer.fingerprint → falls gefunden, verknüpfen.
 *        b) Lookup via display_name = product_name   → falls gefunden, verknüpfen.
 *        c) Sonst: Gemini enrichen, UPSERT in products, Offers verknüpfen.
 *   4. Log summary + Telegram-kompatibler Exit-Code.
 *
 * ENV:
 *   SUPABASE_URL             (required)
 *   SUPABASE_SERVICE_KEY     (required)
 *   GEMINI_API_KEY           (required für neue Produkte)
 *   GEMINI_MODEL             (optional, default: gemini-1.5-flash)
 *   ENRICH_BATCH             (optional, default: 200)
 *   ENRICH_DELAY_MS          (optional, default: 250 — Rate-Limit-Puffer)
 *   AI_PROVIDER              (optional, default: gemini)
 *   DRY_RUN=1                (optional — nur lesen, nichts schreiben)
 */

import { createClient } from '@supabase/supabase-js'
import { enrichProduct } from './lib/ai/llm.mjs'
import { productFingerprint } from './lib/products/fingerprint.mjs'
import { ENRICHMENT_PROMPT_VERSION } from './lib/ai/prompts/product-enrich.mjs'

// ----------------------------------------------------------------------------
// Setup
// ----------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BATCH = Math.max(1, parseInt(process.env.ENRICH_BATCH || '200', 10))
const DELAY_MS = Math.max(0, parseInt(process.env.ENRICH_DELAY_MS || '250', 10))
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run')
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function normalizeBaseUnit(unit) {
  if (!unit) return null
  if (['g', 'kg'].includes(unit)) return 'kg'
  if (['ml', 'l'].includes(unit)) return 'l'
  return 'stk'
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  console.log(`🧠 Enrichment-Job gestartet`)
  console.log(`   Batch-Größe: ${BATCH}`)
  console.log(`   Delay zwischen Calls: ${DELAY_MS} ms`)
  console.log(`   Modell: ${MODEL}`)
  console.log(`   Dry Run: ${DRY_RUN}`)

  // --- Pending Offers laden ---
  const today = new Date().toISOString().slice(0, 10)
  const { data: pendingOffers, error: loadErr } = await supabase
    .from('offers')
    .select(
      'id, product_name, quantity, unit, category, store, offer_price, fingerprint'
    )
    .is('product_id', null)
    .gte('valid_until', today)
    .order('created_at', { ascending: true })
    .limit(BATCH)

  if (loadErr) {
    console.error('❌ Fehler beim Laden der Offers:', loadErr.message)
    process.exit(1)
  }
  if (!pendingOffers || pendingOffers.length === 0) {
    console.log('✨ Keine Offers warten auf Enrichment — alles verknüpft.')
    process.exit(0)
  }
  console.log(`📦 ${pendingOffers.length} Offers warten auf Enrichment`)

  // --- Gruppieren nach product_name, damit wir je Name nur 1× AI aufrufen ---
  const groups = new Map()
  for (const offer of pendingOffers) {
    const key = (offer.product_name || '').trim()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(offer)
  }
  console.log(`   → ${groups.size} eindeutige Produktnamen`)

  const stats = {
    groupsTotal: groups.size,
    newProducts: 0,
    linkedExisting: 0,
    offersLinked: 0,
    errors: 0,
    groupErrors: [],
  }

  let groupIndex = 0
  for (const [productName, offers] of groups) {
    groupIndex += 1
    const prefix = `[${groupIndex}/${groups.size}]`

    try {
      // Repräsentativer Offer für diese Gruppe
      const repOffer = offers[0]

      // --- 1) Prüfen ob bereits ein Produkt mit gleichem display_name existiert
      let productId = await findExistingProduct(repOffer.product_name)

      if (productId) {
        console.log(
          `${prefix} 🔁 "${productName.slice(0, 60)}" → bestehendes Produkt ${productId}`
        )
        stats.linkedExisting += 1
      } else {
        // --- 2) Neues Produkt enrichen
        console.log(`${prefix} 🤖 "${productName.slice(0, 60)}" → AI-Enrichment`)
        const enriched = await enrichProduct(
          {
            productName: repOffer.product_name,
            category: repOffer.category || undefined,
            store: repOffer.store || undefined,
            price:
              typeof repOffer.offer_price === 'number' ? repOffer.offer_price : undefined,
          },
          { referenceId: repOffer.id }
        )

        const fp = productFingerprint(
          enriched.brand,
          enriched.canonicalName,
          enriched.amount,
          enriched.unit
        )

        if (!DRY_RUN) {
          const { data: upserted, error: upsertErr } = await supabase
            .from('products')
            .upsert(
              {
                canonical_name: enriched.canonicalName,
                display_name: enriched.displayName,
                brand: enriched.brand,
                fingerprint: fp,
                amount: enriched.amount,
                unit: enriched.unit,
                base_unit: normalizeBaseUnit(enriched.unit),
                category: enriched.category,
                subcategory: enriched.subcategory,
                is_food: enriched.isFood,
                is_bio: enriched.isBio,
                is_regional: enriched.isRegional,
                is_vegan: enriched.isVegan,
                is_vegetarian: enriched.isVegetarian,
                enrichment_version: ENRICHMENT_PROMPT_VERSION,
                enrichment_model: MODEL,
                enrichment_confidence: enriched.confidence,
              },
              { onConflict: 'fingerprint' }
            )
            .select('id')
            .single()

          if (upsertErr) {
            throw new Error(`products-Upsert: ${upsertErr.message}`)
          }
          productId = upserted.id
        } else {
          console.log(`${prefix}   🧪 DRY — würde fingerprint "${fp}" anlegen`)
          productId = '00000000-0000-0000-0000-000000000000'
        }

        stats.newProducts += 1

        // Rate-Limit-Puffer nur bei echtem API-Call
        if (DELAY_MS > 0) await sleep(DELAY_MS)
      }

      // --- 3) Alle Offers dieser Gruppe verknüpfen ---
      if (!DRY_RUN && productId) {
        const offerIds = offers.map((o) => o.id)
        const { error: linkErr } = await supabase
          .from('offers')
          .update({ product_id: productId })
          .in('id', offerIds)

        if (linkErr) {
          throw new Error(`offers-Update: ${linkErr.message}`)
        }
        stats.offersLinked += offerIds.length
      } else if (DRY_RUN) {
        stats.offersLinked += offers.length
      }
    } catch (err) {
      stats.errors += 1
      stats.groupErrors.push({ productName, error: err.message })
      console.error(`${prefix} ❌ Gruppe "${productName}": ${err.message}`)
    }
  }

  // ----------------------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------------------
  console.log('')
  console.log('=========================================')
  console.log('📊 Zusammenfassung')
  console.log('=========================================')
  console.log(`   Produktnamen-Gruppen:  ${stats.groupsTotal}`)
  console.log(`   Neue Produkte:         ${stats.newProducts}`)
  console.log(`   Bestehende verknüpft:  ${stats.linkedExisting}`)
  console.log(`   Offers verknüpft:      ${stats.offersLinked}`)
  console.log(`   Fehler:                ${stats.errors}`)

  // Kosten nachschlagen
  const { data: costRows } = await supabase
    .from('ai_usage_log')
    .select('cost_eur, latency_ms, success')
    .eq('operation', 'enrich_product')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if (costRows && costRows.length > 0) {
    const totalCost = costRows.reduce((s, r) => s + (Number(r.cost_eur) || 0), 0)
    const avgLatency = Math.round(
      costRows.reduce((s, r) => s + (Number(r.latency_ms) || 0), 0) / costRows.length
    )
    const failed = costRows.filter((r) => r.success === false).length
    console.log(
      `   AI-Calls (letzte 60 Min): ${costRows.length} • ${totalCost.toFixed(
        4
      )} € • ⌀ ${avgLatency} ms • ${failed} Fehler`
    )
  }

  if (stats.errors > 0) {
    console.log('')
    console.log('⚠️  Fehler-Details:')
    for (const e of stats.groupErrors.slice(0, 10)) {
      console.log(`   - ${e.productName.slice(0, 70)}: ${e.error}`)
    }
    process.exit(stats.errors > stats.groupsTotal * 0.5 ? 1 : 0)
  }

  console.log('✅ Enrichment erfolgreich')
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function findExistingProduct(productName) {
  if (!productName) return null
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('display_name', productName)
    .limit(1)
  if (error) {
    console.warn(`   ⚠️  products-Lookup-Fehler: ${error.message}`)
    return null
  }
  return data && data.length > 0 ? data[0].id : null
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

main().catch((err) => {
  console.error('💥 Unerwarteter Fehler:', err)
  process.exit(1)
})
