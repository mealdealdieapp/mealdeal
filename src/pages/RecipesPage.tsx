import { useState, useMemo, useEffect, useCallback } from 'react'
import { PageLayout } from '../components/layout/PageLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { RecipeList } from '../components/recipes/RecipeList'
import { RecipeDetail } from '../components/recipes/RecipeDetail'
import { SpinWheel } from '../components/recipes/SpinWheel'
import { WeeklyCarousel } from '../components/recipes/WeeklyCarousel'
import { GridSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { useRecipes } from '../hooks/useRecipes'
import { useSavedRecipes } from '../hooks/useSavedRecipes'
import { getMealLabel, getMealImage } from '../lib/mealConfig'
import { Search, ArrowLeft, Dices } from 'lucide-react'
import type { ScoredRecipe } from '../hooks/useRecipes'

export function RecipesPage() {
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openRecipe, setOpenRecipe] = useState<ScoredRecipe | null>(null)
  const [showSpin, setShowSpin] = useState(false)

  const { recipes, allRecipes, mealGroups, isLoading, isError, refetch } = useRecipes(selectedMeal)
  const { toggle: toggleSave, isSaved } = useSavedRecipes()

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === 'recipes') {
        setSelectedMeal(null)
        setSearch('')
        setOpenRecipe(null)
      }
    }
    window.addEventListener('tab-reset', handler)
    return () => window.removeEventListener('tab-reset', handler)
  }, [])

  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    // Search across ALL recipes, not just the filtered category
    return allRecipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [allRecipes, search])

  const handleOpen = useCallback((recipe: ScoredRecipe) => setOpenRecipe(recipe), [])
  const handleToggleSave = useCallback((id: string) => toggleSave.mutate(id), [toggleSave])
  const handleBack = () => { if (search) setSearch(''); else setSelectedMeal(null) }

  // Recipes for spin wheel: category-filtered if in a category, otherwise all
  const spinRecipes = selectedMeal ? recipes : allRecipes

  const showingList = selectedMeal || search.trim()

  return (
    <PageLayout>
      <PageHeader rightContent={
        <Search size={18} className="text-muted" />
      } />

      <div className="px-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/50" />
          <input
            type="text"
            placeholder="Rezept suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-btn text-[13px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ border: '1.5px solid #EBEBEB' }}
          />
        </div>

        {isLoading ? (
          <GridSkeleton />
        ) : isError ? (
          <ErrorState message="Rezepte konnten nicht geladen werden." onRetry={() => refetch()} />
        ) : showingList ? (
          <>
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] text-muted font-medium">
                <ArrowLeft size={15} />
                {selectedMeal ? getMealLabel(selectedMeal) : 'Suchergebnisse'}
              </button>
              {selectedMeal && recipes.length > 1 && (
                <button
                  onClick={() => setShowSpin(true)}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-primary bg-green-50 px-3 py-1.5 rounded-pill active:bg-green-100"
                >
                  <Dices size={14} /> Zufällig
                </button>
              )}
            </div>
            <RecipeList recipes={searchResults ?? recipes} onOpen={handleOpen} onToggleSave={handleToggleSave} isSaved={isSaved} />
          </>
        ) : mealGroups.length === 0 ? (
          <p className="text-center text-muted py-16 text-[14px]">Keine Rezepte gefunden</p>
        ) : (
          <>
            {/* Surprise me button */}
            <button
              onClick={() => setShowSpin(true)}
              className="w-full py-3 bg-primary text-white font-bold text-[14px] rounded-btn flex items-center justify-center gap-2 active:bg-green-800"
            >
              <Dices size={18} /> Überrasch mich!
            </button>

            {/* Weekly offer recipes carousel */}
            <WeeklyCarousel onOpen={(r) => setOpenRecipe(r as ScoredRecipe)} />

            <div className="space-y-3">
              {mealGroups.map((group) => {
                const hasRecipes = group.recipes.length > 0
                const offerCount = group.recipes.filter((r) => r.offerScore > 0).length
                return (
                  <button
                    key={group.meal}
                    onClick={hasRecipes ? () => setSelectedMeal(group.meal) : undefined}
                    disabled={!hasRecipes}
                    className={`w-full h-[120px] relative overflow-hidden transition-transform ${hasRecipes ? 'active:scale-[0.98] cursor-pointer' : 'cursor-not-allowed'}`}
                    style={{ borderRadius: '16px', opacity: hasRecipes ? 1 : 0.6 }}
                  >
                    <img
                      src={getMealImage(group.meal)}
                      alt={getMealLabel(group.meal)}
                      className="absolute inset-0 w-full h-full object-cover object-right"
                      loading="lazy"
                      style={{ maskImage: 'linear-gradient(to left, black 40%, transparent 90%)', WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 90%)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-0 p-4 flex flex-col justify-between items-start">
                      <h3 className="font-display font-extrabold text-white text-[28px] leading-tight mt-2">
                        {getMealLabel(group.meal)}
                      </h3>
                      <div className="flex items-center gap-2">
                        {hasRecipes ? (
                          <>
                            <span className="text-[13px] text-white/80">
                              {group.recipes.length} Rezept{group.recipes.length !== 1 ? 'e' : ''}
                            </span>
                            {offerCount > 0 && (
                              <span className="text-[10px] font-bold text-white bg-success px-2 py-0.5 rounded-pill">
                                {offerCount} im Angebot
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[12px] text-white/60 italic">Bald verfügbar</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}

      {showSpin && spinRecipes.length > 0 && (
        <SpinWheel
          recipes={spinRecipes}
          onViewRecipe={handleOpen}
          onClose={() => setShowSpin(false)}
        />
      )}
    </PageLayout>
  )
}
