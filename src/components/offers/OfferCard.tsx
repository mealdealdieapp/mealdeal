import { memo } from 'react'
import { Plus, Heart, UtensilsCrossed, Sparkles, Leaf, MapPin } from 'lucide-react'
import type { Offer } from '../../types/app.types'

interface OfferCardProps {
  offer: Offer
  onAddToShopping: (offer: Offer) => void
  onToggleWatchlist: (offer: Offer) => void
  isWatched: boolean
  recipeCount?: number
  onShowRecipes?: (offer: Offer) => void
}

// Grundpreis-Formatierung: "3,99 €/kg", "1,25 €/L", "0,33 €/Stk"
function formatBasePrice(basePrice: number | null, baseUnit: string | null): string | null {
  if (basePrice == null || !baseUnit) return null
  const price = Number(basePrice)
  if (!isFinite(price) || price <= 0) return null
  const unitLabel =
    baseUnit === 'kg' ? '€/kg' :
    baseUnit === 'l' ? '€/L' :
    baseUnit === 'stk' ? '€/Stk' :
    `€/${baseUnit}`
  return `${price.toFixed(2).replace('.', ',')} ${unitLabel}`
}

export const OfferCard = memo(function OfferCard({
  offer,
  onAddToShopping,
  onToggleWatchlist,
  isWatched,
  recipeCount,
  onShowRecipes,
}: OfferCardProps) {
  const basePriceLabel = formatBasePrice(offer.base_price, offer.base_unit)
  const isRealDeal = offer.is_real_deal === true
  const isBio = offer.is_bio === true
  const isRegional = offer.is_regional === true
  const realDiscount = offer.real_discount_percent

  return (
    <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
      <div className="flex items-start gap-3">
        <span className="text-[30px] leading-none shrink-0 mt-0.5">
          {offer.emoji ?? '🛒'}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-extrabold text-dark text-[14px] leading-snug">
            {offer.product_name}
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            {offer.store}
            {offer.brand ? ` · ${offer.brand}` : ''}
            {offer.quantity ? ` · ${offer.quantity}` : ''}
          </p>

          {/* Mini-Badges: Bio, Regional */}
          {(isBio || isRegional) && (
            <div className="flex gap-1.5 mt-1.5">
              {isBio && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-green-800 bg-green-100 px-1.5 py-0.5 rounded-pill">
                  <Leaf size={9} />
                  Bio
                </span>
              )}
              {isRegional && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-pill">
                  <MapPin size={9} />
                  Regional
                </span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-[18px] font-extrabold text-primary">
              {Number(offer.offer_price).toFixed(2)}€
            </span>
            {offer.original_price != null && (
              <span className="text-[12px] text-muted line-through">
                {Number(offer.original_price).toFixed(2)}€
              </span>
            )}
            {basePriceLabel && (
              <span className="text-[10px] text-muted ml-auto">
                {basePriceLabel}
              </span>
            )}
          </div>

          {/* Echter-Deal Label */}
          {isRealDeal && (
            <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-pill">
              <Sparkles size={10} />
              Echter Deal{realDiscount && realDiscount > 0 ? ` · ${realDiscount}% unter Median` : ''}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          {offer.discount_percent != null && offer.discount_percent > 0 && (
            <span className="text-[11px] font-bold text-white bg-success px-2.5 py-1 rounded-pill">
              -{offer.discount_percent}%
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(offer) }}
              className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100"
              style={{ border: '1.5px solid #EBEBEB' }}
            >
              <Heart size={15} className={isWatched ? 'fill-red-500 text-red-500' : 'text-muted'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddToShopping(offer) }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-green-50 active:bg-green-100"
            >
              <Plus size={15} className="text-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Recipe match badge */}
      {recipeCount != null && recipeCount > 0 && onShowRecipes && (
        <button
          onClick={(e) => { e.stopPropagation(); onShowRecipes(offer) }}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 bg-amber-50 rounded-btn active:bg-amber-100 transition-colors"
          style={{ border: '1px solid #FDE68A' }}
        >
          <UtensilsCrossed size={13} className="text-amber-600" />
          <span className="text-[11px] font-bold text-amber-700">
            {recipeCount} Rezept{recipeCount !== 1 ? 'e' : ''} mit diesem Produkt
          </span>
        </button>
      )}
    </div>
  )
})
