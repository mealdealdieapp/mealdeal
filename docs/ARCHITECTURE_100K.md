# MealDeal — Architektur für 100.000+ Nutzer

**Stand:** 2026-04-22
**Autor:** Claude (Architektur-Session mit Jo)
**Status:** Lebendes Dokument — Nord-Stern für alle Architektur-Entscheidungen

---

## 0. Wie dieses Dokument zu lesen ist

Dies ist **keine** To-Do-Liste. Das hier ist der **Referenzrahmen** für alle zukünftigen technischen Entscheidungen in MealDeal. Wer an MealDeal arbeitet (Jo, Claude, ein später hinzukommender Entwickler), liest das Dokument zuerst, um zu verstehen:

- **Warum** die Architektur so aussieht wie sie aussieht
- **Welche** Technologien gewählt wurden und warum
- **Was wir nicht bauen** (und warum nicht)
- **Wie** wir vom heutigen Stand zum Ziel-Stand kommen, ohne die App zu zerstören

Konkrete Arbeitspläne (z.B. "Baue Phase 1") liegen in separaten Dokumenten (`PHASE_1_PRODUCT_BRAIN.md` etc.).

---

## 1. Ziel und Erfolgskriterium

**MealDeal soll eine App werden, die für jeden Nutzer in Deutschland die passenden Rezepte zu den aktuellen Supermarkt-Angeboten findet — inklusive Haushaltsgröße, Diät, Geschmack und Budget.**

Ein System ist 100k-ready, wenn:

1. **100.000 registrierte Nutzer** gleichzeitig ohne Performance-Einbruch arbeiten können (Antwortzeiten <500ms bei normalen Queries).
2. **Kosten linear skalieren** — pro zusätzlichem Nutzer weniger als 0,01 €/Monat an Infrastruktur- und AI-Kosten.
3. **Datenqualität steigt mit Nutzung** — je mehr Scrapes und User-Interaktionen, desto besser Matching und Empfehlungen.
4. **Feature-Änderungen** in Tagen, nicht Wochen passieren. Neue Händler, neue Diäten, neue Sprachen sind additive Erweiterungen.

---

## 2. Leitprinzipien (nicht verhandelbar)

Diese neun Prinzipien sind die Leitplanken. Jede technische Entscheidung muss gegen sie geprüft werden.

### 2.1 Wissen akkumulieren, nicht neu berechnen

Jede LLM-Anfrage für ein Produkt passiert **genau einmal**. Das Ergebnis wird in `products` gespeichert. Alle folgenden Scrapes und Nutzer lesen aus der DB.

**Konsequenz:** Kosten sinken asymptotisch pro Nutzer.

### 2.2 Separation of Concerns durch "Gehirne"

Jedes funktionale Teilgebiet ist ein eigenes Sub-System mit klarer Verantwortung:

| Gehirn | Verantwortung |
|---|---|
| **Produkt-Gehirn** | Kennt jedes LEH-Produkt (Name, Menge, Kategorie, Marke, Bio, Flags) |
| **Preis-Gehirn** | Preishistorie, fairer Preis, Real-Deal-Detection |
| **Rezept-Gehirn** | Rezepte, Zutaten, Substitutionen, Portionen |
| **Matching-Gehirn** | Produkt↔Zutat, Rezept↔User-Präferenz via Embeddings |
| **Nutzer-Gehirn** | Profil, Verhalten, Geschmack, Budget |
| **Einkaufs-Gehirn** | Routenoptimierung, Aufwand-Nutzen-Balance |

Jedes Gehirn hat **eigene Tabellen**, **eigene Jobs**, **eigene APIs**. Kein Gehirn kennt die Interna eines anderen — nur seine öffentliche Schnittstelle.

### 2.3 Additive Evolution, keine Rewrites

Neue Funktionen kommen als zusätzliche Tabellen, Spalten, Jobs dazu. Bestehende Strukturen werden nur dann angepasst, wenn unvermeidlich — und immer rückwärtskompatibel (neue Spalten sind nullable, alte Spalten werden nicht gelöscht bis alle Leser migriert sind).

