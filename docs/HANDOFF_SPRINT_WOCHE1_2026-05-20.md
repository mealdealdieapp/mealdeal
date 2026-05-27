# Handoff - Sprint Woche 1

**Datum:** 2026-05-20
**Bezug:** Release-Master-Plan Q2/Q3 (`docs/RELEASE_MASTER_PLAN_2026-Q2.md`)
**Branch:** `feature/sprint-week-1`
**Verifikation:** TypeScript (`tsc`) und ESLint laufen fehlerfrei durch.

---

## 1. Was erledigt wurde

### Phase 1.1 - Adapter-Layer fuer Angebotsquellen
Neuer Ordner `src/lib/offerSource/` kapselt, woher Angebote kommen. Die App
spricht kuenftig nur noch ueber das Interface `IOfferSource`, nie direkt mit
dem Scraper. Wechsel auf die Marktguru-API = nur ENV `VITE_OFFER_SOURCE`
umstellen, kein App-Code-Eingriff.

- `IOfferSource.ts` - Interface + Typen
- `ScraperOfferSource.ts` - aktive Implementierung (heutiger Scraper)
- `MarktguruOfferSource.ts` - Stub fuer die offizielle API
- `index.ts` - Barrel-Export + `getOfferSource()`-Factory
- `README.md` - Kurzdoku

### Phase 1.2 - Markt-Layout / Einkaufsliste nach Marktlauf sortiert
Die Einkaufsliste sortiert Artikel jetzt pro Markt in der Reihenfolge, wie
man sie im Laden ablaeuft (Obst/Gemuese -> ... -> Drogerie).

- `src/lib/marketLayouts.ts` - Lauf-Reihenfolgen fuer 8 Ketten
- `src/hooks/useMarketLayout.ts` - Hook (DB-Override mit TS-Fallback)
- `src/hooks/useShopping.ts` - sortiert die Markt-Gruppen (geaendert)
- `scripts/add-market-layouts.sql` - optionale DB-Tabelle fuer Overrides

### Phase 1.3 - useMatchedOffers Hook
- `src/hooks/useMatchedOffers.ts` - liefert pro Rezept-Zutat das beste
  aktuelle Angebot ueber die Supabase-RPC `match_offers_for_recipe`
- `src/lib/featureFlags.ts` - simpler ENV-Flag `VITE_FEATURE_MATCHED_OFFERS`

### 2.9 - Heilversprechen-Audit
- `docs/HEILVERSPRECHEN_AUDIT_2026-05-20.md` - App-Texte sind sauber,
  eine DB-Abfrage bleibt offen (siehe Punkt 3).

---

## 2. Was DU selbst tun musst

1. **Git-Lock entfernen.** Die Datei `.git/index.lock` blockiert alle
   Git-Befehle (zurueckgeblieben vom Festplatten-Crash heute Mittag). In
   einem Terminal im Projektordner:
   `del .git\index.lock` (Windows) - danach laeuft Git wieder.

2. **Code committen.** Wegen der Git-Lock konnte ich nichts committen.
   Nach Schritt 1: Aenderungen pruefen, committen, pushen, PR von
   `feature/sprint-week-1` aufmachen.

3. **SQL-Migration laufen lassen (optional).** `scripts/add-market-layouts.sql`
   im Supabase SQL-Editor ausfuehren. Ohne diesen Schritt funktioniert die
   Sortierung trotzdem (TS-Fallback) - die Tabelle erlaubt nur spaetere
   Overrides pro Markt.

4. **DB-Heilversprechen-Pruefung.** Die SQL-Abfrage aus
   `docs/HEILVERSPRECHEN_AUDIT_2026-05-20.md` Abschnitt 4 ausfuehren und
   Treffer ggf. neutral umbenennen.

5. **GitHub-Workflow `ai-enrichment`** bei Bedarf starten (batch_size 500).

---

## 3. Noch offen (Rest von Phase 1.3)

Der Hook `useMatchedOffers` ist fertig, aber die **UI-Integration** fehlt
noch (war als 2-Tage-Aufgabe geplant, Hook = Woche-2-Deliverable):

- Rezept-Detail-Seite: pro Zutat ein Chip "2,49 EUR bei Aldi" rendern,
  wenn `getMatchForIngredient(name)` einen Treffer mit `hasOffer` liefert.
- Chip nur zeigen, wenn `isFeatureEnabled('matched_offers')` true ist.
- Zu klaeren/zu verifizieren: Die `hasOffer`-Erkennung im Hook nimmt an,
  dass die RPC bei "kein Angebot" ein leeres `best_store` liefert. Sobald
  ein echter RPC-Aufruf moeglich ist, kurz gegenpruefen (im Hook ist die
  Stelle kommentiert).

---

## 4. Bekanntes Problem: abgeschnittene Schreibvorgaenge

Beim Speichern ueber die Datei-Tools wurden zweimal Dateien am Ende
abgeschnitten (`useShopping.ts` und Adapter-Dateien). Ursache vermutlich
ein Sync-/Puffer-Problem des Windows-Mounts bei groesseren Schreibvorgaengen.
Alle betroffenen Dateien wurden rekonstruiert und verifiziert (Zeilenzahl,
Klammer-Balance, `tsc`). **Falls dir kuenftig eine Datei unvollstaendig
vorkommt:** letzte Zeilen pruefen - eine abrupt endende Datei ist das
Symptom.

---

## 5. Festplattenspeicher

Der Festplatten-Crash heute Mittag (Platte zu 100% voll) hat die Git-Lock
verursacht. Aktueller Stand: ~60 GB frei (88% belegt) - kein Notfall mehr.
Empfehlung: vor dem Launch dauerhaft etwas Luft schaffen, damit Builds,
Auslagerungsdatei und App-Daten nicht erneut an die Grenze stossen.

---

## 6. Status der Master-Plan-Aufgaben

| Aufgabe | Status |
|---|---|
| 1.1 Adapter-Layer IOfferSource | erledigt |
| 1.2 Markt-Layout-Sortierung | erledigt |
| 1.3 useMatchedOffers Hook | erledigt (UI-Integration offen) |
| 2.9 Heilversprechen-Audit | erledigt (DB-Abfrage offen) |
