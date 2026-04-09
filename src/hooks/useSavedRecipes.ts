import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export function useSavedRecipes() {
  const session = useAppStore((s) => s.session)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['savedRecipes', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('recipe_id')
        .eq('user_id', session.user.id)
      if (error) throw error
      return data?.map((r) => r.recipe_id) ?? []
    },
    enabled: !!session?.user?.id,
  })

  const toggle = useMutation({
    mutationFn: async (recipeId: string) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      const isSaved = query.data?.includes(recipeId)
      if (isSaved) {
        const { error } = await supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('recipe_id', recipeId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_recipes')
          .insert({ user_id: session.user.id, recipe_id: recipeId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedRecipes'] })
      queryClient.invalidateQueries({ queryKey: ['savedRecipesDetail'] })
    },
  })

  const isSaved = (recipeId: string) => query.data?.includes(recipeId) ?? false

  return { ...query, toggle, isSaved }
}