### 2.4 Alle externen Abhängigkeiten hinter Abstraktionen

- **LLM** → `src/lib/ai/llm.ts` mit `enrich()`, `classify()`, `extract()` — der Provider ist austauschbar per Env-Variable.
- **Embeddings** → `src/lib/ai/embeddings.ts` mit versionierten Modellen.
- **Scraping** → `scripts/scrapers/{provider}.mjs` — pro Datenquelle eine klar getrennte Implementierung.

**Konsequenz:** Anbieter-Wechsel dauert Stunden, nicht Wochen.

### 2.5 Konfiguration über Umgebungsvariablen

Modelle, API-Keys, Feature-Flags, Schwellenwerte — alles via Environment Variables in Vercel/GitHub Secrets. Kein hardcoded "gemini-1.5-flash" im Code.

### 2.6 Observability von Tag 1

- **Errors:** Sentry (Free-Tier ausreichend bis ~5k User)
- **User-Analytics:** PostHog (Free-Tier bis 1 Mio Events/Monat)
- **AI-Kosten:** eigene `ai_usage_log` Tabelle
- **Scrape-Qualität:** `scrape_runs` + Telegram-Alerts (bereits vorhanden)

**Ohne Observability keine Architektur-Entscheidung.** Wir messen, dann entscheiden.

### 2.7 Row-Level-Security überall

Jede Tabelle mit User-Bezug hat RLS-Policies. Das Frontend kann sich irren, die Datenbank nicht. Geheime Daten (`ai_usage_log`, `app_config`) sind Service-Role-only.

### 2.8 Idempotente Jobs

Jeder Background-Job (Scrape, Enrichment, Embedding-Generierung) kann **beliebig oft** laufen, ohne Daten zu zerstören oder Duplikate zu erzeugen. Fingerprints, UPSERTs, Deduplication.

### 2.9 Deploy-fähig in jedem Commit

Die App ist zu jedem Zeitpunkt live und nutzbar. Migrations sind rückwärts- und vorwärtskompatibel. Feature-Flags trennen "fertig gebaut" von "an Nutzer ausgerollt".

---

## 3. Tech-Stack (Final-Entscheidungen)

Getroffene Entscheidungen — nicht mehr diskutiert, außer bei konkretem Bedarf:

| Schicht | Wahl | Begründung |
|---|---|---|
| **Frontend** | Next.js 15 (bereits im Einsatz) | Server-Components, gute Vercel-Integration, SEO-fähig |
| **Hosting Frontend** | Vercel | Edge-Funktionen, Auto-Scaling, Git-basiert |
| **Backend + DB** | Supabase (Postgres + Auth + Storage + pgvector) | Eine Plattform für alles, RLS, skaliert bis Mio User |
| **LLM primär** | Google Gemini Flash 2.0 | Bestes Preis/Leistung, 1.500 Calls/Tag gratis |
| **LLM fallback** | Anthropic Claude Haiku 4.5 | Hohe Präzision für schwierige Fälle |
| **Embeddings** | OpenAI `text-embedding-3-small` (1536-dim) | Stabil, günstig (0,02 €/Mio Tokens), gute deutsche Performance |
| **Vector-Index** | pgvector mit HNSW | Sub-100ms-Suche bis 1M+ Vektoren, keine extra Infrastruktur |
| **Job-Queue Start** | GitHub Actions (bleibt) | Bereits integriert, kostenlos bis ~10k User |
| **Job-Queue später** | Inngest oder Trigger.dev | Ab ~10k User für Retries, Scheduling, Observability |
| **Cache** | Supabase DB + Next.js `unstable_cache` | Kein Redis nötig bis ~20k User |
| **Errors** | Sentry | Free-Tier + deutsche Dokumentation |
| **Analytics** | PostHog | Self-Hosted möglich, DSGVO-freundlich |
| **Monorepo-Struktur** | Single-Repo `mealdeal-web` | Kein Monorepo-Overhead, kein pnpm-Workspace |
| **TypeScript** | Ja, strict mode | Bereits konfiguriert |
| **Tests** | Vitest + Playwright (später) | Jest zu langsam, Playwright für E2E |
| **CI/CD** | GitHub Actions + Vercel-Auto-Deploy | Bereits vorhanden |

