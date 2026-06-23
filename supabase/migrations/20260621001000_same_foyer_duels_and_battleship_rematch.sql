ALTER TABLE public.family_game_rooms
  ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.family_game_rooms
SET host_user_id = created_by
WHERE host_user_id IS NULL;

ALTER TABLE public.family_game_rooms
  ALTER COLUMN host_user_id SET DEFAULT auth.uid();

ALTER TABLE public.family_game_rooms
  DROP CONSTRAINT IF EXISTS family_game_rooms_check;

DO $$
DECLARE
  v_constraint RECORD;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.family_game_rooms'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%guest_foyer_id%'
      AND pg_get_constraintdef(oid) ILIKE '%host_foyer_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.family_game_rooms DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS family_game_rooms_users_idx
  ON public.family_game_rooms (host_user_id, guest_user_id, status);

ALTER TABLE public.family_battleship_fleets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.family_battleship_fleets AS fleet
SET user_id = CASE
  WHEN fleet.foyer_id = room.host_foyer_id THEN room.host_user_id
  ELSE room.guest_user_id
END
FROM public.family_game_rooms AS room
WHERE room.id = fleet.room_id
  AND fleet.user_id IS NULL;

DELETE FROM public.family_battleship_fleets
WHERE user_id IS NULL;

ALTER TABLE public.family_battleship_fleets
  ALTER COLUMN user_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS family_battleship_fleets_pkey,
  ADD CONSTRAINT family_battleship_fleets_pkey PRIMARY KEY (room_id, user_id);

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
  IF v_room.host_foyer_id = p_foyer_id AND v_room.game_type NOT IN ('battleship', 'connect4') THEN
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

