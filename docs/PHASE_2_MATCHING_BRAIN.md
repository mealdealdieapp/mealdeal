# Phase 2 — Matching-Gehirn (Umsetzungsplan)

**Stand:** 2026-04-25
**Dauer:** ~3-5 Arbeitstage (mit AI-Unterstützung)
**Voraussetzung gelesen:** `docs/ARCHITECTURE_100K.md` (Sektion 4.3-4.5, 7.2)
**Voraussetzung erledigt:** Phase 1 ist deployed, `products`-Tabelle ist befüllt

---

## 0. Ziel von Phase 2

Nach dieser Phase findet MealDeal **automatisch** das passende Angebot für jede Rezept-Zutat — auch wenn die Worte nicht identisch sind. "Hähnchenbrustfilet" matched auf "Bio-Hühnerbrust", "Tomatenmark" auf "Tomatenpaste".

**Sichtbar für Nutzer nach Phase 2:**
- Rezept-Detail-Seite zeigt verlässlich, welche Zutaten gerade im Angebot sind
- Wochenplan empfiehlt Rezepte basierend auf wirklich verfügbaren Angeboten
- Einkaufsliste rechnet Savings korrekt zusammen

**Was sich technisch ändert:**
- Schluss mit Keyword-Matching → semantische Ähnlichkeit via Embeddings
- Cosine-Similarity-Suche < 50 ms auch bei 100k+ Produkten (HNSW-Index)
- Neuer Matching-Score (0.0-1.0) statt Boolean

---

## 1. Was sich ändert und was nicht

### Ändert sich
- Neue Tabellen: `product_embeddings`, `ingredient_embeddings`, `product_ingredient_matches`
- Neuer Provider: `scripts/lib/ai/providers/openai.mjs` (für Embeddings)
- Neue Scripts:
  - `scripts/embed-products.mjs` — Embedding für jedes Produkt ohne Embedding
  - `scripts/embed-ingredients.mjs` — Embedding für jede Zutat ohne Embedding
  - `scripts/compute-product-ingredient-matches.mjs` — berechnet Top-K-Matches via Cosine-Similarity
- Neue Workflows:
  - `embed-products.yml` — triggert auf `ai-enrichment` Erfolg
  - `embed-ingredients.yml` — triggert auf `weekly-recipe-generator` Erfolg
  - `nightly-matching.yml` — täglich, berechnet alle Matches neu
- Frontend-Update: Rezept-Detail nutzt neuen Match-Lookup

### Bleibt unangetastet
- Phase 1 (`products`-Tabelle, AI-Enrichment, Gemini-Provider)
- Auth, Onboarding, Rezept-Verwaltung
- Bestehendes `offer_ingredient_matches` (Keyword-basiert) bleibt parallel als Fallback bis Phase 2 abgesegnet ist
- Alle bestehenden Workflows

---

## 2. Artefakte die entstehen

### 2.1 SQL-Migration

Datei: `scripts/phase2-matching-brain.sql`

```sql
-- ============================================================================
-- Phase 2 — Matching-Gehirn
-- ============================================================================

-- 0. pgvector-Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Embedding-Tabelle für Produkte
CREATE TABLE IF NOT EXISTS public.product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, model)
);

CREATE INDEX IF NOT EXISTS idx_product_embeddings_hnsw
  ON product_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_product_embeddings_product
  ON product_embeddings(product_id);

-- 2. Embedding-Tabelle für Zutaten
CREATE TABLE IF NOT EXISTS public.ingredient_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ingredient_name, model)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_embeddings_hnsw
  ON ingredient_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- 3. Berechnete Matches (Produkt ↔ Zutat)
CREATE TABLE IF NOT EXISTS public.product_ingredient_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  similarity_score NUMERIC NOT NULL,
  is_primary_match BOOLEAN DEFAULT FALSE,
  method TEXT DEFAULT 'embedding',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, ingredient_name)
);

CREATE INDEX IF NOT EXISTS idx_pim_ingredient ON product_ingredient_matches(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pim_product ON product_ingredient_matches(product_id);
CREATE INDEX IF NOT EXISTS idx_pim_primary ON product_ingredient_matches(ingredient_name) WHERE is_primary_match = TRUE;

-- 4. RPC-Funktion: Finde aktuelle Angebote für eine Zutat
CREATE OR REPLACE FUNCTION public.find_offers_for_ingredient(
  p_ingredient_name TEXT,
  p_min_score NUMERIC DEFAULT 0.7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  offer_id UUID,
  product_id UUID,
  product_name TEXT,
  similarity_score NUMERIC,
  offer_price NUMERIC,
  store TEXT,
  valid_until DATE
)
LANGUAGE SQL STABLE AS $$
  SELECT
    o.id AS offer_id,
    p.id AS product_id,
    p.display_name AS product_name,
    pim.similarity_score,
    o.offer_price,
    o.store,
    o.valid_until
  FROM product_ingredient_matches pim
  JOIN products p ON p.id = pim.product_id
  JOIN offers o ON o.product_id = p.id
  WHERE pim.ingredient_name = p_ingredient_name
    AND pim.similarity_score >= p_min_score
    AND o.valid_until >= CURRENT_DATE
  ORDER BY pim.similarity_score DESC, o.offer_price ASC
  LIMIT p_limit;
$$;
```

