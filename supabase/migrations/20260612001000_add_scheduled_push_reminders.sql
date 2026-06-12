CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE TABLE IF NOT EXISTS public.external_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  source_id TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_color TEXT,
  member_id UUID REFERENCES public.foyer_members(id) ON DELETE SET NULL,
  imported_by_member_id UUID REFERENCES public.foyer_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  raw_event JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (foyer_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_calendar_events_foyer_start
  ON public.external_calendar_events(foyer_id, start_at);

CREATE TABLE IF NOT EXISTS public.scheduled_push_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_event_id UUID REFERENCES public.external_calendar_events(id) ON DELETE CASCADE,
  reminder_key TEXT NOT NULL,
  target_module TEXT NOT NULL DEFAULT 'agenda',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (foyer_id, reminder_key)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_push_reminders_pending
  ON public.scheduled_push_reminders(status, scheduled_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.touch_external_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_external_calendar_events_updated_at ON public.external_calendar_events;
CREATE TRIGGER tr_external_calendar_events_updated_at
  BEFORE UPDATE ON public.external_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_external_calendar_events_updated_at();

CREATE OR REPLACE FUNCTION public.touch_scheduled_push_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_scheduled_push_reminders_updated_at ON public.scheduled_push_reminders;
CREATE TRIGGER tr_scheduled_push_reminders_updated_at
  BEFORE UPDATE ON public.scheduled_push_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_scheduled_push_reminders_updated_at();

ALTER TABLE public.external_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_push_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "external_calendar_events_select" ON public.external_calendar_events;
DROP POLICY IF EXISTS "external_calendar_events_insert" ON public.external_calendar_events;
DROP POLICY IF EXISTS "external_calendar_events_update" ON public.external_calendar_events;
DROP POLICY IF EXISTS "external_calendar_events_delete" ON public.external_calendar_events;

CREATE POLICY "external_calendar_events_select" ON public.external_calendar_events
  FOR SELECT TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "external_calendar_events_insert" ON public.external_calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "external_calendar_events_update" ON public.external_calendar_events
  FOR UPDATE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()))
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "external_calendar_events_delete" ON public.external_calendar_events
  FOR DELETE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

DROP POLICY IF EXISTS "scheduled_push_reminders_select" ON public.scheduled_push_reminders;
CREATE POLICY "scheduled_push_reminders_select" ON public.scheduled_push_reminders
  FOR SELECT TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE OR REPLACE FUNCTION public.process_scheduled_push_reminders(batch_size INTEGER DEFAULT 100)
