"""
MealDeal Angebots-Pipeline v1.0
================================
Holt Angebote von externen Quellen und speichert sie in der Datenbank.
Unterstützt: Pepesto API, manuelle Imports, zukünftig weitere Quellen.
"""

import json
import os
import hashlib
from datetime import datetime, timedelta
from pathlib import Path

# Wenn Supabase eingerichtet ist:
# from supabase import create_client, Client

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"


class OfferPipeline:
    """
    Hauptpipeline für das Abrufen und Verarbeiten von Angebotsdaten.

    Ablauf:
    1. Angebote von Quelle abrufen (Pepesto API / Scraper / Manuell)
    2. Daten normalisieren (einheitliches Format)
    3. Produkte in Produktdatenbank aufnehmen (UVP-Preise speichern)
    4. Angebote speichern mit PLZ-Zuordnung
    5. PLZ-Cache aktualisieren
    """

    def __init__(self, config: dict = None):
        self.config = config or {}
        self.pepesto_api_key = self.config.get("pepesto_api_key", os.environ.get("PEPESTO_API_KEY"))
        self.supabase_url = self.config.get("supabase_url", os.environ.get("SUPABASE_URL"))
        self.supabase_key = self.config.get("supabase_key", os.environ.get("SUPABASE_KEY"))

    # ============================================
    # PEPESTO API
    # ============================================
    def fetch_from_pepesto(self, supermarkt: str, plz_gebiet: str) -> list[dict]:
        """
        Ruft Angebote von der Pepesto API ab.

        Args:
            supermarkt: Supermarkt-ID (z.B. 'rewe', 'lidl')
            plz_gebiet: PLZ-Präfix (z.B. '80' für München)

        Returns:
            Liste normalisierter Angebote
        """
        if not self.pepesto_api_key:
            print("⚠ Pepesto API-Key nicht konfiguriert.")
            print("  Bitte PEPESTO_API_KEY als Umgebungsvariable setzen oder in config übergeben.")
            print("  → API-Key erhältst du auf: https://www.pepesto.com")
            return []

        import requests

        url = f"https://api.pepesto.com/v1/offers"
        headers = {
            "Authorization": f"Bearer {self.pepesto_api_key}",
            "Accept": "application/json"
        }
        params = {
            "retailer": supermarkt,
            "postal_code": plz_gebiet,
            "country": "DE"
        }

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            raw_offers = response.json().get("data", [])
            return [self._normalize_pepesto_offer(o, supermarkt, plz_gebiet) for o in raw_offers]
        except Exception as e:
            print(f"✗ Fehler beim Abruf von Pepesto ({supermarkt}, PLZ {plz_gebiet}): {e}")
            return []

    def _normalize_pepesto_offer(self, raw: dict, supermarkt: str, plz_gebiet: str) -> dict:
        """Normalisiert ein Pepesto-Angebot in unser internes Format."""
        preis = raw.get("price", 0)
        uvp = raw.get("original_price")
        rabatt = None

        if uvp and uvp > preis:
            rabatt = round((1 - preis / uvp) * 100, 1)
        elif raw.get("discount_percentage"):
            rabatt = raw["discount_percentage"]
            if rabatt and preis:
                uvp = round(preis / (1 - rabatt / 100), 2)

        return {
            "original_produktname": raw.get("name", ""),
            "marke": raw.get("brand"),
            "produktkategorie": self._kategorisiere_produkt(raw.get("name", ""), raw.get("category")),
            "supermarkt": supermarkt,
            "preis": preis,
            "uvp_preis": uvp,
            "rabatt_prozent": rabatt,
            "preis_pro_einheit": raw.get("unit_price"),
            "gueltig_von": raw.get("valid_from", datetime.now().strftime("%Y-%m-%d")),
            "gueltig_bis": raw.get("valid_until", (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")),
            "plz_gebiet": plz_gebiet,
            "ist_national": supermarkt in ["aldi_sued", "aldi_nord", "lidl"],
            "bild_url": raw.get("image_url"),
            "externe_id": raw.get("id"),
            "datenquelle": "pepesto",
            "menge_wert": raw.get("quantity"),
            "menge_einheit": raw.get("unit"),
            "barcode": raw.get("ean")
        }

    # ============================================
    # MANUELLER IMPORT (für den Start)
    # ============================================
    def import_from_json(self, filepath: str) -> list[dict]:
        """
        Importiert Angebote aus einer manuell erstellten JSON-Datei.
        Nützlich für den Start, bevor die API eingerichtet ist.
        """
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                angebote = json.load(f)
            print(f"✓ {len(angebote)} Angebote aus {filepath} geladen")
            return angebote
        except Exception as e:
            print(f"✗ Fehler beim Import: {e}")
            return []

    # ============================================
    # PRODUKT-KATEGORISIERUNG
    # ============================================
    def _kategorisiere_produkt(self, name: str, api_category: str = None) -> str:
        """
        Ordnet ein Produkt einer normalisierten Kategorie zu.
        Verwendet den API-Kategorienamen als Hint und den Produktnamen als Fallback.
        """
        name_lower = name.lower()

        # Bekannte Kategorien aus Produktnamen extrahieren
        kategorie_keywords = {
            "butter": ["butter", "süßrahmbutter", "sauerrahmbutter"],
            "milch": ["vollmilch", "fettarme milch", "frischmilch", "h-milch", "weidemilch"],
            "sahne": ["sahne", "schlagsahne", "kochsahne", "sprühsahne"],
            "joghurt": ["joghurt", "yoghurt", "jogurt"],
            "kaese": ["käse", "gouda", "emmentaler", "mozzarella", "cheddar", "camembert", "brie", "parmesan", "edamer"],
            "quark": ["quark", "speisequark", "magerquark"],
            "hackfleisch": ["hackfleisch", "gehacktes", "hack ", "mischgehacktes", "rinderhack"],
            "haehnchen": ["hähnchen", "hühnchen", "chicken", "geflügel", "hendl"],
            "schweinefleisch": ["schweinefleisch", "schweine", "schnitzel", "kotelett"],
            "rindfleisch": ["rindfleisch", "rinder", "rumpsteak", "gulasch"],
            "wurst": ["wurst", "salami", "schinken", "mortadella", "lyoner"],
            "nudeln": ["spaghetti", "penne", "fusilli", "nudeln", "pasta", "tagliatelle", "farfalle"],
            "reis": ["reis", "basmati", "jasmin-reis", "langkorn"],
            "brot": ["brot", "toast", "brötchen", "semmel", "ciabatta", "baguette"],
            "kartoffel": ["kartoffel", "erdäpfel", "speisekartoffel"],
            "tomate": ["tomate", "cherry-tomate", "rispentomaten", "passierte tomaten"],
            "zwiebel": ["zwiebel", "schalotte", "rote zwiebel"],
            "karotte": ["karotte", "möhre", "mohrrübe", "rüebli"],
            "paprika": ["paprika", "spitzpaprika", "gemüsepaprika"],
            "gurke": ["gurke", "salatgurke", "minigurke"],
            "salat": ["salat", "eisberg", "feldsalat", "rucola", "kopfsalat"],
            "apfel": ["apfel", "äpfel", "braeburn", "elstar", "gala", "granny smith"],
            "banane": ["banane", "bananen"],
            "mehl": ["mehl", "weizenmehl", "dinkelmehl", "vollkornmehl"],
            "zucker": ["zucker", "rohrzucker", "puderzucker"],
            "oel": ["öl", "olivenöl", "sonnenblumenöl", "rapsöl"],
            "eier": ["eier", "freilandeier", "bio-eier"],
        }

        for kategorie, keywords in kategorie_keywords.items():
            for keyword in keywords:
                if keyword in name_lower:
                    return kategorie

        # Fallback: API-Kategorie verwenden
        if api_category:
            return api_category.lower().replace(" ", "_")

        return "sonstiges"

    # ============================================
    # UVP-PREIS BERECHNUNG
    # ============================================
    @staticmethod
    def berechne_uvp(angebotspreis: float, rabatt_prozent: float) -> float | None:
        """
        Berechnet den UVP aus Angebotspreis und Rabatt-Prozent.
        Formel: UVP = Angebotspreis / (1 - Rabatt/100)

        Beispiel: Preis 2,79€ bei 30% Rabatt → UVP = 2,79 / 0,70 = 3,99€
        """
        if not rabatt_prozent or rabatt_prozent <= 0 or rabatt_prozent >= 100:
            return None
        return round(angebotspreis / (1 - rabatt_prozent / 100), 2)

    # ============================================
    # PLZ-CACHE LOGIK
    # ============================================
    def should_refresh_plz(self, plz_gebiet: str, cached_data: dict = None) -> bool:
        """
        Prüft ob die Angebote für ein PLZ-Gebiet aktualisiert werden müssen.
        Angebote werden max. 1x pro Woche aktualisiert (Prospektwechsel).
        """
        if not cached_data:
            return True

        last_update = cached_data.get("zuletzt_aktualisiert")
        if not last_update:
            return True

        if isinstance(last_update, str):
            last_update = datetime.fromisoformat(last_update)

        # Aktualisieren wenn älter als 6 Tage
        return (datetime.now() - last_update).days >= 6

    # ============================================
    # WÖCHENTLICHER REFRESH
    # ============================================
    def weekly_refresh(self, plz_gebiete: list[str], supermaerkte: list[str]):
        """
        Führt den wöchentlichen Komplett-Refresh durch.
        Sollte Samstagabend/Sonntagfrüh laufen.
        """
        print(f"\n{'='*60}")
        print(f"MealDeal Wöchentlicher Angebots-Refresh")
        print(f"Datum: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
        print(f"PLZ-Gebiete: {len(plz_gebiete)}")
        print(f"Supermärkte: {', '.join(supermaerkte)}")
        print(f"{'='*60}\n")

        total_angebote = 0
        fehler = 0

        for plz in plz_gebiete:
            for markt in supermaerkte:
                print(f"  → {markt} / PLZ {plz}...", end=" ")
                angebote = self.fetch_from_pepesto(markt, plz)

                if angebote:
                    print(f"✓ {len(angebote)} Angebote")
                    total_angebote += len(angebote)
                    # TODO: In Supabase speichern
                else:
                    print("✗ Keine Angebote oder Fehler")
                    fehler += 1

        print(f"\n{'='*60}")
        print(f"Fertig: {total_angebote} Angebote geladen, {fehler} Fehler")
        print(f"{'='*60}")

        return {"total": total_angebote, "fehler": fehler}


# ============================================
# BEISPIEL-ANGEBOTE FÜR DEVELOPMENT
# ============================================
def create_sample_offers():
    """Erstellt Beispiel-Angebote für die Entwicklung (ohne API)."""

    sample = [
        {"name": "Kerrygold Irische Butter 250g", "produktkategorie": "butter", "supermarkt": "REWE", "preis": 1.89, "uvp_preis": 2.49, "rabatt_prozent": 24.1},
        {"name": "Müller Buttermilch 500ml", "produktkategorie": "buttermilch", "supermarkt": "REWE", "preis": 0.79},
        {"name": "Barilla Spaghetti No.5 500g", "produktkategorie": "nudeln", "supermarkt": "LIDL", "preis": 0.99, "uvp_preis": 1.49, "rabatt_prozent": 33.6},
        {"name": "Ja! Hackfleisch gemischt 500g", "produktkategorie": "hackfleisch", "supermarkt": "REWE", "preis": 3.49, "uvp_preis": 4.99, "rabatt_prozent": 30.1},
        {"name": "Bio Vollmilch 3,5% 1L", "produktkategorie": "milch", "supermarkt": "ALDI", "preis": 1.15},
        {"name": "Erdnussbutter crunchy 350g", "produktkategorie": "erdnussbutter", "supermarkt": "LIDL", "preis": 2.49},
        {"name": "Gouda jung 200g", "produktkategorie": "kaese", "supermarkt": "ALDI", "preis": 1.49, "uvp_preis": 1.99, "rabatt_prozent": 25.1},
        {"name": "Zwiebeln 1kg Netz", "produktkategorie": "zwiebel", "supermarkt": "LIDL", "preis": 0.99},
        {"name": "Bio Karotten 1kg", "produktkategorie": "karotte", "supermarkt": "ALDI", "preis": 1.29},
        {"name": "Passierte Tomaten 500ml", "produktkategorie": "passierte_tomaten", "supermarkt": "LIDL", "preis": 0.49},
        {"name": "Knoblauch 3er Pack", "produktkategorie": "knoblauch", "supermarkt": "PENNY", "preis": 0.89},
        {"name": "Sahne 200ml", "produktkategorie": "sahne", "supermarkt": "REWE", "preis": 0.69},
        {"name": "Emmentaler gerieben 200g", "produktkategorie": "kaese", "supermarkt": "EDEKA", "preis": 1.79},
        {"name": "Olivenöl extra vergine 500ml", "produktkategorie": "oel", "supermarkt": "LIDL", "preis": 3.49, "uvp_preis": 4.99},
        {"name": "Bio Eier Freiland 10 Stück", "produktkategorie": "eier", "supermarkt": "REWE", "preis": 2.99, "uvp_preis": 3.69, "rabatt_prozent": 19.0},
        {"name": "Weizenmehl Type 405 1kg", "produktkategorie": "mehl", "supermarkt": "ALDI", "preis": 0.59},
        {"name": "Zucker 1kg", "produktkategorie": "zucker", "supermarkt": "LIDL", "preis": 0.99},
        {"name": "Maggi Fix Bolognese", "produktkategorie": "sonstiges", "supermarkt": "REWE", "preis": 0.69},
        {"name": "Kartoffeln festkochend 2,5kg", "produktkategorie": "kartoffel", "supermarkt": "ALDI", "preis": 1.99},
        {"name": "Rispentomaten 500g", "produktkategorie": "tomate", "supermarkt": "EDEKA", "preis": 1.49},
        {"name": "Paprika Mix 500g", "produktkategorie": "paprika", "supermarkt": "LIDL", "preis": 1.99},
        {"name": "Hähnchenbrust 500g", "produktkategorie": "haehnchen", "supermarkt": "ALDI", "preis": 3.99, "uvp_preis": 5.99, "rabatt_prozent": 33.4},
        {"name": "Schweineschnitzel 400g", "produktkategorie": "schweinefleisch", "supermarkt": "LIDL", "preis": 3.29},
        {"name": "Magerquark 500g", "produktkategorie": "quark", "supermarkt": "ALDI", "preis": 0.79},
        {"name": "Dr. Oetker Käsekuchen Backmischung", "produktkategorie": "backmischung", "supermarkt": "EDEKA", "preis": 2.99},
        {"name": "Bananen 1kg", "produktkategorie": "banane", "supermarkt": "PENNY", "preis": 1.19},
        {"name": "Basmati Reis 1kg", "produktkategorie": "reis", "supermarkt": "LIDL", "preis": 1.99},
        {"name": "Joghurt Natur 500g", "produktkategorie": "joghurt", "supermarkt": "ALDI", "preis": 0.59},
        {"name": "Rama Margarine 500g", "produktkategorie": "margarine", "supermarkt": "PENNY", "preis": 1.29},
        {"name": "Apfelsaft 1L", "produktkategorie": "saft", "supermarkt": "REWE", "preis": 0.99},
    ]

    output_path = DATA_DIR / "products" / "beispiel_angebote.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sample, f, ensure_ascii=False, indent=2)

    print(f"✓ {len(sample)} Beispiel-Angebote gespeichert: {output_path}")
    return sample


if __name__ == "__main__":
    create_sample_offers()
