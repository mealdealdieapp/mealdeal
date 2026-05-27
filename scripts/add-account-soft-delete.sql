-- ============================================================================
-- DSGVO Art. 17 - "Recht auf Loeschung"
-- Soft-Delete-Mechanik fuer User-Accounts. Ein Cron-Job (separat) raeumt
-- nach 30 Tagen via service_role hart auf (loescht auth.user + Daten).
-- Idempotent.
-- ============================================================================

-- Soft-Delete-Spalte
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at
  ON public.user_profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- RPC: request_account_deletion
-- Setzt `deleted_at` und sperrt den Account-Zugriff sofort (Logout-Trigger).
-- User darf nur seinen eigenen Account markieren.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_profiles
     SET deleted_at = NOW(),
         -- Sensible Felder direkt anonymisieren
         weight = NULL,
         height = NULL,
         age = NULL,
         gender = NULL,
         activity = NULL,
         goal = NULL,
         cal_target = NULL,
         protein_target = NULL,
         carbs_target = NULL,
         fat_target = NULL,
         updated_at = NOW()
   WHERE id = v_user_id;

  -- Aktive Einwilligungen ebenfalls widerrufen
  UPDATE public.consent_log
     SET revoked_at = NOW()
   WHERE user_id = v_user_id
     AND revoked_at IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'requested_at', NOW(),
    'hard_delete_after', NOW() + INTERVAL '30 days'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- ----------------------------------------------------------------------------
-- RPC: export_my_data
-- Liefert alle User-bezogenen Daten als JSON. Frontend kann das in eine
-- Datei schreiben und herunterladen lassen.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'export_version', 'v1',
    'exported_at', NOW(),
    'user_id', v_user_id,
    'profile', (
      SELECT to_jsonb(up.*) FROM public.user_profiles up WHERE up.id = v_user_id
    ),
    'consent_log', COALESCE((
      SELECT jsonb_agg(to_jsonb(c.*)) FROM public.consent_log c WHERE c.user_id = v_user_id
    ), '[]'::jsonb),
    'saved_recipes', COALESCE((
      SELECT jsonb_agg(to_jsonb(s.*)) FROM public.saved_recipes s WHERE s.user_id = v_user_id
    ), '[]'::jsonb),
    'custom_recipes', COALESCE((
      SELECT jsonb_agg(to_jsonb(cr.*)) FROM public.custom_recipes cr WHERE cr.user_id = v_user_id
    ), '[]'::jsonb),
    'weekly_plans', COALESCE((
      SELECT jsonb_agg(to_jsonb(w.*)) FROM public.weekly_plans w WHERE w.user_id = v_user_id
    ), '[]'::jsonb),
    'shopping_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(si.*)) FROM public.shopping_items si WHERE si.user_id = v_user_id
    ), '[]'::jsonb),
    'purchase_log', COALESCE((
      SELECT jsonb_agg(to_jsonb(pl.*)) FROM public.purchase_log pl WHERE pl.user_id = v_user_id
    ), '[]'::jsonb),
    'watchlist', COALESCE((
      SELECT jsonb_agg(to_jsonb(wl.*)) FROM public.watchlist wl WHERE wl.user_id = v_user_id
    ), '[]'::jsonb),
    'feedback', COALESCE((
      SELECT jsonb_agg(to_jsonb(f.*)) FROM public.feedback f WHERE f.user_id = v_user_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Account-Soft-Delete + Datenexport aktiv:';
  RAISE NOTICE '  - user_profiles.deleted_at angelegt';
  RAISE NOTICE '  - RPC request_account_deletion()';
  RAISE NOTICE '  - RPC export_my_data()';
  RAISE NOTICE 'Hinweis: Ein separater Cron-Job muss alte deleted_at-Eintraege hart loeschen.';
END$$;