**Wichtig:** Migration in `scripts/phase2-matching-brain.sql` legen, danach in `db-migrate.yml` Dropdown ergänzen.

---

### 2.2 OpenAI-Provider

Datei: `scripts/lib/ai/providers/openai.mjs`

**Verantwortlich für:**
- Embeddings via `text-embedding-3-small` (1536 dims, $0.02/M Tokens)
- Cost-Logging in `ai_usage_log` (genau wie Gemini-Provider)
- Retry bei 429/503

**Public API:**
```js
export async function generateEmbedding(text, options = {}) {
  // Returns: { embedding: number[], model: string, tokenCount: number }
}
```

---

### 2.3 Embedding-Scripts

**`scripts/embed-products.mjs`:**

1. Lade alle Produkte ohne Embedding (LEFT JOIN auf product_embeddings)
2. Pro Produkt: Embedding-Text bauen aus `display_name + brand + canonical_name + category` (kein freier Text, deterministisch)
3. Embedding generieren
4. INSERT in `product_embeddings`
5. Batch-Größe: 100 (OpenAI erlaubt Batch-Embedding bis 2048)
6. Cost-Log und Retry-Logik analog Gemini-Provider

**`scripts/embed-ingredients.mjs`:**

1. Lade alle einzigartigen Zutaten-Namen ohne Embedding
2. Pro Zutat: Embedding aus `name + category` bauen
3. INSERT in `ingredient_embeddings`

**Beide Scripts** sind idempotent — können beliebig oft laufen.

---

### 2.4 Match-Computation-Script

`scripts/compute-product-ingredient-matches.mjs`:

1. Für jede Zutat (mit Embedding):
   - SELECT die Top-20 Produkte nach Cosine-Similarity (`<=>`-Operator)
   - Filter: `similarity_score >= 0.6`
   - UPSERT in `product_ingredient_matches`
   - Markiere höchsten Match als `is_primary_match = TRUE` (alle anderen FALSE)
2. Performance-Ziel: < 5 Sekunden für 1000 Zutaten × 5000 Produkte (HNSW-Index sei Dank)

**Idempotent:** UPSERT mit ON CONFLICT, kein State-Management nötig.

---

### 2.5 GitHub Workflows

**`embed-products.yml`** — triggert wenn `ai-enrichment` erfolgreich gelaufen ist. Workflow_dispatch auch manuell.

**`embed-ingredients.yml`** — triggert wenn `weekly-recipe-generator` erfolgreich war (neue Rezepte → neue Zutaten). Workflow_dispatch manuell.

**`nightly-matching.yml`** — täglich um 04:00 UTC (nach den anderen). Recomputed alle Matches.

Alle drei mit Telegram-Notifications, gleiche Struktur wie `ai-enrichment.yml`.

---

### 2.6 Frontend-Integration

**Neue Hook:** `src/hooks/useMatchedOffers.ts`

```ts
export function useMatchedOffers(ingredientName: string) {
  return useQuery({
    queryKey: ['matched-offers', ingredientName],
    queryFn: () => supabase.rpc('find_offers_for_ingredient', {
      p_ingredient_name: ingredientName,
      p_min_score: 0.7,
      p_limit: 10
    })
  })
}
```

**Update:** Rezept-Detail-Seite (`src/pages/Recipe.tsx` o.ä.) ruft die neue Hook für jede Zutat statt der alten Keyword-Logik.

**Feature-Flag:** Mit `FEATURE_EMBEDDING_MATCH` env-flag controllen, sodass alte und neue Logik koexistieren können bis QA durch.

---

