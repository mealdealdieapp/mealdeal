/**
 * MealDeal - Angebote Scraper (Node.js)
 * Holt Angebote von Marktguru und speichert sie in Supabase
 */

const https = require("https");
const readline = require("readline");

// === CONFIG ===
const SUPABASE_URL = "https://wjhesvkapqrsbibqjbtr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqaGVzdmthcHFyc2JpYnFqYnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTE4NDEsImV4cCI6MjA4ODQyNzg0MX0.-Vh6_Qtz1EZzPJA70lXf8boCGBs1S7c05KzbUFK-dJs";

const KNOWN_MARKETS = {
  "REWE": "REWE", "REWE Center": "REWE",
  "PENNY": "Penny",
  "EDEKA": "Edeka", "E center": "Edeka",
  "Kaufland": "Kaufland",
  "Lidl": "Lidl",
  "ALDI SÜD": "ALDI", "ALDI Nord": "ALDI",
  "Netto Marken-Discount": "Netto", "Netto": "Netto",
  "Norma": "Norma", "nahkauf": "REWE",
};

const OBST = ["apfel","banane","orange","birne","kirsche","erdbeere","beere","traube","mango","ananas","melone","zitrone","pflaume","pfirsich","nektarine","kiwi","obst","clementine","mandarine","himbeere","heidelbeere"];

function mapCategory(catName, productName) {
  const cat = (catName || "").toLowerCase();
  const name = productName.toLowerCase();
  if (["fleisch","wurst","schinken","geflügel"].some(k => cat.includes(k))) return "Fleisch";
  if (["obst","gemüse","salat"].some(k => cat.includes(k))) return OBST.some(k => name.includes(k)) ? "Obst" : "Gemüse";
  if (["milch","joghurt","butter","sahne","quark","eier"].some(k => cat.includes(k))) return "Milch & Eier";
  if (cat.includes("käse")) return "Käse";
  if (cat.includes("tiefkühl")) return "Tiefkühl";
  if (["getränke","bier","wein","saft","wasser"].some(k => cat.includes(k))) return "Getränke";
  if (["snack","süß","chips","schokolade"].some(k => cat.includes(k))) return "Snacks & Süßes";
  if (["brot","back","brötchen"].some(k => cat.includes(k))) return "Backwaren";
  if (["nudel","reis","pasta"].some(k => cat.includes(k))) return "Nudeln & Reis";
  if (["konserve","fertig"].some(k => cat.includes(k))) return "Konserven";
  if (["gewürz","sauce","soße","essig"].some(k => cat.includes(k))) return "Gewürze";
  if (["fisch","meeresfrüchte"].some(k => cat.includes(k))) return "Fisch & Meeresfrüchte";
  if (["öl","fett"].some(k => cat.includes(k))) return "Öle & Fette";
  if (["haushalt","reinigung"].some(k => cat.includes(k))) return "Haushalt";
  if (["drogerie","pflege","hygiene"].some(k => cat.includes(k))) return "Drogerie";
  return "Sonstiges Lebensmittel";
}

// HTTPS GET helper
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// HTTPS POST helper
function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postData) },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(postData);
    req.end();
  });
}

// Marktguru API-Keys extrahieren
async function getApiKeys() {
  process.stdout.write("Hole API-Keys von marktguru.de... ");
  try {
    const html = await new Promise((resolve, reject) => {
      https.get("https://www.marktguru.de", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0" }
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => resolve(data));
      }).on("error", reject);
    });

    const apiKey = html.match(/"apiKey":"([^"]+)"/);
    const clientKey = html.match(/"clientKey":"([^"]+)"/);

    if (apiKey && clientKey) {
      console.log("OK");
      return { apiKey: apiKey[1], clientKey: clientKey[1] };
    }
    console.log("Keys nicht im HTML gefunden");
    return null;
  } catch (e) {
    console.log("Fehler: " + e.message);
    return null;
  }
}

// Angebote von Marktguru holen
async function fetchOffers(plz, apiKey, clientKey) {
  const allOffers = [];
  const industries = [1009, 1023]; // Supermarkt + Discounter

  for (const industryId of industries) {
    const label = industryId === 1009 ? "Supermarkt" : "Discounter";
    console.log(`\n  [${label}] Lade Angebote...`);
    let offset = 0;

    while (offset < 1500) {
      const url = `https://api.marktguru.de/api/v1/offers?as=web&limit=200&offset=${offset}&zipCode=${plz}&industryId=${industryId}`;
      try {
        await new Promise(r => setTimeout(r, 500)); // Rate limit
        const data = await httpsGet(url, {
          "Accept": "application/json",
          "x-apikey": apiKey,
          "x-clientkey": clientKey,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        });

        const offers = Array.isArray(data) ? data : (data?.results || data?.offers || data?.data || []);
        if (!offers.length) break;

        allOffers.push(...offers);
        console.log(`    +${offers.length} Angebote (gesamt: ${allOffers.length})`);
        if (offers.length < 200) break;
        offset += 200;
      } catch (e) {
        console.log(`    Fehler: ${e.message}`);
        break;
      }
    }
  }
  return allOffers;
}

