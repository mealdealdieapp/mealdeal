import { getAllowedOfferCategories } from './categoryMapping'

interface OfferCandidate {
  id: string
  product_name: string
  offer_price: number
  original_price: number | null
  discount_percent: number | null
  store: string
  category: string | null
}

export interface OfferMatch {
  offerId: string
  offerPrice: number
  originalPrice: number | null
  store: string
  discountPercent: number | null
  productName: string
}

interface ScoredOffer {
  offer: OfferCandidate
  score: number
}

// ===== BLOCKED CATEGORIES =====
const BLOCKED_OFFER_CATEGORIES = [
  'Drogerie', 'Haushalt', 'Tierbedarf', 'Technik', 'Spielzeug',
  'Garten', 'Kleidung', 'Büro', 'Auto',
]

// ===== NON-FOOD KEYWORDS =====
// Wenn ein Angebotsname eines dieser Wörter enthält, ist es KEIN Lebensmittel
const NON_FOOD_KEYWORDS = [
  // Küchengeräte
  'toaster', 'mixer', 'spender', 'maker', 'maschine', 'automat',
  'pfanne', 'topf', 'messer', 'gabel', 'löffel', 'besteck',
  'teller', 'schüssel', 'vorratsdose', 'frischhalte',
  // Drogerie & Hygiene
  'bügel', 'wäsche', 'reiniger', 'spülmittel', 'seife',
  'shampoo', 'duschgel', 'zahnpasta', 'deo', 'creme',
  'toilettenpapier', 'küchenpapier', 'taschentücher',
  'müllbeutel', 'alufolie', 'backpapier', 'frischhaltefolie',
  'windel', 'feuchttücher', 'wattepads', 'rasierer', 'parfüm',
  // Tierbedarf
  'katzenfutter', 'hundefutter', 'tierfutter', 'katzenstreu',
  // Elektronik & Technik
  'batterie', 'glühbirne', 'kerze', 'ladekabel', 'kopfhörer',
  'bluetooth', 'usb', 'adapter', 'fernbedienung',
  // Möbel & Haushalt
  'matratze', 'bettdecke', 'kissen', 'bettlaken', 'bettwäsche',
  'handtuch', 'duschvorhang', 'vorhang', 'gardine',
  'regal', 'schrank', 'kommode', 'stuhl', 'tisch', 'hocker',
  'lampe', 'leuchte', 'steckdose', 'verlängerung',
  // Kleidung & Textil
  'jogginghose', 'socken', 'unterwäsche', 'pullover', 'jacke',
  'shirt', 'hose', 'kleid', 'schuhe', 'stiefel', 'sandalen',
  'baby-', '2 baby', 'kinderkleidung',
  // Garten & Werkzeug
  'blumenständer', 'blumentopf', 'erde', 'dünger', 'gartenschere',
  'grillbürste', 'grillzange', 'grillanzünder',
  'werkzeug', 'schrauben', 'kleber', 'komponenten-kleber',
  'bohrer', 'säge', 'hammer', 'zange',
  // Sonstiges Non-Food
  'spielzeug', 'puzzle', 'brettspiel', 'puppe',
  'vitamin d', '+vitamin', 'nahrungsergänzung',
  'sonnencreme', 'insektenschutz', 'mückenschutz',
  'waschmittel', 'weichspüler', 'geschirrspül',
  'staubsauger', 'besen', 'eimer', 'mopp',
  'geltouch', 'taschenfederkern', 'xxl gelstar',
  'frites', 'fritteuse',
]

// ===== PRODUKT-TYP-ERKENNUNG =====
// Wenn ein Angebotsname eines dieser Wörter enthält, ist es ein verarbeitetes
// Fertigprodukt und darf NUR matchen wenn der volle Zutatname drin vorkommt
// (nicht über Teilwort-Splits)
const PROCESSED_PRODUCT_KEYWORDS = [
  // Süßwaren & Snacks
  'müsliriegel', 'riegel', 'schokoriegel', 'schokolade', 'tafelschokolade',
  'bonbon', 'gummibärchen', 'fruchtgummi', 'keks', 'waffel', 'waffelröllchen',
  'chips', 'flips', 'cracker', 'knabber', 'popcorn',
  'eis', 'eiscreme', 'magnum', 'cornetto',
  // Fertiggerichte
  'pudding', 'milchreis', 'grießbrei', 'mousse',
  'joghurt', 'sahnejoghurt', 'fruchtjoghurt',
  'milchschnitte', 'milchfreunde', 'kinderschokolade',
  'fertiggericht', 'tiefkühlpizza', 'instant',
  'auflauf', 'lasagne', 'roulade',
  // Soßen, Pasten, Ketchup, Dressings
  'ketchup', 'ketschup', 'sauce', 'soße',
  'mark', 'paste', 'pesto', 'dressing',
  'mus', 'püree', 'kompott',
  'senf', 'mayonnaise', 'mayo', 'remoulade',
  // Konserven & passierte Produkte
  'passiert', 'passata', 'geschält', 'gehackte tomaten',
  'konserve', 'dose',
  // Marmeladen, Aufstriche, Sirups
  'marmelade', 'konfitüre', 'gelee', 'aufstrich', 'sirup',
  // Getränke
  'saft', 'nektar', 'smoothie', 'fruchtgetränk', 'milchgetränk',
  'shot', 'energy', 'limo', 'limonade', 'cola', 'fanta', 'sprite',
  'bier', 'wein', 'sekt', 'schnaps', 'likör', 'wodka',
  'schorle', 'eistee',
  // Kuchen & Gebäck
  'kuchen', 'torte', 'gebäck', 'strudel',
  // Brühe & Suppen
  'brühe', 'bouillon', 'fond',
  // Essig
  'essig',
  // Drogerie (falls Kategorie fehlt)
  'cremeseife', 'duschgel', 'bodylotion', 'handcreme',
  // Tiernahrung
  'hundefutter', 'katzenfutter', 'vogelfutter',
]

