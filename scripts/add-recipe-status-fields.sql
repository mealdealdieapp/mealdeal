-- ============================================================================
-- Recipe Status & Source Fields — MealDeal
-- ============================================================================
-- Bereits ausgeführt am 2026-04-17
-- Idempotent: kann mehrfach ausgeführt werden
-- ============================================================================

-- Neue Felder für Rezept-Management
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'generated', 'real')),
  ADD COLUMN IF NOT EXISTS quality_score real;

-- Index auf status für schnelle Filterung
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_source ON recipes(source);

-- Alle bestehenden Rezepte als 'real' markieren (sofern noch 'manual')
UPDATE recipes SET source = 'real' WHERE source = 'manual';

-- Verify
SELECT status, source, count(*) FROM recipes GROUP BY status, source ORDER BY status, source;
