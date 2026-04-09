"""
MealDeal — Automatisches Setup
================================
Dieses Skript macht alles auf einmal:
  1. Supabase-Verbindung testen
  2. Datenbank-Schema erstellen (Tabellen, Indexes, RLS)
  3. Rezepte in Supabase laden
  4. Angebote von Marktguru scrapen und laden

Nutzung:
  python setup_mealdeal.py

Voraussetzungen:
  pip install requests beautifulsoup4 supabase python-dotenv
"""

import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

# Pfade
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "backend" / "config" / ".env"
SCHEMA_PATH = BASE_DIR / "backend" / "schema" / "001_initial_schema.sql"
REZEPTE_PATH = BASE_DIR / "data" / "recipes" / "rezepte_basis.json"
SYNONYME_PATH = BASE_DIR / "data" / "synonyms" / "synonyme_dach.json"

# Pakete prüfen
missing = []
try:
    from dotenv import load_dotenv
except ImportError:
    missing.append("python-dotenv")
try:
    from supabase import create_client
except ImportError:
    missing.append("supabase")
try:
    import requests
except ImportError:
    missing.append("requests")
try:
    from bs4 import BeautifulSoup
except ImportError:
    missing.append("beautifulsoup4")

if missing:
    print("❌ Fehlende Pakete! Bitte installiere:")
    print(f"   pip install {' '.join(missing)}")
    sys.exit(1)


def load_env():
    """Lädt Umgebungsvariablen aus .env"""
    load_dotenv(ENV_PATH)
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

    if not url or "DEIN-PROJEKT" in url:
        print("❌ SUPABASE_URL fehlt in backend/config/.env")
        print("   Trage deine Supabase-URL ein (z.B. https://xxxxx.supabase.co)")
        sys.exit(1)

    if not key:
        print("❌ SUPABASE_SERVICE_KEY fehlt in backend/config/.env")
        sys.exit(1)

    return url, key


def test_connection(url, key):
    """Testet die Supabase-Verbindung."""
    print("\n" + "=" * 60)
    print("1. SUPABASE-VERBINDUNG TESTEN")
    print("=" * 60)

    try:
        supabase = create_client(url, key)
        # Einfacher Test-Query
        result = supabase.table("_test_connection_").select("*").limit(1).execute()
        print("✓ Verbindung erfolgreich!")
        return supabase
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg or "does not exist" in error_msg or "404" in error_msg:
            # Tabelle existiert nicht — Verbindung funktioniert aber
            print("✓ Verbindung erfolgreich! (Tabellen noch nicht erstellt)")
            return create_client(url, key)
        elif "Invalid API key" in error_msg or "401" in error_msg:
            print(f"❌ API-Key ungültig: {error_msg}")
            print("   Prüfe SUPABASE_KEY oder SUPABASE_SERVICE_KEY in .env")
            sys.exit(1)
        else:
            # Trotzdem versuchen — manche Fehler sind unkritisch
            print(f"⚠  Warnung: {error_msg}")
            print("   Versuche trotzdem weiterzumachen...")
            return create_client(url, key)


def deploy_schema(supabase):
    """Deployt das Datenbank-Schema via SQL Editor."""
    print("\n" + "=" * 60)
    print("2. DATENBANK-SCHEMA DEPLOYEN")
    print("=" * 60)

    if not SCHEMA_PATH.exists():
        print(f"❌ Schema-Datei nicht gefunden: {SCHEMA_PATH}")
        return False

    sql = SCHEMA_PATH.read_text(encoding="utf-8")

    print(f"   Schema: {SCHEMA_PATH.name}")
    print(f"   Größe: {len(sql)} Zeichen")

    try:
        # Supabase Python Client kann kein rohes SQL ausführen
        # Wir nutzen die REST API mit dem Service Key direkt
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

        # SQL über die Supabase REST-SQL-API ausführen
        resp = requests.post(
            f"{url}/rest/v1/rpc/exec_sql",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={"query": sql},
        )

        if resp.status_code in (200, 201):
            print("✓ Schema erfolgreich deployt!")
            return True
        else:
            print(f"⚠  REST-API SQL funktioniert nicht (Status {resp.status_code})")
            print("   → Du musst das Schema manuell im Supabase SQL Editor ausführen.")
            print(f"   → Öffne: {url.replace('.supabase.co', '.supabase.co')}/project/default/sql")
            print(f"   → Kopiere den Inhalt von: {SCHEMA_PATH}")
            print("   → Klicke 'Run'")
            return False

    except Exception as e:
        print(f"⚠  Fehler: {e}")
        print("   → Manuell im SQL Editor ausführen (siehe oben)")
        return False


