import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { CATEGORY_ORDER, VIRTUAL_CATEGORIES } from '../lib/mealConfig'
import { useRecipeCosts } from './useRecipeCosts'
import type { Recipe } from '../types/app.types'

export interface ScoredRecipe extends Recipe {
  score: number
  dietScore: number
  offerScore: number
  perfectMatch: boolean
  estimatedCost?: number   // Dynamisch berechnete Kosten basierend auf Angeboten
  matchPercent?: number    // % der Zutaten im Angebot
  dynamicSaved?: number    // Dynamisch berechnete Ersparnis basierend auf aktuellen Angeboten
}

export interface MealGroup {
  meal: string
  recipes: ScoredRecipe[]
}

function calcDietScore(recipe: Recipe, userDiets: string[]): number {
  if (userDiets.length === 0) return 60

  const recipeDiets = recipe.diets ?? []
  let totalScore = 0
  let count = 0

  for (const diet of userDiets) {
    if (diet === 'vegan') {
      if (!recipeDiets.includes('vegan')) return -999
      totalScore += 100
      count++
      continue
    }
    if (diet === 'vegetarisch') {
      if (!recipeDiets.includes('vegetarisch') && !recipeDiets.includes('vegan')) return -999
      totalScore += 100
      count++
      continue
    }
    if (diet === 'halal') {
      if (recipeDiets.includes('halal')) { totalScore += 100; count++; continue }
      // Reject recipes containing pork or alcohol indicators
      const name = (recipe.name ?? '').toLowerCase()
      if (/schwein|speck|schinken|bratwurst|leberkäse|mettwurst|salami|alkohol|wein|bier|rum/.test(name)) return -999
      // Accept vegetarian/vegan recipes as halal-safe
      if (recipeDiets.includes('vegan') || recipeDiets.includes('vegetarisch')) { totalScore += 80; count++; continue }
      totalScore += 60; count++; continue
    }
    if (diet === 'koscher') {
      if (recipeDiets.includes('koscher')) { totalScore += 100; count++; continue }
      const name = (recipe.name ?? '').toLowerCase()
      if (/schwein|speck|schinken|bratwurst|leberkäse|mettwurst|salami/.test(name)) return -999
      if (recipeDiets.includes('vegan') || recipeDiets.includes('vegetarisch')) { totalScore += 80; count++; continue }
      totalScore += 60; count++; continue
    }
    if (diet === 'high-protein') {
      const protein = Number(recipe.protein) || 0
      if (recipeDiets.includes('high-protein')) totalScore += 100
      else if (protein >= 30) totalScore += 100
      else if (protein >= 20) totalScore += 60
      else totalScore += 20
      count++
      continue
    }
    if (diet === 'low-carb') {
      const carbs = Number(recipe.carbs) || 0
      if (carbs <= 20) totalScore += 100
      else if (carbs <= 30) totalScore += 60
      else if (carbs <= 50) totalScore += 20
      else totalScore += 0
      count++
      continue
    }
    if (diet === 'omni') {
      totalScore += 60
      count++
      continue
    }
    totalScore += 40
    count++
  }

  return count > 0 ? Math.round(totalScore / count) : 60
}

function calcOfferScore(savedAmount: number): number {
  if (savedAmount <= 0) return 0
  return Math.min(100, Math.round(savedAmount / 0.5) * 20)
}

// Check if a recipe matches a virtual category
function matchesVirtualCategory(recipe: ScoredRecipe, category: string): boolean {
  switch (category) {
    case 'quick':
      return (recipe.time_minutes ?? 999) <= 15
    case 'budget':
      // Dynamisch: Rezepte mit mind. 20% gematchten Zutaten UND
      // geschätzten Gesamtkosten ≤ 8€
      if (recipe.estimatedCost != null && recipe.matchPercent != null && recipe.matchPercent >= 20) {
        return recipe.estimatedCost <= 8
      }
      // Fallback: geschätzte Kosten ohne Mindest-Matchrate
      if (recipe.estimatedCost != null) {
        return recipe.estimatedCost <= 6
      }
      return false
    case 'meal_prep':
      return (recipe.diets ?? []).includes('meal-prep')
    default:
      return false
  }
}

