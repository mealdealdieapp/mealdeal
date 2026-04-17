-- ============================================================================
-- offers.is_food Spalte — MealDeal Non-Food-Filter
-- ============================================================================
-- Idempotent: kann mehrfach ausgeführt werden
-- ============================================================================

-- Neue Spalte: true = Lebensmittel, false = Non-Food (Haushalt, Drogerie, Textilien etc.)
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS is_food boolean DEFAULT true;

-- Index für schnelle Filterung (nur Food-Angebote)
CREATE INDEX IF NOT EXISTS idx_offers_is_food ON offers(is_food);

-- Bestehende Non-Food-Angebote markieren
UPDATE offers SET is_food = false
WHERE category IN ('Haushalt', 'Drogerie', 'Textilien', 'Elektronik', 'Garten & Möbel', 'Tierbedarf');

-- Auch "Sonstiges Lebensmittel" prüfen — bekannte Non-Food-Keywords
UPDATE offers SET is_food = false
WHERE category = 'Sonstiges Lebensmittel'
  AND (
    lower(product_name) ~ '(staubsaug|bettwäsche|bettlaken|kopfkissen|matratze|handtuch|gardine|teppich|werkzeug|bohrer|schrauben|socken|slips|unterhose|shirt|pullover|jacke|jeans|kleid|schuhe|sneaker|sandalen|akku|batterie|bluetooth|kopfhörer|lautsprecher|fernseher|laptop|tablet|smartphone|led |led-|lampe|leuchte|steckdose|solar|gartenmöbel|gartenstuhl|sonnenschirm|planschbecken|rasenmäher|blumenerde|dünger|hundefutter|katzenfutter|katzenstreu|tiernahrung)'
  );

-- Verify
SELECT is_food, count(*) FROM offers GROUP BY is_food ORDER BY is_food;
SELECT category, count(*) FROM offers WHERE is_food = false GROUP BY category ORDER BY count(*) DESC;
