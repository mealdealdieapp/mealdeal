"""
MealDeal — Angebote scrapen und in Supabase laden
===================================================
Scrapt Angebote fuer eine PLZ und laedt sie direkt in die Datenbank.

Nutzung:
  python scrape_angebote.py              (Standard-PLZ: 56281)
  python scrape_angebote.py --plz 80331  (eigene PLZ)
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

# Pfade
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "backend" / "config" / ".env"

# Pakete pruefen
try:
    from dotenv import load_dotenv
    from supabase import create_client
    import requests
except ImportError as e:
    print(f"Fehlende Pakete: {e}")
    print("Installiere mit: pip install python-dotenv supabase requests beautifulsoup4")
    sys.exit(1)

# Scraper importieren
sys.path.insert(0, str(BASE_DIR))
from backend.pipeline.offers.marktguru_scraper import MarktguruScraper


def main():
    parser = argparse.ArgumentParser(description="MealDeal Angebote scrapen")
    parser.add_argument("--plz", default="56281", help="Postleitzahl (Standard: 56281)")
    args = parser.parse_args()

    print(f"\n{'='*50}")
    print(f"  MealDeal — Angebote laden")
    print(f"  PLZ: {args.plz}")
    print(f"  {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print(f"{'='*50}\n")

    # .env laden
    load_dotenv(ENV_PATH)
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

    if not url or not key:
        print("Supabase-Konfiguration fehlt in backend/config/.env")
        sys.exit(1)

    # Supabase verbinden
    print("1. Verbinde mit Supabase...", end=" ")
    try:
        supabase = create_client(url, key)
        print("OK")
    except Exception as e:
        print(f"Fehler: {e}")
        sys.exit(1)

    # Angebote scrapen
    print(f"\n2. Scrape Angebote fuer PLZ {args.plz}...")
    scraper = MarktguruScraper(args.plz)
    offers = scraper.scrape_all_offers(food_only=True)

    if not offers:
        print("Keine Angebote gefunden!")
        sys.exit(1)

    # In Supabase laden
    print(f"\n3. Lade {len(offers)} Angebote in Supabase...")
    uploaded = 0
    errors = 0

    for offer in offers:
        try:
            gueltig_von = (offer.get("gueltig_von") or "")[:10] or datetime.now().strftime("%Y-%m-%d")
            gueltig_bis = (offer.get("gueltig_bis") or "")[:10] or datetime.now().strftime("%Y-%m-%d")

            offer_data = {
                "supermarkt": offer.get("supermarkt", "unbekannt"),
                "preis": offer.get("preis") or 0,
                "gueltig_von": gueltig_von,
                "gueltig_bis": gueltig_bis,
                "plz_gebiet": args.plz[:3],
                "original_produktname": offer.get("name", ""),
                "original_beschreibung": offer.get("beschreibung", ""),
                "prospekt_bild_url": offer.get("bild_url"),
                "datenquelle": "marktguru",
                "externe_id": offer.get("offer_id"),
            }

            supabase.table("offers").insert(offer_data).execute()
            uploaded += 1

        except Exception as e:
            errors += 1
            if errors == 1:
                print(f"   Erster Fehler: {e}")

    # PLZ-Cache aktualisieren
    try:
        supabase.table("plz_cache").upsert({
            "plz_gebiet": args.plz[:3],
            "zuletzt_aktualisiert": datetime.now().isoformat(),
            "anzahl_angebote": uploaded,
            "status": "aktuell",
        }).execute()
    except Exception:
        pass

    print(f"\n{'='*50}")
    print(f"  {uploaded} Angebote hochgeladen" + (f" ({errors} Fehler)" if errors else ""))
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()
