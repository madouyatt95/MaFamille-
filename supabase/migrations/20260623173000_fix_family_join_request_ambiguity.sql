CREATE OR REPLACE FUNCTION public.normalize_foyer_invite_code(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.request_family_join_by_code(
  p_invite_code TEXT,
  p_applicant_name TEXT,
  p_applicant_email TEXT DEFAULT NULL,
  p_applicant_avatar TEXT DEFAULT NULL,
  p_requested_by_qr BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  request_id UUID,
  family_id UUID,
  family_name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_foyer public.foyers;
  v_request public.family_join_requests;
  v_existing_request_id UUID;
  v_normalized_code TEXT := public.normalize_foyer_invite_code(p_invite_code);
  v_name TEXT := left(trim(COALESCE(p_applicant_name, '')), 80);
  v_email TEXT := NULLIF(left(trim(COALESCE(p_applicant_email, '')), 320), '');
  v_avatar TEXT := NULLIF(left(trim(COALESCE(p_applicant_avatar, '')), 2048), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF length(v_normalized_code) < 6 OR length(v_name) < 1 THEN
    RAISE EXCEPTION 'Code d''invitation invalide';
  END IF;

  SELECT f.*
  INTO v_foyer
  FROM public.foyers AS f
  WHERE public.normalize_foyer_invite_code(f.invite_code) = v_normalized_code
  LIMIT 1;

  IF v_foyer.id IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.foyer_members AS member
    WHERE member.foyer_id = v_foyer.id
      AND member.user_id = auth.uid()
      AND member.approved IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Vous êtes déjà membre de ce foyer';
  END IF;

  SELECT request_row.id
  INTO v_existing_request_id
  FROM public.family_join_requests AS request_row
  WHERE request_row.family_id = v_foyer.id
    AND request_row.applicant_user_id = auth.uid()
  LIMIT 1;

  IF v_existing_request_id IS NULL THEN
    INSERT INTO public.family_join_requests (
      family_id,
      applicant_user_id,
      applicant_name,
      applicant_email,
      applicant_avatar,
      status,
      requested_by_code,
      requested_by_qr
    )
    VALUES (
      v_foyer.id,
      auth.uid(),
      v_name,
      v_email,
      v_avatar,
      'pending',
      NOT p_requested_by_qr,
      p_requested_by_qr
    )
    RETURNING public.family_join_requests.* INTO v_request;
  ELSE
    UPDATE public.family_join_requests AS request_row
    SET
      applicant_name = v_name,
      applicant_email = v_email,
      applicant_avatar = v_avatar,
      status = 'pending',
      requested_by_code = NOT p_requested_by_qr,
      requested_by_qr = p_requested_by_qr,
      created_at = now()
    WHERE request_row.id = v_existing_request_id
    RETURNING request_row.* INTO v_request;
  END IF;

  RETURN QUERY
  SELECT v_request.id, v_foyer.id, v_foyer.name, v_request.status;
END;
$$;

REVOKE ALL ON FUNCTION public.request_family_join_by_code(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_family_join_by_code(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
