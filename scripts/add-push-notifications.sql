-- ============================================================================
-- Web Push - Subscriptions + Audit-Log
-- Idempotent. Voraussetzung: auth.users, user_profiles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. push_subscriptions: aktive Browser-Subscriptions pro User
--    Ein User kann mehrere Subscriptions haben (Desktop + Mobile getrennt).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Pro User darf eine Endpoint-URL nur 1x existieren
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user
  ON public.push_subscriptions(user_id);

-- ----------------------------------------------------------------------------
-- 2. push_preferences: Funktion vs. Marketing (§7 UWG)
--    Default: Funktion an (mit Permission-Grant impliziert), Marketing aus.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_plan_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  offer_ending_soon BOOLEAN NOT NULL DEFAULT TRUE,
  new_offers_in_plz BOOLEAN NOT NULL DEFAULT FALSE,
  marketing BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. push_log: Versand-Audit + Opt-out-Tracking + Fehler
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN (
      'weekly_plan_reminder',
      'offer_ending_soon',
      'new_offers_in_plz',
      'marketing'
    )),
  payload_title TEXT,
  payload_body TEXT,
  payload_url TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('sent', 'failed', 'gone', 'skipped_no_consent')),
  http_status INTEGER,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_log_user_sent
  ON public.push_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_log_trigger
  ON public.push_log(trigger_type, sent_at DESC);

-- ----------------------------------------------------------------------------
-- 4. RLS-Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_log          ENABLE ROW LEVEL SECURITY;

-- subscriptions
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- preferences
DROP POLICY IF EXISTS "Users manage own push preferences" ON public.push_preferences;
CREATE POLICY "Users manage own push preferences"
  ON public.push_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- log: User darf nur eigene Logs lesen, Schreiben nur Service-Role (Workflow)
DROP POLICY IF EXISTS "Users read own push log" ON public.push_log;
CREATE POLICY "Users read own push log"
  ON public.push_log FOR SELECT
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Helper-RPC: Eigene Subscription anlegen + Preferences-Default
--    Nutzt SECURITY INVOKER, also greift RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_sub_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_seen_at)
  VALUES (v_user_id, p_endpoint, p_p256dh, p_auth, p_user_agent, NOW())
  ON CONFLICT (user_id, endpoint)
  DO UPDATE SET
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    last_seen_at = NOW()
  RETURNING id INTO v_sub_id;

  -- Default-Preferences anlegen, falls noch keine existieren
  INSERT INTO public.push_preferences (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_endpoint TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.push_subscriptions
   WHERE user_id = auth.uid() AND endpoint = p_endpoint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_push_subscription(TEXT) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Push-Notifications-Schema bereit:';
  RAISE NOTICE '  - push_subscriptions';
  RAISE NOTICE '  - push_preferences';
  RAISE NOTICE '  - push_log';
  RAISE NOTICE '  - RPC upsert_push_subscription, delete_push_subscription';
END$$;
