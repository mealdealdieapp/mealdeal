"""
MealDeal — Marktguru Scraper v3.0 (API-basiert)
=================================================
Holt Angebotsdaten direkt über die Marktguru REST-API.
API-Keys werden automatisch von der Marktguru-Website extrahiert.

Liefert ~600-800 Lebensmittel-Angebote für eine gegebene PLZ:
  - Supermarkt-Branche (REWE, EDEKA, etc.) — industryId 1009
  - Discounter-Branche (Lidl, ALDI, PENNY, Netto) — industryId 1023

Nutzung:
  python marktguru_scraper.py --plz 56281
  python marktguru_scraper.py --plz 56281 --alle           # Auch Non-Food
  python marktguru_scraper.py --plz 56281 --limit 200      # Max 200 Angebote
  python marktguru_scraper.py --plz 56281 --query butter    # Suchfilter

Rechtlicher Hinweis:
  Die API-Keys sind öffentlich im HTML der Marktguru-Website eingebettet.
  Bitte respektiere die AGBs und setze angemessene Rate-Limits.
"""

import json
import os
import re
import time
import argparse
from datetime import datetime
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Fehlende Pakete. Installiere mit:")
    print("  pip install requests beautifulsoup4 --break-system-packages")
    exit(1)


# ============================================
# KONFIGURATION
# ============================================
BASE_URL = "https://www.marktguru.de"
API_URL = "https://api.marktguru.de/api/v1"

# Lebensmittel-relevante Branchen
FOOD_INDUSTRIES = {
    1009: "Supermarkt",    # REWE, EDEKA, etc.
    1023: "Discounter",    # Lidl, ALDI, PENNY, Netto
}

# Händler-Normalisierung (für einheitliche IDs in der App)
RETAILER_NORMALIZE = {
    "REWE": "rewe",
    "REWE Center": "rewe_center",
    "PENNY": "penny",
    "EDEKA": "edeka",
    "E center": "edeka_center",
    "E xpress": "edeka_express",
    "Kaufland": "kaufland",
    "Lidl": "lidl",
    "ALDI SÜD": "aldi_sued",
    "ALDI Nord": "aldi_nord",
    "Netto Marken-Discount": "netto",
    "nahkauf": "nahkauf",
    "trinkgut": "trinkgut",
    "Norma": "norma",
}

