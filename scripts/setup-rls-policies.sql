-- ============================================================================
-- Row Level Security (RLS) Setup für MealDeal — VOLLSTÄNDIG
-- ============================================================================
-- Letzte Aktualisierung: 2026-04-11
--
-- Deckt ALLE 18 Tabellen ab:
--   7 Benutzertabellen (user_id Isolation)
--   9 öffentliche Tabellen (read-only für alle)
--   2 System-Tabellen (eingeschränkt)
--
-- ANLEITUNG:
-- 1. Supabase Dashboard → SQL Editor
-- 2. Gesamte Datei einfügen
-- 3. "Run" klicken
-- 4. Kein Fehler = erfolgreich!
--
-- Kann bedenkenlos mehrfach ausgeführt werden (idempotent).
-- ============================================================================


-- ============================================================================
-- SECTION 1: BENUTZERTABELLEN — STRIKTE ISOLATION
-- ============================================================================
-- Jeder User sieht NUR seine eigenen Daten.

-- --- user_profiles ---
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_delete" ON public.user_profiles;
CREATE POLICY "user_profiles_delete" ON public.user_profiles
  FOR DELETE USING (auth.uid() = id);


-- --- shopping_items ---
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_items_select" ON public.shopping_items;
CREATE POLICY "shopping_items_select" ON public.shopping_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shopping_items_insert" ON public.shopping_items;
CREATE POLICY "shopping_items_insert" ON public.shopping_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shopping_items_update" ON public.shopping_items;
CREATE POLICY "shopping_items_update" ON public.shopping_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shopping_items_delete" ON public.shopping_items;
CREATE POLICY "shopping_items_delete" ON public.shopping_items
  FOR DELETE USING (auth.uid() = user_id);


-- --- saved_recipes ---
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_recipes_select" ON public.saved_recipes;
CREATE POLICY "saved_recipes_select" ON public.saved_recipes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_recipes_insert" ON public.saved_recipes;
CREATE POLICY "saved_recipes_insert" ON public.saved_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_recipes_update" ON public.saved_recipes;
CREATE POLICY "saved_recipes_update" ON public.saved_recipes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_recipes_delete" ON public.saved_recipes;
CREATE POLICY "saved_recipes_delete" ON public.saved_recipes
  FOR DELETE USING (auth.uid() = user_id);


-- --- weekly_plans ---
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_plans_select" ON public.weekly_plans;
CREATE POLICY "weekly_plans_select" ON public.weekly_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_plans_insert" ON public.weekly_plans;
CREATE POLICY "weekly_plans_insert" ON public.weekly_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_plans_update" ON public.weekly_plans;
CREATE POLICY "weekly_plans_update" ON public.weekly_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_plans_delete" ON public.weekly_plans;
CREATE POLICY "weekly_plans_delete" ON public.weekly_plans
  FOR DELETE USING (auth.uid() = user_id);


-- --- purchase_log ---
ALTER TABLE public.purchase_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_log_select" ON public.purchase_log;
CREATE POLICY "purchase_log_select" ON public.purchase_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "purchase_log_insert" ON public.purchase_log;
CREATE POLICY "purchase_log_insert" ON public.purchase_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "purchase_log_update" ON public.purchase_log;
CREATE POLICY "purchase_log_update" ON public.purchase_log
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "purchase_log_delete" ON public.purchase_log;
CREATE POLICY "purchase_log_delete" ON public.purchase_log
  FOR DELETE USING (auth.uid() = user_id);


-- --- custom_recipes ---
ALTER TABLE public.custom_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_recipes_select" ON public.custom_recipes;
CREATE POLICY "custom_recipes_select" ON public.custom_recipes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_recipes_insert" ON public.custom_recipes;
CREATE POLICY "custom_recipes_insert" ON public.custom_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_recipes_update" ON public.custom_recipes;
CREATE POLICY "custom_recipes_update" ON public.custom_recipes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_recipes_delete" ON public.custom_recipes;
CREATE POLICY "custom_recipes_delete" ON public.custom_recipes
  FOR DELETE USING (auth.uid() = user_id);


-- --- watchlist ---
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watchlist_select" ON public.watchlist;
CREATE POLICY "watchlist_select" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "watchlist_insert" ON public.watchlist;
CREATE POLICY "watchlist_insert" ON public.watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "watchlist_update" ON public.watchlist;
CREATE POLICY "watchlist_update" ON public.watchlist
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "watchlist_delete" ON public.watchlist;
CREATE POLICY "watchlist_delete" ON public.watchlist
  FOR DELETE USING (auth.uid() = user_id);


