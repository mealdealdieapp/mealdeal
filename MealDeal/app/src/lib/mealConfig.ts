export const MEAL_CONFIG: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: 'Frühstück', emoji: '🌅' },
  lunch: { label: 'Mittagessen', emoji: '☀️' },
  dinner: { label: 'Abendessen', emoji: '🌙' },
  snack: { label: 'Snacks', emoji: '🥨' },
  dessert: { label: 'Dessert', emoji: '🍰' },
  salad: { label: 'Salate', emoji: '🥗' },
  soup: { label: 'Suppen', emoji: '🍲' },
  baking: { label: 'Backen', emoji: '🥐' },
  date_night: { label: 'Date Night', emoji: '🕯️' },
  cocktail: { label: 'Cocktails & Drinks', emoji: '🍹' },
  quick: { label: 'Unter 15 Min', emoji: '⚡' },
  budget: { label: 'Unter 5€', emoji: '💰' },
  meal_prep: { label: 'Meal Prep', emoji: '📦' },
  other: { label: 'Sonstiges', emoji: '🍽️' },
};

export const VIRTUAL_CATEGORIES = ['quick', 'budget', 'meal_prep'] as const;

export const CATEGORY_ORDER = [
  'breakfast', 'lunch', 'dinner',
  'quick', 'budget', 'meal_prep',
  'snack', 'dessert', 'salad',
  'soup', 'baking', 'date_night', 'cocktail',
] as const;

export function getMealLabel(meal: string | null): string {
  if (!meal) return 'Sonstiges';
  return MEAL_CONFIG[meal]?.label ?? meal;
}

export function getMealEmoji(meal: string | null): string {
  if (!meal) return '🍽️';
  return MEAL_CONFIG[meal]?.emoji ?? '🍽️';
}
