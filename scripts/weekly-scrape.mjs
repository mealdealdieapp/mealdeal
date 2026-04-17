#!/usr/bin/env node
/**
 * MealDeal — Wöchentlicher PLZ-Präfix-Scraper (v2, April 2026)
 *
 * NEUE FEATURES (v2):
 *   • Mengen & Grundpreis-Parsing (500g → base_price €/kg)
 *   • Marken- & Bio-Erkennung
 *   • Unterkategorien (Fleisch → Rind/Schwein/Geflügel etc.)
 *   • Ingredient Pre-Matching → offer_ingredient_matches
 *   • Preishistorie → price_history (erkennt echte vs. Fake-Deals)
 *   • Fuzzy-Dedup via canonical_key
 *   • Retry mit Exponential-Backoff bei API-Fehlern
 *   • Scrape-Monitoring → scrape_runs
 *
 * ENV:
 *   MARKTGURU_API_KEY    - Marktguru API-Key
 *   SUPABASE_SERVICE_KEY - Supabase Service Role Key
 *
 * USAGE:
 *   node scripts/weekly-scrape.mjs               # Normal
 *   node scripts/weekly-scrape.mjs --force       # Ignore scraped_this_week
 *   node scripts/weekly-scrape.mjs --dry-run     # Kein DB-Write
 *   node scripts/weekly-scrape.mjs --plz 80331   # Spezifisches Präfix
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import {
  parseQuantity, calcBasePrice, extractBrand,
  detectBio, detectRegional, mapSubcategory, canonicalKey,
} from './scraperHelpers.mjs'
import { buildMatcher } from './scraperMatching.mjs'

// ==============================================================
// ENV
// ==============================================================
function loadEnv() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return {}
  const env = {}
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#')) env[key.trim()] = rest.join('=').trim()
  })
  return env
}

const envVars = loadEnv()
const SUPABASE_URL = process.env.SUPABASE_URL || envVars.VITE_SUPABASE_URL || 'https://wjhesvkapqrsbibqjbtr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY || ''
const MARKTGURU_API_KEY = process.env.MARKTGURU_API_KEY || envVars.MARKTGURU_API_KEY || '8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE='
const MARKTGURU_BASE = 'https://api.marktguru.de/api/v1'

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const DRY_RUN = args.includes('--dry-run')
const PLZ_ARG_INDEX = args.indexOf('--plz')
const SPECIFIC_PLZ = PLZ_ARG_INDEX >= 0 ? args[PLZ_ARG_INDEX + 1] : null

if (!SUPABASE_KEY) { console.error('❌ Supabase Key fehlt!'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ==============================================================
// MARKT-NORMALISIERUNG
// ==============================================================
const KNOWN_MARKETS = {
  'REWE': 'REWE', 'Rewe': 'REWE', 'REWE Center': 'REWE',
  'PENNY': 'Penny', 'Penny': 'Penny',
  'EDEKA': 'Edeka', 'Edeka': 'Edeka', 'E center': 'Edeka', 'E Center': 'Edeka',
  'Kaufland': 'Kaufland',
  'Lidl': 'Lidl', 'LIDL': 'Lidl',
  'ALDI SÜD': 'ALDI', 'ALDI NORD': 'ALDI', 'ALDI Nord': 'ALDI',
  'Aldi Nord': 'ALDI', 'Aldi Süd': 'ALDI', 'ALDI': 'ALDI', 'Aldi': 'ALDI',
  'Netto Marken-Discount': 'Netto', 'Netto': 'Netto',
  'Norma': 'Norma', 'NORMA': 'Norma',
  'nahkauf': 'nahkauf', 'Nahkauf': 'nahkauf',
  'dm': 'dm', 'Rossmann': 'Rossmann', 'ROSSMANN': 'Rossmann',
  'Globus': 'Globus', 'GLOBUS': 'Globus',
  'Marktkauf': 'Marktkauf', 'Hit': 'Hit', 'HIT': 'Hit',
}
function normalizeMarketName(name) {
  if (!name) return null
  if (KNOWN_MARKETS[name]) return KNOWN_MARKETS[name]
  const upper = name.toUpperCase()
  for (const [key, val] of Object.entries(KNOWN_MARKETS)) {
    if (upper.includes(key.toUpperCase())) return val
  }
  return name
}

// ==============================================================
// NON-FOOD FILTER
// ==============================================================
const NON_FOOD_PRODUCT_KEYWORDS = [
  'toaster', 'mixer', 'spender', 'maker', 'maschine', 'automat',
  'pfanne', 'topf', 'messer', 'gabel', 'löffel', 'besteck',
  'teller', 'schüssel', 'vorratsdose', 'frischhalte',
  'bügel', 'wäsche', 'reiniger', 'spülmittel', 'seife',
  'shampoo', 'duschgel', 'zahnpasta', 'deo ', 'creme',
  'toilettenpapier', 'küchenpapier', 'taschentücher',
  'müllbeutel', 'alufolie', 'backpapier', 'frischhaltefolie',
  'windel', 'feuchttücher', 'wattepads', 'rasierer', 'parfüm',
  'katzenfutter', 'hundefutter', 'tierfutter', 'katzenstreu',
  'batterie', 'glühbirne', 'ladekabel', 'kopfhörer',
  'bluetooth', 'adapter', 'fernbedienung', 'router',
  'matratze', 'bettdecke', 'kissen', 'bettlaken', 'bettwäsche',
  'handtuch', 'duschvorhang', 'vorhang', 'gardine',
  'regal', 'schrank', 'kommode', 'stuhl', 'hocker',
  'lampe', 'leuchte', 'steckdose', 'verlängerung',
  'jogginghose', 'socken', 'unterwäsche', 'pullover', 'jacke',
  'shirt', 'hose', 'kleid', 'schuhe', 'stiefel', 'sandalen',
  'achselhemd', 'boxer', 'jeans', 'strumpf', 'bh ',
  'damen-', 'herren-', 'men ', 'women ', 'kinderkleidung',
  'blumenständer', 'blumentopf', 'erde', 'dünger', 'gartenschere',
  'grillbürste', 'grillzange', 'grillanzünder',
  'werkzeug', 'schrauben', 'kleber', 'bohrer', 'säge', 'hammer', 'zange',
  'kfz-', 'kfz ', 'auto-', 'scheibenwischer',
  'spielzeug', 'puzzle', 'brettspiel', 'puppe', 'camping',
  'staubsauger', 'besen', 'eimer', 'mopp',
  'waschmittel', 'weichspüler', 'geschirrspül',
  'fritteuse', 'friteuse', 'tacker', 'entfeuchter', 'befeuchter',
]
function isNonFoodProduct(productName) {
  const lower = (productName || '').toLowerCase()
  return NON_FOOD_PRODUCT_KEYWORDS.some(kw => lower.includes(kw))
}

// ==============================================================
// KATEGORIE-MAPPING (Haupt-Kategorie)
// ==============================================================
function mapCategory(catName, productName) {
  const cat = (catName || '').toLowerCase()
  const name = (productName || '').toLowerCase()
  if (['fleisch', 'wurst', 'schinken', 'geflügel'].some(k => cat.includes(k))) return 'Fleisch'
  if (['obst'].some(k => cat.includes(k))) return 'Obst'
  if (['gemüse', 'salat'].some(k => cat.includes(k))) return 'Gemüse'
  if (['milch', 'joghurt', 'butter', 'sahne', 'quark', 'eier'].some(k => cat.includes(k))) return 'Milch & Eier'
  if (cat.includes('käse')) return 'Käse'
  if (cat.includes('tiefkühl')) return 'Tiefkühl'
  if (['getränke', 'bier', 'wein', 'saft', 'wasser'].some(k => cat.includes(k))) return 'Getränke'
  if (['snack', 'süß', 'chips', 'schokolade', 'keks'].some(k => cat.includes(k))) return 'Snacks & Süßes'
  if (['brot', 'back', 'brötchen'].some(k => cat.includes(k))) return 'Backwaren'
  if (['nudel', 'reis', 'pasta'].some(k => cat.includes(k))) return 'Nudeln & Reis'
  if (['fisch', 'meeresfrüchte'].some(k => cat.includes(k))) return 'Fisch & Meeresfrüchte'
  if (['öl', 'fett'].some(k => cat.includes(k))) return 'Öle & Fette'
  if (['haushalt', 'reinigung'].some(k => cat.includes(k))) return 'Haushalt'
  if (['drogerie', 'pflege', 'hygiene'].some(k => cat.includes(k))) return 'Drogerie'
  // Fallback über productName
  if (['hähnchen', 'rindfleisch', 'schweine', 'hack', 'salami'].some(k => name.includes(k))) return 'Fleisch'
  if (['lachs', 'thunfisch', 'forelle', 'garnelen'].some(k => name.includes(k))) return 'Fisch & Meeresfrüchte'
  if (['tomate', 'gurke', 'paprika', 'zwiebel', 'karotte', 'möhre', 'salat', 'brokkoli', 'spinat'].some(k => name.includes(k))) return 'Gemüse'
  if (['apfel', 'banane', 'orange', 'erdbeere', 'zitrone', 'avocado'].some(k => name.includes(k))) return 'Obst'
  if (['joghurt', 'quark', 'milch', 'sahne', 'butter', 'eier'].some(k => name.includes(k))) return 'Milch & Eier'
  return 'Sonstiges Lebensmittel'
}

// ==============================================================
// HTTP FETCH mit Retry + Exponential Backoff
// ==============================================================
async function fetchWithRetry(url, opts = {}, maxRetries = 4) {
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, opts)
      if (res.status === 429 || res.status >= 500) {
        // Rate-limit oder Server-Fehler → retry
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10)
        const wait = retryAfter > 0 ? retryAfter * 1000 : 500 * Math.pow(2, attempt)
        lastErr = new Error(`HTTP ${res.status}`)
        await sleep(wait)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      if (attempt === maxRetries) break
      await sleep(500 * Math.pow(2, attempt))
    }
  }
  throw lastErr || new Error('fetch failed after retries')
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchMarktguruPage(zipCode, industryId, offset, retryCounter) {
  const url = `${MARKTGURU_BASE}/offers?as=web&limit=200&offset=${offset}&zipCode=${zipCode}&industryId=${industryId}`
  const beforeRetries = retryCounter.value
  const raw = await fetchWithRetry(url, {
    headers: {
      'Accept': 'application/json',
      'X-Api-Key': MARKTGURU_API_KEY,
      'User-Agent': 'MealDeal-Scraper/2.0',
    },
  })
  // retryCounter wird innerhalb fetchWithRetry nicht tracked, daher vereinfacht:
  if (retryCounter) retryCounter.value = beforeRetries
  return Array.isArray(raw) ? raw : (raw?.results || raw?.offers || raw?.data || [])
}

// ==============================================================
// LADE INGREDIENTS + SYNONYME (einmal pro Lauf)
// ==============================================================
async function loadMatchingContext() {
  const [{ data: ingredients, error: ingErr }, { data: synonyms, error: synErr }] = await Promise.all([
    supabase.from('ingredients').select('id, name, category'),
    supabase.from('ingredient_synonyms').select('ingredient_id, synonym'),
  ])
  if (ingErr) { console.warn('⚠️  ingredients laden fehlgeschlagen:', ingErr.message); return null }
  console.log(`   🧩 ${ingredients?.length || 0} Ingredients + ${synonyms?.length || 0} Synonyme geladen`)
  return buildMatcher(ingredients || [], synonyms || [])
}

// ==============================================================
// FUZZY-DEDUP: gleiche canonical_key + gleicher store + gleiche valid_until
// → lasse nur das Angebot mit niedrigstem Preis pro Gruppe
// ==============================================================
function fuzzyDedup(offers) {
  const groups = new Map()
  let skipped = 0
  for (const o of offers) {
    if (!o.canonical_key) { continue } // skip dedup wenn kein key
    const groupKey = `${o.store}|${o.canonical_key}|${o.valid_until}`
    const existing = groups.get(groupKey)
    if (!existing) {
      groups.set(groupKey, o)
    } else {
      skipped++
      // Behalte den mit niedrigerem Preis
      if (o.offer_price < existing.offer_price) groups.set(groupKey, o)
    }
  }
  // Füge alle ohne canonical_key hinzu (unfilterbar)
  const result = Array.from(groups.values())
  for (const o of offers) {
    if (!o.canonical_key) result.push(o)
  }
  return { deduped: result, skipped }
}

// ==============================================================
// SCRAPE EINEN PLZ-PRÄFIX
// ==============================================================
async function scrapePlzPrefix(prefix, matcher) {
  const samplePlz = `${prefix}00`
  const plzPrefix = prefix
  console.log(`\n🔍 Scrape PLZ-Präfix ${prefix} (Sample: ${samplePlz})`)

  // ------- 1) scrape_runs: run starten -------
  let runId = null
  if (!DRY_RUN) {
    const { data } = await supabase.from('scrape_runs').insert({
      plz_prefix: plzPrefix,
      status: 'running',
    }).select('id').single()
    if (data) runId = data.id
  }

  const runStats = {
    total_raw: 0,
    total_saved: 0,
    skipped_non_food: 0,
    skipped_dedup: 0,
    skipped_invalid: 0,
    matches_created: 0,
    api_calls: 0,
    retries: 0,
    per_store: {},
    per_category: {},
  }
  const retryCounter = { value: 0 }

  try {
    // ------- 2) Rohdaten von Marktguru holen -------
    const allOffers = []
    for (const industryId of [1009, 1023]) {
      let offset = 0
      while (offset < 1200 && runStats.api_calls < 12) {
        try {
          runStats.api_calls++
          const offers = await fetchMarktguruPage(samplePlz, industryId, offset, retryCounter)
          if (!offers.length) break
          allOffers.push(...offers)
          if (offers.length < 200) break
          offset += 200
          await sleep(300)
        } catch (err) {
          console.error(`   ⚠️ API Fehler bei industry=${industryId} offset=${offset}: ${err.message}`)
          break
        }
      }
    }
    runStats.retries = retryCounter.value
    runStats.total_raw = allOffers.length
    console.log(`   📥 ${allOffers.length} Rohangebote geladen (${runStats.api_calls} API Calls, ${runStats.retries} Retries)`)

    if (!allOffers.length) {
      await finalizeRun(runId, 'success', runStats)
      return { prefix, ...runStats }
    }

    // ------- 3) Transform + Anreicherung -------
    const seen = new Set()
    const toInsert = []

    for (const offer of allOffers) {
      const advertiserName = offer.advertisers?.[0]?.name
      if (!advertiserName) { runStats.skipped_invalid++; continue }
      const market = normalizeMarketName(advertiserName)
      if (!market) { runStats.skipped_invalid++; continue }

      const title = offer.product?.name || (offer.description || '').split('\n')[0]
      if (!title?.trim() || offer.price == null) { runStats.skipped_invalid++; continue }

      // Non-Food Filter
      if (isNonFoodProduct(title)) {
        runStats.skipped_non_food++
        continue
      }

      // Gültigkeit
      let validFrom = null, validUntil = null
      if (offer.validityDates?.[0]) {
        validFrom = (offer.validityDates[0].from || '').slice(0, 10)
        validUntil = (offer.validityDates[0].to || '').slice(0, 10)
      }
      if (!validUntil) { runStats.skipped_invalid++; continue }

      const fp = `${market}_${title.trim()}_${validUntil}_${offer.price}`.toLowerCase()
      if (seen.has(fp)) { runStats.skipped_dedup++; continue }
      seen.add(fp)

      // Alter Preis + Rabatt
      let oldPrice = offer.oldPrice ?? offer.referencePrice ?? offer.regularPrice ?? null
      let discount = null
      if (oldPrice && oldPrice > offer.price) {
        discount = Math.round(((oldPrice - offer.price) / oldPrice) * 100)
      }
      if (!oldPrice && offer.discount && offer.discount > 0 && offer.discount < 100) {
        oldPrice = Math.round((offer.price / (1 - offer.discount / 100)) * 100) / 100
        discount = Math.round(offer.discount)
      }
      if (discount && (discount > 90 || discount < 1)) { discount = null; oldPrice = null }

      let imageUrl = null
      if (offer.images?.[0]) {
        imageUrl = offer.images[0].url || offer.images[0].large || offer.images[0].medium || null
      }

      const catName = offer.categories?.[0]?.name || ''
      const trimmedName = title.trim()

      // ----- ANREICHERUNG -----
      const category = mapCategory(catName, trimmedName)
      const subcategory = mapSubcategory(category, trimmedName)
      const brand = extractBrand(trimmedName)
      const isBio = detectBio(trimmedName)
      const isRegional = detectRegional(trimmedName)
      const { amount, unit } = parseQuantity(trimmedName, offer.quantity)
      const { basePrice, baseUnit } = calcBasePrice(offer.price, amount, unit)
      const cKey = canonicalKey(trimmedName, brand)

      toInsert.push({
        product_name: trimmedName,
        store: market,
        offer_price: Math.round(offer.price * 100) / 100,
        original_price: oldPrice ? Math.round(oldPrice * 100) / 100 : null,
        discount_percent: discount,
        plz: samplePlz,
        plz_prefix: plzPrefix,
        category,
        subcategory,
        brand,
        is_bio: isBio,
        is_regional: isRegional,
        amount,
        unit,
        base_price: basePrice,
        base_unit: baseUnit,
        canonical_key: cKey,
        valid_from: validFrom,
        valid_until: validUntil,
        image_url: imageUrl,
        quantity: offer.quantity || null,
        fingerprint: fp,
      })
    }

    // ------- 4) Fuzzy-Dedup -------
    const { deduped, skipped: fuzzySkipped } = fuzzyDedup(toInsert)
    runStats.skipped_dedup += fuzzySkipped
    console.log(`   🧹 ${fuzzySkipped} weitere Fuzzy-Duplikate entfernt`)

    // ------- 5) Statistik pro Store / Category -------
    for (const o of deduped) {
      runStats.per_store[o.store] = (runStats.per_store[o.store] || 0) + 1
      runStats.per_category[o.category] = (runStats.per_category[o.category] || 0) + 1
    }

    console.log(`   🔧 ${deduped.length} eindeutige Angebote nach Dedup (${runStats.skipped_non_food} Non-Food übersprungen)`)

    if (DRY_RUN) {
      console.log(`   🧪 DRY RUN — würde ${deduped.length} Angebote upserten`)
      return { prefix, ...runStats, saved: 0, dryRun: true }
    }

    // ------- 6) Upsert in Batches -------
    const insertedIdsByFp = new Map()
    for (let i = 0; i < deduped.length; i += 100) {
      const batch = deduped.slice(i, i + 100)
      const { data, error } = await supabase
        .from('offers')
        .upsert(batch, { onConflict: 'fingerprint' })
        .select('id, fingerprint')
      if (error) {
        console.error(`   ❌ Batch ${Math.floor(i / 100)}: ${error.message}`)
      } else {
        runStats.total_saved += batch.length
        for (const row of (data || [])) insertedIdsByFp.set(row.fingerprint, row.id)
      }
    }
    console.log(`   ✅ ${runStats.total_saved}/${deduped.length} Angebote gespeichert`)

    // ------- 7) Preishistorie -------
    const historyRows = deduped
      .filter(o => o.canonical_key)
      .map(o => ({
        canonical_key: o.canonical_key,
        market: o.store,           // existierende Spalte heißt 'market'
        plz_prefix: o.plz_prefix,
        price: o.offer_price,
        amount: o.amount,
        unit: o.unit,
        base_price: o.base_price,
        seen_at: new Date().toISOString().split('T')[0],
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: o.valid_until,
      }))
    if (historyRows.length) {
      for (let i = 0; i < historyRows.length; i += 200) {
        const batch = historyRows.slice(i, i + 200)
        const { error } = await supabase
          .from('price_history')
          .insert(batch)
        if (error) console.warn(`   ⚠️  Preishistorie Batch fehlgeschlagen: ${error.message}`)
      }
      console.log(`   📈 ${historyRows.length} Preishistorie-Einträge geschrieben`)
    }

    // ------- 8) Echter-Deal-Markierung (anhand Median der letzten 6 Wochen) -------
    await markRealDeals(deduped, insertedIdsByFp)

    // ------- 9) Ingredient Pre-Matching -------
    if (matcher) {
      runStats.matches_created = await buildAndSaveMatches(deduped, insertedIdsByFp, matcher)
      console.log(`   🧩 ${runStats.matches_created} Ingredient-Matches erzeugt`)
    }

    // ------- 10) scraped_this_week markieren -------
    const weekStart = getWeekStart()
    await supabase.from('scraped_this_week').upsert({
      plz_prefix: plzPrefix,
      week_start: weekStart,
      scraped_at: new Date().toISOString(),
      offers_count: runStats.total_saved,
    }, { onConflict: 'plz_prefix,week_start' })

    await finalizeRun(runId, 'success', runStats)
    return { prefix, ...runStats }

  } catch (err) {
    console.error(`❌ Fataler Fehler beim Scrape von ${prefix}:`, err.message)
    await finalizeRun(runId, 'error', runStats, err.message)
    throw err
  }
}

// ==============================================================
// Ingredient-Matches einfügen
// ==============================================================
async function buildAndSaveMatches(offers, idsByFp, matcher) {
  const matchRows = []
  for (const o of offers) {
    const offerId = idsByFp.get(o.fingerprint)
    if (!offerId) continue
    const matches = matcher(o.product_name)
    for (const m of matches) {
      matchRows.push({
        offer_id: offerId,
        ingredient_id: m.ingredient_id,
        match_score: m.score,
        match_reason: m.reason,
      })
    }
  }
  if (!matchRows.length) return 0
  let saved = 0
  for (let i = 0; i < matchRows.length; i += 200) {
    const batch = matchRows.slice(i, i + 200)
    const { error } = await supabase
      .from('offer_ingredient_matches')
      .upsert(batch, { onConflict: 'offer_id,ingredient_id', ignoreDuplicates: true })
    if (!error) saved += batch.length
    else console.warn(`   ⚠️  Match-Batch Fehler: ${error.message}`)
  }
  return saved
}

// ==============================================================
// Real-Deal-Flag: Preis < Median der letzten 6 Wochen?
// ==============================================================
async function markRealDeals(offers, idsByFp) {
  const withKey = offers.filter(o => o.canonical_key && idsByFp.has(o.fingerprint))
  if (!withKey.length) return

  // Pro Offer einzeln RPC — für Volumen besser: einen Bulk-Call bauen, aber hier erst mal simpel.
  const updates = []
  for (const o of withKey) {
    const { data, error } = await supabase.rpc('get_median_price', {
      p_canonical_key: o.canonical_key,
      p_market: o.store,
      p_plz_prefix: o.plz_prefix,
      p_weeks: 6,
    })
    if (error) continue
    const median = data
    if (!median || median <= 0) continue
    const isDeal = o.offer_price < median * 0.9  // >10% günstiger als Median
    const realDiscount = Math.round(((median - o.offer_price) / median) * 100)
    updates.push({
      id: idsByFp.get(o.fingerprint),
      is_real_deal: isDeal,
      real_discount_percent: realDiscount > 0 ? realDiscount : null,
    })
  }
  if (!updates.length) return
  // Update in Batches (max ~50, sonst URL zu lang)
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50)
    for (const u of batch) {
      await supabase.from('offers').update({
        is_real_deal: u.is_real_deal,
        real_discount_percent: u.real_discount_percent,
      }).eq('id', u.id)
    }
  }
}

// ==============================================================
// finalize scrape_runs
// ==============================================================
async function finalizeRun(runId, status, stats, errorMessage = null) {
  if (!runId || DRY_RUN) return
  const started = new Date(Date.now() - 1).toISOString() // placeholder; real started_at auto-set
  await supabase.from('scrape_runs').update({
    ended_at: new Date().toISOString(),
    status,
    total_raw: stats.total_raw,
    total_saved: stats.total_saved,
    skipped_non_food: stats.skipped_non_food,
    skipped_dedup: stats.skipped_dedup,
    skipped_invalid: stats.skipped_invalid,
    matches_created: stats.matches_created,
    api_calls: stats.api_calls,
    retries: stats.retries,
    per_store: stats.per_store,
    per_category: stats.per_category,
    error_message: errorMessage,
  }).eq('id', runId)
}

// ==============================================================
// HELPER
// ==============================================================
function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// ==============================================================
// MAIN
// ==============================================================
async function main() {
  console.log(`\n🛒 MealDeal — Wöchentlicher PLZ-Präfix-Scraper (v2)`)
  console.log(`   Datum: ${new Date().toLocaleString('de-DE')}`)
  console.log(`   Wochenstart: ${getWeekStart()}`)
  if (FORCE) console.log(`   ⚠️  FORCE mode`)
  if (DRY_RUN) console.log(`   🧪 DRY RUN`)
  if (SPECIFIC_PLZ) console.log(`   🎯 Nur Präfix: ${SPECIFIC_PLZ}`)
  console.log('')

  // Ingredient-Matcher einmal pro Lauf vorbereiten
  console.log('🧩 Lade Ingredient-Matching-Kontext...')
  const matcher = await loadMatchingContext()

  let prefixes = []
  if (SPECIFIC_PLZ) {
    prefixes = [SPECIFIC_PLZ.substring(0, 3)]
  } else {
    console.log(`📋 Lade eindeutige PLZ-Präfixe...`)
    const { data: profiles, error } = await supabase
      .from('user_profiles').select('plz').not('plz', 'is', null)
    if (error) { console.error(`❌ ${error.message}`); process.exit(1) }
    const prefixSet = new Set()
    for (const p of profiles || []) {
      if (p.plz && p.plz.length >= 3) prefixSet.add(p.plz.substring(0, 3))
    }
    prefixes = Array.from(prefixSet).sort()
    console.log(`   → ${profiles?.length || 0} User, ${prefixes.length} Präfixe`)
  }

  if (prefixes.length === 0) { console.log('✅ Keine Präfixe.'); return }

  let toScrape = prefixes
  if (!FORCE) {
    const weekStart = getWeekStart()
    const { data: done } = await supabase.from('scraped_this_week')
      .select('plz_prefix').eq('week_start', weekStart).in('plz_prefix', prefixes)
    const doneSet = new Set((done || []).map(r => r.plz_prefix))
    toScrape = prefixes.filter(p => !doneSet.has(p))
    console.log(`   → ${doneSet.size} bereits gescraped, ${toScrape.length} verbleiben\n`)
  }
  if (toScrape.length === 0) { console.log('✅ Alle Präfixe erledigt.'); return }

  const results = []
  for (let i = 0; i < toScrape.length; i++) {
    console.log(`\n[${i + 1}/${toScrape.length}] ===`)
    try {
      const result = await scrapePlzPrefix(toScrape[i], matcher)
      results.push(result)
    } catch (err) {
      results.push({ prefix: toScrape[i], total_saved: 0, error: err.message })
    }
    if (i < toScrape.length - 1) await sleep(1500)
  }

  // Report
  const totalSaved = results.reduce((s, r) => s + (r.total_saved || 0), 0)
  const totalMatches = results.reduce((s, r) => s + (r.matches_created || 0), 0)
  const totalSkipped = results.reduce((s, r) => s + (r.skipped_non_food || 0), 0)
  const errors = results.filter(r => r.error)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏁 Scraper fertig`)
  console.log(`   ✅ Präfixe: ${results.length}`)
  console.log(`   📦 Angebote gespeichert: ${totalSaved}`)
  console.log(`   🚫 Non-Food übersprungen: ${totalSkipped}`)
  console.log(`   🧩 Ingredient-Matches: ${totalMatches}`)
  console.log(`   ❌ Fehler: ${errors.length}`)
  if (errors.length > 0) errors.forEach(e => console.log(`      - ${e.prefix}: ${e.error}`))
  console.log(`${'='.repeat(60)}\n`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
