#!/usr/bin/env node
/**
 * MealDeal — Wöchentlicher PLZ-Präfix-Scraper
 *
 * Läuft Samstag Nacht (Cron: 0 23 * * 6) um neue Angebote für die neue Woche zu holen.
 * Scraped pro eindeutigem PLZ-Präfix (3 Stellen) NUR 1x pro Woche.
 *
 * LOGIK:
 * 1. Hole alle aktiven user_profiles.plz aus Supabase
 * 2. Extrahiere eindeutige PLZ-Präfixe (erste 3 Stellen)
 * 3. Checke scraped_this_week Tabelle — skip bereits gescrapte Präfixe
 * 4. Rufe Marktguru API auf (direkt mit API Key oder via Vercel Proxy)
 * 5. Upsert in offers Tabelle (onConflict: fingerprint)
 * 6. Markiere Präfix als gescraped in scraped_this_week
 *
 * ENVIRONMENT VARIABLES:
 *   MARKTGURU_API_KEY    - Marktguru API-Key (für direkte API-Calls)
 *   SUPABASE_SERVICE_KEY - Supabase Service Role Key (empfohlen)
 *   VITE_SUPABASE_ANON_KEY - Fallback aus .env
 *
 * USAGE:
 *   node scripts/weekly-scrape.mjs              # Normal run
 *   node scripts/weekly-scrape.mjs --force      # Ignore scraped_this_week, force all
 *   node scripts/weekly-scrape.mjs --dry-run    # Nur Report, keine Änderungen
 *   node scripts/weekly-scrape.mjs --plz 80331  # Nur für ein spezifisches Präfix
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ===== HELPER: .env laden =====
function loadEnv() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return {}
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#')) {
      env[key.trim()] = rest.join('=').trim()
    }
  })
  return env
}

const envVars = loadEnv()

// ===== CONFIG =====
const SUPABASE_URL = process.env.SUPABASE_URL ||
  envVars.VITE_SUPABASE_URL ||
  'https://wjhesvkapqrsbibqjbtr.supabase.co'

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  envVars.VITE_SUPABASE_ANON_KEY ||
  ''

const MARKTGURU_API_KEY = process.env.MARKTGURU_API_KEY ||
  envVars.MARKTGURU_API_KEY ||
  '8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE='

const MARKTGURU_BASE = 'https://api.marktguru.de/api/v1'

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const DRY_RUN = args.includes('--dry-run')
const PLZ_ARG_INDEX = args.indexOf('--plz')
const SPECIFIC_PLZ = PLZ_ARG_INDEX >= 0 ? args[PLZ_ARG_INDEX + 1] : null

if (!SUPABASE_KEY) {
  console.error('❌ Supabase Key fehlt!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== Markt-Normalisierung (aus marktguruScraper.ts) =====
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

// ===== Einfaches Kategorie-Mapping =====
function mapCategory(catName, productName) {
  const cat = (catName || '').toLowerCase()
  const name = (productName || '').toLowerCase()
  if (['fleisch', 'wurst', 'schinken', 'geflügel'].some(k => cat.includes(k))) return 'Fleisch'
  if (['obst', 'gemüse', 'salat'].some(k => cat.includes(k))) return 'Gemüse'
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
  return 'Sonstiges Lebensmittel'
}

// ===== Marktguru API Call (direkt serverseitig) =====
async function fetchMarktguruPage(zipCode, industryId, offset) {
  const url = `${MARKTGURU_BASE}/offers?as=web&limit=200&offset=${offset}&zipCode=${zipCode}&industryId=${industryId}`
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Api-Key': MARKTGURU_API_KEY,
      'User-Agent': 'MealDeal-Scraper/1.0',
    },
  })
  if (!response.ok) {
    throw new Error(`Marktguru API ${response.status}: ${response.statusText}`)
  }
  const raw = await response.json()
  return Array.isArray(raw) ? raw : (raw?.results || raw?.offers || raw?.data || [])
}

// ===== Scrape einen einzelnen PLZ-Präfix =====
async function scrapePlzPrefix(prefix) {
  // Wir nutzen eine Beispiel-PLZ (prefix + "00") für die API
  const samplePlz = `${prefix}00`
  const plzPrefix = prefix

  console.log(`\n🔍 Scrape PLZ-Präfix ${prefix} (Sample: ${samplePlz})`)

  const allOffers = []
  let apiCalls = 0

  // Industrien: 1009 = Supermärkte, 1023 = Drogerien
  for (const industryId of [1009, 1023]) {
    let offset = 0
    while (offset < 1200 && apiCalls < 12) {
      try {
        apiCalls++
        const offers = await fetchMarktguruPage(samplePlz, industryId, offset)
        if (!offers.length) break
        allOffers.push(...offers)
        if (offers.length < 200) break
        offset += 200
        await new Promise(r => setTimeout(r, 300)) // Rate Limit
      } catch (err) {
        console.error(`   ⚠️ API Fehler bei industry=${industryId} offset=${offset}: ${err.message}`)
        break
      }
    }
  }

  console.log(`   📥 ${allOffers.length} Rohangebote geladen (${apiCalls} API Calls)`)

  if (!allOffers.length) return { prefix, total: 0, saved: 0, skipped: 0 }

  // Transform
  const seen = new Set()
  const toInsert = []

  for (const offer of allOffers) {
    const advertiserName = offer.advertisers?.[0]?.name
    if (!advertiserName) continue

    const market = normalizeMarketName(advertiserName)
    if (!market) continue

    const title = offer.product?.name || (offer.description || '').split('\n')[0]
    if (!title?.trim() || offer.price == null) continue

    let validFrom = null
    let validUntil = null
    if (offer.validityDates?.[0]) {
      validFrom = (offer.validityDates[0].from || '').slice(0, 10)
      validUntil = (offer.validityDates[0].to || '').slice(0, 10)
    }
    if (!validUntil) continue

    const fp = `${market}_${title.trim()}_${validUntil}_${offer.price}`.toLowerCase()
    if (seen.has(fp)) continue
    seen.add(fp)

    let oldPrice = offer.oldPrice ?? offer.referencePrice ?? offer.regularPrice ?? null
    let discount = null
    if (oldPrice && oldPrice > offer.price) {
      discount = Math.round(((oldPrice - offer.price) / oldPrice) * 100)
    }
    if (!oldPrice && offer.discount && offer.discount > 0 && offer.discount < 100) {
      oldPrice = Math.round((offer.price / (1 - offer.discount / 100)) * 100) / 100
      discount = Math.round(offer.discount)
    }
    if (discount && (discount > 90 || discount < 1)) {
      discount = null
      oldPrice = null
    }

    let imageUrl = null
    if (offer.images?.[0]) {
      imageUrl = offer.images[0].url || offer.images[0].large || offer.images[0].medium || null
    }

    const catName = offer.categories?.[0]?.name || ''

    toInsert.push({
      product_name: title.trim(),
      store: market,
      offer_price: Math.round(offer.price * 100) / 100,
      original_price: oldPrice ? Math.round(oldPrice * 100) / 100 : null,
      discount_percent: discount,
      plz: samplePlz,
      plz_prefix: plzPrefix,
      category: mapCategory(catName, title),
      valid_from: validFrom,
      valid_until: validUntil,
      image_url: imageUrl,
      quantity: offer.quantity || null,
      fingerprint: fp,
    })
  }

  console.log(`   🔧 ${toInsert.length} eindeutige Angebote nach Dedup`)

  if (DRY_RUN) {
    console.log(`   🧪 DRY RUN — würde ${toInsert.length} Angebote upserten`)
    return { prefix, total: allOffers.length, saved: 0, skipped: 0, dryRun: true }
  }

  // Upsert in Batches von 100
  let saved = 0
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100)
    const { error } = await supabase
      .from('offers')
      .upsert(batch, { onConflict: 'fingerprint' })
    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / 100)}: ${error.message}`)
    } else {
      saved += batch.length
    }
  }

  console.log(`   ✅ ${saved}/${toInsert.length} Angebote gespeichert`)

  // Mark as scraped this week
  if (!DRY_RUN) {
    const weekStart = getWeekStart()
    const { error } = await supabase
      .from('scraped_this_week')
      .upsert({
        plz_prefix: plzPrefix,
        week_start: weekStart,
        scraped_at: new Date().toISOString(),
        offers_count: saved,
      }, { onConflict: 'plz_prefix,week_start' })
    if (error) {
      console.warn(`   ⚠️ scraped_this_week Update fehlgeschlagen: ${error.message}`)
    }
  }

  return { prefix, total: allOffers.length, saved, skipped: 0 }
}

// ===== Hilfs-Funktion: Montag der aktuellen Woche =====
function getWeekStart() {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day // Wenn Sonntag, zurück zu letztem Montag
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// ===== MAIN =====
async function main() {
  console.log(`\n🛒 MealDeal — Wöchentlicher PLZ-Präfix-Scraper`)
  console.log(`   Datum: ${new Date().toLocaleString('de-DE')}`)
  console.log(`   Wochenstart: ${getWeekStart()}`)
  if (FORCE) console.log(`   ⚠️  FORCE mode — ignoriert scraped_this_week`)
  if (DRY_RUN) console.log(`   🧪 DRY RUN — keine DB-Änderungen`)
  if (SPECIFIC_PLZ) console.log(`   🎯 Nur Präfix: ${SPECIFIC_PLZ}`)
  console.log('')

  let prefixes = []

  if (SPECIFIC_PLZ) {
    prefixes = [SPECIFIC_PLZ.substring(0, 3)]
  } else {
    // 1. Lade eindeutige PLZ-Präfixe aus user_profiles
    console.log(`📋 Lade eindeutige PLZ-Präfixe aus user_profiles...`)
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('plz')
      .not('plz', 'is', null)

    if (error) {
      console.error(`❌ Fehler beim Laden: ${error.message}`)
      process.exit(1)
    }

    const prefixSet = new Set()
    for (const p of profiles || []) {
      if (p.plz && p.plz.length >= 3) {
        prefixSet.add(p.plz.substring(0, 3))
      }
    }
    prefixes = Array.from(prefixSet).sort()
    console.log(`   → ${profiles?.length || 0} User registriert`)
    console.log(`   → ${prefixes.length} eindeutige PLZ-Präfixe`)
  }

  if (prefixes.length === 0) {
    console.log('✅ Keine PLZ-Präfixe zu scrapen. Beende.')
    return
  }

  // 2. Checke scraped_this_week falls nicht --force
  let toScrape = prefixes
  if (!FORCE) {
    const weekStart = getWeekStart()
    const { data: alreadyScraped } = await supabase
      .from('scraped_this_week')
      .select('plz_prefix')
      .eq('week_start', weekStart)
      .in('plz_prefix', prefixes)

    const doneSet = new Set((alreadyScraped || []).map(r => r.plz_prefix))
    toScrape = prefixes.filter(p => !doneSet.has(p))
    console.log(`   → ${doneSet.size} bereits diese Woche gescraped, ${toScrape.length} verbleiben\n`)
  }

  if (toScrape.length === 0) {
    console.log('✅ Alle Präfixe wurden diese Woche bereits gescraped. Beende.')
    return
  }

  // 3. Scrape sequenziell
  const results = []
  for (let i = 0; i < toScrape.length; i++) {
    console.log(`\n[${i + 1}/${toScrape.length}] ===`)
    try {
      const result = await scrapePlzPrefix(toScrape[i])
      results.push(result)
    } catch (err) {
      console.error(`❌ Fehler bei ${toScrape[i]}: ${err.message}`)
      results.push({ prefix: toScrape[i], saved: 0, error: err.message })
    }
    // Pause zwischen Präfixen
    if (i < toScrape.length - 1) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  // 4. Report
  const totalSaved = results.reduce((sum, r) => sum + (r.saved || 0), 0)
  const errors = results.filter(r => r.error)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏁 Scraper fertig`)
  console.log(`   ✅ Gescrapte Präfixe: ${results.length}`)
  console.log(`   📦 Gespeicherte Angebote: ${totalSaved}`)
  console.log(`   ❌ Fehler: ${errors.length}`)
  if (errors.length > 0) {
    errors.forEach(e => console.log(`      - ${e.prefix}: ${e.error}`))
  }
  console.log(`${'='.repeat(60)}\n`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
