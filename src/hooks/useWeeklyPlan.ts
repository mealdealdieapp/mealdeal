import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { Json } from '../types/database.types'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export type DayKey = typeof DAYS[number]
export type MealKey = typeof MEALS[number]

export interface PlanRecipe {
  id: string
  name: string
  emoji: string | null
  cal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  time: string | null
  diff: string | null
  image_url: string | null
  servings: number | null
  saved: number | null
  cost: number | null
  ings: { n: string; m: string; e: string; k: string }[]
}

export type WeekPlan = Record<string, Record<string, PlanRecipe[]>>

export interface DayStats {
  cal: number
  protein: number
  carbs: number
  fat: number
  cost: number
  saved: number
  recipeCount: number
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  return monday.toISOString().split('T')[0]
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export { DAYS, MEALS }

export function useWeeklyPlan() {
  const session = useAppStore((s) => s.session)
  const profile = useAppStore((s) => s.profile)
  const queryClient = useQueryClient()
  const weekStart = getWeekStart()
  const weekNumber = getWeekNumber(new Date())
  const calTarget = profile?.cal_target ?? 2000

  const query = useQuery({
    queryKey: ['weeklyPlan', session?.user?.id, weekStart],
    queryFn: async () => {
      if (!session?.user?.id) return null
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('week_start', weekStart)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!session?.user?.id,
  })

  const plan: WeekPlan = (query.data?.plan as unknown as WeekPlan) ?? {}

  // Get all recipes for a meal slot (supports multiple)
  const getSlotRecipes = (day: DayKey, meal: MealKey): PlanRecipe[] => {
    return plan[day]?.[meal] ?? []
  }

  // Backwards-compatible single getter
  const getSlot = (day: DayKey, meal: MealKey): PlanRecipe | null => {
    return getSlotRecipes(day, meal)[0] ?? null
  }

  // Per-day stats across all meals and all recipes per meal
  const getDayStats = (day: DayKey): DayStats => {
    let cal = 0, protein = 0, carbs = 0, fat = 0, cost = 0, saved = 0, recipeCount = 0
    for (const meal of MEALS) {
      for (const recipe of getSlotRecipes(day, meal)) {
        cal += recipe.cal ?? 0
        protein += Number(recipe.protein) || 0
        carbs += Number(recipe.carbs) || 0
        fat += Number(recipe.fat) || 0
        cost += Number(recipe.cost) || 0
        saved += Number(recipe.saved) || 0
        recipeCount++
      }
    }
    return { cal: Math.round(cal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat), cost, saved, recipeCount }
  }

  const weekStats = useMemo(() => {
    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0
    let totalCost = 0, totalSaved = 0, filledSlots = 0

    for (const day of DAYS) {
      const ds = getDayStats(day)
      totalCal += ds.cal
      totalProtein += ds.protein
      totalCarbs += ds.carbs
      totalFat += ds.fat
      totalCost += ds.cost
      totalSaved += ds.saved
      filledSlots += ds.recipeCount
    }
    return {
      totalCal, totalProtein, totalCarbs, totalFat,
      totalCost, totalSaved, filledSlots,
      totalSlots: DAYS.length * MEALS.length,
      avgDailyCal: filledSlots > 0 ? Math.round(totalCal / 7) : 0,
      avgDailyProtein: filledSlots > 0 ? Math.round(totalProtein / 7) : 0,
      avgDailyCarbs: filledSlots > 0 ? Math.round(totalCarbs / 7) : 0,
      avgDailyFat: filledSlots > 0 ? Math.round(totalFat / 7) : 0,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  // Add a recipe to a slot (appends, doesn't replace)
  const addToSlot = useMutation({
    mutationFn: async ({ day, meal, recipe }: { day: DayKey; meal: MealKey; recipe: PlanRecipe }) => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const currentPlan = JSON.parse(JSON.stringify(plan)) as WeekPlan
      if (!currentPlan[day]) currentPlan[day] = {}
      if (!currentPlan[day][meal]) currentPlan[day][meal] = []
      currentPlan[day][meal].push(recipe)

      const { error } = await supabase.from('weekly_plans').upsert({
        user_id: session.user.id,
        week_start: weekStart,
        plan: currentPlan as unknown as Json,
      }, { onConflict: 'user_id,week_start' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] }),
  })

  // Remove a specific recipe from a slot by index
  const removeFromSlot = useMutation({
    mutationFn: async ({ day, meal, index }: { day: DayKey; meal: MealKey; index: number }) => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const currentPlan = JSON.parse(JSON.stringify(plan)) as WeekPlan
      const recipes = currentPlan[day]?.[meal]
      if (!recipes) return

      recipes.splice(index, 1)
      if (recipes.length === 0) {
        delete currentPlan[day][meal]
        if (Object.keys(currentPlan[day]).length === 0) delete currentPlan[day]
      }

      const { error } = await supabase.from('weekly_plans').upsert({
        user_id: session.user.id,
        week_start: weekStart,
        plan: currentPlan as unknown as Json,
      }, { onConflict: 'user_id,week_start' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] }),
  })

  // Legacy setSlot (replaces entire meal)
  const setSlot = useMutation({
    mutationFn: async ({ day, meal, recipe }: { day: DayKey; meal: MealKey; recipe: PlanRecipe | null }) => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const currentPlan = JSON.parse(JSON.stringify(plan)) as WeekPlan
      if (!currentPlan[day]) currentPlan[day] = {}

      if (recipe) {
        currentPlan[day][meal] = [recipe]
      } else {
        delete currentPlan[day][meal]
        if (Object.keys(currentPlan[day]).length === 0) delete currentPlan[day]
      }

      const { error } = await supabase.from('weekly_plans').upsert({
        user_id: session.user.id,
        week_start: weekStart,
        plan: currentPlan as unknown as Json,
      }, { onConflict: 'user_id,week_start' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] }),
  })

  // Collect all ingredients WITH offer data for shopping list
  const allIngredients = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; unit: string; category: string }>()
    for (const day of DAYS) {
      for (const meal of MEALS) {
        for (const recipe of getSlotRecipes(day, meal)) {
          if (!recipe.ings || recipe.ings.length === 0) continue
          for (const ing of recipe.ings) {
            const key = ing.n.toLowerCase()
            const existing = map.get(key)
            const amount = parseFloat(ing.m) || 0
            if (existing) {
              existing.amount += amount
            } else {
              map.set(key, { name: ing.n, amount, unit: ing.e, category: ing.k })
            }
          }
        }
      }
    }
    return Array.from(map.values())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  // Get all recipe IDs in the plan (for loading offers)
  const allRecipeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const day of DAYS) {
      for (const meal of MEALS) {
        for (const recipe of getSlotRecipes(day, meal)) {
          ids.add(recipe.id)
        }
      }
    }
    return Array.from(ids)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const today = DAYS[todayIdx]

  return {
    plan,
    weekStart,
    weekNumber,
    calTarget,
    getSlot,
    getSlotRecipes,
    getDayStats,
    weekStats,
    today,
    addToSlot,
    removeFromSlot,
    setSlot,
    allIngredients,
    allRecipeIds,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
