#!/usr/bin/env node
/**
 * MealDeal — Wöchentliche Matching-Analyse
 *
 * Läuft Sonntag früh (Cron: 0 5 * * 0) und analysiert wie gut das
 * Angebot-zu-Rezept-Matching in der vergangenen Woche funktioniert hat.
 *
 * LOGIK:
 *  1. Lade alle Angebote der letzten 7 Tage
 *  2. Lade alle Rezept-Zutaten
 *  3. Teste welche Angebote zu welchen Zutaten passen (Name-Match + Synonyme)
 *  4. Finde "Unmatched Offers" = Angebote die zu keinem Rezept passen
 *  5. Finde häufig vorkommende Produktnamen in unmatched Offers
 *  6. Schlage neue Synonyme vor
 *  7. Schreibe Report in `matching_reports` Tabelle (falls existiert)
 *
 * OUTPUT:
 *   - Liste von Synonym-Vorschlägen (z.B. "Hähnchenbrust" sollte zu "Hähnchen" gemappt werden)
 *   - Top 20 unmatched Produkte für manuelle Review
 *   - Matching-Quote: X% der Angebote konnten gematcht werden
 *
 * USAGE:
 *   node scripts/weekly-matching-analysis.mjs
 *   node scripts/weekly-matching-analysis.mjs --verbose
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
const VERBOSE = args.includes('--verbose')

if (!SUPABASE_KEY) {
  console.error('❌ Supabase Key fehlt')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== Helper: Normalisiere Produktname =====
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ===== Simple Fuzzy Match =====
function tokensMatch(productTokens, ingredientTokens) {
  // Mindestens ein Token aus ingredient kommt in product vor
  return ingredientTokens.some(it => productTokens.some(pt => pt.includes(it) || it.includes(pt)))
}

// ===== MAIN =====
async function main() {
  console.log(`\n🔎 MealDeal — Wöchentliche Matching-Analyse`)
  console.log(`   Datum: ${new Date().toLocaleString('de-DE')}\n`)

  // 1. Lade aktuelle Angebote
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  console.log(`📥 Lade Angebote seit ${weekAgo}...`)
  const { data: offers, error: offersErr } = await supabase
    .from('offers')
    .select('id, product_name, category, store, offer_price')
    .gte('valid_until', today)
    .limit(5000)

  if (offersErr) {
    console.error(`❌ Fehler beim Laden von Angeboten: ${offersErr.message}`)
    process.exit(1)
  }
  console.log(`   → ${offers?.length || 0} aktive Angebote`)

  // 2. Lade Ingredients mit Synonymen
  console.log(`📥 Lade Zutaten und Synonyme...`)
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name')

  const { data: synonyms } = await supabase
    .from('ingredient_synonyms')
    .select('ingredient_id, synonym')

  const synByIng = {}
  for (const s of synonyms || []) {
    if (!synByIng[s.ingredient_id]) synByIng[s.ingredient_id] = []
    synByIng[s.ingredient_id].push(normalize(s.synonym))
  }

  const ingredientTokens = (ingredients || []).map(ing => ({
    id: ing.id,
    name: ing.name,
    tokens: [normalize(ing.name), ...(synByIng[ing.id] || [])].filter(Boolean),
  }))

  console.log(`   → ${ingredients?.length || 0} Zutaten mit ${synonyms?.length || 0} Synonymen\n`)

  // 3. Matching
  console.log(`🔧 Führe Matching aus...`)
  const matched = []
  const unmatched = []

  for (const offer of offers || []) {
    const prodNorm = normalize(offer.product_name)
    const prodTokens = prodNorm.split(' ').filter(t => t.length >= 3)

    let match = null
    for (const ing of ingredientTokens) {
      for (const token of ing.tokens) {
        const itokens = token.split(' ').filter(t => t.length >= 3)
        if (itokens.length === 0) continue
        if (tokensMatch(prodTokens, itokens)) {
          match = ing
          break
        }
      }
      if (match) break
    }

    if (match) {
      matched.push({ offer, ingredient: match })
    } else {
      unmatched.push(offer)
    }
  }

  const total = (offers?.length || 0)
  const matchRate = total > 0 ? ((matched.length / total) * 100).toFixed(1) : 0
  console.log(`   ✅ Gematched: ${matched.length}/${total} (${matchRate}%)`)
  console.log(`   ❌ Unmatched: ${unmatched.length}\n`)

  // 4. Top Unmatched Produktnamen
  const unmatchedNameCount = {}
  for (const o of unmatched) {
    // Nehme die ersten 2-3 Wörter als "Basis"
    const words = normalize(o.product_name).split(' ').filter(w => w.length >= 3).slice(0, 2)
    const key = words.join(' ')
    if (!key) continue
    unmatchedNameCount[key] = (unmatchedNameCount[key] || 0) + 1
  }

  const topUnmatched = Object.entries(unmatchedNameCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  console.log(`🏆 Top 20 unmatched Produkte (Häufigkeit):`)
  topUnmatched.forEach(([name, count], i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${name.padEnd(40)} (${count}x)`)
  })

  // 5. Synonym-Vorschläge generieren
  console.log(`\n💡 Synonym-Vorschläge:`)
  const suggestions = []
  for (const [unmatchedName, count] of topUnmatched) {
    if (count < 3) continue
    // Finde ingredient dessen Name im unmatchedName vorkommt oder umgekehrt
    const candidate = ingredientTokens.find(ing => {
      const ingNorm = normalize(ing.name)
      return unmatchedName.includes(ingNorm) || ingNorm.includes(unmatchedName.split(' ')[0])
    })
    if (candidate) {
      suggestions.push({
        ingredient_id: candidate.id,
        ingredient_name: candidate.name,
        suggested_synonym: unmatchedName,
        frequency: count,
      })
    }
  }

  if (suggestions.length === 0) {
    console.log(`   Keine klaren Vorschläge — manueller Review nötig für Top-Liste oben.`)
  } else {
    suggestions.forEach(s => {
      console.log(`   "${s.suggested_synonym}" → ${s.ingredient_name} (${s.frequency}x gefunden)`)
    })
  }

  // 6. Purchase-Log Analyse (falls vorhanden)
  console.log(`\n📊 Purchase-Log Analyse:`)
  try {
    const { data: purchases, error: purchErr } = await supabase
      .from('purchase_log')
      .select('id, product_name, recipe_id')
      .gte('created_at', weekAgo)
      .limit(1000)
    if (purchErr) throw purchErr

    if (!purchases || purchases.length === 0) {
      console.log(`   Keine Käufe in der letzten Woche geloggt.`)
    } else {
      console.log(`   → ${purchases.length} Käufe geloggt`)
      const withRecipe = purchases.filter(p => p.recipe_id).length
      console.log(`   → ${withRecipe} mit Rezept-Kontext`)
    }
  } catch (err) {
    console.log(`   (Übersprungen: ${err.message})`)
  }

  // 7. Report speichern
  const report = {
    ran_at: new Date().toISOString(),
    week_start: weekAgo,
    total_offers: total,
    matched_count: matched.length,
    unmatched_count: unmatched.length,
    match_rate_pct: parseFloat(matchRate),
    top_unmatched: topUnmatched,
    synonym_suggestions: suggestions,
  }

  try {
    const { error } = await supabase.from('matching_reports').insert(report)
    if (error && !error.message.includes('does not exist')) {
      console.warn(`\n⚠️ Report-Speicherung: ${error.message}`)
    } else if (!error) {
      console.log(`\n💾 Report in matching_reports Tabelle gespeichert`)
    }
  } catch {}

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏁 Matching-Analyse fertig`)
  console.log(`   Match-Quote: ${matchRate}%`)
  console.log(`   Neue Synonym-Vorschläge: ${suggestions.length}`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
