import { useState, useCallback } from 'react'
import { Loader2, ShoppingCart, CheckCircle2, Settings2, Wand2 } from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { RecipePicker } from '../components/weekly/RecipePicker'
import { DayCard, DAY_LABELS } from '../components/weekly/DayCard'
import { TodayAnalysis, WeekAnalysis } from '../components/weekly/WeeklyAnalysis'
import { CalorieSettings } from '../components/weekly/CalorieSettings'
import { useWeeklyPlan, DAYS } from '../hooks/useWeeklyPlan'
import { useGeneratePlan } from '../hooks/useGeneratePlan'
import { useAddToShopping } from '../hooks/useAddToShopping'
import { useOffers } from '../hooks/useOffers'
import { useSynonyms } from '../hooks/useSynonyms'
import { matchIngredientToOffer } from '../lib/offerMatching'
import { isInPantry } from '../lib/pantryFilter'
import { useAppStore } from '../store/useAppStore'
import { Portal } from '../components/ui/Portal'
import { ErrorState } from '../components/ui/ErrorState'
import type { DayKey, MealKey, PlanRecipe } from '../hooks/useWeeklyPlan'

export function WeeklyPage() {
  const { getSlotRecipes, getDayStats, weekStart, weekNumber, calTarget, weekStats, today, addToSlot, removeFromSlot, allIngredients, isLoading, isError, refetch } = useWeeklyPlan()
  const generatePlan = useGeneratePlan()
  const { addMany } = useAddToShopping()
  const { offers } = useOffers()
  const { data: synonymMap } = useSynonyms()
  const userPantry = useAppStore((s) => s.profile?.pantry) ?? []
  const [openDay, setOpenDay] = useState<DayKey | null>(today)
  const [picker, setPicker] = useState<{ day: DayKey; meal: MealKey } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showCalSettings, setShowCalSettings] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'today'>('week')
  const [addingToShopping, setAddingToShopping] = useState(false)

  const handleSelectRecipe = useCallback((recipe: PlanRecipe) => {
    if (!picker) return
    addToSlot.mutate({ day: picker.day, meal: picker.meal, recipe })
    setPicker(null)
  }, [picker, addToSlot])

  const handleAddAllToShopping = () => {
    if (allIngredients.length === 0) return
    setAddingToShopping(true)
    // Pantry-Filter: Items die der User dauerhaft zuhause hat raus
    const filteredIngredients = allIngredients.filter((ing) => !isInPantry(ing.name, userPantry))
    const skipped = allIngredients.length - filteredIngredients.length
    const items = filteredIngredients.map((ing) => {
      const match = offers.length > 0
        ? matchIngredientToOffer(
            { name: ing.name, category: ing.category },
            offers as { id: string; product_name: string; offer_price: number; original_price: number | null; discount_percent: number | null; store: string; category: string | null }[],
            synonymMap ?? undefined,
          )
        : null
      return {
        name: ing.name, amount: ing.amount || null, unit: ing.unit || null,
        category: ing.category || 'Wochenplan',
        offerStore: match?.store ?? null, offerPrice: match ? Number(match.offerPrice) : null,
        offerOriginalPrice: match?.originalPrice != null ? Number(match.originalPrice) : null,
        offerDiscountPercent: match?.discountPercent != null ? Number(match.discountPercent) : null,
        offerProductName: match?.productName ?? null,
      }
    })
    addMany.mutate(items, {
      onSuccess: (count) => {
        const msg = skipped > 0
          ? `${count} Zutaten hinzugefügt (${skipped} aus Vorrat übersprungen)`
          : `${count} Zutaten hinzugefügt`
        setToast(msg)
        setTimeout(() => setToast(null), 2500)
      },
      onSettled: () => setAddingToShopping(false),
    })
  }

  const todayStats = getDayStats(today)

  return (
    <PageLayout>
      <PageHeader rightContent={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted px-2.5 py-1 rounded-full" style={{ border: '1.5px solid #EBEBEB' }}>KW {weekNumber}</span>
          <button onClick={() => setShowCalSettings(true)} className="text-[11px] font-bold text-primary bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1">
            {calTarget} kcal <Settings2 size={10} />
          </button>
        </div>
      } />

      <div className="px-4 space-y-3 pb-24">
        {/* View toggle */}
        <div className="flex bg-background rounded-btn p-0.5" style={{ border: '1.5px solid #EBEBEB' }}>
          <button onClick={() => setViewMode('today')}
            className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${viewMode === 'today' ? 'bg-white text-dark' : 'text-muted'}`}>
            Heute
          </button>
          <button onClick={() => setViewMode('week')}
            className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${viewMode === 'week' ? 'bg-white text-dark' : 'text-muted'}`}>
            Woche
          </button>
        </div>

        {/* Generate button */}
        <button onClick={() => setShowGenerate(true)}
          className="w-full py-2.5 bg-primary text-white font-bold text-[12px] rounded-btn flex items-center justify-center gap-2 active:bg-green-800">
          <Wand2 size={14} /> Wochenplan generieren
        </button>

        {/* Analysis Widget */}
        {viewMode === 'today' ? (
          <TodayAnalysis stats={todayStats} calTarget={calTarget} day={today} />
        ) : (
          <WeekAnalysis weekStats={weekStats} calTarget={calTarget} />
        )}

        {/* Shopping button */}
        {weekStats.filledSlots > 0 && (
          <button onClick={handleAddAllToShopping} disabled={addingToShopping || addMany.isPending}
            className="w-full py-2.5 bg-white rounded-btn text-[12px] font-bold text-primary flex items-center justify-center gap-1.5 active:bg-background disabled:opacity-40"
            style={{ border: '1.5px solid #EBEBEB' }}>
            {addingToShopping ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
            Alle Zutaten zur Einkaufsliste
          </button>
        )}

        {/* Days */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : isError ? (
          <ErrorState message="Wochenplan konnte nicht geladen werden." onRetry={() => refetch()} />
        ) : viewMode === 'today' ? (
          <DayCard day={today} isToday label={DAY_LABELS[today]} defaultOpen
            getSlotRecipes={getSlotRecipes} getDayStats={getDayStats}
            onAddMeal={(meal) => setPicker({ day: today, meal })}
            onRemoveRecipe={(meal, idx) => removeFromSlot.mutate({ day: today, meal, index: idx })} />
        ) : (
          <div className="space-y-2">
            {DAYS.map((day) => (
              <DayCard key={day} day={day} isToday={day === today} label={DAY_LABELS[day]}
                defaultOpen={openDay === day}
                onToggle={() => setOpenDay(openDay === day ? null : day)}
                getSlotRecipes={getSlotRecipes} getDayStats={getDayStats}
                onAddMeal={(meal) => setPicker({ day, meal })}
                onRemoveRecipe={(meal, idx) => removeFromSlot.mutate({ day, meal, index: idx })} />
            ))}
          </div>
        )}
      </div>

      {picker && <RecipePicker meal={picker.meal} onSelect={handleSelectRecipe} onClose={() => setPicker(null)} />}
      {showCalSettings && <CalorieSettings calTarget={calTarget} onClose={() => setShowCalSettings(false)} />}

      {/* Generate Plan Modal */}
      {showGenerate && (
        <GenerateModal
          calTarget={calTarget} weekStart={weekStart} weekStats={weekStats}
          generatePlan={generatePlan}
          onClose={() => { setShowGenerate(false); generatePlan.reset() }}
        />
      )}

      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-dark text-white text-[13px] px-4 py-2.5 rounded-pill flex items-center gap-2 shadow-lg z-[60]">
          <CheckCircle2 size={16} className="text-success" />{toast}
        </div>
      )}
    </PageLayout>
  )
}

