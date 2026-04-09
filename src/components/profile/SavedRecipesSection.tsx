import { Heart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'

export function SavedRecipesSection() {
  const session = useAppStore((s) => s.session)

  const { data: savedRecipes } = useQuery({
    queryKey: ['savedRecipesDetail', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*, recipes(name, emoji, time_minutes)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })

  if (!savedRecipes || savedRecipes.length === 0) {
    return (
      <div
        className="bg-white rounded-[16px] px-4 py-8 flex flex-col items-center gap-2"
        style={{ border: '1.5px solid #EBEBEB' }}
      >
        <Heart size={20} className="text-gray-300" />
        <span className="text-[13px] text-gray-400">Keine gespeicherten Rezepte</span>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-[16px] overflow-hidden divide-y divide-gray-50"
      style={{ border: '1.5px solid #EBEBEB' }}
    >
      {savedRecipes.map((sr) => {
        const recipe = sr.recipes as { name: string; emoji: string | null; time_minutes: number | null } | null
        return (
          <div key={sr.id} className="px-4 py-3 flex items-center gap-3">
            <span className="text-[18px]">{recipe?.emoji ?? '🍽️'}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-gray-800 truncate block">{recipe?.name ?? 'Unbekannt'}</span>
            </div>
            {recipe?.time_minutes && (
              <span className="text-[11px] text-gray-400">{recipe.time_minutes} Min</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
