# Phase 1 — Deployment-Checkliste für Jo

**Datum:** 2026-04-22
**Status nach dieser Session:** Code geschrieben, wartet auf Deploy

Diese Checkliste bringt die Phase-1-Änderungen live.
Reihenfolge strikt einhalten — jeder Schritt baut auf dem vorigen auf.

---

## ✅ Bereits erledigt (Claude hat Code geschrieben)

- [x] SQL-Migration: `scripts/phase1-product-brain.sql`
- [x] AI-Layer: `scripts/lib/ai/` (Gemini-Provider, Prompts, Cost-Logger)
- [x] Fingerprint-Logik: `scripts/lib/products/fingerprint.mjs`
- [x] Enrichment-Script: `scripts/enrich-products.mjs`
- [x] GitHub-Workflow: `.github/workflows/ai-enrichment.yml`
- [x] `db-migrate.yml` um die neue Migration erweitert
- [x] `package.json` um `@google/generative-ai` + `zod` erweitert
- [x] npm-Scripts: `npm run enrich-products` und `enrich-products:dry`

## ⏳ Was Jo jetzt tun muss

### Schritt 1 — Gemini API Key in GitHub Secrets

1. Öffne https://github.com/mealdealdieapp/mealdeal/settings/secrets/actions
2. Klicke **"New repository secret"**
3. Name: `GEMINI_API_KEY`
4. Value: Der Key von aistudio.google.com (beginnt mit `AIzaSy...`)
5. Klicke **"Add secret"**

### Schritt 2 — Gemini API Key in Vercel (nur für späteren Frontend-Use)

*Optional für Phase 1 — aber sinnvoll für später.*

1. Öffne https://vercel.com/dashboard → Projekt `mealdeal` → **Settings** → **Environment Variables**
2. Key: `GEMINI_API_KEY`
3. Value: Derselbe Key
4. Environments: **Production, Preview, Development** alle aktivieren
5. **Save**

### Schritt 3 — Code committen und pushen

Jo öffnet ein Terminal im Ordner `mealdeal-web` und führt aus:

```bash
git status            # Zeigt alle neuen Dateien
git add .
git commit -m "feat(phase1): product brain — AI enrichment via Gemini"
git push origin main  # oder welcher Branch auch immer
```

Damit laden die neuen Dateien (inkl. Workflow, Script, Migration) in GitHub.

### Schritt 4 — npm install (Lockfile aktualisieren)

Im selben Terminal:

```bash
npm install           # installiert @google/generative-ai und zod, aktualisiert package-lock.json
git add package-lock.json
git commit -m "chore: update lockfile for phase 1"
git push
```

### Schritt 5 — SQL-Migration ausführen

1. GitHub → **Actions** → **"DB-Migration ausführen"** → **Run workflow**
2. Wähle im Dropdown: `phase1-product-brain.sql`
3. **Run workflow** klicken
4. Warten bis Häkchen grün wird (ca. 30 Sekunden)
5. Bei Erfolg siehst du im Log: "✅ Phase 1 Migration abgeschlossen"

**Was passiert dabei:**
- Die alte, leere `products`-Tabelle wird zu `products_legacy_unused` umbenannt (Daten bleiben erhalten)
- Eine neue `products`-Tabelle mit dem Phase-1-Schema entsteht
- Eine neue `ai_usage_log`-Tabelle für Kosten-Tracking entsteht
- `offers.product_id` bekommt einen Foreign-Key auf die neue Tabelle

### Schritt 6 — DRY-RUN Test (wichtig!)

1. GitHub → **Actions** → **"AI Product Enrichment"** → **Run workflow**
2. Setze:
   - `batch_size`: **10**
   - `dry_run`: **true**
3. **Run workflow**
4. Logs anschauen — du solltest sehen:
   - `🧪 DRY — würde fingerprint "xxx" anlegen`
   - Für jede der 10 Offers einen Eintrag
   - Am Ende: "✅ Enrichment erfolgreich"

Falls es hier Fehler gibt (z.B. `GEMINI_API_KEY fehlt`, oder JSON-Parse-Fehler): **STOP**, Jo meldet sich.

### Schritt 7 — Echter 10er-Test

Wenn Schritt 6 gut aussah:

