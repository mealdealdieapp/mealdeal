import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

interface AddItemParams {
  name: string
  amount?: number | null
  unit?: string | null
  category?: string | null
  offerId?: string | null
  offerStore?: string | null
  offerPrice?: number | null
  offerOriginalPrice?: number | null
  offerDiscountPercent?: number | null
  offerProductName?: string | null
}

export function useAddToShopping() {
  const session = useAppStore((s) => s.session)
  const queryClient = useQueryClient()

  const addOne = useMutation({
    mutationFn: async ({ name, amount, unit, category, offerId, offerStore, offerPrice, offerOriginalPrice, offerDiscountPercent, offerProductName }: AddItemParams) => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const { error } = await supabase.from('shopping_items').insert({
        user_id: session.user.id,
        name,
        amount: amount ?? null,
        unit: unit ?? null,
        category: category ?? null,
        offer_id: offerId ?? null,
        offer_store: offerStore ?? null,
        offer_price: offerPrice ?? null,
        offer_original_price: offerOriginalPrice ?? null,
        offer_discount_percent: offerDiscountPercent ?? null,
        offer_product_name: offerProductName ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] })
    },
  })

  const addMany = useMutation({
    mutationFn: async (items: AddItemParams[]) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      // Schritt 1: Items lokal aggregieren (gleiche Zutat aus mehreren Rezepten zusammenfassen)
      // Key: name (lowercase, trim) + unit (lowercase, trim) - nur bei gleicher Einheit aggregierbar
      const aggregateMap = new Map<string, AddItemParams>()
      for (const item of items) {
        const nameKey = item.name.trim().toLowerCase()
        const unitKey = (item.unit ?? '').trim().toLowerCase()
        const key = `${nameKey}|${unitKey}`
        const existing = aggregateMap.get(key)
        if (existing) {
          // Summe nur wenn beide Mengen numerisch
          const a = Number(existing.amount) || 0
          const b = Number(item.amount) || 0
          existing.amount = a + b > 0 ? a + b : (existing.amount ?? item.amount ?? null)
          // Offer-Match bevorzugen wenn vorhanden (falls eines der Items ein Angebot hat)
          if (!existing.offerId && item.offerId) {
            existing.offerId = item.offerId
            existing.offerStore = item.offerStore
            existing.offerPrice = item.offerPrice
            existing.offerOriginalPrice = item.offerOriginalPrice
            existing.offerDiscountPercent = item.offerDiscountPercent
            existing.offerProductName = item.offerProductName
          }
        } else {
          aggregateMap.set(key, { ...item })
        }
      }
      const aggregated = Array.from(aggregateMap.values())

      // Schritt 2: existierende, noch nicht abgehakte Items mit Mengen laden
      const { data: existingRows } = await supabase
        .from('shopping_items')
        .select('id, name, amount, unit')
        .eq('user_id', session.user.id)
        .eq('checked', false)

      const existingByKey = new Map<string, { id: string; amount: number | null }>()
      for (const e of existingRows ?? []) {
        const nameKey = e.name.trim().toLowerCase()
        const unitKey = (e.unit ?? '').trim().toLowerCase()
        existingByKey.set(`${nameKey}|${unitKey}`, { id: e.id, amount: e.amount })
      }

      // Schritt 3: split in UPDATE (Menge erhoehen) vs INSERT (neu)
      const toInsert: AddItemParams[] = []
      const toUpdate: Array<{ id: string; newAmount: number | null }> = []

      for (const item of aggregated) {
        const key = `${item.name.trim().toLowerCase()}|${(item.unit ?? '').trim().toLowerCase()}`
        const existing = existingByKey.get(key)
        if (existing) {
          const a = Number(existing.amount) || 0
          const b = Number(item.amount) || 0
          const sum = a + b
          toUpdate.push({ id: existing.id, newAmount: sum > 0 ? sum : existing.amount })
        } else {
          toInsert.push(item)
        }
      }

      // Schritt 4: UPDATEs ausfuehren
      for (const upd of toUpdate) {
        const { error: uErr } = await supabase
          .from('shopping_items')
          .update({ amount: upd.newAmount })
          .eq('id', upd.id)
        if (uErr) throw uErr
      }

      // Schritt 5: INSERTs ausfuehren
      if (toInsert.length > 0) {
        const rows = toInsert.map((item) => ({
          user_id: session.user.id,
          name: item.name,
          amount: item.amount ?? null,
          unit: item.unit ?? null,
          category: item.category ?? null,
          offer_id: item.offerId ?? null,
          offer_store: item.offerStore ?? null,
          offer_price: item.offerPrice ?? null,
          offer_original_price: item.offerOriginalPrice ?? null,
          offer_discount_percent: item.offerDiscountPercent ?? null,
          offer_product_name: item.offerProductName ?? null,
        }))
        const { error } = await supabase.from('shopping_items').insert(rows)
        if (error) throw error
      }

      return toInsert.length + toUpdate.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] })
    },
  })

  return { addOne, addMany }
}
