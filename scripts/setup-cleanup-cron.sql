/**
 * MealDeal — Automatischer Cleanup von abgelaufenen Angeboten
 *
 * HINWEIS FÜR JO:
 * ===============
 * Diese SQL erstellt einen automatischen Job der täglich um 3:00 Uhr morgens
 * alle abgelaufenen Angebote aus der Datenbank löscht.
 *
 * INSTALLATION:
 * 1. Gehe zu deinem Supabase Projekt: https://supabase.com
 * 2. Klick auf dein Projekt "MealDeal"
 * 3. Gehe zum "SQL Editor" (linke Seite)
 * 4. Klick auf "New Query"
 * 5. Kopiere den Code unten (ab "-- SQL Anfang") in den Editor
 * 6. Klick auf "Run" (grüner Knopf oben rechts)
 * 7. Fertig! Der Job läuft jetzt täglich.
 *
 * ÜBERPRÜFEN:
 * Um zu sehen ob der Job funktioniert:
 * 1. Gehe zu "Extensions" im Supabase Dashboard
 * 2. Suche nach "pg_cron"
 * 3. Klick auf den Namen des Jobs "cleanup_expired_offers"
 * 4. Du siehst die letzten Läufe und ob alles ok ist
 *
 * LÖSCHEN (Falls man den Job nicht mehr braucht):
 * Führe folgende SQL aus:
 *   SELECT cron.unschedule('cleanup_expired_offers');
 *
 * ============================================================
 */

-- SQL Anfang

-- Aktiviere pg_cron Extension (wenn nicht schon geschehen)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Erstelle einen geplanten Job der täglich um 3:00 Uhr läuft
-- Schedule Format: 'minute hour day_of_month month day_of_week'
-- '0 3 * * *' bedeutet: 0 Minuten, 3 Uhr, jeden Tag
SELECT cron.schedule(
  'cleanup_expired_offers',          -- Job Name (für Verwaltung)
  '0 3 * * *',                       -- Täglich um 03:00 Uhr (UTC)
  $$
    -- Lösche alle Angebote die abgelaufen sind
    DELETE FROM offers
    WHERE valid_until < CURRENT_DATE;
  $$
);

-- Optional: Logs aktivieren (zeigt was gelöscht wurde)
-- Nutze danach:
--   SELECT * FROM cron.job_run_details
--   WHERE job_name = 'cleanup_expired_offers'
--   ORDER BY start_time DESC LIMIT 10;

-- SQL Ende

/**
 * ERKLÄRUNG:
 *
 * Was passiert:
 * - Jeden Tag um 03:00 Uhr UTC werden alle Angebote gelöscht
 * - bei denen valid_until < heutige Datum
 * - D.h. wenn valid_until = "2026-04-08" und heute ist "2026-04-09",
 *   dann wird das Angebot gelöscht
 *
 * Timing:
 * - UTC 03:00 = Winterzeit 04:00 MESZ
 * - UTC 03:00 = Sommerzeit 05:00 CEST
 * - Falls du eine andere Zeit möchtest, ändere die '0 3 * * *'
 *   Beispiele:
 *   '0 2 * * *' = 02:00 Uhr (eine Stunde früher)
 *   '0 4 * * *' = 04:00 Uhr (eine Stunde später)
 *   '30 3 * * *' = 03:30 Uhr (um die halbe Stunde)
 *
 * Fehlertoleranz:
 * - Falls der Job fehlschlägt, versucht Supabase es erneut
 * - Du siehst die Fehler im Supabase Dashboard unter Extensions > pg_cron
 *
 * Performance:
 * - Der DELETE wird schnell ausgeführt (nur Zeilen mit altem Datum)
 * - Hat keinen negativen Einfluss auf die App
 * - Läuft um 3 Uhr wenn normalerweise niemand aktiv ist
 */
