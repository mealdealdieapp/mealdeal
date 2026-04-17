/**
 * Client-seitige Ports der scraperHelpers.mjs-Logik.
 * Wird für den On-Demand-Scrape (OnboardingPage, OffersPage refresh) genutzt,
 * damit auch dort v2-Felder (base_price, brand, is_bio, canonical_key etc.)
 * geschrieben werden — nicht nur vom wöchentlichen Batch-Scraper.
 *
 * Quellwahrheit bleibt scripts/scraperHelpers.mjs. Änderungen hier bitte
 * dort spiegeln (oder besser: langfristig auf einen gemeinsamen Modul-Ansatz
 * umstellen).
 */

// ==== Bekannte Marken (Teilmenge; bei Bedarf erweitern) ====
export const KNOWN_BRANDS: string[] = [
  'Landliebe', 'Bärenmarke', 'Müller', 'Weihenstephan', 'Berchtesgadener Land',
  'Andechser', 'Ehrmann', 'Danone', 'Almighurt', 'Alpro', 'Hochland', 'Kerrygold',
  'Meggle', 'Président', 'Exquisa', 'Zott', 'Milram', 'Arla', 'Rama',
  'Rügenwalder', 'Wiesenhof', 'Gutfried', 'Herta', 'Meica', 'Reinert',
  'Schwarzwälder', 'Sandel', 'Bella Italia',
  'Coca-Cola', 'Coca Cola', 'Pepsi', 'Fanta', 'Sprite', 'Mezzo Mix', 'Schweppes',
  'Red Bull', 'Monster', 'Effect', 'Rockstar',
  'Gerolsteiner', 'Apollinaris', 'Vittel', 'Evian', 'Volvic', 'Adelholzener',
  'Krombacher', 'Warsteiner', 'Bitburger', "Beck's", 'Becks', 'Veltins',
  'Jever', 'Paulaner', 'Erdinger', 'Radeberger', 'Astra', 'Flensburger',
  'Granini', 'Hohes C', 'Rauch', 'Valensina', 'Albi', 'Lift',
  'Milka', 'Ritter Sport', 'Lindt', 'Ferrero', 'Kinder', 'Nutella',
  'Nestlé', 'Toblerone', 'Merci', 'Raffaello', 'Rocher', 'Duplo', 'Hanuta',
  'Haribo', 'Katjes', 'Mentos', 'Wrigley', 'Orbit', "Fisherman's",
  "Lay's", 'Lays', 'Chio', 'Funny-frisch', 'Ültje', 'Bahlsen', 'Leibniz',
  'Pringles', 'Doritos', "Kelly's",
  "Kellogg's", 'Kelloggs', 'Nestlé Fitness', 'Vitalis', 'Dr. Oetker',
  'Kölln', 'Seitenbacher', 'Brüggen',
  'Barilla', 'De Cecco', 'Buitoni', 'Birkel', '3 Glocken', 'Knorr', 'Maggi',
  "Uncle Ben's", 'Reis-Fit', 'Oryza', 'Mirácoli',
  'Rio Mare', 'Hengstenberg', 'Kühne', 'Homann', 'Thomy',
  "Bautz'ner", 'Löwensenf', 'Heinz', 'Hela', 'Develey',
  'Jacobs', 'Dallmayr', 'Tchibo', 'Melitta', 'Mövenpick', 'Eduscho',
  'Teekanne', 'Messmer', 'Pompadour', 'Meßmer',
  'Iglo', 'Bofrost', 'Frosta', 'Ristorante', 'Wagner', 'Dr. Oetker Pizza',
  'Oreo', 'Snickers', 'Mars', 'Twix', 'Bounty', "M&M's", 'KitKat',
  'Ja!', 'Gut & Günstig', 'K-Classic', 'K-Bio', 'K-Favourites',
  'Rewe Bio', 'Rewe Beste Wahl', 'Rewe Feine Welt',
  'Edeka Bio', 'Edeka Selection', 'Edeka Bestes aus unserer Heimat',
]

const BRAND_SORTED = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractBrand(productName: string | null | undefined): string | null {
  if (!productName) return null
  const lower = productName.toLowerCase()
  for (const brand of BRAND_SORTED) {
    const b = brand.toLowerCase()
    if (lower.startsWith(b + ' ') || (lower.startsWith(b) && productName.length === brand.length)) {
      return brand
    }
    const regex = new RegExp('(?:^|\\s)' + escapeRegex(b) + '(?:$|\\s|,)', 'i')
    if (regex.test(productName)) return brand
  }
  return null
}