// ===== FALSE-POSITIVE BLACKLIST =====
const OFFER_BLACKLIST: Record<string, string[]> = {
  // Küchengeräte & Zubehör
  'toast': ['toaster', 'toastautomat'],
  'brot': ['brotdose', 'brotkasten', 'brotmaschine', 'brotmesser'],
  'kaffee': ['kaffeemaschine', 'kaffeeautomat', 'kaffeemühle', 'kaffeefilter'],
  'tee': ['teekanne', 'teekocher', 'teesieb'],
  'wasser': ['wasserkocher', 'wasserfilter', 'wasserspender'],
  'saft': ['saftpresse', 'entsafter'],
  'ei': ['eierkocher', 'eieruhr', 'eierschneider', 'skrei', 'dessertei', 'alkoholfrei',
         'laktosefrei', 'glutenfrei', 'zuckerfrei', 'kakaofrei', 'fettfrei'],
  'eier': ['eierkocher', 'eieruhr', 'eierschneider'],
  'nudeln': ['nudelmaschine', 'nudelholz'],
  'salat': ['salatschleuder', 'salatschüssel', 'salatdressing'],
  'knoblauch': ['knoblauchpresse'],
  'zwiebel': ['zwiebelschneider'],
  // Milchprodukte → verarbeitete Produkte
  'milch': ['milchaufschäumer', 'milchkännchen', 'milchschnitte', 'milchschokolade',
            'milchcreme', 'milchfreunde', 'milchreis', 'milch reis', 'alpenmilch',
            'vollmilch-schokolade', 'milch-häschen', 'milch-häuse', 'tender milch',
            'milchpudding', 'milchgetränk'],
  'sahne': ['sahnebonbon', 'sahnejoghurt', 'sahnepudding', 'sahnelikör', 'sahnetorte'],
  'butter': ['butterkeks', 'buttercroissant', 'buttergebäck', 'buttermilch',
             'peanut butter', 'erdnussbutter', 'butter cups', 'buttercups'],
  'käse': ['käsekuchen', 'käsesauce', 'käsesoße', 'käsecreme', 'käselikör',
           'käsegebäck', 'käsestange', 'käse-lauch-suppe'],
  'joghurt': ['joghurtdressing', 'joghurteis'],
  'quark': ['quarkkeulchen', 'quarkkuchen'],
  // Gemüse → verarbeitete Produkte
  'tomate': ['tomatenmark', 'tomatenpaste', 'tomatensaft', 'tomatensauce', 'tomatensoße',
             'tomatenketchup', 'tomaten ketchup', 'tomatensuppe', 'tomatencremesuppe'],
  'tomaten': ['tomatenmark', 'tomatenpaste', 'tomatensaft', 'tomatensauce', 'tomatensoße',
              'tomatenketchup', 'tomaten ketchup', 'tomatensuppe', 'tomatencremesuppe'],
  'paprika': ['paprikapulver', 'paprikagewürz', 'paprikachips'],
  'gurke': ['gurkensalat'],
  'möhre': ['möhrenmus', 'möhrenmark', 'möhrenkuchen', 'möhrensaft'],
  'möhren': ['möhrenmus', 'möhrenmark', 'möhrenkuchen', 'möhrensaft'],
  'karotte': ['karottenkuchen', 'karottenmus', 'karottensaft'],
  'karotten': ['karottenkuchen', 'karottenmus', 'karottensaft'],
  'spinat': ['spinatauflauf', 'spinatnudeln', 'spinatlasagne'],
  'brokkoli': ['brokkoliauflauf', 'brokkolinudeln'],
  'kartoffel': ['kartoffelchips', 'kartoffelpuffer', 'kartoffelpüree'],
  'mais': ['maiskeimöl', 'maisstärke'],
  'reis': ['reiskocher', 'milchreis', 'milch reis', 'reiswaffel', 'reise', 'reise-',
           'reisezubehör', 'reisekoffer', 'reise-haartrockner'],
  // Obst → verarbeitete Produkte
  'apfel': ['apfelessig', 'apfelschorle', 'apfelsaft', 'apfelwein', 'apfelmus',
            'apfelmark', 'apfelkuchen', 'apfelstrudel'],
  'birne': ['birnendicksaft', 'birnenmus', 'birnenmark'],
  'orange': ['orangensaft', 'orangenlimonade', 'orangenmarmelade'],
  'banane': ['bananenchips', 'bananenmilch', 'bananenkuchen'],
  'kirsche': ['kirschsaft', 'kirschlikör', 'kirschkompott', 'kirschmarmelade'],
  'erdbeere': ['erdbeerjoghurt', 'erdbeereis', 'erdbeermarmelade', 'erdbeermus'],
  'zitrone': ['zitronenreiniger', 'zitronenduft', 'zitronensaft', 'zitronenlimonade'],
  'limette': ['limettenreiniger', 'limettensaft'],
  // Gewürze & Süßungsmittel → verarbeitete Produkte
  'honig': ['honigmelone', 'honigkuchen', 'honigsenf'],
  'zucker': ['zuckerwatte', 'zuckermais', 'zuckererbsen', 'zuckerrübe',
             'zuckerstange', 'zuckerguss', 'zuckerstreusel'],
  'vanille': ['vanilleeis', 'vanillepudding', 'vanillesauce', 'vanillezucker'],
  'zimt': ['zimtsterne', 'zimtschnecke'],
  'ingwer': ['ingwer-shot', 'ingwershot', 'ingwer shot', 'shot'],
  'kurkuma': ['kurkuma-shot', 'kurkumashot', 'shot'],
  // Nüsse & Backzutaten
  'nuss': ['nussschokolade', 'nussnougatcreme', 'nuss-nougat', 'nusskuchen'],
  'mehl': ['mehlschwitze'],
  'öl': ['ölsardinen'],
  'kokos': ['kokos-chips', 'kokoschips', 'kokosöl', 'kokosflocken'],
}

// ===== STOPWORDS =====
const STOPWORDS = new Set([
  'frisch', 'getrocknet', 'gemischt', 'gehackt',
  'gewürfelt', 'gerieben', 'dose', 'glas', 'tiefkühl',
  'bio', 'regional', 'natur', 'extra', 'zum', 'für',
  'oder', 'und', 'mit', 'ohne', 'nach', 'art',
  'rot', 'gelb', 'grün', 'weiß',
  'ca', 'etwa', 'evtl', 'optional', 'alternativ', 'frische', 'frischer',
  'kleine', 'kleiner', 'kleines', 'große', 'großer', 'großes',
  'mittlere', 'mittlerer', 'ganze', 'ganzer', 'halbe', 'halber',
  'vom', 'aus', 'bei', 'von', 'das', 'der', 'die', 'den', 'dem', 'ein', 'eine',
  'stück', 'stk', 'pkg', 'packung', 'beutel', 'tüte', 'flasche', 'becher',
])

