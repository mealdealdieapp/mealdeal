import { ShoppingItemRow } from './ShoppingItem'
import type { MarketGroup } from '../../hooks/useShopping'

interface ShoppingListProps {
  marketGroups: MarketGroup[]
  onToggle: (id: string, checked: boolean) => void
  onRemove: (id: string) => void
}

export function ShoppingList({ marketGroups, onToggle, onRemove }: ShoppingListProps) {
  if (marketGroups.length === 0) {
    return (
      <div className="py-16 text-center">
        <span className="text-[40px] block mb-3">🛒</span>
        <p className="text-[14px] text-gray-400">Einkaufsliste ist leer</p>
        <p className="text-[12px] text-gray-300 mt-1">Füge Zutaten aus Rezepten hinzu</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {marketGroups.map((group) => (
        <div
          key={group.store}
          className="bg-white rounded-[16px] overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          {/* Market header */}
          <div className="px-4 py-2.5 bg-gray-50/80 flex items-center justify-between border-b border-gray-50">
            <span className="text-[12px] font-bold text-gray-700">
              {group.store}
            </span>
            <div className="flex items-center gap-2">
              {group.offerCount > 0 && (
                <span className="text-[10px] text-success font-semibold">
                  {group.offerCount} Angebot{group.offerCount !== 1 ? 'e' : ''}
                </span>
              )}
              {group.totalSavings > 0 && (
                <span className="text-[10px] font-bold text-white bg-success px-1.5 py-0.5 rounded-full">
                  -{group.totalSavings.toFixed(2)} EUR
                </span>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-50">
            {group.items.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={() => onToggle(item.id, !(item.checked ?? false))}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