1. GitHub → **Actions** → **"AI Product Enrichment"** → **Run workflow**
2. Setze:
   - `batch_size`: **10**
   - `dry_run`: **false**
3. **Run workflow**
4. Nach Erfolg: in Supabase SQL Editor prüfen:

```sql
SELECT display_name, canonical_name, brand, amount, unit, category, is_food, enrichment_confidence
FROM products
ORDER BY created_at DESC
LIMIT 10;

SELECT COUNT(*), SUM(cost_eur), AVG(latency_ms)
FROM ai_usage_log
WHERE operation = 'enrich_product'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Erfolgskriterium:** 8 von 10 Produkten haben sinnvolle Menge + Kategorie, Kosten < 0,01 €.

### Schritt 8 — Bulk-Enrichment (alle aktiven Offers)

Wenn Schritt 7 gut aussah, läuft jetzt der eigentliche "Füll-Job":

1. GitHub → **Actions** → **"AI Product Enrichment"** → **Run workflow**
2. Setze:
   - `batch_size`: **500**
   - `dry_run`: **false**
3. **Run workflow**
4. Wartezeit: ~5 Minuten (500 Produkte bei 250ms Delay)
5. Sobald fertig: wiederhole mit `batch_size=500` bis der Job meldet "✨ Keine Offers warten auf Enrichment".

Bei 3087 aktiven Offers sind das ca. 6-7 Runs, jeweils ~5 Minuten.

### Schritt 9 — Prüfen ob alles gelaufen ist

In Supabase SQL Editor:

```sql
-- Anzahl Produkte im Gehirn
SELECT COUNT(*) AS produkte_total FROM products;

-- Ungelinkte aktive Offers
SELECT COUNT(*) AS offers_ohne_product
FROM offers
WHERE product_id IS NULL
  AND valid_until >= CURRENT_DATE;

-- Gesamte AI-Kosten
SELECT
  COUNT(*) AS calls,
  SUM(cost_eur) AS kosten_eur,
  AVG(latency_ms) AS ms_durchschnitt,
  COUNT(*) FILTER (WHERE success = false) AS fehler
FROM ai_usage_log
WHERE operation = 'enrich_product';

-- Confidence-Verteilung
SELECT
  CASE
    WHEN enrichment_confidence >= 0.9 THEN 'sehr hoch (0.9-1.0)'
    WHEN enrichment_confidence >= 0.7 THEN 'hoch (0.7-0.9)'
    WHEN enrichment_confidence >= 0.5 THEN 'mittel (0.5-0.7)'
    ELSE 'niedrig (<0.5)'
  END AS confidence,
  COUNT(*)
FROM products
GROUP BY 1
ORDER BY 1;
```

**Ziel:** offers_ohne_product = 0 oder sehr nahe 0.

---

## 🧯 Falls etwas schief geht

| Problem | Symptom | Lösung |
|---|---|---|
| Workflow meldet `GEMINI_API_KEY fehlt` | Schritt 6 bricht ab | Secret in GitHub nochmal prüfen (exakt `GEMINI_API_KEY`, nicht `GEMINI_KEY`) |
| `429 Too Many Requests` | Workflow-Log | Batch kleiner machen (z.B. 100) und `ENRICH_DELAY_MS` auf 1000 setzen (siehe Workflow-File) |
| Viele `ZodError` | Script-Log | Prompt ist zu streng oder Modell halluziniert — melden bei Claude |
| Migration-Fehler | `db-migrate.yml` rot | Logs lesen, oft ein Policy-Konflikt — melden bei Claude |
| Viele `is_food=false` obwohl es Essen ist | SQL-Query zeigt falsche Werte | Prompt nachschärfen — in `scripts/lib/ai/prompts/product-enrich.mjs` Beispiele hinzufügen |

---

## 📊 Was danach sichtbar wird

- Frontend zeigt korrekte `base_price` (€/kg, €/L) für alle aktiven Angebote
- Kategorien sind sauber (keine "Sahnespender in Milch & Eier" mehr)
- Die Basis für Phase 2 (Matching-Gehirn via Embeddings) ist gelegt
- Neue Scrapes werden automatisch enriched (Workflow triggert auf `weekly-scrape` + `on-demand-scrape`)

---

**Fragen?** Nächste Claude-Session starten mit: *"Ich will Phase 1 deployen — hier der aktuelle Stand"*.
