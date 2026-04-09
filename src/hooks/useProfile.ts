import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export function useProfile() {
  const session = useAppStore((s) => s.session)
  const setProfile = useAppStore((s) => s.setProfile)

  const query = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!session?.user?.id,
  })

  useEffect(() => {
    if (query.data) {
      setProfile(query.data)
    }
  }, [query.data, setProfile])

  return query
}
