-- ============================================================================
-- Phase 1 — Produkt-Gehirn (Product Brain)
-- ============================================================================
-- Erstellt:
--   • products (neue Struktur, Langzeit-Produktwissen)
--   • ai_usage_log (Observability für AI-Kosten)
--   • offers.product_id bleibt bestehen (Spalte existiert bereits),
--     FK wird neu gesetzt auf die neue products-Tabelle
--
-- Sicherheit:
--   • Die bestehende, ungenutzte products-Tabelle wird umbenannt,
--     nicht gelöscht (Daten bleiben unter products_legacy_unused erhalten)
--   • Alle Statements sind idempotent (IF EXISTS / IF NOT EXISTS)
--
-- Architekturreferenz: docs/ARCHITECTURE_100K.md §4
-- Umsetzungsreferenz:  docs/PHASE_1_PRODUCT_BRAIN.md §2.1
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Alte, ungenutzte products-Tabelle sichern (nicht verwendet im Code)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Nur umbenennen wenn products existiert UND die neue Spalte fingerprint NICHT hat.
  -- Das heißt: wir sind auf dem alten Schema.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'fingerprint'
  ) THEN
    -- Erst FK von offers.product_id entfernen falls vorhanden
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'offers'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%product_id%'
    ) THEN
      EXECUTE (
        SELECT 'ALTER TABLE public.offers DROP CONSTRAINT ' || quote_ident(constraint_name)
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'offers'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%product_id%'
        LIMIT 1
      );
    END IF;

    ALTER TABLE public.products RENAME TO products_legacy_unused;
    RAISE NOTICE 'Alte products-Tabelle umbenannt zu products_legacy_unused';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Neue products-Tabelle (Produkt-Gehirn)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifikation
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  brand TEXT,
  fingerprint TEXT UNIQUE NOT NULL,

  -- Menge & Einheit
  amount NUMERIC,
  unit TEXT,
  base_unit TEXT,

  -- Kategorisierung
  category TEXT,
  subcategory TEXT,
  is_food BOOLEAN DEFAULT TRUE,
  is_bio BOOLEAN DEFAULT FALSE,
  is_regional BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT TRUE,

  -- Enrichment-Metadaten
  enrichment_version INTEGER DEFAULT 1,
  enrichment_model TEXT,
  enrichment_confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Reserve für spätere Gehirne
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

-- ----------------------------------------------------------------------------
-- 3) Updated-At Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_products_updated_at()
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
  EXECUTE FUNCTION public.update_products_updated_at();

-- ----------------------------------------------------------------------------
-- 4) offers.product_id FK auf NEUE products-Tabelle setzen
-- ----------------------------------------------------------------------------

-- Spalte existiert bereits (aus früherem Schema); sicherstellen dass sie NULL-able ist
ALTER TABLE public.offers
  ALTER COLUMN product_id DROP NOT NULL;

-- FK neu setzen (alte FK wurde oben in Schritt 1 entfernt)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'offers'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'offers_product_id_fkey'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.products(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offers_product_id ON public.offers(product_id);

-- ----------------------------------------------------------------------------
-- 5) AI-Usage-Log (Observability)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,            -- 'gemini' | 'anthropic' | 'openai'
  model TEXT NOT NULL,
  operation TEXT NOT NULL,           -- 'enrich_product' | 'embed_ingredient' | ...
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_eur NUMERIC,
  latency_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  reference_id UUID,                 -- z.B. product_id oder offer_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created
  ON public.ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation
  ON public.ai_usage_log(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider
  ON public.ai_usage_log(provider, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
-- Keine Policies = nur Service-Role darf lesen/schreiben, nie ans Frontend

-- ----------------------------------------------------------------------------
-- 6) Bestätigungs-Output
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_products_count INTEGER;
  v_offers_pending INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_products_count FROM public.products;
  SELECT COUNT(*) INTO v_offers_pending
    FROM public.offers
    WHERE product_id IS NULL
      AND valid_until >= CURRENT_DATE;

  RAISE NOTICE '✅ Phase 1 Migration abgeschlossen';
  RAISE NOTICE '   products-Tabelle: % Einträge', v_products_count;
  RAISE NOTICE '   offers ohne product_id (aktiv): % — warten auf Enrichment', v_offers_pending;
  RAISE NOTICE '   ai_usage_log: bereit für Logging';
END $$;
