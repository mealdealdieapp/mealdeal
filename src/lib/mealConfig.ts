export const MEAL_CONFIG: Record<string, { label: string; emoji: string; image: string }> = {
  breakfast: {
    label: 'Frühstück',
    emoji: '🌅',
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
  },
  lunch: {
    label: 'Mittagessen',
    emoji: '☀️',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80',
  },
  dinner: {
    label: 'Abendessen',
    emoji: '🌙',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  },
  snack: {
    label: 'Snacks',
    emoji: '🥨',
    image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&q=80',
  },
  dessert: {
    label: 'Dessert',
    emoji: '🍰',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
  },
  salad: {
    label: 'Salate',
    emoji: '🥗',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  },
  soup: {
    label: 'Suppen',
    emoji: '🍲',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
  },
  baking: {
    label: 'Backen',
    emoji: '🥐',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  },
  date_night: {
    label: 'Date Night',
    emoji: '🕯️',
    image: 'https://images.unsplash.com/photo-1770678724670-e96395edf4ac?w=800&q=80',
  },
  cocktail: {
    label: 'Cocktails & Drinks',
    emoji: '🍹',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
  },
  // Virtual categories (derived from recipe properties, not meal field)
  quick: {
    label: 'Unter 15 Min',
    emoji: '⚡',
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80',
  },
  budget: {
    label: 'Günstig diese Woche',
    emoji: '💰',
    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
  },
  meal_prep: {
    label: 'Meal Prep',
    emoji: '📦',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
  },
  other: {
    label: 'Sonstiges',
    emoji: '🍽️',
    image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80',
  },
}

// Virtual categories derived from recipe properties, not the meal field
export const VIRTUAL_CATEGORIES = ['quick', 'budget', 'meal_prep'] as const

// Display order for all categories (excluding 'other')
export const CATEGORY_ORDER = [
  'breakfast', 'lunch', 'dinner',
  'quick', 'budget', 'meal_prep',
  'snack', 'dessert', 'salad',
  'soup', 'baking', 'date_night', 'cocktail',
] as const

export function getMealLabel(meal: string | null): string {
  if (!meal) return 'Sonstiges'
  return MEAL_CONFIG[meal]?.label ?? meal
}

export function getMealEmoji(meal: string | null): string {
  if (!meal) return '🍽️'
  return MEAL_CONFIG[meal]?.emoji ?? '🍽️'
}

export function getMealImage(meal: string | null): string {
  if (!meal) return MEAL_CONFIG.other.image
  return MEAL_CONFIG[meal]?.image ?? MEAL_CONFIG.other.image
}

export const IMAGE_BASE_URL =
  'https://wjhesvkapqrsbibqjbtr.supabase.co/storage/v1/object/public/recipe-images/'
