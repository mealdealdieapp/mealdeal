export const CATEGORY_MAPPING: Record<string, string[]> = {
  'Backzutaten': ['Backwaren', 'Sonstiges Lebensmittel'],
  'Brot & Wraps': ['Brot & Wraps', 'Backwaren'],
  'Fisch & Meeresfrüchte': ['Fisch & Meeresfrüchte', 'Tiefkühl'],
  'Fleisch': ['Fleisch', 'Tiefkühl'],
  'Gemüse': ['Gemüse', 'Tiefkühl'],
  'Gewürze': ['Gewürze', 'Sonstiges Lebensmittel'],
  'Hülsenfrüchte': ['Hülsenfrüchte', 'Konserven'],
  'Käse': ['Käse', 'Milch & Eier'],
  'Konserven': ['Konserven', 'Sonstiges Lebensmittel'],
  'Milch & Eier': ['Milch & Eier'],
  'Nudeln & Reis': ['Nudeln & Reis'],
  'Nüsse & Samen': ['Sonstiges Lebensmittel'],
  'Obst': ['Obst', 'Tiefkühl'],
  'Öle & Fette': ['Öle & Fette'],
  'Sonstiges': ['Sonstiges Lebensmittel', 'Gewürze', 'Konserven'],
  'Soßen & Pasten': ['Gewürze', 'Konserven', 'Sonstiges Lebensmittel'],
  'Tofu & Fleischersatz': ['Tiefkühl', 'Sonstiges Lebensmittel'],
};

export function getAllowedOfferCategories(ingredientCategory: string | null): string[] | null {
  if (!ingredientCategory) return null;
  return CATEGORY_MAPPING[ingredientCategory] ?? null;
}
