-- Racines familiales: profils genealogiques limites, connexions confirmees et evenements.

CREATE TABLE IF NOT EXISTS public.family_tree_settings (
  foyer_id UUID PRIMARY KEY REFERENCES public.foyers(id) ON DELETE CASCADE,
  share_code TEXT NOT NULL UNIQUE DEFAULT (
    'RAC-' || UPPER(SUBSTRING(MD5(GEN_RANDOM_UUID()::TEXT) FROM 1 FOR 7))
  ),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_tree_profiles (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  member_id TEXT,
  display_name TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(display_name)) BETWEEN 1 AND 80),
  birth_date DATE,
  branch TEXT NOT NULL DEFAULT 'proche'
    CHECK (branch IN ('proche', 'paternelle', 'maternelle', 'autre')),
  country TEXT,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  visibility TEXT NOT NULL DEFAULT 'famille'
    CHECK (visibility IN ('prive', 'famille', 'masque')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (foyer_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.family_tree_connections (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  requester_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  target_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  requester_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  target_profile_id UUID REFERENCES public.family_tree_profiles(id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('parent', 'enfant', 'fratrie', 'cousin', 'conjoint', 'oncle_tante', 'grand_parent', 'famille')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_foyer_id <> target_foyer_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS family_tree_active_connection_pair_idx
  ON public.family_tree_connections (
    LEAST(requester_foyer_id, target_foyer_id),
    GREATEST(requester_foyer_id, target_foyer_id)
  )
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS family_tree_profiles_foyer_idx
  ON public.family_tree_profiles (foyer_id, branch, visibility);

CREATE TABLE IF NOT EXISTS public.family_tree_relationships (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  source_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('parent', 'enfant', 'fratrie', 'conjoint', 'oncle_tante', 'grand_parent', 'famille')),
  created_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_profile_id <> target_profile_id),
  UNIQUE (source_profile_id, target_profile_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS family_tree_relationships_foyer_idx
  ON public.family_tree_relationships (foyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS family_tree_connections_requester_idx
  ON public.family_tree_connections (requester_foyer_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS family_tree_connections_target_idx
  ON public.family_tree_connections (target_foyer_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.family_tree_events (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.family_tree_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('anniversaire', 'mariage', 'deces', 'reunion', 'autre')),
  title TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(title)) BETWEEN 1 AND 120),
  event_date DATE NOT NULL,
  repeats_yearly BOOLEAN NOT NULL DEFAULT FALSE,
  visibility TEXT NOT NULL DEFAULT 'famille' CHECK (visibility IN ('prive', 'famille')),
  created_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS family_tree_events_foyer_date_idx
  ON public.family_tree_events (foyer_id, event_date);

ALTER TABLE public.family_tree_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_family_tree_foyer(p_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_foyer_id IN (SELECT public.user_foyer_ids())
    OR EXISTS (
      SELECT 1
      FROM public.family_tree_connections c
      WHERE c.status = 'confirmed'
        AND (
          (c.requester_foyer_id IN (SELECT public.user_foyer_ids()) AND c.target_foyer_id = p_foyer_id)
          OR
          (c.target_foyer_id IN (SELECT public.user_foyer_ids()) AND c.requester_foyer_id = p_foyer_id)
        )
    );
$$;

DROP POLICY IF EXISTS family_tree_settings_select ON public.family_tree_settings;
CREATE POLICY family_tree_settings_select ON public.family_tree_settings FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

DROP POLICY IF EXISTS family_tree_settings_insert ON public.family_tree_settings;
CREATE POLICY family_tree_settings_insert ON public.family_tree_settings FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_settings_update ON public.family_tree_settings;
CREATE POLICY family_tree_settings_update ON public.family_tree_settings FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_profiles_select ON public.family_tree_profiles;
CREATE POLICY family_tree_profiles_select ON public.family_tree_profiles FOR SELECT
  USING (
    foyer_id IN (SELECT public.user_foyer_ids())
    OR (visibility = 'famille' AND public.can_view_family_tree_foyer(foyer_id))
  );

DROP POLICY IF EXISTS family_tree_profiles_insert ON public.family_tree_profiles;
CREATE POLICY family_tree_profiles_insert ON public.family_tree_profiles FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_profiles_update ON public.family_tree_profiles;
CREATE POLICY family_tree_profiles_update ON public.family_tree_profiles FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_profiles_delete ON public.family_tree_profiles;
CREATE POLICY family_tree_profiles_delete ON public.family_tree_profiles FOR DELETE
  USING (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_relationships_select ON public.family_tree_relationships;
CREATE POLICY family_tree_relationships_select ON public.family_tree_relationships FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

DROP POLICY IF EXISTS family_tree_relationships_insert ON public.family_tree_relationships;
CREATE POLICY family_tree_relationships_insert ON public.family_tree_relationships FOR INSERT
  WITH CHECK (
    public.is_foyer_admin_or_parent(foyer_id)
    AND created_by = AUTH.UID()
    AND EXISTS (SELECT 1 FROM public.family_tree_profiles p WHERE p.id = source_profile_id AND p.foyer_id = foyer_id)
    AND EXISTS (SELECT 1 FROM public.family_tree_profiles p WHERE p.id = target_profile_id AND p.foyer_id = foyer_id)
  );

DROP POLICY IF EXISTS family_tree_relationships_delete ON public.family_tree_relationships;
CREATE POLICY family_tree_relationships_delete ON public.family_tree_relationships FOR DELETE
  USING (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_connections_select ON public.family_tree_connections;
CREATE POLICY family_tree_connections_select ON public.family_tree_connections FOR SELECT
  USING (
    requester_foyer_id IN (SELECT public.user_foyer_ids())
    OR target_foyer_id IN (SELECT public.user_foyer_ids())
  );

DROP POLICY IF EXISTS family_tree_events_select ON public.family_tree_events;
CREATE POLICY family_tree_events_select ON public.family_tree_events FOR SELECT
  USING (
    foyer_id IN (SELECT public.user_foyer_ids())
    OR (visibility = 'famille' AND public.can_view_family_tree_foyer(foyer_id))
  );

DROP POLICY IF EXISTS family_tree_events_insert ON public.family_tree_events;
CREATE POLICY family_tree_events_insert ON public.family_tree_events FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id) AND created_by = AUTH.UID());

DROP POLICY IF EXISTS family_tree_events_update ON public.family_tree_events;
CREATE POLICY family_tree_events_update ON public.family_tree_events FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_events_delete ON public.family_tree_events;
CREATE POLICY family_tree_events_delete ON public.family_tree_events FOR DELETE
  USING (public.is_foyer_admin_or_parent(foyer_id));

CREATE OR REPLACE FUNCTION public.request_family_tree_connection(
  p_requester_foyer_id UUID,
  p_target_code TEXT,
  p_requester_profile_id UUID,
  p_relationship_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_foyer_id UUID;
  v_connection_id UUID;
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_requester_foyer_id) THEN
    RAISE EXCEPTION 'Acces refuse a ce foyer';
  END IF;

  IF p_relationship_type NOT IN ('parent', 'enfant', 'fratrie', 'cousin', 'conjoint', 'oncle_tante', 'grand_parent', 'famille') THEN
    RAISE EXCEPTION 'Lien familial invalide';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_tree_profiles
    WHERE id = p_requester_profile_id AND foyer_id = p_requester_foyer_id
  ) THEN
    RAISE EXCEPTION 'Profil source invalide';
  END IF;

  SELECT foyer_id INTO v_target_foyer_id
  FROM public.family_tree_settings
  WHERE UPPER(TRIM(share_code)) = UPPER(TRIM(p_target_code))
    AND enabled = TRUE;

  IF v_target_foyer_id IS NULL THEN
    RAISE EXCEPTION 'Code Racines introuvable';
  END IF;

  IF v_target_foyer_id = p_requester_foyer_id THEN
    RAISE EXCEPTION 'Ce code appartient deja a votre foyer';
  END IF;

  INSERT INTO public.family_tree_connections (
    requester_foyer_id, target_foyer_id, requester_profile_id,
    relationship_type, requested_by
  ) VALUES (
    p_requester_foyer_id, v_target_foyer_id, p_requester_profile_id,
    p_relationship_type, AUTH.UID()
  )
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_family_tree_connection(
  p_connection_id UUID,
  p_accept BOOLEAN,
  p_target_profile_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection public.family_tree_connections;
BEGIN
  SELECT * INTO v_connection
  FROM public.family_tree_connections
  WHERE id = p_connection_id AND status = 'pending'
  FOR UPDATE;

  IF v_connection.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_connection.target_foyer_id) THEN
    RAISE EXCEPTION 'Demande introuvable ou acces refuse';
  END IF;

  IF p_accept THEN
    IF p_target_profile_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.family_tree_profiles
      WHERE id = p_target_profile_id AND foyer_id = v_connection.target_foyer_id
    ) THEN
      RAISE EXCEPTION 'Choisissez le membre relie a cette branche';
    END IF;

    UPDATE public.family_tree_connections
    SET status = 'confirmed', target_profile_id = p_target_profile_id,
        confirmed_by = AUTH.UID(), confirmed_at = NOW(), updated_at = NOW()
    WHERE id = p_connection_id;
  ELSE
    UPDATE public.family_tree_connections
    SET status = 'rejected', confirmed_by = AUTH.UID(), updated_at = NOW()
    WHERE id = p_connection_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_family_tree_connection(p_connection_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection public.family_tree_connections;
BEGIN
  SELECT * INTO v_connection FROM public.family_tree_connections WHERE id = p_connection_id FOR UPDATE;
  IF v_connection.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_connection.requester_foyer_id) THEN
    RAISE EXCEPTION 'Demande introuvable ou acces refuse';
  END IF;
  UPDATE public.family_tree_connections
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_connection_id AND status IN ('pending', 'confirmed');
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_family_tree_code(p_foyer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_foyer_id) THEN
    RAISE EXCEPTION 'Acces refuse a ce foyer';
  END IF;

  LOOP
    v_code := 'RAC-' || UPPER(SUBSTRING(MD5(GEN_RANDOM_UUID()::TEXT) FROM 1 FOR 7));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.family_tree_settings WHERE share_code = v_code);
  END LOOP;

  INSERT INTO public.family_tree_settings (foyer_id, share_code)
  VALUES (p_foyer_id, v_code)
  ON CONFLICT (foyer_id) DO UPDATE SET share_code = EXCLUDED.share_code, updated_at = NOW();

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.request_family_tree_connection(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_family_tree_connection(UUID, BOOLEAN, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_family_tree_connection(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_family_tree_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_family_tree_connection(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_family_tree_connection(UUID, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_family_tree_connection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_family_tree_code(UUID) TO authenticated;
