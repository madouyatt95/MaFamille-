CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.family_game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('memory', 'connect4', 'family-challenge', 'draw-guess', 'mime-challenge')),
  winner_name TEXT,
  player_names TEXT[] NOT NULL DEFAULT '{}',
  scores INTEGER[] NOT NULL DEFAULT '{}',
  duration_seconds INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS family_game_results_foyer_played_idx
  ON public.family_game_results (foyer_id, played_at DESC);

ALTER TABLE public.family_game_results ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.family_game_results TO authenticated;

DROP POLICY IF EXISTS "family_game_results_select" ON public.family_game_results;
CREATE POLICY "family_game_results_select" ON public.family_game_results
FOR SELECT TO authenticated
USING (foyer_id IN (SELECT public.user_foyer_ids()));

DROP POLICY IF EXISTS "family_game_results_insert" ON public.family_game_results;
CREATE POLICY "family_game_results_insert" ON public.family_game_results
FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid()
  AND foyer_id IN (SELECT public.user_foyer_ids())
);

CREATE TABLE IF NOT EXISTS public.family_game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE CHECK (room_code ~ '^[A-Z0-9]{6}$'),
  game_type TEXT NOT NULL CHECK (game_type IN ('memory', 'connect4', 'family-challenge', 'draw-guess', 'mime-challenge')),
  host_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  guest_foyer_id UUID REFERENCES public.foyers(id) ON DELETE SET NULL,
  host_name TEXT NOT NULL,
  guest_name TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CHECK (guest_foyer_id IS NULL OR guest_foyer_id <> host_foyer_id)
);

CREATE INDEX IF NOT EXISTS family_game_rooms_participants_idx
  ON public.family_game_rooms (host_foyer_id, guest_foyer_id, status);
CREATE INDEX IF NOT EXISTS family_game_rooms_expiry_idx
  ON public.family_game_rooms (expires_at);

ALTER TABLE public.family_game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_game_rooms REPLICA IDENTITY FULL;
GRANT SELECT ON public.family_game_rooms TO authenticated;

DROP POLICY IF EXISTS "family_game_rooms_select" ON public.family_game_rooms;
CREATE POLICY "family_game_rooms_select" ON public.family_game_rooms
FOR SELECT TO authenticated USING (
  host_foyer_id IN (SELECT public.user_foyer_ids())
  OR guest_foyer_id IN (SELECT public.user_foyer_ids())
);

DROP POLICY IF EXISTS "family_game_rooms_update" ON public.family_game_rooms;
CREATE POLICY "family_game_rooms_update" ON public.family_game_rooms
FOR UPDATE TO authenticated USING (
  host_foyer_id IN (SELECT public.user_foyer_ids())
  OR guest_foyer_id IN (SELECT public.user_foyer_ids())
) WITH CHECK (
  host_foyer_id IN (SELECT public.user_foyer_ids())
  OR guest_foyer_id IN (SELECT public.user_foyer_ids())
);

REVOKE INSERT, DELETE ON public.family_game_rooms FROM authenticated;
REVOKE UPDATE ON public.family_game_rooms FROM authenticated;
GRANT UPDATE (state, status, updated_at) ON public.family_game_rooms TO authenticated;

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

  IF p_game_type NOT IN ('memory', 'connect4', 'family-challenge', 'draw-guess', 'mime-challenge') THEN
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
  IF p_foyer_id NOT IN (SELECT public.user_foyer_ids()) THEN
    RAISE EXCEPTION 'Accès refusé à ce foyer';
  END IF;

  SELECT * INTO v_room
  FROM public.family_game_rooms
  WHERE room_code = upper(trim(p_room_code))
    AND status = 'waiting'
    AND expires_at > now()
  FOR UPDATE;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Code invalide ou partie expirée';
  END IF;
  IF v_room.host_foyer_id = p_foyer_id THEN
    RAISE EXCEPTION 'Une autre famille doit rejoindre cette partie';
  END IF;

  UPDATE public.family_game_rooms
  SET guest_foyer_id = p_foyer_id,
      guest_name = left(trim(p_guest_name), 80),
      status = 'active',
      updated_at = now()
  WHERE id = v_room.id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

REVOKE ALL ON FUNCTION public.create_family_game_room(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_family_game_room(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_family_game_room(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family_game_room(UUID, TEXT, TEXT) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.family_game_rooms;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
