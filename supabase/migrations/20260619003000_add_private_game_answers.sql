CREATE TABLE IF NOT EXISTS public.family_game_answers (
  room_id UUID NOT NULL REFERENCES public.family_game_rooms(id) ON DELETE CASCADE,
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  answer_text TEXT NOT NULL CHECK (char_length(answer_text) BETWEEN 1 AND 160),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, foyer_id, round_number)
);

ALTER TABLE public.family_game_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.family_game_answers FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_family_game_answer(
  p_room_id UUID,
  p_foyer_id UUID,
  p_round_number INTEGER,
  p_answer_text TEXT
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_host_answer TEXT;
  v_guest_answer TEXT;
BEGIN
  SELECT * INTO v_room
  FROM public.family_game_rooms
  WHERE id = p_room_id
    AND status = 'active'
    AND expires_at > now()
  FOR UPDATE;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Partie indisponible ou expirée';
  END IF;
  IF p_foyer_id NOT IN (v_room.host_foyer_id, v_room.guest_foyer_id) THEN
    RAISE EXCEPTION 'Cette famille ne participe pas à la partie';
  END IF;
  IF p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à ce foyer';
  END IF;

  INSERT INTO public.family_game_answers (room_id, foyer_id, round_number, answer_text)
  VALUES (p_room_id, p_foyer_id, p_round_number, left(trim(p_answer_text), 160))
  ON CONFLICT (room_id, foyer_id, round_number)
  DO UPDATE SET answer_text = EXCLUDED.answer_text, submitted_at = now();

  SELECT answer_text INTO v_host_answer
  FROM public.family_game_answers
  WHERE room_id = p_room_id AND foyer_id = v_room.host_foyer_id AND round_number = p_round_number;

  SELECT answer_text INTO v_guest_answer
  FROM public.family_game_answers
  WHERE room_id = p_room_id AND foyer_id = v_room.guest_foyer_id AND round_number = p_round_number;

  UPDATE public.family_game_rooms
  SET state = jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(state, '{}'::jsonb),
            '{hostSubmitted}',
            to_jsonb(v_host_answer IS NOT NULL)
          ),
          '{guestSubmitted}',
          to_jsonb(v_guest_answer IS NOT NULL)
        ),
        '{submittedAnswers}',
        CASE
          WHEN v_host_answer IS NOT NULL AND v_guest_answer IS NOT NULL
          THEN jsonb_build_array(v_host_answer, v_guest_answer)
          ELSE 'null'::jsonb
        END
      ),
      updated_at = now()
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_family_game_answer(UUID, UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_family_game_answer(UUID, UUID, INTEGER, TEXT) TO authenticated;
