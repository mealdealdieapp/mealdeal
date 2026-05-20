-- ============================================================
-- Migration: Markt-Layouts für Einkaufslisten-Sortierung
-- ============================================================
-- Datum: 2026-05-20
-- Sprint: Week 1 (Release Master Plan Q2/Q3)
--
-- Zweck: Pro Supermarktkette eine Sektions-Reihenfolge speichern, damit
--        die Einkaufsliste in der App in der Lauf-Reihenfolge des Marktes
--        sortiert werden kann (statt alphabetisch oder chronologisch).
--
-- Fallback: Wenn ein Markt nicht in dieser Tabelle steht, nutzt das
--           Frontend die Konstante MARKET_LAYOUTS aus
--           src/lib/marketLayouts.ts. Die DB-Tabelle ist also nur die
--           "Override"-Ebene für Spezialfälle und A/B-Tests.
-- ============================================================

CREATE TABLE IF NOT EXISTS market_layouts (
  market         text PRIMARY KEY,
  section_order  text[] NOT NULL,
  source         text NOT NULL DEFAULT 'manual', -- manual | crowdsourced | research
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE market_layouts IS
  'Lauf-Reihenfolge der Produktsektionen pro Supermarktkette. Wird vom Frontend zur Einkaufslisten-Sortierung verwendet.';
COMMENT ON COLUMN market_layouts.section_order IS
  'Geordnetes Array von Kategorie-Strings (entsprechen offers.category bzw. ingredients.category).';
COMMENT ON COLUMN market_layouts.source IS
  'Herkunft des Layouts: manual (Hand-gepflegt), crowdsourced (User-Feedback), research (z.B. Marktguru-Daten).';

-- RLS: Alle authentifizierten User dürfen lesen, niemand schreiben (nur Admin via Service Role).
ALTER TABLE market_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_layouts_read_all" ON market_layouts;
CREATE POLICY "market_layouts_read_all"
  ON market_layouts FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================
-- Seed-Daten: 8 Ketten mit sinnvollen Default-Layouts
-- (synchron mit src/lib/marketLayouts.ts)
-- ============================================================

-- Discounter-Layout (Aldi, Lidl, Penny, Netto, Norma)
INSERT INTO market_layouts (market, section_order, source) VALUES
  ('ALDI', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Tiefkühl','Nudeln & Reis',
    'Hülsenfrüchte','Konserven','Öle & Fette','Gewürze','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research'),
  ('Lidl', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Tiefkühl','Nudeln & Reis',
    'Hülsenfrüchte','Konserven','Öle & Fette','Gewürze','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research'),
  ('Penny', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Tiefkühl','Nudeln & Reis',
    'Hülsenfrüchte','Konserven','Öle & Fette','Gewürze','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research'),
  ('Netto', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Tiefkühl','Nudeln & Reis',
    'Hülsenfrüchte','Konserven','Öle & Fette','Gewürze','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research'),
  ('Norma', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Tiefkühl','Nudeln & Reis',
    'Hülsenfrüchte','Konserven','Öle & Fette','Gewürze','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research')
ON CONFLICT (market) DO UPDATE SET
  section_order = EXCLUDED.section_order,
  source = EXCLUDED.source,
  updated_at = now();

-- Vollsortimenter-Layout (Rewe, Edeka, Kaufland)
INSERT INTO market_layouts (market, section_order, source) VALUES
  ('REWE', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Nudeln & Reis','Hülsenfrüchte',
    'Konserven','Öle & Fette','Gewürze','Tiefkühl','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research'),
  ('Edeka', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Nudeln & Reis','Hülsenfrüchte',
    'Konserven','Öle & Fette','Gewürze','Tiefkühl','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research'),
  ('Kaufland', ARRAY[
    'Obst','Gemüse','Backwaren','Brot & Wraps','Käse','Milch & Eier',
    'Fleisch','Fisch & Meeresfrüchte','Nudeln & Reis','Hülsenfrüchte',
    'Konserven','Öle & Fette','Gewürze','Tiefkühl','Snacks & Süßes',
    'Sonstiges Lebensmittel','Getränke','Drogerie','Haushalt'
  ], 'research')
ON CONFLICT (market) DO UPDATE SET
  section_order = EXCLUDED.section_order,
  source = EXCLUDED.source,
  updated_at = now();
