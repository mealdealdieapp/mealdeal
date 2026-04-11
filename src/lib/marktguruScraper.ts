import { supabase } from './supabase'
import { canScrape } from './rateLimiter'

// ===== Marktguru API Typen (echte API-Struktur) =====
interface MarktguruAdvertiser {
  id: string
  name: string
  industryId: number
}

interface MarktguruProduct {
  id: number
  name: string
  description?: string
}

interface MarktguruCategory {
  id?: number
  name: string
}

interface MarktguruValidityDate {
  from: string
  to: string
}

interface MarktguruImage {
  url?: string
  large?: string
  medium?: string
  small?: string
}

interface MarktguruRawOffer {
  id: number
  description?: string
  price: number
  oldPrice?: number | null
  referencePrice?: number
  advertisers?: MarktguruAdvertiser[]
  product?: MarktguruProduct
  categories?: MarktguruCategory[]
  validityDates?: MarktguruValidityDate[]
  images?: MarktguruImage[]
  quantity?: number | null
  industries?: { id: number; name: string }[]
}

// ===== Markt-Normalisierung =====
const KNOWN_MARKETS: Record<string, string> = {
  'REWE': 'REWE', 'Rewe': 'REWE', 'REWE Center': 'REWE',
  'PENNY': 'Penny', 'Penny': 'Penny',
  'EDEKA': 'Edeka', 'Edeka': 'Edeka', 'E center': 'Edeka', 'E Center': 'Edeka',
  'Kaufland': 'Kaufland',
  'Lidl': 'Lidl', 'LIDL': 'Lidl',
  'ALDI SÜD': 'ALDI', 'ALDI NORD': 'ALDI', 'ALDI Nord': 'ALDI',
  'Aldi Nord': 'ALDI', 'Aldi Süd': 'ALDI', 'ALDI': 'ALDI', 'Aldi': 'ALDI',
  'Netto Marken-Discount': 'Netto', 'Netto': 'Netto',
  'Norma': 'Norma', 'NORMA': 'Norma',
  'nahkauf': 'nahkauf', 'Nahkauf': 'nahkauf',
  'dm': 'dm', 'Rossmann': 'Rossmann', 'ROSSMANN': 'Rossmann',
  'Globus': 'Globus', 'GLOBUS': 'Globus',
  'Marktkauf': 'Marktkauf', 'Hit': 'Hit', 'HIT': 'Hit',
}

function normalizeMarketName(advertiserName: string): string | null {
  const direct = KNOWN_MARKETS[advertiserName]
  if (direct) return direct

  // Fuzzy lookup
  const upper = advertiserName.toUpperCase()
  for (const [key, val] of Object.entries(KNOWN_MARKETS)) {
    if (upper.includes(key.toUpperCase())) return val
  }
  return advertiserName // Fallback: Original-Namen nutzen
}

// ===== Kategorie-Mapping =====
// Schritt 1: Kategorie-basiert (Marktguru-Kategorie)
// Schritt 2: Produktname-basiert (Fallback wenn Kategorie nicht matcht)

const OBST_KEYWORDS = ['apfel', 'banane', 'orange', 'birne', 'kirsche', 'erdbeere',
  'beere', 'traube', 'mango', 'ananas', 'melone', 'zitrone', 'pflaume',
  'pfirsich', 'nektarine', 'kiwi', 'obst', 'clementine', 'mandarine',
  'himbeere', 'heidelbeere', 'johannisbeere', 'stachelbeere', 'brombeere',
  'granatapfel', 'passionsfrucht', 'maracuja', 'papaya', 'litschi',
  'feige', 'dattel', 'kokosnuss', 'avocado', 'grapefruit', 'limette',
  'weintraube', 'mirabelle', 'zwetschge', 'aprikose']

const GEMUESE_NAME_KEYWORDS = ['tomate', 'gurke', 'paprika', 'zwiebel', 'karotte',
  'möhre', 'brokkoli', 'blumenkohl', 'zucchini', 'aubergine', 'spinat',
  'lauch', 'porree', 'sellerie', 'fenchel', 'kohlrabi', 'radieschen',
  'rettich', 'rübe', 'kürbis', 'champignon', 'pilz', 'salat',
  'eisberg', 'rucola', 'feldsalat', 'kopfsalat', 'romano', 'kohl',
  'rotkohl', 'weißkohl', 'wirsing', 'grünkohl', 'rosenkohl',
  'spargel', 'bohne', 'erbse', 'mais', 'kartoffel', 'süßkartoffel',
  'batate', 'mangold', 'pak choi', 'chinakohl', 'frühlingszwiebel',
  'knoblauch', 'ingwer', 'rote bete', 'petersilienwurzel', 'pastinake']

