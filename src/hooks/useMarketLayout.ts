/**
 * useMarketLayout
 *
 * Liefert die Sektions-Reihenfolge eines Marktes. Versucht zuerst die
 * `market_layouts`-Tabelle in Supabase (für Overrides und A/B-Tests), fällt
 * danach auf die TS-Konstante in `lib/marketLayouts.ts` zurück.
 *
 * Cache: einmal pro Session via TanStack Query, staleTime 1 Stunde — die
 * Layouts ändern sich kaum.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getMarketLayout, getSectionPosition } from '../lib/marketLayouts'
import { logger } from '../lib/logger'

interface MarketLayoutRow {
  market: string
  section_order: string[]
}

async function fetchAllLayouts(): Promise<Record<string, string[]>> {
  try {
    const { data, error } = await supabase
      .from('market_layouts' as never)
      .select('market, section_order')

    if (error) {
      // Tabelle existiert evtl. noch nicht — gilt nicht als echter Fehler.
      logger.log('[market-layouts] Tabelle nicht erreichbar, nutze TS-Fallback:', error.message)
      return {}
    }

    const rows = (data ?? []) as unknown as MarketLayoutRow[]
    const map: Record<string, string[]> = {}
    for (const row of rows) {
      if (row.market && Array.isArray(row.section_order)) {
        map[row.market] = row.section_order
      }
    }
    return map
  } catch (e) {
    logger.warn('[market-layouts] Fetch fehlgeschlagen, nutze TS-Fallback:', e)
    return {}
  }
}

export function useMarketLayout(market: string | null | undefined) {
  const query = useQuery({
    queryKey: ['market-layouts'],
    queryFn: fetchAllLayouts,
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 4,
  })

  const dbOverride = market ? query.data?.[market] : undefined
  const sectionOrder = dbOverride ?? getMarketLayout(market)

  return {
    sectionOrder,
    isLoading: query.isLoading,
    getSectionPosition: (category: string | null | undefined): number => {
      if (!category) return 999
      const idx = sectionOrder.indexOf(category)
      return idx >= 0 ? idx : 999
    },
  }
}

/**
 * Variante ohne Hook — sofortig synchron, nur TS-Fallback. Nützlich in
 * Memo-Closures, in denen kein Hook gerufen werden darf.
 */
export function getSectionPositionSync(
  market: string | null | undefined,
  category: string | null | undefined,
): number {
  return getSectionPosition(market, category)
}
