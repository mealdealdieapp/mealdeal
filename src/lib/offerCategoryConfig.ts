export interface OfferCatConfig {
  label: string
  image: string
  fallbackColor: string
  section: 'food' | 'other'
}

// Sorted by Ernährungspyramide
export const OFFER_CATEGORY_ORDER: string[] = [
  // Lebensmittel
  'Gemüse',
  'Obst',
  'Fleisch',
  'Fisch & Meeresfrüchte',
  'Milch & Eier',
  'Käse',
  'Backwaren',
  'Brot & Wraps',
  'Nudeln & Reis',
  'Hülsenfrüchte',
  'Tiefkühl',
  'Konserven',
  'Getränke',
  'Snacks & Süßes',
  'Öle & Fette',
  'Gewürze',
  'Sonstiges Lebensmittel',
  // Nicht-Lebensmittel
  'Drogerie',
  'Haushalt',
]

export const OFFER_CATEGORY_CONFIG: Record<string, OfferCatConfig> = {
  'Gemüse': {
    label: 'Gemüse & Salat',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
    fallbackColor: '#166534',
    section: 'food',
  },
  'Obst': {
    label: 'Obst',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80',
    fallbackColor: '#C2410C',
    section: 'food',
  },
  'Fleisch': {
    label: 'Fleisch',
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80',
    fallbackColor: '#991B1B',
    section: 'food',
  },
  'Fisch & Meeresfrüchte': {
    label: 'Fisch & Meeresfrüchte',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80',
    fallbackColor: '#0E7490',
    section: 'food',
  },
  'Milch & Eier': {
    label: 'Milch & Eier',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80',
    fallbackColor: '#1E40AF',
    section: 'food',
  },
  'Käse': {
    label: 'Käse',
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&q=80',
    fallbackColor: '#92400E',
    section: 'food',
  },
  'Backwaren': {
    label: 'Backwaren',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    fallbackColor: '#78350F',
    section: 'food',
  },
  'Brot & Wraps': {
    label: 'Brot & Wraps',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    fallbackColor: '#78350F',
    section: 'food',
  },
  'Nudeln & Reis': {
    label: 'Nudeln & Reis',
    image: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&q=80',
    fallbackColor: '#854D0E',
    section: 'food',
  },
  'Hülsenfrüchte': {
    label: 'Hülsenfrüchte',
    image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800&q=80',
    fallbackColor: '#3F6212',
    section: 'food',
  },
  'Tiefkühl': {
    label: 'Tiefkühl',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
    fallbackColor: '#1E3A5F',
    section: 'food',
  },
  'Konserven': {
    label: 'Konserven',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=800&q=80',
    fallbackColor: '#713F12',
    section: 'food',
  },
  'Getränke': {
    label: 'Getränke',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80',
    fallbackColor: '#0C4A6E',
    section: 'food',
  },
  'Snacks & Süßes': {
    label: 'Snacks & Süßes',
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800&q=80',
    fallbackColor: '#9D174D',
    section: 'food',
  },
  'Öle & Fette': {
    label: 'Öle & Fette',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80',
    fallbackColor: '#78350F',
    section: 'food',
  },
  'Gewürze': {
    label: 'Gewürze & Saucen',
    image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=800&q=80',
    fallbackColor: '#7C2D12',
    section: 'food',
  },
  'Sonstiges Lebensmittel': {
    label: 'Sonstiges',
    image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80',
    fallbackColor: '#525252',
    section: 'food',
  },
  'Drogerie': {
    label: 'Drogerie & Pflege',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80',
    fallbackColor: '#6B21A8',
    section: 'other',
  },
  'Haushalt': {
    label: 'Haushalt & Reinigung',
    image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&q=80',
    fallbackColor: '#0F766E',
    section: 'other',
  },
}