const FLEISCH_NAME_KEYWORDS = ['hähnchen', 'huhn', 'hühnchen', 'chicken', 'pute',
  'truthahn', 'ente', 'gans', 'rind', 'schwein', 'lamm', 'kalb',
  'hackfleisch', 'gehacktes', 'hack', 'gulasch', 'geschnetzeltes',
  'schnitzel', 'steak', 'braten', 'filet', 'keule', 'schenkel',
  'brust', 'wurst', 'bratwurst', 'wiener', 'bockwurst', 'salami',
  'schinken', 'speck', 'bacon', 'leberkäse', 'fleischkäse',
  'mettwurst', 'aufschnitt', 'mortadella', 'lyoner', 'fleisch',
  'geflügel', 'roulade', 'frikadelle', 'bulette', 'mett', 'tatar']

const FISCH_NAME_KEYWORDS = ['lachs', 'forelle', 'thunfisch', 'hering', 'makrele',
  'kabeljau', 'pangasius', 'seelachs', 'rotbarsch', 'scholle',
  'zander', 'dorade', 'wolfsbarsch', 'garnele', 'shrimp', 'krabbe',
  'krabben', 'muschel', 'tintenfisch', 'calamari', 'fischstäbchen',
  'räucherlachs', 'matjes', 'sardine', 'sardelle', 'anchovis',
  'fisch', 'meeresfrüchte', 'scampi', 'sushi']

const MILCH_NAME_KEYWORDS = ['milch', 'vollmilch', 'fettarme milch', 'h-milch',
  'frischmilch', 'joghurt', 'jogurt', 'kefir', 'buttermilch',
  'sahne', 'schlagsahne', 'kochsahne', 'schmand', 'saure sahne',
  'crème fraîche', 'creme fraiche', 'quark', 'skyr', 'butter',
  'margarine', 'ei ', 'eier', 'freilandeier', 'bio-eier',
  'pudding', 'milchreis', 'grießbrei']

const KAESE_NAME_KEYWORDS = ['käse', 'gouda', 'emmentaler', 'edamer', 'mozzarella',
  'parmesan', 'cheddar', 'camembert', 'brie', 'feta', 'hirtenkäse',
  'frischkäse', 'mascarpone', 'ricotta', 'gorgonzola', 'roquefort',
  'gruyère', 'bergkäse', 'tilsiter', 'appenzeller', 'raclette',
  'halloumi', 'hüttenkäse', 'cottage cheese', 'schmelzkäse',
  'scheibletten', 'reibekäse', 'streukäse']

const BACKWAREN_NAME_KEYWORDS = ['brot', 'brötchen', 'semmel', 'toast', 'baguette',
  'ciabatta', 'croissant', 'brezel', 'laugenbrezel', 'laugenstange',
  'vollkornbrot', 'roggenbrot', 'dinkelbrot', 'toastbrot', 'knäckebrot',
  'tortilla', 'wrap', 'fladenbrot', 'naan', 'pita', 'focaccia',
  'kuchen', 'torte', 'gebäck', 'muffin', 'donut', 'berliner',
  'strudel', 'hefezopf', 'stutenkerl']

const NUDELN_REIS_NAME_KEYWORDS = ['nudel', 'pasta', 'spaghetti', 'penne', 'fusilli',
  'farfalle', 'rigatoni', 'tagliatelle', 'linguine', 'lasagne',
  'tortellini', 'ravioli', 'gnocchi', 'spätzle', 'reis',
  'basmatireis', 'jasminreis', 'langkornreis', 'risotto', 'milchreis',
  'couscous', 'bulgur', 'quinoa', 'polenta', 'grieß',
  'glasnudeln', 'reisnudeln', 'udon', 'ramen', 'mie-nudeln']

const GETRAENKE_NAME_KEYWORDS = ['bier', 'wein', 'sekt', 'prosecco', 'champagner',
  'schnaps', 'likör', 'vodka', 'whisky', 'rum', 'gin', 'tequila',
  'saft', 'orangensaft', 'apfelsaft', 'multivitamin', 'nektar',
  'wasser', 'mineralwasser', 'sprudel', 'cola', 'fanta', 'sprite',
  'limo', 'limonade', 'eistee', 'energy', 'schorle', 'smoothie',
  'kaffee', 'espresso', 'cappuccino', 'tee', 'kakao']

