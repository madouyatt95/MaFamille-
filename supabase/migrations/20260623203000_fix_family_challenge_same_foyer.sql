ALTER TABLE public.family_game_answers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.family_game_answers answers
SET user_id = CASE
  WHEN answers.foyer_id = rooms.host_foyer_id THEN rooms.host_user_id
  WHEN answers.foyer_id = rooms.guest_foyer_id THEN rooms.guest_user_id
  ELSE answers.user_id
END
FROM public.family_game_rooms rooms
WHERE answers.room_id = rooms.id
  AND answers.user_id IS NULL;

ALTER TABLE public.family_game_answers
  DROP CONSTRAINT IF EXISTS family_game_answers_pkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'family_game_answers_room_user_round_key'
      AND conrelid = 'public.family_game_answers'::regclass
  ) THEN
    ALTER TABLE public.family_game_answers
      ADD CONSTRAINT family_game_answers_room_user_round_key UNIQUE (room_id, user_id, round_number);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_family_game_answer(
  p_room_id UUID,
  p_foyer_id UUID,
  p_round_number INTEGER,
  p_answer_text TEXT
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_state JSONB;
  v_user_id UUID := auth.uid();
  v_team INTEGER;
  v_host_answer TEXT;
  v_guest_answer TEXT;
  v_host_at TIMESTAMPTZ;
  v_guest_at TIMESTAMPTZ;
  v_host_match RECORD;
  v_guest_match RECORD;
  v_winner INTEGER;
  v_found JSONB := '[]'::jsonb;
  v_bank INTEGER := 0;
  v_scores JSONB;
BEGIN
  SELECT * INTO v_room
  FROM public.family_game_rooms
  WHERE id = p_room_id
    AND status = 'active'
    AND expires_at > now()
  FOR UPDATE;

  IF v_room.id IS NULL THEN RAISE EXCEPTION 'Partie indisponible ou expirée'; END IF;
  IF p_foyer_id NOT IN (v_room.host_foyer_id, v_room.guest_foyer_id)
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF v_user_id = v_room.host_user_id THEN
    v_team := 0;
  ELSIF v_user_id = v_room.guest_user_id THEN
    v_team := 1;
  ELSE
    RAISE EXCEPTION 'Ce compte ne participe pas à cette partie';
  END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  IF COALESCE(v_state->>'challengePhase', '') <> 'faceoff'
     OR COALESCE((v_state->>'challengeIndex')::INTEGER, 0) <> p_round_number THEN
    RAISE EXCEPTION 'Le duel est déjà terminé';
  END IF;

  INSERT INTO public.family_game_answers (room_id, foyer_id, user_id, round_number, answer_text)
  VALUES (p_room_id, p_foyer_id, v_user_id, p_round_number, left(trim(p_answer_text), 160))
  ON CONFLICT ON CONSTRAINT family_game_answers_room_user_round_key
  DO UPDATE SET answer_text = EXCLUDED.answer_text, submitted_at = now();

  SELECT answer_text, submitted_at INTO v_host_answer, v_host_at
  FROM public.family_game_answers
  WHERE room_id = p_room_id AND user_id = v_room.host_user_id AND round_number = p_round_number;

  SELECT answer_text, submitted_at INTO v_guest_answer, v_guest_at
  FROM public.family_game_answers
  WHERE room_id = p_room_id AND user_id = v_room.guest_user_id AND round_number = p_round_number;

  v_state := v_state || jsonb_build_object(
    'hostSubmitted', v_host_answer IS NOT NULL,
    'guestSubmitted', v_guest_answer IS NOT NULL,
    'submittedAnswers', CASE
      WHEN v_host_answer IS NOT NULL AND v_guest_answer IS NOT NULL
      THEN jsonb_build_array(v_host_answer, v_guest_answer)
      ELSE 'null'::jsonb
    END,
    'lastFaceoffTeam', v_team
  );

  IF v_host_answer IS NOT NULL AND v_guest_answer IS NOT NULL THEN
    SELECT * INTO v_host_match FROM public.family_challenge_best_match(v_state->'question', v_host_answer);
    SELECT * INTO v_guest_match FROM public.family_challenge_best_match(v_state->'question', v_guest_answer);

    IF v_host_match.match_status = 'rejected' AND v_guest_match.match_status = 'rejected' THEN
      DELETE FROM public.family_game_answers
      WHERE room_id = p_room_id
        AND round_number = p_round_number
        AND user_id IN (v_room.host_user_id, v_room.guest_user_id);

      v_state := v_state || jsonb_build_object(
        'hostSubmitted', false,
        'guestSubmitted', false,
        'submittedAnswers', null,
        'feedback', 'Aucune réponse au tableau : nouveau duel.'
      );
    ELSE
      v_winner := CASE
        WHEN v_host_match.match_status <> 'rejected' AND v_guest_match.match_status = 'rejected' THEN 0
        WHEN v_guest_match.match_status <> 'rejected' AND v_host_match.match_status = 'rejected' THEN 1
        WHEN v_host_match.answer_index <> v_guest_match.answer_index
          THEN CASE WHEN v_host_match.answer_index < v_guest_match.answer_index THEN 0 ELSE 1 END
        WHEN COALESCE(v_host_at, now()) <= COALESCE(v_guest_at, now()) THEN 0
        ELSE 1
      END;

      IF v_host_match.match_status <> 'rejected' THEN
        v_found := v_found || jsonb_build_array(v_host_match.answer_index);
      END IF;
      IF v_guest_match.match_status <> 'rejected'
         AND NOT (v_found @> jsonb_build_array(v_guest_match.answer_index)) THEN
        v_found := v_found || jsonb_build_array(v_guest_match.answer_index);
      END IF;

      SELECT COALESCE(sum((ARRAY[40,30,25,20,15,10,5,3])[value::INTEGER + 1]), 0)
      INTO v_bank
      FROM jsonb_array_elements_text(v_found);

      IF COALESCE((v_state->>'suddenDeath')::BOOLEAN, false) THEN
        v_scores := COALESCE(v_state->'scores', '[0,0]'::jsonb);
        IF v_winner = 0 THEN
          v_scores := jsonb_build_array((v_scores->>0)::INTEGER + 1, (v_scores->>1)::INTEGER);
        ELSE
          v_scores := jsonb_build_array((v_scores->>0)::INTEGER, (v_scores->>1)::INTEGER + 1);
        END IF;
        v_state := v_state || jsonb_build_object(
          'scores', v_scores,
          'challengePhase', 'game-end',
          'finalWinner', v_winner,
          'foundAnswers', v_found,
          'roundBank', v_bank,
          'finishedAt', now()
        );
        v_room.status := 'finished';
      ELSE
        v_state := v_state || jsonb_build_object(
          'challengePhase', 'play',
          'controllingTeam', v_winner,
          'foundAnswers', v_found,
          'roundBank', v_bank,
          'strikes', 0,
          'timerDeadline', null,
          'feedback', CASE WHEN v_winner = 0 THEN 'La famille hôte prend la main.' ELSE 'La famille invitée prend la main.' END
        );
      END IF;
    END IF;
  END IF;

  UPDATE public.family_game_rooms
  SET state = v_state, status = v_room.status, updated_at = now()
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_family_challenge_guess(
  p_room_id UUID,
  p_foyer_id UUID,
  p_answer_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_state JSONB;
  v_match RECORD;
  v_phase TEXT;
  v_user_id UUID := auth.uid();
  v_team INTEGER;
  v_control INTEGER;
  v_strikes INTEGER;
  v_bank INTEGER;
  v_found JSONB;
  v_scores JSONB;
  v_history JSONB;
  v_status TEXT := 'rejected';
  v_message TEXT := 'Cette réponse n’est pas au tableau.';
  v_points INTEGER;
  v_winner INTEGER;
BEGIN
  SELECT * INTO v_room
  FROM public.family_game_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_room.id IS NULL OR v_room.status <> 'active' OR v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Partie indisponible ou expirée';
  END IF;
  IF p_foyer_id NOT IN (v_room.host_foyer_id, v_room.guest_foyer_id)
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF v_user_id = v_room.host_user_id THEN
    v_team := 0;
  ELSIF v_user_id = v_room.guest_user_id THEN
    v_team := 1;
  ELSE
    RAISE EXCEPTION 'Ce compte ne participe pas à cette partie';
  END IF;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  v_phase := COALESCE(v_state->>'challengePhase', '');
  v_control := LEAST(1, GREATEST(0, COALESCE((v_state->>'controllingTeam')::INTEGER, 0)));
  v_found := COALESCE(v_state->'foundAnswers', '[]'::jsonb);
  v_strikes := LEAST(3, GREATEST(0, COALESCE((v_state->>'strikes')::INTEGER, 0)));
  v_bank := LEAST(500, GREATEST(0, COALESCE((v_state->>'roundBank')::INTEGER, 0)));
  v_scores := COALESCE(v_state->'scores', '[0,0]'::jsonb);
  v_history := COALESCE(v_state->'roundHistory', '[]'::jsonb);

  IF v_phase NOT IN ('play', 'steal') THEN RAISE EXCEPTION 'Phase invalide'; END IF;
  IF (v_phase = 'play' AND v_team <> v_control) OR (v_phase = 'steal' AND v_team = v_control) THEN
    RAISE EXCEPTION 'Ce n’est pas votre tour';
  END IF;

  IF NULLIF(v_state->>'timerDeadline', '') IS NOT NULL
     AND (v_state->>'timerDeadline')::TIMESTAMPTZ <= now() THEN
    IF v_phase = 'play' THEN
      v_state := v_state || jsonb_build_object(
        'challengePhase', 'steal',
        'strikes', 3,
        'timerDeadline', null,
        'feedback', 'Temps écoulé : tentative de vol.'
      );
      UPDATE public.family_game_rooms SET state = v_state, updated_at = now() WHERE id = p_room_id RETURNING * INTO v_room;
      RETURN jsonb_build_object('room', to_jsonb(v_room), 'status', 'rejected', 'message', 'Temps écoulé : l’autre équipe peut voler.');
    END IF;
    v_winner := v_control;
    v_message := 'Temps écoulé : la famille en contrôle garde la cagnotte.';
    v_status := 'round_finished';
  ELSE
    SELECT * INTO v_match FROM public.family_challenge_best_match(v_state->'question', p_answer_text);

    IF v_match.match_status = 'close' THEN
      v_state := v_state || jsonb_build_object(
        'pendingCloseAnswer', jsonb_build_object(
          'answerIndex', v_match.answer_index,
          'answerLabel', v_match.answer_label,
          'team', v_team
        )
      );
      UPDATE public.family_game_rooms SET state = v_state, updated_at = now() WHERE id = p_room_id RETURNING * INTO v_room;
      RETURN jsonb_build_object('room', to_jsonb(v_room), 'status', 'close', 'message', 'Réponse proche détectée.');
    END IF;

    IF v_match.match_status = 'accepted' AND v_found @> jsonb_build_array(v_match.answer_index) THEN
      RETURN jsonb_build_object('room', to_jsonb(v_room), 'status', 'duplicate', 'message', 'Cette réponse a déjà été trouvée.');
    END IF;

    IF v_match.match_status = 'accepted' THEN
      v_points := (ARRAY[40,30,25,20,15,10,5,3])[v_match.answer_index + 1];
      v_found := v_found || jsonb_build_array(v_match.answer_index);
      v_bank := v_bank + v_points;
      v_message := v_match.answer_label || ' est au tableau !';
      v_status := 'accepted';
      IF v_phase = 'steal' THEN
        v_winner := v_team;
        v_message := 'Cagnotte volée !';
        v_status := 'round_finished';
      ELSIF jsonb_array_length(v_found) >= 8 THEN
        v_winner := v_control;
        v_message := 'Tout le tableau a été trouvé.';
        v_status := 'round_finished';
      ELSE
        v_state := v_state || jsonb_build_object(
          'foundAnswers', v_found,
          'roundBank', v_bank,
          'feedback', v_message,
          'pendingCloseAnswer', null
        );
      END IF;
    ELSE
      IF v_phase = 'steal' THEN
        v_winner := v_control;
        v_message := 'Vol manqué : la famille en contrôle garde la cagnotte.';
        v_status := 'round_finished';
      ELSE
        v_strikes := v_strikes + 1;
        IF v_strikes >= 3 THEN
          v_state := v_state || jsonb_build_object(
            'challengePhase', 'steal',
            'strikes', 3,
            'timerDeadline', null,
            'feedback', 'Trois erreurs : tentative de vol.'
          );
        ELSE
          v_state := v_state || jsonb_build_object(
            'strikes', v_strikes,
            'feedback', v_message
          );
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_status = 'round_finished' THEN
    IF v_winner = 0 THEN
      v_scores := jsonb_build_array((v_scores->>0)::INTEGER + v_bank, (v_scores->>1)::INTEGER);
    ELSE
      v_scores := jsonb_build_array((v_scores->>0)::INTEGER, (v_scores->>1)::INTEGER + v_bank);
    END IF;
    v_history := v_history || jsonb_build_array(jsonb_build_object(
      'round', COALESCE((v_state->>'challengeIndex')::INTEGER, 0) + 1,
      'winner', v_winner,
      'bank', v_bank,
      'foundAnswers', v_found,
      'strikes', v_strikes,
      'stolen', v_phase = 'steal' AND v_winner <> v_control
    ));
    v_state := v_state || jsonb_build_object(
      'scores', v_scores,
      'roundWinner', v_winner,
      'challengePhase', 'round-end',
      'foundAnswers', v_found,
      'roundBank', v_bank,
      'roundHistory', v_history,
      'timerDeadline', null,
      'feedback', v_message,
      'pendingCloseAnswer', null
    );
  END IF;

  UPDATE public.family_game_rooms
  SET state = v_state, status = v_room.status, updated_at = now()
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  RETURN jsonb_build_object('room', to_jsonb(v_room), 'status', v_status, 'message', v_message);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_family_game_action(
  p_room_id UUID,
  p_foyer_id UUID,
  p_action TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS public.family_game_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_room public.family_game_rooms;
  v_state JSONB;
  v_scores JSONB;
  v_rounds INTEGER;
  v_next_index INTEGER;
  v_disconnect UUID;
  v_pending JSONB;
  v_answer_index INTEGER;
  v_user_id UUID := auth.uid();
  v_team INTEGER;
  v_is_host BOOLEAN;
BEGIN
  SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.expires_at <= now() THEN RAISE EXCEPTION 'Partie indisponible ou expirée'; END IF;
  IF p_foyer_id NOT IN (v_room.host_foyer_id, v_room.guest_foyer_id)
     OR p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à cette partie';
  END IF;
  IF v_user_id = v_room.host_user_id THEN
    v_team := 0;
  ELSIF v_user_id = v_room.guest_user_id THEN
    v_team := 1;
  ELSE
    RAISE EXCEPTION 'Ce compte ne participe pas à cette partie';
  END IF;
  v_is_host := v_team = 0;

  v_state := COALESCE(v_room.state, '{}'::jsonb);
  v_scores := COALESCE(v_state->'scores', '[0,0]'::jsonb);
  v_rounds := LEAST(9, GREATEST(1, COALESCE((p_payload->>'totalRounds')::INTEGER, COALESCE((v_state->>'totalRounds')::INTEGER, 5))));

  CASE p_action
    WHEN 'configure' THEN
      IF NOT v_is_host OR COALESCE((v_state->>'challengeIndex')::INTEGER, 0) > 0 THEN
        RAISE EXCEPTION 'Configuration non autorisée';
      END IF;
      IF NOT public.validate_family_challenge_question(p_payload->'question') THEN
        RAISE EXCEPTION 'Question invalide';
      END IF;
      v_state := v_state || jsonb_build_object(
        'totalRounds', v_rounds,
        'scores', v_scores,
        'challengePhase', 'faceoff',
        'challengeIndex', 0,
        'question', p_payload->'question',
        'filters', COALESCE(p_payload->'filters', '{}'::jsonb),
        'teamMembers', COALESCE(p_payload->'teamMembers', '[]'::jsonb),
        'teamCaptains', COALESCE(p_payload->'teamCaptains', '[]'::jsonb),
        'roundHistory', '[]'::jsonb,
        'hostSubmitted', false,
        'guestSubmitted', false,
        'submittedAnswers', null,
        'suddenDeath', false
      );
    WHEN 'start_timer' THEN
      IF NOT v_is_host THEN RAISE EXCEPTION 'Seul l’hôte lance le minuteur'; END IF;
      IF COALESCE(v_state->>'challengePhase', '') NOT IN ('play', 'steal') THEN RAISE EXCEPTION 'Phase invalide'; END IF;
      v_state := jsonb_set(v_state, '{timerDeadline}', to_jsonb(now() + make_interval(secs => LEAST(120, GREATEST(20, COALESCE((p_payload->>'seconds')::INTEGER, 60))))));
    WHEN 'next_round' THEN
      IF NOT v_is_host THEN RAISE EXCEPTION 'Seul l’hôte lance la manche'; END IF;
      IF COALESCE(v_state->>'challengePhase', '') <> 'round-end' THEN RAISE EXCEPTION 'La manche n’est pas terminée'; END IF;
      IF NOT public.validate_family_challenge_question(p_payload->'question') THEN RAISE EXCEPTION 'Question invalide'; END IF;
      v_next_index := COALESCE((v_state->>'challengeIndex')::INTEGER, 0) + 1;
      IF v_next_index >= v_rounds AND (v_scores->>0)::INTEGER <> (v_scores->>1)::INTEGER THEN
        v_room.status := 'finished';
        v_state := v_state || jsonb_build_object(
          'challengePhase', 'game-end',
          'finalWinner', CASE WHEN (v_scores->>0)::INTEGER > (v_scores->>1)::INTEGER THEN 0 ELSE 1 END,
          'finishedAt', now()
        );
      ELSE
        v_state := v_state || jsonb_build_object(
          'challengeIndex', v_next_index,
          'challengePhase', 'faceoff',
          'question', p_payload->'question',
          'foundAnswers', '[]'::jsonb,
          'strikes', 0,
          'roundBank', 0,
          'hostSubmitted', false,
          'guestSubmitted', false,
          'submittedAnswers', null,
          'timerDeadline', null,
          'pendingCloseAnswer', null,
          'suddenDeath', v_next_index >= v_rounds
        );
      END IF;
    WHEN 'confirm_close_answer' THEN
      v_pending := v_state->'pendingCloseAnswer';
      IF v_pending IS NULL OR COALESCE((v_pending->>'team')::INTEGER, -1) <> v_team THEN
        RAISE EXCEPTION 'Aucune réponse à confirmer';
      END IF;
      v_answer_index := (v_pending->>'answerIndex')::INTEGER;
      v_state := v_state - 'pendingCloseAnswer';
      UPDATE public.family_game_rooms SET state = v_state, updated_at = now() WHERE id = p_room_id RETURNING * INTO v_room;
      PERFORM public.submit_family_challenge_guess(
        p_room_id,
        p_foyer_id,
        v_state->'question'->'answers'->v_answer_index->>'label'
      );
      SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id;
      RETURN v_room;
    WHEN 'reject_close_answer' THEN
      v_pending := v_state->'pendingCloseAnswer';
      IF v_pending IS NULL OR COALESCE((v_pending->>'team')::INTEGER, -1) <> v_team THEN
        RAISE EXCEPTION 'Aucune réponse à refuser';
      END IF;
      v_state := v_state - 'pendingCloseAnswer';
      UPDATE public.family_game_rooms SET state = v_state, updated_at = now() WHERE id = p_room_id RETURNING * INTO v_room;
      PERFORM public.submit_family_challenge_guess(p_room_id, p_foyer_id, '__reponse_refusee__');
      SELECT * INTO v_room FROM public.family_game_rooms WHERE id = p_room_id;
      RETURN v_room;
    WHEN 'resume' THEN
      IF v_state->>'disconnectedFoyerId' = p_foyer_id::TEXT THEN
        v_state := v_state || jsonb_build_object('disconnectedFoyerId', null, 'reconnectDeadline', null);
      END IF;
    WHEN 'claim_forfeit' THEN
      v_disconnect := NULLIF(v_state->>'disconnectedFoyerId', '')::UUID;
      IF v_disconnect IS NULL OR NULLIF(v_state->>'reconnectDeadline', '')::TIMESTAMPTZ > now() THEN
        RAISE EXCEPTION 'Le délai de reconnexion n’est pas terminé';
      END IF;
      IF p_foyer_id = v_disconnect THEN RAISE EXCEPTION 'Action non autorisée'; END IF;
      v_state := v_state || jsonb_build_object('challengePhase', 'game-end', 'finalWinner', v_team, 'finishedAt', now(), 'forfeit', true);
      v_room.status := 'finished';
    WHEN 'leave' THEN
      IF v_room.status = 'waiting' THEN
        v_room.status := 'cancelled';
      ELSE
        v_state := v_state || jsonb_build_object(
          'disconnectedFoyerId', p_foyer_id,
          'reconnectDeadline', now() + interval '2 minutes'
        );
      END IF;
    WHEN 'cancel' THEN
      IF NOT v_is_host THEN RAISE EXCEPTION 'Seul l’hôte peut annuler'; END IF;
      IF v_room.status = 'active' THEN RAISE EXCEPTION 'Quittez la partie active pour laisser un délai de reconnexion'; END IF;
      v_room.status := 'cancelled';
    WHEN 'finish_game' THEN
      IF NOT v_is_host THEN RAISE EXCEPTION 'Seul l’hôte clôture la partie'; END IF;
      v_room.status := 'finished';
      v_state := v_state || jsonb_build_object('challengePhase', 'game-end', 'finishedAt', now());
    WHEN 'expire_turn' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Action de jeu inconnue';
  END CASE;

  UPDATE public.family_game_rooms
  SET state = v_state, status = v_room.status, updated_at = now()
  WHERE id = p_room_id
  RETURNING * INTO v_room;
  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_family_game_answer(UUID, UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_family_challenge_guess(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_family_game_action(UUID, UUID, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_family_game_answer(UUID, UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_family_challenge_guess(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_family_game_action(UUID, UUID, TEXT, JSONB) TO authenticated;
