/**
 * useMatchedOffers
 *
 * Liefert pro Zutat eines Rezepts das beste aktuell gueltige Angebot,
 * gefiltert nach der PLZ des Users. Datenquelle ist die Supabase-RPC
 * `match_offers_for_recipe` - das Matching passiert serverseitig
 * (Phase-2-Matching-Backend), das Frontend bekommt fertige Treffer.
 *
 * Einsatz: Rezept-Detail-Seite zeigt unter jeder Zutat ein Chip
 * "2,49 EUR bei Aldi", wenn ein Match existiert. Kein Match -> nichts
 * anzeigen (Fallback = bisheriges Verhalten).
 *
 * Rollout: Die UI kann via `isFeatureEnabled('matched_offers')`
 * entscheiden, ob sie die Chips rendert. Der Hook selbst ist davon
 * unabhaengig und immer nutzbar.
 *
 * HINWEIS zur `hasOffer`-Semantik: Die RPC liefert fuer jede Zutat eine
 * Zeile - auch wenn es kein echtes Angebot gibt (dann greift
 * `fallback_price`). Ein echtes Angebot wird hier daran erkannt, dass
 * `best_store` gesetzt ist. Sollte die RPC stattdessen einen anderen
 * Sentinel verwenden, ist nur diese eine Zeile anzupassen.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface MatchedOffer {
  /** Name der Zutat (wie in der recipes/ingredients-Quelle) */
  ingredientName: string
  ingredientEmoji: string | null
  /** Bester Angebotspreis in EUR, falls ein Angebot existiert */
  bestOfferPrice: number | null
  bestOriginalPrice: number | null
  bestDiscountPercent: number | null
  /** Markt mit dem besten Angebot */
  bestStore: string | null
  /** Geschaetzter Normalpreis, falls KEIN Angebot existiert */
  fallbackPrice: number | null
  /** true, wenn fuer diese Zutat ein echtes Angebot gefunden wurde */
  hasOffer: boolean
}

async function fetchMatchedOffers(
  recipeId: string,
  plz: string | null,
): Promise<MatchedOffer[]> {
  const { data, error } = await supabase.rpc('match_offers_for_recipe', {
    p_recipe_id: recipeId,
    ...(plz ? { p_plz: plz } : {}),
  })
  if (error) throw error

  return (data ?? []).map((row) => {
    const store = typeof row.best_store === 'string' ? row.best_store.trim() : ''
    const hasOffer = store.length > 0
    return {
      ingredientName: row.ingredient_name,
      ingredientEmoji: row.ingredient_emoji ?? null,
      bestOfferPrice: hasOffer ? row.best_offer_price ?? null : null,
      bestOriginalPrice: hasOffer ? row.best_original_price ?? null : null,
      bestDiscountPercent: hasOffer ? row.best_discount_percent ?? null : null,
      bestStore: hasOffer ? store : null,
      fallbackPrice: row.fallback_price ?? null,
      hasOffer,
    }
  })
}

/**
 * @param recipeId  Rezept, fuer das Angebote gesucht werden
 * @param plz       PLZ des Users (aus dem Profil) - schraenkt auf
 *                  regionale Angebote ein. Ohne PLZ liefert die RPC
 *                  ihren Default.
 * @param options   `enabled` (Default true) - wenn false, wird die RPC
 *                  nicht aufgerufen. Spart den Call, solange das
 *                  Feature-Flag aus ist.
 */
export function useMatchedOffers(
  recipeId: string | null | undefined,
  plz?: string | null,
  options?: { enabled?: boolean },
) {
  const query = useQuery({
    queryKey: ['matchedOffers', recipeId ?? null, plz ?? null],
    queryFn: () => fetchMatchedOffers(recipeId as string, plz ?? null),
    enabled: (options?.enabled ?? true) && !!recipeId,
    staleTime: 1000 * 60 * 5, // 5 min, analog useOfferRecipesV2
  })

  const matches = useMemo(() => query.data ?? [], [query.data])

  const byIngredient = useMemo(() => {
    const map = new Map<string, MatchedOffer>()
    for (const m of matches) {
      map.set(m.ingredientName.toLowerCase().trim(), m)
    }
    return map
  }, [matches])

  return {
    /** Alle Zutat-Treffer des Rezepts */
    matches,
    /** Lookup eines Treffers ueber den Zutatnamen (case-insensitive) */
    getMatchForIngredient: (name: string): MatchedOffer | undefined =>
      byIngredient.get(name.toLowerCase().trim()),
    /** Anzahl Zutaten mit echtem Angebot */
    offerCount: matches.filter((m) => m.hasOffer).length,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