RETURNS TABLE(enqueued INTEGER, sent INTEGER, failed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, vault
AS $$
DECLARE
  v_function_url TEXT;
  v_anon_key TEXT;
  v_push_secret TEXT;
  v_reminder RECORD;
  v_request_id BIGINT;
  v_enqueued INTEGER := 0;
  v_sent INTEGER := 0;
  v_failed INTEGER := 0;
BEGIN
  INSERT INTO public.scheduled_push_reminders (
    foyer_id,
    source_table,
    source_event_id,
    reminder_key,
    target_module,
    title,
    body,
    scheduled_at,
    payload
  )
  SELECT
    e.foyer_id,
    'external_calendar_events',
    e.id,
    'external-calendar-day-' || e.id::TEXT || '-' || e.start_at::DATE::TEXT,
    'agenda',
    '📅 Rappel demain : ' || e.title,
    '"' || e.title || '" est prévu le ' || to_char(e.start_at AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY')
      || CASE WHEN e.is_all_day THEN '' ELSE ' à ' || to_char(e.start_at AT TIME ZONE 'Europe/Paris', 'HH24:MI') END
      || CASE WHEN NULLIF(e.location, '') IS NULL THEN '' ELSE '. Lieu : ' || e.location END,
    e.start_at - INTERVAL '24 hours',
    jsonb_build_object('calendar_event_id', e.id, 'source_name', e.source_name, 'reminder_type', 'day')
  FROM public.external_calendar_events e
  WHERE e.start_at > now() + INTERVAL '1 hour'
    AND e.start_at <= now() + INTERVAL '24 hours'
  ON CONFLICT (foyer_id, reminder_key) DO NOTHING;

  GET DIAGNOSTICS v_enqueued = ROW_COUNT;

  INSERT INTO public.scheduled_push_reminders (
    foyer_id,
    source_table,
    source_event_id,
    reminder_key,
    target_module,
    title,
    body,
    scheduled_at,
    payload
  )
  SELECT
    e.foyer_id,
    'external_calendar_events',
    e.id,
    'external-calendar-hour-' || e.id::TEXT || '-' || to_char(e.start_at, 'YYYYMMDDHH24MI'),
    'agenda',
    '⏰ Dans 1h : ' || e.title,
    '"' || e.title || '" commence à ' || to_char(e.start_at AT TIME ZONE 'Europe/Paris', 'HH24:MI')
      || CASE WHEN NULLIF(e.location, '') IS NULL THEN '' ELSE '. Lieu : ' || e.location END,
    e.start_at - INTERVAL '1 hour',
    jsonb_build_object('calendar_event_id', e.id, 'source_name', e.source_name, 'reminder_type', 'hour')
  FROM public.external_calendar_events e
  WHERE e.is_all_day IS FALSE
    AND e.start_at > now()
    AND e.start_at <= now() + INTERVAL '1 hour'
  ON CONFLICT (foyer_id, reminder_key) DO NOTHING;

  GET DIAGNOSTICS v_failed = ROW_COUNT;
  v_enqueued := v_enqueued + v_failed;
  v_failed := 0;

  SELECT decrypted_secret INTO v_function_url
  FROM vault.decrypted_secrets
  WHERE name IN ('send_push_url_v2', 'send_push_url')
  ORDER BY CASE WHEN name = 'send_push_url_v2' THEN 0 ELSE 1 END,
           updated_at DESC NULLS LAST,
           created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_anon_key
  FROM vault.decrypted_secrets
  WHERE name IN ('supabase_anon_key_v2', 'supabase_anon_key')
  ORDER BY CASE WHEN name = 'supabase_anon_key_v2' THEN 0 ELSE 1 END,
           updated_at DESC NULLS LAST,
           created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_push_secret
  FROM vault.decrypted_secrets
  WHERE name IN ('push_webhook_secret_v2', 'push_webhook_secret')
  ORDER BY CASE WHEN name = 'push_webhook_secret_v2' THEN 0 ELSE 1 END,
           updated_at DESC NULLS LAST,
           created_at DESC
  LIMIT 1;

  IF v_function_url IS NULL OR v_anon_key IS NULL OR v_push_secret IS NULL THEN
    RAISE WARNING 'Scheduled push reminders skipped: missing Vault secrets.';
    RETURN QUERY SELECT v_enqueued, v_sent, v_failed;
    RETURN;
  END IF;

  FOR v_reminder IN
    SELECT *
    FROM public.scheduled_push_reminders
    WHERE status = 'pending'
      AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
    LIMIT GREATEST(batch_size, 1)
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      SELECT net.http_post(
        url := v_function_url,
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'scheduled_push_reminders',
          'record', jsonb_build_object(
            'id', v_reminder.id,
            'foyer_id', v_reminder.foyer_id,
            'title', v_reminder.title,
            'body', v_reminder.body,
            'target_module', v_reminder.target_module,
            'scheduled_at', v_reminder.scheduled_at,
            'payload', v_reminder.payload
          ),
          'old_record', NULL,
          'schema', 'public'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', v_anon_key,
          'Authorization', 'Bearer ' || v_anon_key,
          'x-push-webhook-secret', v_push_secret
        ),
        timeout_milliseconds := 5000
      ) INTO v_request_id;

      UPDATE public.scheduled_push_reminders
      SET status = 'sent', sent_at = now(), error = NULL
      WHERE id = v_reminder.id;
      v_sent := v_sent + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.scheduled_push_reminders
      SET status = 'failed', error = SQLERRM
      WHERE id = v_reminder.id;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_enqueued, v_sent, v_failed;
END;
$$;

REVOKE ALL ON FUNCTION public.process_scheduled_push_reminders(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_scheduled_push_reminders(INTEGER) TO service_role;
