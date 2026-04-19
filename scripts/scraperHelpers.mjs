/**
 * MealDeal Scraper Helpers
 *
 * Gesamtes Parsing & Normalisierungs-Wissen für den Scraper:
 * - parseQuantity:   "500g", "1,5L", "6x0,33L" → { amount, unit }
 * - calcBasePrice:   Menge + Preis → Grundpreis (€/kg, €/L, €/Stk)
 * - extractBrand:    erkennt ca. 120 bekannte deutsche Supermarkt-Marken
 * - detectBio:       erkennt Bio/Öko/Demeter/Naturland-Hinweise
 * - detectRegional:  "aus der Region", "Regional", etc.
 * - mapSubcategory:  "Fleisch" → "Rind" / "Schwein" / "Geflügel" / ...
 * - canonicalKey:    entfernt Marke, Menge, Stopwords → normalisierter Schlüssel
 *                    für Fuzzy-Dedup + Preishistorie
 */

// =============================================================
// MARKEN (erweitert werden über Zeit)
// =============================================================
export const KNOWN_BRANDS = [
  // Molkerei
  'Landliebe', 'Bärenmarke', 'Müller', 'Weihenstephan', 'Berchtesgadener Land',
  'Andechser', 'Ehrmann', 'Danone', 'Almighurt', 'Alpro', 'Hochland', 'Kerrygold',
  'Meggle', 'Président', 'Exquisa', 'Zott', 'Milram', 'Arla', 'Rama',
  // Fleisch/Wurst
  'Rügenwalder', 'Wiesenhof', 'Gutfried', 'Herta', 'Meica', 'Reinert',
  'Schwarzwälder', 'Sandel', 'Bella Italia',
  // Getränke
  'Coca-Cola', 'Coca Cola', 'Pepsi', 'Fanta', 'Sprite', 'Mezzo Mix', 'Schweppes',
  'Red Bull', 'Monster', 'Effect', 'Rockstar',
  'Gerolsteiner', 'Apollinaris', 'Vittel', 'Evian', 'Volvic', 'Adelholzener',
  'Krombacher', 'Warsteiner', 'Bitburger', 'Beck\'s', 'Becks', 'Veltins',
  'Jever', 'Paulaner', 'Erdinger', 'Radeberger', 'Astra', 'Flensburger',
  'Granini', 'Hohes C', 'Rauch', 'Valensina', 'Albi', 'Lift',
  // Süßes
  'Milka', 'Ritter Sport', 'Lindt', 'Ferrero', 'Kinder', 'Nutella',
  'Nestlé', 'Toblerone', 'Merci', 'Raffaello', 'Rocher', 'Duplo', 'Hanuta',
  'Haribo', 'Katjes', 'Mentos', 'Wrigley', 'Orbit', 'Fisherman\'s',
  // Snacks
  'Lay\'s', 'Lays', 'Chio', 'Funny-frisch', 'Ültje', 'Bahlsen', 'Leibniz',
  'Pringles', 'Doritos', 'Kelly\'s',
  // Müsli/Cerealien
  'Kellogg\'s', 'Kelloggs', 'Nestlé Fitness', 'Vitalis', 'Dr. Oetker',
  'Kölln', 'Seitenbacher', 'Brüggen',
  // Grundnahrung
  'Barilla', 'De Cecco', 'Buitoni', 'Birkel', '3 Glocken', 'Knorr', 'Maggi',
  'Uncle Ben\'s', 'Reis-Fit', 'Oryza', 'Mirácoli',
  'Rio Mare', 'Hengstenberg', 'Kühne', 'Homann', 'Thomy',
  'Bautz\'ner', 'Löwensenf', 'Heinz', 'Hela', 'Develey',
  // Kaffee/Tee
  'Jacobs', 'Dallmayr', 'Tchibo', 'Melitta', 'Mövenpick', 'Eduscho',
  'Teekanne', 'Messmer', 'Pompadour', 'Meßmer',
  // TK & Fertig
  'Iglo', 'Bofrost', 'Frosta', 'Ristorante', 'Wagner', 'Dr. Oetker Pizza',
  // Süßwaren International
  'Oreo', 'Snickers', 'Mars', 'Twix', 'Bounty', 'M&M\'s', 'KitKat',
  // Eigenmarken (werden oft speziell genannt)
  'Ja!', 'Gut & Günstig', 'K-Classic', 'K-Bio', 'K-Favourites',
  'Rewe Bio', 'Rewe Beste Wahl', 'Rewe Feine Welt',
  'Edeka Bio', 'Edeka Selection', 'Edeka Bestes aus unserer Heimat',
]

