"""
MealDeal Matching Engine v1.0
=============================
Verbindet Rezeptzutaten mit Supermarkt-Angeboten.
Mehrstufiges Matching: Normalisierung → Kategorisierung → Matching → Scoring
"""

import json
import os
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

# ============================================
# PFADE
# ============================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
SYNONYME_PATH = DATA_DIR / "synonyms" / "synonyme_dach.json"
REZEPTE_PATH = DATA_DIR / "recipes" / "rezepte_basis.json"

# Umlaut-Normalisierung: beide Richtungen abdecken
UMLAUT_MAP = {
    "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
    "Ä": "Ae", "Ö": "Oe", "Ü": "Ue",
}
REVERSE_UMLAUT_MAP = {v: k for k, v in UMLAUT_MAP.items()}


def normalize_umlauts(text: str) -> str:
    """Ersetzt Umlaute durch ASCII-Äquivalente (ä→ae, ö→oe, ü→ue, ß→ss)."""
    for umlaut, replacement in UMLAUT_MAP.items():
        text = text.replace(umlaut, replacement)
    return text


def restore_umlauts(text: str) -> str:
    """Ersetzt ASCII-Äquivalente durch Umlaute (ae→ä, oe→ö, ue→ü, ss→ß)."""
    # Reihenfolge: längere zuerst
    for ascii_form, umlaut in sorted(REVERSE_UMLAUT_MAP.items(), key=lambda x: -len(x[0])):
        text = text.replace(ascii_form, umlaut)
    return text


def normalize_term(term: str) -> str:
    """Normalisiert einen Begriff: lowercase, strip, Umlaute → ASCII."""
    return normalize_umlauts(term.lower().strip())


class SynonymDB:
    """Verwaltet die Synonym-Datenbank für DACH-Lebensmittel."""

    def __init__(self, path=SYNONYME_PATH):
        with open(path, "r", encoding="utf-8") as f:
            self.raw_data = json.load(f)

        # Lookup: synonym → standardbegriff
        self.synonym_to_standard = {}
        # Lookup: standardbegriff → alle synonyme
        self.standard_to_synonyms = {}
        # Lookup: standardbegriff → ausschlüsse
        self.exclusions = {}

        for entry in self.raw_data:
            standard = entry["standardbegriff"].lower().strip()
            synonyme = [s.lower().strip() for s in entry.get("synonyme", [])]
            ausschluesse = [a.lower().strip() for a in entry.get("ausschluesse", [])]

            self.standard_to_synonyms[standard] = synonyme
            self.exclusions[standard] = ausschluesse

            # Auch ASCII-normalisierte Ausschlüsse speichern
            ascii_standard = normalize_umlauts(standard)
            if ascii_standard != standard:
                self.exclusions[ascii_standard] = ausschluesse + [
                    normalize_umlauts(a) for a in ausschluesse
                ]

            # Jedes Synonym mappt auf den Standardbegriff
            # BEIDE Varianten registrieren: mit Umlaut UND ASCII
            all_terms = [standard] + synonyme
            for term in all_terms:
                self.synonym_to_standard[term] = standard
                # ASCII-Variante auch registrieren
                ascii_term = normalize_umlauts(term)
                if ascii_term != term:
                    self.synonym_to_standard[ascii_term] = standard

    def normalize(self, term: str) -> str | None:
        """Normalisiert einen Begriff auf den Standardbegriff.
        Sucht mit Original, ASCII-Form und Umlaut-Form."""
        term_lower = term.lower().strip()
        term_ascii = normalize_umlauts(term_lower)
        term_umlaut = restore_umlauts(term_lower)

        # Exakter Match (alle Varianten probieren)
        for variant in [term_lower, term_ascii, term_umlaut]:
            if variant in self.synonym_to_standard:
                return self.synonym_to_standard[variant]

        # Teilwort-Match (z.B. "frische Sahne" → "sahne")
        # Mindestlänge 4 Zeichen, um Fehl-Matches wie "ei" in "fleisch" zu vermeiden
        MIN_SUBSTR_LEN = 4

        for synonym, standard in self.synonym_to_standard.items():
            if len(synonym) < MIN_SUBSTR_LEN and len(term_lower) < MIN_SUBSTR_LEN:
                continue  # Beide zu kurz für Teilwort-Match

            if len(synonym) >= MIN_SUBSTR_LEN and synonym in term_lower:
                if not self._is_excluded(term_lower, standard):
                    return standard
            if len(term_lower) >= MIN_SUBSTR_LEN and term_lower in synonym:
                if not self._is_excluded(term_lower, standard):
                    return standard

            # ASCII-normalisiert
            if len(synonym) >= MIN_SUBSTR_LEN and synonym in term_ascii:
                if not self._is_excluded(term_ascii, standard):
                    return standard
            if len(term_ascii) >= MIN_SUBSTR_LEN and term_ascii in synonym:
                if not self._is_excluded(term_ascii, standard):
                    return standard

        return None

    def _is_excluded(self, term: str, standard: str) -> bool:
        """Prüft ob ein Term für einen Standardbegriff ausgeschlossen ist."""
        term_ascii = normalize_umlauts(term)
        # Beide Standard-Formen checken (mit und ohne Umlaute)
        exclusions = set(self.exclusions.get(standard, []))
        exclusions.update(self.exclusions.get(normalize_umlauts(standard), []))

        for exclusion in exclusions:
            excl_ascii = normalize_umlauts(exclusion)
            if (exclusion in term or term in exclusion or
                excl_ascii in term_ascii or term_ascii in excl_ascii):
                return True
        return False

    def get_all_synonyms(self, standard: str) -> list[str]:
        """Gibt alle Synonyme für einen Standardbegriff zurück."""
        return self.standard_to_synonyms.get(standard.lower(), [])


