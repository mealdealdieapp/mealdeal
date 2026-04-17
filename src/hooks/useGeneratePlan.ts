import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { useOffers } from './useOffers'
import { useSynonyms } from './useSynonyms'
import { matchIngredientToOffer } from '../lib/offerMatching'
import type { Json } from '../types/database.types'
import type { PlanRecipe, DayKey, WeekPlan } from './useWeeklyPlan'

const DAYS: DayKey[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DEFAULT_CAL_TARGET = 2000
const CAL_TOLERANCE = 0.15 // ±15% Toleranz pro Tag
const MEAL_DISTRIBUTION = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.30,
  snack: 0.10,
} as const

interface RawRecipe {
  id: string
  name: string
  emoji: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  time_minutes: number | null
  difficulty: string | null
  image_url: string | null
  servings: number | null
  saved: number | null
  cost: number | null
  meal: string | null
  diets: string[] | null
}

interface IngredientInfo {
  name: string
  category: string | null
  amount: number | null
  unit: string | null
}

interface GenerateOptions {
  calTarget?: number
  budget?: number | null
  weekStart: string
}

// Lade alle Zutaten für mehrere Rezepte auf einmal (effizienter als einzeln)
async function loadAllIngredients(recipeIds: string[]): Promise<Map<string, IngredientInfo[]>> {
  const map = new Map<string, IngredientInfo[]>()
  if (recipeIds.length === 0) return map

  const { data } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, amount, unit, ingredients(name, category)')
    .in('recipe_id', recipeIds)

  for (const row of data ?? []) {
    const ing = row.ingredients as { name: string; category: string | null } | null
    if (!ing?.name || !row.recipe_id) continue
    const list = map.get(row.recipe_id) ?? []
    list.push({ name: ing.name, category: ing.category, amount: row.amount, unit: row.unit })
    map.set(row.recipe_id, list)
  }
  return map
}

