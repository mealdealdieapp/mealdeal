/**
 * Mapping von Pantry-Set-IDs (gewaehlt im Onboarding/Profil) zu Substring-Mustern,
 * die in Zutatennamen geprueft werden. Wenn ein User ein Set aktiviert hat,
 * werden alle Zutaten mit passendem Pattern beim Einkaufszettel-Add automatisch
 * uebersprungen ("habe ich schon").
 *
 * Die Patterns sind absichtlich konservativ: lieber 1-2 Zutaten zu wenig ausfiltern
 * (User sieht sie auf der Liste) als zu viel rauswerfen.
 */
export const PANTRY_PATTERNS: Record<string, string[]> = {
  'salt-pepper': ['salz', 'pfeffer'],
  'oil-vinegar': ['olivenöl', 'sonnenblumenöl', 'rapsöl', 'essig', 'balsamico'],
  'sugar-flour': ['zucker', 'puderzucker', 'mehl'],
  'baking': ['backpulver', 'hefe', 'vanilleextrakt', 'kakaopulver', 'kartoffelstärke', 'gelatine'],
  'spices-base': [
    'paprikapulver', 'chilipulver', 'chiliflocken', 'kreuzkümmel',
    'oregano', 'majoran', 'rosmarin', 'lorbeer', 'zimt', 'muskat',
    'currypulver',
  ],
  'spices-asian': [
    'sojasauce', 'teriyaki', 'sesamöl', 'ingwer', 'fischsauce',
    'currypaste', 'galgant', 'kaffir', 'zitronengras',
  ],
  'spices-med': [
    'knoblauch', 'basilikum', 'tomatenmark', 'oliven',
  ],
  'condiments': [
    'senf', 'mayonnaise', 'bbq-sauce', 'caesar dressing', 'pad thai sauce',
    'salsa', 'hummus', 'tahini',
  ],
}

/**
 * Liefert true, wenn die uebergebene Zutat in einem der aktivierten Pantry-Sets enthalten ist.
 * Vergleich ist case-insensitive auf Substring-Basis.
 */
export function isInPantry(ingredientName: string, activePantrySets: string[]): boolean {
  if (!activePantrySets || activePantrySets.length === 0) return false
  const name = ingredientName.toLowerCase().trim()
  if (!name) return false

  for (const set of activePantrySets) {
    const patterns = PANTRY_PATTERNS[set]
    if (!patterns) continue
    for (const p of patterns) {
      if (name.includes(p)) return true
    }
  }
  return false
}
