#!/usr/bin/env node
/**
 * MealDeal — Abgelaufene Angebote löschen
 *
 * Dieses Script löscht alle Angebote aus der offers Tabelle,
 * deren Gültigkeitsdatum (valid_until) in der Vergangenheit liegt.
 *
 * USAGE:
 *   1. Das Script direkt ausführen:
 *      node scripts/cleanup-expired-offers.mjs
 *
 *   2. Mit npm script (falls in package.json konfiguriert):
 *      npm run cleanup-offers
 *
 *   3. Mit Cron Job (Linux/Mac):
 *      0 3 * * * cd /pfad/zu/app && node scripts/cleanup-expired-offers.mjs
 *      (Das löscht täglich um 3:00 Uhr morgens)
 *
 * UMGEBUNGSVARIABLEN:
 *   - SUPABASE_URL (optional, wird aus .env geladen falls nicht gesetzt)
 *   - SUPABASE_SERVICE_KEY (optional, wird aus .env geladen falls nicht gesetzt)
 *   - Fallback: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY aus .env
 *
 * Das Script lädt die Konfiguration automatisch aus:
 *   - Umgebungsvariablen
 *   - .env Datei im Projekt-Root
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

  if (!fs.existsSync(envPath)) {
    return {}
  }

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

// ===== CONFIG =====
const envVars = loadEnv()

const SUPABASE_URL = process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  envVars.VITE_SUPABASE_URL ||
  'https://wjhesvkapqrsbibqjbtr.supabase.co'

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  envVars.VITE_SUPABASE_ANON_KEY ||
  ''

// ===== VALIDATION =====
if (!SUPABASE_KEY) {
  console.error('❌ Supabase Key fehlt!')
  console.error('   Setze SUPABASE_SERVICE_KEY oder VITE_SUPABASE_ANON_KEY als Umgebungsvariable')
  console.error('   oder stelle sicher, dass .env im Projekt-Root vorhanden ist.')
  process.exit(1)
}

// ===== SUPABASE CLIENT =====
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== MAIN LOGIC =====
async function cleanupExpiredOffers() {
  try {
    console.log('\n📅 MealDeal — Abgelaufene Angebote Cleanup\n')
    console.log(`🔌 Verbinde mit Supabase...`)

    // 1. Zähle Angebote die gelöscht werden
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    console.log(`📊 Suche Angebote die vor ${today} ablaufen...`)

    const { data: expiredOffers, error: fetchError } = await supabase
      .from('offers')
      .select('id, product_name, store, valid_until')
      .lt('valid_until', today)

    if (fetchError) {
      throw new Error(`Fehler beim Laden abgelaufener Angebote: ${fetchError.message}`)
    }

    const expiredCount = expiredOffers?.length || 0

    if (expiredCount === 0) {
      console.log(`✅ Keine abgelaufenen Angebote gefunden. Nichts zu tun.\n`)
      return
    }

    console.log(`\n⚠️  ${expiredCount} abgelaufene Angebote gefunden:`)
    expiredOffers?.slice(0, 10).forEach(offer => {
      console.log(`   - ${offer.product_name} (${offer.store}, gültig bis ${offer.valid_until})`)
    })
    if (expiredCount > 10) {
      console.log(`   ... und ${expiredCount - 10} weitere`)
    }

    // 2. Lösche abgelaufene Angebote
    console.log(`\n🗑️  Lösche ${expiredCount} abgelaufene Angebote...`)

    const { error: deleteError, count } = await supabase
      .from('offers')
      .delete()
      .lt('valid_until', today)

    if (deleteError) {
      throw new Error(`Fehler beim Löschen: ${deleteError.message}`)
    }

    console.log(`✅ ${count || expiredCount} Angebote gelöscht.\n`)

    // 3. Zähle verbleibende Angebote
    console.log(`📈 Lade verbleibende Angebote-Statistik...`)

    const { data: remainingOffers, error: countError } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })

    if (countError) {
      console.warn(`   ⚠️  Warnung: Konnte Gesamtzahl nicht laden: ${countError.message}`)
    } else {
      const totalCount = remainingOffers?.length || 0
      console.log(`📦 Noch ${totalCount} aktive Angebote in der Datenbank.\n`)
    }

    // 4. Erfolgreicher Abschluss
    console.log(`${'='.repeat(50)}`)
    console.log(`✅ Cleanup erfolgreich abgeschlossen!`)
    console.log(`   🗑️  Gelöscht: ${count || expiredCount}`)
    console.log(`   📅 Datum: ${new Date().toLocaleString('de-DE')}`)
    console.log(`${'='.repeat(50)}\n`)

  } catch (err) {
    console.error('\n❌ Fatal Error:', err.message)
    console.error('\n💡 Tipps zum Debuggen:')
    console.error('   1. Prüfe ob .env Datei im Projekt-Root existiert')
    console.error('   2. Prüfe ob VITE_SUPABASE_ANON_KEY in .env korrekt ist')
    console.error('   3. Prüfe ob Supabase Projekt online ist')
    console.error('   4. Prüfe ob offers Tabelle existiert\n')
    process.exit(1)
  }
}

// ===== RUN =====
cleanupExpiredOffers()
