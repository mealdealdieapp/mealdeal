# Phase 1 — Produkt-Gehirn (Umsetzungsplan)

**Stand:** 2026-04-22
**Dauer:** ~5 Arbeitstage
**Voraussetzung gelesen:** `docs/ARCHITECTURE_100K.md`

---

## 0. Ziel von Phase 1

Nach dieser Phase hat MealDeal eine dauerhafte Produkt-Wissensbasis. Konkret:

- **Jedes Angebot ist mit einem `product_id` verknüpft**, das auf einen dauerhaften Eintrag in `products` zeigt.
- **Produkte haben strukturierte Daten:** Menge, Einheit, Kategorie, Marke, Flags (Bio, vegan, …).
- **Gelesene Daten werden nie neu berechnet** — ein Produkt, das schon bekannt ist, kostet keinen AI-Call mehr.
- **Kosten pro Scrape sinken über Zeit** — initial ~0,50 € einmalig, danach nur noch für neue Produkte.

**Sichtbar für Nutzer nach Phase 1:**
- Frontend zeigt `€/kg` und `€/L` korrekt an (aktuell 100% NULL).
- Kategorien sind sauber (kein "Sahnespender in Milch & Eier" mehr).
- Real-Deal-Detection wird endlich möglich (Phase 3 baut darauf auf).

---

## 1. Was sich ändert und was nicht

### Ändert sich
- Neue Tabellen: `products`, `ai_usage_log`
- Neue Spalte: `offers.product_id`
- Neues Verzeichnis: `src/lib/ai/`
- Neuer GitHub Workflow: `ai-enrichment.yml`
- Neues Script: `scripts/enrich-products.mjs`
- `scripts/weekly-scrape.mjs` bekommt einen zusätzlichen Lookup-Schritt

### Bleibt unangetastet
- Frontend-Code (`src/app/*`, `src/components/*`)
- Auth, User-Onboarding
- Rezept-Verwaltung
- Bestehende Workflows (`weekly-scrape.yml`, `on-demand-scrape.yml`)
- Alle bestehenden Tabellen (außer der einen neuen Spalte auf `offers`)

---

## 2. Artefakte die entstehen

### 2.1 SQL-Migration

Datei: `supabase/migrations/20260422000000_phase1_product_brain.sql`

```sql
-- ============================================================================
-- Phase 1 — Produkt-Gehirn
-- ============================================================================

-- 1. Produkt-Tabelle (Langzeit-Wissen)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  brand TEXT,
  fingerprint TEXT UNIQUE NOT NULL,

  amount NUMERIC,
  unit TEXT,
  base_unit TEXT,

  category TEXT,
  subcategory TEXT,
  is_food BOOLEAN DEFAULT TRUE,
  is_bio BOOLEAN DEFAULT FALSE,
  is_regional BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT TRUE,

  enrichment_version INTEGER DEFAULT 1,
  enrichment_model TEXT,
  enrichment_confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_products_fingerprint ON public.products(fingerprint);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_canonical_name
  ON public.products USING gin(to_tsvector('german', canonical_name));

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_read_all" ON public.products;
CREATE POLICY "products_read_all" ON public.products FOR SELECT USING (true);
-- Schreiben nur via Service-Role (keine Policy = kein Zugriff für anon/authenticated)

-- 2. AI Usage Log (Observability)
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_eur NUMERIC,
  latency_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON public.ai_usage_log(operation, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
-- Keine Policies = nur Service-Role darf lesen

-- 3. offers.product_id als FK
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);

CREATE INDEX IF NOT EXISTS idx_offers_product_id ON public.offers(product_id);

-- 4. Updated-At Trigger für products
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();
```

### 2.2 Fingerprint-Generierung

Datei: `src/lib/products/fingerprint.ts`

Der Fingerprint ist der **Schlüssel zum Caching-Effekt**. Zwei Offers mit dem gleichen Fingerprint zeigen auf dasselbe Produkt.

```typescript
// src/lib/products/fingerprint.ts
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m] || m))
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
}

export function productFingerprint(
  brand: string | null,
  canonicalName: string,
  amount: number | null,
  unit: string | null
): string {
  const brandPart = brand ? normalizeText(brand) : 'nobrand';
  const namePart = normalizeText(canonicalName);
  const quantityPart = amount && unit ? `${amount}${unit}` : 'noqty';
  return `${brandPart}|${namePart}|${quantityPart}`;
}
```

