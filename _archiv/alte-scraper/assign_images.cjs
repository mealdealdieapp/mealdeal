/**
 * MealDeal - Rezeptbilder-Zuweiser
 * Weist Rezepten ohne Bild passende Unsplash-URLs zu.
 *
 * Nutzt direkte Unsplash-URLs (erlaubt laut Unsplash-Richtlinien für hotlinking).
 * Bilder werden als externe URLs in der image_url-Spalte gespeichert.
 *
 * Usage: node assign_images.js
 */

const https = require("https");

const SUPABASE_URL = "https://wjhesvkapqrsbibqjbtr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqaGVzdmthcHFyc2JpYnFqYnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTE4NDEsImV4cCI6MjA4ODQyNzg0MX0.-Vh6_Qtz1EZzPJA70lXf8boCGBs1S7c05KzbUFK-dJs";

// Mapping: Rezeptname (lowercase) → Unsplash Photo-ID
// Handpicked hochwertige Food-Fotos die zum Gericht passen
const RECIPE_IMAGE_MAP = {
  // === SALADS ===
  "griechischer salat": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
  "caesar salad": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80",
  "quinoa-salat": "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=600&q=80",
  "nudelsalat": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80",
  "couscous-salat": "https://images.unsplash.com/photo-1529059997568-3d847b1154f0?w=600&q=80",
  "asiatischer glasnudelsalat": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80",

  // === SOUPS ===
  "tomatensuppe": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
  "kürbissuppe": "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=600&q=80",
  "kartoffelsuppe": "https://images.unsplash.com/photo-1588566565463-180a5b2060d2?w=600&q=80",
  "linsensuppe": "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
  "thai-kokossuppe": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80",
  "minestrone": "https://images.unsplash.com/photo-1603105037880-880cd4f5be36?w=600&q=80",

  // === DESSERTS ===
  "tiramisu": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80",
  "panna cotta": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
  "schokomousse": "https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=600&q=80",
  "obstsalat": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&q=80",
  "schneller schoko-vanille-kuchen": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
  "crème brûlée": "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&q=80",
  "apfelkuchen": "https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=600&q=80",

  // === DATE NIGHT ===
  "lachs mit spargel": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80",
  "risotto": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80",
  "steak mit kräuterbutter": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
  "pasta aglio e olio": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80",
  "garnelen in knoblauchbutter": "https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=600&q=80",
  "bruschetta": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&q=80",

  // === FOOD TRENDS ===
  "buddha bowl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  "poké bowl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  "açaí bowl": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80",
  "cloud bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
  "baked feta pasta": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80",
  "protein pancakes": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&q=80",

  // === BUDGET ===
  "reis mit gemüse": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80",
  "kartoffelpuffer": "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=600&q=80",
  "pfannkuchen": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&q=80",
  "spaghetti aglio e olio": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80",
  "eierkuchen": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&q=80",
  "brot mit kräuterbutter": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
};

// Generic fallback images per meal category
const FALLBACK_BY_MEAL = {
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80",
  lunch: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
  dinner: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
  snack: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&q=80",
  dessert: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
  baking: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
  date_night: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
  cocktail: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80",
  food_trends: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  budget: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&q=80",
};

// Keyword-basiertes Matching für Rezepte die nicht in der Map sind
const KEYWORD_IMAGES = [
  { keywords: ["pasta", "spaghetti", "nudel", "penne", "fusilli", "tagliatelle", "linguine", "lasagne"], url: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80" },
  { keywords: ["reis", "fried rice", "risotto", "pilaf"], url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80" },
  { keywords: ["hähnchen", "chicken", "hühnchen", "geflügel"], url: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&q=80" },
  { keywords: ["lachs", "salmon", "fisch", "forelle"], url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80" },
  { keywords: ["burger", "hamburger"], url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
  { keywords: ["pizza"], url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80" },
  { keywords: ["wrap", "burrito", "taco", "tortilla"], url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80" },
  { keywords: ["suppe", "soup", "eintopf"], url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80" },
  { keywords: ["salat", "salad", "bowl"], url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80" },
  { keywords: ["steak", "rind", "rindfleisch", "beef"], url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80" },
  { keywords: ["curry", "indisch"], url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80" },
  { keywords: ["pfannkuchen", "pancake", "crêpe", "waffel"], url: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&q=80" },
  { keywords: ["toast", "sandwich", "brot"], url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80" },
  { keywords: ["smoothie", "shake", "drink"], url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80" },
  { keywords: ["kuchen", "cake", "torte", "brownie", "muffin"], url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80" },
  { keywords: ["ei", "eier", "rührei", "omelette", "frittata"], url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80" },
  { keywords: ["kartoffel", "potato", "pommes", "bratkartoffel"], url: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=600&q=80" },
  { keywords: ["gemüse", "vegetable", "veggie", "vegan"], url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80" },
  { keywords: ["wok", "stir fry", "asiatisch", "asia", "thai", "chinesisch"], url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80" },
  { keywords: ["bratwurst", "wurst", "würstchen", "häppchen"], url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80" },
  { keywords: ["joghurt", "müsli", "granola", "porridge", "overnight"], url: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&q=80" },
  { keywords: ["garnele", "shrimp", "garnelen", "meeresfrüchte"], url: "https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=600&q=80" },
  { keywords: ["quiche", "tarte", "auflauf", "gratin"], url: "https://images.unsplash.com/photo-1528736235302-52922df5c122?w=600&q=80" },
];

function findImageUrl(name, meal) {
  const nameLower = name.toLowerCase();

  // 1. Exact match in map
  if (RECIPE_IMAGE_MAP[nameLower]) return RECIPE_IMAGE_MAP[nameLower];

  // 2. Keyword match
  for (const { keywords, url } of KEYWORD_IMAGES) {
    for (const kw of keywords) {
      if (nameLower.includes(kw)) return url;
    }
  }

  // 3. Fallback by meal category
  return FALLBACK_BY_MEAL[meal] || FALLBACK_BY_MEAL.dinner;
}

function supabaseRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      method,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
    };

    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("🖼️  MealDeal Bilder-Zuweiser\n");

  // 1. Lade alle Rezepte ohne Bild
  const url = `/rest/v1/recipes?select=id,name,meal&image_url=is.null&is_public=eq.true`;

  const options = {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
  };

  const recipes = await new Promise((resolve, reject) => {
    https.get(SUPABASE_URL + url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`${res.statusCode}: ${data}`));
      });
    }).on("error", reject);
  });

  console.log(`📋 ${recipes.length} Rezepte ohne Bild gefunden\n`);

  if (recipes.length === 0) {
    console.log("✅ Alle Rezepte haben bereits Bilder!");
    return;
  }

  // 2. Für jedes Rezept ein Bild zuweisen
  let updated = 0;
  let errors = 0;

  for (const recipe of recipes) {
    const imageUrl = findImageUrl(recipe.name, recipe.meal);
    const displayUrl = imageUrl.substring(0, 60) + "...";

    try {
      // Update via Supabase REST API - store as external URL
      // We prefix with "ext:" so RecipeCard knows it's an external URL
      const patchUrl = `/rest/v1/recipes?id=eq.${recipe.id}`;
      await supabaseRequest("PATCH", patchUrl, { image_url: `ext:${imageUrl}` });

      console.log(`✅ ${recipe.name} → ${displayUrl}`);
      updated++;
    } catch (err) {
      console.error(`❌ ${recipe.name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Ergebnis: ${updated} aktualisiert, ${errors} Fehler`);
}

main().catch(console.error);
