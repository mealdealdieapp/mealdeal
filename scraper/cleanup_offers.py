#!/usr/bin/env python3
"""
cleanup_offers.py - Abgelaufene Angebote verarbeiten

Workflow:
1. Abgelaufene Angebote finden (valid_until < heute)
2. Produkt in products upserten (Name als unique key)
3. Preisverlauf in price_history speichern
4. Angebot aus offers löschen

Usage:
  python cleanup_offers.py              # Live-Modus
  python cleanup_offers.py --dry-run    # Nur anzeigen, nichts ändern
"""

import os
import sys
import argparse
from datetime import date
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL und SUPABASE_SERVICE_KEY müssen gesetzt sein!")
    print("   export SUPABASE_URL=https://xxx.supabase.co")
    print("   export SUPABASE_SERVICE_KEY=eyJ...")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_expired_offers():
    """Alle abgelaufenen Angebote laden."""
    today = date.today().isoformat()
    result = sb.table("offers").select("*").lt("valid_until", today).execute()
    return result.data


def get_or_create_product(offer, dry_run=False):
    """Produkt upserten basierend auf product_name. Gibt product_id zurück."""
    name = offer["product_name"]

    # Prüfe ob Produkt existiert
    existing = sb.table("products").select("id, min_price, max_price, times_on_sale").eq("name", name).execute()

    offer_price = offer.get("offer_price")
    original_price = offer.get("original_price")
    store = offer.get("store")
    category = offer.get("category")
    quantity = offer.get("quantity")
    emoji = offer.get("emoji")
    valid_until = offer.get("valid_until")

    if existing.data:
        # Produkt existiert → Update
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
            "last_seen_at": f"{valid_until}T00:00:00Z" if valid_until else None,
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

        return product_id, False  # existed

    else:
        # Neues Produkt anlegen
        new_product = {
            "name": name,
            "store": store,
            "category": category,
            "emoji": emoji or "🛒",
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
            "last_seen_at": f"{valid_until}T00:00:00Z" if valid_until else None,
        }

        if not dry_run:
            result = sb.table("products").insert(new_product).execute()
            return result.data[0]["id"], True  # new
        else:
            return "dry-run-id", True


def insert_price_history(product_id, offer, dry_run=False):
    """Preisverlauf-Eintrag erstellen."""
    valid_from = offer.get("valid_from")
    valid_until = offer.get("valid_until")

    # Kalenderwoche berechnen
    week_number = None
    if valid_from:
        try:
            week_number = date.fromisoformat(valid_from).isocalendar()[1]
        except (ValueError, TypeError):
            pass

    entry = {
        "product_id": product_id,
        "market": offer.get("store"),
        "price": offer.get("offer_price"),
        "original_price": offer.get("original_price"),
        "valid_from": valid_from,
        "valid_until": valid_until,
        "week_number": week_number,
        "source": "offer",
        "plz": offer.get("plz"),
        "plz_prefix": offer.get("plz_prefix"),
    }

    if not dry_run:
        sb.table("price_history").upsert(entry, on_conflict="product_id,market,week_number").execute()


def update_avg_price(product_id, dry_run=False):
    """Durchschnittspreis aus price_history berechnen und in products updaten."""
    if dry_run:
        return

    history = sb.table("price_history").select("price").eq("product_id", product_id).execute()
    prices = [float(h["price"]) for h in history.data if h.get("price") is not None]

    if prices:
        avg = round(sum(prices) / len(prices), 2)
        sb.table("products").update({"avg_price": avg}).eq("id", product_id).execute()


def delete_offer(offer_id, dry_run=False):
    """Angebot aus offers Tabelle löschen."""
    if not dry_run:
        sb.table("offers").delete().eq("id", offer_id).execute()


def main():
    parser = argparse.ArgumentParser(description="Abgelaufene Angebote aufräumen")
    parser.add_argument("--dry-run", action="store_true", help="Nur anzeigen, nichts ändern")
    args = parser.parse_args()

    if args.dry_run:
        print("🔍 DRY RUN - keine Änderungen werden geschrieben\n")

    expired = get_expired_offers()
    print(f"📦 {len(expired)} abgelaufene Angebote gefunden\n")

    if not expired:
        print("✅ Nichts zu tun!")
        return

    products_updated = 0
    products_created = 0
    history_inserted = 0
    offers_deleted = 0
    errors = 0

    for i, offer in enumerate(expired, 1):
        name = offer["product_name"]
        store = offer.get("store", "?")
        price = offer.get("offer_price", "?")

        try:
            # 1. Produkt upserten
            product_id, is_new = get_or_create_product(offer, args.dry_run)

            if is_new:
                products_created += 1
                tag = "NEU"
            else:
                products_updated += 1
                tag = "UPD"

            # 2. Price History eintragen
            insert_price_history(product_id, offer, args.dry_run)
            history_inserted += 1

            # 3. Avg Price aktualisieren
            update_avg_price(product_id, args.dry_run)

            # 4. Angebot löschen
            delete_offer(offer["id"], args.dry_run)
            offers_deleted += 1

            print(f"  [{tag}] {i}/{len(expired)} {name} ({store}) → {price}€")

        except Exception as e:
            errors += 1
            print(f"  [ERR] {i}/{len(expired)} {name}: {e}")

    # Zusammenfassung
    print(f"\n{'=' * 50}")
    print(f"📊 Zusammenfassung {'(DRY RUN)' if args.dry_run else ''}")
    print(f"{'=' * 50}")
    print(f"  {offers_deleted} Angebote verarbeitet")
    print(f"  {products_updated} Produkte aktualisiert")
    print(f"  {products_created} neue Produkte angelegt")
    print(f"  {history_inserted} Preisverlauf-Einträge")
    if errors:
        print(f"  ⚠️  {errors} Fehler")
    print()


if __name__ == "__main__":
    main()
