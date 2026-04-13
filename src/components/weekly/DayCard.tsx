import { useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { MEALS } from '../../hooks/useWeeklyPlan'
import { OptimizedImage } from '../ui/OptimizedImage'
import type { DayKey, MealKey, PlanRecipe } from '../../hooks/useWeeklyPlan'

const DAY_LABELS: Record<string, string> = {
  Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag',
  Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag',
}
const MEAL_LABELS: Record<string, string> = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snacks' }
const MEAL_EMOJI: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🥨' }

export { DAY_LABELS, MEAL_LABELS, MEAL_EMOJI }

export function DayCard({ day, isToday, label, defaultOpen, onToggle, getSlotRecipes, getDayStats, onAddMeal, onRemoveRecipe }: {
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

function MealSection({ meal, recipes, onAdd, onRemove }: {
  meal: MealKey; recipes: PlanRecipe[]; onAdd: () => void; onRemove: (index: number) => void
}) {
  return (
    <div>
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
          {recipes.map((recipe, i) => (
            <div key={`${recipe.id}-${i}`} className="flex items-center gap-2.5 py-1.5">
              <OptimizedImage src={recipe.image_url} alt={recipe.name} size="thumb" fallback={recipe.emoji ?? '🍽️'} className="w-9 h-9 shrink-0" style={{ borderRadius: '7px' }} />
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
          ))}
        </div>
      )}
    </div>
  )
}