// ==== Bio / Regional ====
const BIO_KEYWORDS = [
  'bio ', 'bio-', ' bio,', 'bio,', 'biologisch', 'öko', 'demeter',
  'naturland', 'bioland', 'eu-bio', 'dennree', 'alnatura', 'rewe bio',
  'k-bio', 'edeka bio', 'gut-bio', 'gut bio', 'ja! natürlich',
]

export function detectBio(productName: string | null | undefined): boolean {
  if (!productName) return false
  const lower = ' ' + productName.toLowerCase() + ' '
  return BIO_KEYWORDS.some((kw) => lower.includes(kw))
}

const REGIONAL_KEYWORDS = [
  'regional', 'aus der region', 'heimatgut', 'unsere heimat', 'bestes aus unserer heimat',
  'aus deutschland', 'deutsche', 'bayerisch', 'schwarzwäld', 'allgäu',
]

export function detectRegional(productName: string | null | undefined): boolean {
  if (!productName) return false
  const lower = productName.toLowerCase()
  return REGIONAL_KEYWORDS.some((kw) => lower.includes(kw))
}

// ==== Mengenangabe / Grundpreis ====
const UNIT_NORMALIZE: Record<string, string> = {
  g: 'g', gr: 'g', gramm: 'g',
  kg: 'kg', kilo: 'kg', kilogramm: 'kg',
  ml: 'ml', milliliter: 'ml',
  l: 'l', ltr: 'l', liter: 'l',
  stk: 'stk', stück: 'stk', st: 'stk',
  cl: 'ml',
}

const UNIT_CONVERSION_TO_BASE: Record<string, { base: string; factor: number }> = {
  g: { base: 'kg', factor: 0.001 },
  kg: { base: 'kg', factor: 1 },
  ml: { base: 'l', factor: 0.001 },
  l: { base: 'l', factor: 1 },
  stk: { base: 'stk', factor: 1 },
}

function round(n: number): number { return Math.round(n * 100) / 100 }

export interface QuantityResult {
  amount: number | null
  unit: string | null
}

function tryParseQuantity(text: string | null | undefined): QuantityResult | null {
  if (!text) return null
  const clean = text.toLowerCase().replace(/,/g, '.')

  const multMatch = clean.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|gr|gramm|ml|l|ltr|liter|cl|stück|stk|st)\b/)
  if (multMatch) {
    const count = parseFloat(multMatch[1])
    const num = parseFloat(multMatch[2])
    const rawUnit = multMatch[3]
    const unit = UNIT_NORMALIZE[rawUnit] || rawUnit
    let amount = count * num
    if (rawUnit === 'cl') amount = amount * 10
    return { amount: round(amount), unit }
  }

  const simpleMatch = clean.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|gramm|ml|l|ltr|liter|cl|stück|stk|st)\b/)
  if (simpleMatch) {
    let num = parseFloat(simpleMatch[1])
    const rawUnit = simpleMatch[2]
    const unit = UNIT_NORMALIZE[rawUnit] || rawUnit
    if (rawUnit === 'cl') num = num * 10
    return { amount: round(num), unit }
  }

  const jeMatch = clean.match(/je\s+(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/)
  if (jeMatch) {
    const num = parseFloat(jeMatch[1])
    const unit = UNIT_NORMALIZE[jeMatch[2]] || jeMatch[2]
    return { amount: round(num), unit }
  }

  return null
}

export function parseQuantity(
  productName: string | null | undefined,
  quantityField: string | null | undefined = null,
): QuantityResult {
  const sources = [quantityField, productName].filter(Boolean) as string[]
  for (const source of sources) {
    const result = tryParseQuantity(source)
    if (result) return result
  }
  return { amount: null, unit: null }
}

export interface BasePriceResult {
  basePrice: number | null
  baseUnit: string | null
}

export function calcBasePrice(
  price: number | null | undefined,
  amount: number | null | undefined,
  unit: string | null | undefined,
): BasePriceResult {
  if (!price || !amount || !unit) return { basePrice: null, baseUnit: null }
  const conv = UNIT_CONVERSION_TO_BASE[unit]
  if (!conv) return { basePrice: null, baseUnit: null }
  const amountInBase = amount * conv.factor
  if (amountInBase <= 0) return { basePrice: null, baseUnit: null }
  return { basePrice: round(price / amountInBase), baseUnit: conv.base }
}

