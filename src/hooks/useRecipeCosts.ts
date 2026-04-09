import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { matchIngredientToOffer } from '../lib/offerMatching'
import { useOffers } from './useOffers'
import { useSynonyms } from './useSynonyms'

interface IngredientRow {
  recipe_id: string
  ingredients: {
    name: string
    category: string | null
  } | null
}

interface OfferCandidate {
  id: string
  product_name: string
  offer_price: number
  original_price: number | null
  discount_percent: number | null
  store: string
  category: string | null
}

export interface RecipeCostInfo {
  totalOfferCost: number        // Summe aller gematchten Angebotspreise
  totalOriginalCost: number     // Summe aller Originalpreise (vor Rabatt)
  matchedCount: number          // Anzahl gematchter Zutaten
  totalIngredients: number      // Gesamtzahl Zutaten
  matchPercent: number          // % der Zutaten im Angebot
  totalSaved: number            // Gesamtersparnis
  estimatedTotalCost: number    // Geschätzte Gesamtkosten (gematchte + geschätzt für Rest)
}

// Durchschnittspreis pro Zutat wenn kein Angebot gematcht
const AVG_INGREDIENT_COST = 1.50

/**
 * Berechnet für jedes Rezept die geschätzten Kosten basierend auf
 * den aktuellen Angeboten. Wird für die "Günstig diese Woche"-Kategorie genutzt.
 */
export function useRecipeCosts() {
  const { offers } = useOffers()
  const { data: synonymMap } = useSynonyms()

  const allIngredients = useQuery({
    queryKey: ['allRecipeIngredientsForCost'],
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

  const costMap = useMemo(() => {
    const map = new Map<string, RecipeCostInfo>()
    if (!allIngredients.data || offers.length === 0) return map

    // Gruppiere Zutaten nach Rezept-ID
    const recipeIngMap = new Map<string, IngredientRow[]>()
    for (const row of allIngredients.data) {
      if (!row.ingredients?.name) continue
      const list = recipeIngMap.get(row.recipe_id) ?? []
      list.push(row)
      recipeIngMap.set(row.recipe_id, list)
    }

    // Für jedes Rezept: Matche alle Zutaten → berechne Kosten
    for (const [recipeId, ings] of recipeIngMap) {
      let totalOfferCost = 0
      let totalOriginalCost = 0
      let matchedCount = 0

      for (const row of ings) {
        if (!row.ingredients) continue
        const match = matchIngredientToOffer(
          { name: row.ingredients.name, category: row.ingredients.category },
          offers as OfferCandidate[],
          synonymMap ?? undefined,
        )
        if (match) {
          totalOfferCost += match.offerPrice
          totalOriginalCost += match.originalPrice ?? match.offerPrice
          matchedCount++
        }
      }

      const totalIngredients = ings.length
      const unmatchedCount = totalIngredients - matchedCount
      const estimatedUnmatchedCost = unmatchedCount * AVG_INGREDIENT_COST
      const estimatedTotalCost = totalOfferCost + estimatedUnmatchedCost

      map.set(recipeId, {
        totalOfferCost,
        totalOriginalCost,
        matchedCount,
        totalIngredients,
        matchPercent: totalIngredients > 0 ? Math.round((matchedCount / totalIngredients) * 100) : 0,
        totalSaved: totalOriginalCost - totalOfferCost,
        estimatedTotalCost,
      })
    }

    return map
  }, [allIngredients.data, offers, synonymMap])

  return { costMap, isLoading: allIngredients.isLoading }
}
