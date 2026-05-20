import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { getSectionPosition } from '../lib/marketLayouts'
import type { ShoppingItem } from '../types/app.types'

export interface ShoppingItemWithOffer extends ShoppingItem {
  matchedOffer: {
    store: string
    offerPrice: number
    originalPrice: number | null
    discountPercent: number | null
    productName: string
  } | null
}

export interface MarketGroup {
  store: string
  items: ShoppingItemWithOffer[]
  totalSavings: number
  offerCount: number
}

export interface MarketStrategy {
  label: string
  stores: string[]
  savings: number
  storeCount: number
}

export function useShopping() {
  const session = useAppStore((s) => s.session)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['shopping', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })

  // Use stored offer data directly - no re-matching
  const itemsWithOffers: ShoppingItemWithOffer[] = useMemo(() => {
    if (!query.data) return []
    return query.data.map((item) => ({
      ...item,
      matchedOffer: item.offer_store ? {
        store: item.offer_store,
        offerPrice: Number(item.offer_price),
        originalPrice: item.offer_original_price != null ? Number(item.offer_original_price) : null,
        discountPercent: item.offer_discount_percent != null ? Number(item.offer_discount_percent) : null,
        productName: item.offer_product_name ?? item.name,
      } : null,
    }))
  }, [query.data])

  // Group by market
  const marketGroups: MarketGroup[] = useMemo(() => {
    const map = new Map<string, ShoppingItemWithOffer[]>()

    for (const item of itemsWithOffers) {
      const store = item.matchedOffer?.store ?? 'Sonstige'
      const list = map.get(store) ?? []
      list.push(item)
      map.set(store, list)
    }

    // Keep "Sonstige" items as their own group (no silent merging)

    const groups: MarketGroup[] = []
    for (const [store, items] of map) {
      const totalSavings = items.reduce((sum, i) => {
        if (i.matchedOffer?.originalPrice != null) {
          return sum + (i.matchedOffer.originalPrice - i.matchedOffer.offerPrice)
        }
        return sum
      }, 0)
      const offerCount = items.filter((i) => i.matchedOffer).length

      // Sortiere Artikel in Lauf-Reihenfolge des jeweiligen Marktes,
      // damit man die Liste beim Einkaufen einmal von vorne nach hinten
      // abarbeiten kann. Array.sort ist stabil, Artikel ohne/mit gleicher
      // Kategorie behalten ihre urspruengliche (chronologische) Reihenfolge.
      const sortedItems = [...items].sort(
        (a, b) =>
          getSectionPosition(store, a.category) - getSectionPosition(store, b.category),
      )

      groups.push({ store, items: sortedItems, totalSavings, offerCount })
    }
    groups.sort((a, b) => b.offerCount - a.offerCount)

    return groups
  }, [itemsWithOffers])

  // Market strategy recommendation
  const strategy: MarketStrategy | null = useMemo(() => {
    if (itemsWithOffers.length === 0) return null

    const storeStats = new Map<string, { count: number; savings: number }>()
    for (const item of itemsWithOffers) {
      const store = item.matchedOffer?.store
      if (!store) continue
      const prev = storeStats.get(store) ?? { count: 0, savings: 0 }
      prev.count++
      if (item.matchedOffer?.originalPrice != null) {
        prev.savings += item.matchedOffer.originalPrice - item.matchedOffer.offerPrice
      }
      storeStats.set(store, prev)
    }

    if (storeStats.size === 0) return null

    let totalSavings = 0
    const allStores: string[] = []
    for (const [store, data] of storeStats) {
      totalSavings += data.savings
      allStores.push(store)
    }

    let bestSingle: { store: string; count: number } | null = null
    for (const [store, data] of storeStats) {
      if (!bestSingle || data.count > bestSingle.count) {
        bestSingle = { store, count: data.count }
      }
    }

    if (allStores.length === 1 && bestSingle) {
      return { label: `Alles bei ${bestSingle.store}`, stores: allStores, savings: totalSavings, storeCount: 1 }
    }
    if (allStores.length === 2) {
      return { label: allStores.join(' + '), stores: allStores, savings: totalSavings, storeCount: 2 }
    }
    if (bestSingle) {
      return { label: `${bestSingle.store} + ${allStores.length - 1} weitere`, stores: allStores, savings: totalSavings, storeCount: allStores.length }
    }
    return null
  }, [itemsWithOffers])

  const checkedCount = itemsWithOffers.filter((i) => i.checked).length
  const totalCount = itemsWithOffers.length

  const toggleItem = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase.from('shopping_items').update({ checked }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, checked }) => {
      await queryClient.cancelQueries({ queryKey: ['shopping'] })
      const prev = queryClient.getQueryData(['shopping', session?.user?.id])
      // Optimistic: flip checked flag in-place, preserve order
      queryClient.setQueryData(['shopping', session?.user?.id], (old: ShoppingItem[] | undefined) => {
        if (!old) return old
        return old.map((item) => item.id === id ? { ...item, checked } : item)
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['shopping', session?.user?.id], ctx.prev)
    },
    // Never refetch after toggle - optimistic update is the source of truth
    // This prevents items from jumping positions after server confirms
    onSettled: () => {},
  })

  const checkAll = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const { error } = await supabase.from('shopping_items').update({ checked: true }).eq('user_id', session.user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  })

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  })

  const addItem = useMutation({
    mutationFn: async ({ name, store }: { name: string; store?: string | null }) => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const { error } = await supabase.from('shopping_items').insert({
        user_id: session.user.id,
        name,
        offer_store: store ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  })

  const finishShopping = useMutation({
    mutationFn: async ({ onlyChecked }: { onlyChecked: boolean }) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      // "Ja, alles gefunden" - treat all as bought
      // "Nicht alles gefunden" - only checked items are bought
      const bought = onlyChecked
        ? itemsWithOffers.filter((i) => i.checked)
        : itemsWithOffers // all items
      const notFound = onlyChecked
        ? itemsWithOffers.filter((i) => !i.checked)
        : []

      let totalSaved = 0
      let totalCost = 0
      let offerCount = 0

      for (const item of bought) {
        if (item.matchedOffer) {
          totalCost += item.matchedOffer.offerPrice
          if (item.matchedOffer.originalPrice != null) {
            totalSaved += item.matchedOffer.originalPrice - item.matchedOffer.offerPrice
          }
          offerCount++
        }
      }

      const { error: logError } = await supabase.from('purchase_log').insert({
        user_id: session.user.id,
        date: new Date().toISOString().split('T')[0],
        items: bought.map((i) => i.name),
        not_bought: notFound.map((i) => i.name),
        item_count: bought.length,
        offer_count: offerCount,
        total_saved: totalSaved,
        total_cost: totalCost,
      })
      if (logError) throw logError

      // Delete bought items, keep not-found items
      const idsToDelete = bought.map((i) => i.id)
      if (idsToDelete.length > 0) {
        const { error: delError } = await supabase.from('shopping_items').delete().in('id', idsToDelete)
        if (delError) throw delError
      }

      return { totalSaved, totalCost, itemCount: bought.length, notFoundCount: notFound.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] })
      queryClient.invalidateQueries({ queryKey: ['profileStats'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseLog'] })
    },
  })

  return {
    items: itemsWithOffers,
    marketGroups,
    strategy,
    checkedCount,
    totalCount,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleItem,
    checkAll,
    removeItem,
    addItem,
    finishShopping,
  }
}
