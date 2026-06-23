CREATE OR REPLACE FUNCTION public.join_family_game_room(
  p_foyer_id UUID,
  p_room_code TEXT,
  p_guest_name TEXT
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
BEGIN
  PERFORM public.enforce_family_game_rate_limit('join_room', 12, interval '1 minute');
  IF p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à ce foyer';
  END IF;

  SELECT * INTO v_room
  FROM public.family_game_rooms
  WHERE room_code = upper(trim(p_room_code))
    AND status = 'waiting'
    AND expires_at > now()
  FOR UPDATE;

  IF v_room.id IS NULL THEN RAISE EXCEPTION 'Code invalide ou partie expirée'; END IF;
  IF v_room.host_user_id = auth.uid() THEN RAISE EXCEPTION 'Un autre compte doit rejoindre cette partie'; END IF;
  IF v_room.host_foyer_id = p_foyer_id AND v_room.game_type NOT IN ('battleship', 'connect4', 'family-challenge') THEN
    RAISE EXCEPTION 'Le duel sur deux écrans dans un même foyer est disponible pour les jeux à deux joueurs';
  END IF;

  UPDATE public.family_game_rooms
  SET guest_foyer_id = p_foyer_id,
      guest_user_id = auth.uid(),
      guest_name = left(trim(p_guest_name), 80),
      status = 'active',
      updated_at = now()
  WHERE id = v_room.id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.join_family_game_room(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_family_game_room(UUID, TEXT, TEXT) TO authenticated;
