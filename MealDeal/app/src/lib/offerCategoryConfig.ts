export interface OfferCatConfig {
  label: string;
  emoji: string;
  fallbackColor: string;
  section: 'food' | 'other';
}

export const OFFER_CATEGORY_ORDER: string[] = [
  'Gemüse', 'Obst', 'Fleisch', 'Fisch & Meeresfrüchte',
  'Milch & Eier', 'Käse', 'Backwaren', 'Brot & Wraps',
  'Nudeln & Reis', 'Hülsenfrüchte', 'Tiefkühl', 'Konserven',
  'Getränke', 'Snacks & Süßes', 'Öle & Fette', 'Gewürze',
  'Sonstiges Lebensmittel', 'Drogerie', 'Haushalt',
];

export const OFFER_CATEGORY_CONFIG: Record<string, OfferCatConfig> = {
  'Gemüse': { label: 'Gemüse & Salat', emoji: '🥕', fallbackColor: '#166534', section: 'food' },
  'Obst': { label: 'Obst', emoji: '🍎', fallbackColor: '#C2410C', section: 'food' },
  'Fleisch': { label: 'Fleisch', emoji: '🥩', fallbackColor: '#991B1B', section: 'food' },
  'Fisch & Meeresfrüchte': { label: 'Fisch', emoji: '🐟', fallbackColor: '#0E7490', section: 'food' },
  'Milch & Eier': { label: 'Milch & Eier', emoji: '🥛', fallbackColor: '#1E40AF', section: 'food' },
  'Käse': { label: 'Käse', emoji: '🧀', fallbackColor: '#92400E', section: 'food' },
  'Backwaren': { label: 'Backwaren', emoji: '🍞', fallbackColor: '#78350F', section: 'food' },
  'Brot & Wraps': { label: 'Brot & Wraps', emoji: '🥖', fallbackColor: '#78350F', section: 'food' },
  'Nudeln & Reis': { label: 'Nudeln & Reis', emoji: '🍝', fallbackColor: '#854D0E', section: 'food' },
  'Hülsenfrüchte': { label: 'Hülsenfrüchte', emoji: '🫘', fallbackColor: '#3F6212', section: 'food' },
  'Tiefkühl': { label: 'Tiefkühl', emoji: '🧊', fallbackColor: '#1E3A5F', section: 'food' },
  'Konserven': { label: 'Konserven', emoji: '🥫', fallbackColor: '#713F12', section: 'food' },
  'Getränke': { label: 'Getränke', emoji: '🥤', fallbackColor: '#0C4A6E', section: 'food' },
  'Snacks & Süßes': { label: 'Snacks & Süßes', emoji: '🍫', fallbackColor: '#9D174D', section: 'food' },
  'Öle & Fette': { label: 'Öle & Fette', emoji: '🫒', fallbackColor: '#78350F', section: 'food' },
  'Gewürze': { label: 'Gewürze & Saucen', emoji: '🧂', fallbackColor: '#7C2D12', section: 'food' },
  'Sonstiges Lebensmittel': { label: 'Sonstiges', emoji: '🛒', fallbackColor: '#525252', section: 'food' },
  'Drogerie': { label: 'Drogerie & Pflege', emoji: '🧴', fallbackColor: '#6B21A8', section: 'other' },
  'Haushalt': { label: 'Haushalt', emoji: '🧹', fallbackColor: '#0F766E', section: 'other' },
};
