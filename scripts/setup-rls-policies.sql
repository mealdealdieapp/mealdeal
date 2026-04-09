-- ============================================================================
-- Row Level Security (RLS) Setup für MealDeal
-- ============================================================================
--
-- WICHTIG für Jo:
-- 1. Gehe zu Supabase Dashboard -> SQL Editor
-- 2. Kopiere diese gesamte Datei (oder einzelne Abschnitte)
-- 3. Füge den Code in den SQL Editor ein
-- 4. Klicke "Run"
-- 5. Wenn kein Fehler kommt = erfolgreich!
--
-- Diese Datei kann bedenkenlos mehrfach ausgeführt werden (idempotent).
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: BENUTZERSPEZIFISCHE TABELLEN - STRIKTE ISOLATION
-- ============================================================================
-- Diese Tabellen enthalten persönliche Daten - nur der Besitzer darf lesen/schreiben

-- --- user_profiles ---
-- Speichert Profildaten wie PLZ, Märkte, Diäten, Ziele
-- auth.uid() ist die User ID aus Supabase Auth
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
-- Einkaufsliste des Users - nur für den User selbst sichtbar
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
-- Gespeicherte/favorisierte Rezepte des Users
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
-- Wochenplan mit Rezepten für den User
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
-- Log der gekauften Angebote/Artikel für den User
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
-- Von Usern erstellte eigene Rezepte
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


-- --- feedback ---
-- Feedback/Bug Reports von Users
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select" ON public.feedback;
CREATE POLICY "feedback_select" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_insert" ON public.feedback;
CREATE POLICY "feedback_insert" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_update" ON public.feedback;
CREATE POLICY "feedback_update" ON public.feedback
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_delete" ON public.feedback;
CREATE POLICY "feedback_delete" ON public.feedback
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- SECTION 2: ÖFFENTLICHE TABELLEN - NUR LESEZUGRIFF
-- ============================================================================
-- Diese Tabellen sind öffentlich und dürfen von allen Usern gelesen werden.
-- Schreib- und Lösch-Zugriff ist nur für Admins (über andere Mechanismen) möglich.

-- --- recipes ---
-- Rezepte - alle User können alle Rezepte sehen
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_select" ON public.recipes;
CREATE POLICY "recipes_select" ON public.recipes
  FOR SELECT USING (true);

-- Nur Admins/Service-Rolle können Rezepte ändern (nicht via RLS konfiguriert)
-- Das wird über Supabase Admin API oder Service Role Key gemacht


-- --- offers ---
-- Angebote von Märkten - alle User können alle Angebote sehen
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers_select" ON public.offers;
CREATE POLICY "offers_select" ON public.offers
  FOR SELECT USING (true);

-- Nur Scraper/Admins können Angebote hinzufügen (nicht via RLS)


-- --- ingredients ---
-- Zutaten-Datenbank - alle User können alle Zutaten sehen
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredients_select" ON public.ingredients;
CREATE POLICY "ingredients_select" ON public.ingredients
  FOR SELECT USING (true);

-- Nur Admins können Zutaten ändern (nicht via RLS)


-- --- recipe_ingredients ---
-- Zuordnung Rezepte <-> Zutaten - alle User können lesen
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_ingredients_select" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients
  FOR SELECT USING (true);

-- Nur Admins können ändern (nicht via RLS)


-- --- synonyms ---
-- Zutaten-Synonyme für Matching - alle User können lesen
ALTER TABLE public.synonyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "synonyms_select" ON public.synonyms;
CREATE POLICY "synonyms_select" ON public.synonyms
  FOR SELECT USING (true);

-- Nur Admins können ändern (nicht via RLS)


-- --- plz_regions ---
-- PLZ <-> Region/Bundesland Mapping - alle User können lesen
ALTER TABLE public.plz_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plz_regions_select" ON public.plz_regions;
CREATE POLICY "plz_regions_select" ON public.plz_regions
  FOR SELECT USING (true);

-- Nur Admins können ändern (nicht via RLS)


-- ============================================================================
-- FERTIG!
-- ============================================================================
--
-- Wenn du bis hierher kommst ohne Fehler = RLS ist erfolgreich aktiviert!
--
-- Was passiert jetzt:
-- ✓ Jeder User kann NUR seine eigenen Daten in Benutzertabellen sehen
-- ✓ Alle User können öffentliche Tabellen (Rezepte, Angebote, etc.) lesen
-- ✓ Der App-Code muss mit Supabase Auth Client laufen - sonst wird RLS durchgesetzt
--
-- Debugging:
-- - Gehe zu "Authentication" -> "Users" für eine Übersicht
-- - Gehe zu "Database" -> Wähle eine Tabelle -> "RLS" Tab um Policies zu sehen
--
-- ============================================================================
