CREATE OR REPLACE FUNCTION public.trigger_send_push()
RETURNS TRIGGER AS $$
DECLARE
  v_payload jsonb;
BEGIN
  v_payload := json_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'schema', TG_TABLE_SCHEMA
  )::jsonb;

  BEGIN
    PERFORM net.http_post(
      url := 'https://zjhxombzoilbchxftszb.supabase.co/functions/v1/send-push'::text,
      body := v_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaHhvbWJ6b2lsYmNoeGZ0c3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDEzNDMsImV4cCI6MjA5NDg3NzM0M30.3F0DEZC-iJSPEqkRzPdWO-ZRb5IK9G-5eXpJTgMooXE',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaHhvbWJ6b2lsYmNoeGZ0c3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDEzNDMsImV4cCI6MjA5NDg3NzM0M30.3F0DEZC-iJSPEqkRzPdWO-ZRb5IK9G-5eXpJTgMooXE'
      ),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Échec de l''envoi push FCM : %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
