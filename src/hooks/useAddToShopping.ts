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

      const { data: existing } = await supabase
        .from('shopping_items')
        .select('name')
        .eq('user_id', session.user.id)
        .eq('checked', false)

      const existingNames = new Set(
        (existing ?? []).map((e) => e.name.toLowerCase())
      )

      const newItems = items.filter(
        (item) => !existingNames.has(item.name.toLowerCase())
      )

      if (newItems.length === 0) return 0

      const rows = newItems.map((item) => ({
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
      return newItems.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] })
    },
  })

  return { addOne, addMany }
}
