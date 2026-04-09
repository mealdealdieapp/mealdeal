import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export function useWatchlist() {
  const session = useAppStore((s) => s.session)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['watchlist', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', session.user.id)
      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })

  const toggle = useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji?: string }) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      const existing = query.data?.find(
        (w) => w.name.toLowerCase() === name.toLowerCase()
      )

      if (existing) {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('watchlist').insert({
          user_id: session.user.id,
          name,
          emoji: emoji ?? undefined,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const isWatched = (name: string) =>
    query.data?.some((w) => w.name.toLowerCase() === name.toLowerCase()) ?? false

  return { ...query, toggle, isWatched }
}