const SNACKS_NAME_KEYWORDS = ['chips', 'flips', 'cracker', 'salzstangen',
  'schokolade', 'tafel', 'praline', 'bonbon', 'gummibärchen',
  'fruchtgummi', 'lakritze', 'keks', 'waffel', 'riegel',
  'müsliriegel', 'schokoriegel', 'eis', 'eiscreme', 'magnum',
  'cornetto', 'popcorn', 'nüsse', 'erdnüsse', 'cashew',
  'studentenfutter', 'trockenfrüchte', 'knabber']

const KONSERVEN_NAME_KEYWORDS = ['konserve', 'dose', 'passierte tomaten', 'passata',
  'mais dose', 'bohnen dose', 'erbsen dose', 'pilze dose',
  'thunfisch dose', 'ananas dose', 'pfirsich dose',
  'fertiggericht', 'ravioli dose', 'suppe dose', 'eintopf',
  'instant', 'tütensuppe', 'brühe']

const GEWUERZE_NAME_KEYWORDS = ['gewürz', 'pfeffer', 'salz', 'zimt', 'kurkuma',
  'paprikapulver', 'oregano', 'basilikum', 'thymian', 'rosmarin',
  'curry', 'chili', 'muskat', 'nelke', 'koriander', 'kümmel',
  'senf', 'ketchup', 'mayo', 'mayonnaise', 'remoulade',
  'sojasauce', 'worcester', 'tabasco', 'sriracha', 'sambal',
  'pesto', 'essig', 'balsamico', 'dressing']

const OELE_FETTE_NAME_KEYWORDS = ['olivenöl', 'sonnenblumenöl', 'rapsöl', 'kokosöl',
  'sesamöl', 'erdnussöl', 'distelöl', 'walnussöl', 'leinöl',
  'bratöl', 'speiseöl', 'pflanzenöl', 'butterschmalz', 'schmalz',
  'kokosfett', 'frittierfett']

const HAUSHALT_NAME_KEYWORDS = ['spülmittel', 'waschmittel', 'weichspüler',
  'toilettenpapier', 'küchenpapier', 'taschentücher', 'müllbeutel',
  'alufolie', 'backpapier', 'frischhaltefolie', 'reiniger',
  'allzweckreiniger', 'glasreiniger', 'badreiniger',
  'staubsaugerbeutel', 'schwamm', 'lappen', 'besen']

const DROGERIE_NAME_KEYWORDS = ['shampoo', 'duschgel', 'seife', 'zahnpasta',
  'zahnbürste', 'deo', 'deodorant', 'creme', 'bodylotion',
  'handcreme', 'sonnencreme', 'rasierer', 'rasiergel',
  'windel', 'feuchttücher', 'wattepads', 'damenbinde',
  'tampon', 'parfüm', 'haarspray', 'haargel']