const BRAND_SORTED = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)

export function extractBrand(productName) {
  if (!productName) return null
  const lower = productName.toLowerCase()
  for (const brand of BRAND_SORTED) {
    const b = brand.toLowerCase()
    // Match als Wort-Anfang oder eigenständiges Wort
    if (lower.startsWith(b + ' ') || lower.startsWith(b) && productName.length === brand.length) {
      return brand
    }
    // Oder als Token innerhalb des Produktnamens
    const regex = new RegExp('(?:^|\\s)' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|\\s|,)', 'i')
    if (regex.test(productName)) return brand
  }
  return null
}

// =============================================================
// BIO / REGIONAL DETECTION
// =============================================================
const BIO_KEYWORDS = [
  'bio ', 'bio-', ' bio,', 'bio,', 'biologisch', 'öko', 'demeter',
  'naturland', 'bioland', 'eu-bio', 'dennree', 'alnatura', 'rewe bio',
  'k-bio', 'edeka bio', 'gut-bio', 'gut bio', 'ja! natürlich',
]

export function detectBio(productName) {
  if (!productName) return false
  const lower = ' ' + productName.toLowerCase() + ' '
  return BIO_KEYWORDS.some(kw => lower.includes(kw))
}

const REGIONAL_KEYWORDS = [
  'regional', 'aus der region', 'heimatgut', 'unsere heimat', 'bestes aus unserer heimat',
  'aus deutschland', 'deutsche', 'bayerisch', 'schwarzwäld', 'allgäu',
]

export function detectRegional(productName) {
  if (!productName) return false
  const lower = productName.toLowerCase()
  return REGIONAL_KEYWORDS.some(kw => lower.includes(kw))
}

// =============================================================
// QUANTITY PARSING
// =============================================================
const UNIT_NORMALIZE = {
  'g': 'g', 'gr': 'g', 'gramm': 'g',
  'kg': 'kg', 'kilo': 'kg', 'kilogramm': 'kg',
  'ml': 'ml', 'milliliter': 'ml',
  'l': 'l', 'ltr': 'l', 'liter': 'l',
  'stk': 'stk', 'stück': 'stk', 'st': 'stk',
  'cl': 'ml', // 1cl = 10ml
}

const UNIT_CONVERSION_TO_BASE = {
  'g': { base: 'kg', factor: 0.001 },
  'kg': { base: 'kg', factor: 1 },
  'ml': { base: 'l', factor: 0.001 },
  'l': { base: 'l', factor: 1 },
  'stk': { base: 'stk', factor: 1 },
}

/**
 * Parst Mengenangabe aus Produktname oder Marktguru-quantity-Feld.
 *
 * Beispiele:
 *   "Rinderhack 500g"          → { amount: 500, unit: 'g' }
 *   "Coca-Cola 1,5L"           → { amount: 1.5, unit: 'l' }
 *   "Radler 6x0,33l"           → { amount: 1.98, unit: 'l' }   (6 * 0.33)
 *   "Barilla Pasta 5x 500g"    → { amount: 2500, unit: 'g' }
 *   "Eier 10 Stück"            → { amount: 10, unit: 'stk' }
 *   "Apfel je 1kg"             → { amount: 1, unit: 'kg' }
 */
export function parseQuantity(productName, quantityField = null) {
  const sources = [quantityField, productName].filter(Boolean)
  for (const source of sources) {
    const result = tryParseQuantity(source)
    if (result) return result
  }
  return { amount: null, unit: null }
}