class MatchingEngine:
    """
    Mehrstufige Matching-Engine:
    1. Zutat normalisieren → Standardbegriff
    2. Produkt kategorisieren → Produktkategorie
    3. Kategorie matchen
    4. Konfidenz-Score berechnen
    """

    def __init__(self, synonym_db: SynonymDB = None):
        self.synonym_db = synonym_db or SynonymDB()

        # Minimaler Score für ein gültiges Match
        self.MIN_CONFIDENCE = 0.6

    def match_zutat_to_products(self, zutat_name: str, zutat_kategorie: str,
                                  angebote: list[dict]) -> list[dict]:
        """
        Findet passende Angebote für eine Rezeptzutat.

        Args:
            zutat_name: Original-Name der Zutat im Rezept
            zutat_kategorie: Normalisierte Kategorie der Zutat
            angebote: Liste von Angebots-Dicts mit mindestens 'name' und 'produktkategorie'

        Returns:
            Sortierte Liste von Matches mit Score
        """
        matches = []

        # Oberkategorien die zu unspezifisch für direktes Matching sind
        BROAD_CATEGORIES = {
            "gemuese", "gemüse", "gewuerze", "gewürze", "oel", "öl",
            "getreide", "milchprodukte", "suessmittel", "süssmittel",
            "fleisch", "saucen", "konserven", "obst", "kraut", "kräuter",
            "gebaeck", "gebäck", "alkohol", "leguminosen", "nussmus",
            "fluessigkeit", "flüssigkeit", "cerealien",
        }

        # Stufe 1: Zutat normalisieren
        # Bei Oberkategorien zutat_name bevorzugen (spezifischer)
        kat_lower = zutat_kategorie.lower().strip()
        is_broad = kat_lower in BROAD_CATEGORIES or normalize_umlauts(kat_lower) in BROAD_CATEGORIES

        if is_broad:
            standard_zutat = self.synonym_db.normalize(zutat_name)
            if not standard_zutat:
                standard_zutat = self.synonym_db.normalize(zutat_kategorie)
        else:
            standard_zutat = self.synonym_db.normalize(zutat_kategorie)
            if not standard_zutat:
                standard_zutat = self.synonym_db.normalize(zutat_name)

        if not standard_zutat:
            standard_zutat = zutat_name.lower().strip()

        zutat_synonyme = self.synonym_db.get_all_synonyms(standard_zutat)

        for angebot in angebote:
            score = self._calculate_match_score(
                standard_zutat, zutat_synonyme, zutat_name, angebot
            )

            if score >= self.MIN_CONFIDENCE:
                matches.append({
                    "angebot": angebot,
                    "score": round(score, 2),
                    "match_grund": self._get_match_reason(score)
                })

        # Sortieren: Höchster Score zuerst, dann günstigster Preis
        matches.sort(key=lambda m: (-m["score"], m["angebot"].get("preis", 999)))

        return matches

    def _calculate_match_score(self, standard_zutat: str, zutat_synonyme: list,
                                 zutat_name: str, angebot: dict) -> float:
        """Berechnet den Konfidenz-Score für ein Zutat-Produkt-Paar."""
        produkt_name = angebot.get("name", "").lower()
        produkt_kategorie = angebot.get("produktkategorie", "").lower()

        # Auch ASCII-normalisierte Versionen vorbereiten
        standard_ascii = normalize_umlauts(standard_zutat)
        produkt_kat_ascii = normalize_umlauts(produkt_kategorie)
        zutat_synonyme_ascii = [normalize_umlauts(s) for s in zutat_synonyme]

        # Ausschluss-Check
        if self.synonym_db._is_excluded(produkt_name, standard_zutat):
            return 0.0

        score = 0.0

        # Check 1: Kategorien stimmen exakt überein (bester Fall)
        if (produkt_kategorie == standard_zutat or
            produkt_kat_ascii == standard_ascii):
            score = max(score, 0.95)

        # Check 2: Produktkategorie ist ein Synonym der Zutat
        if (produkt_kategorie in zutat_synonyme or
            produkt_kat_ascii in zutat_synonyme_ascii):
            score = max(score, 0.90)

        # Check 3: Produktname enthält Standardbegriff oder Synonym
        for term in [standard_zutat] + zutat_synonyme:
            if self._word_match(term, produkt_name):
                score = max(score, 0.85)
                break

        # Check 4: Fuzzy-Match auf Produktname
        if score < self.MIN_CONFIDENCE:
            fuzzy = self._fuzzy_score(standard_zutat, produkt_name)
            score = max(score, fuzzy * 0.8)  # Fuzzy-Matches werden leicht abgewertet

        return score

    def _word_match(self, term: str, text: str) -> bool:
        """Prüft ob ein Term als ganzes Wort im Text vorkommt (nicht als Teil)."""
        pattern = r'\b' + re.escape(term) + r'\b'
        return bool(re.search(pattern, text, re.IGNORECASE))

    def _fuzzy_score(self, a: str, b: str) -> float:
        """Berechnet die Ähnlichkeit zweier Strings (0.0 - 1.0)."""
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()

    def _get_match_reason(self, score: float) -> str:
        """Gibt eine menschenlesbare Begründung für den Match."""
        if score >= 0.95:
            return "Exakte Kategorie-Übereinstimmung"
        elif score >= 0.90:
            return "Synonym-Übereinstimmung"
        elif score >= 0.85:
            return "Produktname enthält Zutat"
        elif score >= 0.70:
            return "Ähnlicher Produktname"
        else:
            return "Mögliche Übereinstimmung"

    def match_recipe(self, rezept: dict, angebote: list[dict]) -> dict:
        """
        Findet für alle Zutaten eines Rezepts passende Angebote.

        Returns:
            Dict mit matched/unmatched Zutaten und Gesamtbewertung
        """
        ergebnis = {
            "rezept_id": rezept.get("id"),
            "rezept_title": rezept.get("title"),
            "matched_zutaten": [],
            "unmatched_zutaten": [],
            "match_quote": 0.0,
            "geschaetzer_preis": 0.0
        }

        total = 0
        matched_count = 0

        for zutat in rezept.get("zutaten", []):
            total += 1
            matches = self.match_zutat_to_products(
                zutat["zutat_name"],
                zutat["zutat_kategorie"],
                angebote
            )

            if matches:
                matched_count += 1
                best_match = matches[0]
                ergebnis["matched_zutaten"].append({
                    "zutat": zutat["zutat_name"],
                    "kategorie": zutat["zutat_kategorie"],
                    "bestes_angebot": best_match["angebot"].get("name"),
                    "supermarkt": best_match["angebot"].get("supermarkt"),
                    "preis": best_match["angebot"].get("preis"),
                    "score": best_match["score"],
                    "weitere_angebote": len(matches) - 1
                })
                if best_match["angebot"].get("preis"):
                    ergebnis["geschaetzer_preis"] += best_match["angebot"]["preis"]
            else:
                ergebnis["unmatched_zutaten"].append({
                    "zutat": zutat["zutat_name"],
                    "kategorie": zutat["zutat_kategorie"]
                })

        ergebnis["match_quote"] = round(matched_count / total, 2) if total > 0 else 0

        return ergebnis


