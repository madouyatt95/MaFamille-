CREATE OR REPLACE FUNCTION public.cleanup_scheduled_push_reminders()
RETURNS TABLE(deleted_events INTEGER, deleted_reminders INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_events INTEGER := 0;
  v_deleted_reminders INTEGER := 0;
BEGIN
  DELETE FROM public.scheduled_push_reminders
  WHERE (
    status IN ('sent', 'failed')
    AND updated_at < now() - INTERVAL '90 days'
  )
  OR (
    status = 'pending'
    AND scheduled_at < now() - INTERVAL '7 days'
  );

  GET DIAGNOSTICS v_deleted_reminders = ROW_COUNT;

  DELETE FROM public.external_calendar_events
  WHERE end_at < now() - INTERVAL '6 months'
     OR start_at > now() + INTERVAL '18 months';

  GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_events, v_deleted_reminders;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_scheduled_push_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_scheduled_push_reminders() TO service_role;

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
  PERFORM public.cleanup_scheduled_push_reminders();

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
