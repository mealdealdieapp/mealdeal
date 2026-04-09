// Mapping from DB category names to emojis
// Categories come from the database - this only maps display emojis
const CATEGORY_EMOJIS: Record<string, string> = {
  // Actual DB categories (with Umlauts)
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
  // Fallback variants
  'Obst & Gemüse': '🥬',
  'Fleisch & Wurst': '🥩',
  'Milchprodukte': '🧀',
  'Süßwaren': '🍬',
  'Sonstiges': '📦',
  'Tiernahrung': '🐾',
}

export function getCategoryEmoji(category: string | null): string {
  if (!category) return '📦'
  return CATEGORY_EMOJIS[category] ?? '🛒'
}
