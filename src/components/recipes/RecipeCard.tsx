import { memo } from 'react'
import { Heart, Sparkles } from 'lucide-react'
import type { ScoredRecipe } from '../../hooks/useRecipes'
import { IMAGE_BASE_URL } from '../../lib/mealConfig'

interface RecipeCardProps {
  recipe: ScoredRecipe
  onOpen: (recipe: ScoredRecipe) => void
  onToggleSave: (recipeId: string) => void
  isSaved: boolean
}

export const RecipeCard = memo(function RecipeCard({ recipe, onOpen, onToggleSave, isSaved }: RecipeCardProps) {
  const imageUrl = recipe.image_url
    ? recipe.image_url.startsWith('ext:')
      ? recipe.image_url.slice(4)
      : `${IMAGE_BASE_URL}${encodeURIComponent(recipe.image_url)}`
    : null
  const hasSavings = recipe.saved != null && Number(recipe.saved) > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(recipe)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(recipe) }}
      className="w-full bg-white p-3 flex items-start gap-3 text-left active:scale-[0.98] transition-transform relative overflow-hidden cursor-pointer"
      style={{ borderRadius: '16px', border: '1.5px solid #EBEBEB' }}
    >
      {/* Image */}
      <div className="w-[80px] h-[80px] overflow-hidden shrink-0 bg-background flex items-center justify-center" style={{ borderRadius: '10px' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-[36px]">{recipe.emoji ?? '🍽️'}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-display font-extrabold text-dark text-[14px] leading-snug truncate">
          {recipe.name}
        </h3>

        <div className="flex items-center gap-1.5 mt-1">
          {recipe.time_minutes && (
            <span className="text-[11px] text-muted">
              {recipe.time_minutes} Min
            </span>
          )}
          {recipe.time_minutes && recipe.difficulty && (
            <span className="text-[11px] text-muted">·</span>
          )}
          {recipe.difficulty && (
            <span className="text-[11px] text-muted">
              {recipe.difficulty}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {recipe.perfectMatch && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-green-50 px-1.5 py-0.5 rounded-pill">
              <Sparkles size={10} /> Perfekt für dich
            </span>
          )}
          {hasSavings && (
            <span className="inline-block text-[10px] font-bold text-success bg-green-50 px-1.5 py-0.5 rounded-pill">
              +{Number(recipe.saved).toFixed(2)}€ sparen
            </span>
          )}
          {recipe.estimatedCost != null && recipe.estimatedCost > 0 && (
            <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-pill">
              ~{recipe.estimatedCost.toFixed(2)}€
            </span>
          )}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSave(recipe.id) }}
        className="w-10 h-10 flex items-center justify-center shrink-0 mt-1"
        style={{ borderRadius: '8px', border: '1.5px solid #EBEBEB' }}
      >
        <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-muted'} />
      </button>
    </div>
  )
})
