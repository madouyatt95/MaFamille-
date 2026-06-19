CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.foyer_parent_pins (
  foyer_id UUID PRIMARY KEY REFERENCES public.foyers(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.foyer_parent_pin_attempts (
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (foyer_id, user_id)
);

ALTER TABLE public.foyer_parent_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foyer_parent_pin_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'foyers'
      AND column_name = 'parent_pin'
  ) THEN
    INSERT INTO public.foyer_parent_pins (foyer_id, pin_hash)
    SELECT id, extensions.crypt(parent_pin, extensions.gen_salt('bf', 10))
    FROM public.foyers
    WHERE parent_pin ~ '^[0-9]{4}$'
    ON CONFLICT (foyer_id) DO NOTHING;

    ALTER TABLE public.foyers DROP COLUMN parent_pin;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_foyer_parent_pin(
  p_foyer_id UUID,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_format');
  END IF;

  IF p_pin IN ('0000', '1111', '1234', '4321') OR p_pin ~ '^([0-9])\1{3}$' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'weak_pin');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.foyer_members
    WHERE foyer_id = p_foyer_id
      AND user_id = auth.uid()
      AND approved IS TRUE
      AND role IN ('admin', 'parent')
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
  END IF;

  INSERT INTO public.foyer_parent_pins (foyer_id, pin_hash, updated_at)
  VALUES (
    p_foyer_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
    NOW()
  )
  ON CONFLICT (foyer_id)
  DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = NOW();

  DELETE FROM public.foyer_parent_pin_attempts
  WHERE foyer_id = p_foyer_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_foyer_parent_pin(
  p_foyer_id UUID,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin_hash TEXT;
  v_attempt public.foyer_parent_pin_attempts%ROWTYPE;
  v_failed_count INTEGER;
  v_locked_until TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_format');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.foyer_members
    WHERE foyer_id = p_foyer_id
      AND user_id = auth.uid()
      AND approved IS TRUE
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;

  SELECT *
  INTO v_attempt
  FROM public.foyer_parent_pin_attempts
  WHERE foyer_id = p_foyer_id
    AND user_id = auth.uid();

  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'locked',
      'locked_until', v_attempt.locked_until
    );
  END IF;

  SELECT pin_hash
  INTO v_pin_hash
  FROM public.foyer_parent_pins
  WHERE foyer_id = p_foyer_id;

  IF v_pin_hash IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_configured');
  END IF;

  IF extensions.crypt(p_pin, v_pin_hash) = v_pin_hash THEN
    DELETE FROM public.foyer_parent_pin_attempts
    WHERE foyer_id = p_foyer_id
      AND user_id = auth.uid();

    RETURN jsonb_build_object('allowed', true, 'reason', 'ok');
  END IF;

  v_failed_count := COALESCE(v_attempt.failed_count, 0) + 1;
  v_locked_until := CASE
    WHEN v_failed_count >= 5 THEN NOW() + INTERVAL '5 minutes'
    ELSE NULL
  END;

  INSERT INTO public.foyer_parent_pin_attempts (
    foyer_id,
    user_id,
    failed_count,
    locked_until,
    updated_at
  )
  VALUES (
    p_foyer_id,
    auth.uid(),
    CASE WHEN v_failed_count >= 5 THEN 0 ELSE v_failed_count END,
    v_locked_until,
    NOW()
  )
  ON CONFLICT (foyer_id, user_id)
  DO UPDATE SET
    failed_count = EXCLUDED.failed_count,
    locked_until = EXCLUDED.locked_until,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'allowed', false,
    'reason', CASE WHEN v_locked_until IS NULL THEN 'incorrect' ELSE 'locked' END,
    'attempts_remaining', GREATEST(5 - v_failed_count, 0),
    'locked_until', v_locked_until
  );
END;
$$;

REVOKE ALL ON TABLE public.foyer_parent_pins FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.foyer_parent_pin_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_foyer_parent_pin(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_foyer_parent_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_foyer_parent_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_foyer_parent_pin(UUID, TEXT) TO authenticated;
