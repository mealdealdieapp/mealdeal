import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Recipe } from '../types/app.types'

export function useWeeklyRecipes() {
  return useQuery({
    queryKey: ['weeklyRecipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('tag', 'Wochenangebot')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return (data ?? []) as Recipe[]
    },
    staleTime: 30 * 60 * 1000, // 30 min cache
  })
}
