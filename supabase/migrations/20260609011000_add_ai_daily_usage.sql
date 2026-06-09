CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (foyer_id, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_ai_quota_for_foyer(p_foyer_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_member BOOLEAN;
  v_is_premium BOOLEAN;
  v_usage INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated', 'remaining', 0, 'limit', p_limit);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.foyer_members
    WHERE foyer_id = p_foyer_id
      AND user_id = v_user_id
      AND approved IS DISTINCT FROM false
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_foyer_member', 'remaining', 0, 'limit', p_limit);
  END IF;

  SELECT COALESCE(is_premium, false)
  INTO v_is_premium
  FROM public.foyers
  WHERE id = p_foyer_id;

  IF NOT COALESCE(v_is_premium, false) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_premium', 'remaining', 0, 'limit', p_limit);
  END IF;

  INSERT INTO public.ai_daily_usage (foyer_id, usage_date, count)
  VALUES (p_foyer_id, CURRENT_DATE, 1)
  ON CONFLICT (foyer_id, usage_date)
  DO UPDATE SET
    count = public.ai_daily_usage.count + 1,
    updated_at = NOW()
  WHERE public.ai_daily_usage.count < p_limit
  RETURNING count INTO v_usage;

  IF v_usage IS NULL THEN
    SELECT count
    INTO v_usage
    FROM public.ai_daily_usage
    WHERE foyer_id = p_foyer_id
      AND usage_date = CURRENT_DATE;

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exhausted',
      'remaining', 0,
      'limit', p_limit,
      'count', COALESCE(v_usage, p_limit)
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'remaining', GREATEST(p_limit - v_usage, 0),
    'limit', p_limit,
    'count', v_usage
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota_for_foyer(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota_for_foyer(UUID, INTEGER) TO authenticated;

