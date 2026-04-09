/**
 * MealDeal API Service
 * ====================
 * Alle Supabase-Abfragen an einem Ort.
 * Wird von den Screens importiert.
 */

import { supabase, isSupabaseConfigured } from './supabase';

// ============================================
// REZEPTE
// ============================================

/** Alle Rezepte laden (mit optionalem Filter) */
export async function fetchRecipes(opts?: {
  kategorie?: string;
  suchbegriff?: string;
  limit?: number;
}) {
  let query = supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)');

  if (opts?.kategorie && opts.kategorie !== 'alle') {
    query = query.eq('kategorie', opts.kategorie);
  }

  if (opts?.suchbegriff) {
    query = query.ilike('title', `%${opts.suchbegriff}%`);
  }

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query.order('title');

  if (error) {
    console.error('Fehler beim Laden der Rezepte:', error.message);
    return [];
  }

  return data || [];
}

/** Ein einzelnes Rezept laden */
export async function fetchRecipeById(id: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Fehler beim Laden des Rezepts:', error.message);
    return null;
  }

  return data;
}

/** Zufaelliges Rezept laden */
export async function fetchRandomRecipe() {
  // Alle IDs holen und eins zufaellig waehlen
  const { data, error } = await supabase
    .from('recipes')
    .select('id');

  if (error || !data || data.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * data.length);
  return fetchRecipeById(data[randomIndex].id);
}

// ============================================
// ANGEBOTE
// ============================================

/** Angebote laden (fuer eine PLZ-Region) */
export async function fetchOffers(opts?: {
  plzGebiet?: string;
  supermarkt?: string;
  limit?: number;
}) {
  let query = supabase
    .from('offers')
    .select('*')
    .gte('gueltig_bis', new Date().toISOString().slice(0, 10));

  if (opts?.plzGebiet) {
    query = query.eq('plz_gebiet', opts.plzGebiet);
  }

  if (opts?.supermarkt && opts.supermarkt !== 'Alle') {
    query = query.ilike('supermarkt', opts.supermarkt.toLowerCase());
  }

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query.order('preis', { ascending: true });

  if (error) {
    console.error('Fehler beim Laden der Angebote:', error.message);
    return [];
  }

  return data || [];
}

/** Angebote fuer eine bestimmte Zutat suchen */
export async function searchOffers(suchbegriff: string, plzGebiet?: string) {
  let query = supabase
    .from('offers')
    .select('*')
    .ilike('original_produktname', `%${suchbegriff}%`)
    .gte('gueltig_bis', new Date().toISOString().slice(0, 10));

  if (plzGebiet) {
    query = query.eq('plz_gebiet', plzGebiet);
  }

  const { data, error } = await query.order('preis', { ascending: true }).limit(20);

  if (error) {
    console.error('Fehler bei Angebots-Suche:', error.message);
    return [];
  }

  return data || [];
}

// ============================================
// EINKAUFSLISTE (lokal, da kein Auth)
// ============================================

// Einkaufsliste wird lokal im State verwaltet,
// da wir noch kein User-Auth haben.
// Spaeter: supabase.from('shopping_list')...

// ============================================
// PLZ-CACHE (pruefen ob Angebote aktuell sind)
// ============================================

export async function checkPlzCache(plzGebiet: string) {
  const { data, error } = await supabase
    .from('plz_cache')
    .select('*')
    .eq('plz_gebiet', plzGebiet)
    .single();

  if (error || !data) return null;
  return data;
}

// ============================================
// HILFSFUNKTIONEN
// ============================================

/** Alle verfuegbaren Supermaerkte aus Angeboten ermitteln */
export async function fetchSupermaerkte() {
  const { data, error } = await supabase
    .from('offers')
    .select('supermarkt')
    .gte('gueltig_bis', new Date().toISOString().slice(0, 10));

  if (error || !data) return ['Alle'];

  const unique = [...new Set(data.map((d: any) => d.supermarkt))].sort();
  return ['Alle', ...unique.map((s: string) => s.toUpperCase())];
}

/** Pruefen ob Supabase erreichbar ist */
export async function testConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.from('recipes').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