### Abgelehnte Alternativen (mit Grund)

- **Pinecone / Weaviate (Vector-DB)** → pgvector reicht bis 1M Vektoren, keine zweite Infrastruktur
- **Redis** → Supabase-Cache + Next.js-Cache reichen bis ~20k User
- **Sentence-Transformers (self-hosted Embeddings)** → Compute-Kosten und Wartungsaufwand höher als OpenAI bis ~500k Produkte
- **tRPC** → Server-Actions + Supabase-RLS reichen, weniger Boilerplate
- **Prisma** → Supabase-Client ist native, kein zweiter ORM-Layer

---

## 4. Datenmodell

Das Datenmodell ist das **Herzstück**. Schema-Fehler heute sind technische Schuld in zwei Jahren. Hier sind die Kern-Tabellen.

### 4.1 Bestehende Tabellen (bleiben erhalten, minimal erweitert)

#### `offers` (ephemer, ~wöchentlich erneuert)

Bleibt strukturell erhalten. **Eine neue Spalte:**

```sql
ALTER TABLE offers
  ADD COLUMN product_id UUID REFERENCES products(id);

CREATE INDEX idx_offers_product_id ON offers(product_id);
```

Damit verweist jedes aktuelle Angebot auf einen **stabilen Produkt-Eintrag**. Alle bisherigen Offers bleiben mit `product_id = NULL`, bis sie durch Enrichment zugeordnet werden.

#### `user_profiles`, `recipes`, `price_history`, `app_config`, `scrape_runs`

Bleiben unverändert. Spätere Phasen erweitern sie um Spalten, niemals umbenennen oder löschen.

### 4.2 Neue Tabelle: `products` (Produkt-Gehirn, Langzeit-Wissen)

Das Gedächtnis über Supermarkt-Produkte. Wächst monoton, wird nie gelöscht.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifikation
  canonical_name TEXT NOT NULL,          -- "Bio Heumilch 1L" (normalisiert)
  display_name TEXT NOT NULL,            -- "Edeka Bio Heumilch 3,5% 1L" (menschlich)
  brand TEXT,                            -- "Edeka"
  fingerprint TEXT UNIQUE NOT NULL,      -- Hash für Dedup: "edeka|biohumilch|1000ml"

  -- Menge & Grundpreis
  amount NUMERIC,                        -- z.B. 1000
  unit TEXT,                             -- 'ml', 'g', 'stk'
  base_unit TEXT,                        -- 'l', 'kg', 'stk' (normalisiert)

  -- Kategorisierung
  category TEXT,                         -- 'Milch & Eier'
  subcategory TEXT,                      -- 'Vollmilch'
  is_food BOOLEAN DEFAULT TRUE,
  is_bio BOOLEAN DEFAULT FALSE,
  is_regional BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT TRUE,

  -- Metadaten
  enrichment_version INTEGER DEFAULT 1,  -- Prompt-Version beim Enrichment
  enrichment_model TEXT,                 -- 'gemini-1.5-flash' etc.
  enrichment_confidence NUMERIC,         -- 0.0-1.0, AI-Selbsteinschätzung
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Freitext-Reserve für spätere Gehirne
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_products_canonical_name ON products USING gin(to_tsvector('german', canonical_name));
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_fingerprint ON products(fingerprint);

