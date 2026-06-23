CREATE OR REPLACE FUNCTION public.force_family_challenge_faceoff_random(
  p_room_id UUID,
  p_foyer_id UUID,
  p_winner_team INTEGER,
  p_answer_index INTEGER
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms%ROWTYPE;
  v_state JSONB;
  v_user_id UUID := auth.uid();
  v_answer JSONB;
  v_points INTEGER;
BEGIN
  IF p_winner_team NOT IN (0, 1) THEN
    RAISE EXCEPTION 'Équipe invalide';
  END IF;

  SELECT *
  INTO v_room
  FROM public.family_game_rooms
  WHERE id = p_room_id
    AND status = 'active'
    AND expires_at > now()
  FOR UPDATE;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Partie indisponible ou expirée';
  END IF;
  IF p_foyer_id <> v_room.host_foyer_id THEN
    RAISE EXCEPTION 'Seul l’hôte peut départager le duel';
  END IF;
  IF v_user_id <> v_room.host_user_id OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF COALESCE(v_state->>'challengePhase', '') <> 'faceoff' THEN
    RAISE EXCEPTION 'Le duel est déjà terminé';
  END IF;
  IF NOT public.validate_family_challenge_question(v_state->'question') THEN
    RAISE EXCEPTION 'Question invalide';
  END IF;
  IF p_answer_index < 0 OR p_answer_index >= jsonb_array_length(v_state->'question'->'answers') THEN
    RAISE EXCEPTION 'Réponse invalide';
  END IF;

  v_answer := v_state->'question'->'answers'->p_answer_index;
  v_points := COALESCE((v_answer->>'points')::INTEGER, (ARRAY[40, 30, 25, 20, 15, 10, 5, 3])[p_answer_index + 1], 0);

  DELETE FROM public.family_game_answers
  WHERE room_id = p_room_id
    AND round_number = COALESCE((v_state->>'challengeIndex')::INTEGER, 0);

  v_state := v_state || jsonb_build_object(
    'challengePhase', 'play',
    'controllingTeam', p_winner_team,
    'foundAnswers', jsonb_build_array(p_answer_index),
    'roundBank', v_points,
    'strikes', 0,
    'hostSubmitted', false,
    'guestSubmitted', false,
    'submittedAnswers', null,
    'faceoffMisses', 0,
    'timerDeadline', null,
    'pendingCloseAnswer', null,
    'feedback', 'Deux duels sans réponse au tableau : la main est attribuée au hasard.'
  );

  UPDATE public.family_game_rooms
  SET state = v_state,
      updated_at = now()
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.force_family_challenge_faceoff_random(UUID, UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.force_family_challenge_faceoff_random(UUID, UUID, INTEGER, INTEGER) TO authenticated;
