"""
MealDeal Angebote-Scraper
=========================
Holt aktuelle Supermarkt-Angebote von Marktguru
und speichert sie in der Supabase-Datenbank.

Nutzung: python scrape_angebote.py
        oder Doppelklick auf ANGEBOTE_LADEN.bat
"""

import json
import re
import time
import sys
import os

# === Pakete pruefen ===
try:
    import requests
except ImportError:
    print("Installiere benoetigte Pakete...")
    os.system(f"{sys.executable} -m pip install requests --break-system-packages -q")
    import requests

# === SUPABASE CONFIG ===
SUPABASE_URL = "https://wjhesvkapqrsbibqjbtr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqaGVzdmthcHFyc2JpYnFqYnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTE4NDEsImV4cCI6MjA4ODQyNzg0MX0.-Vh6_Qtz1EZzPJA70lXf8boCGBs1S7c05KzbUFK-dJs"

# === MARKTGURU CONFIG ===
MARKTGURU_SITE = "https://www.marktguru.de"
MARKTGURU_API = "https://api.marktguru.de/api/v1"

# Supermaerkte
KNOWN_MARKETS = {
    "REWE": "REWE", "REWE Center": "REWE",
    "PENNY": "Penny",
    "EDEKA": "Edeka", "E center": "Edeka",
    "Kaufland": "Kaufland",
    "Lidl": "Lidl",
    "ALDI SÜD": "ALDI", "ALDI Nord": "ALDI",
    "Netto Marken-Discount": "Netto", "Netto": "Netto",
    "Norma": "Norma",
    "nahkauf": "REWE",
}

# Obst-Keywords fuer Obst/Gemuese-Unterscheidung
OBST = ["apfel", "banane", "orange", "birne", "kirsche", "erdbeere", "beere",
        "traube", "mango", "ananas", "melone", "zitrone", "limette", "pflaume",
        "pfirsich", "nektarine", "kiwi", "obst", "clementine", "mandarine",
        "himbeere", "heidelbeere", "weintraube", "grapefruit"]


def map_category(cat_name, product_name):
    """Mapped Marktguru-Kategorie auf unsere Kategorien"""
    cat = (cat_name or "").lower()
    name = product_name.lower()

    if any(k in cat for k in ["fleisch", "wurst", "schinken", "geflügel", "rind"]):
        return "Fleisch"
    if any(k in cat for k in ["obst", "gemüse", "salat"]):
        return "Obst" if any(k in name for k in OBST) else "Gemüse"
    if any(k in cat for k in ["milch", "joghurt", "butter", "sahne", "quark", "eier"]):
        return "Milch & Eier"
    if "käse" in cat:
        return "Käse"
    if "tiefkühl" in cat or "tk-" in cat:
        return "Tiefkühl"
    if any(k in cat for k in ["getränke", "bier", "wein", "saft", "wasser"]):
        return "Getränke"
    if any(k in cat for k in ["snack", "süß", "chips", "schokolade", "keks"]):
        return "Snacks & Süßes"
    if any(k in cat for k in ["brot", "back", "brötchen"]):
        return "Backwaren"
    if any(k in cat for k in ["nudel", "reis", "pasta"]):
        return "Nudeln & Reis"
    if any(k in cat for k in ["konserve", "fertig", "dose"]):
        return "Konserven"
    if any(k in cat for k in ["gewürz", "sauce", "soße", "essig"]):
        return "Gewürze"
    if any(k in cat for k in ["fisch", "meeresfrüchte"]):
        return "Fisch & Meeresfrüchte"
    if any(k in cat for k in ["öl", "fett"]):
        return "Öle & Fette"
    if any(k in cat for k in ["haushalt", "reinigung"]):
        return "Haushalt"
    if any(k in cat for k in ["drogerie", "pflege", "hygiene"]):
        return "Drogerie"
    return "Sonstiges Lebensmittel"


def extract_api_keys():
    """Extrahiert API-Keys von der Marktguru-Website"""
    print("Hole API-Keys von marktguru.de...", end=" ")
    try:
        resp = requests.get(MARKTGURU_SITE, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0"
        })
        resp.raise_for_status()

        api_key = re.search(r'"apiKey":"([^"]+)"', resp.text)
        client_key = re.search(r'"clientKey":"([^"]+)"', resp.text)

        if api_key and client_key:
            print("OK")
            return api_key.group(1), client_key.group(1)
        else:
            print("Keys nicht gefunden im HTML")
            return None, None
    except Exception as e:
        print(f"Fehler: {e}")
        return None, None


