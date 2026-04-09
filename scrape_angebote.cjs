/**
 * MealDeal - Angebote Scraper (Node.js)
 * Holt Angebote von Marktguru und speichert sie in Supabase
 */

const https = require("https");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// === CONFIG aus .env laden ===
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("FEHLER: .env Datei nicht gefunden!");
    console.error("Erstelle eine .env Datei mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}
const ENV = loadEnv();
const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const SUPABASE_KEY = ENV.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("FEHLER: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt in .env!");
  process.exit(1);
}

const KNOWN_MARKETS = {
  // Exakte Matches
  "REWE": "REWE", "Rewe": "REWE", "rewe": "REWE", "REWE Center": "REWE",
  "PENNY": "Penny", "Penny": "Penny", "penny": "Penny",
  "EDEKA": "Edeka", "Edeka": "Edeka", "edeka": "Edeka", "E center": "Edeka", "E Center": "Edeka",
  "Kaufland": "Kaufland", "kaufland": "Kaufland",
  "Lidl": "Lidl", "lidl": "Lidl", "LIDL": "Lidl",
  "ALDI SÜD": "ALDI", "ALDI NORD": "ALDI", "ALDI Nord": "ALDI", "Aldi Nord": "ALDI", "Aldi Süd": "ALDI", "ALDI": "ALDI", "Aldi": "ALDI",
  "Netto Marken-Discount": "Netto", "Netto": "Netto", "netto": "Netto",
  "Norma": "Norma", "NORMA": "Norma",
  "nahkauf": "nahkauf", "Nahkauf": "nahkauf",
  "tegut": "tegut", "tegut...": "tegut",
  "Globus": "Globus", "GLOBUS": "Globus",
  "dm": "dm", "dm-drogerie markt": "dm",
  "Rossmann": "Rossmann", "ROSSMANN": "Rossmann",
  "Müller": "Müller",
  "real": "real", "Real": "real",
  "Marktkauf": "Marktkauf",
  "famila": "famila",
  "Hit": "Hit", "HIT": "Hit",
  "Combi": "Combi",
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
  const skipped = { noAdvertiser: 0, noTitle: 0, noPrice: 0, noValidUntil: 0 };
  const skippedByStore = {};

  for (const offer of rawOffers) {
    // Markt aus advertisers Array
    const advertiser = (offer.advertisers && offer.advertisers[0] && offer.advertisers[0].name) || "";
    if (!advertiser) { skipped.noAdvertiser++; continue; }
    let market = KNOWN_MARKETS[advertiser];
    if (!market) {
      // Fuzzy lookup
      const advUp = advertiser.toUpperCase();
      for (const [key, val] of Object.entries(KNOWN_MARKETS)) {
        if (advUp.includes(key.toUpperCase()) || key.toUpperCase().includes(advUp)) { market = val; break; }
      }
    }
    // Fallback: nutze den Original-Namen
    if (!market) market = advertiser;

    // Produktname aus product.name
    const title = (offer.product && offer.product.name) || (offer.description || "").split("\n")[0];
    if (!title.trim()) { skipped.noTitle++; skippedByStore[market] = (skippedByStore[market]||0)+1; continue; }

    const price = offer.price;
    if (price == null) { skipped.noPrice++; skippedByStore[market] = (skippedByStore[market]||0)+1; continue; }

    // Alter Preis: oldPrice oder referencePrice
    const oldPrice = offer.oldPrice || null;
    let discount = null;
    if (oldPrice && oldPrice > 0 && oldPrice > price) {
      discount = Math.round(((oldPrice - price) / oldPrice) * 100);
    }

    // Kategorie aus categories Array
    let catName = "";
    if (offer.categories && offer.categories.length > 0) {
      catName = offer.categories[0].name || "";
    }

    // Gültigkeit aus validityDates Array
    let validFrom = null;
    let validUntil = null;
    if (offer.validityDates && offer.validityDates[0]) {
      validFrom = (offer.validityDates[0].from || "").slice(0, 10);
      validUntil = (offer.validityDates[0].to || "").slice(0, 10);
    }
    if (!validUntil) { skipped.noValidUntil++; skippedByStore[market] = (skippedByStore[market]||0)+1; continue; }

    // Bild aus images Array
    let imageUrl = null;
    if (offer.images && offer.images.length > 0) {
      imageUrl = offer.images[0].url || offer.images[0].large || offer.images[0].medium || offer.images[0].small || null;
    }

    transformed.push({
      product_name: title.trim(),
      store: market,
      offer_price: Math.round(price * 100) / 100,
      original_price: oldPrice ? Math.round(oldPrice * 100) / 100 : null,
      discount_percent: discount,
      plz: plz,
      plz_prefix: plzPrefix,
      category: mapCategory(catName, title),
      valid_from: validFrom || null,
      valid_until: validUntil,
      image_url: imageUrl,
      quantity: offer.quantity || null,
      fingerprint: `${market}_${title.trim()}_${validUntil}`.toLowerCase(),
    });

    storeCounts[market] = (storeCounts[market] || 0) + 1;
  }

  console.log("\n  Uebersprungen:", JSON.stringify(skipped));
  if (Object.keys(skippedByStore).length > 0) {
    console.log("  Uebersprungen pro Store:", JSON.stringify(skippedByStore));
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

  // Debug: alle Haendlernamen aus der API
  const advertiserNames = {};
  for (const o of raw) {
    if (o.advertisers && o.advertisers.length > 0) {
      for (const a of o.advertisers) {
        advertiserNames[a.name] = (advertiserNames[a.name] || 0) + 1;
      }
    }
  }
  console.log(`\nHaendler aus API (${Object.keys(advertiserNames).length}):`);
  Object.entries(advertiserNames).sort((a,b) => b[1]-a[1]).forEach(([n,c]) => console.log(`  "${n}" -> ${c} Angebote`));

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
