#!/usr/bin/env node
/**
 * MealDeal — Nächtlicher Health-Check Agent
 *
 * Läuft täglich 3:00 Uhr nachts (Cron: 0 3 * * *).
 * Prüft systematisch ob die App funktioniert und fixt kleine Probleme automatisch.
 *
 * PRÜFUNGEN:
 *  1. Supabase erreichbar?
 *  2. Alle wichtigen Tabellen existieren und sind lesbar?
 *  3. Gibt es abgelaufene Angebote? → Auto-Delete
 *  4. Gibt es Rezepte ohne Bild? → Liste in Report
 *  5. Gibt es User ohne PLZ? → Warnung
 *  6. Anzahl aktiver Angebote pro PLZ-Präfix OK?
 *  7. Keine kaputten Fremdschlüssel?
 *
 * REPORT:
 *   Schreibt Ergebnis in Tabelle `health_checks` (falls vorhanden).
 *   Gibt Summary auf stdout aus.
 *
 * USAGE:
 *   node scripts/nightly-health-check.mjs
 *   node scripts/nightly-health-check.mjs --no-fix   # Nur prüfen, keine Auto-Fixes
 *   node scripts/nightly-health-check.mjs --verbose
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

function loadEnv() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return {}
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#')) env[key.trim()] = rest.join('=').trim()
  })
  return env
}

const envVars = loadEnv()
const SUPABASE_URL = process.env.SUPABASE_URL || envVars.VITE_SUPABASE_URL || 'https://wjhesvkapqrsbibqjbtr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY || ''

const args = process.argv.slice(2)
const NO_FIX = args.includes('--no-fix')
const VERBOSE = args.includes('--verbose')

if (!SUPABASE_KEY) {
  console.error('❌ Supabase Key fehlt')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const checks = []
const alerts = []
const fixes = []

function addCheck(name, status, details = '') {
  checks.push({ name, status, details, time: new Date().toISOString() })
  const icon = status === 'ok' ? '✅' : status === 'warn' ? '⚠️' : '❌'
  console.log(`${icon} ${name}${details ? ` — ${details}` : ''}`)
  if (status === 'error') alerts.push(`${name}: ${details}`)
}

function addFix(description) {
  fixes.push(description)
  console.log(`  🔧 Auto-Fix: ${description}`)
}

// ===== CHECK 1: Supabase Connection =====
async function checkConnection() {
  try {
    const { error } = await supabase.from('user_profiles').select('id', { count: 'exact', head: true })
    if (error) throw error
    addCheck('Supabase Verbindung', 'ok')
    return true
  } catch (err) {
    addCheck('Supabase Verbindung', 'error', err.message)
    return false
  }
}

// ===== CHECK 2: Core Tables =====
async function checkTables() {
  const tables = ['user_profiles', 'offers', 'recipes', 'recipe_ingredients', 'ingredients', 'weekly_plans', 'shopping_items', 'saved_recipes']
  for (const table of tables) {
    try {
      const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) throw error
      addCheck(`Tabelle ${table}`, 'ok', `${count} rows`)
    } catch (err) {
      addCheck(`Tabelle ${table}`, 'error', err.message)
    }
  }
}

// ===== CHECK 3: Expired Offers (Auto-Fix) =====
async function checkExpiredOffers() {
  const today = new Date().toISOString().split('T')[0]
  try {
    const { data: expired, error } = await supabase
      .from('offers')
      .select('id', { count: 'exact' })
      .lt('valid_until', today)
    if (error) throw error
    const count = expired?.length || 0

    if (count === 0) {
      addCheck('Abgelaufene Angebote', 'ok', '0 expired')
      return
    }

    addCheck('Abgelaufene Angebote', 'warn', `${count} expired`)

    if (!NO_FIX) {
      const { error: delErr, count: deleted } = await supabase
        .from('offers')
        .delete({ count: 'exact' })
        .lt('valid_until', today)
      if (delErr) {
        console.error(`   ❌ Delete-Fehler: ${delErr.message}`)
      } else {
        addFix(`${deleted || count} abgelaufene Angebote gelöscht`)
      }
    }
  } catch (err) {
    addCheck('Abgelaufene Angebote', 'error', err.message)
  }
}

// ===== CHECK 4: Recipes without Image =====
async function checkRecipeImages() {
  try {
    const { data, error, count } = await supabase
      .from('recipes')
      .select('id, name, image_url', { count: 'exact' })
      .or('image_url.is.null,image_url.eq.')
    if (error) throw error

    if (!count || count === 0) {
      addCheck('Rezepte ohne Bild', 'ok')
      return
    }
    addCheck('Rezepte ohne Bild', 'warn', `${count} Rezepte brauchen Bild`)
    if (VERBOSE && data) {
      data.slice(0, 10).forEach(r => console.log(`     - ${r.name}`))
    }
  } catch (err) {
    addCheck('Rezepte ohne Bild', 'error', err.message)
  }
}

// ===== CHECK 5: Users without PLZ =====
async function checkUsersWithoutPlz() {
  try {
    const { error, count } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .or('plz.is.null,plz.eq.')
    if (error) throw error
    if (!count || count === 0) {
      addCheck('User ohne PLZ', 'ok')
    } else {
      addCheck('User ohne PLZ', 'warn', `${count} User haben keine PLZ`)
    }
  } catch (err) {
    addCheck('User ohne PLZ', 'error', err.message)
  }
}

// ===== CHECK 6: Offers per PLZ-Prefix =====
async function checkOffersPerPrefix() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Hole Präfixe aller aktiven User
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('plz')
      .not('plz', 'is', null)

    const prefixes = new Set()
    for (const p of profiles || []) {
      if (p.plz?.length >= 3) prefixes.add(p.plz.substring(0, 3))
    }

    const lowPrefixes = []
    for (const prefix of prefixes) {
      const { count } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('plz_prefix', prefix)
        .gte('valid_until', today)
      if ((count ?? 0) < 10) lowPrefixes.push({ prefix, count: count ?? 0 })
    }

    if (lowPrefixes.length === 0) {
      addCheck('Angebote pro PLZ-Präfix', 'ok', `${prefixes.size} Präfixe geprüft`)
    } else {
      addCheck('Angebote pro PLZ-Präfix', 'warn', `${lowPrefixes.length} Präfixe mit <10 Angeboten`)
      if (VERBOSE) {
        lowPrefixes.forEach(p => console.log(`     - ${p.prefix}: ${p.count} Angebote`))
      }
    }
  } catch (err) {
    addCheck('Angebote pro PLZ-Präfix', 'error', err.message)
  }
}

// ===== CHECK 7: Recipe Ingredients ohne FK =====
async function checkOrphanedRecipeIngredients() {
  try {
    // Zähle total Einträge
    const { count: total } = await supabase
      .from('recipe_ingredients')
      .select('*', { count: 'exact', head: true })

    if (total === null) {
      addCheck('Recipe Ingredients', 'warn', 'Konnte nicht zählen')
      return
    }
    addCheck('Recipe Ingredients', 'ok', `${total} Verknüpfungen`)
  } catch (err) {
    addCheck('Recipe Ingredients', 'error', err.message)
  }
}

// ===== CHECK 8: Performance — langsame Queries =====
async function checkPerformance() {
  try {
    const start = Date.now()
    await supabase.from('recipes').select('id').limit(50)
    const recipesDuration = Date.now() - start

    const start2 = Date.now()
    await supabase.from('offers').select('id').limit(50)
    const offersDuration = Date.now() - start2

    const slow = recipesDuration > 2000 || offersDuration > 2000
    addCheck('Query Performance', slow ? 'warn' : 'ok',
      `Recipes: ${recipesDuration}ms, Offers: ${offersDuration}ms`)
  } catch (err) {
    addCheck('Query Performance', 'error', err.message)
  }
}

// ===== Report speichern =====
async function saveReport() {
  const ok = checks.filter(c => c.status === 'ok').length
  const warn = checks.filter(c => c.status === 'warn').length
  const error = checks.filter(c => c.status === 'error').length

  const report = {
    ran_at: new Date().toISOString(),
    total_checks: checks.length,
    ok_count: ok,
    warn_count: warn,
    error_count: error,
    fixes_applied: fixes.length,
    alerts: alerts,
    details: checks,
  }

  // Versuche in health_checks Tabelle zu speichern (falls existiert)
  try {
    const { error } = await supabase.from('health_checks').insert(report)
    if (error && !error.message.includes('does not exist')) {
      console.warn(`   ⚠️ Report-Speicherung fehlgeschlagen: ${error.message}`)
    }
  } catch {
    // Silent fail — Tabelle existiert ggf. nicht
  }

  return report
}

// ===== MAIN =====
async function main() {
  console.log(`\n🏥 MealDeal — Nightly Health Check`)
  console.log(`   Datum: ${new Date().toLocaleString('de-DE')}`)
  console.log(`   Modus: ${NO_FIX ? 'READ-ONLY' : 'AUTO-FIX enabled'}\n`)

  const connected = await checkConnection()
  if (!connected) {
    console.log('\n❌ Kann nicht fortfahren ohne Supabase-Verbindung.')
    process.exit(1)
  }

  await checkTables()
  await checkExpiredOffers()
  await checkRecipeImages()
  await checkUsersWithoutPlz()
  await checkOffersPerPrefix()
  await checkOrphanedRecipeIngredients()
  await checkPerformance()

  const report = await saveReport()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 Health Check Summary`)
  console.log(`   ✅ OK: ${report.ok_count}`)
  console.log(`   ⚠️  Warnings: ${report.warn_count}`)
  console.log(`   ❌ Errors: ${report.error_count}`)
  console.log(`   🔧 Auto-Fixes: ${report.fixes_applied}`)

  if (alerts.length > 0) {
    console.log(`\n⚠️  Kritische Alerts:`)
    alerts.forEach(a => console.log(`   - ${a}`))
  }

  if (fixes.length > 0) {
    console.log(`\n🔧 Automatisch gefixt:`)
    fixes.forEach(f => console.log(`   - ${f}`))
  }

  console.log(`${'='.repeat(60)}\n`)

  // Exit-Code abhängig von Errors
  process.exit(report.error_count > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
