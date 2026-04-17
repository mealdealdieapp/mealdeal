#!/usr/bin/env node
/**
 * MealDeal — Rezeptbilder mit DALL-E generieren
 *
 * Dieses Script generiert KI-Bilder für Rezepte die kein funktionierendes Bild haben,
 * lädt sie in den Supabase Storage Bucket hoch und aktualisiert die DB.
 *
 * USAGE:
 *   1. OpenAI API Key als Environment Variable setzen:
 *      export OPENAI_API_KEY="sk-..."
 *
 *   2. Script starten:
 *      node scripts/generate-recipe-images.mjs
 *
 *   3. Optional: Nur bestimmte Rezepte (by ID):
 *      node scripts/generate-recipe-images.mjs --ids "abc123,def456"
 *
 *   4. Optional: ALLE Rezepte neu generieren (überschreibt vorhandene):
 *      node scripts/generate-recipe-images.mjs --all
 *
 *   5. Optional: Nur kaputte Bilder fixen:
 *      node scripts/generate-recipe-images.mjs --broken-only
 *
 * KOSTEN: ~0.04€ pro Bild (DALL-E 3, 1024x1024)
 */

import { createClient } from '@supabase/supabase-js'

// ===== CONFIG =====
const SUPABASE_URL = 'https://wjhesvkapqrsbibqjbtr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const BUCKET = 'recipe-images'
const IMAGE_SIZE = '1024x1024'
const DALL_E_MODEL = 'dall-e-3'

// ===== VALIDATION =====
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY fehlt!')
  console.error('   Setze den Key: export OPENAI_API_KEY="sk-..."')
  console.error('   Du bekommst ihn auf: https://platform.openai.com/api-keys')
  process.exit(1)
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase Key fehlt!')
  console.error('   Setze: export SUPABASE_SERVICE_KEY="eyJ..."')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ===== REZEPT-DETAILS LADEN (Zutaten + Steps) =====
async function loadRecipeDetails(recipeId) {
  // Zutaten mit Namen laden
  const { data: ingRows } = await supabase
    .from('recipe_ingredients')
    .select('amount, unit, ingredients(name)')
    .eq('recipe_id', recipeId)
    .limit(20)

  const ingredients = (ingRows || [])
    .map(r => r.ingredients?.name)
    .filter(Boolean)

  // Steps aus dem Rezept
  const { data: recipe } = await supabase
    .from('recipes')
    .select('steps')
    .eq('id', recipeId)
    .single()

  const steps = recipe?.steps || []

  return { ingredients, steps }
}

