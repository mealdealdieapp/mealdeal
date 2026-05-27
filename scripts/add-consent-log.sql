-- ============================================================================
-- DSGVO: consent_log
-- Dokumentiert die separate, explizite Einwilligung fuer besondere Kategorien
-- personenbezogener Daten (Art. 9 DSGVO) - vor allem Gesundheitsdaten:
-- Gewicht, Groesse, Alter, Aktivitaetslevel, Ziel, kcal-Bedarf.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL
    CHECK (consent_type IN (
      'health_data',          -- Art. 9 DSGVO: Gewicht/Groesse/Alter/Aktivitaet/Ziel
      'marketing_push',       -- §7 UWG: Marketing-Benachrichtigungen
      'marketing_email'       -- §7 UWG: Marketing-Mails (zukuenftig)
    )),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  version TEXT NOT NULL DEFAULT 'v1',            -- Text der Einwilligungs-Erklaerung
  ip_hash TEXT,                                  -- gehashte IP fuer Audit (optional)
  user_agent TEXT,                               -- Browser-Info (optional, fuer Audit)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user_type
  ON public.consent_log(user_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_log_active
  ON public.consent_log(user_id, consent_type)
  WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- RLS-Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own consents" ON public.consent_log;
CREATE POLICY "Users can read own consents"
  ON public.consent_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own consents" ON public.consent_log;
CREATE POLICY "Users can insert own consents"
  ON public.consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own consents" ON public.consent_log;
CREATE POLICY "Users can update own consents"
  ON public.consent_log FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Helper-View: aktive Einwilligungen pro User
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.active_consents AS
SELECT DISTINCT ON (user_id, consent_type)
  user_id,
  consent_type,
  granted_at,
  version
FROM public.consent_log
WHERE revoked_at IS NULL
ORDER BY user_id, consent_type, granted_at DESC;

-- Die View erbt RLS von der Quelltabelle (consent_log).

DO $$
BEGIN
  RAISE NOTICE 'consent_log angelegt + RLS aktiv';
  RAISE NOTICE '  - consent_types: health_data, marketing_push, marketing_email';
  RAISE NOTICE '  - View active_consents fuer aktuell gueltige Einwilligungen';
END$$;