def upload_rezepte(supabase):
    """Lädt die Rezepte in Supabase."""
    print("\n" + "=" * 60)
    print("3. REZEPTE LADEN")
    print("=" * 60)

    if not REZEPTE_PATH.exists():
        print(f"❌ Rezeptdatei nicht gefunden: {REZEPTE_PATH}")
        return False

    with open(REZEPTE_PATH, "r", encoding="utf-8") as f:
        rezepte = json.load(f)

    print(f"   {len(rezepte)} Rezepte gefunden")

    uploaded = 0
    errors = 0

    for rezept in rezepte:
        try:
            # Rezept-Daten vorbereiten
            recipe_data = {
                "title": rezept["title"],
                "beschreibung": rezept.get("beschreibung", ""),
                "kategorie": rezept.get("kategorie", "mittag"),
                "tags": rezept.get("tags", []),
                "zubereitungszeit_min": rezept.get("zubereitungszeit_min"),
                "schwierigkeit": rezept.get("schwierigkeit", "mittel"),
                "portionen": rezept.get("portionen", 4),
                "kcal": rezept.get("kcal"),
                "protein_g": rezept.get("protein_g"),
                "kohlenhydrate_g": rezept.get("kohlenhydrate_g"),
                "fett_g": rezept.get("fett_g"),
                "ernaehrungsformen": rezept.get("ernaehrungsformen", ["omnivor"]),
                "allergene": rezept.get("allergene", []),
                "saison": rezept.get("saison", ["ganzjaehrig"]),
                "zubereitung_schritte": rezept.get("zubereitung", []),
                "quelle": rezept.get("quelle", "MealDeal Basisdaten"),
            }

            # Rezept einfügen
            result = supabase.table("recipes").insert(recipe_data).execute()

            if result.data:
                recipe_id = result.data[0]["id"]

                # Zutaten einfügen
                for i, zutat in enumerate(rezept.get("zutaten", [])):
                    zutat_data = {
                        "recipe_id": recipe_id,
                        "zutat_name": zutat["zutat_name"],
                        "zutat_kategorie": zutat["zutat_kategorie"],
                        "menge": zutat.get("menge"),
                        "einheit": zutat.get("einheit"),
                        "ist_optional": zutat.get("optional", False),
                        "sortierung": i,
                    }
                    supabase.table("recipe_ingredients").insert(zutat_data).execute()

                uploaded += 1

        except Exception as e:
            errors += 1
            if uploaded == 0:
                # Erster Fehler — wahrscheinlich Tabelle existiert nicht
                print(f"❌ Fehler: {e}")
                print("   → Hast du das Schema schon deployt? (Schritt 2)")
                return False

    print(f"✓ {uploaded} Rezepte hochgeladen" + (f" ({errors} Fehler)" if errors else ""))
    return True


def upload_synonyme(supabase):
    """Lädt die Synonym-Datenbank in Supabase."""
    print("\n" + "=" * 60)
    print("4. SYNONYME LADEN")
    print("=" * 60)

    if not SYNONYME_PATH.exists():
        print(f"❌ Synonym-Datei nicht gefunden: {SYNONYME_PATH}")
        return False

    with open(SYNONYME_PATH, "r", encoding="utf-8") as f:
        synonyme = json.load(f)

    print(f"   {len(synonyme)} Kategorien mit Synonymen")

    uploaded = 0
    for entry in synonyme:
        standard = entry["standardbegriff"]
        for syn in entry.get("synonyme", []):
            try:
                supabase.table("synonyms").insert({
                    "standardbegriff": standard.lower(),
                    "synonym": syn.lower(),
                    "region": "dach",
                    "typ": "synonym",
                }).execute()
                uploaded += 1
            except Exception:
                pass  # Duplikate ignorieren

    print(f"✓ {uploaded} Synonyme hochgeladen")
    return True