# Lebensmittel-Kategorien (Whitelist) — alle Kategorien die Food sind
# Statt Non-Food auszuschließen, definieren wir was Food ist (sicherer)
FOOD_CATEGORY_PATTERNS = {
    # Milchprodukte
    "käse", "joghurt", "milch", "butter", "sahne", "quark", "schmand",
    "frischkäse", "mozzarella", "mascarpone", "crème", "kefir", "skyr",
    # Fleisch & Wurst
    "fleisch", "wurst", "würst", "schinken", "salami", "aufschnitt", "hack",
    "geflügel", "rind", "schwein", "lamm", "wild", "mariniert", "steak",
    "bratwurst", "wiener", "leberkäse", "speck", "bacon",
    # Fisch
    "fisch", "lachs", "räucherfisch", "meeresfrüchte", "thunfisch",
    "garnelen", "krabben", "hering", "forelle", "scholle",
    # Obst & Gemüse
    "obst", "gemüse", "salat", "tomaten", "kartoffel", "wurzel",
    "zwiebel", "pilz", "kräuter", "beeren", "äpfel", "banane",
    "zitrus", "trauben", "melone", "avocado", "paprika", "gurke",
    "früchte", "frucht", "ananas", "mango", "kiwi", "birne",
    "erdbeeren", "himbeeren", "kirschen", "pflaumen", "pfirsich",
    "kohlrabi", "brokkoli", "blumenkohl", "zucchini", "aubergine",
    "spargel", "spinat", "bohnen", "erbsen", "mais", "lauch",
    # Backwaren
    "brot", "brötchen", "kuchen", "gebäck", "toast", "croissant",
    "baguette", "laugen", "torte", "muffin", "donut",
    # Getränke
    "softdrink", "wasser", "saft", "limonade", "eistee", "energy",
    "kaffee", "tee", "kakao", "milchgetränk", "cola", "fanta", "sprite",
    # Alkohol
    "bier", "wein", "sekt", "champagner", "spirituose", "likör",
    "whiskey", "vodka", "gin", "rum", "prosecco", "rotwein", "weisswein",
    "rosé", "aperitif", "grappa", "cognac", "brandy",
    # Süßes & Snacks
    "schokolade", "keks", "bonbon", "gummibärchen", "chips", "nüsse",
    "müsli", "riegel", "süßwaren", "praline", "eis", "dessert",
    "pudding", "snack", "popcorn", "salzgebäck", "fruchtgummi",
    "lakritz", "marzipan", "waffel", "dragee",
    # Tiefkühl
    "tiefkühl", "pizza", "pommes", "kroketten", "nuggets", "tk-",
    "tiefgefror", "gefror",
    # Konserven & Fertig
    "konserve", "nudel", "reis", "mehl", "zucker", "öl", "essig",
    "sauce", "soße", "ketchup", "senf", "mayo", "dip", "pesto",
    "instant", "fertiggericht", "suppe", "eintopf", "brühe",
    # Gewürze
    "gewürz", "salz", "pfeffer", "kräutermisch",
    # Vegetarisch/Vegan
    "vegan", "vegetarisch", "tofu", "seitan", "tempeh", "pflanzlich",
    # Frühstück
    "marmelade", "honig", "nutella", "aufstrich", "müsli", "cornflakes",
    "haferflocken", "cerealien",
    # Backen
    "backmischung", "hefe", "backpulver", "vanille", "kakao",
    # Eier
    "eier", "ei",
    # Sonstiges Essen
    "oliven", "antipasti", "sushi", "wrap", "sandwich", "bagel",
    "hummus", "falafel", "paniermehl", "semmelbrös", "feinkost",
    "tapas", "mezze", "bruschetta",
    # Muttertag-Sonderaktionen (oft Pralinen/Schokolade)
    "muttertag",
}

# Rate Limiting
REQUEST_DELAY = 0.5  # Sekunden zwischen API-Calls (API ist schneller als HTML)
BATCH_SIZE = 200     # Max. Angebote pro API-Call

# Output-Pfade
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = DATA_DIR / "offers"


# ============================================
# API-KEY EXTRAKTION
# ============================================
def extract_api_keys() -> tuple[str, str]:
    """
    Extrahiert API-Key und Client-Key aus dem HTML der Marktguru-Website.
    Die Keys sind öffentlich im JavaScript-Config eingebettet.

    Returns:
        (api_key, client_key)
    """
    print("→ Extrahiere API-Keys von marktguru.de...", end=" ")

    try:
        resp = requests.get(BASE_URL, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        })
        resp.raise_for_status()

        api_key_match = re.search(r'"apiKey":"([^"]+)"', resp.text)
        client_key_match = re.search(r'"clientKey":"([^"]+)"', resp.text)

        if api_key_match and client_key_match:
            print("✓")
            return api_key_match.group(1), client_key_match.group(1)
        else:
            raise ValueError("API-Keys nicht im HTML gefunden")

    except Exception as e:
        print(f"✗ ({e})")

        # SECURITY: Never hardcode API keys (OWASP A02:2021 - Cryptographic Failures)
        # Try environment variables as fallback
        env_api = os.environ.get("MARKTGURU_API_KEY")
        env_client = os.environ.get("MARKTGURU_CLIENT_KEY")
        if env_api and env_client:
            print("  → Verwende Keys aus Umgebungsvariablen...")
            return env_api, env_client

        raise ValueError(
            "Marktguru API-Keys konnten nicht ermittelt werden. "
            "Setze MARKTGURU_API_KEY und MARKTGURU_CLIENT_KEY als Umgebungsvariablen."
        )


# ============================================
# FOOD-FILTER
# ============================================
def is_food_category(category_name: str) -> bool:
    """Prüft ob eine API-Kategorie ein Lebensmittel ist."""
    if not category_name:
        return False
    name_lower = category_name.lower()
    return any(pattern in name_lower for pattern in FOOD_CATEGORY_PATTERNS)


