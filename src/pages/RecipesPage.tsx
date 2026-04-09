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
import { Search, ArrowLeft, Dices, SlidersHorizontal, X, Heart } from 'lucide-react'
import type { ScoredRecipe } from '../hooks/useRecipes'

interface ActiveFilters {
  maxTime: number | null      // z.B. 15, 30
  difficulty: string | null   // "Einfach", "Mittel"
  maxCost: number | null      // z.B. 5, 8
  favoritesOnly: boolean
}

const EMPTY_FILTERS: ActiveFilters = { maxTime: null, difficulty: null, maxCost: null, favoritesOnly: false }

export function RecipesPage() {
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openRecipe, setOpenRecipe] = useState<ScoredRecipe | null>(null)
  const [showSpin, setShowSpin] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS)

  const { recipes, allRecipes, mealGroups, isLoading, isError, refetch } = useRecipes(selectedMeal)
  const { toggle: toggleSave, isSaved, savedIds } = useSavedRecipes()

  const activeFilterCount = [filters.maxTime, filters.difficulty, filters.maxCost, filters.favoritesOnly || null].filter(Boolean).length

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

  // Filter anwenden auf eine Rezeptliste
  const applyFilters = useCallback((list: ScoredRecipe[]) => {
    let result = list
    if (filters.maxTime) result = result.filter(r => (r.time_minutes ?? 999) <= filters.maxTime!)
    if (filters.difficulty) result = result.filter(r => r.difficulty === filters.difficulty)
    if (filters.maxCost) result = result.filter(r => (r.estimatedCost ?? 999) <= filters.maxCost!)
    if (filters.favoritesOnly) result = result.filter(r => savedIds.has(r.id))
    return result
  }, [filters, savedIds])

  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    const found = allRecipes.filter((r) => r.name.toLowerCase().includes(q))
    return applyFilters(found)
  }, [allRecipes, search, applyFilters])

  // Filter auch auf Kategorieansicht anwenden
  const filteredRecipes = useMemo(() => applyFilters(recipes), [recipes, applyFilters])
  const filteredAllRecipes = useMemo(() => applyFilters(allRecipes), [allRecipes, applyFilters])

  const handleOpen = useCallback((recipe: ScoredRecipe) => setOpenRecipe(recipe), [])
  const handleToggleSave = useCallback((id: string) => toggleSave.mutate(id), [toggleSave])
  const handleBack = () => { if (search) setSearch(''); else setSelectedMeal(null) }
  const clearFilters = () => setFilters(EMPTY_FILTERS)

  // Recipes for spin wheel: category-filtered if in a category, otherwise all
  const spinRecipes = selectedMeal ? filteredRecipes : filteredAllRecipes

  const showingList = selectedMeal || search.trim() || filters.favoritesOnly

  return (
    <PageLayout>
      <PageHeader rightContent={
        <Search size={18} className="text-muted" />
      } />

      <div className="px-4 space-y-3">
        {/* Suchleiste + Filter-Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`shrink-0 w-[42px] h-[42px] flex items-center justify-center rounded-btn transition-colors relative ${
              activeFilterCount > 0 ? 'bg-primary text-white' : 'bg-white text-muted'
            }`}
            style={{ border: activeFilterCount > 0 ? undefined : '1.5px solid #EBEBEB' }}
          >
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-success text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter-Panel */}
        {showFilters && (
          <div className="bg-white rounded-card p-3.5 space-y-3" style={{ border: '1.5px solid #EBEBEB' }}>
            {/* Kochzeit */}
            <div>
              <span className="text-[11px] font-bold text-muted block mb-1.5">Kochzeit</span>
              <div className="flex gap-1.5">
                {[{ label: '< 15 Min', value: 15 }, { label: '< 30 Min', value: 30 }, { label: '< 60 Min', value: 60 }].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilters(f => ({ ...f, maxTime: f.maxTime === opt.value ? null : opt.value }))}
                    className={`px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                      filters.maxTime === opt.value ? 'bg-primary text-white' : 'bg-background text-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schwierigkeit */}
            <div>
              <span className="text-[11px] font-bold text-muted block mb-1.5">Schwierigkeit</span>
              <div className="flex gap-1.5">
                {['Einfach', 'Mittel', 'Schwer'].map(d => (
                  <button
                    key={d}
                    onClick={() => setFilters(f => ({ ...f, difficulty: f.difficulty === d ? null : d }))}
                    className={`px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                      filters.difficulty === d ? 'bg-primary text-white' : 'bg-background text-muted'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Kosten */}
            <div>
              <span className="text-[11px] font-bold text-muted block mb-1.5">Max. Kosten</span>
              <div className="flex gap-1.5">
                {[{ label: '< 5€', value: 5 }, { label: '< 8€', value: 8 }, { label: '< 12€', value: 12 }].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilters(f => ({ ...f, maxCost: f.maxCost === opt.value ? null : opt.value }))}
                    className={`px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                      filters.maxCost === opt.value ? 'bg-primary text-white' : 'bg-background text-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favoriten + Reset */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setFilters(f => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                  filters.favoritesOnly ? 'bg-red-50 text-red-500' : 'bg-background text-muted'
                }`}
              >
                <Heart size={12} className={filters.favoritesOnly ? 'fill-red-500' : ''} /> Favoriten
              </button>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] font-bold text-muted">
                  <X size={12} /> Filter zurücksetzen
                </button>
              )}
            </div>
          </div>
        )}

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
              {selectedMeal && filteredRecipes.length > 1 && (
                <button
                  onClick={() => setShowSpin(true)}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-primary bg-green-50 px-3 py-1.5 rounded-pill active:bg-green-100"
                >
                  <Dices size={14} /> Zufällig
                </button>
              )}
            </div>
            <RecipeList recipes={searchResults ?? (filters.favoritesOnly ? filteredAllRecipes : filteredRecipes)} onOpen={handleOpen} onToggleSave={handleToggleSave} isSaved={isSaved} />
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