function tryParseQuantity(text) {
  if (!text && text !== 0) return null
  const clean = String(text).toLowerCase().replace(/,/g, '.')

  // Multiplikator-Format: "6x0.33l", "5 x 500g", "4X1l"
  const multMatch = clean.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|gr|gramm|ml|l|ltr|liter|cl|stück|stk|st)\b/)
  if (multMatch) {
    const count = parseFloat(multMatch[1])
    const num = parseFloat(multMatch[2])
    const rawUnit = multMatch[3]
    let unit = UNIT_NORMALIZE[rawUnit] || rawUnit
    let amount = count * num
    if (rawUnit === 'cl') amount = amount * 10 // cl → ml
    return { amount: round(amount), unit }
  }

  // Einfaches Format: "500g", "1.5l", "10 Stück", "1,5 kg"
  const simpleMatch = clean.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|gramm|ml|l|ltr|liter|cl|stück|stk|st)\b/)
  if (simpleMatch) {
    let num = parseFloat(simpleMatch[1])
    const rawUnit = simpleMatch[2]
    let unit = UNIT_NORMALIZE[rawUnit] || rawUnit
    if (rawUnit === 'cl') num = num * 10
    return { amount: round(num), unit }
  }

  // "je 1kg" - Gewichtspreis-Angabe ohne Packungsgröße
  const jeMatch = clean.match(/je\s+(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/)
  if (jeMatch) {
    const num = parseFloat(jeMatch[1])
    const unit = UNIT_NORMALIZE[jeMatch[2]] || jeMatch[2]
    return { amount: round(num), unit }
  }

  return null
}

function round(n) { return Math.round(n * 100) / 100 }

/**
 * Berechnet den Grundpreis (€/kg, €/L, €/Stk) aus Preis + Menge.
 * Gibt { basePrice, baseUnit } zurück.
 */
export function calcBasePrice(price, amount, unit) {
  if (!price || !amount || !unit) return { basePrice: null, baseUnit: null }
  const conv = UNIT_CONVERSION_TO_BASE[unit]
  if (!conv) return { basePrice: null, baseUnit: null }
  // basePrice = Preis pro Basis-Einheit (kg, l, stk)
  // amount in base-unit: amount * conv.factor
  const amountInBase = amount * conv.factor
  if (amountInBase <= 0) return { basePrice: null, baseUnit: null }
  const basePrice = price / amountInBase
  return {
    basePrice: round(basePrice),
    baseUnit: conv.base,
  }
}

