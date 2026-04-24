-- ============================================================================
-- Phase 2 — Matching-Gehirn
-- Idempotent: kann mehrfach ausgeführt werden
-- Voraussetzung: Phase 1 ist deployed (products-Tabelle existiert)
-- ============================================================================

-- 0. pgvector-Extension aktivieren (Supabase hat das standardmäßig dabei)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. Embedding-Tabelle für Produkte
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  model TEXT NOT NULL,                                  -- z.B. 'openai-text-embedding-3-small'
  dimensions INTEGER NOT NULL,                          -- 1536 für text-embedding-3-small
  embedding vector(1536) NOT NULL,
  source_text TEXT,                                     -- der Text, der embedded wurde (für Debug)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, model)
);

-- HNSW-Index für schnelle Cosine-Similarity-Suche
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_embeddings_hnsw') THEN
    EXECUTE 'CREATE INDEX idx_product_embeddings_hnsw
             ON public.product_embeddings
             USING hnsw (embedding vector_cosine_ops)';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_product_embeddings_product
  ON public.product_embeddings(product_id);

-- ============================================================================
-- 2. Embedding-Tabelle für Zutaten
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ingredient_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,                        -- canonical name, lowercase normalized
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding vector(1536) NOT NULL,
  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ingredient_name, model)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ingredient_embeddings_hnsw') THEN
    EXECUTE 'CREATE INDEX idx_ingredient_embeddings_hnsw
             ON public.ingredient_embeddings
             USING hnsw (embedding vector_cosine_ops)';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_ingredient_embeddings_ingredient
  ON public.ingredient_embeddings(ingredient_id);

-- ============================================================================
-- 3. Berechnete Matches (Produkt ↔ Zutat)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_ingredient_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  similarity_score NUMERIC NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  is_primary_match BOOLEAN DEFAULT FALSE,
  method TEXT DEFAULT 'embedding'
    CHECK (method IN ('embedding', 'llm_verified', 'manual', 'keyword')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, ingredient_name)
);

CREATE INDEX IF NOT EXISTS idx_pim_ingredient_name
  ON public.product_ingredient_matches(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_pim_ingredient_id
  ON public.product_ingredient_matches(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pim_product
  ON public.product_ingredient_matches(product_id);
CREATE INDEX IF NOT EXISTS idx_pim_score
  ON public.product_ingredient_matches(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_pim_primary
  ON public.product_ingredient_matches(ingredient_name)
  WHERE is_primary_match = TRUE;

-- ============================================================================
-- 4. RPC-Funktion: Aktive Angebote für eine Zutat finden
-- ============================================================================
-- Wird vom Frontend genutzt: bekomme alle aktuellen Angebote, die zu einer
-- bestimmten Zutat passen, sortiert nach Similarity + Preis.
DROP FUNCTION IF EXISTS public.find_offers_for_ingredient(TEXT, NUMERIC, INTEGER);

CREATE OR REPLACE FUNCTION public.find_offers_for_ingredient(
  p_ingredient_name TEXT,
  p_min_score NUMERIC DEFAULT 0.7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  offer_id UUID,
  product_id UUID,
  product_name TEXT,
  brand TEXT,
  similarity_score NUMERIC,
  offer_price NUMERIC,
  store TEXT,
  valid_until DATE,
  is_primary_match BOOLEAN
)
LANGUAGE SQL STABLE AS $$
  SELECT
    o.id AS offer_id,
    p.id AS product_id,
    p.display_name AS product_name,
    p.brand,
    pim.similarity_score,
    o.offer_price,
    o.store,
    o.valid_until,
    pim.is_primary_match
  FROM product_ingredient_matches pim
  JOIN products p ON p.id = pim.product_id
  JOIN offers o ON o.product_id = p.id
  WHERE LOWER(pim.ingredient_name) = LOWER(p_ingredient_name)
    AND pim.similarity_score >= p_min_score
    AND o.valid_until >= CURRENT_DATE
  ORDER BY pim.similarity_score DESC, o.offer_price ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.find_offers_for_ingredient(TEXT, NUMERIC, INTEGER) TO anon, authenticated;

-- ============================================================================
-- 4b. RPC-Funktion: Top-K Produkte für eine Zutat (Cosine-Similarity)
-- ============================================================================
-- Wird vom Match-Computation-Job genutzt:
-- für eine Zutat (über ihre embedding-id) liefert top-K Produkte sortiert nach
-- Similarity. Der pgvector <=> Operator gibt Cosine-Distance zurück (niedriger = ähnlicher),
-- daraus wird Similarity = 1 - Distance.
DROP FUNCTION IF EXISTS public.match_products_for_ingredient(UUID, INTEGER, NUMERIC);

CREATE OR REPLACE FUNCTION public.match_products_for_ingredient(
  p_ingredient_embedding_id UUID,
  p_top_k INTEGER DEFAULT 5,
  p_min_similarity NUMERIC DEFAULT 0.6
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  similarity NUMERIC
)
LANGUAGE SQL STABLE AS $$
  WITH ie AS (
    SELECT embedding, model
    FROM ingredient_embeddings
    WHERE id = p_ingredient_embedding_id
    LIMIT 1
  )
  SELECT
    pe.product_id,
    p.display_name AS product_name,
    (1 - (pe.embedding <=> ie.embedding))::numeric AS similarity
  FROM product_embeddings pe
  CROSS JOIN ie
  JOIN products p ON p.id = pe.product_id
  WHERE pe.model = ie.model
    AND (1 - (pe.embedding <=> ie.embedding)) >= p_min_similarity
  ORDER BY pe.embedding <=> ie.embedding
  LIMIT p_top_k;
$$;

GRANT EXECUTE ON FUNCTION public.match_products_for_ingredient(UUID, INTEGER, NUMERIC) TO anon, authenticated, service_role;

-- ============================================================================
-- 5. RLS-Policies
-- ============================================================================
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredient_matches ENABLE ROW LEVEL SECURITY;

-- Public Read auf Embeddings (sind keine sensiblen Daten, nur abgeleitet)
DROP POLICY IF EXISTS "Public can read product_embeddings" ON public.product_embeddings;
CREATE POLICY "Public can read product_embeddings"
  ON public.product_embeddings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read ingredient_embeddings" ON public.ingredient_embeddings;
CREATE POLICY "Public can read ingredient_embeddings"
  ON public.ingredient_embeddings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read product_ingredient_matches" ON public.product_ingredient_matches;
CREATE POLICY "Public can read product_ingredient_matches"
  ON public.product_ingredient_matches FOR SELECT
  USING (true);

-- Schreiben nur Service-Role (Workflows)

-- ============================================================================
-- 6. Verifikation
-- ============================================================================
DO $$
DECLARE
  v_vector_ext_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') INTO v_vector_ext_exists;
  IF NOT v_vector_ext_exists THEN
    RAISE EXCEPTION 'pgvector extension wurde nicht aktiviert';
  END IF;

  RAISE NOTICE '✅ Phase 2 Migration abgeschlossen';
  RAISE NOTICE '   - pgvector aktiviert';
  RAISE NOTICE '   - product_embeddings + HNSW-Index';
  RAISE NOTICE '   - ingredient_embeddings + HNSW-Index';
  RAISE NOTICE '   - product_ingredient_matches';
  RAISE NOTICE '   - find_offers_for_ingredient() RPC bereit';
END$$;