// ===== COMPOUND SUFFIXES =====
const COMPOUND_SUFFIXES = [
  'hackfleisch', 'fleisch', 'wurst', 'käse', 'milch',
  'brust', 'filet', 'schenkel', 'keule',
  'sauce', 'soße', 'creme', 'sahne', 'butter', 'öl',
  'mehl', 'zucker', 'salz', 'reis', 'nudeln',
  'brötchen', 'aufschnitt', 'geschnetzeltes', 'gulasch', 'schnitzel',
  'steak', 'braten', 'hack', 'ragout', 'suppe', 'eintopf',
  'joghurt', 'quark', 'pudding', 'aufstrich', 'brot',
  'saft', 'wasser', 'tee', 'kaffee',
  // Zusätzlich für Pasten, Mus, Soßen etc.
  'mark', 'mus', 'paste', 'sirup', 'essig',
  'ketchup', 'senf', 'dressing', 'pesto',
  'kuchen', 'torte', 'strudel',
  'chips', 'marmelade', 'konfitüre',
]

// ===== BRAND WORDS =====
const BRAND_WORDS = new Set([
  'ja!', 'gutguenstig', 'gut&günstig', 'milbona', 'golden',
  'premium', 'delikatess', 'original', 'classic', 'traditionale',
])

// ===== MAX PLAUSIBLE PRICE PER CATEGORY =====
const MAX_PRICE_BY_CATEGORY: Record<string, number> = {
  'Gemüse':               8,
  'Obst':                 8,
  'Milch & Eier':         6,
  'Käse':                 8,
  'Backwaren':            6,
  'Gewürze':              6,
  'Nudeln & Reis':        5,
  'Öle & Fette':         10,
  'Hülsenfrüchte':        5,
  'Konserven':            5,
  'Soßen & Pasten':       5,
  'Sonstiges Lebensmittel': 8,
}
const DEFAULT_MAX_PRICE = 15

