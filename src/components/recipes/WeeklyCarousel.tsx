import { useWeeklyRecipes } from '../../hooks/useWeeklyRecipes'
import { Flame } from 'lucide-react'
import type { Recipe } from '../../types/app.types'
import { OptimizedImage } from '../ui/OptimizedImage'

interface Props {
  onOpen: (recipe: Recipe) => void
}

export function WeeklyCarousel({ onOpen }: Props) {
  const { data: recipes, isLoading } = useWeeklyRecipes()

  if (isLoading || !recipes || recipes.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Flame size={18} className="text-orange-500" />
        <h2 className="font-display font-extrabold text-[17px] text-dark">
          Diese Woche im Angebot
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar snap-x snap-mandatory">
        {recipes.map((recipe) => (
          <WeeklyCard key={recipe.id} recipe={recipe} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function WeeklyCard({ recipe, onOpen }: { recipe: Recipe; onOpen: (r: Recipe) => void }) {
  return (
    <button
      onClick={() => onOpen(recipe)}
      className="shrink-0 w-[200px] snap-start active:scale-[0.97] transition-transform"
    >
      <div
        className="relative w-full h-[140px] overflow-hidden"
        style={{ borderRadius: '16px' }}
      >
        {/* Optimiertes Bild: 200x140 statt volle Auflösung */}
        <OptimizedImage
          src={recipe.image_url}
          alt={recipe.name}
          size="card"
          fallback={recipe.emoji ?? '🍽️'}
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Badge */}
        <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded-pill">
          Neu diese Woche
        </span>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="font-display font-extrabold text-white text-[13px] leading-tight line-clamp-2">
            {recipe.emoji} {recipe.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {recipe.time_minutes && (
              <span className="text-[10px] text-white/80">{recipe.time_minutes} Min</span>
            )}
            {recipe.calories && (
              <span className="text-[10px] text-white/80">{recipe.calories} kcal</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
