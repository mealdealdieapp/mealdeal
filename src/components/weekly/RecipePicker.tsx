import { useState, useMemo } from 'react'
import { X, Search, Clock, Sparkles, Tag } from 'lucide-react'
import { useRecipes } from '../../hooks/useRecipes'
import { recipeToPlanRecipe } from '../../lib/recipeToPlanRecipe'
import { OptimizedImage } from '../ui/OptimizedImage'
import { Portal } from '../ui/Portal'
import type { Recipe } from '../../types/app.types'
import type { MealKey, PlanRecipe } from '../../hooks/useWeeklyPlan'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
}

interface RecipePickerProps {
  meal: MealKey
  onSelect: (recipe: PlanRecipe) => void
  onClose: () => void
}

export function RecipePicker({ meal, onSelect, onClose }: RecipePickerProps) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const { recipes, isLoading } = useRecipes()

  const filtered = useMemo(() => {
    let list = recipes
    if (meal === 'breakfast') {
      const breakfastOnly = recipes.filter((r) => r.meal === 'breakfast')
      if (breakfastOnly.length > 0) list = breakfastOnly
    } else {
      list = recipes.filter((r) => r.meal !== 'breakfast' || search.trim())
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = recipes.filter((r) => r.name.toLowerCase().includes(q))
    }
    // Sortiere nach Angebots-Score: Rezepte mit vielen Zutaten im Angebot zuerst
    return [...list].sort((a, b) => {
      const aOffer = (a.matchPercent ?? 0) + (a.dynamicSaved ?? 0) * 10
      const bOffer = (b.matchPercent ?? 0) + (b.dynamicSaved ?? 0) * 10
      return bOffer - aOffer
    })
  }, [recipes, meal, search])

  const handleSelect = async (recipe: Recipe) => {
    setLoading(recipe.id)
    const planRecipe = await recipeToPlanRecipe(recipe)
    onSelect(planRecipe)
    setLoading(null)
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex flex-col" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative mt-[8vh] h-[92vh] bg-white rounded-t-[20px] flex flex-col overflow-hidden max-w-[480px] mx-auto w-full">
          <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid #EBEBEB' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-[17px] font-extrabold text-dark">
                {MEAL_LABELS[meal] ?? 'Rezept'} wählen
              </h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-background">
                <X size={16} className="text-dark" />
              </button>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rezept suchen..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-background rounded-btn text-[13px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {isLoading ? (
              <p className="text-center text-muted py-8 text-[13px]">Laden...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted py-8 text-[13px]">Keine Rezepte gefunden</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((recipe) => {
                  const isLoading = loading === recipe.id
                  return (
                    <button
                      key={recipe.id}
                      onClick={() => handleSelect(recipe)}
                      disabled={!!loading}
                      className="w-full flex items-center gap-3 p-2.5 rounded-[12px] text-left active:bg-background transition-colors disabled:opacity-60"
                    >
                      <OptimizedImage
                        src={recipe.image_url}
                        alt={recipe.name}
                        size="thumb"
                        fallback={recipe.emoji ?? '🍽️'}
                        className="w-12 h-12 shrink-0"
                        style={{ borderRadius: '8px' }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-dark block truncate">{recipe.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {recipe.calories && <span className="text-[11px] text-muted">{recipe.calories} kcal</span>}
                          {recipe.time_minutes && (
                            <span className="text-[11px] text-muted flex items-center gap-0.5">
                              <Clock size={10} />{recipe.time_minutes} Min
                            </span>
                          )}
                          {recipe.matchPercent != null && recipe.matchPercent > 0 && (
                            <span className="text-[9px] font-bold text-primary flex items-center gap-0.5">
                              <Tag size={9} /> {recipe.matchPercent}%
                            </span>
                          )}
                          {recipe.dynamicSaved != null && recipe.dynamicSaved > 0 && (
                            <span className="text-[9px] font-bold text-success">
                              +{recipe.dynamicSaved.toFixed(2)}€
                            </span>
                          )}
                          {recipe.perfectMatch && (
                            <span className="text-[9px] font-bold text-primary flex items-center gap-0.5">
                              <Sparkles size={9} /> Passt
                            </span>
                          )}
                        </div>
                      </div>
                      {isLoading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
