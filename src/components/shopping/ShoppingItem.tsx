import { Check, X } from 'lucide-react'
import type { ShoppingItemWithOffer } from '../../hooks/useShopping'

interface ShoppingItemProps {
  item: ShoppingItemWithOffer
  onToggle: () => void
  onRemove: () => void
}

export function ShoppingItemRow({ item, onToggle, onRemove }: ShoppingItemProps) {
  const isChecked = item.checked ?? false

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          isChecked ? 'bg-primary border-primary' : 'border-gray-300'
        }`}
      >
        {isChecked && <Check size={13} className="text-white" strokeWidth={3} />}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className={`text-[13px] block ${isChecked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {item.name}
          {item.amount != null && item.unit && (
            <span className="text-gray-400 font-normal"> · {Number(item.amount)}{item.unit}</span>
          )}
        </span>
        {item.category && (
          <span className="text-[10px] text-gray-400 block truncate">{item.category}</span>
        )}
        {item.matchedOffer && !isChecked && (
          <span className="text-[10px] text-primary font-medium block">
            {item.matchedOffer.store}: {item.matchedOffer.offerPrice.toFixed(2)} EUR
            {item.matchedOffer.discountPercent != null && item.matchedOffer.discountPercent > 0 && (
              <span className="text-success ml-1">-{item.matchedOffer.discountPercent}%</span>
            )}
          </span>
        )}
      </div>

      {/* Offer badge */}
      {item.matchedOffer && !isChecked && (
        <span className="text-[9px] font-bold text-white bg-success px-1.5 py-0.5 rounded-full shrink-0">
          Sale
        </span>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-10 h-10 flex items-center justify-center rounded-full shrink-0 active:bg-gray-100"
      >
        <X size={13} className="text-gray-300" />
      </button>
    </div>
  )
}
