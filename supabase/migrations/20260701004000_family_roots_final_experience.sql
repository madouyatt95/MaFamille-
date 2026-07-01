-- Racines familiales: experience finale, souvenirs visuels et annulation de correction.

ALTER TABLE public.family_tree_memories
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE OR REPLACE FUNCTION public.undo_family_tree_correction(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.family_tree_correction_requests;
BEGIN
  SELECT * INTO v_request
  FROM public.family_tree_correction_requests
  WHERE id = p_request_id AND status = 'accepted'
  FOR UPDATE;

  IF v_request.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_request.foyer_id) THEN
    RAISE EXCEPTION 'Correction introuvable ou acces refuse';
  END IF;

  UPDATE public.family_tree_profiles
  SET
    display_name = CASE WHEN v_request.field_name = 'display_name' THEN COALESCE(NULLIF(v_request.current_value, ''), display_name) ELSE display_name END,
    nickname = CASE WHEN v_request.field_name = 'nickname' THEN NULLIF(v_request.current_value, '') ELSE nickname END,
    birth_date = CASE WHEN v_request.field_name = 'birth_date' THEN NULLIF(v_request.current_value, '')::DATE ELSE birth_date END,
    death_date = CASE WHEN v_request.field_name = 'death_date' THEN NULLIF(v_request.current_value, '')::DATE ELSE death_date END,
    branch = CASE WHEN v_request.field_name = 'branch' AND v_request.current_value IN ('proche', 'paternelle', 'maternelle', 'autre') THEN v_request.current_value ELSE branch END,
    country = CASE WHEN v_request.field_name = 'country' THEN NULLIF(v_request.current_value, '') ELSE country END,
    origin_city = CASE WHEN v_request.field_name = 'origin_city' THEN NULLIF(v_request.current_value, '') ELSE origin_city END,
    bio = CASE WHEN v_request.field_name = 'bio' THEN NULLIF(v_request.current_value, '') ELSE bio END,
    languages = CASE
      WHEN v_request.field_name = 'languages' AND COALESCE(TRIM(v_request.current_value), '') = '' THEN ARRAY[]::TEXT[]
      WHEN v_request.field_name = 'languages' THEN REGEXP_SPLIT_TO_ARRAY(v_request.current_value, '\\s*,\\s*')
      ELSE languages
    END,
    updated_at = NOW()
  WHERE id = v_request.profile_id AND foyer_id = v_request.foyer_id;

  UPDATE public.family_tree_correction_requests
  SET status = 'cancelled', reviewed_by = AUTH.UID(), reviewed_at = NOW()
  WHERE id = p_request_id;

  PERFORM public.log_family_tree_validation(
    v_request.foyer_id,
    'correction_annulée',
    'Une correction validée récemment a été annulée.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.undo_family_tree_correction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_family_tree_correction(UUID) TO authenticated;