### 2.3 AI-Layer-Grundgerüst

Datei-Struktur:

```
src/lib/ai/
├── index.ts                        # Public API (re-exports)
├── types.ts                        # Zod-Schemas, TypeScript-Types
├── llm.ts                          # enrichProduct()
├── cost-logger.ts                  # logAiUsage()
├── providers/
│   └── gemini.ts                   # Gemini-Adapter
└── prompts/
    └── product-enrich.ts           # Prompt-Template
```

#### `src/lib/ai/types.ts`

```typescript
import { z } from 'zod';

export const ProductEnrichmentSchema = z.object({
  canonicalName: z.string().min(1),
  displayName: z.string().min(1),
  brand: z.string().nullable(),
  amount: z.number().nullable(),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'stk', 'pack']).nullable(),
  category: z.string().min(1),
  subcategory: z.string().nullable(),
  isFood: z.boolean(),
  isBio: z.boolean(),
  isRegional: z.boolean(),
  isVegan: z.boolean(),
  isVegetarian: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export type ProductEnrichment = z.infer<typeof ProductEnrichmentSchema>;

export interface RawOfferInput {
  productName: string;
  description?: string;
  category?: string;
  store?: string;
  price?: number;
}
```

#### `src/lib/ai/prompts/product-enrich.ts`

```typescript
export const PRODUCT_ENRICH_SYSTEM = `Du bist ein Experte für deutsche Supermarkt-Produkte.
Deine Aufgabe: aus einem Rohangebot strukturierte Produktdaten extrahieren.

WICHTIG:
- Menge in der tatsächlich verkauften Einheit (z.B. "500g" → amount=500, unit="g")
- Wenn keine Menge erkennbar, dann null
- Kategorien aus folgender Liste: [Milch & Eier, Käse, Fleisch, Wurst, Fisch & Meeresfrüchte,
  Obst & Gemüse, Brot & Backwaren, Tiefkühl, Getränke, Süßwaren, Snacks, Kaffee & Tee,
  Pasta & Reis, Konserven, Gewürze & Soßen, Frühstück, Fertiggerichte, Sonstiges Lebensmittel,
  Non-Food]
- isFood=false nur bei tatsächlichen Non-Food-Artikeln (Waschmittel, Geräte, Zeitschriften)
- Konfidenz 0.0-1.0, konservativ einschätzen

Gib ausschließlich valides JSON zurück, keinen Fließtext.`;

export function buildEnrichPrompt(raw: RawOfferInput): string {
  return `Analysiere dieses Angebot:

Produktname: ${raw.productName}
${raw.description ? `Beschreibung: ${raw.description}` : ''}
${raw.category ? `Rohkategorie: ${raw.category}` : ''}
${raw.store ? `Händler: ${raw.store}` : ''}
${raw.price ? `Preis: ${raw.price}€` : ''}

Extrahiere und gib als JSON zurück:
{
  "canonicalName": "normalisierter Produktname (ohne Marke)",
  "displayName": "vollständiger Name wie im Markt",
  "brand": "Markenname oder null",
  "amount": Zahl oder null,
  "unit": "g|kg|ml|l|stk|pack" oder null,
  "category": "eine aus der Liste",
  "subcategory": "spezifischer z.B. 'Vollmilch' oder null",
  "isFood": true/false,
  "isBio": true/false,
  "isRegional": true/false,
  "isVegan": true/false,
  "isVegetarian": true/false,
  "confidence": 0.0-1.0
}`;
}
```

#### `src/lib/ai/providers/gemini.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProductEnrichmentSchema, type ProductEnrichment, type RawOfferInput } from '../types';
import { PRODUCT_ENRICH_SYSTEM, buildEnrichPrompt } from '../prompts/product-enrich';
import { logAiUsage } from '../cost-logger';

const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const client = new GoogleGenerativeAI(GEMINI_KEY);

