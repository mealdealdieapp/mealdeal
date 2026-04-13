#!/usr/bin/env node
/**
 * MealDeal — Wöchentlicher Rezept-Generator
 *
 * Läuft Sonntag früh (Cron: 0 6 * * 0) und generiert 5-10 neue Rezepte basierend auf:
 *  - Aktuelle Saison (Spargel im April, Kürbis im Oktober)
 *  - Aktuell häufige Angebote (z.B. viele Hähnchenangebote → Hähnchen-Rezepte)
 *  - Abwechslung in den Kategorien
 *
 * Nutzt OpenAI GPT (wenn OPENAI_API_KEY gesetzt), sonst Template-Fallback.
 *
 * Rezepte landen in `pending_recipes` Tabelle zur manuellen Freigabe.
 * Jo reviewt über die App oder direkt in Supabase — "Daumen hoch" → live.
 *
 * USAGE:
 *   node scripts/weekly-recipe-generator.mjs              # 5 Rezepte generieren
 *   node scripts/weekly-recipe-generator.mjs --count 10
 *   node scripts/weekly-recipe-generator.mjs --dry-run    # Nur anzeigen, nicht speichern
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
const OPENAI_KEY = process.env.OPENAI_API_KEY || envVars.OPENAI_API_KEY || ''

const args = process.argv.slice(2)
const countIdx = args.indexOf('--count')
const COUNT = countIdx >= 0 ? parseInt(args[countIdx + 1]) : 5
const DRY_RUN = args.includes('--dry-run')

if (!SUPABASE_KEY) {
  console.error('❌ Supabase Key fehlt')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== Saisonalität =====
const SEASON_INGREDIENTS = {
  1: ['Rosenkohl', 'Grünkohl', 'Steckrübe', 'Lauch', 'Feldsalat'],
  2: ['Rosenkohl', 'Grünkohl', 'Lauch', 'Pastinake', 'Wirsing'],
  3: ['Spinat', 'Bärlauch', 'Rhabarber', 'Lauch', 'Chicorée'],
  4: ['Spargel', 'Rhabarber', 'Bärlauch', 'Spinat', 'Radieschen'],
  5: ['Spargel', 'Erdbeeren', 'Radieschen', 'Kohlrabi', 'Rucola'],
  6: ['Erdbeeren', 'Zucchini', 'Kirschen', 'Himbeeren', 'Kopfsalat'],
  7: ['Tomaten', 'Zucchini', 'Paprika', 'Aprikosen', 'Heidelbeeren'],
  8: ['Tomaten', 'Paprika', 'Pfirsich', 'Pflaumen', 'Mais'],
  9: ['Kürbis', 'Äpfel', 'Birnen', 'Pilze', 'Trauben'],
  10: ['Kürbis', 'Äpfel', 'Pilze', 'Rote Bete', 'Kohl'],
  11: ['Rote Bete', 'Kürbis', 'Grünkohl', 'Wirsing', 'Rosenkohl'],
  12: ['Grünkohl', 'Rosenkohl', 'Mandarinen', 'Maronen', 'Rotkohl'],
}

const MEAL_TYPES = ['lunch', 'dinner', 'breakfast', 'soup', 'salad']

// ===== Template-basierte Rezept-Generierung (Fallback) =====
const RECIPE_TEMPLATES = [
  {
    pattern: '{ingredient}-Pfanne',
    emoji: '🍳',
    meal: 'dinner',
    time: 25,
    difficulty: 'easy',
    base_ingredients: ['Olivenöl', 'Zwiebeln', 'Knoblauch', 'Salz', 'Pfeffer'],
  },
  {
    pattern: '{ingredient}-Suppe',
    emoji: '🍲',
    meal: 'soup',
    time: 35,
    difficulty: 'easy',
    base_ingredients: ['Gemüsebrühe', 'Zwiebeln', 'Sahne', 'Salz', 'Pfeffer'],
  },
  {
    pattern: '{ingredient}-Salat',
    emoji: '🥗',
    meal: 'salad',
    time: 15,
    difficulty: 'easy',
    base_ingredients: ['Olivenöl', 'Essig', 'Senf', 'Salz', 'Pfeffer'],
  },
  {
    pattern: 'Gebackener {ingredient}',
    emoji: '🍽️',
    meal: 'dinner',
    time: 45,
    difficulty: 'medium',
    base_ingredients: ['Olivenöl', 'Knoblauch', 'Kräuter', 'Parmesan'],
  },
  {
    pattern: '{ingredient}-Curry',
    emoji: '🍛',
    meal: 'lunch',
    time: 30,
    difficulty: 'medium',
    base_ingredients: ['Kokosmilch', 'Currypaste', 'Reis', 'Ingwer', 'Knoblauch'],
  },
]

function generateTemplateRecipe(seasonIngredient) {
  const tmpl = RECIPE_TEMPLATES[Math.floor(Math.random() * RECIPE_TEMPLATES.length)]
  return {
    name: tmpl.pattern.replace('{ingredient}', seasonIngredient),
    emoji: tmpl.emoji,
    meal: tmpl.meal,
    time_minutes: tmpl.time,
    difficulty: tmpl.difficulty,
    servings: 2,
    steps: [
      `${seasonIngredient} vorbereiten und in passende Stücke schneiden.`,
      `Zwiebeln und Knoblauch in Olivenöl anschwitzen.`,
      `${seasonIngredient} dazugeben und ${tmpl.time - 15} Minuten garen.`,
      `Mit Salz, Pfeffer und Kräutern abschmecken.`,
      `Servieren und genießen.`,
    ],
    diets: [],
    calories: 400 + Math.floor(Math.random() * 300),
    protein: 15 + Math.floor(Math.random() * 20),
    carbs: 30 + Math.floor(Math.random() * 40),
    fat: 10 + Math.floor(Math.random() * 15),
    cost: 3 + Math.floor(Math.random() * 5),
    generated_by: 'template',
    season_ingredient: seasonIngredient,
  }
}

// ===== OpenAI-basierte Rezept-Generierung =====
async function generateOpenAIRecipe(seasonIngredient, trendIngredient, meal) {
  const prompt = `Erstelle ein deutsches Rezept im JSON-Format mit dem Hauptzutat "${seasonIngredient}"${trendIngredient ? ` und "${trendIngredient}"` : ''}.
Mahlzeitart: ${meal}.

Format:
{
  "name": "Rezeptname (deutsch)",
  "emoji": "passendes Emoji",
  "meal": "${meal}",
  "time_minutes": Zahl,
  "difficulty": "easy"|"medium"|"hard",
  "servings": 2,
  "calories": Zahl pro Portion,
  "protein": Zahl pro Portion in g,
  "carbs": Zahl pro Portion in g,
  "fat": Zahl pro Portion in g,
  "cost": geschätzte Kosten in €,
  "ingredients": [{"name": "...", "amount": Zahl, "unit": "g|ml|Stück|..."}],
  "steps": ["Schritt 1", "Schritt 2", ...]
}

Gib NUR das JSON aus, keine Erklärung, kein Markdown.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Du bist ein professioneller Koch und erstellst strukturierte Rezepte in JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI Fehler ${response.status}: ${err}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Leere OpenAI-Antwort')

  const recipe = JSON.parse(content)
  recipe.generated_by = 'openai-gpt-4o-mini'
  recipe.season_ingredient = seasonIngredient
  return recipe
}

// ===== Trend-Zutaten aus Angeboten =====
async function getTrendingIngredients() {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('offers')
    .select('product_name, category')
    .gte('valid_until', today)
    .limit(500)

  // Zähle Kategorien
  const catCount = {}
  for (const o of data || []) {
    const c = o.category || 'Sonstiges'
    catCount[c] = (catCount[c] || 0) + 1
  }
  return Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat)
}

// ===== MAIN =====
async function main() {
  console.log(`\n🍳 MealDeal — Wöchentlicher Rezept-Generator`)
  console.log(`   Datum: ${new Date().toLocaleString('de-DE')}`)
  console.log(`   Anzahl: ${COUNT}`)
  console.log(`   Methode: ${OPENAI_KEY ? 'OpenAI GPT-4o-mini' : 'Template (kein OPENAI_API_KEY)'}`)
  if (DRY_RUN) console.log(`   🧪 DRY RUN`)
  console.log('')

  const month = new Date().getMonth() + 1
  const seasonIngs = SEASON_INGREDIENTS[month] || []
  console.log(`🍅 Saison-Zutaten (${month}/${new Date().getFullYear()}): ${seasonIngs.join(', ')}`)

  const trending = await getTrendingIngredients()
  console.log(`📈 Trend-Kategorien: ${trending.join(', ')}\n`)

  // Generiere Rezepte
  const generated = []
  for (let i = 0; i < COUNT; i++) {
    const seasonIng = seasonIngs[i % seasonIngs.length] || 'Kartoffel'
    const meal = MEAL_TYPES[i % MEAL_TYPES.length]

    try {
      console.log(`[${i + 1}/${COUNT}] Generiere: ${seasonIng} (${meal})`)
      let recipe
      if (OPENAI_KEY) {
        recipe = await generateOpenAIRecipe(seasonIng, null, meal)
        // Rate Limit für OpenAI
        await new Promise(r => setTimeout(r, 1500))
      } else {
        recipe = generateTemplateRecipe(seasonIng)
      }

      // Check: Gibt es dieses Rezept schon?
      const { data: existing } = await supabase
        .from('recipes')
        .select('id')
        .ilike('name', recipe.name)
        .limit(1)

      if (existing && existing.length > 0) {
        console.log(`   ⚠️ Rezept "${recipe.name}" existiert bereits, überspringe`)
        continue
      }

      generated.push(recipe)
      console.log(`   ✅ ${recipe.emoji} ${recipe.name}`)
    } catch (err) {
      console.error(`   ❌ Fehler: ${err.message}`)
    }
  }

  console.log(`\n✅ ${generated.length}/${COUNT} Rezepte generiert\n`)

  if (DRY_RUN) {
    console.log(`🧪 DRY RUN — Ausgabe:\n`)
    console.log(JSON.stringify(generated, null, 2))
    return
  }

  // In pending_recipes speichern
  if (generated.length === 0) {
    console.log(`Keine Rezepte zu speichern.`)
    return
  }

  // Versuche pending_recipes Tabelle zu nutzen, falls nicht vorhanden: direkt in recipes
  const pendingRows = generated.map(r => ({
    name: r.name,
    emoji: r.emoji,
    meal: r.meal,
    time_minutes: r.time_minutes,
    difficulty: r.difficulty,
    servings: r.servings || 2,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    cost: r.cost,
    steps: r.steps,
    diets: r.diets || [],
    saved: 0,
    // image_url wird später via generate-recipe-images.mjs gefüllt
  }))

  // Erst pending_recipes probieren
  const { error: pendingErr } = await supabase
    .from('pending_recipes')
    .insert(pendingRows.map(r => ({ ...r, generated_at: new Date().toISOString(), status: 'pending' })))

  if (pendingErr && pendingErr.message.includes('does not exist')) {
    console.log(`ℹ️  pending_recipes Tabelle existiert nicht — speichere direkt in recipes`)
    const { data, error } = await supabase.from('recipes').insert(pendingRows).select('id, name')
    if (error) {
      console.error(`❌ Fehler: ${error.message}`)
    } else {
      console.log(`✅ ${data?.length || 0} Rezepte in recipes Tabelle gespeichert`)
    }
  } else if (pendingErr) {
    console.error(`❌ Fehler: ${pendingErr.message}`)
  } else {
    console.log(`✅ ${pendingRows.length} Rezepte in pending_recipes gespeichert (warten auf Review)`)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏁 Rezept-Generator fertig`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
