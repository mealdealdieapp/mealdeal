import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { matchIngredientToOffer } from '../lib/offerMatching'
import { useOffers } from './useOffers'
import { useSynonyms } from './useSynonyms'
import { useMatchedOffers, type MatchedOffer } from './useMatchedOffers'
import { useAppStore } from '../store/useAppStore'
import { isFeatureEnabled } from '../lib/featureFlags'

export interface RecipeIngredientWithOffer {
  id: string
  name: string
  emoji: string | null
  category: string | null
  amount: number | null
  unit: string | null
  offerId: string | null
  offerPrice: number | null
  originalPrice: number | null
  store: string | null
  discountPercent: number | null
  productName: string | null
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

// Re-export matchIngredientToOffer for WeeklyPage compatibility
export { matchIngredientToOffer as matchIngredientToOffers } from '../lib/offerMatching'

export function useRecipeDetail(recipeId: string | null) {
  const ingredients = useQuery({
    queryKey: ['recipeIngredients', recipeId],
    queryFn: async () => {
      if (!recipeId) return []

      // Try recipe_ingredients first (public recipes)
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*, ingredients(*)')
        .eq('recipe_id', recipeId)

      if (error) throw error

      // If no recipe_ingredients found, check custom_recipes for ings JSON
      if (!data || data.length === 0) {
        const { data: custom } = await supabase
          .from('custom_recipes')
          .select('ings')
          .eq('id', recipeId)
          .single()

        if (custom?.ings && Array.isArray(custom.ings)) {
          return (custom.ings as { n: string; m: string; e: string; k: string }[]).map((ing, i) => ({
            id: `custom-${i}`,
            recipe_id: recipeId,
            ingredient_id: null,
            amount: ing.m ? Number(ing.m) || null : null,
            unit: ing.e || null,
            created_at: null,
            ingredients: {
              name: ing.n,
              emoji: null,
              category: ing.k || null,
            },
          }))
        }
      }

      return data ?? []
    },
    enabled: !!recipeId,
  })

  // --- Phase-2-Matching: serverseitige RPC, hinter Feature-Flag ---
  // Flag aus (Default) -> klassisches Browser-Matching wie bisher.
  // Flag an -> match_offers_for_recipe-RPC. Bei RPC-Fehler faellt der
  // Hook automatisch auf das Browser-Matching zurueck.
  const profile = useAppStore((s) => s.profile)
  const plz = profile?.plz ?? null
  const matchedOffersFlag = isFeatureEnabled('matched_offers')
  const matched = useMatchedOffers(recipeId, plz, { enabled: matchedOffersFlag })
  const useRpcMatching = matchedOffersFlag && !matched.isError

  // --- Klassischer Pfad: alle Angebote laden + im Browser matchen ---
  const { offers } = useOffers()
  const { data: synonymMap } = useSynonyms()

  // Lookup der RPC-Treffer nach Zutatname (lowercase, getrimmt).
  const rpcLookup = useMemo(() => {
    const map = new Map<string, MatchedOffer>()
    for (const m of matched.matches) {
      map.set(m.ingredientName.toLowerCase().trim(), m)
    }
    return map
  }, [matched.matches])

  const ingredientsWithOffers: RecipeIngredientWithOffer[] = useMemo(() => {
    if (!ingredients.data) return []

    return ingredients.data.map((ri) => {
      const ing = ri.ingredients as {
        name: string
        emoji: string | null
        category: string | null
      } | null

      const ingName = ing?.name ?? 'Unbekannt'
      const ingCategory = ing?.category ?? null

      const base = {
        id: ri.id,
        name: ingName,
        emoji: ing?.emoji ?? null,
        category: ingCategory,
        amount: ri.amount != null ? Number(ri.amount) : null,
        unit: ri.unit,
      }

      // --- Serverseitiges Matching (Phase 2, Feature-Flag an) ---
      if (useRpcMatching) {
        const m = rpcLookup.get(ingName.toLowerCase().trim())
        if (m?.hasOffer) {
          return {
            ...base,
            // RPC liefert keine Offer-ID; offer_id ist nullable und wird
            // fuer Anzeige/Gruppierung der Einkaufsliste nicht gebraucht.
            offerId: null,
            offerPrice: m.bestOfferPrice,
            originalPrice: m.bestOriginalPrice,
            store: m.bestStore,
            discountPercent: m.bestDiscountPercent,
            productName: null,
          }
        }
        return {
          ...base,
          offerId: null,
          offerPrice: null,
          originalPrice: null,
          store: null,
          discountPercent: null,
          productName: null,
        }
      }

      // --- Klassisches Browser-Matching (Default) ---
      const match = offers.length > 0
        ? matchIngredientToOffer(
            { name: ingName, category: ingCategory },
            offers as OfferCandidate[],
            synonymMap ?? undefined,
          )
        : null

      return {
        ...base,
        offerId: match?.offerId ?? null,
        offerPrice: match ? Number(match.offerPrice) : null,
        originalPrice: match?.originalPrice != null ? Number(match.originalPrice) : null,
        store: match?.store ?? null,
        discountPercent: match?.discountPercent != null ? Number(match.discountPercent) : null,
        productName: match?.productName ?? null,
      }
    })
  }, [ingredients.data, offers, synonymMap, useRpcMatching, rpcLookup])

  const totalSaved = ingredientsWithOffers.reduce((sum, ing) => {
    if (ing.originalPrice != null && ing.offerPrice != null) {
      return sum + (ing.originalPrice - ing.offerPrice)
    }
    return sum
  }, 0)

  const matchCount = ingredientsWithOffers.filter((i) => i.store !== null).length

  return {
    ingredients: ingredientsWithOffers,
    isLoading: ingredients.isLoading || (useRpcMatching && matched.isLoading),
    totalSaved,
    matchCount,
  }
}