// ===== SYNONYME =====
const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  'hähnchenbrust': ['hähnchen', 'huhn', 'hühnchen', 'chicken', 'geflügel'],
  'hähnchen': ['hähnchen', 'huhn', 'hühnchen', 'chicken', 'geflügel'],
  'hühnchen': ['hähnchen', 'huhn', 'hühnchen', 'chicken', 'geflügel'],
  'hackfleisch': ['hackfleisch', 'hack', 'gehacktes', 'rinderhack'],
  'rinderhackfleisch': ['hackfleisch', 'hack', 'rinderhack', 'rindfleisch'],
  'kartoffel': ['kartoffel', 'kartoffeln'],
  'kartoffeln': ['kartoffel', 'kartoffeln'],
  'tomate': ['tomate', 'tomaten', 'rispentomaten', 'cherrytomaten', 'strauchtomaten',
             'cocktailtomaten', 'cocktailstrauchtomaten', 'cherrystrauchtomaten', 'romatomaten',
             'datteltomaten', 'eiertomaten', 'fleischtomaten', 'kirschtomaten'],
  'tomaten': ['tomate', 'tomaten', 'rispentomaten', 'cherrytomaten', 'strauchtomaten',
              'cocktailtomaten', 'cocktailstrauchtomaten', 'cherrystrauchtomaten', 'romatomaten',
              'datteltomaten', 'eiertomaten', 'fleischtomaten', 'kirschtomaten'],
  'zwiebel': ['zwiebel', 'zwiebeln'],
  'zwiebeln': ['zwiebel', 'zwiebeln'],
  'sahne': ['sahne', 'schlagsahne', 'kochsahne'],
  'schlagsahne': ['sahne', 'schlagsahne', 'sprühsahne'],
  'ei': ['eier', 'freilandeier'],
  'eier': ['eier', 'freilandeier'],
  'milch': ['milch', 'vollmilch', 'frischmilch'],
  'reis': ['reis', 'langkornreis', 'basmatireis'],
  'nudeln': ['nudeln', 'pasta', 'spaghetti', 'penne', 'fusilli'],
  'pasta': ['nudeln', 'pasta', 'spaghetti', 'penne'],
  'spaghetti': ['spaghetti', 'pasta', 'nudeln'],
  'knoblauch': ['knoblauch'],
  'ingwer': ['ingwer'],
  'lachs': ['lachs', 'lachsfilet'],
  'lachsfilet': ['lachs', 'lachsfilet'],
  'thunfisch': ['thunfisch', 'thun'],
  'schinken': ['schinken', 'kochschinken'],
  'joghurt': ['joghurt', 'jogurt', 'yoghurt', 'naturjoghurt'],
  'quark': ['quark', 'magerquark', 'speisequark'],
  'mehl': ['mehl', 'weizenmehl'],
  'zucker': ['zucker'],
  'honig': ['honig', 'blütenhonig', 'waldhonig', 'bienenhonig'],
  'butter': ['butter', 'deutsche markenbutter'],
  'paprika': ['paprika'],
  'gurke': ['gurke', 'salatgurke', 'schlangengurke'],
  'zucchini': ['zucchini'],
  'brokkoli': ['brokkoli', 'broccoli'],
  'spinat': ['spinat', 'blattspinat'],
  'champignons': ['champignon', 'champignons', 'pilze'],
  'pilze': ['pilze', 'champignon', 'champignons'],
  'möhren': ['möhre', 'möhren', 'karotte', 'karotten'],
  'karotten': ['möhre', 'möhren', 'karotte', 'karotten'],
  'salat': ['salat', 'kopfsalat', 'eisbergsalat'],
  'käse': ['käse'],
  'gouda': ['gouda', 'käse'],
  'mozzarella': ['mozzarella'],
  'parmesan': ['parmesan', 'parmigiano'],
  'cheddar': ['cheddar'],
  'frischkäse': ['frischkäse'],
  'schmand': ['schmand', 'saure sahne', 'schmant'],
  'senf': ['senf'],
  'ketchup': ['ketchup', 'ketschup'],
  'olivenöl': ['olivenöl', 'oliven öl'],
  'sonnenblumenöl': ['sonnenblumenöl', 'sonnenblumen öl'],
  'rapsöl': ['rapsöl', 'raps öl'],
  // Compound ingredients — map to themselves to prevent splitting-only matches
  'kokosmilch': ['kokosmilch', 'kokosnussmilch', 'kokos milch'],
  'sojamilch': ['sojamilch', 'sojadrink'],
  'hafermilch': ['hafermilch', 'haferdrink', 'hafergetränk'],
  'mandelmilch': ['mandelmilch', 'mandeldrink'],
  'pflanzenmilch': ['pflanzenmilch', 'pflanzendrink', 'haferdrink', 'sojadrink', 'mandeldrink'],
  'kokosnussmilch': ['kokosmilch', 'kokosnussmilch'],
  'buttermilch': ['buttermilch'],
  'crème fraîche': ['creme fraiche', 'crème fraîche', 'cremefraiche', 'creme fraiche'],
  // Additional ingredients
  'lauch': ['lauch', 'porree', 'lauchzwiebel'],
  'frühlingszwiebeln': ['frühlingszwiebel', 'frühlingszwiebeln', 'lauchzwiebel', 'lauchzwiebeln'],
  'hähnchenschenkel': ['hähnchenschenkel', 'hähnchen', 'hühnchen', 'geflügel'],
  'putenbrust': ['putenbrust', 'pute', 'truthahn'],
  'pute': ['pute', 'putenbrust', 'truthahn', 'putenfilet'],
  'schweinefleisch': ['schweinefleisch', 'schwein', 'schweine'],
  'rindfleisch': ['rindfleisch', 'rind', 'rinder'],
  'gehacktes': ['gehacktes', 'hackfleisch', 'hack', 'mett'],
  'feta': ['feta', 'schafskäse', 'hirtenkäse'],
  'emmentaler': ['emmentaler', 'käse'],
  'mascarpone': ['mascarpone'],
  'ricotta': ['ricotta'],
  'saure sahne': ['saure sahne', 'schmand', 'schmant'],
  'basilikum': ['basilikum'],
  'petersilie': ['petersilie'],
  'koriander': ['koriander'],
  'dill': ['dill'],
  'rosmarin': ['rosmarin'],
  'thymian': ['thymian'],
  'oregano': ['oregano'],
  'minze': ['minze', 'pfefferminze'],
  'schnittlauch': ['schnittlauch'],
  'aubergine': ['aubergine'],
  'blumenkohl': ['blumenkohl'],
  'rosenkohl': ['rosenkohl'],
  'kohlrabi': ['kohlrabi'],
  'sellerie': ['sellerie', 'stangensellerie', 'knollensellerie'],
  'fenchel': ['fenchel'],
  'erbsen': ['erbsen'],
  'bohnen': ['bohnen', 'grüne bohnen'],
  'linsen': ['linsen', 'rote linsen', 'belugalinsen', 'berglinsen'],
  'kichererbsen': ['kichererbsen', 'kichererbse'],
  'tofu': ['tofu'],
  'räuchertofu': ['räuchertofu', 'tofu geräuchert', 'tofu'],
  'haferflocken': ['haferflocken', 'kernige haferflocken', 'zarte haferflocken'],
  'couscous': ['couscous'],
  'bulgur': ['bulgur'],
  'quinoa': ['quinoa'],
  'tortillas': ['tortillas', 'wraps', 'tortilla'],
  'toast': ['toast', 'toastbrot', 'sandwichbrot'],
  'ciabatta': ['ciabatta'],
  'baguette': ['baguette'],
  // Erweiterte Synonyme für besseres Matching
  'süßkartoffel': ['süßkartoffel', 'süßkartoffeln', 'batate', 'sweet potato'],
  'süßkartoffeln': ['süßkartoffel', 'süßkartoffeln', 'batate'],
  'rote linsen': ['linsen', 'rote linsen'],
  'kidneybohnen': ['kidneybohnen', 'kidney bohnen', 'kidney-bohnen'],
  'schwarze bohnen': ['schwarze bohnen', 'black beans'],
  'sojasoße': ['sojasoße', 'sojasauce', 'soja sauce', 'soja soße'],
  'sojasauce': ['sojasauce', 'sojasoße', 'soja sauce'],
  'ahornsirup': ['ahornsirup', 'ahorn sirup', 'maple syrup'],
  'agavendicksaft': ['agavendicksaft', 'agavensirup', 'agave'],
  'hefe': ['hefe', 'frische hefe', 'trockenhefe', 'backhefe'],
  'backpulver': ['backpulver'],
  'natron': ['natron', 'backsoda', 'natriumhydrogencarbonat'],
  'speisestärke': ['speisestärke', 'stärke', 'maisstärke', 'kartoffelstärke'],
  'gelatine': ['gelatine', 'blattgelatine'],
  'vanillezucker': ['vanillezucker', 'vanillin-zucker', 'vanillinzucker'],
  'puderzucker': ['puderzucker', 'staubzucker'],
  'brauner zucker': ['brauner zucker', 'rohrzucker', 'rohrohrzucker'],
  'sauerrahm': ['sauerrahm', 'saure sahne', 'schmand'],
  'kräuterquark': ['kräuterquark', 'quark'],
  'vollkornmehl': ['vollkornmehl', 'dinkelmehl', 'vollkorn mehl'],
  'dinkelmehl': ['dinkelmehl', 'mehl'],
  'paniermehl': ['paniermehl', 'semmelbrösel', 'breadcrumbs'],
  'semmelbrösel': ['semmelbrösel', 'paniermehl'],
  'mandelmehl': ['mandelmehl', 'mandel mehl'],
  'kokosmehl': ['kokosmehl', 'kokos mehl'],
  'kokosflocken': ['kokosflocken', 'kokosraspel'],
  'mandeln': ['mandeln', 'mandel'],
  'walnüsse': ['walnüsse', 'walnuss', 'walnusskerne'],
  'haselnüsse': ['haselnüsse', 'haselnuss', 'haselnusskerne'],
  'cashewkerne': ['cashewkerne', 'cashew', 'cashewnüsse'],
  'pinienkerne': ['pinienkerne', 'pinienkern'],
  'sonnenblumenkerne': ['sonnenblumenkerne', 'sonnenblumenkern'],
  'kürbiskerne': ['kürbiskerne', 'kürbiskern'],
  'sesam': ['sesam', 'sesamkörner', 'sesamsaat'],
  'chiasamen': ['chiasamen', 'chia-samen', 'chia samen'],
  'leinsamen': ['leinsamen', 'leinsaat'],
  'rosinen': ['rosinen', 'sultaninen'],
  'cranberries': ['cranberries', 'cranberry'],
  'rote paprika': ['paprika', 'rote paprika', 'spitzpaprika'],
  'peperoni': ['peperoni', 'pepperoni', 'pfefferoni'],
  'jalapeño': ['jalapeño', 'jalapeno'],
  'chili': ['chili', 'chilischote', 'peperoncino'],
  'frühlingszwiebel': ['frühlingszwiebel', 'frühlingszwiebeln', 'lauchzwiebel', 'lauchzwiebeln'],
  'schalotte': ['schalotte', 'schalotten'],
  'rote zwiebel': ['rote zwiebel', 'rote zwiebeln', 'zwiebel'],
  'stangensellerie': ['stangensellerie', 'sellerie', 'staudensellerie'],
  'knollensellerie': ['knollensellerie', 'sellerie'],
  'pak choi': ['pak choi', 'pak-choi', 'bok choy'],
  'chinakohl': ['chinakohl', 'pekingkohl'],
  'grünkohl': ['grünkohl', 'federkohl'],
  'wirsing': ['wirsing', 'wirsingkohl'],
  'rotkohl': ['rotkohl', 'blaukraut'],
  'weißkohl': ['weißkohl', 'weißkraut'],
  'spargel': ['spargel', 'grüner spargel', 'weißer spargel'],
  'rote bete': ['rote bete', 'rote beete', 'randen'],
  'pastinake': ['pastinake', 'pastinaken'],
  'topinambur': ['topinambur'],
  'artischocke': ['artischocke', 'artischocken'],
  'oliven': ['oliven', 'olive'],
  'kapern': ['kapern'],
  'sauerkraut': ['sauerkraut'],
  'tempeh': ['tempeh'],
  'seitan': ['seitan'],
  'sojajoghurt': ['sojajoghurt', 'sojajoghurt natur', 'soja joghurt'],
  'haferdrink': ['haferdrink', 'hafermilch', 'hafer drink', 'hafergetränk'],
  'sojadrink': ['sojadrink', 'sojamilch', 'soja drink'],
  'mandeldrink': ['mandeldrink', 'mandelmilch', 'mandel drink'],
  'kokoswasser': ['kokoswasser', 'kokos wasser'],
  'tomatenmark': ['tomatenmark', 'tomatenpaste'],
  'passierte tomaten': ['passierte tomaten', 'passata'],
  'gehackte tomaten': ['gehackte tomaten', 'geschälte tomaten', 'stückige tomaten'],
  'kokosöl': ['kokosöl', 'kokosnussöl'],
  'sesamöl': ['sesamöl', 'sesam öl'],
  'trüffelöl': ['trüffelöl', 'trüffel öl'],
  'apfelessig': ['apfelessig', 'apfel essig'],
  'weißweinessig': ['weißweinessig', 'weissweinessig'],
  'balsamico': ['balsamico', 'balsamicoessig', 'aceto balsamico'],
  'worcestersauce': ['worcestersauce', 'worcestershire', 'worcestersauce'],
  'tabasco': ['tabasco', 'hot sauce'],
  'sriracha': ['sriracha'],
  'sambal oelek': ['sambal oelek', 'sambal'],
  'currypaste': ['currypaste', 'curry paste'],
  'tahini': ['tahini', 'tahin', 'sesammus', 'sesampaste'],
  'erdnussbutter': ['erdnussbutter', 'erdnussmus', 'peanut butter'],
  'mandelmus': ['mandelmus', 'mandelbutter'],
}