export function useRecipes(mealFilter?: string | null) {
  const profile = useAppStore((s) => s.profile)
  const session = useAppStore((s) => s.session)
  const userDiets = profile?.diets ?? []
  const { costMap } = useRecipeCosts()

  const query = useQuery({
    queryKey: ['recipes', userDiets, session?.user?.id],
    queryFn: async () => {
      // Load public recipes
      const { data: publicRecipes, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_public', true)
        .order('name')
      if (error) throw error

      // Load user's custom recipes
      let customRecipes: typeof publicRecipes = []
      if (session?.user?.id) {
        const { data: custom } = await supabase
          .from('custom_recipes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name')

        if (custom) {
          // Map custom_recipes to Recipe format
          customRecipes = custom.map((c) => ({
            id: c.id,
            name: c.name,
            emoji: c.emoji,
            meal: c.meal,
            calories: c.calories,
            protein: c.protein,
            carbs: c.carbs,
            fat: c.fat,
            time_minutes: c.time_minutes,
            difficulty: c.diff,
            image_url: c.image_url,
            servings: c.servings,
            steps: c.steps,
            created_at: c.created_at,
            // Fields that don't exist on custom_recipes
            diets: null,
            cost: null,
            saved: null,
            tag: null,
                        status: 'active' as const,
                        source: 'user' as const,
                        quality_score: null,
            tag_color: null,
            is_public: false,
            created_by: c.user_id,
            rid: null,
          }))
        }
      }

      return [...(publicRecipes ?? []), ...customRecipes]
    },
  })

  const scored = useMemo((): ScoredRecipe[] => {
    if (!query.data) return []

    return query.data
      .map((recipe) => {
        const dietScore = calcDietScore(recipe, userDiets)
        const costInfo = costMap.get(recipe.id)
        // Dynamische Ersparnis aus aktuellen Angeboten (statt statischem DB-Wert)
        const dynamicSaved = costInfo?.totalSaved ?? 0
        const offerScore = calcOfferScore(dynamicSaved)
        const score = dietScore + offerScore
        const perfectMatch = dietScore >= 80
        return {
          ...recipe,
          score,
          dietScore,
          offerScore,
          perfectMatch,
          estimatedCost: costInfo?.estimatedTotalCost,
          matchPercent: costInfo?.matchPercent,
          dynamicSaved,
        }
      })
      .filter((r) => r.dietScore > -999)
      .sort((a, b) => b.score - a.score)
  }, [query.data, userDiets, costMap])

  const filtered = useMemo(() => {
    if (!mealFilter) return scored
    // Virtual category filter
    if (['quick', 'budget', 'meal_prep'].includes(mealFilter)) {
      return scored.filter((r) => matchesVirtualCategory(r, mealFilter))
    }
    return scored.filter((r) => r.meal === mealFilter)
  }, [scored, mealFilter])

  const mealGroups = useMemo((): MealGroup[] => {
    // Build lookup of DB-based meal recipes
    const mealMap = new Map<string, ScoredRecipe[]>()
    for (const recipe of scored) {
      const meal = recipe.meal ?? 'other'
      const list = mealMap.get(meal) ?? []
      list.push(recipe)
      mealMap.set(meal, list)
    }

    // Build virtual category recipes
    const virtualMap = new Map<string, ScoredRecipe[]>()
    for (const vc of VIRTUAL_CATEGORIES) {
      const recipes = scored.filter((r) => matchesVirtualCategory(r, vc))
      // Budget: Sortiere nach geschätzten Kosten (günstigste zuerst)
      if (vc === 'budget') {
        recipes.sort((a, b) => (a.estimatedCost ?? 999) - (b.estimatedCost ?? 999))
      }
      virtualMap.set(vc, recipes)
    }

    // Emit ALL categories from CATEGORY_ORDER, even if empty
    return CATEGORY_ORDER.map((cat) => {
      const isVirtual = (VIRTUAL_CATEGORIES as readonly string[]).includes(cat)
      const recipes = isVirtual
        ? (virtualMap.get(cat) ?? [])
        : (mealMap.get(cat) ?? [])
      return { meal: cat, recipes }
    })
  }, [scored])

  return { ...query, recipes: filtered, allRecipes: scored, mealGroups }
}
