#!/usr/bin/env node
/**
 * MealDeal — Wöchentlicher Rezept-Workflow (v2)
 *
 * Läuft Samstag Nacht → Sonntag früh (Cron: 0 2 * * 0)
 *
 * STRATEGIE:
 *  1. Bestehende Rezepte gegen aktuelle Angebote matchen (60% Threshold)
 *  2. Nur wenn zu wenig gute Matches → neue Rezepte via Claude API generieren
 *  3. Generierte Rezepte: status='pending', Telegram-Nachricht an Jo
 *  4. Jo bestätigt per Telegram → status='approved'
 *
 * REGELN:
 *  - Generierte Rezepte müssen LOGISCH sein (bewährte Rezeptmuster)
 *  - Mindestens 60% der Hauptzutaten aus Angeboten
 *  - Ernährungsformen abdecken (vegan, vegetarisch, omni, halal, high-protein)
 *  - Maximal 3-5 neue Rezepte pro Woche
 *
 * ENV:
 *   ANTHROPIC_API_KEY — Claude API Key
 *   SUPABASE_SERVICE_KEY — Supabase Service Role Key
 *   TELEGRAM_BOT_TOKEN — Telegram Bot Token
 *   TELEGRAM_CHAT_ID — Jo's Chat ID
 *
 * USAGE:
 *   node scripts/weekly-recipe-generator.mjs
 *   node scripts/weekly-recipe-generator.mjs --dry-run
 *   node scripts/weekly-recipe-generator.mjs --force-generate   # Generierung erzwingen
 */

import { createClient } from '@supabase/supabase-js'
import { buildMatcher } from './scraperMatching.mjs'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ===== ENV =====
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
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envVars.ANTHROPIC_API_KEY || ''
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN || envVars.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || envVars.TELEGRAM_CHAT_ID || ''

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE_GENERATE = args.includes('--force-generate')

const MATCH_THRESHOLD = 0.6  // 60% der Hauptzutaten müssen im Angebot sein
const MIN_GOOD_MATCHES = 5   // Mindestens 5 bestehende Rezepte mit guter Offer-Abdeckung
const MAX_NEW_RECIPES = 5    // Maximal 5 neue Rezepte pro Woche

