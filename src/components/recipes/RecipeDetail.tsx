import { useState } from 'react'
import { X, Clock, ChefHat, Users, Minus, Plus, Tag, ShoppingCart, CheckCircle2, CalendarPlus } from 'lucide-react'
import type { Recipe } from '../../types/app.types'
import { useRecipeDetail } from '../../hooks/useRecipeDetail'
import { useAddToShopping } from '../../hooks/useAddToShopping'
import { useWeeklyPlan, DAYS, MEALS } from '../../hooks/useWeeklyPlan'
import { recipeToPlanRecipe } from '../../lib/recipeToPlanRecipe'
import { OptimizedImage } from '../ui/OptimizedImage'
import { Portal } from '../ui/Portal'
import { logger } from '../../lib/logger'
import type { DayKey, MealKey } from '../../hooks/useWeeklyPlan'

interface RecipeDetailProps {
  recipe: Recipe
  onClose: () => void
}

export function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  const [servings, setServings] = useState(recipe.servings ?? 2)
  const baseServings = recipe.servings ?? 2
  const multiplier = servings / baseServings

  const { ingredients, isLoading, totalSaved, matchCount } = useRecipeDetail(recipe.id)
  const { addMany } = useAddToShopping()
  const { addToSlot, getSlotRecipes, today } = useWeeklyPlan()
  const [toast, setToast] = useState<string | null>(null)
  const [showPlanPicker, setShowPlanPicker] = useState(false)

  const handleAddToShopping = () => {
    if (ingredients.length === 0) return
    const items = ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount != null ? ing.amount * multiplier : null,
      unit: ing.unit,
      category: recipe.name,
      offerId: ing.offerId,
      offerStore: ing.store,
      offerPrice: ing.offerPrice,
      offerOriginalPrice: ing.originalPrice,
      offerDiscountPercent: ing.discountPercent,
      offerProductName: ing.productName,
    }))
    addMany.mutate(items, {
      onSuccess: (count) => {
        setToast(`${count} Zutaten hinzugefügt`)
        setTimeout(() => setToast(null), 2000)
      },
    })
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex flex-col" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div className="relative mt-[10vh] h-[90vh] bg-background rounded-t-[24px] flex flex-col overflow-hidden max-w-[480px] mx-auto w-full">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Image — optimiert: Hero-Größe 480x280 statt volle Auflösung */}
            <div className="relative h-[220px] mx-4 rounded-[16px] overflow-hidden">
              <OptimizedImage
                src={recipe.image_url}
                alt={recipe.name}
                size="hero"
                fallback={recipe.emoji ?? '🍽️'}
                className="w-full h-full"
              />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <X size={16} className="text-dark" />
              </button>
              {recipe.tag && (
                <span
                  className="absolute top-3 left-3 text-[10px] font-bold text-white px-2.5 py-1 rounded-pill"
                  style={{ backgroundColor: recipe.tag_color ?? '#028350' }}
                >
                  {recipe.tag}
                </span>
              )}
            </div>

            <div className="px-4 pb-[100px]">
              <h2 className="font-display text-[20px] font-extrabold text-dark mt-4">{recipe.name}</h2>

              <div className="flex items-center gap-3 mt-2">
                {recipe.time_minutes && (
                  <span className="flex items-center gap-1 text-[12px] text-muted">
                    <Clock size={13} /> {recipe.time_minutes} Min
                  </span>
                )}
                {recipe.difficulty && (
                  <span className="flex items-center gap-1 text-[12px] text-muted">
                    <ChefHat size={13} /> {recipe.difficulty}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[12px] text-muted">
                  <Users size={13} /> {servings} Portionen
                </span>
              </div>

              {/* Savings */}
              {matchCount > 0 && (
                <div className="mt-3 bg-green-50 rounded-[14px] px-3.5 py-2.5 flex items-center gap-2">
                  <Tag size={15} className="text-success" />
                  <span className="text-[12px] font-bold text-success">
                    {matchCount} Zutat{matchCount !== 1 ? 'en' : ''} im Angebot
                    {totalSaved > 0 ? ` · ${totalSaved.toFixed(2)} EUR gespart` : ''}
                  </span>
                </div>
              )}

              {/* Servings */}
              <div className="mt-4 bg-white rounded-[14px] px-4 py-3 flex items-center justify-between" style={{ border: '1.5px solid #EBEBEB' }}>
                <span className="text-[13px] font-medium text-dark">Portionen</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setServings(Math.max(1, servings - 1))}
                    className="w-10 h-10 rounded-full bg-background flex items-center justify-center active:bg-gray-200">
                    <Minus size={14} className="text-dark" />
                  </button>
                  <span className="text-[16px] font-extrabold text-dark w-6 text-center">{servings}</span>
                  <button onClick={() => setServings(servings + 1)}
                    className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center active:bg-green-100">
                    <Plus size={14} className="text-primary" />
                  </button>
                </div>
              </div>

              {/* Macros */}
              <div className="mt-3 bg-white rounded-[14px] px-4 py-3 grid grid-cols-4 gap-2" style={{ border: '1.5px solid #EBEBEB' }}>
                <Macro label="kcal" value={Math.round((recipe.calories ?? 0) * multiplier)} />
                <Macro label="Protein" value={`${((Number(recipe.protein) || 0) * multiplier).toFixed(0)}g`} />
                <Macro label="Carbs" value={`${((Number(recipe.carbs) || 0) * multiplier).toFixed(0)}g`} />
                <Macro label="Fett" value={`${((Number(recipe.fat) || 0) * multiplier).toFixed(0)}g`} />
              </div>

              {/* Ingredients */}
              <h3 className="font-display text-[15px] font-extrabold text-dark mt-5 mb-2">Zutaten</h3>
              <div className="bg-white rounded-[14px] divide-y divide-gray-50 overflow-hidden" style={{ border: '1.5px solid #EBEBEB' }}>
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-[13px] text-muted">Zutaten laden...</div>
                ) : ingredients.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-muted">Keine Zutaten</div>
                ) : (
                  ingredients.map((ing) => (
                    <div key={ing.id} className="px-4 py-2.5 flex items-center gap-2.5">
                      <span className="text-[18px] w-6 text-center shrink-0">{ing.emoji ?? '🥄'}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] text-dark block">{ing.name}</span>
                        {ing.productName && (
                          <span className="text-[10px] text-primary block truncate">
                            {ing.store}: {ing.productName} {ing.offerPrice != null ? `${Number(ing.offerPrice).toFixed(2)} EUR` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted shrink-0">
                        {ing.amount != null ? `${fmt(ing.amount * multiplier)} ${ing.unit ?? ''}` : ''}
                      </span>
                      {ing.discountPercent != null && ing.discountPercent > 0 && (
                        <span className="text-[9px] font-bold text-success bg-green-50 px-1.5 py-0.5 rounded-pill shrink-0">
                          -{ing.discountPercent}%
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Steps */}
              {recipe.steps && recipe.steps.length > 0 && (
                <>
                  <h3 className="font-display text-[15px] font-extrabold text-dark mt-5 mb-2">Zubereitung</h3>
                  <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1.5px solid #EBEBEB' }}>
                    {recipe.steps.map((step, i) => (
                      <div key={i} className="px-4 py-3 flex gap-3 border-b border-gray-50 last:border-b-0">
                        <span className="w-6 h-6 rounded-full bg-green-50 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-[13px] text-dark/80 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sticky buttons */}
          <div className="shrink-0 px-4 py-3 bg-white flex gap-2" style={{ borderTop: '1.5px solid #EBEBEB' }}>
            <button
              onClick={handleAddToShopping}
              disabled={isLoading || ingredients.length === 0 || addMany.isPending}
              className="flex-1 py-3.5 bg-primary text-white font-bold text-[13px] rounded-btn flex items-center justify-center gap-2 active:bg-green-800 disabled:opacity-40"
            >
              <ShoppingCart size={16} />
              {addMany.isPending ? 'Hinzufügen...' : 'Einkaufsliste'}
            </button>
            <button
              onClick={() => setShowPlanPicker(true)}
              className="py-3.5 px-4 bg-white font-bold text-[13px] text-primary rounded-btn flex items-center justify-center gap-1.5 active:bg-background"
              style={{ border: '1.5px solid #EBEBEB' }}
            >
              <CalendarPlus size={16} /> Planen
            </button>
          </div>

          {/* Plan day/meal picker */}
          {showPlanPicker && (
            <PlanSlotPicker
              getSlotRecipes={getSlotRecipes}
              today={today}
              onSelect={async (day, meal) => {
                try {
                  const planRecipe = await recipeToPlanRecipe(recipe)
                  addToSlot.mutate(
                    { day, meal, recipe: planRecipe },
                    {
                      onSuccess: () => {
                        setToast(`${recipe.name} → ${DAY_SHORT[day]} ${MEAL_SHORT[meal]}`)
                        setTimeout(() => setToast(null), 2000)
                      },
                    }
                  )
                } catch (err) {
                  logger.error('Failed to add to plan:', err)
                }
                setShowPlanPicker(false)
              }}
              onClose={() => setShowPlanPicker(false)}
            />
          )}
        </div>

        {toast && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-dark text-white text-[13px] px-4 py-2.5 rounded-pill flex items-center gap-2 shadow-lg z-[60]">
            <CheckCircle2 size={16} className="text-success" />
            {toast}
          </div>
        )}
      </div>
    </Portal>
  )
}

const DAY_SHORT: Record<string, string> = { Mo: 'Mo', Di: 'Di', Mi: 'Mi', Do: 'Do', Fr: 'Fr', Sa: 'Sa', So: 'So' }
const MEAL_SHORT: Record<string, string> = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abend', snack: 'Snack' }
const MEAL_EMOJI_MAP: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🥨' }

function PlanSlotPicker({ getSlotRecipes, today, onSelect, onClose }: {
  getSlotRecipes: (day: DayKey, meal: MealKey) => { name: string }[]
  today: DayKey
  onSelect: (day: DayKey, meal: MealKey) => void
  onClose: () => void
}) {
  const [selectedDay, setSelectedDay] = useState<DayKey>(today)

  return (
    <div className="absolute inset-0 bg-white z-10 flex flex-col" style={{ borderRadius: '24px 24px 0 0' }}>
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid #EBEBEB' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[16px] font-extrabold text-dark">Wann kochen?</h3>
          <button onClick={onClose} className="text-[12px] font-bold text-primary">Abbrechen</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Day selector */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`shrink-0 px-3 py-2 rounded-btn text-[12px] font-bold transition-colors ${
                selectedDay === day ? 'bg-primary text-white' : 'bg-background text-muted'
              } ${day === today ? 'ring-1 ring-primary/30' : ''}`}
            >
              {DAY_SHORT[day]}
            </button>
          ))}
        </div>

        {/* Meal slots for selected day */}
        <div className="space-y-2">
          {MEALS.map((meal) => {
            const existing = getSlotRecipes(selectedDay, meal)
            return (
              <button
                key={meal}
                onClick={() => onSelect(selectedDay, meal)}
                className="w-full p-3.5 rounded-card text-left flex items-center gap-3 active:bg-background transition-colors"
                style={{ border: '1.5px solid #EBEBEB' }}
              >
                <span className="text-[20px]">{MEAL_EMOJI_MAP[meal]}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-display text-[14px] font-extrabold text-dark block">{MEAL_SHORT[meal]}</span>
                  {existing.length > 0 ? (
                    <span className="text-[11px] text-muted truncate block">{existing.length} Gericht{existing.length > 1 ? 'e' : ''}: {existing.map(r => r.name).join(', ')}</span>
                  ) : (
                    <span className="text-[11px] text-success">Frei</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function fmt(v: number): string {
  if (v >= 10) return Math.round(v).toString()
  return v === Math.round(v) ? v.toString() : v.toFixed(1)
}

function Macro({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[16px] font-extrabold text-dark">{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{label}</div>
    </div>
  )
}
