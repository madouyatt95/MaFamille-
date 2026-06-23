CREATE OR REPLACE FUNCTION public.normalize_foyer_invite_code(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(upper(trim(COALESCE(p_code, ''))), '[^A-Z0-9]', '', 'g');
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
  v_normalized_code TEXT := public.normalize_foyer_invite_code(p_invite_code);
  v_name TEXT := left(trim(COALESCE(p_applicant_name, '')), 80);
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
    NULLIF(left(trim(COALESCE(p_applicant_email, '')), 320), ''),
    NULLIF(left(trim(COALESCE(p_applicant_avatar, '')), 2048), ''),
    'pending',
    NOT p_requested_by_qr,
    p_requested_by_qr
  )
  ON CONFLICT (family_id, applicant_user_id)
  DO UPDATE SET
    applicant_name = EXCLUDED.applicant_name,
    applicant_email = EXCLUDED.applicant_email,
    applicant_avatar = EXCLUDED.applicant_avatar,
    status = 'pending',
    requested_by_code = EXCLUDED.requested_by_code,
    requested_by_qr = EXCLUDED.requested_by_qr,
    created_at = now()
  RETURNING * INTO v_request;

  RETURN QUERY
  SELECT v_request.id, v_foyer.id, v_foyer.name, v_request.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_foyer_by_invite_code(p_variations TEXT[])
RETURNS TABLE(id UUID, name TEXT, invite_code TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT f.id, f.name, f.invite_code
  FROM public.foyers AS f
  WHERE public.normalize_foyer_invite_code(f.invite_code) = ANY(
    SELECT public.normalize_foyer_invite_code(value)
    FROM unnest(COALESCE(p_variations, ARRAY[]::TEXT[])) AS value
  )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_foyer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.foyer_members
    WHERE foyer_id = p_foyer_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND approved IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Seul le chef de famille peut générer un nouveau code';
  END IF;

  LOOP
    v_code := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.foyers
      WHERE public.normalize_foyer_invite_code(invite_code) = public.normalize_foyer_invite_code(v_code)
    );
  END LOOP;

  UPDATE public.foyers
  SET invite_code = v_code, updated_at = now()
  WHERE id = p_foyer_id;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_family_game_room(
  p_room_id UUID,
  p_foyer_id UUID
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
BEGIN
  SELECT *
  INTO v_room
  FROM public.family_game_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Partie introuvable';
  END IF;
  IF (
       auth.uid() IS DISTINCT FROM v_room.host_user_id
       AND auth.uid() IS DISTINCT FROM v_room.guest_user_id
     )
     OR (
       p_foyer_id IS DISTINCT FROM v_room.host_foyer_id
       AND p_foyer_id IS DISTINCT FROM v_room.guest_foyer_id
     )
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;

  UPDATE public.family_game_rooms
  SET status = 'cancelled',
      state = COALESCE(state, '{}'::jsonb) || jsonb_build_object(
        'closedByUserId', auth.uid(),
        'closedAt', now(),
        'rematchHost', false,
        'rematchGuest', false
      ),
      updated_at = now(),
      expires_at = LEAST(expires_at, now() + interval '5 minutes')
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  DELETE FROM public.family_battleship_fleets
  WHERE room_id = p_room_id;

  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_foyer_invite_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_family_join_by_code(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_invite_code(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_family_game_room(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_foyer_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_family_join_by_code(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_family_game_room(UUID, UUID) TO authenticated;