// =============================================================
// UNTERKATEGORIEN (für Haupt-Kategorie "Fleisch", "Gemüse", etc.)
// =============================================================
const SUBCATEGORY_RULES = {
  'Fleisch': [
    { sub: 'Rind', keywords: ['rind', 'hack ', 'hackfleisch', 'rinder', 'tatar', 'roastbeef', 'entrecote', 'filet rind'] },
    { sub: 'Schwein', keywords: ['schwein', 'kassler', 'speck', 'schinken', 'eisbein', 'bauchfleisch', 'nacken', 'schnitzel schwein'] },
    { sub: 'Geflügel', keywords: ['hähnchen', 'huhn', 'pute', 'truthahn', 'ente ', 'gans', 'geflügel', 'chicken'] },
    { sub: 'Lamm', keywords: ['lamm', 'hammel'] },
    { sub: 'Wurst', keywords: ['wurst', 'salami', 'bratwurst', 'mettwurst', 'leberwurst', 'knacker', 'wiener', 'frankfurter', 'bockwurst'] },
    { sub: 'Aufschnitt', keywords: ['aufschnitt', 'schinken ', 'kochschinken', 'putenbrust', 'geflügelwurst'] },
    { sub: 'Wild', keywords: ['wild', 'hirsch', 'reh', 'wildschwein'] },
  ],
  'Gemüse': [
    { sub: 'Blattgemüse', keywords: ['salat', 'spinat', 'mangold', 'rucola', 'feldsalat', 'eisberg'] },
    { sub: 'Fruchtgemüse', keywords: ['tomate', 'paprika', 'aubergine', 'zucchini', 'gurke', 'kürbis'] },
    { sub: 'Wurzelgemüse', keywords: ['karotte', 'möhre', 'rote bete', 'sellerie', 'pastinake', 'rettich', 'kartoffel'] },
    { sub: 'Kohl', keywords: ['kohl', 'brokkoli', 'blumenkohl', 'rosenkohl', 'wirsing', 'kohlrabi'] },
    { sub: 'Zwiebelgemüse', keywords: ['zwiebel', 'knoblauch', 'lauch', 'porree', 'schalotte'] },
    { sub: 'Hülsenfrüchte', keywords: ['bohne', 'erbse', 'linse', 'kichererbse'] },
    { sub: 'Pilze', keywords: ['champignon', 'pilz', 'pfifferling', 'steinpilz', 'shiitake'] },
  ],
  'Obst': [
    { sub: 'Kernobst', keywords: ['apfel', 'birne', 'quitte'] },
    { sub: 'Steinobst', keywords: ['pfirsich', 'nektarine', 'pflaume', 'kirsche', 'aprikose'] },
    { sub: 'Beeren', keywords: ['erdbeere', 'himbeere', 'heidelbeere', 'blaubeere', 'brombeere', 'johannisbeere', 'cranberry', 'stachelbeere'] },
    { sub: 'Zitrusfrüchte', keywords: ['orange', 'zitrone', 'limette', 'mandarine', 'clementine', 'grapefruit', 'pomelo'] },
    { sub: 'Exotisches Obst', keywords: ['banane', 'ananas', 'mango', 'papaya', 'kiwi', 'avocado', 'drachenfrucht', 'granatapfel'] },
    { sub: 'Weintrauben', keywords: ['traube'] },
    { sub: 'Melone', keywords: ['melone', 'wasserm', 'honigmelone'] },
  ],
  'Milch & Eier': [
    { sub: 'Milch', keywords: ['milch', 'vollmilch', 'h-milch'] },
    { sub: 'Joghurt', keywords: ['joghurt', 'yoghurt', 'skyr', 'kefir'] },
    { sub: 'Butter', keywords: ['butter'] },
    { sub: 'Sahne', keywords: ['sahne', 'schlagobers', 'crème fraîche', 'creme fraiche', 'schmand', 'sour cream'] },
    { sub: 'Quark', keywords: ['quark', 'topfen'] },
    { sub: 'Eier', keywords: ['eier', 'ei ', 'wachteleier'] },
    { sub: 'Pflanzendrink', keywords: ['haferdrink', 'sojadrink', 'mandeldrink', 'kokosdrink', 'hafermilch', 'sojamilch'] },
  ],
  'Käse': [
    { sub: 'Hartkäse', keywords: ['parmesan', 'grana', 'pecorino', 'bergkäse', 'emmentaler', 'gouda alt'] },
    { sub: 'Schnittkäse', keywords: ['gouda', 'edamer', 'tilsiter', 'butterkäse', 'maasdam'] },
    { sub: 'Weichkäse', keywords: ['camembert', 'brie', 'limburger', 'harzer'] },
    { sub: 'Frischkäse', keywords: ['frischkäse', 'philadelphia', 'ricotta', 'mozzarella', 'feta', 'burrata'] },
    { sub: 'Blauschimmel', keywords: ['gorgonzola', 'roquefort', 'blauschimmel', 'blue'] },
  ],
  'Fisch & Meeresfrüchte': [
    { sub: 'Lachs', keywords: ['lachs', 'salmon'] },
    { sub: 'Thunfisch', keywords: ['thunfisch', 'tuna'] },
    { sub: 'Süßwasserfisch', keywords: ['forelle', 'karpfen', 'zander', 'saibling'] },
    { sub: 'Meeresfisch', keywords: ['kabeljau', 'seelachs', 'dorsch', 'scholle', 'seezunge', 'hering', 'makrele', 'sardine'] },
    { sub: 'Meeresfrüchte', keywords: ['garnelen', 'shrimp', 'krabben', 'muscheln', 'calamari', 'tintenfisch', 'oktopus', 'hummer'] },
  ],
  'Getränke': [
    { sub: 'Wasser', keywords: ['wasser', 'mineralwasser', 'sprudel', 'tafelwasser'] },
    { sub: 'Softdrinks', keywords: ['cola', 'limo', 'limonade', 'fanta', 'sprite', 'spezi'] },
    { sub: 'Säfte', keywords: ['saft', 'nektar', 'schorle'] },
    { sub: 'Bier', keywords: ['bier', 'pils', 'weizen', 'kölsch', 'lager', 'radler', 'helles'] },
    { sub: 'Wein', keywords: ['wein', 'sekt', 'prosecco', 'champagner'] },
    { sub: 'Spirituosen', keywords: ['vodka', 'wodka', 'whisky', 'gin', 'rum', 'likör', 'jägermeister'] },
    { sub: 'Kaffee', keywords: ['kaffee', 'espresso', 'cappuccino', 'latte'] },
    { sub: 'Tee', keywords: ['tee', 'eistee'] },
    { sub: 'Energy', keywords: ['energy', 'red bull', 'monster'] },
  ],
}