function normalizeUmlauts(str: string): string {
  return str
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
}

// Gibt zurück: { words: string[], isCompound: boolean, compoundFull: string }
// isCompound = true wenn das Wort ein zusammengesetztes Wort war das gesplittet wurde
export interface ExtractedWords {
  words: string[]
  compoundFull: string | null  // Das originale Compound-Wort (z.B. "kokosmilch")
  compoundParts: string[]      // Die Teile (z.B. ["kokos", "milch"])
}

export function extractMainWords(ingredientName: string): ExtractedWords {
  const cleaned = ingredientName
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\//g, ' ')
    .replace(/[-–]/g, ' ')
    .replace(/[0-9]+\s*(g|kg|ml|l|el|tl|stk|stück)\b/g, '')
    .trim()

  const rawWords = cleaned
    .split(/[\s,]+/)
    .filter(w => w.length > 2)
    .filter(w => !STOPWORDS.has(w))

  const words = new Set<string>(rawWords)
  let compoundFull: string | null = null
  const compoundParts: string[] = []

  for (const word of rawWords) {
    const normalized = normalizeUmlauts(word)
    if (normalized !== word) words.add(normalized)

    for (const suffix of COMPOUND_SUFFIXES) {
      if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
        const prefix = word.slice(0, word.length - suffix.length)
        if (prefix.length > 2) {
          compoundFull = word
          compoundParts.push(prefix, suffix)
          words.add(prefix)
          if (prefix.endsWith('er') && prefix.length > 4) {
            words.add(prefix.slice(0, -2))
          }
        }
        words.add(suffix)
        break
      }
    }
  }

  return { words: Array.from(words), compoundFull, compoundParts }
}

