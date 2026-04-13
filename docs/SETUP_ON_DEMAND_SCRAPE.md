# On-Demand Scrape Setup — Neu-Registrierung triggert sofortigen Scrape

## Was macht das?

Wenn sich ein User mit einer neuen PLZ registriert, wird sofort ein Scrape für diese PLZ angestoßen. So sieht der User innerhalb von ~30 Sekunden Angebote, statt bis Samstag zu warten.

**Flow:**
```
User Registrierung → Supabase INSERT user_profiles → Database Webhook → GitHub API → GitHub Action: on-demand-scrape → Scraper läuft für PLZ-Präfix → Angebote in DB
```

## Teil 1 — GitHub Personal Access Token erstellen (3 Min)

GitHub muss vom Supabase Webhook getriggert werden können. Dafür brauchen wir einen Personal Access Token (PAT).

1. Öffne: **https://github.com/settings/personal-access-tokens/new**
   - (Falls du auf die alte "Tokens (classic)" Seite willst: https://github.com/settings/tokens/new)

2. **Fine-grained token (empfohlen):**
   - **Token name**: `Supabase Webhook - MealDeal Scrape`
   - **Expiration**: 1 Jahr (oder länger)
   - **Resource owner**: `mealdealdieapp`
   - **Repository access**: "Only select repositories" → `mealdeal` auswählen
   - **Repository permissions**:
     - `Contents`: Read and write
     - `Actions`: Read and write
   - **"Generate token"** klicken
   - **Token sofort kopieren** (beginnt mit `github_pat_...`) — wird nur einmal angezeigt!

## Teil 2 — Supabase Database Webhook erstellen (5 Min)

1. Öffne: **https://supabase.com/dashboard/project/wjhesvkapqrsbibqjbtr/database/hooks**

2. **"Create a new hook"** klicken

3. Formular ausfüllen:
   - **Name**: `trigger_scrape_on_new_user`
   - **Conditions to fire hook**:
     - **Table**: `user_profiles`
     - **Events**: ✅ Insert (nur Insert, nicht Update/Delete)
   - **Webhook configuration**:
     - **Type**: `HTTP Request`
     - **Method**: `POST`
     - **URL**:
       ```
       https://api.github.com/repos/mealdealdieapp/mealdeal/dispatches
       ```
     - **HTTP Headers** (füge 3 Headers hinzu):
       | Name | Value |
       |------|-------|
       | `Authorization` | `Bearer DEIN_GITHUB_PAT` *(ersetze mit dem kopierten Token)* |
       | `Accept` | `application/vnd.github+json` |
       | `Content-Type` | `application/json` |
     - **HTTP Parameters**: (leer lassen)

4. **Payload/Body** — Supabase schickt standardmäßig ein JSON-Objekt mit `record.plz`. GitHub erwartet aber ein bestimmtes Format. Lösung: Supabase unterstützt keine direkte Body-Transformation, daher nutzen wir einen **Wrapper via PostgreSQL Function** (siehe Teil 3 unten).

   **Falls Supabase Dashboard eine "Payload"-Option hat, trag ein:**
   ```json
   {
     "event_type": "new-user-plz",
     "client_payload": {
       "plz": "{{record.plz}}"
     }
   }
   ```

5. **"Create webhook"** klicken

## Teil 3 — Alternative: PostgreSQL Trigger mit pg_net (sauberer)

Falls der Webhook oben nicht funktioniert weil das Body-Format nicht stimmt, nutzen wir direkt einen Postgres-Trigger. Führe diese SQL über die DB-Migration aus:

**Datei `scripts/setup-ondemand-trigger.sql`** (bereits vorbereitet):

```sql
-- pg_net Extension aktivieren (für HTTP Calls aus der DB)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function die GitHub triggert
CREATE OR REPLACE FUNCTION trigger_scrape_on_new_plz()
RETURNS TRIGGER AS $$
DECLARE
  github_pat TEXT := current_setting('app.github_pat', true);
BEGIN
  IF NEW.plz IS NOT NULL AND github_pat IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://api.github.com/repos/mealdealdieapp/mealdeal/dispatches',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || github_pat,
        'Accept', 'application/vnd.github+json',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'event_type', 'new-user-plz',
        'client_payload', jsonb_build_object('plz', NEW.plz)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auf user_profiles
DROP TRIGGER IF EXISTS on_new_user_scrape ON public.user_profiles;
CREATE TRIGGER on_new_user_scrape
AFTER INSERT ON public.user_profiles
FOR EACH ROW
WHEN (NEW.plz IS NOT NULL)
EXECUTE FUNCTION trigger_scrape_on_new_plz();

-- GitHub PAT als Datenbank-Setting speichern (einmalig)
-- IMPORTANT: Ersetze DEIN_PAT mit deinem echten Token bevor du das ausführst!
ALTER DATABASE postgres SET app.github_pat = 'DEIN_PAT';
```

**Ausführen:**
1. GitHub Actions → "DB-Migration ausführen" → `setup-ondemand-trigger.sql` auswählen
2. Vorher im SQL File `DEIN_PAT` durch den echten Token ersetzen und committen

## Teil 4 — Test

1. Registriere einen neuen Test-User in der MealDeal App mit einer "neuen" PLZ (z.B. eine die noch kein User hat)
2. Innerhalb von ~30 Sekunden solltest du eine Telegram-Nachricht bekommen:
   > 🆕 Neuer User registriert — PLZ 80331 (Präfix 803) wurde sofort gescraped.
3. Check in Supabase → Table Editor → `offers` → Filter nach `plz_prefix = 803` → sollte viele Einträge haben

## Troubleshooting

**Problem**: Webhook feuert aber GitHub Action startet nicht
- **Fix**: GitHub PAT abgelaufen? Falsche Permissions? Neu erstellen mit `Actions: Read and write` Rechten.

**Problem**: GitHub Action startet, Scrape schlägt fehl
- **Fix**: Siehe Actions Log. Meist: `SUPABASE_SERVICE_KEY` oder `MARKTGURU_API_KEY` falsch gesetzt.

**Problem**: Scrape läuft durch aber User sieht keine Angebote in App
- **Fix**: Check ob `plz_prefix` korrekt gespeichert wurde (erste 3 Stellen der User-PLZ). Check `offers` Tabelle.
