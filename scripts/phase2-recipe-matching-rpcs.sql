-- ============================================================================
-- Phase 2 — Recipe-Matching-RPCs (Snapshot live -> Migration)
-- Diese RPCs existieren bereits in der Live-DB (wjhesvkapqrsbibqjbtr).
-- Diese Datei stellt sicher, dass sie auch im Repo versioniert sind.
-- Idempotent: kann mehrfach ausgefuehrt werden (alles CREATE OR REPLACE).
-- ============================================================================
--
-- Funktionen:
--   1. normalize_ingredient(text) -> text[]
--      Liefert Suchbegriffe fuer einen Zutatennamen (Umlaute, Synonyme).
--   2. match_offers_for_ingredient(text, text, text) -> SETOF
--      Liefert aktive Angebote fuer einen Zutatennamen (+ PLZ, + Kategorie).
--   3. match_offers_for_recipe(uuid, text) -> SETOF
--      Liefert pro Zutat eines Rezepts das beste Angebot + alle Treffer.
--      Wird vom Frontend-Hook `useMatchedOffers` aufgerufen.
--
-- Voraussetzungen:
--   - Tabelle `offers` mit Spalten (id, product_name, offer_price,
--     original_price, store, discount_percent, category, plz, plz_prefix,
--     valid_until)
--   - Tabelle `ingredients` mit (id, name, emoji, category, price)
--   - Tabelle `recipe_ingredients` mit (recipe_id, ingredient_id)
--   - Tabelle `ingredient_synonyms` mit (canonical, synonym)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. normalize_ingredient
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_ingredient(p_name text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  clean text;
  clean_orig text;
  terms text[];
  syn record;
BEGIN
  -- Strip parenthetical suffixes, then lowercase + trim
  clean_orig := lower(trim(regexp_replace(p_name, '\s*\([^)]*\)', '', 'g')));

  -- Also strip trailing type hints like "rot/gelb", "rot/grün"
  clean_orig := regexp_replace(clean_orig, '\s+\w+/\w+$', '');
  clean_orig := trim(clean_orig);

  -- Normalize umlauts for alternative matching
  clean := replace(clean_orig, 'ä', 'ae');
  clean := replace(clean, 'ö', 'oe');
  clean := replace(clean, 'ü', 'ue');
  clean := replace(clean, 'ß', 'ss');
  clean := trim(clean);

  terms := ARRAY[clean_orig];
  IF clean <> clean_orig THEN
    terms := terms || ARRAY[clean];
  END IF;

  -- Forward lookup: canonical name -> synonyms
  FOR syn IN
    SELECT s.synonym FROM ingredient_synonyms s
    WHERE lower(s.canonical) = clean_orig
       OR lower(s.canonical) = clean
  LOOP
    terms := terms || ARRAY[lower(trim(syn.synonym))];
  END LOOP;

  -- Reverse lookup: our name is a synonym -> get canonical + siblings
  FOR syn IN
    SELECT s2.canonical, s2.synonym FROM ingredient_synonyms s2
    WHERE s2.canonical IN (
      SELECT s1.canonical FROM ingredient_synonyms s1
      WHERE lower(s1.synonym) = clean_orig
         OR lower(s1.synonym) = clean
    )
  LOOP
    terms := terms || ARRAY[lower(trim(syn.canonical)), lower(trim(syn.synonym))];
  END LOOP;

  SELECT array_agg(DISTINCT t) INTO terms FROM unnest(terms) t WHERE t IS NOT NULL AND t <> '';

  RETURN terms;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.normalize_ingredient(text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. match_offers_for_ingredient (Overload: 3-arg mit Kategorie)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_offers_for_ingredient(
  p_name text,
  p_plz text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS TABLE(
  offer_id uuid,
  product_name text,
  offer_price numeric,
  original_price numeric,
  store text,
  discount_percent integer,
  category text
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  terms text[];
  clean_plz text;
  plz_pre text;
BEGIN
  terms := normalize_ingredient(p_name);

  clean_plz := NULL;
  plz_pre := NULL;
  IF p_plz IS NOT NULL AND p_plz <> '' THEN
    clean_plz := left(regexp_replace(p_plz, '\D', '', 'g'), 5);
    plz_pre := left(clean_plz, 3);
  END IF;

  RETURN QUERY
  SELECT o.id, o.product_name, o.offer_price, o.original_price, o.store, o.discount_percent, o.category
  FROM offers o
  WHERE o.valid_until >= current_date
    AND (
      clean_plz IS NULL
      OR o.plz = clean_plz
      OR o.plz_prefix = plz_pre
    )
    AND EXISTS (
      SELECT 1 FROM unnest(terms) t
      WHERE length(t) >= 3 AND o.product_name ILIKE '%' || t || '%'
    )
  ORDER BY
    CASE WHEN p_category IS NOT NULL AND o.category = p_category THEN 0 ELSE 1 END,
    o.offer_price ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.match_offers_for_ingredient(text, text, text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. match_offers_for_recipe (vom Frontend-Hook genutzt)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_offers_for_recipe(
  p_recipe_id uuid,
  p_plz text DEFAULT NULL
)
RETURNS TABLE(
  ingredient_name text,
  ingredient_emoji text,
  best_offer_price numeric,
  best_original_price numeric,
  best_store text,
  best_discount_percent integer,
  fallback_price numeric,
  all_offers jsonb
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  ing record;
  best record;
  offers_arr jsonb;
BEGIN
  FOR ing IN
    SELECT i.name, i.emoji, i.price, i.category
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = p_recipe_id
  LOOP
    SELECT jsonb_agg(jsonb_build_object(
      'offer_id', mo.offer_id,
      'product_name', mo.product_name,
      'offer_price', mo.offer_price,
      'original_price', mo.original_price,
      'store', mo.store,
      'discount_percent', mo.discount_percent
    ))
    INTO offers_arr
    FROM match_offers_for_ingredient(ing.name, p_plz, ing.category) mo;

    SELECT mo.offer_price, mo.original_price, mo.store, mo.discount_percent
    INTO best
    FROM match_offers_for_ingredient(ing.name, p_plz, ing.category) mo
    LIMIT 1;

    ingredient_name := ing.name;
    ingredient_emoji := ing.emoji;
    best_offer_price := best.offer_price;
    best_original_price := best.original_price;
    best_store := best.store;
    best_discount_percent := best.discount_percent;
    fallback_price := ing.price;
    all_offers := COALESCE(offers_arr, '[]'::jsonb);

    RETURN NEXT;
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.match_offers_for_recipe(uuid, text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Verifikation
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 Recipe-Matching-RPCs sind aktuell:';
  RAISE NOTICE '  - normalize_ingredient(text)';
  RAISE NOTICE '  - match_offers_for_ingredient(text, text, text)';
  RAISE NOTICE '  - match_offers_for_recipe(uuid, text)';
END$$;