## 3. Reihenfolge der Umsetzung (3-5 Tage)

### Tag 1 — Foundation
1. OpenAI-Account & API-Key holen, Billing aktivieren (~5 € Limit setzen)
2. `OPENAI_API_KEY` in GitHub Secrets + Vercel Env hinterlegen
3. SQL-Migration `phase2-matching-brain.sql` schreiben + via `db-migrate.yml` deployen
4. `db-migrate.yml` Dropdown um die neue Migration erweitern

### Tag 2 — AI-Layer
5. `scripts/lib/ai/providers/openai.mjs` schreiben (Embedding-Funktion + Cost-Log + Retry)
6. `scripts/lib/ai/embeddings.mjs` als Abstraction-Layer (Provider-Switch via Env)

### Tag 3 — Embedding-Scripts
7. `scripts/embed-products.mjs` schreiben, lokal mit DRY-Run testen
8. `scripts/embed-ingredients.mjs` schreiben, lokal mit DRY-Run testen
9. Workflows `embed-products.yml` und `embed-ingredients.yml` schreiben
10. Bulk-Lauf: alle existierenden Produkte & Zutaten embedden (geschätzte Kosten: < 0,10 €)

### Tag 4 — Matching
11. `scripts/compute-product-ingredient-matches.mjs` schreiben
12. RPC-Funktion `find_offers_for_ingredient` testen mit echten Daten
13. Workflow `nightly-matching.yml` schreiben
14. Erste Match-Computation manuell triggern, Ergebnisse stichprobenartig prüfen

### Tag 5 — Frontend & Rollout
15. `useMatchedOffers`-Hook schreiben
16. Rezept-Detail-Seite umbauen (mit Feature-Flag)
17. QA: 5-10 Rezepte manuell durchgehen, Matches plausibilisieren
18. Feature-Flag aktivieren in Production

---

## 4. Kosten-Erwartung

- **Embeddings (einmalig):** ~3000 Produkte × 30 Tokens × $0.02/M = ~0,02 € · ~500 Zutaten × 20 Tokens × $0.02/M = ~0,001 € → **gesamt < 5 Cent**
- **Embeddings (laufend):** ~50 neue Produkte/Woche × 30 Tokens = ~ 0 € pro Woche
- **Match-Computation:** läuft komplett in Postgres, **0 € externe Kosten**
- **Frontend-Lookups:** Postgres-Queries, **0 €**

Phase 2 ist praktisch kostenlos im Betrieb.

---

## 5. Risiken & Mitigationen

| Risiko | Mitigation |
|---|---|
| OpenAI-Rate-Limits | Batch-Embedding nutzen (bis 2048 Texts pro Call), Retry mit Backoff |
| HNSW-Index-Build dauert lang | Bei <100k Produkten unkritisch; bei mehr: `lists`-Parameter tunen |
| Schlechte Match-Qualität bei deutschen Begriffen | text-embedding-3-small ist multilingual gut; Fallback: Cohere oder Embeddings auf {ingredient + recipe-context} |
| Marktguru-API ändert Daten ab 18.5. | Kein Konflikt: Embeddings werden auf den NEUEN Produkten neu berechnet, alte werden invalidiert |

---

## 6. Was wird sichtbar nach Phase 2

**Konkret in der App:**
- Rezept-Detail: "Diese Zutaten sind bei Lidl/REWE im Angebot" (basierend auf Embedding-Matches)
- Wochenplan: priorisiert Rezepte mit hoher Angebots-Coverage
- Einkaufsliste: zeigt korrekte Savings auch wenn Produktname und Zutat nicht identisch sind

**Konkret in der Datenbank:**
- Jedes Produkt hat ≥1 Embedding-Eintrag
- Jede Zutat hat ≥1 Embedding-Eintrag
- `product_ingredient_matches` enthält Top-Matches pro Zutat mit Confidence-Score

---

## 7. Was kommt danach

Phase 3 (Preis-Gehirn) — Real-Deal-Detection: "Dieser Espresso ist 30% unter 90-Tage-Median". Setzt auf `price_history` und Phase 1+2 auf.

Phase 4 — Observability: Sentry, PostHog, Load-Tests.

**Marktguru-API-Migration (~18.5.):** Wird zu Phase 2.5 dazugeschoben — Datenquelle wechseln, Pipeline bleibt identisch.

---

**Fragen?** Nächste Claude-Session starten mit: *"Lass uns Phase 2 Tag 1 umsetzen"*.
