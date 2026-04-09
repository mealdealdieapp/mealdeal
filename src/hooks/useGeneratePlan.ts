import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { Json } from '../types/database.types'
import type { PlanRecipe, DayKey, WeekPlan } from './useWeeklyPlan'

const DAYS: DayKey[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

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

interface GenerateOptions {
  calTarget: number
  budget?: number | null
  weekStart: string
}

// Load ingredients for a recipe
async function loadIngredients(recipeId: string): Promise<PlanRecipe['ings']> {
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('amount, unit, ingredients(name, category)')
    .eq('recipe_id', recipeId)

  return (data ?? []).map((ri) => {
    const ing = ri.ingredients as { name: string; category: string | null } | null
    return { n: ing?.name ?? '', m: ri.amount != null ? String(ri.amount) : '', e: ri.unit ?? '', k: ing?.category ?? '' }
  }).filter((i) => i.n)
}

function toPlanRecipe(r: RawRecipe, ings: PlanRecipe['ings']): PlanRecipe {
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
    ings,
  }
}

// Score a recipe for a specific meal slot considering variety and nutrition
function scoreRecipe(
  recipe: RawRecipe,
  meal: string,
  _dailyCalSoFar: number,
  calTarget: number,
  usedIds: Set<string>,
  _usedIngredients: Map<string, number>,
): number {
  let score = 0

  // 1. Meal type match (breakfast recipes for breakfast, etc.)
  if (recipe.meal === meal) score += 30
  else if (meal === 'snack' && recipe.meal === 'breakfast') score += 10
  else if (meal !== 'snack' && recipe.meal !== 'breakfast') score += 15

  // 2. Calorie fit - how well does this recipe fill the remaining budget?
  const cal = recipe.calories ?? 0
  const mealTargets: Record<string, number> = {
    breakfast: calTarget * 0.25,
    lunch: calTarget * 0.35,
    dinner: calTarget * 0.30,
    snack: calTarget * 0.10,
  }
  const idealCal = mealTargets[meal] ?? calTarget * 0.25
  const calDiff = Math.abs(cal - idealCal)
  score += Math.max(0, 30 - Math.round(calDiff / 20))

  // 3. Variety - penalize already used recipes
  if (usedIds.has(recipe.id)) score -= 50

  // 4. Offers/savings bonus
  const saved = Number(recipe.saved) || 0
  if (saved > 0) score += Math.min(20, Math.round(saved * 10))

  // 5. Ingredient reuse bonus (Produktverwertung)
  if (_usedIngredients.size > 0) {
    // This is a rough estimate since we don't have ingredients loaded yet
    // We'll give a small bonus for cheaper recipes (likely simpler/shared ingredients)
    const cost = Number(recipe.cost) || 0
    if (cost > 0 && cost < 5) score += 5
  }

  // 6. Budget consideration
  const cost = Number(recipe.cost) || 0
  if (cost > 0 && cost <= 3) score += 10
  else if (cost > 0 && cost <= 5) score += 5

  return score
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useGeneratePlan() {
  const session = useAppStore((s) => s.session)
  const profile = useAppStore((s) => s.profile)
  const queryClient = useQueryClient()
  const userDiets = profile?.diets ?? []

  return useMutation({
    mutationFn: async ({ calTarget, weekStart }: GenerateOptions) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      // 1. Load all public recipes
      const { data: allRecipes, error } = await supabase
        .from('recipes')
        .select('id, name, emoji, calories, protein, carbs, fat, time_minutes, difficulty, image_url, servings, saved, cost, meal, diets')
        .eq('is_public', true)

      if (error) throw error
      if (!allRecipes || allRecipes.length === 0) throw new Error('Keine Rezepte verfügbar')

      // 2. Filter by user diet
      let recipes = allRecipes as RawRecipe[]
      for (const diet of userDiets) {
        if (diet === 'vegan') {
          recipes = recipes.filter((r) => (r.diets ?? []).includes('vegan'))
        } else if (diet === 'vegetarisch') {
          recipes = recipes.filter((r) => {
            const d = r.diets ?? []
            return d.includes('vegetarisch') || d.includes('vegan')
          })
        }
      }

      if (recipes.length < 3) throw new Error('Zu wenige passende Rezepte')

      // 3. Separate by meal type
      const breakfastRecipes = recipes.filter((r) => r.meal === 'breakfast')
      const snackRecipes = recipes.filter((r) => r.meal === 'snack' || r.meal === 'dessert')
      const mainRecipes = recipes.filter((r) => r.meal !== 'breakfast' && r.meal !== 'snack' && r.meal !== 'dessert')

      // 4. Generate plan
      const plan: WeekPlan = {}
      const usedIds = new Set<string>()
      const usedIngredients = new Map<string, number>()
      const mealsToFill = ['breakfast', 'lunch', 'dinner', 'snack'] as const

      // First pass: pick recipes for all slots
      const picks: { day: DayKey; meal: string; recipe: RawRecipe }[] = []

      for (const day of DAYS) {
        plan[day] = {}
        let dailyCal = 0

        for (const meal of mealsToFill) {
          const pool = meal === 'breakfast'
            ? (breakfastRecipes.length > 0 ? breakfastRecipes : mainRecipes)
            : meal === 'snack'
            ? (snackRecipes.length > 0 ? snackRecipes : breakfastRecipes.length > 0 ? breakfastRecipes : mainRecipes)
            : mainRecipes

          const scored = shuffle(pool).map((r) => ({
            recipe: r,
            score: scoreRecipe(r, meal, dailyCal, calTarget, usedIds, usedIngredients),
          }))
          scored.sort((a, b) => b.score - a.score)

          const pick = scored[0]
          if (pick) {
            picks.push({ day, meal, recipe: pick.recipe })
            usedIds.add(pick.recipe.id)
            dailyCal += pick.recipe.calories ?? 0
          }
        }
      }

      // Second pass: load all ingredients in parallel
      const ingredientResults = await Promise.all(
        picks.map((p) => loadIngredients(p.recipe.id))
      )

      for (let i = 0; i < picks.length; i++) {
        const { day, meal, recipe } = picks[i]
        const ings = ingredientResults[i]
        plan[day][meal] = [toPlanRecipe(recipe, ings)]

        for (const ing of ings) {
          const key = ing.n.toLowerCase()
          usedIngredients.set(key, (usedIngredients.get(key) ?? 0) + 1)
        }
      }

      // 5. Save to DB
      const { error: saveError } = await supabase.from('weekly_plans').upsert({
        user_id: session.user.id,
        week_start: weekStart,
        plan: plan as unknown as Json,
      }, { onConflict: 'user_id,week_start' })

      if (saveError) throw saveError

      return plan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] })
    },
  })
}