-- RLS: alle User dürfen lesen (Produktdaten sind nicht sensibel)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read_all" ON products FOR SELECT USING (true);
-- Schreiben nur via Service-Role (Enrichment-Jobs)
```

### 4.3 Neue Tabelle: `product_embeddings` (Matching-Gehirn)

Ein Embedding pro Produkt, pro Embedding-Modell. Version-gebunden, damit wir später Modelle wechseln können ohne Datenverlust.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  model TEXT NOT NULL,                   -- 'openai-text-embedding-3-small'
  dimensions INTEGER NOT NULL,           -- 1536
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, model)
);

-- HNSW-Index für schnelle Similarity-Search
CREATE INDEX idx_product_embeddings_hnsw
  ON product_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_product_embeddings_product ON product_embeddings(product_id);
```

### 4.4 Neue Tabelle: `ingredient_embeddings` (Matching-Gehirn)

Embeddings für die Rezept-Zutaten. Gleiches Prinzip wie oben.

```sql
CREATE TABLE ingredient_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ingredient_name, model)
);

CREATE INDEX idx_ingredient_embeddings_hnsw
  ON ingredient_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

### 4.5 Neue Tabelle: `product_ingredient_matches` (Matching-Gehirn)

Die **berechnete** Produkt↔Zutat-Zuordnung. Wird einmal pro Nacht neu berechnet.

```sql
CREATE TABLE product_ingredient_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  similarity_score NUMERIC NOT NULL,     -- 0.0-1.0 Cosine-Similarity
  is_primary_match BOOLEAN DEFAULT FALSE,-- Beste Zuordnung für diese Zutat
  method TEXT DEFAULT 'embedding',       -- 'embedding' | 'llm_verified' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, ingredient_name)
);

CREATE INDEX idx_pim_ingredient ON product_ingredient_matches(ingredient_name, similarity_score DESC);
CREATE INDEX idx_pim_product ON product_ingredient_matches(product_id);
```

### 4.6 Neue Tabelle: `ai_usage_log` (Observability)

Jeder AI-Call wird geloggt. Kosten pro Tag/Woche/Monat sofort sichtbar.

```sql
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,                -- 'gemini' | 'anthropic' | 'openai'
  model TEXT NOT NULL,
  operation TEXT NOT NULL,               -- 'enrich_product' | 'embed_ingredient' | ...
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_eur NUMERIC,                      -- pro Call berechnet
  latency_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  reference_id UUID,                     -- z.B. product_id wenn anwendbar
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_created ON ai_usage_log(created_at DESC);
CREATE INDEX idx_ai_usage_operation ON ai_usage_log(operation, created_at DESC);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
-- Nur Service-Role darf lesen, nie ans Frontend
```

### 4.7 Geplant, aber nicht jetzt: weitere Gehirn-Tabellen

- **`price_statistics`** (Preis-Gehirn) — aggregierte Medianpreise pro Produkt
- **`user_preferences_vector`** (Nutzer-Gehirn) — Embedding des User-Geschmacksprofils
- **`shopping_routes`** (Einkaufs-Gehirn) — Cache optimierter Einkaufsrouten

Diese kommen in späteren Phasen. Schema-Entwürfe dafür werden in den jeweiligen Phase-Dokumenten beschrieben.

---

## 5. AI-Layer (die konkrete Umsetzung)

### 5.1 Struktur der Code-Basis

```
src/lib/ai/
├── llm.ts               # Abstraction: enrich(), classify(), extract()
├── embeddings.ts        # Abstraction: embed(), similarity()
├── providers/
│   ├── gemini.ts
│   ├── anthropic.ts
│   └── openai.ts
├── prompts/
│   ├── product-enrich.ts
│   ├── non-food-classify.ts
│   └── substitution-check.ts
├── cost-logger.ts       # schreibt ai_usage_log
└── types.ts
```

### 5.2 Das `llm.enrich()` Interface

```typescript
// src/lib/ai/llm.ts
export interface ProductEnrichment {
  canonicalName: string;
  displayName: string;
  brand: string | null;
  amount: number | null;
  unit: string | null;
  category: string;
  subcategory: string | null;
  isFood: boolean;
  isBio: boolean;
  isRegional: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  confidence: number; // 0-1
}