def fetch_offers(plz, api_key, client_key, max_offers=1500):
    """Holt Angebote von der Marktguru API"""
    session = requests.Session()
    session.headers.update({
        "Accept": "application/json",
        "x-apikey": api_key,
        "x-clientkey": client_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
    })

    all_offers = []
    BATCH = 200
    industries = [1009, 1023]  # Supermarkt + Discounter

    for industry_id in industries:
        industry_name = "Supermarkt" if industry_id == 1009 else "Discounter"
        print(f"\n  [{industry_name}] Lade Angebote...")
        offset = 0

        while offset < max_offers:
            params = {
                "as": "web",
                "limit": BATCH,
                "offset": offset,
                "zipCode": plz,
                "industryId": industry_id,
            }

            try:
                time.sleep(0.5)  # Rate limit
                resp = session.get(f"{MARKTGURU_API}/offers", params=params, timeout=20)
                resp.raise_for_status()
                data = resp.json()

                # API Format parsen
                if isinstance(data, list):
                    offers = data
                elif isinstance(data, dict):
                    offers = data.get("results", data.get("offers", data.get("data", [])))
                else:
                    break

                if not offers:
                    break

                all_offers.extend(offers)
                print(f"    +{len(offers)} Angebote (gesamt: {len(all_offers)})")

                if len(offers) < BATCH:
                    break
                offset += BATCH

            except requests.exceptions.HTTPError as e:
                print(f"    HTTP-Fehler: {e.response.status_code}")
                break
            except Exception as e:
                print(f"    Fehler: {e}")
                break

    return all_offers


def save_to_supabase(offers_data):
    """Speichert Angebote in Supabase"""
    if not offers_data:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/offers"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    total = 0
    BATCH = 100

    for i in range(0, len(offers_data), BATCH):
        batch = offers_data[i:i+BATCH]
        try:
            resp = requests.post(url, json=batch, headers=headers, timeout=30)
            if resp.status_code in [200, 201]:
                total += len(batch)
                print(f"  Batch {i//BATCH + 1}: {len(batch)} gespeichert")
            else:
                print(f"  Batch {i//BATCH + 1} Fehler ({resp.status_code}): {resp.text[:150]}")
        except Exception as e:
            print(f"  Batch {i//BATCH + 1} Fehler: {e}")

    return total


def main():
    print("=" * 50)
    print("  MealDeal - Angebote laden")
    print("=" * 50)
    print()

    # PLZ abfragen
    plz = input("Deine PLZ eingeben: ").strip()
    if len(plz) != 5 or not plz.isdigit():
        print("Ungueltige PLZ! Muss 5 Ziffern sein.")
        return

    plz_prefix = plz[:3]

    # 1. API-Keys holen
    api_key, client_key = extract_api_keys()
    if not api_key or not client_key:
        print("\nKonnte keine API-Keys bekommen. Bitte spaeter nochmal versuchen.")
        return

    # 2. Angebote von Marktguru holen
    print(f"\nHole Angebote fuer PLZ {plz}...")
    raw_offers = fetch_offers(plz, api_key, client_key)
    print(f"\n{len(raw_offers)} Angebote von Marktguru erhalten")

    if not raw_offers:
        print("Keine Angebote gefunden.")
        return

    # 3. Angebote transformieren
    transformed = []
    store_counts = {}

    for offer in raw_offers:
        advertiser = offer.get("advertiserName", "").strip()
        market = KNOWN_MARKETS.get(advertiser)
        if not market:
            for key, val in KNOWN_MARKETS.items():
                if key.upper() in advertiser.upper():
                    market = val
                    break
        if not market:
            continue

        title = offer.get("title", "").strip()
        if not title:
            continue

        price = offer.get("price")
        if price is None:
            continue

        ref_price = offer.get("referencePrice")
        discount = None
        if ref_price and ref_price > 0 and ref_price > price:
            discount = round(((ref_price - price) / ref_price) * 100)

        # Kategorie
        cat_name = ""
        cat_obj = offer.get("category")
        if isinstance(cat_obj, dict):
            cat_name = cat_obj.get("name", "")
        elif isinstance(cat_obj, str):
            cat_name = cat_obj

        category = map_category(cat_name, title)

        valid_from = (offer.get("validFrom") or "")[:10] or None
        valid_until = (offer.get("validTo") or "")[:10]
        if not valid_until:
            continue

        fingerprint = f"{market}_{title}_{valid_until}".lower().strip()

        record = {
            "product_name": title,
            "store": market,
            "offer_price": round(float(price), 2),
            "original_price": round(float(ref_price), 2) if ref_price else None,
            "discount_percent": discount,
            "plz": plz,
            "plz_prefix": plz_prefix,
            "category": category,
            "valid_from": valid_from,
            "valid_until": valid_until,
            "image_url": offer.get("imageUrl"),
            "quantity": offer.get("quantity"),
            "fingerprint": fingerprint,
        }

        transformed.append(record)
        store_counts[market] = store_counts.get(market, 0) + 1

    print(f"\n{len(transformed)} Angebote nach Filterung:\n")
    for store, count in sorted(store_counts.items(), key=lambda x: -x[1]):
        print(f"  {store}: {count} Angebote")

    if not transformed:
        print("\nKeine Angebote zum Speichern.")
        return

    # 4. In Supabase speichern
    print(f"\nSpeichere {len(transformed)} Angebote in Supabase...")
    saved = save_to_supabase(transformed)

    print(f"\n{'=' * 50}")
    print(f"  FERTIG! {saved} Angebote gespeichert")
    print(f"{'=' * 50}")
    print(f"\n  Starte jetzt die App mit STARTE_APP.bat")
    print(f"  um die Angebote zu sehen!")


if __name__ == "__main__":
    main()
    input("\nDruecke Enter zum Schliessen...")
