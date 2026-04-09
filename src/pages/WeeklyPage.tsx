import { useState, useCallback } from 'react'
import { ChevronDown, Plus, X, Loader2, ShoppingCart, CheckCircle2, Settings2, Wand2 } from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { RecipePicker } from '../components/weekly/RecipePicker'
import { useWeeklyPlan, DAYS, MEALS } from '../hooks/useWeeklyPlan'
import { useGeneratePlan } from '../hooks/useGeneratePlan'
import { useAddToShopping } from '../hooks/useAddToShopping'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import { useAppStore } from '../store/useAppStore'
import { useOffers } from '../hooks/useOffers'
import { useSynonyms } from '../hooks/useSynonyms'
import { matchIngredientToOffer } from '../lib/offerMatching'
import { IMAGE_BASE_URL } from '../lib/mealConfig'
import { Portal } from '../components/ui/Portal'
import { ErrorState } from '../components/ui/ErrorState'
import type { DayKey, MealKey, PlanRecipe } from '../hooks/useWeeklyPlan'

const DAY_LABELS: Record<string, string> = {
  Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag',
  Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag',
}
const MEAL_LABELS: Record<string, string> = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snacks' }
const MEAL_EMOJI: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🥨' }

export function WeeklyPage() {
  const { getSlotRecipes, getDayStats, weekStart, weekNumber, calTarget, weekStats, today, addToSlot, removeFromSlot, allIngredients, isLoading, isError, refetch } = useWeeklyPlan()
  const generatePlan = useGeneratePlan()
  const { addMany } = useAddToShopping()
  const { offers } = useOffers()
  const { data: synonymMap } = useSynonyms()
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

  // Use pre-aggregated ingredients from useWeeklyPlan, match against offers
  const handleAddAllToShopping = () => {
    if (allIngredients.length === 0) return
    setAddingToShopping(true)

    const items = allIngredients.map((ing) => {
      const match = offers.length > 0
        ? matchIngredientToOffer(
            { name: ing.name, category: ing.category },
            offers as { id: string; product_name: string; offer_price: number; original_price: number | null; discount_percent: number | null; store: string; category: string | null }[],
            synonymMap ?? undefined,
          )
        : null

      return {
        name: ing.name,
        amount: ing.amount || null,
        unit: ing.unit || null,
        category: ing.category || 'Wochenplan',
        offerStore: match?.store ?? null,
        offerPrice: match ? Number(match.offerPrice) : null,
        offerOriginalPrice: match?.originalPrice != null ? Number(match.originalPrice) : null,
        offerDiscountPercent: match?.discountPercent != null ? Number(match.discountPercent) : null,
        offerProductName: match?.productName ?? null,
      }
    })

    addMany.mutate(items, {
      onSuccess: (count) => { setToast(`${count} Zutaten hinzugefügt`); setTimeout(() => setToast(null), 2000) },
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
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => !generatePlan.isPending && setShowGenerate(false)} />
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
                  <p className="text-[12px] text-muted mt-1">21 Mahlzeiten für deine Woche</p>
                  <button onClick={() => { setShowGenerate(false); generatePlan.reset() }}
                    className="mt-4 w-full py-2.5 bg-primary text-white font-bold text-[13px] rounded-btn active:bg-green-800">
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
                    <button onClick={() => setShowGenerate(false)}
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
      )}

      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-dark text-white text-[13px] px-4 py-2.5 rounded-pill flex items-center gap-2 shadow-lg z-[60]">
          <CheckCircle2 size={16} className="text-success" />{toast}
        </div>
      )}
    </PageLayout>
  )
}

/* ─── Day Card ─── */