export async function enrichProduct(
  rawOffer: RawMarktguruOffer,
  options?: { model?: string }
): Promise<ProductEnrichment> {
  // 1. Provider via Env wählen (default: gemini)
  // 2. Prompt aus prompts/product-enrich.ts holen
  // 3. Call ausführen
  // 4. Response validieren (Zod-Schema)
  // 5. Kosten loggen
  // 6. Ergebnis zurückgeben
}
```

Callers (Scraper, Enrichment-Job) kennen nur `enrichProduct()`. Ob dahinter Gemini oder Claude steht, ist irrelevant.

### 5.3 Das `embed()` Interface

```typescript
// src/lib/ai/embeddings.ts
export async function embed(
  text: string,
  model: string = 'openai-text-embedding-3-small'
): Promise<{ vector: number[]; dimensions: number }> {
  // Gleiches Pattern wie LLM: Provider-agnostisch, Kosten-Logging
}

export async function batchEmbed(
  texts: string[],
  model?: string
): Promise<{ vector: number[]; dimensions: number }[]> {
  // Effizienter Batch-Call (bis zu 100 Texte auf einmal)
}
```

### 5.4 Kosten-Tracking

Jeder Provider-Aufruf geht durch `cost-logger.ts`:

```typescript
await logAiUsage({
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  operation: 'enrich_product',
  inputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  costEur: calculateCost('gemini-1.5-flash', usage),
  latencyMs: Date.now() - start,
  success: true,
  referenceId: productId,
});
```

**Dashboard-Query für Jo:**

```sql
SELECT
  DATE(created_at) AS day,
  provider,
  operation,
  COUNT(*) AS calls,
  SUM(cost_eur) AS total_cost
