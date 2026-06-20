ALTER TABLE public.family_game_results
  DROP CONSTRAINT IF EXISTS family_game_results_game_type_check;
ALTER TABLE public.family_game_results
  ADD CONSTRAINT family_game_results_game_type_check
  CHECK (game_type IN ('memory', 'connect4', 'family-challenge', 'mime-challenge', 'battleship'));

ALTER TABLE public.family_game_rooms
  DROP CONSTRAINT IF EXISTS family_game_rooms_game_type_check;
ALTER TABLE public.family_game_rooms
  ADD CONSTRAINT family_game_rooms_game_type_check
  CHECK (game_type IN ('memory', 'connect4', 'family-challenge', 'mime-challenge', 'battleship'));

CREATE TABLE IF NOT EXISTS public.family_battleship_fleets (
  room_id UUID NOT NULL REFERENCES public.family_game_rooms(id) ON DELETE CASCADE,
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  fleet TEXT[] NOT NULL,
  shots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, foyer_id)
);

ALTER TABLE public.family_battleship_fleets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.family_battleship_fleets FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_family_game_room(
  p_foyer_id UUID,
  p_game_type TEXT,
  p_host_name TEXT
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_code TEXT;
BEGIN
  PERFORM public.enforce_family_game_rate_limit('create_room', 5, interval '1 minute');
  IF p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à ce foyer';
  END IF;
  IF p_game_type NOT IN ('memory', 'connect4', 'family-challenge', 'mime-challenge', 'battleship') THEN
    RAISE EXCEPTION 'Jeu non pris en charge';
  END IF;
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.family_game_rooms
      WHERE room_code = v_code AND expires_at > now()
    );
  END LOOP;
  INSERT INTO public.family_game_rooms (
    room_code, game_type, host_foyer_id, host_name, created_by, expires_at
  ) VALUES (
    v_code, p_game_type, p_foyer_id, left(trim(p_host_name), 80), auth.uid(), now() + interval '2 hours'
  )
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
  IF p_foyer_id NOT IN (v_room.host_foyer_id, v_room.guest_foyer_id)
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à cette partie';
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
      IF v_cell !~ '^[0-9]-[0-9]$' OR v_cell = ANY(v_cells) THEN
        RAISE EXCEPTION 'Position de bateau invalide';
      END IF;
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

  INSERT INTO public.family_battleship_fleets (room_id, foyer_id, fleet)
  VALUES (p_room_id, p_foyer_id, v_cells)
  ON CONFLICT (room_id, foyer_id) DO UPDATE SET fleet = EXCLUDED.fleet, shots = '{}';

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF p_foyer_id = v_room.host_foyer_id THEN
    v_state := v_state || jsonb_build_object('hostReady', true, 'hostShots', '[]'::jsonb);
  ELSE
    v_state := v_state || jsonb_build_object('guestReady', true, 'guestShots', '[]'::jsonb);
  END IF;
  IF COALESCE((v_state->>'hostReady')::BOOLEAN, false) AND COALESCE((v_state->>'guestReady')::BOOLEAN, false) THEN
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
  v_fleet TEXT[];
BEGIN
  IF p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT fleet INTO v_fleet FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND foyer_id = p_foyer_id;
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
  v_target_foyer UUID;
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
  IF p_foyer_id = v_room.host_foyer_id THEN
    v_shooter := 0; v_target_foyer := v_room.guest_foyer_id; v_history_key := 'hostShots';
  ELSIF p_foyer_id = v_room.guest_foyer_id THEN
    v_shooter := 1; v_target_foyer := v_room.host_foyer_id; v_history_key := 'guestShots';
  ELSE
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF NOT COALESCE((v_state->>'hostReady')::BOOLEAN, false)
     OR NOT COALESCE((v_state->>'guestReady')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Les deux flottes ne sont pas prêtes';
  END IF;
  IF COALESCE((v_state->>'turn')::INTEGER, 0) <> v_shooter THEN RAISE EXCEPTION 'Ce n’est pas votre tour'; END IF;

  SELECT shots INTO v_shots FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND foyer_id = p_foyer_id FOR UPDATE;
  SELECT fleet INTO v_target_fleet FROM public.family_battleship_fleets
  WHERE room_id = p_room_id AND foyer_id = v_target_foyer;
  IF v_shots IS NULL OR v_target_fleet IS NULL THEN RAISE EXCEPTION 'Flotte manquante'; END IF;
  IF p_cell = ANY(v_shots) THEN RAISE EXCEPTION 'Cette case a déjà été visée'; END IF;

  v_shots := array_append(v_shots, p_cell);
  v_result := CASE WHEN p_cell = ANY(v_target_fleet) THEN 'hit' ELSE 'miss' END;
  UPDATE public.family_battleship_fleets SET shots = v_shots
  WHERE room_id = p_room_id AND foyer_id = p_foyer_id;
  v_state := jsonb_set(
    v_state,
    ARRAY[v_history_key],
    COALESCE(v_state->v_history_key, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('cell', p_cell, 'result', v_result))
  );
  SELECT count(*) INTO v_remaining FROM unnest(v_target_fleet) cell WHERE NOT (cell = ANY(v_shots));
  IF v_remaining = 0 THEN
    v_state := v_state || jsonb_build_object('winner', v_shooter, 'finishedAt', now());
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

REVOKE ALL ON FUNCTION public.create_family_game_room(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_battleship_fleet(UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_battleship_fleet(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fire_battleship_shot(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_family_game_room(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_battleship_fleet(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_battleship_fleet(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fire_battleship_shot(UUID, UUID, TEXT) TO authenticated;
