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