# ============================================
# HAUPT-SCRAPER (API-basiert)
# ============================================
class MarktguruScraper:
    """Marktguru API-Scraper v3.0 — holt alle Lebensmittel-Angebote per REST-API."""

    def __init__(self, plz: str, api_key: str = None, client_key: str = None):
        self.plz = plz

        if api_key and client_key:
            self.api_key = api_key
            self.client_key = client_key
        else:
            self.api_key, self.client_key = extract_api_keys()

        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "x-apikey": self.api_key,
            "x-clientkey": self.client_key,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        })

    # ============================================
    # API-CALLS
    # ============================================
    def _api_get(self, endpoint: str, params: dict = None) -> dict | None:
        """Führt einen API-GET-Request aus."""
        url = f"{API_URL}/{endpoint}"
        try:
            time.sleep(REQUEST_DELAY)
            resp = self.session.get(url, params=params, timeout=20)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"  ✗ API-Fehler: {e}")
            return None

    def fetch_offers(self, industry_id: int, limit: int = 200,
                     offset: int = 0, query: str = None) -> dict | None:
        """
        Ruft Angebote von der API ab.

        Args:
            industry_id: 1009 (Supermarkt) oder 1023 (Discounter)
            limit: Anzahl Angebote pro Request (max. 200)
            offset: Startposition für Paginierung
            query: Optionaler Suchbegriff
        """
        params = {
            "zipCode": self.plz,
            "industryId": industry_id,
            "limit": min(limit, BATCH_SIZE),
            "offset": offset,
        }
        if query:
            params["query"] = query
        return self._api_get("offers", params)

    def fetch_all_offers_for_industry(self, industry_id: int,
                                       query: str = None,
                                       max_offers: int = None) -> list[dict]:
        """Holt alle Angebote einer Branche (mit Paginierung)."""
        all_results = []
        offset = 0

        while True:
            data = self.fetch_offers(industry_id, limit=BATCH_SIZE,
                                      offset=offset, query=query)
            if not data or not data.get("results"):
                break

            all_results.extend(data["results"])
            total = data.get("totalResults", 0)

            if max_offers and len(all_results) >= max_offers:
                all_results = all_results[:max_offers]
                break

            if len(all_results) >= total:
                break

            offset += BATCH_SIZE

        return all_results

    # ============================================
    # DATEN-TRANSFORMATION
    # ============================================
    def _transform_offer(self, raw: dict) -> dict:
        """Transformiert ein API-Angebot in unser einheitliches Format."""

        # Händler
        retailer_name = "Unbekannt"
        if raw.get("advertisers"):
            retailer_name = raw["advertisers"][0].get("name", "Unbekannt")

        # Produktname
        product_name = ""
        if raw.get("product"):
            product_name = raw["product"].get("name", "")
        if not product_name and raw.get("description"):
            product_name = raw["description"]

        # Marke
        brand_name = None
        if raw.get("brand"):
            brand_name = raw["brand"].get("name")

        # Kategorie
        category_name = None
        category_id = None
        if raw.get("categories"):
            cat = raw["categories"][0]
            category_name = cat.get("name")
            category_id = cat.get("id")

        # Gültigkeitsdaten
        gueltig_von = None
        gueltig_bis = None
        if raw.get("validityDates"):
            dates = raw["validityDates"][0]
            gueltig_von = dates.get("from")
            gueltig_bis = dates.get("to")

        # Bild-URL
        bild_url = None
        offer_id = raw.get("id")
        if offer_id and raw.get("images"):
            bild_url = f"https://mg2de.b-cdn.net/api/v1/offers/{offer_id}/images/default/0/medium.webp"

        # Einheit
        einheit = None
        if raw.get("unit"):
            einheit = raw["unit"].get("shortName")

        return {
            "offer_id": str(offer_id) if offer_id else None,
            "name": product_name,
            "beschreibung": raw.get("description", ""),
            "brand": brand_name,
            "supermarkt": RETAILER_NORMALIZE.get(retailer_name, retailer_name.lower().replace(" ", "_")),
            "supermarkt_original": retailer_name,
            "preis": raw.get("price"),
            "alter_preis": raw.get("oldPrice"),
            "referenz_preis": raw.get("referencePrice"),
            "einheit": einheit,
            "menge": raw.get("volume"),
            "produktkategorie": category_name,
            "produktkategorie_id": category_id,
            "url": f"{BASE_URL}/offers/{offer_id}" if offer_id else None,
            "bild_url": bild_url,
            "gueltig_von": gueltig_von,
            "gueltig_bis": gueltig_bis,
            "quelle": "marktguru_api",
            "plz": self.plz,
            "abgerufen_am": datetime.now().isoformat(),
        }

    # ============================================
    # HAUPTFUNKTIONEN
    # ============================================
    def scrape_all_offers(self, food_only: bool = True,
                           query: str = None,
                           max_per_industry: int = None) -> list[dict]:
        """
        Holt alle Angebote für die gegebene PLZ.

        Args:
            food_only: Nur Lebensmittel-Angebote (Standard: True)
            query: Optionaler Suchbegriff
            max_per_industry: Max. Angebote pro Branche

        Returns:
            Liste aller Angebote im einheitlichen Format
        """
        print(f"\n{'='*60}")
        print(f"MealDeal Marktguru Scraper v3.0 (API)")
        print(f"PLZ: {self.plz}")
        print(f"Datum: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
        print(f"Filter: {'Nur Lebensmittel' if food_only else 'Alle Branchen'}")
        if query:
            print(f"Suche: {query}")
        print(f"{'='*60}\n")

        all_raw = []

        # Supermarkt + Discounter abfragen
        for industry_id, industry_name in FOOD_INDUSTRIES.items():
            print(f"→ Lade {industry_name}-Angebote (Industry {industry_id})...", end=" ")

            raw_offers = self.fetch_all_offers_for_industry(
                industry_id, query=query, max_offers=max_per_industry
            )
            print(f"✓ {len(raw_offers)} Angebote")
            all_raw.extend(raw_offers)

        print(f"\n→ Gesamt von API: {len(all_raw)} Angebote")

        # Transformieren
        all_offers = [self._transform_offer(r) for r in all_raw]

        # Food-Filter
        if food_only:
            before = len(all_offers)
            all_offers = [
                o for o in all_offers
                if is_food_category(o.get("produktkategorie"))
            ]
            filtered = before - len(all_offers)
            print(f"→ Food-Filter: {filtered} Non-Food entfernt, {len(all_offers)} Lebensmittel übrig")

        # Statistik
        self._print_stats(all_offers)

        return all_offers

    def scrape_search(self, query: str, food_only: bool = True) -> list[dict]:
        """Sucht nach einem bestimmten Produkt."""
        return self.scrape_all_offers(food_only=food_only, query=query)

    def _print_stats(self, offers: list[dict]):
        """Gibt detaillierte Statistiken aus."""
        by_store = {}
        by_category = {}
        with_price = 0
        with_brand = 0
        with_image = 0
        with_dates = 0
        with_old_price = 0

        for o in offers:
            store = o.get("supermarkt_original", "Unbekannt")
            by_store[store] = by_store.get(store, 0) + 1

            cat = o.get("produktkategorie", "Unbekannt")
            by_category[cat] = by_category.get(cat, 0) + 1

            if o.get("preis"):
                with_price += 1
            if o.get("brand"):
                with_brand += 1
            if o.get("bild_url"):
                with_image += 1
            if o.get("gueltig_von"):
                with_dates += 1
            if o.get("alter_preis"):
                with_old_price += 1

        print(f"\n{'─'*50}")
        print(f"ANGEBOTE PRO HÄNDLER")
        print(f"{'─'*50}")
        for store, count in sorted(by_store.items(), key=lambda x: -x[1]):
            print(f"  {store:35s} {count:4d}")
        print(f"{'─'*50}")
        print(f"  {'GESAMT':35s} {len(offers):4d}")

        print(f"\n{'─'*50}")
        print(f"TOP 15 KATEGORIEN")
        print(f"{'─'*50}")
        for cat, count in sorted(by_category.items(), key=lambda x: -x[1])[:15]:
            print(f"  {cat:35s} {count:4d}")

        print(f"\n{'─'*50}")
        print(f"DATENQUALITÄT")
        print(f"{'─'*50}")
        print(f"  Mit Preis:       {with_price:4d}/{len(offers)}")
        print(f"  Mit Alter Preis: {with_old_price:4d}/{len(offers)} (Ersparnis berechenbar)")
        print(f"  Mit Marke:       {with_brand:4d}/{len(offers)}")
        print(f"  Mit Bild:        {with_image:4d}/{len(offers)}")
        print(f"  Mit Datum:       {with_dates:4d}/{len(offers)}")

    # ============================================
    # EXPORT
    # ============================================
    def save_to_json(self, offers: list[dict], filename: str = None) -> Path:
        """Speichert Angebote als JSON."""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        if not filename:
            filename = f"angebote_{self.plz}_{datetime.now().strftime('%Y%m%d')}.json"

        filepath = OUTPUT_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(offers, f, ensure_ascii=False, indent=2)

        print(f"\n✓ Gespeichert: {filepath}")
        print(f"  {len(offers)} Angebote, {filepath.stat().st_size / 1024:.1f} KB")
        return filepath

    def save_for_supabase(self, offers: list[dict], filename: str = None) -> Path:
        """
        Speichert Angebote in einem Format das direkt in Supabase importiert werden kann.
        Enthält nur die für die DB relevanten Felder.
        """
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        if not filename:
            filename = f"angebote_supabase_{self.plz}_{datetime.now().strftime('%Y%m%d')}.json"

        db_offers = []
        for o in offers:
            db_offers.append({
                "external_id": o["offer_id"],
                "name": o["name"],
                "beschreibung": o["beschreibung"],
                "marke": o["brand"],
                "supermarkt": o["supermarkt"],
                "preis": o["preis"],
                "alter_preis": o["alter_preis"],
                "referenz_preis": o["referenz_preis"],
                "einheit": o["einheit"],
                "menge": o["menge"],
                "produktkategorie": (o.get("produktkategorie") or "").lower().replace(" ", "_"),
                "bild_url": o["bild_url"],
                "gueltig_von": o["gueltig_von"],
                "gueltig_bis": o["gueltig_bis"],
                "plz": o["plz"],
                "quelle": "marktguru",
            })

        filepath = OUTPUT_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(db_offers, f, ensure_ascii=False, indent=2)

        print(f"\n✓ Supabase-Export: {filepath}")
        print(f"  {len(db_offers)} Angebote, {filepath.stat().st_size / 1024:.1f} KB")
        return filepath


# ============================================
# CLI
# ============================================
def main():
    parser = argparse.ArgumentParser(description="MealDeal Marktguru Scraper v3.0 (API)")
    parser.add_argument("--plz", required=True, help="Postleitzahl")
    parser.add_argument("--query", "-q", help="Suchbegriff (z.B. 'butter')")
    parser.add_argument("--alle", action="store_true",
                        help="Alle Angebote (auch Non-Food)")
    parser.add_argument("--limit", type=int,
                        help="Max. Angebote pro Branche")
    parser.add_argument("--output", "-o", help="Ausgabedatei")
    parser.add_argument("--supabase", action="store_true",
                        help="Auch Supabase-kompatiblen Export erstellen")

    args = parser.parse_args()
    scraper = MarktguruScraper(args.plz)

    if args.query:
        offers = scraper.scrape_search(args.query, food_only=not args.alle)
    else:
        offers = scraper.scrape_all_offers(
            food_only=not args.alle,
            max_per_industry=args.limit,
        )

    if offers:
        scraper.save_to_json(offers, args.output)
        if args.supabase:
            scraper.save_for_supabase(offers)

    return offers


if __name__ == "__main__":
    main()