// Prüft ob ein Wort als ganzes Wort (mit Wortgrenzen) im Text vorkommt
function wordBoundaryMatch(text: string, term: string): boolean {
  if (term.length < 3) return false
  try {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|[\\s\\-\\/,.()])${escaped}(en|er|es|e|s|n)?([\\s\\-\\/,.()]|$)`, 'i')
    return re.test(text)
  } catch {
    return false
  }
}

export function isNonFoodOffer(offerName: string): boolean {
  const lower = offerName.toLowerCase()
  return NON_FOOD_KEYWORDS.some(kw => lower.includes(kw))
}

function isBlacklistedOfferMatch(ingredientWord: string, offerName: string): boolean {
  const blacklist = OFFER_BLACKLIST[ingredientWord]
  if (!blacklist) return false
  const offerLower = offerName.toLowerCase()
  return blacklist.some(bl => offerLower.includes(bl))
}

// NEU: Prüft ob das Angebot ein verarbeitetes Fertigprodukt ist
function isProcessedProduct(offerName: string): boolean {
  const lower = offerName.toLowerCase()
  return PROCESSED_PRODUCT_KEYWORDS.some(kw => lower.includes(kw))
}

// NEU: Strengeres Scoring das Compound-Words korrekt behandelt
function scoreOffer(
  offerName: string,
  extracted: ExtractedWords,
  ingredientFull: string,
): number {
  const offerLower = offerName.toLowerCase()
  const offerNormalized = normalizeUmlauts(offerLower)
  const ingredientWords = extracted.words

  // SCHRITT 1: Non-Food sofort raus
  if (isNonFoodOffer(offerName)) return 0

  // SCHRITT 2: Blacklist-Check für alle Wörter
  for (const word of ingredientWords) {
    if (isBlacklistedOfferMatch(word, offerName)) return 0
  }

  // SCHRITT 3: Verarbeitetes Produkt? → Nur voller Name darf matchen
  const isProcessed = isProcessedProduct(offerName)

  // SCHRITT 4: Zutat-Name KOMPLETT im Angebotsnamen?
  const ingLower = ingredientFull.toLowerCase()
    .replace(/\s*\([^)]*\)/g, '').trim()
  const ingNormalized = normalizeUmlauts(ingLower)

  // Voller Name Match (mit Wortgrenzen) → Höchste Priorität
  // ABER: Bei verarbeiteten Produkten prüfen ob die Zutat selbst schon
  // ein verarbeitetes Produkt ist. Wenn JA → Match erlauben (z.B. "Ketchup" → "Heinz Ketchup").
  // Wenn NEIN → Zutat ist ein Roh-Lebensmittel das nur als Basis-Zutat in einem
  // verarbeiteten Produkt vorkommt → BLOCKEN (z.B. "Tomate" → "Bio Passierte Tomaten").
  if (wordBoundaryMatch(offerLower, ingLower) || wordBoundaryMatch(offerNormalized, ingNormalized)) {
    if (isProcessed && !isProcessedProduct(ingredientFull)) {
      // Roh-Zutat (z.B. "Tomate") matcht auf verarbeitetes Angebot (z.B. "Bio Passierte Tomaten")
      // → Nur erlauben wenn die Zutat den Kern des Angebots bildet
      const ratio = ingLower.length / offerLower.replace(/[^a-zäöüß]/g, '').length
      if (ratio < 0.5) return 0
    }
    return 400
  }

  // Track best score from compound-prefix detection — DON'T return early,
  // because synonyms (e.g. "rispentomaten" for "tomate") might score higher
  let compoundPrefixScore = 0

  // Angebot enthält den vollen Zutatnamen als Substring
  // ABER: Prüfe ob es ein Compound-Präfix ist (z.B. "zucker" in "zuckermais")
  // In dem Fall ist die Zutat nur ein Modifizierer, nicht das Hauptprodukt
  // Für sehr kurze Zutatnamen (< 4 Zeichen, z.B. "ei", "öl") ist Substring-Matching
  // zu riskant — "ei" matcht in "Skrei", "frei", "Dessertei" etc.
  // Nur für längere Namen den Substring-Check machen.
  if (ingLower.length >= 4 && (offerLower.includes(ingLower) || offerNormalized.includes(ingNormalized))) {
    // Finde die Position im Angebot
    const pos = offerLower.indexOf(ingLower)
    const afterPos = pos + ingLower.length
    // Wenn nach dem Zutatnamen direkt ein Buchstabe folgt → es ist ein
    // deutsches Kompositum (z.B. "zucker|mais", "milch|schnitte")
    // → nur als schwacher Match werten, nicht als voller Name
    if (afterPos < offerLower.length && /[a-zäöüß]/.test(offerLower[afterPos])) {
      // Es ist ein Compound-Präfix — kein Full-Match
      // Bei verarbeiteten Produkten → komplett ablehnen
      if (isProcessed) return 0
      // Sonst: merken als schwacher Match, aber WEITER PRÜFEN ob Synonyme
      // einen besseren Score liefern (z.B. "rispentomaten" als Synonym für "tomate")
      if (ingLower.length >= 5) compoundPrefixScore = 80
      // Kurze Wörter als Compound-Präfix → zu riskant (z.B. "ei" in "eis")
      // compoundPrefixScore bleibt 0
    } else {
      // Zutat steht als eigenständiges Wort (Ende des Strings oder Leerzeichen danach)
      return 350
    }
  }

  // SCHRITT 5: Compound-Word-Handling
  // Wenn die Zutat ein Compound war (z.B. "Kokosmilch" → "kokos" + "milch"),
  // dann NUR matchen wenn das Compound selbst im Angebot vorkommt
  if (extracted.compoundFull) {
    const compNorm = normalizeUmlauts(extracted.compoundFull)

    // Compound-Word selbst im Angebot? → Guter Match
    if (wordBoundaryMatch(offerLower, extracted.compoundFull) ||
        wordBoundaryMatch(offerNormalized, compNorm)) {
      return 300
    }
    if (offerLower.includes(extracted.compoundFull) || offerNormalized.includes(compNorm)) {
      return 250
    }

    // NUR die Compound-Parts? Das ist zu schwach.
    // Bei verarbeiteten Produkten → komplett ablehnen
    if (isProcessed) return 0

    // Bei normalen Produkten: Checke ob BEIDE Teile vorhanden sind
    const partsMatched = extracted.compoundParts.filter(part =>
      part.length >= 3 && (wordBoundaryMatch(offerLower, part) || wordBoundaryMatch(offerNormalized, normalizeUmlauts(part)))
    )

    if (partsMatched.length >= 2) {
      // Beide Teile des Compounds vorhanden → okay aber niedrigerer Score
      return Math.max(120, compoundPrefixScore)
    }

    // Nur EIN Teil des Compounds → fast sicher ein False Positive
    // z.B. "milch" aus "Kokosmilch" matcht auf "Vollmilch-Schokolade" → NEIN
    return compoundPrefixScore
  }

  // SCHRITT 6: Synonym-/Wort-Matching
  // Prüfe ob Synonym-Wörter (z.B. "rispentomaten", "cherrytomaten" für "tomate")
  // als ganzes Wort im Angebot vorkommen → das ist ein starker Match!
  // Bei verarbeiteten Produkten: Nur Full-Name-Match erlaubt (oben bereits geprüft)
  if (isProcessed) return compoundPrefixScore

  // NEU: Prüfe ob ein Synonym-Wort den Angebotsnamen als Ganzes matcht.
  // z.B. Synonym "rispentomaten" für Zutat "tomate" → Angebot "Rispentomaten"
  // Das ist faktisch ein Full-Name-Match und sollte hoch scoren.
  for (const word of ingredientWords) {
    if (word.length < 5) continue
    const wordNormalized = normalizeUmlauts(word)
    // Prüfe ob das Synonym-Wort den Offer-Namen komplett trifft (word-boundary match
    // + das Wort macht den Großteil des Offer-Namens aus)
    if (wordBoundaryMatch(offerLower, word) || wordBoundaryMatch(offerNormalized, wordNormalized)) {
      // Wenn das Synonym-Wort >= 80% des Offer-Namens ausmacht, ist es ein voller Match
      // z.B. "rispentomaten" (14 chars) vs "rispentomaten" (14 chars) = 100%
      // z.B. "rispentomaten" (14 chars) vs "bio rispentomaten 500g" (22 chars) = 63%
      // Auch "rispentomaten" in "Rispentomaten, Klasse 1" = guter Match
      const ratio = word.length / offerLower.replace(/[^a-zäöüß]/g, '').length
      if (ratio >= 0.5) {
        return 400
      }
    }
  }

  // Check ob irgendein Wort matcht (inkl. Synonyme)
  let anyMatch = false
  for (const word of ingredientWords) {
    if (word.length < 3) continue
    const wordNormalized = normalizeUmlauts(word)
    if (wordBoundaryMatch(offerLower, word) || wordBoundaryMatch(offerNormalized, wordNormalized)) {
      anyMatch = true
      break
    }
    if (offerLower.startsWith(word + ' ') || offerLower.startsWith(word + '-') ||
        offerNormalized.startsWith(wordNormalized + ' ') || offerNormalized.startsWith(wordNormalized + '-')) {
      anyMatch = true
      break
    }
  }
  if (!anyMatch) return compoundPrefixScore

  // Feiner scoren
  let totalScore = 0
  let matchedWords = 0

  for (const word of ingredientWords) {
    if (word.length < 3) continue
    const wordNormalized = normalizeUmlauts(word)

    if (wordBoundaryMatch(offerLower, word) || wordBoundaryMatch(offerNormalized, wordNormalized)) {
      totalScore += 100
      matchedWords++
      continue
    }
    if (offerLower.startsWith(word) || offerNormalized.startsWith(wordNormalized)) {
      totalScore += 70
      matchedWords++
      continue
    }
    if (word.length >= 5 && !BRAND_WORDS.has(word)) {
      if (offerLower.includes(word) || offerNormalized.includes(wordNormalized)) {
        totalScore += 30
        matchedWords++
      }
    }
  }

  if (matchedWords >= 2) totalScore += 50
  // Return the better of the two: synonym word matching or compound-prefix detection
  return Math.max(totalScore, compoundPrefixScore)
}

/**
 * Simple boolean check: does this offer match this ingredient?
 * Used by useOfferRecipes.ts for recipe-to-offer matching.
 * Returns true if the match score is >= 80.
 */
export function doesOfferMatchIngredientSimple(
  offerName: string,
  offerCategory: string | null,
  ingredientName: string,
  ingredientCategory: string | null,
  synonymMap?: Map<string, string[]>,
): boolean {
  // Block non-food categories
  if (offerCategory && BLOCKED_OFFER_CATEGORIES.includes(offerCategory)) return false

  // Category compatibility check
  if (ingredientCategory && offerCategory) {
    const allowed = getAllowedOfferCategories(ingredientCategory)
    if (allowed && !allowed.includes(offerCategory) && offerCategory !== ingredientCategory) {
      return false
    }
  }

  // Build search terms
  const extracted = extractMainWords(ingredientName)
  const nameLower = ingredientName.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim()

  // Add built-in synonyms
  const directSyns = INGREDIENT_SYNONYMS[nameLower]
  if (directSyns) {
    for (const s of directSyns) {
      if (!extracted.words.includes(s) && s.length > 2) {
        extracted.words.push(s)
      }
    }
  }

  // Add external synonyms
  if (synonymMap) {
    const syns = synonymMap.get(nameLower)
    if (syns) {
      for (const s of syns) {
        const sub = extractMainWords(s)
        for (const w of sub.words) {
          if (!extracted.words.includes(w)) extracted.words.push(w)
        }
      }
    }
  }

  // Score the offer
  const score = scoreOffer(offerName, extracted, ingredientName)
  return score >= 80
}

export function matchIngredientToOffer(
  ingredient: { name: string; category: string | null },
  offers: OfferCandidate[],
  synonymMap?: Map<string, string[]>,
): OfferMatch | null {
  // Step 1: BLOCKE Nicht-Lebensmittel-Kategorien
  const foodOffers = offers.filter(o =>
    !o.category || !BLOCKED_OFFER_CATEGORIES.includes(o.category)
  )

  // Step 2: Kategorie-Filter
  const allowedCategories = getAllowedOfferCategories(ingredient.category)
  let pool: OfferCandidate[]
  let usedCategoryFilter = false

  if (allowedCategories) {
    pool = foodOffers.filter(o =>
      o.category !== null && (
        allowedCategories.includes(o.category) ||
        o.category === ingredient.category
      )
    )
    usedCategoryFilter = pool.length > 0

    // NEU: Wenn Kategorie-Pool leer → füge NUR "Sonstiges Lebensmittel" hinzu,
    // nicht ALLE Angebote (das war der Hauptgrund für False Positives)
    if (pool.length === 0) {
      pool = foodOffers.filter(o => o.category === 'Sonstiges Lebensmittel')
    }
  } else {
    pool = foodOffers
  }

  // Step 3: Suchbegriffe aufbauen
  const extracted = extractMainWords(ingredient.name)
  const nameLower = ingredient.name.toLowerCase()
    .replace(/\s*\([^)]*\)/g, '').trim()

  // Built-in Synonyme hinzufügen (Set for O(1) lookups)
  const wordSet = new Set(extracted.words)

  const directSyns = INGREDIENT_SYNONYMS[nameLower]
  if (directSyns) {
    for (const s of directSyns) {
      if (s.length > 2 && !wordSet.has(s)) {
        extracted.words.push(s)
        wordSet.add(s)
      }
    }
  }
  for (const word of [...extracted.words]) {
    const wordSyns = INGREDIENT_SYNONYMS[word]
    if (wordSyns) {
      for (const s of wordSyns) {
        if (s.length > 2 && !wordSet.has(s)) {
          extracted.words.push(s)
          wordSet.add(s)
        }
      }
    }
  }

  // Externe Synonyme
  if (synonymMap) {
    const syns = synonymMap.get(nameLower)
    if (syns) {
      for (const s of syns) {
        const subExtracted = extractMainWords(s)
        for (const w of subExtracted.words) {
          if (!wordSet.has(w)) {
            extracted.words.push(w)
            wordSet.add(w)
          }
        }
      }
    }
    for (const [canonical, synonyms] of synonymMap) {
      if (synonyms.includes(nameLower) || canonical === nameLower) {
        const canExtracted = extractMainWords(canonical)
        for (const w of canExtracted.words) {
          if (!wordSet.has(w)) {
            extracted.words.push(w)
            wordSet.add(w)
          }
        }
        for (const s of synonyms) {
          const synExtracted = extractMainWords(s)
          for (const w of synExtracted.words) {
            if (!wordSet.has(w)) {
              extracted.words.push(w)
              wordSet.add(w)
            }
          }
        }
      }
    }
  }

  // Step 4: Alle Angebote scoren
  const scored: ScoredOffer[] = pool.map(offer => ({
    offer,
    score: scoreOffer(offer.product_name, extracted, ingredient.name),
  }))

  // Step 5: Preisplausibilität
  for (const s of scored) {
    if (s.score <= 0) continue
    const price = s.offer.offer_price
    const cat = s.offer.category ?? ingredient.category
    const maxPrice = (cat ? MAX_PRICE_BY_CATEGORY[cat] : null) ?? DEFAULT_MAX_PRICE
    if (price > maxPrice) {
      s.score = Math.max(0, s.score - 150)
    }
  }

  // Step 5b: Strengerer Threshold für "Sonstiges Lebensmittel"
  // Diese Catch-All-Kategorie enthält viel Non-Food und verarbeitete Produkte.
  // Nur Matches mit hohem Score (>= 150) aus dieser Kategorie akzeptieren.
  const SONSTIGES_THRESHOLD = 150
  const BASE_THRESHOLD = 80

  // Step 6: Bestes Match — dynamischer Threshold je nach Kategorie
  const best = scored
    .filter(s => {
      if (s.score < BASE_THRESHOLD) return false
      // Strengerer Threshold für "Sonstiges Lebensmittel" wenn es nicht
      // aus dem normalen Kategorie-Pool stammt
      if (s.offer.category === 'Sonstiges Lebensmittel' && usedCategoryFilter) {
        return s.score >= SONSTIGES_THRESHOLD
      }
      return true
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (b.offer.discount_percent ?? 0) - (a.offer.discount_percent ?? 0)
    })[0]

  if (!best) return null

  // Originalpreis sicherstellen: Wenn discount vorhanden aber kein original_price,
  // berechne rückwärts aus dem Rabatt
  let originalPrice = best.offer.original_price
  if (originalPrice == null && best.offer.discount_percent && best.offer.discount_percent > 0) {
    originalPrice = Math.round((best.offer.offer_price / (1 - best.offer.discount_percent / 100)) * 100) / 100
  }

  return {
    offerId: best.offer.id,
    offerPrice: best.offer.offer_price,
    originalPrice,
    store: best.offer.store,
    discountPercent: best.offer.discount_percent,
    productName: best.offer.product_name,
  }
}

// ===== MATCHING MONITOR =====
// Debug-Tool: Zeigt alle Matches für eine Zutat mit Scores.
// Kann im Browser via Konsole aufgerufen werden:
//   window.__debugMatch("Tomate (frisch)", "Gemüse")
export function debugMatchIngredient(
  ingredientName: string,
  _ingredientCategory: string | null,
  offers: OfferCandidate[],
  synonymMap?: Map<string, string[]>,
): Array<{ product: string; store: string; category: string | null; score: number; matched: boolean }> {
  const extracted = extractMainWords(ingredientName)
  const nameLower = ingredientName.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim()

  // Add synonyms
  const wordSet = new Set(extracted.words)
  const directSyns = INGREDIENT_SYNONYMS[nameLower]
  if (directSyns) {
    for (const s of directSyns) {
      if (s.length > 2 && !wordSet.has(s)) {
        extracted.words.push(s)
        wordSet.add(s)
      }
    }
  }

  if (synonymMap) {
    const syns = synonymMap.get(nameLower)
    if (syns) {
      for (const s of syns) {
        const sub = extractMainWords(s)
        for (const w of sub.words) {
          if (!wordSet.has(w)) { extracted.words.push(w); wordSet.add(w) }
        }
      }
    }
  }

  // Score all offers
  const results = offers
    .filter(o => !o.category || !BLOCKED_OFFER_CATEGORIES.includes(o.category))
    .map(offer => {
      const score = scoreOffer(offer.product_name, extracted, ingredientName)
      const isSonstiges = offer.category === 'Sonstiges Lebensmittel'
      const threshold = isSonstiges ? 150 : 80
      return {
        product: offer.product_name,
        store: offer.store,
        category: offer.category,
        score,
        matched: score >= threshold,
      }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)

  return results
}