FROM ai_usage_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;
```

---

## 6. Strangler-Fig-Migrationsplan

Die bestehende App läuft **durchgängig**. Neue Schichten wachsen parallel dazu. Erst wenn sie stabil sind, migrieren wir Leser.

### Phase 1 — Produkt-Gehirn (Woche 1)

1. Migration: `products`, `ai_usage_log` anlegen
2. `src/lib/ai/` Grundgerüst mit Gemini-Provider
3. Enrichment-Job: `scripts/enrich-products.mjs`
4. GitHub Workflow: `ai-enrichment.yml` (läuft nach jedem `weekly-scrape`)
5. Scraper erweitern: `offers.product_id` bei Insert setzen (via Fingerprint-Lookup)
6. Einmaliger Bulk-Run: alle 3087 aktiven Offers enrichen → ~0,50 € einmalige AI-Kosten

**App-Änderung:** Keine sichtbare. Frontend liest weiter aus `offers`.

### Phase 2 — Matching-Gehirn (Woche 2)

1. Migration: `product_embeddings`, `ingredient_embeddings`, `product_ingredient_matches`
2. `src/lib/ai/embeddings.ts` mit OpenAI-Provider
3. Embedding-Job: alle Produkte und alle Rezept-Zutaten embedden
4. Nightly-Job: `product_ingredient_matches` neu berechnen
5. Neue API-Route: `GET /api/recipes/:id/offers` → liefert aktive Angebote basierend auf Matching

**App-Änderung:** Rezept-Detail-Seite nutzt neue API. Matching-Qualität sichtbar besser.

### Phase 3 — Preis-Gehirn (Woche 3)

1. `price_statistics` Tabelle
2. Nightly-Job: Medianpreise aus `price_history` aggregieren
3. Real-Deal-Flag in Frontend: "X% unter 90-Tage-Median"

### Phase 4 — Observability & Härtung (Woche 4)

1. Sentry + PostHog einbinden
2. Rate-Limiting (Supabase-seitig)
3. Load-Test mit k6 (1k Concurrent Users simulieren)
4. Index-Optimierung basierend auf echten Queries

### Phase 5 — Alpha & Feedback (Woche 5+)

1. Familie + erste 10 User einladen
2. Bug-Fixing, Prompt-Tuning
3. Dokumentation für externe Nutzer

### Phase 6+ — Nutzer-Gehirn & Monetarisierung (Monat 2-3)

1. `user_preferences_vector`
2. Personalisierte Rezept-Empfehlungen
3. Premium-Tier (z.B. Einkaufslisten-Export, Haushaltsplanung, erweiterte Preishistorie)
4. Zahlungsintegration (Stripe)

---

## 7. Kosten-Trajektorie

Realistische Schätzungen, aktualisiert basierend auf Architektur-Entscheidungen.

| Nutzer-Zahl | Infrastruktur | AI-Kosten | Total/Monat | Realistischer Umsatz (1% Premium á 5 €) |
|---|---|---|---|---|
| 0-100 (Start) | Free Tiers | 0-2 € | **~2 €** | 0-5 € |
| 1.000 | Supabase Pro (25 $) | 3-5 € | **~28 €** | ~50 € |
| 10.000 | + Vercel Pro (20 $) + Inngest Free | ~15 € | **~60 €** | ~500 € |
| 50.000 | + Sentry Pro + Redis | ~40 € | **~200 €** | ~2.500 € |
| **100.000** | + Supabase Team | ~80 € | **~500 €** | **~5.000 €** |

**Break-even-Punkt:** ab ca. 500 aktiven Premium-Nutzern (ca. 1% bei 50.000 MAU).

---

## 8. Was wir explizit NICHT bauen

Um Scope-Creep zu vermeiden, ist diese Liste wichtig:

| Nicht gebaut | Warum nicht | Was stattdessen? |
|---|---|---|
| Eigener Vector-DB-Server (Weaviate, Qdrant) | pgvector reicht bis 1M Vektoren | Supabase |
| Eigenes Authentifizierungs-System | Supabase Auth ist battle-tested | Supabase Auth |
| Mobile Native Apps (iOS/Android) | PWA reicht für Start | Next.js PWA-Modus |
| Eigenes CMS für Rezepte | Direkt in Supabase-Tabelle editieren | Admin-UI in Next.js |
| Echtzeit-Chat oder Notifications | Kein Kern-Feature | Optional später via Pusher |
| Multi-Language ab Start | Deutsch reicht für Deutschland | i18n-Fundament legen, später aktivieren |
| Eigene Scraper-Infrastruktur (Puppeteer-Farm) | Marktguru-API reicht aktuell | Fallback-Scraper erst bei Bedarf |
| Komplexe Rezept-Substitutions-Engine | LLM-Call reicht | Claude Haiku für Einzelfälle |

---

## 9. Offene Entscheidungen

Punkte, die wir noch nicht abschließend entschieden haben — absichtlich, weil sie in späteren Phasen konkreter werden:

1. **Ab wann echte Payment-Integration?** Vermutlich ab 1k User, Stripe ist gesetzt.
2. **Wie häufig sollen Embeddings neu berechnet werden?** Einmal pro Monat oder nur bei Produkt-Änderung?
3. **Substitutions-Regeln:** pre-computed Tabelle oder on-demand LLM-Call?
4. **Rezept-Import:** Bleibt manuell oder kommt LLM-Generator der aus Angeboten Rezepte vorschlägt?
5. **Regionale Sortimente:** Berücksichtigen wir regionale Eigenmarken (z.B. norddeutscher Milchhof)?

Diese Fragen werden in den jeweiligen Phase-Dokumenten beantwortet.

---

## 10. Nächste Schritte

1. **Du liest dieses Dokument** und gibst Feedback (oder greenlightest es).
2. **Ich schreibe `PHASE_1_PRODUCT_BRAIN.md`** — den konkreten Umsetzungsplan für das Produkt-Gehirn.
3. **Wir starten mit der Migration** — products-Tabelle + AI-Layer-Grundgerüst.
4. **Nach Phase 1** hat MealDeal strukturierte Produktdaten und zeigt erstmals €/kg korrekt an.

---

**Ende des Dokuments.**

Bei Fragen oder Unklarheiten: Frag Claude in einer neuen Session mit dem Hinweis "Lies `docs/ARCHITECTURE_100K.md` bevor du antwortest".
