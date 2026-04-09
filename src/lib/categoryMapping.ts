// Maps ingredient categories → compatible offer categories
// Based on actual DB categories from both tables
//
// Ingredient categories: Backzutaten, Brot & Wraps, Fisch & Meeresfrüchte, Fleisch,
//   Gemüse, Gewürze, Hülsenfrüchte, Käse, Konserven, Milch & Eier, Nudeln & Reis,
//   Nüsse & Samen, Obst, Öle & Fette, Sonstiges, Soßen & Pasten, Tofu & Fleischersatz
//
// Offer categories: Backwaren, Brot & Wraps, Drogerie, Fisch & Meeresfrüchte, Fleisch,
//   Gemüse, Getränke, Gewürze, Haushalt, Hülsenfrüchte, Käse, Konserven, Milch & Eier,
//   Nudeln & Reis, Obst, Öle & Fette, Snacks & Süßes, Sonstiges Lebensmittel, Tiefkühl

// WICHTIG: "Sonstiges Lebensmittel" enthält 55% aller Angebote — darunter viele
// echte Basis-Lebensmittel (Zucker, Mehl, Honig, etc.) die nirgendwo sonst einsortiert sind.
// Daher muss JEDE Kategorie auch "Sonstiges Lebensmittel" im Pool haben,
// damit diese Angebote gefunden werden. Der Matching-Algorithmus in offerMatching.ts
// filtert Non-Food-Produkte über NON_FOOD_KEYWORDS und PROCESSED_PRODUCT_KEYWORDS heraus.
export const CATEGORY_MAPPING: Record<string, string[]> = {
  'Backzutaten':          ['Backwaren', 'Sonstiges Lebensmittel'],
  'Brot & Wraps':         ['Brot & Wraps', 'Backwaren', 'Sonstiges Lebensmittel'],
  'Fisch & Meeresfrüchte':['Fisch & Meeresfrüchte', 'Tiefkühl', 'Sonstiges Lebensmittel'],
  'Fleisch':              ['Fleisch', 'Tiefkühl', 'Sonstiges Lebensmittel'],
  'Gemüse':               ['Gemüse', 'Tiefkühl', 'Sonstiges Lebensmittel'],
  'Gewürze':              ['Gewürze', 'Sonstiges Lebensmittel'],
  'Hülsenfrüchte':        ['Hülsenfrüchte', 'Konserven', 'Sonstiges Lebensmittel'],
  'Käse':                 ['Käse', 'Milch & Eier', 'Sonstiges Lebensmittel'],
  'Konserven':            ['Konserven', 'Sonstiges Lebensmittel'],
  'Milch & Eier':         ['Milch & Eier', 'Sonstiges Lebensmittel'],
  'Nudeln & Reis':        ['Nudeln & Reis', 'Sonstiges Lebensmittel'],
  'Nüsse & Samen':        ['Sonstiges Lebensmittel'],
  'Obst':                 ['Obst', 'Tiefkühl', 'Sonstiges Lebensmittel'],
  'Öle & Fette':          ['Öle & Fette', 'Sonstiges Lebensmittel'],
  'Sonstiges':            ['Sonstiges Lebensmittel', 'Gewürze', 'Konserven'],
  'Soßen & Pasten':       ['Gewürze', 'Konserven', 'Sonstiges Lebensmittel'],
  'Tofu & Fleischersatz': ['Tiefkühl', 'Sonstiges Lebensmittel'],
}

export function getAllowedOfferCategories(ingredientCategory: string | null): string[] | null {
  if (!ingredientCategory) return null
  return CATEGORY_MAPPING[ingredientCategory] ?? null
}