export function mapSubcategory(category, productName) {
  if (!category || !productName) return null
  const rules = SUBCATEGORY_RULES[category]
  if (!rules) return null
  const lower = productName.toLowerCase()
  for (const rule of rules) {
    if (rule.keywords.some(kw => lower.includes(kw))) return rule.sub
  }
  return null
}

// =============================================================
// CANONICAL KEY (für Fuzzy-Dedup und Preishistorie)
// =============================================================

// Stopwörter, die aus dem Namen entfernt werden für canonical_key
const CANONICAL_STOPWORDS = new Set([
  // Portionen/Verpackung
  'packung', 'beutel', 'flasche', 'dose', 'becher', 'glas', 'tüte', 'tube',
  'kg', 'g', 'gr', 'ml', 'l', 'stk', 'stück', 'cl', 'liter', 'kilo',
  // Adjektive, die Produkte nicht wirklich unterscheiden
  'frisch', 'tiefkühl', 'gefroren', 'vakuumiert', 'original', 'klassisch',
  'je', 'ca', 'ca.', 'ab', 'pro',
  // Marketing
  'neu', 'bio', 'öko', 'regional', 'aktion', 'angebot', 'xxl', 'mega',
])

/**
 * Baut einen kanonischen Schlüssel für Fuzzy-Dedup + Preishistorie.
 *
 * "Barilla Spaghetti Nr. 5, 500g" → "spaghetti"
 * "Landliebe Butter 250g" → "butter"
 * "REWE Beste Wahl Rindersteak 200g" → "rindersteak"
 */
export function canonicalKey(productName, brand = null) {
  if (!productName) return null
  let key = productName.toLowerCase()
    // Entferne bekannte Marke
    .replace(brand ? new RegExp(brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : /$^/, '')
    // Entferne Mengenangaben
    .replace(/\d+(?:[,.]\d+)?\s*(?:kg|g|gr|ml|l|stk|stück|cl|liter|kilo)\b/gi, '')
    .replace(/\d+\s*[x×]\s*\d+/g, '') // "6x0.33"
    .replace(/nr\.?\s*\d+/gi, '')     // "Nr. 5"
    // Interpunktion & Zahlen raus
    .replace(/[,.()!:;\-–—/+*'"]/g, ' ')
    .replace(/\d+/g, ' ')

  // Token-weise stopwords rausfiltern
  const tokens = key.split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 2 && !CANONICAL_STOPWORDS.has(t))

  // Sortiert, damit "Spaghetti Barilla" und "Barilla Spaghetti" gleich werden
  tokens.sort()
  return tokens.join(' ') || null
}