// In Supabase speichern
async function saveToSupabase(records) {
  if (!records.length) return 0;
  let total = 0;
  const BATCH = 100;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    try {
      await httpsPost(`${SUPABASE_URL}/rest/v1/offers`, batch, {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "resolution=merge-duplicates",
      });
      total += batch.length;
      console.log(`  Batch ${Math.floor(i/BATCH)+1}: ${batch.length} gespeichert`);
    } catch (e) {
      console.log(`  Batch ${Math.floor(i/BATCH)+1} Fehler: ${e.message}`);
    }
  }
  return total;
}

// Angebote transformieren
function transformOffers(rawOffers, plz) {
  const plzPrefix = plz.slice(0, 3);
  const transformed = [];
  const storeCounts = {};

  for (const offer of rawOffers) {
    const advertiser = (offer.advertiserName || "").trim();
    let market = KNOWN_MARKETS[advertiser];
    if (!market) {
      for (const [key, val] of Object.entries(KNOWN_MARKETS)) {
        if (advertiser.toUpperCase().includes(key.toUpperCase())) { market = val; break; }
      }
    }
    if (!market) continue;

    const title = (offer.title || "").trim();
    if (!title) continue;
    const price = offer.price;
    if (price == null) continue;

    const refPrice = offer.referencePrice;
    let discount = null;
    if (refPrice && refPrice > 0 && refPrice > price) {
      discount = Math.round(((refPrice - price) / refPrice) * 100);
    }

    let catName = "";
    if (offer.category && typeof offer.category === "object") catName = offer.category.name || "";
    else if (typeof offer.category === "string") catName = offer.category;

    const validUntil = (offer.validTo || "").slice(0, 10);
    if (!validUntil) continue;

    transformed.push({
      product_name: title,
      store: market,
      offer_price: Math.round(price * 100) / 100,
      original_price: refPrice ? Math.round(refPrice * 100) / 100 : null,
      discount_percent: discount,
      plz: plz,
      plz_prefix: plzPrefix,
      category: mapCategory(catName, title),
      valid_from: (offer.validFrom || "").slice(0, 10) || null,
      valid_until: validUntil,
      image_url: offer.imageUrl || null,
      quantity: offer.quantity || null,
      fingerprint: `${market}_${title}_${validUntil}`.toLowerCase().trim(),
    });

    storeCounts[market] = (storeCounts[market] || 0) + 1;
  }

  return { transformed, storeCounts };
}

// === MAIN ===
async function main() {
  console.log("=".repeat(50));
  console.log("  MealDeal - Angebote laden");
  console.log("=".repeat(50));
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const plz = await new Promise(r => rl.question("Deine PLZ eingeben: ", r));
  rl.close();

  if (!/^\d{5}$/.test(plz.trim())) {
    console.log("Ungueltige PLZ! Muss 5 Ziffern sein.");
    return;
  }

  // 1. API-Keys
  const keys = await getApiKeys();
  if (!keys) { console.log("\nAPI-Keys nicht verfuegbar."); return; }

  // 2. Angebote holen
  console.log(`\nHole Angebote fuer PLZ ${plz.trim()}...`);
  const raw = await fetchOffers(plz.trim(), keys.apiKey, keys.clientKey);
  console.log(`\n${raw.length} Angebote von Marktguru erhalten`);
  if (!raw.length) { console.log("Keine Angebote gefunden."); return; }

  // 3. Transformieren
  const { transformed, storeCounts } = transformOffers(raw, plz.trim());
  console.log(`\n${transformed.length} Angebote nach Filterung:\n`);
  Object.entries(storeCounts).sort((a,b) => b[1]-a[1]).forEach(([s,c]) => console.log(`  ${s}: ${c} Angebote`));

  if (!transformed.length) { console.log("\nKeine Angebote zum Speichern."); return; }

  // 4. Speichern
  console.log(`\nSpeichere ${transformed.length} Angebote in Supabase...`);
  const saved = await saveToSupabase(transformed);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  FERTIG! ${saved} Angebote gespeichert`);
  console.log("=".repeat(50));
  console.log(`\n  Starte jetzt die App mit STARTE_APP.bat`);
}

main().catch(e => console.error("Fehler:", e.message));
