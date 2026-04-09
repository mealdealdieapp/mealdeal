/**
 * MealDeal TypeScript Typen
 */

// ============================================
// NUTZER
// ============================================
export interface User {
  id: string;
  email: string;
  plz: string;
  ernaehrungsform: Ernaehrungsform;
  allergien: string[];
  vorlieben: string[];
  supermaerkte: Supermarkt[];
  haushalt_groesse: number;
  budget_pro_woche?: number;
  kcal_ziel?: number;
  ziel: 'abnehmen' | 'zunehmen' | 'halten';
  ist_premium: boolean;
}

export type Ernaehrungsform = 'omnivor' | 'vegetarisch' | 'vegan' | 'pescetarisch';

export type Supermarkt = 'rewe' | 'lidl' | 'aldi_sued' | 'aldi_nord' | 'edeka' | 'penny' | 'netto' | 'kaufland';

// ============================================
// REZEPTE
// ============================================
export interface Recipe {
  id: string;
  title: string;
  beschreibung: string;
  kategorie: Kategorie;
  unterkategorie?: string;
  tags: string[];
  zubereitungszeit_min: number;
  schwierigkeit: 'einfach' | 'mittel' | 'schwer';
  portionen: number;
  kcal: number;
  protein_g: number;
  kohlenhydrate_g: number;
  fett_g: number;
  ballaststoffe_g?: number;
  bild_url?: string;
  ernaehrungsformen: Ernaehrungsform[];
  allergene: string[];
  saison: string[];
  zutaten: RecipeIngredient[];
  zubereitung_schritte: ZubereitungsSchritt[];
}

export type Kategorie = 'fruehstueck' | 'mittag' | 'abendessen' | 'snack' | 'dessert';

export interface RecipeIngredient {
  zutat_name: string;
  zutat_kategorie: string;
  menge: number;
  einheit: string;
  ist_optional: boolean;
  notiz?: string;
}

export interface ZubereitungsSchritt {
  schritt: number;
  text: string;
}

// ============================================
// PRODUKTE & ANGEBOTE
// ============================================
export interface Product {
  id: string;
  name: string;
  marke?: string;
  produktkategorie: string;
  barcode?: string;
  uvp_preis?: number;
  bild_url?: string;
  kcal_pro_100g?: number;
}

export interface Offer {
  id: string;
  product_id?: string;
  supermarkt: Supermarkt;
  preis: number;
  uvp_preis?: number;
  rabatt_prozent?: number;
  gueltig_von: string;
  gueltig_bis: string;
  original_produktname: string;
  prospekt_bild_url?: string;
}

export interface OfferMatch {
  zutat: string;
  kategorie: string;
  bestes_angebot?: string;
  supermarkt?: Supermarkt;
  preis?: number;
  score: number;
  weitere_angebote: number;
}

// ============================================
// WOCHENPLAN
// ============================================
export interface WeeklyPlan {
  id: string;
  user_id: string;
  kalenderwoche: number;
  jahr: number;
  ist_ki_generiert: boolean;
  items: WeeklyPlanItem[];
}

export interface WeeklyPlanItem {
  id: string;
  wochentag: number; // 1=Mo, 7=So
  mahlzeit: 'fruehstueck' | 'mittag' | 'abendessen' | 'snack';
  recipe: Recipe;
  portionen: number;
}

// ============================================
// EINKAUFSLISTE
// ============================================
export interface ShoppingItem {
  id: string;
  zutat_name: string;
  menge?: number;
  einheit?: string;
  supermarkt?: Supermarkt;
  preis?: number;
  abgehakt: boolean;
  recipe_id?: string;
}

// ============================================
// NAVIGATION
// ============================================
export type RootTabParamList = {
  Discovery: undefined;
  Angebote: undefined;
  Wochenplan: undefined;
  Einkaufsliste: undefined;
  Profil: undefined;
};
