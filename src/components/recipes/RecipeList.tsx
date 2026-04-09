import { RecipeCard } from './RecipeCard'
import type { ScoredRecipe } from '../../hooks/useRecipes'

interface RecipeListProps {
  recipes: ScoredRecipe[]
  onOpen: (recipe: ScoredRecipe) => void
  onToggleSave: (recipeId: string) => void
  isSaved: (recipeId: string) => boolean
}

export function RecipeList({ recipes, onOpen, onToggleSave, isSaved }: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <p className="text-center text-gray-400 py-16 text-[14px]">
        Keine Rezepte gefunden
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onOpen={onOpen}
          onToggleSave={onToggleSave}
          isSaved={isSaved(recipe.id)}
        />
      ))}
    </div>
  )
}
