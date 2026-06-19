DELETE FROM public.family_game_answers
WHERE room_id IN (
  SELECT id FROM public.family_game_rooms WHERE game_type = 'draw-guess'
);

DELETE FROM public.family_game_rooms WHERE game_type = 'draw-guess';
DELETE FROM public.family_game_results WHERE game_type = 'draw-guess';

ALTER TABLE public.family_game_results
  DROP CONSTRAINT IF EXISTS family_game_results_game_type_check;
ALTER TABLE public.family_game_results
  ADD CONSTRAINT family_game_results_game_type_check
  CHECK (game_type IN ('memory', 'connect4', 'family-challenge', 'mime-challenge'));

ALTER TABLE public.family_game_rooms
  DROP CONSTRAINT IF EXISTS family_game_rooms_game_type_check;
ALTER TABLE public.family_game_rooms
  ADD CONSTRAINT family_game_rooms_game_type_check
  CHECK (game_type IN ('memory', 'connect4', 'family-challenge', 'mime-challenge'));

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
  IF p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à ce foyer';
  END IF;

  IF p_game_type NOT IN ('memory', 'connect4', 'family-challenge', 'mime-challenge') THEN
    RAISE EXCEPTION 'Jeu non pris en charge';
  END IF;

  LOOP
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.family_game_rooms
      WHERE room_code = v_code AND expires_at > now()
    );
  END LOOP;

  INSERT INTO public.family_game_rooms (
    room_code, game_type, host_foyer_id, host_name, created_by
  ) VALUES (
    v_code, p_game_type, p_foyer_id, left(trim(p_host_name), 80), auth.uid()
  )
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.create_family_game_room(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_family_game_room(UUID, TEXT, TEXT) TO authenticated;