// ===== PROMPT TEMPLATE =====
function buildPrompt(recipeName, meal, ingredients = [], steps = []) {
  const mealContext = {
    breakfast: 'breakfast dish',
    lunch: 'lunch dish',
    dinner: 'dinner dish',
    snack: 'snack',
    dessert: 'dessert',
    soup: 'soup',
    salad: 'salad',
    baking: 'baked good',
    cocktail: 'drink/cocktail',
    date_night: 'special dinner',
  }

  const context = mealContext[meal] || 'dish'

  // Zutaten-Beschreibung (max 10 fuer Prompt-Laenge)
  const ingList = ingredients.slice(0, 10).join(', ')
  const ingPart = ingList ? ` Made with: ${ingList}.` : ''

  // Zubereitungs-Hinweise extrahieren (Optik-relevante Keywords aus den Steps)
  let prepHint = ''
  if (steps.length > 0) {
    // Aus den Steps visuelle Hinweise extrahieren
    const allSteps = steps.join(' ').toLowerCase()
    const visualCues = []
    if (allSteps.includes('überback') || allSteps.includes('gratiniert') || allSteps.includes('gratin')) visualCues.push('golden gratinated top')
    if (allSteps.includes('anbraten') || allSteps.includes('scharf anbraten') || allSteps.includes('knusprig')) visualCues.push('crispy seared surface')
    if (allSteps.includes('grillen') || allSteps.includes('gegrillt')) visualCues.push('grill marks visible')
    if (allSteps.includes('frittier') || allSteps.includes('ausback')) visualCues.push('deep-fried golden crust')
    if (allSteps.includes('garnieren') || allSteps.includes('bestreuen') || allSteps.includes('topping')) visualCues.push('garnished on top')
    if (allSteps.includes('schicht') || allSteps.includes('auflauf')) visualCues.push('visible layered structure')
    if (allSteps.includes('cremig') || allSteps.includes('pürieren') || allSteps.includes('sauce')) visualCues.push('creamy smooth texture')
    if (allSteps.includes('backen') || allSteps.includes('ofen')) visualCues.push('oven-baked golden finish')
    if (allSteps.includes('rollen') || allSteps.includes('wickeln') || allSteps.includes('wrap')) visualCues.push('rolled/wrapped presentation')
    if (allSteps.includes('salat') || allSteps.includes('frisch') || allSteps.includes('roh')) visualCues.push('fresh vibrant colors')
    if (allSteps.includes('karamell')) visualCues.push('caramelized glaze')
    if (allSteps.includes('schmoren') || allSteps.includes('slow')) visualCues.push('tender slow-cooked look')
    if (visualCues.length > 0) {
      prepHint = ` Visual details: ${visualCues.slice(0, 4).join(', ')}.`
    }
  }

  return `Clean, minimalist food photography of "${recipeName}", a German ${context}.${ingPart}${prepHint} ` +
    `The dish looks delicious and makes you want to eat it immediately. ` +
    `Shot from a 45-degree angle on a simple white or light marble surface. ` +
    `Bright, soft natural daylight from the side, airy and fresh mood. ` +
    `Served on a simple matte ceramic plate or bowl in white or earth tones. ` +
    `Very minimal styling — only the dish itself, maybe one small fresh herb sprig as garnish. ` +
    `Clean negative space around the plate, no clutter, no utensils, no napkins. ` +
    `Colors are natural and vibrant — the food is the hero. ` +
    `Photorealistic, appetizing, modern recipe-app quality. ` +
    `No text, no watermarks, no logos, no hands, no people, no busy backgrounds.`
}

// ===== DALL-E API CALL =====
async function generateImage(prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DALL_E_MODEL,
      prompt,
      n: 1,
      size: IMAGE_SIZE,
      quality: 'standard', // 'hd' kostet doppelt
      response_format: 'b64_json',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`DALL-E API Fehler: ${response.status} — ${err.error?.message || 'Unbekannt'}`)
  }

  const data = await response.json()
  return data.data[0].b64_json
}

// ===== UPLOAD TO SUPABASE STORAGE =====
async function uploadImage(fileName, base64Data) {
  const buffer = Buffer.from(base64Data, 'base64')

  // Erst versuchen zu löschen (falls schon vorhanden)
  await supabase.storage.from(BUCKET).remove([fileName])

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (error) throw new Error(`Upload Fehler: ${error.message}`)
  return data.path
}

