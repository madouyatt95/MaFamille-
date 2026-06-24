CREATE OR REPLACE FUNCTION public.get_battleship_revealed_fleets(
  p_room_id UUID,
  p_foyer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_host_fleet TEXT[] := '{}';
  v_guest_fleet TEXT[] := '{}';
BEGIN
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id;
  IF v_room.id IS NULL
     OR v_room.game_type <> 'battleship'
     OR v_room.status <> 'finished'
     OR (auth.uid() <> v_room.host_user_id AND auth.uid() IS DISTINCT FROM v_room.guest_user_id)
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT fleet INTO v_host_fleet
  FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND user_id = v_room.host_user_id;

  SELECT fleet INTO v_guest_fleet
  FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND user_id = v_room.guest_user_id;

  RETURN jsonb_build_object(
    'host', COALESCE(v_host_fleet, '{}'),
    'guest', COALESCE(v_guest_fleet, '{}')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.play_private_connect4(
  p_room_id UUID,
  p_foyer_id UUID,
  p_column INTEGER
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_state JSONB;
  v_board INTEGER[];
  v_player INTEGER;
  v_row INTEGER;
  v_index INTEGER;
  v_direction INTEGER[];
  v_dr INTEGER;
  v_dc INTEGER;
  v_step INTEGER;
  v_count INTEGER;
  v_r INTEGER;
  v_c INTEGER;
  v_winner INTEGER := 0;
  v_placed BOOLEAN := false;
  v_player_cells INTEGER := 0;
BEGIN
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type <> 'connect4' OR v_room.status <> 'active' OR v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Partie de Puissance 4 indisponible';
  END IF;
  IF p_column NOT BETWEEN 0 AND 6 THEN RAISE EXCEPTION 'Colonne invalide'; END IF;
  IF auth.uid() = v_room.host_user_id THEN
    v_player := 1;
  ELSIF auth.uid() = v_room.guest_user_id THEN
    v_player := 2;
  ELSE
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF ((v_player = 1 AND p_foyer_id <> v_room.host_foyer_id) OR (v_player = 2 AND p_foyer_id <> v_room.guest_foyer_id))
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF COALESCE((v_state->>'turn')::INTEGER, 1) <> v_player THEN RAISE EXCEPTION 'Ce n’est pas votre tour'; END IF;
  SELECT COALESCE(array_agg(value::INTEGER ORDER BY ordinality), array_fill(0, ARRAY[42]))
  INTO v_board
  FROM jsonb_array_elements_text(COALESCE(v_state->'board', to_jsonb(array_fill(0, ARRAY[42]))))
    WITH ORDINALITY AS cells(value, ordinality);

  FOR v_row IN REVERSE 5..0 LOOP
    v_index := v_row * 7 + p_column + 1;
    IF v_board[v_index] = 0 THEN
      v_board[v_index] := v_player;
      v_placed := true;
      EXIT;
    END IF;
  END LOOP;
  IF NOT v_placed THEN RAISE EXCEPTION 'Cette colonne est pleine'; END IF;

  SELECT count(*) INTO v_player_cells FROM unnest(v_board) value WHERE value = v_player;
  IF v_player_cells >= 4 THEN
    FOREACH v_direction SLICE 1 IN ARRAY ARRAY[[0,1],[1,0],[1,1],[1,-1]]
    LOOP
      v_dr := v_direction[1];
      v_dc := v_direction[2];
      v_count := 1;
      FOR v_step IN 1..3 LOOP
        v_r := v_row + v_dr * v_step; v_c := p_column + v_dc * v_step;
        EXIT WHEN v_r NOT BETWEEN 0 AND 5 OR v_c NOT BETWEEN 0 AND 6 OR v_board[v_r * 7 + v_c + 1] <> v_player;
        v_count := v_count + 1;
      END LOOP;
      FOR v_step IN 1..3 LOOP
        v_r := v_row - v_dr * v_step; v_c := p_column - v_dc * v_step;
        EXIT WHEN v_r NOT BETWEEN 0 AND 5 OR v_c NOT BETWEEN 0 AND 6 OR v_board[v_r * 7 + v_c + 1] <> v_player;
        v_count := v_count + 1;
      END LOOP;
      IF v_count >= 4 THEN v_winner := v_player; EXIT; END IF;
    END LOOP;
  END IF;

  v_state := v_state || jsonb_build_object(
    'board', to_jsonb(v_board),
    'lastColumn', p_column,
    'turn', CASE WHEN v_player = 1 THEN 2 ELSE 1 END,
    'winner', CASE WHEN v_winner = 0 THEN null ELSE v_winner END,
    'draw', v_winner = 0 AND NOT (0 = ANY(v_board)),
    'rematchHost', false,
    'rematchGuest', false
  );
  IF v_winner <> 0 OR NOT (0 = ANY(v_board)) THEN
    v_room.status := 'finished';
  END IF;

  UPDATE public.family_game_rooms
  SET state = v_state, status = v_room.status, updated_at = now()
  WHERE id = p_room_id RETURNING * INTO v_room;
  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.get_battleship_revealed_fleets(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.play_private_connect4(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_battleship_revealed_fleets(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_private_connect4(UUID, UUID, INTEGER) TO authenticated;
