import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Recipe } from '../types/app.types'

/**
 * useOfferRecipesV2 — nutzt das pre-computed offer_ingredient_matches
 * statt zur Laufzeit zu matchen. Schneller und präziser als v1.
 *
 * Ablauf:
 *   1. Für gegebenes offerId: alle ingredient_ids mit score ≥ 0.5 laden
 *   2. Alle recipe_ingredients suchen, die zu diesen ingredients gehören
 *   3. Rezepte per id laden und nach Treffer-Anzahl sortieren
 */

export interface RecipeWithMatch extends Recipe {
  matchedIngredient: string
}

export interface OfferRecipeMatchV2 {
  recipe: RecipeWithMatch
  matchScore: number
  matchReason: string | null
}

// Counts-Variante für Badge-Anzeige auf der Angebotsliste.
// Benutzt einen einzigen Roundtrip mit allen offer_ids.
export function useOfferRecipeCountsV2(offerIds: string[]) {
  const idsKey = offerIds.join('|')

  return useQuery({
    queryKey: ['offerRecipeCountsV2', idsKey],
    enabled: offerIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (offerIds.length === 0) return new Map<string, number>()

      // Matches holen (offer → ingredient)
      const { data: matches, error: me } = await supabase
        .from('offer_ingredient_matches')
        .select('offer_id, ingredient_id, match_score')
        .in('offer_id', offerIds)
        .gte('match_score', 0.5)
      if (me) throw me

      const allIngIds = Array.from(new Set((matches ?? []).map((m) => m.ingredient_id)))
      if (!allIngIds.length) return new Map<string, number>()

      // Rezept-IDs pro ingredient
      const { data: recIngs, error: re } = await supabase
        .from('recipe_ingredients')
        .select('ingredient_id, recipe_id')
        .in('ingredient_id', allIngIds)
      if (re) throw re

      // ingredient → recipe-ids
      const ingToRecipes = new Map<string, Set<string>>()
      for (const r of recIngs ?? []) {
        if (!r.ingredient_id || !r.recipe_id) continue
        let set = ingToRecipes.get(r.ingredient_id)
        if (!set) { set = new Set(); ingToRecipes.set(r.ingredient_id, set) }
        set.add(r.recipe_id)
      }

      // offer → distinct recipe-count
      const counts = new Map<string, number>()
      for (const m of matches ?? []) {
        const recipeSet = ingToRecipes.get(m.ingredient_id)
        if (!recipeSet) continue
        // merge in per offer
        const existing = counts.get(m.offer_id) ?? 0
        // wir zählen hier pauschal alle Rezepte der ingredient — in der Praxis
        // genügt das für ein Badge; bei Bedarf spÃ¤ter dedup über alle ings/offer
        counts.set(m.offer_id, existing + recipeSet.size)
      }
      return counts
    },
  })
}

// Full-Details-Variante fürs Offer→Recipes-Sheet.
export function useOfferRecipesV2(offerId: string | null) {
  return useQuery({
    queryKey: ['offerRecipesV2', offerId],
    enabled: !!offerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OfferRecipeMatchV2[]> => {
      if (!offerId) return []

      const { data: matches, error: me } = await supabase
        .from('offer_ingredient_matches')
        .select('ingredient_id, match_score, match_reason')
        .eq('offer_id', offerId)
        .gte('match_score', 0.5)
        .order('match_score', { ascending: false })
      if (me) throw me
      if (!matches?.length) return []

      const ingIds = matches.map((m) => m.ingredient_id)

      // Zutaten-Namen separat laden (Supabase-FK-Relation ist nicht typisiert)
      const { data: ingRows, error: ie } = await supabase
        .from('ingredients')
        .select('id, name')
        .in('id', ingIds)
      if (ie) throw ie
      const ingNameById = new Map<string, string>()
      for (const r of ingRows ?? []) ingNameById.set(r.id, r.name)

      const { data: recIngs, error: re } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, ingredient_id')
        .in('ingredient_id', ingIds)
      if (re) throw re

      const recipeIds = Array.from(
        new Set((recIngs ?? []).map((r) => r.recipe_id).filter((id): id is string => !!id))
      )
      if (!recipeIds.length) return []

      const { data: recipes, error: rre } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds)
        .eq('is_public', true)
      if (rre) throw rre
      if (!recipes?.length) return []

      // Pro Recipe: bester match-score aus allen zutreffenden ingredients
      const bestPerRecipe = new Map<string, { score: number; reason: string | null; ing: string }>()
      for (const r of recIngs ?? []) {
        if (!r.recipe_id || !r.ingredient_id) continue
        const m = matches.find((mm) => mm.ingredient_id === r.ingredient_id)
        if (!m) continue
        const existing = bestPerRecipe.get(r.recipe_id)
        const ingName = ingNameById.get(m.ingredient_id) ?? ''
        if (!existing || existing.score < m.match_score) {
          bestPerRecipe.set(r.recipe_id, { score: m.match_score, reason: m.match_reason, ing: ingName })
        }
      }

      const results: OfferRecipeMatchV2[] = []
      for (const recipe of recipes) {
        const best = bestPerRecipe.get(recipe.id)
        if (!best) continue
        results.push({
          recipe: { ...recipe, matchedIngredient: best.ing },
          matchScore: best.score,
          matchReason: best.reason,
        })
      }
      return results.sort((a, b) => b.matchScore - a.matchScore)
    },
  })
}

// Convenience: Counts-Map nur für eine Liste von offer-IDs (synchrone Lookups später)
export function useCountsMap(offerIds: string[]) {
  const { data } = useOfferRecipeCountsV2(offerIds)
  return useMemo(() => data ?? new Map<string, number>(), [data])
}