export async function enrichProductGemini(
  raw: RawOfferInput,
  options?: { productId?: string }
): Promise<ProductEnrichment> {
  const model = client.getGenerativeModel({
    model: MODEL,
    systemInstruction: PRODUCT_ENRICH_SYSTEM,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const start = Date.now();
  const prompt = buildEnrichPrompt(raw);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const parsed = JSON.parse(text);
    const validated = ProductEnrichmentSchema.parse(parsed);

    await logAiUsage({
      provider: 'gemini',
      model: MODEL,
      operation: 'enrich_product',
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
      costEur: calculateGeminiCost(MODEL, response.usageMetadata),
      latencyMs: Date.now() - start,
      success: true,
      referenceId: options?.productId,
    });

    return validated;
  } catch (err) {
    await logAiUsage({
      provider: 'gemini',
      model: MODEL,
      operation: 'enrich_product',
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
      referenceId: options?.productId,
    });
    throw err;
  }
}

function calculateGeminiCost(model: string, usage: any): number {
  // Gemini Flash: $0.075 / 1M input, $0.30 / 1M output
  const inputCost = (usage?.promptTokenCount || 0) * 0.075 / 1_000_000;
  const outputCost = (usage?.candidatesTokenCount || 0) * 0.30 / 1_000_000;
  return (inputCost + outputCost) * 0.92; // USD→EUR
}
```

#### `src/lib/ai/llm.ts` (Public-API)

```typescript
import { enrichProductGemini } from './providers/gemini';
import type { ProductEnrichment, RawOfferInput } from './types';

const PROVIDER = process.env.AI_PROVIDER || 'gemini';

export async function enrichProduct(
  raw: RawOfferInput,
  options?: { productId?: string }
): Promise<ProductEnrichment> {
  switch (PROVIDER) {
    case 'gemini':
      return enrichProductGemini(raw, options);
    // Später: case 'anthropic': return enrichProductClaude(raw, options);
    default:
      throw new Error(`Unknown AI_PROVIDER: ${PROVIDER}`);
  }
}
```

### 2.4 Enrichment-Script

Datei: `scripts/enrich-products.mjs`

```javascript
#!/usr/bin/env node
/**
 * Enrichment-Job für Phase 1
 *
 * Läuft:
 *  - nach jedem weekly-scrape (via GitHub Workflow)
 *  - manuell via `node scripts/enrich-products.mjs`
 *
 * Logik:
 *  1. Finde alle offers mit product_id = NULL
 *  2. Gruppiere nach Fingerprint (damit gleiche Produkte nur einmal enrichet werden)
 *  3. Pro Gruppe: Lookup in products (bereits bekannt?)
 *     - Ja → offers.product_id = existing.id
 *     - Nein → enrichProduct() aufrufen, in products einfügen, offers verlinken
 */

import { createClient } from '@supabase/supabase-js';
import { enrichProduct } from '../src/lib/ai/llm.js';
import { productFingerprint } from '../src/lib/products/fingerprint.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const BATCH = parseInt(process.env.ENRICH_BATCH || '100', 10);

  const { data: pendingOffers, error } = await supabase
    .from('offers')
    .select('id, product_name, quantity, unit, category, store, offer_price')
    .is('product_id', null)
    .gte('valid_until', new Date().toISOString().slice(0, 10))
    .limit(BATCH);

  if (error) throw error;

  console.log(`📦 ${pendingOffers.length} Offers warten auf Enrichment`);

  let newProducts = 0;
  let linkedToExisting = 0;
  let errors = 0;

  for (const offer of pendingOffers) {
    try {
      // Vorläufiger Fingerprint (ohne AI) für schnellen Lookup
      const preliminaryFingerprint = productFingerprint(
        null, // Marke kennen wir noch nicht
        offer.product_name,
        null, null
      );

      // Prüfe ob bereits ein Produkt mit ähnlichem Namen existiert
      const { data: existingByName } = await supabase
        .from('products')
        .select('id, fingerprint')
        .eq('display_name', offer.product_name)
        .limit(1);

      if (existingByName?.length) {
        await supabase
          .from('offers')
          .update({ product_id: existingByName[0].id })
          .eq('id', offer.id);
        linkedToExisting++;
        continue;
      }

      // Neues Produkt → AI-Enrichment
      const enriched = await enrichProduct({
        productName: offer.product_name,
        category: offer.category,
        store: offer.store,
        price: offer.offer_price,
      });

      const fingerprint = productFingerprint(
        enriched.brand,
        enriched.canonicalName,
        enriched.amount,
        enriched.unit
      );

      // UPSERT in products
      const { data: upserted, error: upsertErr } = await supabase
        .from('products')
        .upsert({
          canonical_name: enriched.canonicalName,
          display_name: enriched.displayName,
          brand: enriched.brand,
          fingerprint,
          amount: enriched.amount,
          unit: enriched.unit,
          base_unit: normalizeBaseUnit(enriched.unit),
          category: enriched.category,
          subcategory: enriched.subcategory,
          is_food: enriched.isFood,
          is_bio: enriched.isBio,
          is_regional: enriched.isRegional,
          is_vegan: enriched.isVegan,
          is_vegetarian: enriched.isVegetarian,
          enrichment_version: 1,
          enrichment_model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
          enrichment_confidence: enriched.confidence,
        }, { onConflict: 'fingerprint' })
        .select('id')
        .single();

      if (upsertErr) throw upsertErr;

      await supabase
        .from('offers')
        .update({ product_id: upserted.id })
        .eq('id', offer.id);

      newProducts++;
    } catch (err) {
      console.error(`❌ Offer ${offer.id}:`, err.message);
      errors++;
    }
  }

  console.log(`✅ ${newProducts} neue Produkte, ${linkedToExisting} verknüpft, ${errors} Fehler`);
}

