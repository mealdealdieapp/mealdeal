import { getCategoryEmoji } from '../../lib/categoryEmojis'
import type { CategoryGroup } from '../../hooks/useOffers'

const PASTEL_BG: Record<string, string> = {
  'Fleisch': '#FEF2F2',
  'Gemüse': '#F0FDF4',
  'Obst': '#FFF7ED',
  'Milch & Eier': '#EFF6FF',
  'Käse': '#FFFBEB',
  'Getränke': '#F0F9FF',
  'Tiefkühl': '#EFF6FF',
  'Backwaren': '#FFFBEB',
  'Snacks & Süßes': '#FDF2F8',
  'Fisch & Meeresfrüchte': '#F0FDFA',
  'Nudeln & Reis': '#FFFBEB',
  'Gewürze': '#FEF3C7',
}

const CATEGORY_TEXT: Record<string, string> = {
  'Fleisch': '#991B1B',
  'Gemüse': '#166534',
  'Obst': '#9A3412',
  'Milch & Eier': '#1E40AF',
  'Käse': '#92400E',
  'Getränke': '#0C4A6E',
  'Tiefkühl': '#1E40AF',
  'Backwaren': '#92400E',
  'Snacks & Süßes': '#9D174D',
  'Fisch & Meeresfrüchte': '#115E59',
  'Nudeln & Reis': '#92400E',
  'Gewürze': '#78350F',
}

interface OfferCategoryProps {
  group: CategoryGroup
  onClick: () => void
}

export function OfferCategory({ group, onClick }: OfferCategoryProps) {
  const bg = PASTEL_BG[group.category] ?? '#F9FAFB'
  const textColor = CATEGORY_TEXT[group.category] ?? '#1A1A1A'

  return (
    <button
      onClick={onClick}
      className="rounded-card p-4 text-left flex flex-col gap-2.5 active:scale-[0.97] transition-transform"
      style={{ backgroundColor: bg }}
    >
      <span className="text-[32px] leading-none">{getCategoryEmoji(group.category)}</span>
      <div>
        <h3
          className="font-display font-extrabold text-[13px] leading-tight truncate"
          style={{ color: textColor }}
        >
          {group.category}
        </h3>
        <span className="text-[11px] text-muted mt-0.5 block">
          {group.offers.length} Angebot{group.offers.length !== 1 ? 'e' : ''}
        </span>
      </div>
      {group.bestDiscount > 0 && (
        <span className="text-[10px] font-bold text-success bg-green-50 px-2 py-0.5 rounded-pill self-start">
          bis -{group.bestDiscount}%
        </span>
      )}
    </button>
  )
}