function DayCard({ day, isToday, label, defaultOpen, onToggle, getSlotRecipes, getDayStats, onAddMeal, onRemoveRecipe }: {
  day: DayKey; isToday: boolean; label: string; defaultOpen: boolean
  onToggle?: () => void
  getSlotRecipes: (day: DayKey, meal: MealKey) => PlanRecipe[]
  getDayStats: (day: DayKey) => { cal: number; recipeCount: number }
  onAddMeal: (meal: MealKey) => void
  onRemoveRecipe: (meal: MealKey, index: number) => void
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const ds = getDayStats(day)
  const toggle = onToggle ?? (() => setIsOpen(!isOpen))
  const open = onToggle ? defaultOpen : isOpen

  return (
    <div className={`bg-white rounded-card overflow-hidden ${isToday ? 'ring-1 ring-primary/30' : ''}`} style={{ border: '1.5px solid #EBEBEB' }}>
      <button onClick={toggle} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[14px] font-extrabold text-dark">
            {isToday && <span className="text-primary">● </span>}{label}
          </span>
          {ds.recipeCount > 0 && <span className="text-[10px] text-muted bg-background px-2 py-0.5 rounded-pill">{ds.cal} kcal · {ds.recipeCount} Gerichte</span>}
        </div>
        <ChevronDown size={16} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {MEALS.map((meal) => (
            <MealSection key={meal} meal={meal}
              recipes={getSlotRecipes(day, meal)}
              onAdd={() => onAddMeal(meal)}
              onRemove={(idx) => onRemoveRecipe(meal, idx)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Meal Section (supports multiple recipes) ─── */

function MealSection({ meal, recipes, onAdd, onRemove }: {
  meal: MealKey; recipes: PlanRecipe[]; onAdd: () => void; onRemove: (index: number) => void
}) {
  return (
    <div>
      {/* Meal header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-muted">{MEAL_EMOJI[meal]} {MEAL_LABELS[meal]}</span>
        <button onClick={onAdd} className="text-[10px] font-bold text-primary flex items-center gap-0.5">
          <Plus size={11} /> Hinzufügen
        </button>
      </div>

      {recipes.length === 0 ? (
        <button onClick={onAdd}
          className="w-full py-2 border-2 border-dashed border-gray-200 rounded-btn flex items-center justify-center gap-1.5 text-[11px] text-muted active:bg-background">
          <Plus size={12} /> Rezept wählen
        </button>
      ) : (
        <div className="space-y-1">
          {recipes.map((recipe, i) => {
            const imgUrl = recipe.image_url ? `${IMAGE_BASE_URL}${encodeURIComponent(recipe.image_url)}` : null
            return (
              <div key={`${recipe.id}-${i}`} className="flex items-center gap-2.5 py-1.5">
                <div className="w-9 h-9 rounded-[7px] overflow-hidden bg-background shrink-0 flex items-center justify-center">
                  {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" loading="lazy" /> : <span className="text-[16px]">{recipe.emoji ?? '🍽️'}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold text-dark block truncate">{recipe.name}</span>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted">
                    {recipe.cal && <span>{recipe.cal} kcal</span>}
                    {recipe.protein && <span>· {Number(recipe.protein).toFixed(0)}g P</span>}
                    {recipe.time && <span>· {recipe.time}</span>}
                  </div>
                </div>
                {recipe.saved != null && Number(recipe.saved) > 0 && (
                  <span className="text-[8px] font-bold text-success bg-green-50 px-1.5 py-0.5 rounded-pill shrink-0">-{Number(recipe.saved).toFixed(2)}€</span>
                )}
                <button onClick={() => onRemove(i)} className="w-6 h-6 flex items-center justify-center rounded-full active:bg-background shrink-0">
                  <X size={12} className="text-muted" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Analysis Widgets ─── */

function TodayAnalysis({ stats, calTarget, day }: { stats: ReturnType<ReturnType<typeof useWeeklyPlan>['getDayStats']>; calTarget: number; day: DayKey }) {
  const pct = calTarget > 0 ? Math.min(100, (stats.cal / calTarget) * 100) : 0
  return (
    <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-muted">Heute · {DAY_LABELS[day]}</span>
        <span className="text-[11px] text-muted">{stats.recipeCount} Gerichte</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#F5F5F0" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={stats.cal > calTarget ? '#ef4444' : '#028350'} strokeWidth="3"
              strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[16px] font-extrabold text-dark">{stats.cal}</span>
            <span className="text-[8px] text-muted">/ {calTarget}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <MacroBar label="Protein" value={stats.protein} unit="g" color="#3B82F6" />
          <MacroBar label="Carbs" value={stats.carbs} unit="g" color="#F59E0B" />
          <MacroBar label="Fett" value={stats.fat} unit="g" color="#EF4444" />
        </div>
      </div>
    </div>
  )
}

function WeekAnalysis({ weekStats, calTarget }: { weekStats: ReturnType<typeof useWeeklyPlan>['weekStats']; calTarget: number }) {
  const avgPct = calTarget > 0 ? Math.min(100, (weekStats.avgDailyCal / calTarget) * 100) : 0
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-card p-3.5" style={{ border: '1.5px solid #EBEBEB' }}>
          <div className="text-[10px] font-medium text-muted mb-1.5">Ø Kcal / Tag</div>
          <div className="flex items-end gap-1.5">
            <span className="font-display text-[22px] font-extrabold text-dark">{weekStats.avgDailyCal}</span>
            <span className="text-[11px] text-muted mb-1">/ {calTarget}</span>
          </div>
          <div className="w-full h-1.5 bg-background rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${avgPct}%`, backgroundColor: weekStats.avgDailyCal > calTarget ? '#ef4444' : '#028350' }} />
          </div>
        </div>
        <div className="bg-green-50 rounded-card p-3.5" style={{ border: '1.5px solid #BBF7D0' }}>
          <div className="text-[10px] font-medium text-green-600 mb-1.5">Gespart</div>
          <span className="font-display text-[22px] font-extrabold text-success">{weekStats.totalSaved.toFixed(2)}</span>
          <span className="text-[11px] text-muted ml-1">€</span>
        </div>
      </div>
      <div className="bg-white rounded-card p-3.5 flex justify-between" style={{ border: '1.5px solid #EBEBEB' }}>
        <MacroStat label="Ø Protein" value={weekStats.avgDailyProtein} unit="g" color="#3B82F6" />
        <MacroStat label="Ø Carbs" value={weekStats.avgDailyCarbs} unit="g" color="#F59E0B" />
        <MacroStat label="Ø Fett" value={weekStats.avgDailyFat} unit="g" color="#EF4444" />
        <MacroStat label="Gerichte" value={weekStats.filledSlots} unit="" color="#8B5CF6" />
      </div>
    </div>
  )
}

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <span className="font-display text-[15px] font-extrabold" style={{ color }}>{Math.round(value)}</span>
      <span className="text-[9px] text-muted">{unit}</span>
      <div className="text-[9px] text-muted mt-0.5">{label}</div>
    </div>
  )
}

function MacroStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: color }} />
      <span className="font-display text-[14px] font-extrabold text-dark">{Math.round(value)}</span>
      <span className="text-[9px] text-muted">{unit}</span>
      <div className="text-[9px] text-muted mt-0.5">{label}</div>
    </div>
  )
}

/* ─── Calorie Settings ─── */

function NumInput({ value, onChange, label, unit, min, max }: {
  value: number; onChange: (v: number) => void; label: string; unit?: string; min?: number; max?: number
}) {
  const [text, setText] = useState(String(value))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setText(raw)
    const n = Number(raw)
    if (!isNaN(n) && raw !== '') {
      onChange(Math.max(min ?? 0, Math.min(max ?? 99999, n)))
    }
  }

  const handleBlur = () => {
    if (text === '' || isNaN(Number(text))) {
      setText(String(value))
    } else {
      const clamped = Math.max(min ?? 0, Math.min(max ?? 99999, Number(text)))
      onChange(clamped)
      setText(String(clamped))
    }
  }

  return (
    <div>
      <label className="text-[9px] font-bold text-muted block mb-1 uppercase">{label}</label>
      <div className="relative">
        <input type="text" inputMode="numeric" value={text} onChange={handleChange} onBlur={handleBlur}
          className="w-full text-center text-[14px] font-bold text-dark py-2 bg-background rounded-btn focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ border: '1.5px solid #EBEBEB' }} />
        {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted">{unit}</span>}
      </div>
    </div>
  )
}

// Standard macro split: Protein 30%, Carbs 40%, Fat 30%
// 1g Protein = 4 kcal, 1g Carbs = 4 kcal, 1g Fat = 9 kcal
function kcalToMacros(kcal: number) {
  return {
    protein: Math.round((kcal * 0.30) / 4),
    carbs: Math.round((kcal * 0.40) / 4),
    fat: Math.round((kcal * 0.30) / 9),
  }
}
function macrosToKcal(protein: number, carbs: number, fat: number) {
  return protein * 4 + carbs * 4 + fat * 9
}

function CalorieSettings({ calTarget, onClose }: { calTarget: number; onClose: () => void }) {
  const profile = useAppStore((s) => s.profile)
  const updateProfile = useUpdateProfile()
  const [mode, setMode] = useState<'manual' | 'calc'>('manual')

  // Initialize macros from profile or derive from kcal
  const initMacros = profile?.protein_target
    ? { protein: profile.protein_target, carbs: profile.carbs_target ?? 0, fat: profile.fat_target ?? 0 }
    : kcalToMacros(calTarget)

  const [kcal, setKcal] = useState(calTarget)
  const [protein, setProtein] = useState(initMacros.protein)
  const [carbs, setCarbs] = useState(initMacros.carbs)
  const [fat, setFat] = useState(initMacros.fat)
  const [macroLocked, setMacroLocked] = useState(false) // true = user edited macros manually

  const [gender, setGender] = useState(profile?.gender ?? 'male')
  const [age, setAge] = useState(profile?.age ?? 30)
  const [weight, setWeight] = useState(profile?.weight ?? 75)
  const [height, setHeight] = useState(profile?.height ?? 175)
  const [activity, setActivity] = useState(profile?.activity ?? 1.375)
  const [goal, setGoal] = useState(profile?.goal ?? 'maintain')

  const calcResult = (() => {
    let bmr = 10 * weight + 6.25 * height - 5 * age
    bmr += gender === 'male' ? 5 : -161
    let tdee = Math.round(bmr * activity)
    if (goal === 'lose') tdee -= 400
    if (goal === 'gain') tdee += 300
    return Math.max(1200, tdee)
  })()

  // When kcal changes and macros aren't manually locked → recalc macros
  const handleKcalChange = (v: number) => {
    setKcal(v)
    if (!macroLocked) {
      const m = kcalToMacros(v)
      setProtein(m.protein)
      setCarbs(m.carbs)
      setFat(m.fat)
    }
  }

  // When a macro changes → recalc kcal from macros
  const handleMacroChange = (which: 'protein' | 'carbs' | 'fat', v: number) => {
    setMacroLocked(true)
    const p = which === 'protein' ? v : protein
    const c = which === 'carbs' ? v : carbs
    const f = which === 'fat' ? v : fat
    if (which === 'protein') setProtein(v)
    if (which === 'carbs') setCarbs(v)
    if (which === 'fat') setFat(v)
    setKcal(macrosToKcal(p, c, f))
  }

  // Reset to standard split
  const resetMacros = () => {
    setMacroLocked(false)
    const m = kcalToMacros(kcal)
    setProtein(m.protein)
    setCarbs(m.carbs)
    setFat(m.fat)
  }

  // Percentage display
  const totalMacroCal = macrosToKcal(protein, carbs, fat)
  const pPct = totalMacroCal > 0 ? Math.round((protein * 4 / totalMacroCal) * 100) : 0
  const cPct = totalMacroCal > 0 ? Math.round((carbs * 4 / totalMacroCal) * 100) : 0
  const fPct = totalMacroCal > 0 ? Math.round((fat * 9 / totalMacroCal) * 100) : 0

  const handleSave = () => {
    const cal = mode === 'manual' ? kcal : calcResult
    const m = mode === 'manual' ? { protein, carbs, fat } : kcalToMacros(cal)
    updateProfile.mutate(
      { cal_target: cal, protein_target: m.protein, carbs_target: m.carbs, fat_target: m.fat, gender, age, weight, height, activity, goal },
      { onSuccess: onClose }
    )
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-t-[24px] w-full max-w-[480px] max-h-[85vh] flex flex-col">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
          <div className="px-4 pb-2">
            <h3 className="font-display text-[18px] font-extrabold text-dark">Kalorienziel</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="flex bg-background rounded-btn p-0.5 mb-4" style={{ border: '1.5px solid #EBEBEB' }}>
              <button onClick={() => setMode('manual')}
                className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${mode === 'manual' ? 'bg-white text-dark' : 'text-muted'}`}>
                Manuell
              </button>
              <button onClick={() => setMode('calc')}
                className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${mode === 'calc' ? 'bg-white text-dark' : 'text-muted'}`}>
                Berechnen
              </button>
            </div>

            {mode === 'manual' ? (
              <div className="space-y-4">
                <NumInput label="Kalorien pro Tag" value={kcal} onChange={handleKcalChange} unit="kcal" min={800} max={8000} />

                {/* Macro distribution */}
                <div className="pt-3" style={{ borderTop: '1px solid #EBEBEB' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Makroverteilung</span>
                    {macroLocked && (
                      <button onClick={resetMacros} className="text-[10px] font-bold text-primary">Standard (30/40/30)</button>
                    )}
                  </div>

                  {/* Visual bar */}
                  <div className="flex h-2 rounded-full overflow-hidden mb-3">
                    <div style={{ width: `${pPct}%`, backgroundColor: '#3B82F6' }} />
                    <div style={{ width: `${cPct}%`, backgroundColor: '#F59E0B' }} />
                    <div style={{ width: `${fPct}%`, backgroundColor: '#EF4444' }} />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                        <span className="text-[9px] font-bold text-muted uppercase">Protein</span>
                        <span className="text-[9px] text-muted ml-auto">{pPct}%</span>
                      </div>
                      <NumInput label="" value={protein} onChange={(v) => handleMacroChange('protein', v)} unit="g" max={500} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <span className="text-[9px] font-bold text-muted uppercase">Carbs</span>
                        <span className="text-[9px] text-muted ml-auto">{cPct}%</span>
                      </div>
                      <NumInput label="" value={carbs} onChange={(v) => handleMacroChange('carbs', v)} unit="g" max={800} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                        <span className="text-[9px] font-bold text-muted uppercase">Fett</span>
                        <span className="text-[9px] text-muted ml-auto">{fPct}%</span>
                      </div>
                      <NumInput label="" value={fat} onChange={(v) => handleMacroChange('fat', v)} unit="g" max={400} />
                    </div>
                  </div>

                  <p className="text-[10px] text-muted mt-2">= {totalMacroCal} kcal aus Makros</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-2 uppercase tracking-wider">Geschlecht</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ id: 'male', label: 'Mann' }, { id: 'female', label: 'Frau' }].map((g) => (
                      <button key={g.id} onClick={() => setGender(g.id)}
                        className={`py-2.5 rounded-btn text-center text-[12px] font-bold ${gender === g.id ? 'bg-green-50 text-primary' : 'bg-background text-muted'}`}
                        style={{ border: gender === g.id ? '2px solid #028350' : '1.5px solid #EBEBEB' }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumInput label="Alter" value={age} onChange={setAge} unit="J" min={10} max={99} />
                  <NumInput label="Gewicht" value={weight} onChange={setWeight} unit="kg" min={30} max={250} />
                  <NumInput label="Größe" value={height} onChange={setHeight} unit="cm" min={100} max={230} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Aktivität</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[{ v: 1.2, l: '🛋️ Wenig' }, { v: 1.375, l: '🚶 Leicht' }, { v: 1.55, l: '🏃 Moderat' }, { v: 1.725, l: '💪 Sehr aktiv' }].map((a) => (
                      <button key={a.v} onClick={() => setActivity(a.v)}
                        className={`py-2 rounded-btn text-[11px] font-bold ${activity === a.v ? 'bg-green-50 text-primary' : 'bg-background text-muted'}`}
                        style={{ border: activity === a.v ? '2px solid #028350' : '1.5px solid #EBEBEB' }}>
                        {a.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Ziel</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{ v: 'lose', l: '📉 Abnehmen' }, { v: 'maintain', l: '⚖️ Halten' }, { v: 'gain', l: '📈 Zunehmen' }].map((g) => (
                      <button key={g.v} onClick={() => setGoal(g.v)}
                        className={`py-2 rounded-btn text-[10px] font-bold ${goal === g.v ? 'bg-green-50 text-primary' : 'bg-background text-muted'}`}
                        style={{ border: goal === g.v ? '2px solid #028350' : '1.5px solid #EBEBEB' }}>
                        {g.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-green-50 rounded-card p-4 text-center" style={{ border: '1.5px solid #FDBA74' }}>
                  <span className="text-[11px] font-bold text-muted block mb-1">Dein Kalorienbedarf</span>
                  <span className="font-display text-[32px] font-extrabold text-primary">{calcResult}</span>
                  <span className="text-[14px] font-bold text-muted ml-1">kcal</span>
                </div>
              </div>
            )}

            <button onClick={handleSave} disabled={updateProfile.isPending}
              className="w-full mt-4 py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800 disabled:opacity-50">
              {updateProfile.isPending ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
