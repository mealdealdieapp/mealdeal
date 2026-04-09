import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export function usePurchaseLog() {
  const session = useAppStore((s) => s.session)

  return useQuery({
    queryKey: ['purchaseLog', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('purchase_log')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .limit(20)

      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })
}
