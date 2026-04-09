import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export interface ProfileStats {
  totalSaved: number
  totalCost: number
  purchaseCount: number
  weekSaved: number
}

export function useProfileStats() {
  const session = useAppStore((s) => s.session)

  return useQuery({
    queryKey: ['profileStats', session?.user?.id],
    queryFn: async (): Promise<ProfileStats> => {
      if (!session?.user?.id) return { totalSaved: 0, totalCost: 0, purchaseCount: 0, weekSaved: 0 }

      const { data, error } = await supabase
        .from('purchase_log')
        .select('total_saved, total_cost, date')
        .eq('user_id', session.user.id)

      if (error) throw error

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]

      let totalSaved = 0
      let totalCost = 0
      let weekSaved = 0

      for (const row of data ?? []) {
        totalSaved += Number(row.total_saved ?? 0)
        totalCost += Number(row.total_cost ?? 0)
        if (row.date >= weekAgo) {
          weekSaved += Number(row.total_saved ?? 0)
        }
      }

      return {
        totalSaved,
        totalCost,
        purchaseCount: data?.length ?? 0,
        weekSaved,
      }
    },
    enabled: !!session?.user?.id,
  })
}
