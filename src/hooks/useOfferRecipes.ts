import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useSynonyms } from './useSynonyms'
import { doesOfferMatchIngredientSimple } from '../lib/offerMatching'
import type { Recipe } from '../types/app.types'

interface IngredientRow {
  recipe_id: string
  ingredients: {
    name: string
    category: string | null
  } | null
}

interface RecipeWithMatch extends Recipe {
  matchedIngredient: string
}

// Load all recipe_ingredients with their ingredient data (cached)
function useAllRecipeIngredients() {
  return useQuery({
    queryKey: ['allRecipeIngredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, ingredients(name, category)')
        .limit(10000)
      if (error) throw error
      return (data ?? []) as IngredientRow[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Load all public recipes (cached)
function useAllRecipes() {
  return useQuery({
    queryKey: ['allRecipesForOffers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_public', true)
        .limit(2000)
      if (error) throw error
      return (data ?? []) as Recipe[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

export interface OfferRecipeMatch {
  recipe: RecipeWithMatch
  missingIngredients: string[]
  totalIngredients: number
}

export function useOfferRecipes(offerProductName: string | null, offerCategory: string | null) {
  const { data: allIngredients } = useAllRecipeIngredients()
  const { data: allRecipes } = useAllRecipes()
  const { data: synonymMap } = useSynonyms()

  return useMemo(() => {
    if (!offerProductName || !allIngredients || !allRecipes) return []

    const matchedRecipeIds = new Map<string, string>()

    for (const row of allIngredients) {
      if (!row.ingredients?.name) continue

      if (doesOfferMatchIngredientSimple(
        offerProductName,
        offerCategory ?? null,
        row.ingredients.name,
        row.ingredients.category,
        synonymMap ?? undefined,
      )) {
        if (!matchedRecipeIds.has(row.recipe_id)) {
          matchedRecipeIds.set(row.recipe_id, row.ingredients.name)
        }
      }
    }

    if (matchedRecipeIds.size === 0) return []

    const results: OfferRecipeMatch[] = []

    for (const [recipeId, matchedIng] of matchedRecipeIds) {
      const recipe = allRecipes.find(r => r.id === recipeId)
      if (!recipe) continue

      const recipeIngs = allIngredients
        .filter(ri => ri.recipe_id === recipeId && ri.ingredients?.name)
        .map(ri => ri.ingredients!.name)

      const missing = recipeIngs.filter(name => name !== matchedIng)

      results.push({
        recipe: { ...recipe, matchedIngredient: matchedIng },
        missingIngredients: missing,
        totalIngredients: recipeIngs.length,
      })
    }

    results.sort((a, b) => a.missingIngredients.length - b.missingIngredients.length)
    return results
  }, [offerProductName, offerCategory, allIngredients, allRecipes, synonymMap])
}

// Lightweight version: just counts per offer (for badges)
export function useOfferRecipeCounts(offerNames: string[]) {
  const { data: allIngredients } = useAllRecipeIngredients()
  const { data: synonymMap } = useSynonyms()

  const namesKey = offerNames.join('|')

  return useMemo(() => {
    if (!allIngredients || offerNames.length === 0) return new Map<string, number>()

    // Build ingredient name → { recipe_ids, category } index
    const ingIndex = new Map<string, { recipeIds: Set<string>; category: string | null }>()
    for (const row of allIngredients) {
      if (!row.ingredients?.name) continue
      const name = row.ingredients.name.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim()
      let entry = ingIndex.get(name)
      if (!entry) {
        entry = { recipeIds: new Set(), category: row.ingredients.category }
        ingIndex.set(name, entry)
      }
      entry.recipeIds.add(row.recipe_id)
    }

    const counts = new Map<string, number>()

    for (const offerName of offerNames) {
      const matchedRecipeIds = new Set<string>()

      for (const [ingName, { recipeIds, category }] of ingIndex) {
        if (doesOfferMatchIngredientSimple(
          offerName,
          null, // offer category not available in count mode
          ingName,
          category,
          synonymMap ?? undefined,
        )) {
          for (const id of recipeIds) matchedRecipeIds.add(id)
        }
      }

      if (matchedRecipeIds.size > 0) {
        counts.set(offerName, matchedRecipeIds.size)
      }
    }

    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey, allIngredients, synonymMap])
}
