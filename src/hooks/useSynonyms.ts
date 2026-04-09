import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSynonyms() {
  return useQuery({
    queryKey: ['synonyms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredient_synonyms')
        .select('canonical, synonym')

      if (error) throw error

      // Build map: canonical → [synonym1, synonym2, ...]
      const map = new Map<string, string[]>()
      for (const row of data ?? []) {
        const key = row.canonical.toLowerCase()
        const list = map.get(key) ?? []
        list.push(row.synonym.toLowerCase())
        map.set(key, list)
      }
      return map
    },
    staleTime: 1000 * 60 * 30, // cache 30 min
  })
}