function mapCategory(catName: string, productName: string): string {
  const cat = (catName || '').toLowerCase()
  const name = productName.toLowerCase()

  // Schritt 1: Marktguru-Kategorie matchen (hohe Konfidenz)
  if (['fleisch', 'wurst', 'schinken', 'geflügel'].some(k => cat.includes(k))) return 'Fleisch'
  if (['obst', 'gemüse', 'salat'].some(k => cat.includes(k)))
    return OBST_KEYWORDS.some(k => name.includes(k)) ? 'Obst' : 'Gemüse'
  if (['milch', 'joghurt', 'butter', 'sahne', 'quark', 'eier'].some(k => cat.includes(k))) return 'Milch & Eier'
  if (cat.includes('käse')) return 'Käse'
  if (cat.includes('tiefkühl')) return 'Tiefkühl'
  if (['getränke', 'bier', 'wein', 'saft', 'wasser'].some(k => cat.includes(k))) return 'Getränke'
  if (['snack', 'süß', 'chips', 'schokolade', 'keks'].some(k => cat.includes(k))) return 'Snacks & Süßes'
  if (['brot', 'back', 'brötchen'].some(k => cat.includes(k))) return 'Backwaren'
  if (['nudel', 'reis', 'pasta'].some(k => cat.includes(k))) return 'Nudeln & Reis'
  if (['konserve', 'fertig', 'instant'].some(k => cat.includes(k))) return 'Konserven'
  if (['gewürz', 'sauce', 'soße', 'essig', 'senf', 'ketchup'].some(k => cat.includes(k))) return 'Gewürze'
  if (['fisch', 'meeresfrüchte'].some(k => cat.includes(k))) return 'Fisch & Meeresfrüchte'
  if (['öl', 'fett'].some(k => cat.includes(k))) return 'Öle & Fette'
  if (['haushalt', 'reinigung', 'spül', 'wasch'].some(k => cat.includes(k))) return 'Haushalt'
  if (['drogerie', 'pflege', 'hygiene', 'kosmetik', 'seife', 'shampoo', 'dusch', 'zahn', 'deo']
    .some(k => cat.includes(k) || name.includes(k))) return 'Drogerie'

  // Schritt 2: Produktname-basiert (für alles was Kategorie nicht abfängt)
  // Reihenfolge: spezifisch → allgemein
  if (DROGERIE_NAME_KEYWORDS.some(k => name.includes(k))) return 'Drogerie'
  if (HAUSHALT_NAME_KEYWORDS.some(k => name.includes(k))) return 'Haushalt'
  if (FISCH_NAME_KEYWORDS.some(k => name.includes(k))) return 'Fisch & Meeresfrüchte'
  if (FLEISCH_NAME_KEYWORDS.some(k => name.includes(k))) return 'Fleisch'
  if (KAESE_NAME_KEYWORDS.some(k => name.includes(k))) return 'Käse'
  if (MILCH_NAME_KEYWORDS.some(k => name.includes(k))) return 'Milch & Eier'
  if (OBST_KEYWORDS.some(k => name.includes(k))) return 'Obst'
  if (GEMUESE_NAME_KEYWORDS.some(k => name.includes(k))) return 'Gemüse'
  if (NUDELN_REIS_NAME_KEYWORDS.some(k => name.includes(k))) return 'Nudeln & Reis'
  if (BACKWAREN_NAME_KEYWORDS.some(k => name.includes(k))) return 'Backwaren'
  if (GETRAENKE_NAME_KEYWORDS.some(k => name.includes(k))) return 'Getränke'
  if (SNACKS_NAME_KEYWORDS.some(k => name.includes(k))) return 'Snacks & Süßes'
  if (KONSERVEN_NAME_KEYWORDS.some(k => name.includes(k))) return 'Konserven'
  if (GEWUERZE_NAME_KEYWORDS.some(k => name.includes(k))) return 'Gewürze'
  if (OELE_FETTE_NAME_KEYWORDS.some(k => name.includes(k))) return 'Öle & Fette'

  return 'Sonstiges Lebensmittel'
}

// ===== Marktguru API Config =====
const MARKTGURU_API_KEY = '8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE='

// ===== Rate Limiting =====
const SCRAPE_COOLDOWN_MS = 6 * 60 * 60 * 1000 // 6 Stunden
const MAX_API_CALLS_PER_SCRAPE = 12 // Max 12 API calls pro Scrape (2 Industrien × 6 Seiten)

// ===== Prüfe ob Angebote für PLZ vorhanden =====
export async function hasOffersForPlz(plz: string): Promise<boolean> {
  const plzPrefix = plz.substring(0, 3)
  const today = new Date().toISOString().split('T')[0]

  const { count, error } = await supabase
    .from('offers')
    .select('id', { count: 'exact', head: true })
    .eq('plz_prefix', plzPrefix)
    .gte('valid_until', today)

  if (error) {
    console.error('Error checking offers:', error)
    return false
  }
  return (count ?? 0) > 20 // Mindestens 20 Angebote = genug
}

// ===== Anzahl Angebote für PLZ =====
export async function getOfferCountForPlz(plz: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('offers')
    .select('id', { count: 'exact', head: true })
    .eq('plz_prefix', plz.substring(0, 3))
    .gte('valid_until', today)

  if (error) return 0
  return count ?? 0
}

