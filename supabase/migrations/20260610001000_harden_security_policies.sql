-- Security hardening for production access.

-- 1) Replace permissive malus RLS policies with foyer-scoped policies.
ALTER TABLE public.malus_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions for authenticated users on malus_templates" ON public.malus_templates;
DROP POLICY IF EXISTS "malus_templates_select" ON public.malus_templates;
DROP POLICY IF EXISTS "malus_templates_insert" ON public.malus_templates;
DROP POLICY IF EXISTS "malus_templates_update" ON public.malus_templates;
DROP POLICY IF EXISTS "malus_templates_delete" ON public.malus_templates;

CREATE POLICY "malus_templates_select" ON public.malus_templates
  FOR SELECT TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "malus_templates_insert" ON public.malus_templates
  FOR INSERT TO authenticated
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()) AND public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY "malus_templates_update" ON public.malus_templates
  FOR UPDATE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()) AND public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()) AND public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY "malus_templates_delete" ON public.malus_templates
  FOR DELETE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()) AND public.is_foyer_admin_or_parent(foyer_id));

ALTER TABLE public.malus_applied ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions for authenticated users on malus_applied" ON public.malus_applied;
DROP POLICY IF EXISTS "malus_applied_select" ON public.malus_applied;
DROP POLICY IF EXISTS "malus_applied_insert" ON public.malus_applied;
DROP POLICY IF EXISTS "malus_applied_update" ON public.malus_applied;
DROP POLICY IF EXISTS "malus_applied_delete" ON public.malus_applied;

CREATE POLICY "malus_applied_select" ON public.malus_applied
  FOR SELECT TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "malus_applied_insert" ON public.malus_applied
  FOR INSERT TO authenticated
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()) AND public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY "malus_applied_update" ON public.malus_applied
  FOR UPDATE TO authenticated
  USING (
    foyer_id IN (SELECT public.user_foyer_ids())
    AND (
      public.is_foyer_admin_or_parent(foyer_id)
      OR member_id IN (
        SELECT id::text FROM public.foyer_members
        WHERE foyer_id = malus_applied.foyer_id AND user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    foyer_id IN (SELECT public.user_foyer_ids())
    AND (
      public.is_foyer_admin_or_parent(foyer_id)
      OR member_id IN (
        SELECT id::text FROM public.foyer_members
        WHERE foyer_id = malus_applied.foyer_id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "malus_applied_delete" ON public.malus_applied
  FOR DELETE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()) AND public.is_foyer_admin_or_parent(foyer_id));

-- 2) Remove hardcoded webhook credentials from the database trigger.
-- Required production settings, to configure outside git:
-- ALTER DATABASE postgres SET app.send_push_url = 'https://<project-ref>.supabase.co/functions/v1/send-push';
-- ALTER DATABASE postgres SET app.supabase_anon_key = '<supabase anon key>';
-- ALTER DATABASE postgres SET app.push_webhook_secret = '<same value as Edge Function PUSH_WEBHOOK_SECRET>';
CREATE OR REPLACE FUNCTION public.trigger_send_push()
RETURNS TRIGGER AS $$
DECLARE
  v_payload jsonb;
  v_function_url text;
  v_anon_key text;
  v_push_secret text;
BEGIN
  v_function_url := NULLIF(current_setting('app.send_push_url', true), '');
  v_anon_key := NULLIF(current_setting('app.supabase_anon_key', true), '');
  v_push_secret := NULLIF(current_setting('app.push_webhook_secret', true), '');

  IF v_function_url IS NULL OR v_anon_key IS NULL OR v_push_secret IS NULL THEN
    RAISE WARNING 'Push webhook settings missing: configure app.send_push_url, app.supabase_anon_key and app.push_webhook_secret.';
    RETURN NEW;
  END IF;

  v_payload := json_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    'schema', TG_TABLE_SCHEMA
  )::jsonb;

  BEGIN
    PERFORM net.http_post(
      url := v_function_url,
      body := v_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_anon_key,
        'Authorization', 'Bearer ' || v_anon_key,
        'x-push-webhook-secret', v_push_secret
      ),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Échec de l''envoi push FCM : %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
