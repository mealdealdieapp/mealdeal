-- ============================================================================
-- MealDeal — Automation Tables Setup
-- ============================================================================
-- Erstellt alle Tabellen, die für die Automatisierungs-Scripts benötigt werden:
--
-- - scraped_this_week   (Tracking welche PLZ-Präfixe wöchentlich gescraped wurden)
-- - health_checks       (Logs vom nightly-health-check Agent)
-- - matching_reports    (Wöchentliche Matching-Analyse Reports)
-- - pending_recipes     (Neue KI-generierte Rezepte warten auf Review)
--
-- ANLEITUNG:
-- 1. Supabase Dashboard → SQL Editor
-- 2. Diese Datei einfügen → "Run"
-- 3. Kein Fehler = erfolgreich!
-- Idempotent — mehrfaches Ausführen ist unproblematisch.
-- ============================================================================


-- --- scraped_this_week ---
-- Tracking welche PLZ-Präfixe in welcher Woche gescraped wurden
CREATE TABLE IF NOT EXISTS public.scraped_this_week (
  id BIGSERIAL PRIMARY KEY,
  plz_prefix TEXT NOT NULL,
  week_start DATE NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  offers_count INTEGER DEFAULT 0,
  UNIQUE (plz_prefix, week_start)
);

-- Falls Tabelle bereits existiert ohne neue Spalten → nachtragen
ALTER TABLE public.scraped_this_week ADD COLUMN IF NOT EXISTS plz_prefix TEXT;
ALTER TABLE public.scraped_this_week ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE public.scraped_this_week ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.scraped_this_week ADD COLUMN IF NOT EXISTS offers_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_scraped_week ON public.scraped_this_week(week_start);


-- --- health_checks ---
-- Logs vom Nightly Health Check Agent
CREATE TABLE IF NOT EXISTS public.health_checks (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL,
  total_checks INTEGER NOT NULL,
  ok_count INTEGER NOT NULL,
  warn_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  fixes_applied INTEGER DEFAULT 0,
  alerts JSONB,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_health_ran ON public.health_checks(ran_at DESC);


-- --- matching_reports ---
-- Wöchentliche Matching-Analyse Output
CREATE TABLE IF NOT EXISTS public.matching_reports (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL,
  week_start DATE,
  total_offers INTEGER,
  matched_count INTEGER,
  unmatched_count INTEGER,
  match_rate_pct NUMERIC(5, 2),
  top_unmatched JSONB,
  synonym_suggestions JSONB
);

CREATE INDEX IF NOT EXISTS idx_matching_ran ON public.matching_reports(ran_at DESC);


-- --- pending_recipes ---
-- Neue KI-generierte Rezepte warten auf Jo's Review
CREATE TABLE IF NOT EXISTS public.pending_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  meal TEXT,
  time_minutes INTEGER,
  difficulty TEXT,
  servings INTEGER DEFAULT 2,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  cost NUMERIC(5, 2),
  steps JSONB,
  diets TEXT[],
  saved INTEGER DEFAULT 0,
  image_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_pending_status ON public.pending_recipes(status);


-- ============================================================================
-- RLS POLICIES für neue Tabellen
-- ============================================================================

-- scraped_this_week: alle eingeloggten User dürfen lesen+schreiben
ALTER TABLE public.scraped_this_week ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scraped_this_week_select" ON public.scraped_this_week;
CREATE POLICY "scraped_this_week_select" ON public.scraped_this_week FOR SELECT USING (true);
DROP POLICY IF EXISTS "scraped_this_week_insert" ON public.scraped_this_week;
CREATE POLICY "scraped_this_week_insert" ON public.scraped_this_week FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "scraped_this_week_update" ON public.scraped_this_week;
CREATE POLICY "scraped_this_week_update" ON public.scraped_this_week FOR UPDATE USING (auth.role() = 'authenticated');

-- health_checks: nur Service Role (keine Policies)
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- matching_reports: Admin-Lesen, Service-Schreiben
ALTER TABLE public.matching_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matching_reports_select" ON public.matching_reports;
CREATE POLICY "matching_reports_select" ON public.matching_reports FOR SELECT USING (true);

-- pending_recipes: alle dürfen lesen (damit Jo in der App reviewen kann)
ALTER TABLE public.pending_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_recipes_select" ON public.pending_recipes;
CREATE POLICY "pending_recipes_select" ON public.pending_recipes FOR SELECT USING (true);
DROP POLICY IF EXISTS "pending_recipes_update" ON public.pending_recipes;
CREATE POLICY "pending_recipes_update" ON public.pending_recipes FOR UPDATE USING (auth.role() = 'authenticated');


-- ============================================================================
-- FERTIG!
-- ============================================================================
-- Jetzt können die Automation-Scripts laufen:
--   npm run weekly-scrape
--   npm run health-check
--   npm run matching-analysis
--   npm run generate-recipes
-- ============================================================================