/* ─── Generate Plan Modal ─── */

function GenerateModal({ calTarget, weekStart, weekStats, generatePlan, onClose }: {
  calTarget: number; weekStart: string
  weekStats: { filledSlots: number }
  generatePlan: ReturnType<typeof useGeneratePlan>
  onClose: () => void
}) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/40" onClick={() => !generatePlan.isPending && onClose()} />
        <div className="relative bg-white p-5 mx-6 max-w-sm w-full" style={{ borderRadius: '24px', border: '1.5px solid #EBEBEB' }}>
          {generatePlan.isPending ? (
            <div className="text-center py-4">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <h3 className="font-display text-[16px] font-extrabold text-dark">Plan wird erstellt...</h3>
              <p className="text-[12px] text-muted mt-1">Rezepte werden ausgewählt und Zutaten geladen</p>
            </div>
          ) : generatePlan.isSuccess ? (
            <div className="text-center py-2">
              <span className="text-[40px] block mb-2">✨</span>
              <h3 className="font-display text-[16px] font-extrabold text-dark">Wochenplan erstellt!</h3>
              {generatePlan.data?.stats && (
                <div className="flex justify-center gap-4 mt-3 mb-2">
                  <div className="text-center">
                    <span className="text-[14px] font-bold text-primary block">{generatePlan.data.stats.avgDailyCal}</span>
                    <span className="text-[10px] text-muted">kcal/Tag</span>
                  </div>
                  {generatePlan.data.stats.estimatedCost > 0 && (
                    <div className="text-center">
                      <span className="text-[14px] font-bold text-primary block">~{generatePlan.data.stats.estimatedCost.toFixed(0)}€</span>
                      <span className="text-[10px] text-muted">geschätzt</span>
                    </div>
                  )}
                  <div className="text-center">
                    <span className="text-[14px] font-bold text-success block">{generatePlan.data.stats.offerMatches}</span>
                    <span className="text-[10px] text-muted">Angebote</span>
                  </div>
                </div>
              )}
              <button onClick={onClose}
                className="mt-3 w-full py-2.5 bg-primary text-white font-bold text-[13px] rounded-btn active:bg-green-800">
                Ansehen
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <span className="text-[36px] block mb-2">🪄</span>
                <h3 className="font-display text-[16px] font-extrabold text-dark">Wochenplan generieren?</h3>
                <p className="text-[12px] text-muted mt-1.5 leading-relaxed">
                  Erstellt automatisch einen Plan basierend auf:
                </p>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2.5 text-[12px]">
                  <span className="text-[16px]">🎯</span>
                  <span className="text-dark">Kalorienziel: <span className="font-bold text-primary">{calTarget} kcal</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px]">
                  <span className="text-[16px]">🥗</span>
                  <span className="text-dark">Ernährungsprofil berücksichtigt</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px]">
                  <span className="text-[16px]">🏷️</span>
                  <span className="text-dark">Aktuelle Angebote bevorzugt</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px]">
                  <span className="text-[16px]">🔄</span>
                  <span className="text-dark">Maximale Abwechslung</span>
                </div>
              </div>
              {weekStats.filledSlots > 0 && (
                <p className="text-[11px] text-red-500 bg-red-50 rounded-btn p-2.5 mb-3">
                  Dein aktueller Plan ({weekStats.filledSlots} Gerichte) wird ersetzt.
                </p>
              )}
              {generatePlan.isError && (
                <p className="text-[11px] text-red-500 mb-3">Fehler: {(generatePlan.error as Error).message}</p>
              )}
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 bg-white font-bold text-[13px] text-dark rounded-btn active:bg-background"
                  style={{ border: '1.5px solid #EBEBEB' }}>
                  Abbrechen
                </button>
                <button onClick={() => generatePlan.mutate({ calTarget, weekStart })}
                  className="flex-1 py-2.5 bg-primary text-white font-bold text-[13px] rounded-btn flex items-center justify-center gap-1.5 active:bg-green-800">
                  <Wand2 size={14} /> Generieren
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
