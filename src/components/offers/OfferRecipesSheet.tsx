import { useState } from 'react'
import { X, Clock, ShoppingCart, ChevronRight } from 'lucide-react'
import { Portal } from '../ui/Portal'
import { RecipeDetail } from '../recipes/RecipeDetail'
import { useOfferRecipes } from '../../hooks/useOfferRecipes'
import { useAddToShopping } from '../../hooks/useAddToShopping'
import { OptimizedImage } from '../ui/OptimizedImage'
import type { Recipe } from '../../types/app.types'

interface OfferRecipesSheetProps {
  offerName: string
  offerCategory: string | null
  onClose: () => void
}

export function OfferRecipesSheet({ offerName, offerCategory, onClose }: OfferRecipesSheetProps) {
  const matches = useOfferRecipes(offerName, offerCategory)
  const { addMany } = useAddToShopping()
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null)
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null)

  const handleAddMissing = (recipeId: string, missing: string[]) => {
    addMany.mutate(
      missing.map(name => ({
        name,
        amount: null,
        unit: null,
        category: null,
        offerStore: null,
        offerPrice: null,
        offerOriginalPrice: null,
        offerDiscountPercent: null,
        offerProductName: null,
      }))
    )
    setAddedRecipeId(recipeId)
    setTimeout(() => setAddedRecipeId(null), 2000)
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-t-[24px] w-full max-w-[480px] max-h-[85vh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-[16px] font-extrabold text-dark">Rezepte mit diesem Produkt</h3>
              <p className="text-[12px] text-muted mt-0.5 truncate">{offerName}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-background shrink-0 ml-2">
              <X size={16} className="text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {matches.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-[36px] block mb-2">🔍</span>
                <p className="text-[14px] text-muted">Keine passenden Rezepte gefunden</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-muted font-medium">
                  {matches.length} Rezept{matches.length !== 1 ? 'e' : ''} gefunden
                </p>

                {matches.map(({ recipe, missingIngredients, totalIngredients }) => {
                  const haveCount = totalIngredients - missingIngredients.length
                  const isAdded = addedRecipeId === recipe.id

                  return (
                    <div
                      key={recipe.id}
                      className="bg-white rounded-card overflow-hidden"
                      style={{ border: '1.5px solid #EBEBEB' }}
                    >
                      {/* Recipe row - clickable */}
                      <button
                        onClick={() => setOpenRecipe(recipe)}
                        className="w-full flex items-center gap-3 p-3 text-left active:bg-background transition-colors"
                      >
                        <OptimizedImage
                          src={recipe.image_url}
                          alt={recipe.name}
                          size="thumb"
                          fallback={recipe.emoji ?? '🍽️'}
                          className="w-14 h-14 shrink-0"
                          style={{ borderRadius: '12px' }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-semibold text-dark block truncate">{recipe.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {recipe.time_minutes && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted">
                                <Clock size={10} /> {recipe.time_minutes} Min
                              </span>
                            )}
                            <span className="text-[10px] text-muted">
                              {haveCount}/{totalIngredients} Zutaten
                            </span>
                            {recipe.saved != null && Number(recipe.saved) > 0 && (
                              <span className="text-[9px] font-bold text-white bg-success px-1.5 py-0.5 rounded-pill">
                                -{Number(recipe.saved).toFixed(2)}€
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted/40 shrink-0" />
                      </button>

                      {/* Missing ingredients upsell */}
                      {missingIngredients.length > 0 && (
                        <div className="px-3 pb-3" style={{ borderTop: '1px solid #F5F5F0' }}>
                          <p className="text-[10px] text-muted font-medium pt-2 pb-1.5">
                            Noch {missingIngredients.length} Zutat{missingIngredients.length !== 1 ? 'en' : ''} fehlen:
                          </p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {missingIngredients.slice(0, 5).map((name) => (
                              <span key={name} className="text-[10px] text-dark bg-background px-2 py-0.5 rounded-pill">
                                {name}
                              </span>
                            ))}
                            {missingIngredients.length > 5 && (
                              <span className="text-[10px] text-muted bg-background px-2 py-0.5 rounded-pill">
                                +{missingIngredients.length - 5} mehr
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddMissing(recipe.id, missingIngredients) }}
                            disabled={isAdded}
                            className={`w-full py-2 text-[11px] font-bold rounded-btn flex items-center justify-center gap-1.5 ${
                              isAdded
                                ? 'bg-green-50 text-success'
                                : 'bg-green-50 text-primary active:bg-green-100'
                            }`}
                          >
                            <ShoppingCart size={12} />
                            {isAdded ? 'Zur Einkaufsliste hinzugefügt' : `${missingIngredients.length} fehlende zur Einkaufsliste`}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}
    </Portal>
  )
}
