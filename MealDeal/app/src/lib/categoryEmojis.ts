const CATEGORY_EMOJIS: Record<string, string> = {
  'Snacks & Süßes': '🍫',
  'Fleisch': '🥩',
  'Getränke': '🥤',
  'Käse': '🧀',
  'Tiefkühl': '🧊',
  'Milch & Eier': '🥛',
  'Backwaren': '🍞',
  'Obst': '🍎',
  'Gemüse': '🥕',
  'Sonstiges Lebensmittel': '🛒',
  'Fisch & Meeresfrüchte': '🐟',
  'Nudeln & Reis': '🍝',
  'Gewürze': '🧂',
  'Haushalt': '🧹',
  'Brot & Wraps': '🥖',
  'Öle & Fette': '🫒',
  'Konserven': '🥫',
  'Drogerie': '🧴',
  'Hülsenfrüchte': '🫘',
  'Obst & Gemüse': '🥬',
  'Fleisch & Wurst': '🥩',
  'Milchprodukte': '🧀',
  'Süßwaren': '🍬',
  'Sonstiges': '📦',
  'Tiernahrung': '🐾',
};

export function getCategoryEmoji(category: string | null): string {
  if (!category) return '📦';
  return CATEGORY_EMOJIS[category] ?? '🛒';
}
