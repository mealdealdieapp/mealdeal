import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'
import { RecipeDetail } from '../recipes/RecipeDetail'
import { RecipeCard } from '../recipes/RecipeCard'
import { EmptyState } from './ProfileHelpers'
import type { Recipe } from '../../types/app.types'
import type { ScoredRecipe } from '../../hooks/useRecipes'

export function FavoritesView() {
  const session = useAppStore((s) => s.session)
  const { toggle: toggleSave, isSaved } = useSavedRecipes()
  const [openRecipe, setOpenRecipe] = useState<ScoredRecipe | null>(null)

  const { data: saved } = useQuery({
    queryKey: ['savedRecipesDetail', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*, recipes(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })

  if (!saved || saved.length === 0) {
    return <EmptyState text="Noch keine Favoriten" sub="Tippe ❤️ bei einem Rezept" />
  }

  const recipes: ScoredRecipe[] = saved
    .map((sr) => {
      const r = sr.recipes as Recipe | null
      if (!r) return null
      return { ...r, score: 0, dietScore: 0, offerScore: 0, perfectMatch: false } as ScoredRecipe
    })
    .filter((r): r is ScoredRecipe => r !== null)

  return (
    <>
      <div className="space-y-2">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onOpen={setOpenRecipe}
            onToggleSave={(id) => toggleSave.mutate(id)}
            isSaved={isSaved(recipe.id)}
          />
        ))}
      </div>
      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}
    </>
  )
}
