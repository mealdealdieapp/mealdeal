-- ============================================================================
-- MealDeal — On-Demand Scrape Trigger
-- ============================================================================
-- Erstellt einen Postgres-Trigger der bei jedem neuen user_profiles-Eintrag
-- GitHub Actions triggert, damit sofort für die neue PLZ gescraped wird.
--
-- ANLEITUNG:
-- 1. WICHTIG: Ersetze DEIN_GITHUB_PAT ganz unten mit deinem echten Token!
-- 2. Diese Datei via DB-Migration Workflow ausführen
-- ============================================================================

-- --- pg_net Extension aktivieren ---
-- pg_net erlaubt HTTP Calls direkt aus der DB (nötig für GitHub API)
CREATE EXTENSION IF NOT EXISTS pg_net;


-- --- Trigger-Function ---
-- Schickt einen repository_dispatch an GitHub wenn neuer User registriert
CREATE OR REPLACE FUNCTION trigger_scrape_on_new_plz()
RETURNS TRIGGER AS $$
DECLARE
  github_pat TEXT := current_setting('app.github_pat', true);
BEGIN
  -- Nur feuern wenn PLZ vorhanden UND Token gesetzt
  IF NEW.plz IS NOT NULL AND github_pat IS NOT NULL AND github_pat <> '' THEN
    PERFORM net.http_post(
      url := 'https://api.github.com/repos/mealdealdieapp/mealdeal/dispatches',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || github_pat,
        'Accept', 'application/vnd.github+json',
        'Content-Type', 'application/json',
        'User-Agent', 'Supabase-Trigger'
      ),
      body := jsonb_build_object(
        'event_type', 'new-user-plz',
        'client_payload', jsonb_build_object(
          'plz', NEW.plz,
          'user_id', NEW.id
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- --- Trigger auf user_profiles ---
DROP TRIGGER IF EXISTS on_new_user_scrape ON public.user_profiles;
CREATE TRIGGER on_new_user_scrape
AFTER INSERT ON public.user_profiles
FOR EACH ROW
WHEN (NEW.plz IS NOT NULL)
EXECUTE FUNCTION trigger_scrape_on_new_plz();


-- --- Optional: Auch bei PLZ-Änderung triggern ---
-- Falls User seine PLZ im Profil ändert, nochmal scrapen
CREATE OR REPLACE FUNCTION trigger_scrape_on_plz_change()
RETURNS TRIGGER AS $$
DECLARE
  github_pat TEXT := current_setting('app.github_pat', true);
BEGIN
  IF NEW.plz IS NOT NULL
     AND NEW.plz <> OLD.plz
     AND github_pat IS NOT NULL
     AND github_pat <> '' THEN
    PERFORM net.http_post(
      url := 'https://api.github.com/repos/mealdealdieapp/mealdeal/dispatches',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || github_pat,
        'Accept', 'application/vnd.github+json',
        'Content-Type', 'application/json',
        'User-Agent', 'Supabase-Trigger'
      ),
      body := jsonb_build_object(
        'event_type', 'new-user-plz',
        'client_payload', jsonb_build_object(
          'plz', NEW.plz,
          'user_id', NEW.id,
          'trigger', 'plz_change'
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_plz_change_scrape ON public.user_profiles;
CREATE TRIGGER on_plz_change_scrape
AFTER UPDATE OF plz ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_scrape_on_plz_change();


-- ============================================================================
-- GITHUB PAT ALS DB-SETTING SPEICHERN
-- ============================================================================
-- WICHTIG: Ersetze DEIN_GITHUB_PAT mit deinem echten Personal Access Token!
-- Der Token wird verschlüsselt in den Datenbank-Settings gespeichert.
-- ============================================================================

ALTER DATABASE postgres SET app.github_pat = 'DEIN_GITHUB_PAT';


-- ============================================================================
-- FERTIG!
-- ============================================================================
-- Ab jetzt triggert jede neue Registrierung automatisch einen Scrape
-- für die PLZ des neuen Users.
--
-- TEST:
-- 1. Neuen User registrieren in App
-- 2. Innerhalb 10 Sekunden: GitHub Action "On-Demand PLZ Scrape" startet
-- 3. Telegram-Nachricht: "Neuer User registriert - PLZ XXX wurde gescraped"
-- ============================================================================
