-- ============================================================
-- MealDeal — Scraper-Qualität: Migrations-Script
-- ============================================================
-- Fügt zur 'offers' Tabelle Spalten für: Mengen/Grundpreis,
-- Marke, Bio/Regional, Unterkategorie und canonical_key.
-- Erstellt Hilfstabellen: offer_ingredient_matches, price_history, scrape_runs
-- ============================================================

-- -----------------------------------------------------
-- 1) OFFERS: neue Spalten
-- -----------------------------------------------------
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS amount numeric,              -- geparste Menge (z.B. 500)
  ADD COLUMN IF NOT EXISTS unit text,                   -- normalisiert: g, kg, ml, l, stk
  ADD COLUMN IF NOT EXISTS base_price numeric,          -- z.B. 7.98 (€/kg)
  ADD COLUMN IF NOT EXISTS base_unit text,              -- kg, l, stk
  ADD COLUMN IF NOT EXISTS brand text,                  -- z.B. "Landliebe"
  ADD COLUMN IF NOT EXISTS is_bio boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_regional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subcategory text,            -- z.B. "Rind", "Geflügel"
  ADD COLUMN IF NOT EXISTS canonical_key text,          -- für Fuzzy-Dedup
  ADD COLUMN IF NOT EXISTS is_real_deal boolean,        -- Preis < Median der letzten 6 Wochen?
  ADD COLUMN IF NOT EXISTS real_discount_percent integer; -- echter Discount vs. Median

CREATE INDEX IF NOT EXISTS idx_offers_brand ON offers(brand);
CREATE INDEX IF NOT EXISTS idx_offers_subcategory ON offers(subcategory);
CREATE INDEX IF NOT EXISTS idx_offers_canonical ON offers(canonical_key);
CREATE INDEX IF NOT EXISTS idx_offers_is_bio ON offers(is_bio) WHERE is_bio = true;

-- -----------------------------------------------------
-- 2) OFFER_INGREDIENT_MATCHES (Pre-Matching beim Scrape)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_ingredient_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  match_score numeric NOT NULL,            -- 0..1
  match_reason text,                       -- z.B. "exact", "synonym:huhn", "token"
  created_at timestamptz DEFAULT now(),
  UNIQUE(offer_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_oim_offer ON offer_ingredient_matches(offer_id);
CREATE INDEX IF NOT EXISTS idx_oim_ingredient ON offer_ingredient_matches(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_oim_score ON offer_ingredient_matches(match_score DESC);

-- -----------------------------------------------------
-- 3) PRICE_HISTORY (existiert bereits — ergänzende Spalten)
-- -----------------------------------------------------
ALTER TABLE price_history
  ADD COLUMN IF NOT EXISTS canonical_key text,
  ADD COLUMN IF NOT EXISTS plz_prefix text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS seen_at date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ph_canonical ON price_history(canonical_key);
CREATE INDEX IF NOT EXISTS idx_ph_market_plz ON price_history(market, plz_prefix);
CREATE INDEX IF NOT EXISTS idx_ph_seen ON price_history(seen_at DESC);

-- -----------------------------------------------------
-- 4) SCRAPE_RUNS (Monitoring)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_ms integer,
  plz_prefix text,
  status text NOT NULL DEFAULT 'running',  -- running, success, error, partial
  total_raw integer DEFAULT 0,             -- Rohangebote von API
  total_saved integer DEFAULT 0,
  skipped_non_food integer DEFAULT 0,
  skipped_dedup integer DEFAULT 0,
  skipped_invalid integer DEFAULT 0,
  matches_created integer DEFAULT 0,
  error_message text,
  per_store jsonb DEFAULT '{}'::jsonb,     -- { "REWE": 123, "Lidl": 45, ... }
  per_category jsonb DEFAULT '{}'::jsonb,  -- { "Fleisch": 45, ... }
  api_calls integer DEFAULT 0,
  retries integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sr_started ON scrape_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sr_plz ON scrape_runs(plz_prefix);
CREATE INDEX IF NOT EXISTS idx_sr_status ON scrape_runs(status);

-- -----------------------------------------------------
-- 5) VIEW: aktuelle Angebote mit Ingredient-Matches
-- -----------------------------------------------------
CREATE OR REPLACE VIEW v_offer_best_match AS
SELECT
  o.*,
  (SELECT i.name FROM offer_ingredient_matches oim
    JOIN ingredients i ON i.id = oim.ingredient_id
    WHERE oim.offer_id = o.id
    ORDER BY oim.match_score DESC LIMIT 1) AS best_ingredient,
  (SELECT oim.match_score FROM offer_ingredient_matches oim
    WHERE oim.offer_id = o.id
    ORDER BY oim.match_score DESC LIMIT 1) AS best_match_score;

-- -----------------------------------------------------
-- 6) Funktion: Median-Preis aus History
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_median_price(
  p_canonical_key text,
  p_market text,
  p_plz_prefix text,
  p_weeks integer DEFAULT 6
) RETURNS numeric AS $$
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY price)
  FROM price_history
  WHERE canonical_key = p_canonical_key
    AND market = p_market
    AND plz_prefix = p_plz_prefix
    AND seen_at > CURRENT_DATE - (p_weeks * 7);
$$ LANGUAGE sql STABLE;

-- Fertig.
SELECT 'Migration complete.' AS status;