function toPlanRecipe(r: RawRecipe, ings: IngredientInfo[]): PlanRecipe {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    cal: r.calories,
    protein: r.protein != null ? Number(r.protein) : null,
    carbs: r.carbs != null ? Number(r.carbs) : null,
    fat: r.fat != null ? Number(r.fat) : null,
    time: r.time_minutes ? `${r.time_minutes} Min` : null,
    diff: r.difficulty,
    image_url: r.image_url,
    servings: r.servings,
    saved: r.saved != null ? Number(r.saved) : null,
    cost: r.cost != null ? Number(r.cost) : null,
    ings: ings.map(i => ({
      n: i.name,
      m: i.amount != null ? String(i.amount) : '',
      e: i.unit ?? '',
      k: i.category ?? '',
    })),
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Berechne wie viele Zutaten eines Rezepts aktuell im Angebot sind
function countOfferMatches(
  recipeIngs: IngredientInfo[],
  offers: Array<{ id: string; product_name: string; offer_price: number; original_price: number | null; discount_percent: number | null; store: string; category: string | null }>,
  synonymMap?: Map<string, string[]>,
): { matchCount: number; totalSaved: number } {
  let matchCount = 0
  let totalSaved = 0
  for (const ing of recipeIngs) {
    const match = matchIngredientToOffer(
      { name: ing.name, category: ing.category },
      offers,
      synonymMap,
    )
    if (match) {
      matchCount++
      if (match.originalPrice && match.originalPrice > match.offerPrice) {
        totalSaved += match.originalPrice - match.offerPrice
      }
    }
  }
  return { matchCount, totalSaved }
}

// Zähle überlappende Zutaten zwischen Rezept und bereits verwendeten Zutaten
function ingredientOverlap(
  recipeIngs: IngredientInfo[],
  usedIngredientNames: Set<string>,
): number {
  let overlap = 0
  for (const ing of recipeIngs) {
    const key = ing.name.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim()
    if (usedIngredientNames.has(key)) overlap++
  }
  return overlap
}

export function useGeneratePlan() {
  const session = useAppStore((s) => s.session)
  const profile = useAppStore((s) => s.profile)
  const { offers } = useOffers()
  const { data: synonymMap } = useSynonyms()
  const queryClient = useQueryClient()
  const userDiets = profile?.diets ?? []

  return useMutation({
    mutationFn: async ({ calTarget: calTargetInput, budget, weekStart }: GenerateOptions) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      const calTarget = calTargetInput ?? profile?.cal_target ?? DEFAULT_CAL_TARGET
      const weeklyBudget = budget ?? profile?.budget ?? null

      // 1. Alle öffentlichen Rezepte laden
      const { data: allRecipes, error } = await supabase
        .from('recipes')
        .select('id, name, emoji, calories, protein, carbs, fat, time_minutes, difficulty, image_url, servings, saved, cost, meal, diets')
        .eq('is_public', true)

      if (error) throw error
      if (!allRecipes || allRecipes.length === 0) throw new Error('Keine Rezepte verfügbar')

      // 2. Nach Ernährung filtern
      let recipes = allRecipes as RawRecipe[]
      for (const diet of userDiets) {
        if (diet === 'vegan') {
          recipes = recipes.filter(r => (r.diets ?? []).includes('vegan'))
        } else if (diet === 'vegetarisch') {
          recipes = recipes.filter(r => {
            const d = r.diets ?? []
            return d.includes('vegetarisch') || d.includes('vegan')
          })
        }
      }

      if (recipes.length < 5) throw new Error('Zu wenige passende Rezepte für einen Wochenplan')

      // 3. Zutaten für ALLE Rezepte vorladen (eine DB-Query statt 28 einzelne)
      const allRecipeIds = recipes.map(r => r.id)
      const ingredientMap = await loadAllIngredients(allRecipeIds)

      // 4. Angebots-Score pro Rezept vorberechnen
      const offerScoreMap = new Map<string, { matchCount: number; totalSaved: number }>()
      for (const r of recipes) {
        const ings = ingredientMap.get(r.id) ?? []
        offerScoreMap.set(r.id, countOfferMatches(ings, offers, synonymMap ?? undefined))
      }

      // 5. Nach Mahlzeit-Typ gruppieren
      const breakfastPool = recipes.filter(r => r.meal === 'breakfast')
      const snackPool = recipes.filter(r => r.meal === 'snack' || r.meal === 'dessert')
      const mainPool = recipes.filter(r => r.meal !== 'breakfast' && r.meal !== 'snack' && r.meal !== 'dessert')

      // 6. Plan generieren mit Scoring
      const plan: WeekPlan = {}
      const usedIds = new Set<string>()
      const usedIngredientNames = new Set<string>()
      let totalPlanCost = 0
      const mealsToFill = ['breakfast', 'lunch', 'dinner', 'snack'] as const

      // Budget pro Tag berechnen (falls Budget vorhanden)
      const dailyBudget = weeklyBudget ? weeklyBudget / 7 : null

      for (const day of DAYS) {
        plan[day] = {}
        let dailyCal = 0
        let dailyCost = 0

        for (const meal of mealsToFill) {
          // Pool bestimmen (Frühstück, Hauptgerichte, Snacks)
          const pool = meal === 'breakfast'
            ? (breakfastPool.length >= 3 ? breakfastPool : [...breakfastPool, ...mainPool])
            : meal === 'snack'
            ? (snackPool.length >= 3 ? snackPool : [...snackPool, ...breakfastPool])
            : mainPool

          if (pool.length === 0) continue

          // Ideal-Kalorien für diese Mahlzeit
          const idealCal = calTarget * MEAL_DISTRIBUTION[meal]

          // Jedes Rezept bewerten
          const scored = shuffle(pool).map(recipe => {
            let score = 0
            const cal = recipe.calories ?? 0
            const cost = Number(recipe.cost) || 0
            const offerData = offerScoreMap.get(recipe.id) ?? { matchCount: 0, totalSaved: 0 }
            const ings = ingredientMap.get(recipe.id) ?? []

            // A. Mahlzeit-Typ Match (30 Punkte)
            if (recipe.meal === meal) score += 30
            else if (meal === 'snack' && recipe.meal === 'breakfast') score += 10
            else if (meal !== 'snack' && recipe.meal !== 'breakfast') score += 15

            // B. Kalorien-Fit (40 Punkte max)
            const calDiff = Math.abs(cal - idealCal)
            const calScore = Math.max(0, 40 - Math.round(calDiff / 10))
            score += calScore

            // C. Abwechslung — bereits genutzte Rezepte stark bestrafen (50 Punkte)
            if (usedIds.has(recipe.id)) score -= 50

            // D. Angebots-Bonus — Rezepte mit Zutaten im Angebot bevorzugen (25 Punkte max)
            if (offerData.matchCount > 0) {
              score += Math.min(25, offerData.matchCount * 8)
            }
            if (offerData.totalSaved > 0) {
              score += Math.min(10, Math.round(offerData.totalSaved * 5))
            }

            // E. Zutaten-Wiederverwendung — gleiche Zutaten wie bereits geplant (20 Punkte max)
            const overlap = ingredientOverlap(ings, usedIngredientNames)
            if (overlap > 0) score += Math.min(20, overlap * 7)

            // F. Budget — günstigere Rezepte bevorzugen wenn Budget knapp (15 Punkte max)
            if (dailyBudget && cost > 0) {
              const remainingBudget = dailyBudget - dailyCost
              if (cost <= remainingBudget) score += 15
              else if (cost <= remainingBudget * 1.2) score += 5
              else score -= 10
            } else if (cost > 0 && cost <= 4) {
              score += 10
            }

            return { recipe, score }
          })

          // Bestes Rezept wählen
          scored.sort((a, b) => b.score - a.score)
          const pick = scored[0]

          if (pick) {
            const ings = ingredientMap.get(pick.recipe.id) ?? []
            plan[day][meal] = [toPlanRecipe(pick.recipe, ings)]
            usedIds.add(pick.recipe.id)
            dailyCal += pick.recipe.calories ?? 0
            dailyCost += Number(pick.recipe.cost) || 0

            // Zutaten für Wiederverwendungs-Tracking merken
            for (const ing of ings) {
              usedIngredientNames.add(ing.name.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim())
            }
          }
        }

        // Tagescheck: Kalorien in Toleranz?
        const minCal = calTarget * (1 - CAL_TOLERANCE)
        const maxCal = calTarget * (1 + CAL_TOLERANCE)
        if (dailyCal < minCal || dailyCal > maxCal) {
          // Versuch: Tausche das Gericht mit größter Abweichung
          // (aktuell als Info loggen, später feintunen)
        }

        totalPlanCost += dailyCost
      }

      // 7. In Supabase speichern
      const { error: saveError } = await supabase.from('weekly_plans').upsert({
        user_id: session.user.id,
        week_start: weekStart,
        plan: plan as unknown as Json,
      }, { onConflict: 'user_id,week_start' })

      if (saveError) throw saveError

      return {
        plan,
        stats: {
          estimatedCost: Math.round(totalPlanCost * 100) / 100,
          avgDailyCal: Math.round(
            DAYS.reduce((sum, day) => {
              const dayMeals = plan[day] ?? {}
              return sum + Object.values(dayMeals).reduce((s, meals) => {
                return s + ((meals as PlanRecipe[])?.[0]?.cal ?? 0)
              }, 0)
            }, 0) / 7
          ),
          ingredientReuse: usedIngredientNames.size,
          offerMatches: [...offerScoreMap.values()].filter(v => v.matchCount > 0).length,
        },
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] })
    },
  })
}