// ===== Hauptfunktion: Angebote scrapen =====
export async function scrapeOffersForPlz(
  plz: string,
  markets: string[]
): Promise<{ count: number; error?: string }> {
  try {
    if (!plz || plz.length < 5) return { count: 0, error: 'Invalid PLZ' }

    // Globales Rate Limit (max 2 Scrapes pro Stunde)
    if (!canScrape()) {
      console.log('[MealDeal] Globales Rate Limit erreicht')
      const count = await getOfferCountForPlz(plz)
      return { count }
    }

    const plzPrefix = plz.substring(0, 3)

    // Rate Limit: Prüfe ob schon kürzlich gescraped
    const lastScrapeKey = `mealdeal_last_scrape_${plzPrefix}`
    const lastScrape = localStorage.getItem(lastScrapeKey)
    if (lastScrape) {
      const elapsed = Date.now() - parseInt(lastScrape, 10)
      if (elapsed < SCRAPE_COOLDOWN_MS) {
        console.log(`[MealDeal] Cooldown aktiv, nächster Scrape in ${Math.round((SCRAPE_COOLDOWN_MS - elapsed) / 60000)} Min`)
        const count = await getOfferCountForPlz(plz)
        return { count }
      }
    }

    // Prüfe ob genug Angebote vorhanden
    if (await hasOffersForPlz(plz)) {
      console.log('[MealDeal] Genug Angebote vorhanden, überspringe Scrape')
      localStorage.setItem(lastScrapeKey, Date.now().toString())
      const count = await getOfferCountForPlz(plz)
      return { count }
    }

    console.log(`[MealDeal] Starte Scrape für PLZ ${plz}`)

    // Fetch von Marktguru API (via Proxy auf Vercel, direkt lokal)
    const allOffers: MarktguruRawOffer[] = []
    let apiCalls = 0

    for (const industryId of [1009, 1023]) {
      let offset = 0
      while (offset < 1200 && apiCalls < MAX_API_CALLS_PER_SCRAPE) {
        const url = `/api/marktguru/offers?as=web&limit=200&offset=${offset}&zipCode=${plz}&industryId=${industryId}`

        try {
          apiCalls++
          const response = await fetch(url, {
            headers: {
              'x-apikey': MARKTGURU_API_KEY,
              'Accept': 'application/json',
            },
          })
          if (!response.ok) break

          const raw = await response.json()
          const offers: MarktguruRawOffer[] = Array.isArray(raw) ? raw
            : (raw?.results || raw?.offers || raw?.data || [])

          if (!offers.length) break
          allOffers.push(...offers)
          if (offers.length < 200) break
          offset += 200

          // Kleine Pause zwischen Requests
          await new Promise(r => setTimeout(r, 200))
        } catch {
          break
        }
      }
    }

    if (!allOffers.length) return { count: 0 }

    // Transform
    const seen = new Set<string>()
    const offersToInsert: Array<Record<string, unknown>> = []

    for (const offer of allOffers) {
      const advertiserName = offer.advertisers?.[0]?.name
      if (!advertiserName) continue

      const market = normalizeMarketName(advertiserName)
      if (!market) continue

      // Optional: Nur User-Märkte
      if (markets.length > 0 && !markets.includes(market)) continue

      const title = offer.product?.name || (offer.description || '').split('\n')[0]
      if (!title.trim() || offer.price == null) continue

      let validFrom: string | null = null
      let validUntil: string | null = null
      if (offer.validityDates?.[0]) {
        validFrom = (offer.validityDates[0].from || '').slice(0, 10)
        validUntil = (offer.validityDates[0].to || '').slice(0, 10)
      }
      if (!validUntil) continue

      // Deduplizierung
      const fp = `${market}_${title.trim()}_${validUntil}_${offer.price}`.toLowerCase()
      if (seen.has(fp)) continue
      seen.add(fp)

      const oldPrice = offer.oldPrice ?? null
      let discount: number | null = null
      if (oldPrice && oldPrice > offer.price) {
        discount = Math.round(((oldPrice - offer.price) / oldPrice) * 100)
      }

      let imageUrl: string | null = null
      if (offer.images?.[0]) {
        imageUrl = offer.images[0].url || offer.images[0].large || offer.images[0].medium || null
      }

      const catName = offer.categories?.[0]?.name || ''

      offersToInsert.push({
        product_name: title.trim(),
        store: market,
        offer_price: Math.round(offer.price * 100) / 100,
        original_price: oldPrice ? Math.round(oldPrice * 100) / 100 : null,
        discount_percent: discount,
        plz: plz,
        plz_prefix: plzPrefix,
        category: mapCategory(catName, title),
        valid_from: validFrom,
        valid_until: validUntil,
        image_url: imageUrl,
        quantity: offer.quantity || null,
        fingerprint: fp,
      })
    }

    // In Supabase speichern (Batches von 100)
    let saved = 0
    for (let i = 0; i < offersToInsert.length; i += 100) {
      const batch = offersToInsert.slice(i, i + 100)
      const { error } = await supabase
        .from('offers')
        .upsert(batch as never[], { onConflict: 'fingerprint' })

      if (error) {
        console.error(`[MealDeal] Batch ${Math.floor(i / 100)} Fehler:`, error.message)
      } else {
        saved += batch.length
      }
    }

    // Cooldown setzen
    localStorage.setItem(lastScrapeKey, Date.now().toString())

    console.log(`[MealDeal] ${saved} Angebote gespeichert`)
    return { count: saved }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[MealDeal] Scrape Fehler:', msg)
    return { count: 0, error: msg }
  }
}