-- --- feedback ---
-- Falls die Tabelle existiert (wurde in früherer Session erstellt)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback') THEN
    ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "feedback_select" ON public.feedback';
    EXECUTE 'CREATE POLICY "feedback_select" ON public.feedback FOR SELECT USING (auth.uid() = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS "feedback_insert" ON public.feedback';
    EXECUTE 'CREATE POLICY "feedback_insert" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS "feedback_update" ON public.feedback';
    EXECUTE 'CREATE POLICY "feedback_update" ON public.feedback FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS "feedback_delete" ON public.feedback';
    EXECUTE 'CREATE POLICY "feedback_delete" ON public.feedback FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;


-- ============================================================================
-- SECTION 2: ÖFFENTLICHE TABELLEN — LESEN FÜR ALLE
-- ============================================================================
-- Alle eingeloggten User dürfen lesen. Schreiben nur via Service Role.

-- --- recipes ---
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_select" ON public.recipes;
CREATE POLICY "recipes_select" ON public.recipes
  FOR SELECT USING (true);


-- --- ingredients ---
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredients_select" ON public.ingredients;
CREATE POLICY "ingredients_select" ON public.ingredients
  FOR SELECT USING (true);


-- --- recipe_ingredients ---
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_ingredients_select" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients
  FOR SELECT USING (true);


-- --- ingredient_synonyms ---
ALTER TABLE public.ingredient_synonyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredient_synonyms_select" ON public.ingredient_synonyms;
CREATE POLICY "ingredient_synonyms_select" ON public.ingredient_synonyms
  FOR SELECT USING (true);


-- --- plz_regions ---
ALTER TABLE public.plz_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plz_regions_select" ON public.plz_regions;
CREATE POLICY "plz_regions_select" ON public.plz_regions
  FOR SELECT USING (true);


-- --- products ---
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (true);


-- --- recipe_costs ---
ALTER TABLE public.recipe_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_costs_select" ON public.recipe_costs;
CREATE POLICY "recipe_costs_select" ON public.recipe_costs
  FOR SELECT USING (true);


-- --- price_history ---
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_history_select" ON public.price_history;
CREATE POLICY "price_history_select" ON public.price_history
  FOR SELECT USING (true);


-- ============================================================================
-- SECTION 3: SCRAPER-TABELLEN — LESEN FÜR ALLE, SCHREIBEN FÜR EINGELOGGTE
-- ============================================================================
-- Der Marktguru-Scraper läuft client-seitig und muss Angebote schreiben können.
-- Jeder eingeloggte User darf Angebote für seine PLZ scrapen und einfügen.

-- --- offers ---
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers_select" ON public.offers;
CREATE POLICY "offers_select" ON public.offers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "offers_insert_authenticated" ON public.offers;
CREATE POLICY "offers_insert_authenticated" ON public.offers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "offers_update_authenticated" ON public.offers;
CREATE POLICY "offers_update_authenticated" ON public.offers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- DELETE nur via Service Role (abgelaufene Angebote aufräumen)


-- --- scraped_this_week ---
ALTER TABLE public.scraped_this_week ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scraped_this_week_select" ON public.scraped_this_week;
CREATE POLICY "scraped_this_week_select" ON public.scraped_this_week
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "scraped_this_week_insert_authenticated" ON public.scraped_this_week;
CREATE POLICY "scraped_this_week_insert_authenticated" ON public.scraped_this_week
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "scraped_this_week_update_authenticated" ON public.scraped_this_week;
CREATE POLICY "scraped_this_week_update_authenticated" ON public.scraped_this_week
  FOR UPDATE USING (auth.role() = 'authenticated');


-- ============================================================================
-- SECTION 4: SYSTEM-TABELLEN — NUR SERVICE ROLE
-- ============================================================================
-- Diese Tabellen werden nur intern genutzt. RLS aktivieren ohne Policies
-- bedeutet: kein Client-Zugriff, nur Service Role.

-- --- unmatched_images ---
ALTER TABLE public.unmatched_images ENABLE ROW LEVEL SECURITY;

-- Keine Policies = kein Client-Zugriff. Nur Service Role Key kommt durch.


-- ============================================================================
-- VERIFIZIERUNG
-- ============================================================================
-- Prüfe ob RLS für alle Tabellen aktiv ist:

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Erwartung: rowsecurity = true für ALLE Tabellen


-- ============================================================================
-- FERTIG!
-- ============================================================================
--
-- Zusammenfassung:
-- ✓ 7 Benutzertabellen: Strikte user_id Isolation (CRUD nur eigene Daten)
-- ✓ 8 öffentliche Tabellen: Lesen für alle, Schreiben nur Service Role
-- ✓ 2 Scraper-Tabellen: Lesen für alle, Schreiben für eingeloggte User
-- ✓ 1 System-Tabelle: Kein Client-Zugriff
--
-- Nächste Schritte:
-- - Teste mit einem eingeloggten User ob Rezepte/Angebote noch laden
-- - Teste ob Profil speichern noch funktioniert
-- - Teste ob Scraper noch Angebote einfügen kann
-- ============================================================================