CREATE OR REPLACE FUNCTION public.place_battleship_fleet(
  p_room_id UUID,
  p_foyer_id UUID,
  p_ships JSONB
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_player INTEGER;
  v_ship JSONB;
  v_cell TEXT;
  v_cells TEXT[] := '{}';
  v_lengths INTEGER[] := '{}';
  v_length INTEGER;
  v_rows INTEGER[];
  v_columns INTEGER[];
  v_state JSONB;
BEGIN
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type <> 'battleship' OR v_room.status <> 'active' OR v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Bataille navale indisponible';
  END IF;
  IF auth.uid() = v_room.host_user_id THEN
    v_player := 0;
  ELSIF auth.uid() = v_room.guest_user_id THEN
    v_player := 1;
  ELSE
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF ((v_player = 0 AND p_foyer_id <> v_room.host_foyer_id) OR (v_player = 1 AND p_foyer_id <> v_room.guest_foyer_id))
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à ce foyer';
  END IF;
  IF jsonb_typeof(p_ships) <> 'array' OR jsonb_array_length(p_ships) <> 5 THEN
    RAISE EXCEPTION 'La flotte doit contenir cinq bateaux';
  END IF;

  FOR v_ship IN SELECT value FROM jsonb_array_elements(p_ships)
  LOOP
    IF jsonb_typeof(v_ship) <> 'array' THEN RAISE EXCEPTION 'Bateau invalide'; END IF;
    v_length := jsonb_array_length(v_ship);
    v_lengths := array_append(v_lengths, v_length);
    v_rows := '{}';
    v_columns := '{}';
    FOR v_cell IN SELECT value #>> '{}' FROM jsonb_array_elements(v_ship)
    LOOP
      IF v_cell !~ '^[0-9]-[0-9]$' OR v_cell = ANY(v_cells) THEN RAISE EXCEPTION 'Position de bateau invalide'; END IF;
      v_cells := array_append(v_cells, v_cell);
      v_rows := array_append(v_rows, split_part(v_cell, '-', 1)::INTEGER);
      v_columns := array_append(v_columns, split_part(v_cell, '-', 2)::INTEGER);
    END LOOP;
    IF NOT (
      ((SELECT min(value) FROM unnest(v_rows) value) = (SELECT max(value) FROM unnest(v_rows) value)
       AND (SELECT max(value) - min(value) + 1 FROM unnest(v_columns) value) = v_length)
      OR
      ((SELECT min(value) FROM unnest(v_columns) value) = (SELECT max(value) FROM unnest(v_columns) value)
       AND (SELECT max(value) - min(value) + 1 FROM unnest(v_rows) value) = v_length)
    ) THEN
      RAISE EXCEPTION 'Chaque bateau doit être droit et continu';
    END IF;
  END LOOP;

  IF (SELECT array_agg(value ORDER BY value) FROM unnest(v_lengths) value) <> ARRAY[2,3,3,4,5] THEN
    RAISE EXCEPTION 'Composition de flotte invalide';
  END IF;

  INSERT INTO public.family_battleship_fleets (room_id, foyer_id, user_id, fleet, shots)
  VALUES (p_room_id, p_foyer_id, auth.uid(), v_cells, '{}')
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET foyer_id = EXCLUDED.foyer_id, fleet = EXCLUDED.fleet, shots = '{}';

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF v_player = 0 THEN
    v_state := v_state || jsonb_build_object('hostReady', true, 'hostShots', '[]'::jsonb);
  ELSE
    v_state := v_state || jsonb_build_object('guestReady', true, 'guestShots', '[]'::jsonb);
  END IF;
  IF COALESCE((v_state->>'hostReady')::BOOLEAN, false)
     AND COALESCE((v_state->>'guestReady')::BOOLEAN, false) THEN
    v_state := v_state || jsonb_build_object('turn', 0, 'battleStartedAt', now());
  END IF;

  UPDATE public.family_game_rooms SET state = v_state, updated_at = now()
  WHERE id = p_room_id RETURNING * INTO v_room;
  RETURN v_room;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_battleship_fleet(
  p_room_id UUID,
  p_foyer_id UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_fleet TEXT[];
BEGIN
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id;
  IF v_room.id IS NULL
     OR (auth.uid() <> v_room.host_user_id AND auth.uid() IS DISTINCT FROM v_room.guest_user_id)
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT fleet INTO v_fleet
  FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND user_id = auth.uid();
  RETURN COALESCE(v_fleet, '{}');
END;
$$;

CREATE OR REPLACE FUNCTION public.fire_battleship_shot(
  p_room_id UUID,
  p_foyer_id UUID,
  p_cell TEXT
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_state JSONB;
  v_shooter INTEGER;
  v_target_user UUID;
  v_target_fleet TEXT[];
  v_shots TEXT[];
  v_result TEXT;
  v_remaining INTEGER;
  v_history_key TEXT;
BEGIN
  PERFORM public.enforce_family_game_rate_limit('battleship_fire', 90, interval '1 minute');
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type <> 'battleship' OR v_room.status <> 'active' OR v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Bataille navale indisponible';
  END IF;
  IF p_cell !~ '^[0-9]-[0-9]$' THEN RAISE EXCEPTION 'Case invalide'; END IF;
  IF auth.uid() = v_room.host_user_id THEN
    v_shooter := 0; v_target_user := v_room.guest_user_id; v_history_key := 'hostShots';
  ELSIF auth.uid() = v_room.guest_user_id THEN
    v_shooter := 1; v_target_user := v_room.host_user_id; v_history_key := 'guestShots';
  ELSE
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF ((v_shooter = 0 AND p_foyer_id <> v_room.host_foyer_id) OR (v_shooter = 1 AND p_foyer_id <> v_room.guest_foyer_id))
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF NOT COALESCE((v_state->>'hostReady')::BOOLEAN, false)
     OR NOT COALESCE((v_state->>'guestReady')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Les deux flottes ne sont pas prêtes';
  END IF;
  IF COALESCE((v_state->>'turn')::INTEGER, 0) <> v_shooter THEN RAISE EXCEPTION 'Ce n’est pas votre tour'; END IF;

  SELECT shots INTO v_shots FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND user_id = auth.uid() FOR UPDATE;
  SELECT fleet INTO v_target_fleet FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND user_id = v_target_user;
  IF v_shots IS NULL OR v_target_fleet IS NULL THEN RAISE EXCEPTION 'Flotte manquante'; END IF;
  IF p_cell = ANY(v_shots) THEN RAISE EXCEPTION 'Cette case a déjà été visée'; END IF;

  v_shots := array_append(v_shots, p_cell);
  v_result := CASE WHEN p_cell = ANY(v_target_fleet) THEN 'hit' ELSE 'miss' END;
  UPDATE public.family_battleship_fleets SET shots = v_shots
  WHERE room_id = p_room_id AND user_id = auth.uid();
  v_state := jsonb_set(
    v_state,
    ARRAY[v_history_key],
    COALESCE(v_state->v_history_key, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('cell', p_cell, 'result', v_result))
  );
  SELECT count(*) INTO v_remaining FROM unnest(v_target_fleet) cell WHERE NOT (cell = ANY(v_shots));
  IF v_remaining = 0 THEN
    v_state := v_state || jsonb_build_object(
      'winner', v_shooter,
      'finishedAt', now(),
      'rematchHost', false,
      'rematchGuest', false
    );
    v_room.status := 'finished';
  ELSE
    v_state := v_state || jsonb_build_object('turn', CASE WHEN v_shooter = 0 THEN 1 ELSE 0 END);
  END IF;

  UPDATE public.family_game_rooms
  SET state = v_state, status = v_room.status, updated_at = now()
  WHERE id = p_room_id RETURNING * INTO v_room;
  RETURN v_room;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_battleship_rematch(
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
  v_state JSONB;
  v_player INTEGER;
BEGIN
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type <> 'battleship' OR v_room.status <> 'finished' OR v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Cette bataille ne peut pas être rejouée';
  END IF;
  IF auth.uid() = v_room.host_user_id THEN
    v_player := 0;
  ELSIF auth.uid() = v_room.guest_user_id THEN
    v_player := 1;
  ELSE
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF ((v_player = 0 AND p_foyer_id <> v_room.host_foyer_id) OR (v_player = 1 AND p_foyer_id <> v_room.guest_foyer_id))
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF v_player = 0 THEN
    v_state := v_state || jsonb_build_object('rematchHost', true);
  ELSE
    v_state := v_state || jsonb_build_object('rematchGuest', true);
  END IF;

  IF COALESCE((v_state->>'rematchHost')::BOOLEAN, false)
     AND COALESCE((v_state->>'rematchGuest')::BOOLEAN, false) THEN
    DELETE FROM public.family_battleship_fleets WHERE room_id = p_room_id;
    v_state := jsonb_build_object(
      'hostReady', false,
      'guestReady', false,
      'hostShots', '[]'::jsonb,
      'guestShots', '[]'::jsonb,
      'turn', 0,
      'rematchHost', false,
      'rematchGuest', false,
      'matchNumber', COALESCE((v_state->>'matchNumber')::INTEGER, 1) + 1
    );
    v_room.status := 'active';
  END IF;

  UPDATE public.family_game_rooms
  SET state = v_state, status = v_room.status, updated_at = now(), expires_at = now() + interval '2 hours'
  WHERE id = p_room_id
  RETURNING * INTO v_room;
  RETURN v_room;
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

CREATE OR REPLACE FUNCTION public.request_connect4_rematch(
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
  v_state JSONB;
  v_player INTEGER;
BEGIN
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type <> 'connect4' OR v_room.status <> 'finished' OR v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Cette partie ne peut pas être rejouée';
  END IF;
  IF auth.uid() = v_room.host_user_id THEN v_player := 1;
  ELSIF auth.uid() = v_room.guest_user_id THEN v_player := 2;
  ELSE RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF ((v_player = 1 AND p_foyer_id <> v_room.host_foyer_id) OR (v_player = 2 AND p_foyer_id <> v_room.guest_foyer_id))
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF v_player = 1 THEN v_state := v_state || jsonb_build_object('rematchHost', true);
  ELSE v_state := v_state || jsonb_build_object('rematchGuest', true);
  END IF;

  IF COALESCE((v_state->>'rematchHost')::BOOLEAN, false)
     AND COALESCE((v_state->>'rematchGuest')::BOOLEAN, false) THEN
    v_state := jsonb_build_object(
      'board', to_jsonb(array_fill(0, ARRAY[42])),
      'turn', CASE WHEN COALESCE((v_state->>'winner')::INTEGER, 2) = 1 THEN 2 ELSE 1 END,
      'winner', null,
      'draw', false,
      'rematchHost', false,
      'rematchGuest', false,
      'matchNumber', COALESCE((v_state->>'matchNumber')::INTEGER, 1) + 1
    );
    v_room.status := 'active';
  END IF;

  UPDATE public.family_game_rooms
  SET state = v_state, status = v_room.status, updated_at = now(), expires_at = now() + interval '2 hours'
  WHERE id = p_room_id RETURNING * INTO v_room;
  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.join_family_game_room(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_battleship_fleet(UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_battleship_fleet(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fire_battleship_shot(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_battleship_rematch(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.play_private_connect4(UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_connect4_rematch(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.join_family_game_room(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_battleship_fleet(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_battleship_fleet(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fire_battleship_shot(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_battleship_rematch(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_private_connect4(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_connect4_rematch(UUID, UUID) TO authenticated;