# ============================================
# DEMO / TEST
# ============================================
def demo():
    """Demonstriert die Matching-Engine mit Beispieldaten."""

    print("=" * 60)
    print("MealDeal Matching Engine — Demo")
    print("=" * 60)

    # Synonym-DB laden
    db = SynonymDB()
    engine = MatchingEngine(db)

    print(f"\n✓ Synonym-DB geladen: {len(db.synonym_to_standard)} Einträge")

    # Beispiel-Angebote (simuliert)
    beispiel_angebote = [
        {"name": "Kerrygold Irische Butter 250g", "produktkategorie": "butter", "supermarkt": "REWE", "preis": 1.89},
        {"name": "Müller Buttermilch 500ml", "produktkategorie": "buttermilch", "supermarkt": "REWE", "preis": 0.79},
        {"name": "Barilla Spaghetti No.5 500g", "produktkategorie": "nudeln", "supermarkt": "LIDL", "preis": 0.99},
        {"name": "Ja! Hackfleisch gemischt 500g", "produktkategorie": "hackfleisch", "supermarkt": "REWE", "preis": 3.49},
        {"name": "Bio Vollmilch 3,5% 1L", "produktkategorie": "milch", "supermarkt": "ALDI", "preis": 1.15},
        {"name": "Erdnussbutter crunchy 350g", "produktkategorie": "erdnussbutter", "supermarkt": "LIDL", "preis": 2.49},
        {"name": "Rama Margarine 500g", "produktkategorie": "margarine", "supermarkt": "PENNY", "preis": 1.29},
        {"name": "Gouda jung 200g", "produktkategorie": "kaese", "supermarkt": "ALDI", "preis": 1.49},
        {"name": "Dr. Oetker Käsekuchen Backmischung", "produktkategorie": "backmischung", "supermarkt": "EDEKA", "preis": 2.99},
        {"name": "Zwiebeln 1kg Netz", "produktkategorie": "zwiebel", "supermarkt": "LIDL", "preis": 0.99},
        {"name": "Bio Karotten 1kg", "produktkategorie": "karotte", "supermarkt": "ALDI", "preis": 1.29},
        {"name": "Passierte Tomaten 500ml", "produktkategorie": "passierte_tomaten", "supermarkt": "LIDL", "preis": 0.49},
        {"name": "Knoblauch 3er Pack", "produktkategorie": "knoblauch", "supermarkt": "PENNY", "preis": 0.89},
        {"name": "Sahne 200ml", "produktkategorie": "sahne", "supermarkt": "REWE", "preis": 0.69},
        {"name": "Emmentaler gerieben 200g", "produktkategorie": "kaese", "supermarkt": "EDEKA", "preis": 1.79},
    ]

    # Test 1: Einzelne Zutat matchen
    print("\n--- Test 1: Butter matchen (soll NICHT Buttermilch finden) ---")
    matches = engine.match_zutat_to_products("Butter", "butter", beispiel_angebote)
    for m in matches:
        print(f"  ✓ {m['angebot']['name']} → Score: {m['score']} ({m['match_grund']})")
    if not matches:
        print("  ✗ Keine Matches")

    print("\n--- Test 2: Käse matchen (soll NICHT Käsekuchen finden) ---")
    matches = engine.match_zutat_to_products("Käse, gerieben", "kaese", beispiel_angebote)
    for m in matches:
        print(f"  ✓ {m['angebot']['name']} → Score: {m['score']} ({m['match_grund']})")

    print("\n--- Test 3: Hackfleisch mit österreichischem Synonym ---")
    matches = engine.match_zutat_to_products("Faschiertes", "hackfleisch", beispiel_angebote)
    for m in matches:
        print(f"  ✓ {m['angebot']['name']} → Score: {m['score']} ({m['match_grund']})")

    # Test 2: Ganzes Rezept matchen
    print("\n--- Test 4: Komplettes Rezept matchen ---")

    # Lade ein Rezept aus der Datenbank
    try:
        with open(REZEPTE_PATH, "r", encoding="utf-8") as f:
            rezepte = json.load(f)

        if rezepte:
            erstes_rezept = rezepte[0]
            print(f"\nRezept: {erstes_rezept['title']}")
            print(f"Zutaten: {len(erstes_rezept['zutaten'])}")

            ergebnis = engine.match_recipe(erstes_rezept, beispiel_angebote)

            print(f"\nMatch-Quote: {ergebnis['match_quote'] * 100:.0f}%")
            print(f"Geschätzter Preis: {ergebnis['geschaetzer_preis']:.2f}€")

            print("\n  Gefundene Angebote:")
            for m in ergebnis["matched_zutaten"]:
                print(f"    ✓ {m['zutat']} → {m['bestes_angebot']} "
                      f"({m['supermarkt']}, {m['preis']}€, Score: {m['score']})")

            print("\n  Ohne Angebot:")
            for u in ergebnis["unmatched_zutaten"]:
                print(f"    ✗ {u['zutat']} ({u['kategorie']})")

    except FileNotFoundError:
        print("  (Rezeptdatei nicht gefunden — übersprungen)")

    print("\n" + "=" * 60)
    print("Demo abgeschlossen.")


if __name__ == "__main__":
    demo()