// ===== CHECK IF IMAGE EXISTS & WORKS =====
async function isImageBroken(imageUrl) {
  if (!imageUrl) return true

  // source.unsplash.com URLs sind immer kaputt
  if (imageUrl.includes('source.unsplash.com')) return true

  // Externe URLs checken
  if (imageUrl.startsWith('ext:')) {
    try {
      const resp = await fetch(imageUrl.slice(4), { method: 'HEAD', redirect: 'follow' })
      return !resp.ok
    } catch {
      return true
    }
  }

  // Bucket URLs checken
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(imageUrl)}`
  try {
    const resp = await fetch(url, { method: 'HEAD' })
    return !resp.ok
  } catch {
    return true
  }
}

// ===== MAIN =====
async function main() {
  const args = process.argv.slice(2)
  const mode = args.includes('--all') ? 'all'
    : args.includes('--broken-only') ? 'broken'
    : args.includes('--ids') ? 'ids'
    : 'broken' // Default: nur kaputte fixen

  console.log(`\n🍳 MealDeal Rezeptbild-Generator`)
  console.log(`   Modus: ${mode}`)
  console.log(`   Model: ${DALL_E_MODEL} (${IMAGE_SIZE})\n`)

  // Rezepte laden
  let recipes
  if (mode === 'ids') {
    const idIndex = args.indexOf('--ids')
    const ids = args[idIndex + 1]?.split(',') || []
    const { data } = await supabase.from('recipes')
      .select('id, name, image_url, emoji, meal')
      .in('id', ids)
    recipes = data || []
  } else {
    const { data } = await supabase.from('recipes')
      .select('id, name, image_url, emoji, meal')
      .limit(500)
    recipes = data || []
  }

  console.log(`📋 ${recipes.length} Rezepte geladen\n`)

  // Filtern nach Modus
  let toProcess = []
  if (mode === 'all') {
    toProcess = recipes
  } else {
    // Nur kaputte Bilder
    console.log('🔍 Prüfe welche Bilder kaputt sind...')
    for (const r of recipes) {
      const broken = await isImageBroken(r.image_url)
      if (broken) {
        toProcess.push(r)
        process.stdout.write(`  ❌ ${r.name}\n`)
      }
    }
    console.log('')
  }

  if (toProcess.length === 0) {
    console.log('✅ Alle Bilder sind in Ordnung! Nichts zu tun.')
    return
  }

  const costEstimate = (toProcess.length * 0.04).toFixed(2)
  console.log(`\n🎨 ${toProcess.length} Bilder zu generieren`)
  console.log(`💰 Geschätzte Kosten: ~${costEstimate}€\n`)

  // Bestätigung abwarten
  if (toProcess.length > 5) {
    console.log('⏳ Starte in 5 Sekunden... (Ctrl+C zum Abbrechen)')
    await new Promise(r => setTimeout(r, 5000))
  }

  // Generieren
  let success = 0
  let failed = 0

  for (let i = 0; i < toProcess.length; i++) {
    const recipe = toProcess[i]
    const progress = `[${i + 1}/${toProcess.length}]`

    try {
      console.log(`${progress} 🎨 Generiere: ${recipe.emoji || '🍽️'} ${recipe.name}`)

      // 1. Rezept-Details laden (Zutaten + Steps)
      const { ingredients, steps } = await loadRecipeDetails(recipe.id)
      if (ingredients.length > 0) {
        console.log(`   📝 ${ingredients.length} Zutaten, ${steps.length} Steps geladen`)
      }

      // 2. Prompt bauen (mit Zutaten + visuellen Hinweisen aus Steps)
      const prompt = buildPrompt(recipe.name, recipe.meal, ingredients, steps)

      // 3. Bild generieren
      const base64 = await generateImage(prompt)

      // 4. Dateiname erstellen (sauber, ohne Sonderzeichen)
      const cleanName = recipe.name
        .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe')
        .replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
      const fileName = `${cleanName}.png`

      // 5. In Supabase Storage hochladen
      await uploadImage(fileName, base64)

      // 6. DB aktualisieren (Bucket-Pfad, KEIN ext: Prefix)
      const { error } = await supabase
        .from('recipes')
        .update({ image_url: fileName })
        .eq('id', recipe.id)

      if (error) throw new Error(`DB Update Fehler: ${error.message}`)

      console.log(`${progress} ✅ Fertig: ${fileName}`)
      success++

      // Rate Limiting: 1 Sekunde Pause zwischen Requests
      if (i < toProcess.length - 1) {
        await new Promise(r => setTimeout(r, 1500))
      }

    } catch (err) {
      console.error(`${progress} ❌ Fehler bei ${recipe.name}: ${err.message}`)
      failed++

      // Bei Rate Limit: länger warten
      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('   ⏳ Rate Limit — warte 30 Sekunden...')
        await new Promise(r => setTimeout(r, 30000))
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`🏁 Fertig!`)
  console.log(`   ✅ Erfolgreich: ${success}`)
  console.log(`   ❌ Fehlgeschlagen: ${failed}`)
  console.log(`   💰 Kosten: ~${(success * 0.04).toFixed(2)}€`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
