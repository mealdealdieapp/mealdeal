#!/usr/bin/env python3
"""
prospekt_scraper_v2.py - Prospekte scannen mit Claude Vision

Liest PDFs und PNGs aus ./scraper/Prospekte/,
extrahiert Angebote via Claude Vision und speichert sie
in offers + products + price_history.

Usage:
  py scraper/prospekt_scraper_v2.py                    # Alle Prospekte
  py scraper/prospekt_scraper_v2.py --dry-run           # Nur anzeigen
  py scraper/prospekt_scraper_v2.py --store REWE         # Nur REWE
  py scraper/prospekt_scraper_v2.py --file Prospekte/x.pdf  # Einzelne Datei
"""

import os
import sys
import json
import argparse
import base64

# Windows UTF-8 Konsole erzwingen
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
import hashlib
import re
from pathlib import Path
from datetime import date, timedelta
from collections import defaultdict

import anthropic
import fitz  # pymupdf
from PIL import Image
from io import BytesIO

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
PROSPEKTE_DIR = SCRIPT_DIR / "Prospekte"

# .env laden
env_path = PROJECT_DIR / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Markt-Erkennung aus Dateinamen
STORE_PATTERNS = {
    "REWE": r"(?i)^REWE[_\s-]",
    "ALDI": r"(?i)^ALDI[_\s-]",
    "Netto": r"(?i)^Netto[_\s-]",
    "Penny": r"(?i)^PENNY[_\s-]",
    "Lidl": r"(?i)^LIDL[_\s-]",
}

CATEGORIES = [
    "Fleisch", "Fisch & Meeresfrüchte", "Milch & Eier", "Käse",
    "Gemüse", "Obst", "Brot & Getreide", "Nudeln & Reis",
    "Hülsenfrüchte", "Tiefkühl", "Konserven", "Getränke",
    "Snacks & Süßes", "Öle & Fette", "Gewürze & Saucen",
    "Drogerie", "Haushalt", "Sonstiges",
]

VISION_PROMPT = """Analysiere dieses Prospektbild eines deutschen Supermarkts.

Extrahiere ALLE Angebote als JSON-Array. Für jedes Produkt:

{{
  "product_name": "Exakter Produktname wie abgebildet",
  "brand": "Markenname oder null",
  "offer_price": 1.99,
  "original_price": 2.49,
  "discount_percent": 20,
  "quantity": "500g",
  "unit": "g",
  "category": "eine der Kategorien",
  "emoji": "passendes Emoji"
}}

WICHTIGE REGELN:
- offer_price ist der ANGEBOTSPREIS (der günstigere)
- original_price ist der NORMALPREIS / UVP (der höhere), null wenn nicht sichtbar
- discount_percent berechnen wenn beide Preise vorhanden, sonst aus Bild ablesen
- quantity: Menge + Einheit wie angegeben (z.B. "500g", "1L", "6x0,33L")
- unit: Basiseinheit (g, kg, ml, L, Stück, Packung)
- emoji: passendes Lebensmittel-Emoji

Erlaubte Kategorien:
{categories}

WICHTIG: Ignoriere Werbetexte, Slogans, Logos - nur echte Produktangebote mit Preis.
Wenn kein Preis erkennbar ist, überspringe das Produkt.

Antworte NUR mit dem JSON-Array, kein anderer Text."""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def detect_store(filename: str) -> str | None:
    """Erkenne Marktname aus Dateiname."""
    for store, pattern in STORE_PATTERNS.items():
        if re.search(pattern, filename):
            return store
    return None


def extract_plz(filename: str) -> str | None:
    """Extrahiere PLZ aus Dateiname wie REWE_56281_KW13.pdf."""
    m = re.search(r"(\d{5})", filename)
    return m.group(1) if m else None


def extract_kw(filename: str) -> int | None:
    """Extrahiere Kalenderwoche aus Dateiname."""
    m = re.search(r"KW(\d{1,2})", filename, re.IGNORECASE)
    return int(m.group(1)) if m else None


def kw_to_dates(year: int, kw: int) -> tuple[str, str]:
    """Kalenderwoche → (valid_from Montag, valid_until Samstag)."""
    from datetime import datetime
    # ISO Woche: Montag = 1
    jan4 = datetime(year, 1, 4)
    start_of_week1 = jan4 - timedelta(days=jan4.isoweekday() - 1)
    monday = start_of_week1 + timedelta(weeks=kw - 1)
    saturday = monday + timedelta(days=5)
    return monday.strftime("%Y-%m-%d"), saturday.strftime("%Y-%m-%d")


