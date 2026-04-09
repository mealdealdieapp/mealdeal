import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { TablesUpdate } from '../types/database.types'

type ProfileUpdate = TablesUpdate<'user_profiles'>

export function useUpdateProfile() {
  const session = useAppStore((s) => s.session)
  const setProfile = useAppStore((s) => s.setProfile)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Update Zustand store immediately
      setProfile(data)

      // Invalidate all queries that depend on profile
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