function normalizeBaseUnit(unit) {
  if (!unit) return null;
  if (['g', 'kg'].includes(unit)) return 'kg';
  if (['ml', 'l'].includes(unit)) return 'l';
  return 'stk';
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 2.5 GitHub Workflow

Datei: `.github/workflows/ai-enrichment.yml`

```yaml
name: AI Product Enrichment

on:
  workflow_run:
    workflows: ["Wöchentlicher Scrape", "On-Demand PLZ Scrape (Neu-Registrierung)"]
    types: [completed]
  workflow_dispatch:
    inputs:
      batch_size:
        description: 'Batch-Größe (Anzahl Offers pro Run)'
        required: false
        default: '200'

jobs:
  enrich:
    if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Enrichment
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_MODEL: gemini-1.5-flash
          AI_PROVIDER: gemini
          ENRICH_BATCH: ${{ github.event.inputs.batch_size || '200' }}
        run: node scripts/enrich-products.mjs

      - name: Telegram Notification
        if: always()
        env:
          BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          STATUS="${{ job.status }}"
          EMOJI="✅"
          [ "$STATUS" != "success" ] && EMOJI="⚠️"
          curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
            --data-urlencode "chat_id=${CHAT_ID}" \
            --data-urlencode "text=${EMOJI} AI-Enrichment: ${STATUS}"
```

---

## 3. Reihenfolge der Umsetzung

| # | Schritt | Wo | Dauer |
|---|---|---|---|
| 1 | Gemini API-Key in Google Cloud erstellen | Browser (Google Cloud Console) | 10 min |
| 2 | `GEMINI_API_KEY` in GitHub Secrets + Vercel Env | Beide Plattformen | 5 min |
| 3 | npm-Pakete installieren | Terminal / Claude | 2 min |
| 4 | `src/lib/ai/` Grundgerüst schreiben | VS Code / Claude | 45 min |
| 5 | Fingerprint-Funktion schreiben + Unit-Test | VS Code / Claude | 20 min |
| 6 | Migration schreiben und in Supabase ausführen | Supabase SQL Editor | 10 min |
| 7 | `scripts/enrich-products.mjs` schreiben | VS Code / Claude | 30 min |
| 8 | **Test-Run mit 10 Produkten lokal** | Terminal | 15 min |
| 9 | Ergebnisse prüfen, Prompt anpassen falls nötig | Supabase SQL Editor | 30 min |
| 10 | GitHub Workflow `ai-enrichment.yml` einrichten | GitHub | 10 min |
| 11 | **Bulk-Enrichment für alle 3087 aktiven Offers** | GitHub Actions | 20 min (Laufzeit) |
| 12 | Frontend-Anpassung: `base_price` Anzeige prüfen | VS Code | 30 min |
| 13 | `weekly-scrape.mjs` erweitern (product_id Lookup bei Insert) | VS Code | 45 min |

**Total:** ca. 5 Stunden aktive Arbeit + einmalig 20 Minuten Bulk-Run.

---

## 4. Benötigte npm-Pakete

```bash
npm install @google/generative-ai zod
npm install -D @types/node
```

Bereits vorhanden: `@supabase/supabase-js`.

---

## 5. Test-Strategie

### 5.1 Unit-Tests für Fingerprint

Datei: `src/lib/products/fingerprint.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { productFingerprint, normalizeText } from './fingerprint';

describe('fingerprint', () => {
  it('erzeugt gleichen Fingerprint für gleiches Produkt unterschiedlich geschrieben', () => {
    const a = productFingerprint('Edeka', 'Bio Heumilch 1L', 1, 'l');
    const b = productFingerprint('EDEKA', 'bio heumilch 1l', 1, 'l');
    expect(a).toBe(b);
  });

  it('unterscheidet unterschiedliche Mengen', () => {
    const a = productFingerprint('Edeka', 'Milch', 1, 'l');
    const b = productFingerprint('Edeka', 'Milch', 500, 'ml');
    expect(a).not.toBe(b);
  });

  it('akzeptiert null für Marke', () => {
    expect(() => productFingerprint(null, 'Milch', 1, 'l')).not.toThrow();
  });
});
```

### 5.2 Integration-Test: Enrichment live

Manueller Test, einmalig, vor Bulk-Run:

```bash
ENRICH_BATCH=10 node scripts/enrich-products.mjs
```

Dann in Supabase prüfen:

```sql
-- Zeigt die 10 enrichten Produkte
SELECT display_name, canonical_name, brand, amount, unit, category, is_food, enrichment_confidence
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- Zeigt AI-Kosten
SELECT COUNT(*), SUM(cost_eur), AVG(latency_ms)
FROM ai_usage_log
WHERE operation = 'enrich_product'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Erfolgskriterium:** Mindestens 8 von 10 Produkten haben sinnvolle Menge + Einheit + Kategorie. Kosten unter 0,01 € für 10 Produkte.

### 5.3 Prompt-Iteration

Falls Ergebnisse nicht überzeugen: Prompt in `src/lib/ai/prompts/product-enrich.ts` anpassen, Test-Run wiederholen. **Niemals** direkt Bulk-Run starten ohne 10er-Test.

---

## 6. Rollout-Strategie

1. **10er-Test** lokal — manuell prüfen, Prompt tunen
2. **100er-Test** via GitHub Actions `workflow_dispatch` mit `batch_size=100`
3. **Validierung:** Abfragen aus Abschnitt 5.2 → Trefferquote
4. **Bulk-Run:** Workflow mit `batch_size=3087` (oder mehrere Läufe)
5. **Scraper-Integration:** `weekly-scrape.mjs` um Fingerprint-Lookup erweitern, damit **neue** Scrapes sofort mit `product_id` laufen

---

## 7. Erfolgskriterien (was bedeutet "Phase 1 fertig")

| Kriterium | Messbar wie |
|---|---|
| Alle aktiven Offers haben `product_id` | `SELECT COUNT(*) FROM offers WHERE product_id IS NULL AND valid_until >= CURRENT_DATE` = 0 |
| >90% der Produkte haben `amount` + `unit` | `SELECT COUNT(*) FROM products WHERE amount IS NOT NULL AND unit IS NOT NULL` > 0.9 × total |
| Non-Food sauber kategorisiert | Stichprobe aus `is_food=false`: alle tatsächlich Non-Food |
| Kosten für Bulk-Run | `SELECT SUM(cost_eur) FROM ai_usage_log` < 1 € |
| Frontend zeigt `€/kg` korrekt | Visuelle Prüfung einer Kategorie-Seite |
| Neue Scrapes verlinken sofort | Nach nächstem Scrape: alle neuen Offers haben `product_id` |

---

## 8. Troubleshooting

| Problem | Ursache | Lösung |
|---|---|---|
| `429 Too Many Requests` von Gemini | Free-Tier-Limit erreicht (15/min) | Batch kleiner machen, Delay zwischen Calls |
| `ZodError` im Script | Gemini liefert unerwartetes JSON | Prompt strenger machen, Temperature senken |
| Hohe Kosten (>2 € für 3k Produkte) | Falsches Modell aktiv | Env-Variable `GEMINI_MODEL=gemini-1.5-flash` setzen |
| Duplikate in `products` | Fingerprint-Logik fehlerhaft | Unit-Tests laufen lassen, Normalisierung prüfen |
| Viele `is_food=false` False-Positives | Prompt zu streng | Prompt-Beispiele für Grenzfälle hinzufügen |

---

## 9. Übergabe an Phase 2

Nach Phase-1-Abschluss ist der Input für Phase 2 bereit:

- `products` Tabelle gefüllt → Basis für `product_embeddings`
- `ai_usage_log` läuft → Kosten-Tracking für Phase 2 von Anfang an aktiv
- AI-Abstraction vorhanden → Embedding-Provider kann einfach hinzugefügt werden

Das `PHASE_2_MATCHING_BRAIN.md` wird geschrieben, sobald Phase 1 stabil läuft.

---

**Ende des Dokuments.**