def pdf_page_to_image(pdf_path: Path, page_num: int, dpi: int = 150) -> bytes:
    """Einzelne PDF-Seite als komprimiertes JPEG extrahieren (speicherschonend)."""
    doc = fitz.open(str(pdf_path))
    page = doc[page_num]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()
    # Auf max 1600px skalieren und als JPEG komprimieren
    if max(img.size) > 1600:
        img.thumbnail((1600, 1600), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def pdf_page_count(pdf_path: Path) -> int:
    """Seitenanzahl eines PDFs."""
    doc = fitz.open(str(pdf_path))
    count = len(doc)
    doc.close()
    return count


def png_to_bytes(png_path: Path, max_size: int = 1600) -> bytes:
    """PNG laden, skalieren und als JPEG komprimieren."""
    img = Image.open(png_path).convert("RGB")
    if max(img.size) > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def make_fingerprint(product_name: str, store: str, valid_from: str, plz_prefix: str) -> str:
    """Eindeutiger Fingerprint für Duplikat-Erkennung."""
    raw = f"{product_name}|{store}|{valid_from}|{plz_prefix}"
    return hashlib.md5(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Claude Vision
# ---------------------------------------------------------------------------

def extract_offers_from_image(client: anthropic.Anthropic, image_bytes: bytes, media_type: str = "image/jpeg") -> list[dict]:
    """Sende Bild an Claude Vision, erhalte Angebote zurück."""
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = VISION_PROMPT.replace("{categories}", ", ".join(CATEGORIES))

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": b64,
                    },
                },
                {"type": "text", "text": prompt},
            ],
        }],
    )

    text = response.content[0].text.strip()

    # JSON extrahieren (manchmal in ```json ... ``` gewrappt)
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        offers = json.loads(text)
        if isinstance(offers, list):
            return offers
    except json.JSONDecodeError:
        print(f"    ⚠️  JSON-Parse-Fehler. Rohe Antwort:\n{text[:200]}...")

    return []


# ---------------------------------------------------------------------------
# Datei-Discovery
# ---------------------------------------------------------------------------

def discover_files(base_dir: Path, store_filter: str | None = None) -> dict[str, list[Path]]:
    """
    Finde alle PDFs und PNGs, gruppiert nach Markt.
    Gibt dict zurück: { "REWE": [path1, ...], "Lidl": [path1, ...] }
    """
    grouped = defaultdict(list)

    for f in sorted(base_dir.rglob("*")):
        if not f.is_file():
            continue
        if f.suffix.lower() not in (".pdf", ".png", ".jpg", ".jpeg"):
            continue

        store = detect_store(f.name)
        if not store:
            print(f"  ⚠️  Markt nicht erkannt: {f.name}")
            continue

        if store_filter and store.upper() != store_filter.upper():
            continue

        grouped[store].append(f)

    return dict(grouped)


# ---------------------------------------------------------------------------
# DB Operations
# ---------------------------------------------------------------------------

