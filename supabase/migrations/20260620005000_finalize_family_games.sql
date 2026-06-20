CREATE OR REPLACE FUNCTION public.apply_family_game_action(
  p_room_id UUID,
  p_foyer_id UUID,
  p_action TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_state JSONB;
  v_scores JSONB;
  v_team INTEGER;
  v_active_team INTEGER;
  v_controlling_team INTEGER;
  v_round_bank INTEGER;
  v_rounds INTEGER;
  v_answer_index INTEGER;
  v_found_answers JSONB;
BEGIN
  SELECT * INTO v_room
  FROM public.family_game_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_room.id IS NULL OR v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Partie indisponible ou expirée';
  END IF;
  IF p_foyer_id NOT IN (v_room.host_foyer_id, v_room.guest_foyer_id)
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF v_room.status IN ('finished', 'cancelled') THEN
    RAISE EXCEPTION 'Cette partie est terminée';
  END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  v_scores := COALESCE(v_state->'scores', '[0,0]'::jsonb);
  v_round_bank := LEAST(200, GREATEST(0, COALESCE((v_state->>'roundBank')::INTEGER, 0)));
  v_rounds := LEAST(9, GREATEST(1, COALESCE((p_payload->>'totalRounds')::INTEGER, COALESCE((v_state->>'totalRounds')::INTEGER, 5))));
  v_controlling_team := LEAST(1, GREATEST(0, COALESCE((v_state->>'controllingTeam')::INTEGER, 0)));
  v_active_team := CASE
    WHEN COALESCE(v_state->>'challengePhase', '') = 'steal' THEN 1 - v_controlling_team
    ELSE v_controlling_team
  END;

  CASE p_action
    WHEN 'configure' THEN
      IF p_foyer_id <> v_room.host_foyer_id OR COALESCE((v_state->>'challengeIndex')::INTEGER, 0) > 0 THEN
        RAISE EXCEPTION 'Configuration non autorisée';
      END IF;
      v_state := v_state || jsonb_build_object(
        'totalRounds', v_rounds,
        'scores', v_scores,
        'challengePhase', 'faceoff',
        'challengeIndex', 0
      );
    WHEN 'start_timer' THEN
      IF p_foyer_id <> v_room.host_foyer_id THEN RAISE EXCEPTION 'Seul l’hôte lance le minuteur'; END IF;
      v_state := jsonb_set(v_state, '{timerDeadline}', to_jsonb(now() + interval '60 seconds'));
    WHEN 'expire_turn' THEN
      IF COALESCE(v_state->>'challengePhase', '') <> 'play' THEN RAISE EXCEPTION 'Phase invalide'; END IF;
      IF (v_active_team = 0 AND p_foyer_id <> v_room.host_foyer_id)
         OR (v_active_team = 1 AND p_foyer_id <> v_room.guest_foyer_id) THEN
        RAISE EXCEPTION 'Ce n’est pas votre tour';
      END IF;
      v_state := v_state || jsonb_build_object('strikes', 3, 'challengePhase', 'steal', 'timerDeadline', null);
    WHEN 'resolve_faceoff' THEN
      IF p_foyer_id <> v_room.host_foyer_id THEN RAISE EXCEPTION 'Seul l’hôte arbitre le duel'; END IF;
      v_team := LEAST(1, GREATEST(0, COALESCE((p_payload->>'controllingTeam')::INTEGER, 0)));
      SELECT COALESCE(jsonb_agg(DISTINCT value::INTEGER), '[]'::jsonb)
      INTO v_found_answers
      FROM jsonb_array_elements_text(COALESCE(p_payload->'foundAnswers', '[]'::jsonb))
      WHERE value::INTEGER BETWEEN 0 AND 7;
      SELECT COALESCE(sum((ARRAY[40,30,25,20,15,10,5,3])[value::INTEGER + 1]), 0)
      INTO v_round_bank
      FROM jsonb_array_elements_text(v_found_answers);
      v_state := v_state || jsonb_build_object(
        'challengePhase', 'play',
        'controllingTeam', v_team,
        'foundAnswers', v_found_answers,
        'roundBank', v_round_bank,
        'strikes', 0
      );
    WHEN 'accept_answer' THEN
      IF COALESCE(v_state->>'challengePhase', '') NOT IN ('play', 'steal') THEN RAISE EXCEPTION 'Phase invalide'; END IF;
      IF (v_active_team = 0 AND p_foyer_id <> v_room.host_foyer_id)
         OR (v_active_team = 1 AND p_foyer_id <> v_room.guest_foyer_id) THEN
        RAISE EXCEPTION 'Ce n’est pas votre tour';
      END IF;
      v_answer_index := COALESCE((p_payload->>'answerIndex')::INTEGER, -1);
      IF v_answer_index NOT BETWEEN 0 AND 7 THEN RAISE EXCEPTION 'Réponse invalide'; END IF;
      v_found_answers := COALESCE(v_state->'foundAnswers', '[]'::jsonb);
      IF v_found_answers @> jsonb_build_array(v_answer_index) THEN RAISE EXCEPTION 'Réponse déjà trouvée'; END IF;
      v_found_answers := v_found_answers || jsonb_build_array(v_answer_index);
      v_round_bank := v_round_bank + (ARRAY[40,30,25,20,15,10,5,3])[v_answer_index + 1];
      v_state := v_state || jsonb_build_object('foundAnswers', v_found_answers, 'roundBank', v_round_bank);
    WHEN 'reject_answer' THEN
      IF COALESCE(v_state->>'challengePhase', '') NOT IN ('play', 'steal') THEN RAISE EXCEPTION 'Phase invalide'; END IF;
      IF (v_active_team = 0 AND p_foyer_id <> v_room.host_foyer_id)
         OR (v_active_team = 1 AND p_foyer_id <> v_room.guest_foyer_id) THEN
        RAISE EXCEPTION 'Ce n’est pas votre tour';
      END IF;
      v_state := v_state || jsonb_build_object(
        'strikes', LEAST(3, COALESCE((v_state->>'strikes')::INTEGER, 0) + 1),
        'challengePhase', CASE WHEN COALESCE((v_state->>'strikes')::INTEGER, 0) >= 2 THEN 'steal' ELSE 'play' END
      );
    WHEN 'finish_round' THEN
      IF COALESCE(v_state->>'challengePhase', '') NOT IN ('play', 'steal') THEN RAISE EXCEPTION 'Phase invalide'; END IF;
      IF (v_active_team = 0 AND p_foyer_id <> v_room.host_foyer_id)
         OR (v_active_team = 1 AND p_foyer_id <> v_room.guest_foyer_id) THEN
        RAISE EXCEPTION 'Ce n’est pas votre tour';
      END IF;
      v_team := LEAST(1, GREATEST(0, COALESCE((p_payload->>'winner')::INTEGER, 0)));
      v_answer_index := COALESCE((p_payload->>'answerIndex')::INTEGER, -1);
      v_found_answers := COALESCE(v_state->'foundAnswers', '[]'::jsonb);
      IF v_answer_index BETWEEN 0 AND 7 AND NOT (v_found_answers @> jsonb_build_array(v_answer_index)) THEN
        v_found_answers := v_found_answers || jsonb_build_array(v_answer_index);
        v_round_bank := v_round_bank + (ARRAY[40,30,25,20,15,10,5,3])[v_answer_index + 1];
      END IF;
      IF v_team = 0 THEN
        v_scores := jsonb_build_array(COALESCE((v_scores->>0)::INTEGER, 0) + v_round_bank, COALESCE((v_scores->>1)::INTEGER, 0));
      ELSE
        v_scores := jsonb_build_array(COALESCE((v_scores->>0)::INTEGER, 0), COALESCE((v_scores->>1)::INTEGER, 0) + v_round_bank);
      END IF;
      v_state := v_state || jsonb_build_object(
        'scores', v_scores,
        'roundWinner', v_team,
        'challengePhase', 'round-end',
        'foundAnswers', v_found_answers,
        'roundBank', v_round_bank,
        'timerDeadline', null
      );
    WHEN 'next_round' THEN
      IF p_foyer_id <> v_room.host_foyer_id THEN RAISE EXCEPTION 'Seul l’hôte lance la manche'; END IF;
      v_state := v_state || jsonb_build_object(
        'challengeIndex', COALESCE((v_state->>'challengeIndex')::INTEGER, 0) + 1,
        'challengePhase', 'faceoff',
        'foundAnswers', '[]'::jsonb,
        'strikes', 0,
        'roundBank', 0,
        'submittedAnswers', 'null'::jsonb,
        'hostSubmitted', false,
        'guestSubmitted', false,
        'timerDeadline', null
      );
    WHEN 'finish_game' THEN
      IF p_foyer_id <> v_room.host_foyer_id THEN RAISE EXCEPTION 'Seul l’hôte clôture la partie'; END IF;
      v_room.status := 'finished';
      v_state := v_state || jsonb_build_object('finishedAt', now(), 'timerDeadline', null);
    WHEN 'leave' THEN
      v_state := v_state || jsonb_build_object('leftBy', p_foyer_id, 'leftAt', now());
      v_room.status := 'cancelled';
    WHEN 'cancel' THEN
      IF p_foyer_id <> v_room.host_foyer_id THEN RAISE EXCEPTION 'Seul l’hôte peut annuler'; END IF;
      v_room.status := 'cancelled';
    ELSE
      RAISE EXCEPTION 'Action de jeu inconnue';
  END CASE;

  UPDATE public.family_game_rooms
  SET state = v_state,
      status = v_room.status,
      updated_at = now()
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_family_game_action(UUID, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_family_game_action(UUID, UUID, TEXT, JSONB) TO authenticated;
