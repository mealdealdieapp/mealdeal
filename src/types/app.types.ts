import type { Tables } from './database.types'

export type UserProfile = Tables<'user_profiles'>
export type Recipe = Tables<'recipes'>
export type RecipeIngredient = Tables<'recipe_ingredients'>
export type Ingredient = Tables<'ingredients'>
export type Offer = Tables<'offers'>
export type WeeklyPlan = Tables<'weekly_plans'>
export type ShoppingItem = Tables<'shopping_items'>
export type SavedRecipe = Tables<'saved_recipes'>
export type OfferIngredientMatch = Tables<'offer_ingredient_matches'>
export type ScrapeRun = Tables<'scrape_runs'>

export type TabName = 'recipes' | 'offers' | 'weekly' | 'shopping' | 'profile'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface PlanRecipeData {
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

export type WeeklyPlanDay = Partial<Record<MealType, PlanRecipeData[]>>

export interface WeeklyPlanData {
  [day: string]: WeeklyPlanDay
}