def save_to_db(offers: list[dict], store: str, plz: str, kw: int, dry_run: bool = False):
    """Speichere Angebote in offers + products + price_history."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  ⚠️  Keine Supabase-Credentials - überspringe DB-Speicherung")
        return 0, 0, 0

    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    year = date.today().year
    valid_from, valid_until = kw_to_dates(year, kw)
    plz_prefix = plz[:3] if plz else None

    offers_inserted = 0
    products_updated = 0
    products_created = 0

    for offer in offers:
        product_name = offer.get("product_name", "").strip()
        if not product_name:
            continue

        offer_price = offer.get("offer_price")
        if offer_price is None:
            continue

        original_price = offer.get("original_price")
        discount = offer.get("discount_percent")
        category = offer.get("category", "Sonstiges")
        quantity = offer.get("quantity")
        unit = offer.get("unit")
        emoji = offer.get("emoji", "🛒")
        brand = offer.get("brand")

        # Discount berechnen falls nicht vorhanden
        if discount is None and original_price and original_price > offer_price:
            discount = round((1 - offer_price / original_price) * 100)

        fp = make_fingerprint(product_name, store, valid_from, plz_prefix or "")

        # --- 1. Offer einfügen ---
        offer_row = {
            "product_name": product_name,
            "store": store,
            "plz": plz,
            "plz_prefix": plz_prefix,
            "region": None,
            "original_price": original_price,
            "offer_price": offer_price,
            "discount_percent": discount,
            "category": category,
            "unit": unit,
            "quantity": quantity,
            "valid_from": valid_from,
            "valid_until": valid_until,
            "emoji": emoji,
            "fingerprint": fp,
        }

        if not dry_run:
            try:
                sb.table("offers").upsert(offer_row, on_conflict="fingerprint").execute()
                offers_inserted += 1
            except Exception as e:
                print(f"    ⚠️  Offer-Insert fehlgeschlagen: {product_name}: {e}")
                continue
        else:
            offers_inserted += 1

        # --- 2. Product upserten ---
        existing = sb.table("products").select("id, min_price, max_price, times_on_sale").eq("name", product_name).execute()

        if existing.data:
            product = existing.data[0]
            product_id = product["id"]
            old_min = product.get("min_price")
            old_max = product.get("max_price")
            times = (product.get("times_on_sale") or 0) + 1

            update_data = {
                "current_price": offer_price,
                "current_market": store,
                "times_on_sale": times,
                "last_seen": valid_until,
                "last_seen_at": f"{valid_until}T00:00:00Z",
            }
            if offer_price is not None:
                if old_min is None or offer_price < float(old_min):
                    update_data["min_price"] = offer_price
                if old_max is None or offer_price > float(old_max):
                    update_data["max_price"] = offer_price
            if original_price:
                update_data["uvp"] = original_price
                update_data["normal_price"] = original_price

            if not dry_run:
                sb.table("products").update(update_data).eq("id", product_id).execute()
            products_updated += 1
        else:
            new_product = {
                "name": product_name,
                "brand": brand,
                "store": store,
                "category": category,
                "emoji": emoji,
                "unit_size": quantity,
                "current_price": offer_price,
                "current_market": store,
                "normal_price": original_price,
                "uvp": original_price,
                "min_price": offer_price,
                "max_price": offer_price,
                "avg_price": offer_price,
                "lowest_price": offer_price,
                "highest_price": offer_price,
                "times_on_sale": 1,
                "last_seen": valid_until,
                "last_seen_at": f"{valid_until}T00:00:00Z",
            }

            if not dry_run:
                try:
                    result = sb.table("products").insert(new_product).execute()
                    product_id = result.data[0]["id"]
                except Exception as e:
                    # Evtl. race condition - nochmal suchen
                    existing2 = sb.table("products").select("id").eq("name", product_name).execute()
                    if existing2.data:
                        product_id = existing2.data[0]["id"]
                    else:
                        print(f"    ⚠️  Product-Insert fehlgeschlagen: {product_name}: {e}")
                        continue
            else:
                product_id = "dry-run-id"

            products_created += 1

        # --- 3. Price History ---
        if not dry_run:
            ph_row = {
                "product_id": product_id,
                "market": store,
                "price": offer_price,
                "original_price": original_price,
                "valid_from": valid_from,
                "valid_until": valid_until,
                "week_number": kw,
                "source": "pdf",
                "plz": plz,
                "plz_prefix": plz_prefix,
            }
            try:
                sb.table("price_history").upsert(
                    ph_row,
                    on_conflict="product_id,market,week_number,plz_prefix"
                ).execute()
            except Exception:
                pass  # Duplikat - ok

    return offers_inserted, products_updated, products_created


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Prospekt-Scraper mit Claude Vision")
    parser.add_argument("--dry-run", action="store_true", help="Nur anzeigen, nichts speichern")
    parser.add_argument("--store", type=str, help="Nur diesen Markt scrapen (z.B. REWE)")
    parser.add_argument("--file", type=str, help="Einzelne Datei scrapen")
    parser.add_argument("--dir", type=str, default=str(PROSPEKTE_DIR), help="Prospekte-Ordner")
    args = parser.parse_args()

    if not ANTHROPIC_KEY:
        print("❌ ANTHROPIC_API_KEY muss gesetzt sein!")
        print("   export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    base_dir = Path(args.dir)

    if args.dry_run:
        print("🔍 DRY RUN - keine Änderungen werden gespeichert\n")

    # --- Dateien finden ---
    if args.file:
        fp = Path(args.file)
        if not fp.is_absolute():
            fp = base_dir / fp
        store = detect_store(fp.name)
        if not store:
            store = input(f"Markt für {fp.name}? ").strip() or "Unbekannt"
        files_grouped = {store: [fp]}
    else:
        if not base_dir.exists():
            print(f"❌ Ordner nicht gefunden: {base_dir}")
            sys.exit(1)
        files_grouped = discover_files(base_dir, args.store)

    if not files_grouped:
        print("❌ Keine Prospekt-Dateien gefunden!")
        sys.exit(1)

    # --- Übersicht anzeigen ---
    total_files = sum(len(v) for v in files_grouped.values())
    print(f"📂 {total_files} Dateien in {base_dir}\n")

    for store, files in sorted(files_grouped.items()):
        pdfs = [f for f in files if f.suffix.lower() == ".pdf"]
        imgs = [f for f in files if f.suffix.lower() in (".png", ".jpg", ".jpeg")]
        print(f"  🏪 {store}: {len(pdfs)} PDFs, {len(imgs)} Screenshots")
        for f in files:
            plz = extract_plz(f.name) or "?"
            kw = extract_kw(f.name) or "?"
            print(f"     └─ {f.name}  (PLZ: {plz}, KW: {kw})")

    print()

    # --- Verarbeitung ---
    total_offers = 0
    total_products_updated = 0
    total_products_created = 0
    store_summary = {}

    for store, files in sorted(files_grouped.items()):
        print(f"{'='*60}")
        print(f"🏪 {store}")
        print(f"{'='*60}")

        store_offers = 0

        # PDFs und PNGs mit gleichem Prefix zusammenfassen
        # (z.B. LIDL_56281_KW13 (1).png ... (15).png = ein Prospekt)
        pdf_files = sorted([f for f in files if f.suffix.lower() == ".pdf"])
        img_files = sorted([f for f in files if f.suffix.lower() in (".png", ".jpg", ".jpeg")])

        # PDFs verarbeiten: Seite für Seite (speicherschonend)
        for pdf_file in pdf_files:
            plz = extract_plz(pdf_file.name) or "56281"
            kw = extract_kw(pdf_file.name)
            if not kw:
                print(f"  ⚠️  Keine KW erkannt: {pdf_file.name}, überspringe")
                continue

            print(f"\n  📄 {pdf_file.name}")
            num_pages = pdf_page_count(pdf_file)
            print(f"     {num_pages} Seiten")

            all_page_offers = []
            for i in range(num_pages):
                print(f"     Seite {i+1}/{num_pages}...", end=" ", flush=True)
                try:
                    page_bytes = pdf_page_to_image(pdf_file, i)
                    size_kb = len(page_bytes) // 1024
                    print(f"({size_kb}KB)", end=" ", flush=True)
                    page_offers = extract_offers_from_image(client, page_bytes)
                    print(f"→ {len(page_offers)} Angebote")
                    all_page_offers.extend(page_offers)
                except Exception as e:
                    print(f"→ FEHLER: {e}")

            if all_page_offers:
                ins, upd, cre = save_to_db(all_page_offers, store, plz, kw, args.dry_run)
                store_offers += ins
                total_products_updated += upd
                total_products_created += cre
                print(f"     ✅ {ins} Angebote → DB")

        # PNGs verarbeiten: jedes Bild einzeln
        if img_files:
            # Versuche PLZ/KW aus erstem Bild
            plz = extract_plz(img_files[0].name) or "56281"
            kw = extract_kw(img_files[0].name)
            if not kw:
                print(f"  ⚠️  Keine KW erkannt: {img_files[0].name}, überspringe Screenshots")
            else:
                print(f"\n  🖼️  {len(img_files)} Screenshots")

                all_img_offers = []
                for img_file in img_files:
                    print(f"     {img_file.name}...", end=" ", flush=True)
                    img_bytes = png_to_bytes(img_file)
                    img_offers = extract_offers_from_image(client, img_bytes)
                    print(f"→ {len(img_offers)} Angebote")
                    all_img_offers.extend(img_offers)

                if all_img_offers:
                    ins, upd, cre = save_to_db(all_img_offers, store, plz, kw, args.dry_run)
                    store_offers += ins
                    total_products_updated += upd
                    total_products_created += cre
                    print(f"     ✅ {ins} Angebote → DB")

        total_offers += store_offers
        store_summary[store] = store_offers
        print()

    # --- Zusammenfassung ---
    print(f"\n{'='*60}")
    print(f"📊 ZUSAMMENFASSUNG {'(DRY RUN)' if args.dry_run else ''}")
    print(f"{'='*60}")
    for store, count in sorted(store_summary.items()):
        print(f"  🏪 {store}: {count} Angebote")
    print(f"  {'─'*40}")
    print(f"  📦 {total_offers} Angebote total")
    print(f"  🔄 {total_products_updated} Produkte aktualisiert")
    print(f"  🆕 {total_products_created} neue Produkte angelegt")
    print()


if __name__ == "__main__":
    main()