if (!SUPABASE_KEY) { console.error('❌ Supabase Key fehlt'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== Saisonalität =====
const SEASON_INGREDIENTS = {
  1: ['Rosenkohl', 'Grünkohl', 'Lauch', 'Feldsalat', 'Pastinake'],
  2: ['Grünkohl', 'Lauch', 'Pastinake', 'Wirsing', 'Chicorée'],
  3: ['Spinat', 'Bärlauch', 'Rhabarber', 'Lauch', 'Chicorée'],
  4: ['Spargel', 'Rhabarber', 'Spinat', 'Radieschen', 'Bärlauch'],
  5: ['Spargel', 'Erdbeeren', 'Radieschen', 'Kohlrabi', 'Rucola'],
  6: ['Erdbeeren', 'Zucchini', 'Kirschen', 'Himbeeren', 'Kopfsalat'],
  7: ['Tomaten', 'Zucchini', 'Paprika', 'Heidelbeeren', 'Aprikosen'],
  8: ['Tomaten', 'Paprika', 'Pfirsich', 'Mais', 'Pflaumen'],
  9: ['Kürbis', 'Äpfel', 'Birnen', 'Pilze', 'Trauben'],
  10: ['Kürbis', 'Äpfel', 'Pilze', 'Rote Bete', 'Kohl'],
  11: ['Rote Bete', 'Kürbis', 'Grünkohl', 'Wirsing', 'Rosenkohl'],
  12: ['Grünkohl', 'Rosenkohl', 'Mandarinen', 'Maronen', 'Rotkohl'],
}

// ===== STEP 1: Bestehende Rezepte gegen Angebote matchen =====

async function loadCurrentOffers() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('offers')
    .select('id, product_name, store, offer_price, category')
    .gte('valid_until', today)
    .eq('status', 'active')

  if (error) {
    // Fallback: offers ohne status-Feld
    const { data: data2 } = await supabase
      .from('offers')
      .select('id, product_name, store, offer_price, category')
      .gte('valid_until', today)

    return data2 || []
  }
  return data || []
}

async function loadRecipesWithIngredients() {
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, meal, diets, servings, cost')
    .eq('status', 'approved')

  const { data: ri } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, ingredients(name)')

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, category')

  const { data: synonyms } = await supabase
    .from('ingredient_synonyms')
    .select('ingredient_id, synonym')

  // Gruppiere Zutaten pro Rezept
  const riMap = {}
  for (const row of (ri || [])) {
    if (!riMap[row.recipe_id]) riMap[row.recipe_id] = []
    riMap[row.recipe_id].push({
      ingredient_id: row.ingredient_id,
      name: row.ingredients?.name || ''
    })
  }

  return {
    recipes: (recipes || []).map(r => ({ ...r, ingredients: riMap[r.id] || [] })),
    allIngredients: ingredients || [],
    synonyms: synonyms || []
  }
}

function matchRecipesAgainstOffers(recipes, offers, allIngredients, synonyms) {
  // Baue Matcher aus Angeboten → Ingredients
  const matcher = buildMatcher(allIngredients, synonyms)

  // Für jedes Angebot: welche Ingredients matcht es?
  const offeredIngredientIds = new Set()
  const offersByIngredient = {}

  for (const offer of offers) {
    const matches = matcher(offer.product_name)
    for (const m of matches) {
      if (m.score >= 0.6) {
        offeredIngredientIds.add(m.ingredient_id)
        if (!offersByIngredient[m.ingredient_id]) offersByIngredient[m.ingredient_id] = []
        offersByIngredient[m.ingredient_id].push(offer)
      }
    }
  }

  console.log(`   📦 ${offeredIngredientIds.size} verschiedene Zutaten in aktuellen Angeboten gefunden`)

  // Für jedes Rezept: wie viele Hauptzutaten sind im Angebot?
  const results = []
  for (const recipe of recipes) {
    if (!recipe.ingredients.length) continue

    const totalIngredients = recipe.ingredients.length
    const matchedIngredients = recipe.ingredients.filter(
      ing => offeredIngredientIds.has(ing.ingredient_id)
    )
    const matchRatio = matchedIngredients.length / totalIngredients

    results.push({
      recipe,
      matchRatio,
      matchedCount: matchedIngredients.length,
      totalCount: totalIngredients,
      matchedNames: matchedIngredients.map(i => i.name),
      stores: [...new Set(
        matchedIngredients.flatMap(i => (offersByIngredient[i.ingredient_id] || []).map(o => o.store))
      )]
    })
  }

  return results.sort((a, b) => b.matchRatio - a.matchRatio)
}

// ===== STEP 2: Neue Rezepte via Claude generieren =====

async function generateRecipesWithClaude(offerIngredients, existingNames, dietsNeeded, count) {
  if (!ANTHROPIC_KEY) {
    console.log('   ⚠️ Kein ANTHROPIC_API_KEY — überspringe Generierung')
    return []
  }

  const month = new Date().getMonth() + 1
  const season = SEASON_INGREDIENTS[month] || []

  const prompt = `Du bist ein erfahrener Koch und Ernährungsberater. Erstelle ${count} neue Rezepte für eine deutsche Supermarkt-Spar-App.

WICHTIGE REGELN:
1. Rezepte müssen REALE, BEWÄHRTE Gerichte sein — keine wilden Fantasie-Kombinationen
2. Orientiere dich an bekannten Rezepten und fülle sie mit den verfügbaren Angebot-Zutaten
3. Mindestens 60% der Zutaten sollen aus dieser Angebotsliste stammen: ${offerIngredients.join(', ')}
4. Saisonale Zutaten bevorzugen: ${season.join(', ')}
5. Ernährungsformen abdecken: ${dietsNeeded.join(', ')}
6. Keine Duplikate zu: ${existingNames.slice(0, 30).join(', ')}
7. Pro Rezept 5-8 Zutaten, 4-7 Schritte
8. Realistische Nährwerte und Kosten (2-8€ pro Portion)
9. Deutsche Rezeptnamen

Antworte NUR mit einem JSON-Array:
[
  {
    "name": "Rezeptname",
    "emoji": "🍳",
    "meal": "lunch|dinner|breakfast|soup|salad|snack",
    "time_minutes": 30,
    "difficulty": "Einfach|Mittel|Schwer",
    "servings": 2,
    "calories": 450,
    "protein": 25,
    "carbs": 40,
    "fat": 18,
    "cost": 4.50,
    "diets": ["vegan"],
    "steps": ["Schritt 1...", "Schritt 2..."],
    "ingredients": [{"name": "Zutat", "amount": 200, "unit": "g"}]
  }
]

Kein Markdown, keine Erklärung, NUR das JSON-Array.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API Fehler ${response.status}: ${err}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text
  if (!content) throw new Error('Leere Claude-Antwort')

  // Parse JSON aus der Antwort
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Kein JSON-Array in Claude-Antwort gefunden')

  const recipes = JSON.parse(jsonMatch[0])
  return recipes.map(r => ({ ...r, source: 'generated' }))
}

// ===== STEP 3: In DB speichern =====

async function saveGeneratedRecipes(recipes) {
  const saved = []

  for (const recipe of recipes) {
    // Rezept in recipes-Tabelle mit status='pending'
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        name: recipe.name,
        emoji: recipe.emoji || '🍽️',
        meal: recipe.meal,
        time_minutes: recipe.time_minutes,
        difficulty: recipe.difficulty,
        servings: recipe.servings || 2,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        cost: recipe.cost,
        diets: recipe.diets || [],
        steps: recipe.steps || [],
        status: 'pending',
        source: 'generated',
        saved: 0,
      })
      .select('id, name')
      .single()

    if (error) {
      console.error(`   ❌ Fehler beim Speichern von "${recipe.name}": ${error.message}`)
      continue
    }

    // Zutaten verknüpfen (versuche existierende Ingredients zu finden)
    if (recipe.ingredients && data) {
      for (const ing of recipe.ingredients) {
        // Suche Ingredient per Name (case-insensitive)
        const { data: found } = await supabase
          .from('ingredients')
          .select('id')
          .ilike('name', `%${ing.name}%`)
          .limit(1)

        if (found && found.length > 0) {
          await supabase.from('recipe_ingredients').insert({
            recipe_id: data.id,
            ingredient_id: found[0].id,
            amount: ing.amount,
            unit: ing.unit
          })
        }
      }
    }

    saved.push(data)
    console.log(`   ✅ ${recipe.emoji || '🍽️'} ${recipe.name} (${recipe.meal}, ${recipe.diets?.join('/')})`)
  }

  return saved
}

// ===== STEP 4: Telegram-Benachrichtigung =====

async function sendTelegramNotification(goodMatches, newRecipes) {
  if (!TELEGRAM_BOT || !TELEGRAM_CHAT) {
    console.log('   ⚠️ Telegram nicht konfiguriert — überspringe')
    return
  }

  let msg = `🍳 *MealDeal Wöchentlicher Rezept-Report*\n\n`

  // Top Matches der Woche
  msg += `📊 *Top Rezepte mit Angebots-Match:*\n`
  for (const m of goodMatches.slice(0, 5)) {
    const pct = Math.round(m.matchRatio * 100)
    msg += `  • ${m.recipe.name} — ${pct}% (${m.matchedCount}/${m.totalCount} Zutaten)\n`
    msg += `    Märkte: ${m.stores.slice(0, 3).join(', ')}\n`
  }

  if (newRecipes.length > 0) {
    msg += `\n🆕 *${newRecipes.length} neue Rezepte zur Freigabe:*\n`
    for (const r of newRecipes) {
      msg += `  • ${r.name} ⏳ pending\n`
    }
    msg += `\n👉 Bitte in Supabase freigeben (status → approved)`
  } else {
    msg += `\n✅ Genug gute Matches — keine neuen Rezepte nötig`
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT,
      text: msg,
      parse_mode: 'Markdown',
    })
  })

  if (resp.ok) {
    console.log('   📱 Telegram-Nachricht gesendet')
  } else {
    console.error('   ❌ Telegram-Fehler:', await resp.text())
  }
}

// ===== MAIN =====

async function main() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🍳 MealDeal — Wöchentlicher Rezept-Workflow v2`)
  console.log(`   Datum: ${new Date().toLocaleString('de-DE')}`)
  console.log(`   Match-Threshold: ${MATCH_THRESHOLD * 100}%`)
  console.log(`   Claude API: ${ANTHROPIC_KEY ? '✅' : '❌ nicht konfiguriert'}`)
  console.log(`   Telegram: ${TELEGRAM_BOT ? '✅' : '❌ nicht konfiguriert'}`)
  if (DRY_RUN) console.log(`   🧪 DRY RUN`)
  console.log(`${'='.repeat(60)}\n`)

  // Step 1: Daten laden
  console.log('📥 Lade aktuelle Angebote...')
  const offers = await loadCurrentOffers()
  console.log(`   ${offers.length} aktive Angebote geladen`)

  if (offers.length === 0) {
    console.log('   ⚠️ Keine Angebote vorhanden — keine Analyse möglich')
    return
  }

  console.log('\n📥 Lade Rezepte mit Zutaten...')
  const { recipes, allIngredients, synonyms } = await loadRecipesWithIngredients()
  console.log(`   ${recipes.length} Rezepte, ${allIngredients.length} Zutaten`)

  // Step 2: Matching
  console.log('\n🔍 Matche Rezepte gegen Angebote...')
  const matchResults = matchRecipesAgainstOffers(recipes, offers, allIngredients, synonyms)

  const goodMatches = matchResults.filter(m => m.matchRatio >= MATCH_THRESHOLD)
  const totalRecipes = matchResults.length

  console.log(`\n📊 Ergebnis:`)
  console.log(`   ${goodMatches.length}/${totalRecipes} Rezepte mit ≥${MATCH_THRESHOLD * 100}% Angebots-Match`)
  console.log(`\n   🏆 Top 10 Matches:`)
  for (const m of matchResults.slice(0, 10)) {
    const pct = Math.round(m.matchRatio * 100)
    console.log(`      ${pct}% — ${m.recipe.name} (${m.matchedNames.join(', ')})`)
  }

  // Step 3: Brauchen wir neue Rezepte?
  let newRecipes = []

  if (goodMatches.length >= MIN_GOOD_MATCHES && !FORCE_GENERATE) {
    console.log(`\n✅ ${goodMatches.length} gute Matches — keine neuen Rezepte nötig`)
  } else {
    const needed = Math.min(MAX_NEW_RECIPES, MIN_GOOD_MATCHES - goodMatches.length + 2)
    console.log(`\n🔧 Nur ${goodMatches.length} gute Matches — generiere ${needed} neue Rezepte...`)

    // Welche Zutaten sind aktuell im Angebot?
    const offeredIngNames = [...new Set(
      offers.map(o => o.product_name).filter(Boolean)
    )].slice(0, 50)

    // Welche Ernährungsformen sind unterrepräsentiert?
    const dietCoverage = {}
    for (const m of goodMatches) {
      for (const d of (m.recipe.diets || [])) {
        dietCoverage[d] = (dietCoverage[d] || 0) + 1
      }
    }
    const allDiets = ['vegan', 'vegetarisch', 'omni', 'halal', 'high-protein', 'low-carb']
    const dietsNeeded = allDiets.filter(d => (dietCoverage[d] || 0) < 2)

    const existingNames = recipes.map(r => r.name)

    try {
      const generated = await generateRecipesWithClaude(
        offeredIngNames, existingNames, dietsNeeded.length > 0 ? dietsNeeded : allDiets, needed
      )
      console.log(`   Claude hat ${generated.length} Rezepte generiert`)

      if (!DRY_RUN) {
        newRecipes = await saveGeneratedRecipes(generated)
      } else {
        console.log('\n🧪 DRY RUN — generierte Rezepte:')
        console.log(JSON.stringify(generated, null, 2))
        newRecipes = generated
      }
    } catch (err) {
      console.error(`   ❌ Generierungs-Fehler: ${err.message}`)
    }
  }

  // Step 4: Telegram
  if (!DRY_RUN) {
    console.log('\n📱 Sende Telegram-Report...')
    await sendTelegramNotification(goodMatches, newRecipes)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏁 Rezept-Workflow v2 abgeschlossen`)
  console.log(`   ${goodMatches.length} Rezepte mit gutem Angebots-Match`)
  console.log(`   ${newRecipes.length} neue Rezepte generiert`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
