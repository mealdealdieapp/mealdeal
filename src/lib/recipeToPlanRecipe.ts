import { supabase } from './supabase'
import type { PlanRecipe } from '../hooks/useWeeklyPlan'
import type { Recipe } from '../types/app.types'

/**
 * Konvertiert ein DB-Recipe in das kompakte PlanRecipe-Format (inkl. Zutaten).
 *
 * Vorher in src/components/weekly/RecipePicker.tsx — ausgelagert damit
 * RecipePicker nur Components exportiert (Fast-Refresh).
 */
export async function recipeToPlanRecipe(r: Recipe): Promise<PlanRecipe> {
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('amount, unit, ingredients(name, emoji, category)')
    .eq('recipe_id', r.id)

  const ings = (data ?? []).map((ri) => {
    const ing = ri.ingredients as { name: string; emoji: string | null; category: string | null } | null
    return {
      n: ing?.name ?? '',
      m: ri.amount != null ? String(ri.amount) : '',
      e: ri.unit ?? '',
      k: ing?.category ?? '',
    }
  }).filter((i) => i.n)

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
