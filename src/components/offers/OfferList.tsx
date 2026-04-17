import { OfferCard } from './OfferCard'
import type { Offer } from '../../types/app.types'

interface OfferListProps {
  offers: Offer[]
  onAddToShopping: (offer: Offer) => void
  onToggleWatchlist: (offer: Offer) => void
  isWatched: (name: string) => boolean
  recipeCounts?: Map<string, number>
  onShowRecipes?: (offer: Offer) => void
}

export function OfferList({
  offers,
  onAddToShopping,
  onToggleWatchlist,
  isWatched,
  recipeCounts,
  onShowRecipes,
}: OfferListProps) {
  if (offers.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">Keine Angebote gefunden</p>
    )
  }

  return (
    <div className="space-y-2">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          onAddToShopping={onAddToShopping}
          onToggleWatchlist={onToggleWatchlist}
          isWatched={isWatched(offer.product_name)}
          recipeCount={recipeCounts?.get(offer.id)}
          onShowRecipes={onShowRecipes}
        />
      ))}
    </div>
  )
}