// ==== Unterkategorien ====
const SUBCATEGORY_RULES: Record<string, Array<{ sub: string; keywords: string[] }>> = {
  Fleisch: [
    { sub: 'Rind', keywords: ['rind', 'hack ', 'hackfleisch', 'rinder', 'tatar', 'roastbeef', 'entrecote', 'filet rind'] },
    { sub: 'Schwein', keywords: ['schwein', 'kassler', 'speck', 'schinken', 'eisbein', 'bauchfleisch', 'nacken', 'schnitzel schwein'] },
    { sub: 'Geflügel', keywords: ['hähnchen', 'huhn', 'pute', 'truthahn', 'ente ', 'gans', 'geflügel', 'chicken'] },
    { sub: 'Lamm', keywords: ['lamm', 'hammel'] },
    { sub: 'Wurst', keywords: ['wurst', 'salami', 'bratwurst', 'mettwurst', 'leberwurst', 'knacker', 'wiener', 'frankfurter', 'bockwurst'] },
    { sub: 'Aufschnitt', keywords: ['aufschnitt', 'schinken ', 'kochschinken', 'putenbrust', 'geflügelwurst'] },
    { sub: 'Wild', keywords: ['wild', 'hirsch', 'reh', 'wildschwein'] },
  ],
  Gemüse: [
    { sub: 'Blattgemüse', keywords: ['salat', 'spinat', 'mangold', 'rucola', 'feldsalat', 'eisberg'] },
    { sub: 'Fruchtgemüse', keywords: ['tomate', 'paprika', 'aubergine', 'zucchini', 'gurke', 'kürbis'] },
    { sub: 'Wurzelgemüse', keywords: ['karotte', 'möhre', 'rote bete', 'sellerie', 'pastinake', 'rettich', 'kartoffel'] },
    { sub: 'Kohl', keywords: ['kohl', 'brokkoli', 'blumenkohl', 'rosenkohl', 'wirsing', 'kohlrabi'] },
    { sub: 'Zwiebelgemüse', keywords: ['zwiebel', 'knoblauch', 'lauch', 'porree', 'schalotte'] },
    { sub: 'Hülsenfrüchte', keywords: ['bohne', 'erbse', 'linse', 'kichererbse'] },
    { sub: 'Pilze', keywords: ['champignon', 'pilz', 'pfifferling', 'steinpilz', 'shiitake'] },
  ],
  Obst: [
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
  Käse: [
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
  Getränke: [
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

export function mapSubcategory(
  category: string | null | undefined,
  productName: string | null | undefined,
): string | null {
  if (!category || !productName) return null
  const rules = SUBCATEGORY_RULES[category]
  if (!rules) return null
  const lower = productName.toLowerCase()
  for (const rule of rules) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.sub
  }
  return null
}

// ==== Canonical Key ====
const CANONICAL_STOPWORDS = new Set([
  'packung', 'beutel', 'flasche', 'dose', 'becher', 'glas', 'tüte', 'tube',
  'kg', 'g', 'gr', 'ml', 'l', 'stk', 'stück', 'cl', 'liter', 'kilo',
  'frisch', 'tiefkühl', 'gefroren', 'vakuumiert', 'original', 'klassisch',
  'je', 'ca', 'ca.', 'ab', 'pro',
  'neu', 'bio', 'öko', 'regional', 'aktion', 'angebot', 'xxl', 'mega',
])

export function canonicalKey(
  productName: string | null | undefined,
  brand: string | null = null,
): string | null {
  if (!productName) return null
  const brandRegex = brand
    ? new RegExp(escapeRegex(brand.toLowerCase()), 'gi')
    : /$^/
  const key = productName.toLowerCase()
    .replace(brandRegex, '')
    .replace(/\d+(?:[,.]\d+)?\s*(?:kg|g|gr|ml|l|stk|stück|cl|liter|kilo)\b/gi, '')
    .replace(/\d+\s*[x×]\s*\d+/g, '')
    .replace(/nr\.?\s*\d+/gi, '')
    .replace(/[,.()!:;\-–—/+*'"]/g, ' ')
    .replace(/\d+/g, ' ')

  const tokens = key.split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !CANONICAL_STOPWORDS.has(t))

  tokens.sort()
  return tokens.join(' ') || null
}