def scrape_and_upload_offers(supabase, plz="56281"):
    """Scrapt Angebote von Marktguru und lädt sie in Supabase."""
    print("\n" + "=" * 60)
    print("5. ANGEBOTE SCRAPEN UND LADEN")
    print("=" * 60)

    # Scraper importieren
    sys.path.insert(0, str(BASE_DIR))
    from backend.pipeline.offers.marktguru_scraper import MarktguruScraper

    scraper = MarktguruScraper(plz)
    offers = scraper.scrape_all_offers(food_only=True)

    if not offers:
        print("❌ Keine Angebote gescrapt")
        return False

    # Auch als JSON speichern (Backup)
    scraper.save_to_json(offers)

    # In Supabase laden
    print(f"\n→ Lade {len(offers)} Angebote in Supabase...")

    uploaded = 0
    errors = 0

    for offer in offers:
        try:
            # Gültigkeitsdaten parsen
            gueltig_von = None
            gueltig_bis = None
            if offer.get("gueltig_von"):
                try:
                    gueltig_von = offer["gueltig_von"][:10]  # Nur Datum
                except Exception:
                    pass
            if offer.get("gueltig_bis"):
                try:
                    gueltig_bis = offer["gueltig_bis"][:10]
                except Exception:
                    pass

            # Fallback-Daten wenn keine Gültigkeit vorhanden
            if not gueltig_von:
                gueltig_von = datetime.now().strftime("%Y-%m-%d")
            if not gueltig_bis:
                gueltig_bis = datetime.now().strftime("%Y-%m-%d")

            offer_data = {
                "supermarkt": offer.get("supermarkt", "unbekannt"),
                "preis": offer.get("preis") or 0,
                "gueltig_von": gueltig_von,
                "gueltig_bis": gueltig_bis,
                "plz_gebiet": plz[:3],
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
            if uploaded == 0 and errors == 1:
                print(f"   Erster Fehler: {e}")

    print(f"✓ {uploaded} Angebote in Supabase geladen" +
          (f" ({errors} Fehler)" if errors else ""))

    # PLZ-Cache aktualisieren
    try:
        supabase.table("plz_cache").upsert({
            "plz_gebiet": plz[:3],
            "zuletzt_aktualisiert": datetime.now().isoformat(),
            "anzahl_angebote": uploaded,
            "status": "aktuell",
        }).execute()
    except Exception:
        pass

    return True


def main():
    print("\n" + "█" * 60)
    print("  MealDeal — Automatisches Setup")
    print("  " + datetime.now().strftime("%d.%m.%Y %H:%M"))
    print("█" * 60)

    # 1. Env laden
    url, key = load_env()
    print(f"\n   Supabase: {url}")

    # 2. Verbindung testen
    supabase = test_connection(url, key)

    # 3. Schema deployen
    schema_ok = deploy_schema(supabase)

    if not schema_ok:
        print("\n" + "─" * 60)
        print("⚠  Das Schema muss manuell im Supabase SQL Editor deployt werden.")
        print("   Danach dieses Skript nochmal ausführen.")
        print("─" * 60)

        answer = input("\n   Trotzdem mit Daten-Upload versuchen? (j/n): ").strip().lower()
        if answer != "j":
            print("\n   → Führe zuerst das Schema im SQL Editor aus, dann starte erneut.")
            return

    # 4. Rezepte laden
    upload_rezepte(supabase)

    # 5. Synonyme laden
    upload_synonyme(supabase)

    # 6. Angebote — werden jetzt PLZ-basiert geladen (nicht mehr beim Setup)
    # Wenn ein Nutzer seine PLZ in der App eingibt, wird automatisch gescrapt.
    # Siehe: supabase/functions/scrape-offers/
    print("\n" + "=" * 60)
    print("5. ANGEBOTE")
    print("=" * 60)
    print("   ℹ  Angebote werden jetzt automatisch geladen,")
    print("      sobald ein Nutzer seine PLZ in der App eingibt.")
    print("      → Kein manuelles Scraping mehr nötig!")

    # Fertig
    print("\n" + "█" * 60)
    print("  ✓ MealDeal Setup abgeschlossen!")
    print("█" * 60)
    print(f"\n   Datenbank: {url}")
    print("   Nächster Schritt:")
    print("   1. Supabase Edge Function deployen (siehe supabase/functions/)")
    print("   2. App starten mit 'cd app && npx expo start'")
    print()


if __name__ == "__main__":
    main()
