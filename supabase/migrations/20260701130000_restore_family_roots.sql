-- Restauration complète du module Racines familiales après sa suppression temporaire.

CREATE TABLE IF NOT EXISTS public.family_tree_settings (
  foyer_id UUID PRIMARY KEY REFERENCES public.foyers(id) ON DELETE CASCADE,
  share_code TEXT NOT NULL UNIQUE DEFAULT (
    'RAC-' || UPPER(SUBSTRING(MD5(GEN_RANDOM_UUID()::TEXT) FROM 1 FOR 7))
  ),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_code_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE TABLE IF NOT EXISTS public.family_tree_profiles (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  member_id TEXT,
  display_name TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(display_name)) BETWEEN 1 AND 80),
  birth_date DATE,
  branch TEXT NOT NULL DEFAULT 'proche' CHECK (branch IN ('proche', 'paternelle', 'maternelle', 'autre')),
  country TEXT,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  visibility TEXT NOT NULL DEFAULT 'famille' CHECK (visibility IN ('prive', 'famille', 'masque')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nickname TEXT,
  bio TEXT,
  languages TEXT[] NOT NULL DEFAULT '{}',
  origin_city TEXT,
  photo_url TEXT,
  is_memorial BOOLEAN NOT NULL DEFAULT FALSE,
  death_date DATE,
  shared_fields TEXT[] NOT NULL DEFAULT ARRAY[
    'display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url', 'bio', 'languages'
  ],
  UNIQUE (foyer_id, member_id),
  CONSTRAINT family_tree_profiles_death_date_check CHECK (death_date IS NULL OR birth_date IS NULL OR death_date >= birth_date)
);

CREATE TABLE IF NOT EXISTS public.family_tree_connections (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  requester_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  target_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  requester_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  requester_display_name TEXT NOT NULL DEFAULT 'Membre de la famille',
  target_profile_id UUID REFERENCES public.family_tree_profiles(id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'parent', 'enfant', 'fratrie', 'cousin', 'conjoint',
    'oncle_tante', 'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_foyer_id <> target_foyer_id)
);

CREATE TABLE IF NOT EXISTS public.family_tree_relationships (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  source_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'parent', 'enfant', 'fratrie', 'cousin', 'conjoint',
    'oncle_tante', 'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  )),
  created_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_profile_id <> target_profile_id),
  UNIQUE (source_profile_id, target_profile_id, relationship_type)
);

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agenda_event_id TEXT
);

CREATE TABLE IF NOT EXISTS public.family_tree_identity_requests (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  requester_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  target_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  source_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  CHECK (requester_foyer_id <> target_foyer_id),
  CHECK (source_profile_id <> target_profile_id)
);

CREATE TABLE IF NOT EXISTS public.family_tree_correction_requests (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL CHECK (field_name IN (
    'display_name', 'nickname', 'birth_date', 'death_date', 'branch',
    'country', 'origin_city', 'bio', 'languages', 'relationship'
  )),
  current_value TEXT,
  proposed_value TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(proposed_value)) BETWEEN 1 AND 300),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.family_tree_memories (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(title)) BETWEEN 1 AND 120),
  note TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(note)) BETWEEN 1 AND 1200),
  memory_date DATE,
  visibility TEXT NOT NULL DEFAULT 'famille' CHECK (visibility IN ('prive', 'famille')),
  created_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  photo_url TEXT
);

CREATE TABLE IF NOT EXISTS public.family_tree_validation_logs (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(summary)) BETWEEN 1 AND 240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexations
CREATE UNIQUE INDEX IF NOT EXISTS family_tree_active_connection_pair_idx
  ON public.family_tree_connections (
    LEAST(requester_foyer_id, target_foyer_id),
    GREATEST(requester_foyer_id, target_foyer_id)
  )
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS family_tree_profiles_foyer_idx
  ON public.family_tree_profiles (foyer_id, branch, visibility);

CREATE INDEX IF NOT EXISTS family_tree_relationships_foyer_idx
  ON public.family_tree_relationships (foyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS family_tree_connections_requester_idx
  ON public.family_tree_connections (requester_foyer_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS family_tree_connections_target_idx
  ON public.family_tree_connections (target_foyer_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS family_tree_events_foyer_date_idx
  ON public.family_tree_events (foyer_id, event_date);

CREATE UNIQUE INDEX IF NOT EXISTS family_tree_identity_active_pair_idx
  ON public.family_tree_identity_requests (
    LEAST(source_profile_id, target_profile_id),
    GREATEST(source_profile_id, target_profile_id)
  )
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS family_tree_corrections_foyer_idx
  ON public.family_tree_correction_requests (foyer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS family_tree_memories_profile_idx
  ON public.family_tree_memories (foyer_id, profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS family_tree_validation_logs_foyer_idx
  ON public.family_tree_validation_logs (foyer_id, created_at DESC);

-- Activation de RLS
ALTER TABLE public.family_tree_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_identity_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_validation_logs ENABLE ROW LEVEL SECURITY;

-- Helper function can_view_family_tree_foyer
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

-- RLS Policies
DROP POLICY IF EXISTS family_tree_settings_select ON public.family_tree_settings;
DROP POLICY IF EXISTS family_tree_settings_insert ON public.family_tree_settings;
DROP POLICY IF EXISTS family_tree_settings_update ON public.family_tree_settings;
DROP POLICY IF EXISTS family_tree_profiles_select ON public.family_tree_profiles;
DROP POLICY IF EXISTS family_tree_profiles_insert ON public.family_tree_profiles;
DROP POLICY IF EXISTS family_tree_profiles_update ON public.family_tree_profiles;
DROP POLICY IF EXISTS family_tree_profiles_delete ON public.family_tree_profiles;
DROP POLICY IF EXISTS family_tree_relationships_select ON public.family_tree_relationships;
DROP POLICY IF EXISTS family_tree_relationships_insert ON public.family_tree_relationships;
DROP POLICY IF EXISTS family_tree_relationships_delete ON public.family_tree_relationships;
DROP POLICY IF EXISTS family_tree_connections_select ON public.family_tree_connections;
DROP POLICY IF EXISTS family_tree_events_select ON public.family_tree_events;
DROP POLICY IF EXISTS family_tree_events_insert ON public.family_tree_events;
DROP POLICY IF EXISTS family_tree_events_update ON public.family_tree_events;
DROP POLICY IF EXISTS family_tree_events_delete ON public.family_tree_events;
DROP POLICY IF EXISTS family_tree_identity_select ON public.family_tree_identity_requests;
DROP POLICY IF EXISTS family_tree_corrections_select ON public.family_tree_correction_requests;
DROP POLICY IF EXISTS family_tree_corrections_insert ON public.family_tree_correction_requests;
DROP POLICY IF EXISTS family_tree_corrections_update ON public.family_tree_correction_requests;
DROP POLICY IF EXISTS family_tree_memories_select ON public.family_tree_memories;
DROP POLICY IF EXISTS family_tree_memories_insert ON public.family_tree_memories;
DROP POLICY IF EXISTS family_tree_logs_select ON public.family_tree_validation_logs;

CREATE POLICY family_tree_settings_select ON public.family_tree_settings FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY family_tree_settings_insert ON public.family_tree_settings FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_settings_update ON public.family_tree_settings FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_profiles_select ON public.family_tree_profiles FOR SELECT
  USING (
    foyer_id IN (SELECT public.user_foyer_ids())
    OR (visibility = 'famille' AND public.can_view_family_tree_foyer(foyer_id))
  );

CREATE POLICY family_tree_profiles_insert ON public.family_tree_profiles FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_profiles_update ON public.family_tree_profiles FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_profiles_delete ON public.family_tree_profiles FOR DELETE
  USING (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_relationships_select ON public.family_tree_relationships FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY family_tree_relationships_insert ON public.family_tree_relationships FOR INSERT
  WITH CHECK (
    public.is_foyer_admin_or_parent(foyer_id)
    AND created_by = AUTH.UID()
    AND EXISTS (SELECT 1 FROM public.family_tree_profiles p WHERE p.id = source_profile_id AND p.foyer_id = foyer_id)
    AND EXISTS (SELECT 1 FROM public.family_tree_profiles p WHERE p.id = target_profile_id AND p.foyer_id = foyer_id)
  );

CREATE POLICY family_tree_relationships_delete ON public.family_tree_relationships FOR DELETE
  USING (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_connections_select ON public.family_tree_connections FOR SELECT
  USING (
    requester_foyer_id IN (SELECT public.user_foyer_ids())
    OR target_foyer_id IN (SELECT public.user_foyer_ids())
  );

CREATE POLICY family_tree_events_select ON public.family_tree_events FOR SELECT
  USING (
    foyer_id IN (SELECT public.user_foyer_ids())
    OR (visibility = 'famille' AND public.can_view_family_tree_foyer(foyer_id))
  );

CREATE POLICY family_tree_events_insert ON public.family_tree_events FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id) AND created_by = AUTH.UID());

CREATE POLICY family_tree_events_update ON public.family_tree_events FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_events_delete ON public.family_tree_events FOR DELETE
  USING (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_identity_select ON public.family_tree_identity_requests FOR SELECT
  USING (
    requester_foyer_id IN (SELECT public.user_foyer_ids())
    OR target_foyer_id IN (SELECT public.user_foyer_ids())
  );

CREATE POLICY family_tree_corrections_select ON public.family_tree_correction_requests FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY family_tree_corrections_insert ON public.family_tree_correction_requests FOR INSERT
  WITH CHECK (
    foyer_id IN (SELECT public.user_foyer_ids())
    AND requested_by = AUTH.UID()
  );

CREATE POLICY family_tree_corrections_update ON public.family_tree_correction_requests FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_memories_select ON public.family_tree_memories FOR SELECT
  USING (
    foyer_id IN (SELECT public.user_foyer_ids())
    OR (
      visibility = 'famille'
      AND EXISTS (
        SELECT 1 FROM public.family_tree_profiles p
        WHERE p.id = profile_id
          AND p.visibility = 'famille'
          AND public.can_view_family_tree_foyer(p.foyer_id)
      )
    )
  );

CREATE POLICY family_tree_memories_insert ON public.family_tree_memories FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id) AND created_by = AUTH.UID());

CREATE POLICY family_tree_logs_select ON public.family_tree_validation_logs FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));


-- Procedures stockees
CREATE OR REPLACE FUNCTION public.log_family_tree_validation(
  p_foyer_id UUID,
  p_action TEXT,
  p_summary TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_foyer_admin_or_parent(p_foyer_id) THEN
    INSERT INTO public.family_tree_validation_logs (foyer_id, actor_user_id, action, summary)
    VALUES (p_foyer_id, AUTH.UID(), p_action, p_summary);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_family_tree_visible_profiles(p_viewer_foyer_id UUID)
RETURNS TABLE (
  id UUID,
  foyer_id UUID,
  member_id TEXT,
  display_name TEXT,
  birth_date DATE,
  branch TEXT,
  country TEXT,
  origin_city TEXT,
  nickname TEXT,
  bio TEXT,
  languages TEXT[],
  photo_url TEXT,
  is_memorial BOOLEAN,
  death_date DATE,
  is_minor BOOLEAN,
  visibility TEXT,
  shared_fields TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH connected_foyers AS (
    SELECT CASE
      WHEN c.requester_foyer_id = p_viewer_foyer_id THEN c.target_foyer_id
      ELSE c.requester_foyer_id
    END AS foyer_id
    FROM public.family_tree_connections c
    WHERE c.status = 'confirmed'
      AND (
        c.requester_foyer_id = p_viewer_foyer_id
        OR c.target_foyer_id = p_viewer_foyer_id
      )
      AND p_viewer_foyer_id IN (SELECT public.user_foyer_ids())
  )
  SELECT
    p.id,
    p.foyer_id,
    NULL::TEXT AS member_id,
    p.display_name,
    CASE WHEN 'birth_date' = ANY(p.shared_fields) THEN p.birth_date ELSE NULL END AS birth_date,
    p.branch,
    CASE WHEN 'country' = ANY(p.shared_fields) THEN p.country ELSE NULL END AS country,
    CASE WHEN 'origin_city' = ANY(p.shared_fields) THEN p.origin_city ELSE NULL END AS origin_city,
    CASE WHEN 'nickname' = ANY(p.shared_fields) THEN p.nickname ELSE NULL END AS nickname,
    CASE WHEN 'bio' = ANY(p.shared_fields) THEN p.bio ELSE NULL END AS bio,
    CASE WHEN 'languages' = ANY(p.shared_fields) THEN p.languages ELSE ARRAY[]::TEXT[] END AS languages,
    CASE WHEN 'photo_url' = ANY(p.shared_fields) THEN p.photo_url ELSE NULL END AS photo_url,
    p.is_memorial,
    CASE WHEN 'death_date' = ANY(p.shared_fields) THEN p.death_date ELSE NULL END AS death_date,
    p.is_minor,
    p.visibility,
    p.shared_fields
  FROM public.family_tree_profiles p
  JOIN connected_foyers f ON f.foyer_id = p.foyer_id
  WHERE p.visibility = 'famille';
$$;

CREATE OR REPLACE FUNCTION public.add_family_tree_relationship(
  p_foyer_id UUID,
  p_source_profile_id UUID,
  p_target_profile_id UUID,
  p_relationship_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.family_tree_profiles;
  v_target public.family_tree_profiles;
  v_direct_type TEXT;
  v_inverse_type TEXT;
  v_direct_source UUID;
  v_direct_target UUID;
  v_id UUID;
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_foyer_id) THEN
    RAISE EXCEPTION 'Acces refuse a ce foyer';
  END IF;
  IF p_source_profile_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Une personne ne peut pas etre reliee a elle-meme';
  END IF;
  IF p_relationship_type NOT IN (
    'parent', 'enfant', 'fratrie', 'cousin', 'conjoint',
    'oncle_tante', 'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  ) THEN
    RAISE EXCEPTION 'Lien familial invalide';
  END IF;

  SELECT * INTO v_source FROM public.family_tree_profiles
  WHERE id = p_source_profile_id AND foyer_id = p_foyer_id;
  SELECT * INTO v_target FROM public.family_tree_profiles
  WHERE id = p_target_profile_id AND foyer_id = p_foyer_id;
  IF v_source.id IS NULL OR v_target.id IS NULL THEN
    RAISE EXCEPTION 'Profil familial introuvable';
  END IF;

  v_direct_source := p_source_profile_id;
  v_direct_target := p_target_profile_id;
  v_direct_type := p_relationship_type;
  v_inverse_type := CASE p_relationship_type
    WHEN 'parent' THEN 'enfant'
    WHEN 'enfant' THEN 'parent'
    WHEN 'grand_parent' THEN 'petit_enfant'
    WHEN 'petit_enfant' THEN 'grand_parent'
    WHEN 'oncle_tante' THEN 'neveu_niece'
    WHEN 'neveu_niece' THEN 'oncle_tante'
    ELSE p_relationship_type
  END;

  IF p_relationship_type = 'enfant' THEN
    v_direct_source := p_target_profile_id;
    v_direct_target := p_source_profile_id;
    v_direct_type := 'parent';
    v_inverse_type := 'enfant';
    v_source := v_target;
    SELECT * INTO v_target FROM public.family_tree_profiles WHERE id = p_source_profile_id;
  END IF;

  IF v_direct_type = 'parent' THEN
    IF v_source.birth_date IS NOT NULL AND v_target.birth_date IS NOT NULL
       AND v_source.birth_date > v_target.birth_date - INTERVAL '12 years' THEN
      RAISE EXCEPTION 'Les dates de naissance ne sont pas coherentes avec ce lien parent-enfant';
    END IF;
    IF EXISTS (
      WITH RECURSIVE descendants(id) AS (
        SELECT target_profile_id
        FROM public.family_tree_relationships
        WHERE foyer_id = p_foyer_id
          AND source_profile_id = v_direct_target
          AND relationship_type = 'parent'
        UNION
        SELECT r.target_profile_id
        FROM public.family_tree_relationships r
        JOIN descendants d ON d.id = r.source_profile_id
        WHERE r.foyer_id = p_foyer_id AND r.relationship_type = 'parent'
      )
      SELECT 1 FROM descendants WHERE id = v_direct_source
    ) THEN
      RAISE EXCEPTION 'Ce lien creerait une boucle impossible dans l arbre';
    END IF;
  END IF;

  INSERT INTO public.family_tree_relationships (
    foyer_id, source_profile_id, target_profile_id, relationship_type, created_by
  ) VALUES (
    p_foyer_id, v_direct_source, v_direct_target, v_direct_type, AUTH.UID()
  )
  ON CONFLICT (source_profile_id, target_profile_id, relationship_type) DO UPDATE
    SET relationship_type = EXCLUDED.relationship_type
  RETURNING id INTO v_id;

  INSERT INTO public.family_tree_relationships (
    foyer_id, source_profile_id, target_profile_id, relationship_type, created_by
  ) VALUES (
    p_foyer_id, v_direct_target, v_direct_source, v_inverse_type, AUTH.UID()
  )
  ON CONFLICT (source_profile_id, target_profile_id, relationship_type) DO NOTHING;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_family_tree_relationship(
  p_foyer_id UUID,
  p_relationship_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_relation public.family_tree_relationships;
  v_inverse TEXT;
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_foyer_id) THEN
    RAISE EXCEPTION 'Acces refuse a ce foyer';
  END IF;
  SELECT * INTO v_relation FROM public.family_tree_relationships
  WHERE id = p_relationship_id AND foyer_id = p_foyer_id;
  IF v_relation.id IS NULL THEN RETURN; END IF;
  v_inverse := CASE v_relation.relationship_type
    WHEN 'parent' THEN 'enfant' WHEN 'enfant' THEN 'parent'
    WHEN 'grand_parent' THEN 'petit_enfant' WHEN 'petit_enfant' THEN 'grand_parent'
    WHEN 'oncle_tante' THEN 'neveu_niece' WHEN 'neveu_niece' THEN 'oncle_tante'
    ELSE v_relation.relationship_type
  END;
  DELETE FROM public.family_tree_relationships
  WHERE foyer_id = p_foyer_id AND (
    id = p_relationship_id OR (
      source_profile_id = v_relation.target_profile_id
      AND target_profile_id = v_relation.source_profile_id
      AND relationship_type = v_inverse
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_family_tree_identity_link(
  p_source_profile_id UUID,
  p_target_profile_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.family_tree_profiles;
  v_target public.family_tree_profiles;
  v_id UUID;
BEGIN
  SELECT * INTO v_source FROM public.family_tree_profiles WHERE id = p_source_profile_id;
  SELECT * INTO v_target FROM public.family_tree_profiles WHERE id = p_target_profile_id;
  IF v_source.id IS NULL OR v_target.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_source.foyer_id) THEN
    RAISE EXCEPTION 'Profils introuvables ou acces refuse';
  END IF;
  IF v_source.foyer_id = v_target.foyer_id OR NOT EXISTS (
    SELECT 1 FROM public.family_tree_connections c
    WHERE c.status = 'confirmed' AND (
      (c.requester_foyer_id = v_source.foyer_id AND c.target_foyer_id = v_target.foyer_id)
      OR (c.target_foyer_id = v_source.foyer_id AND c.requester_foyer_id = v_target.foyer_id)
    )
  ) THEN
    RAISE EXCEPTION 'Les deux branches doivent etre reliees avant de rapprocher ces profils';
  END IF;
  INSERT INTO public.family_tree_identity_requests (
    requester_foyer_id, target_foyer_id, source_profile_id, target_profile_id, requested_by
  ) VALUES (
    v_source.foyer_id, v_target.foyer_id, v_source.id, v_target.id, AUTH.UID()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

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
  v_requester_name TEXT;
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_requester_foyer_id) THEN
    RAISE EXCEPTION 'Acces refuse a ce foyer';
  END IF;

  IF p_relationship_type NOT IN (
    'parent', 'enfant', 'fratrie', 'cousin', 'conjoint',
    'oncle_tante', 'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  ) THEN
    RAISE EXCEPTION 'Lien familial invalide';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_tree_profiles
    WHERE id = p_requester_profile_id AND foyer_id = p_requester_foyer_id
  ) THEN
    RAISE EXCEPTION 'Profil source invalide';
  END IF;

  SELECT display_name INTO v_requester_name
  FROM public.family_tree_profiles
  WHERE id = p_requester_profile_id AND foyer_id = p_requester_foyer_id;

  SELECT foyer_id INTO v_target_foyer_id
  FROM public.family_tree_settings
  WHERE UPPER(TRIM(share_code)) = UPPER(TRIM(p_target_code))
    AND enabled = TRUE
    AND share_code_expires_at > NOW();

  IF v_target_foyer_id IS NULL THEN
    RAISE EXCEPTION 'Code Racines introuvable ou expire';
  END IF;

  IF v_target_foyer_id = p_requester_foyer_id THEN
    RAISE EXCEPTION 'Ce code appartient deja a votre foyer';
  END IF;

  INSERT INTO public.family_tree_connections (
    requester_foyer_id, target_foyer_id, requester_profile_id, requester_display_name,
    relationship_type, requested_by
  ) VALUES (
    p_requester_foyer_id, v_target_foyer_id, p_requester_profile_id, COALESCE(v_requester_name, 'Membre de la famille'),
    p_relationship_type, AUTH.UID()
  )
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_family_tree_identity_link(
  p_request_id UUID,
  p_accept BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.family_tree_identity_requests;
BEGIN
  SELECT * INTO v_request FROM public.family_tree_identity_requests
  WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF v_request.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_request.target_foyer_id) THEN
    RAISE EXCEPTION 'Demande introuvable ou acces refuse';
  END IF;
  UPDATE public.family_tree_identity_requests
  SET status = CASE WHEN p_accept THEN 'confirmed' ELSE 'rejected' END,
      confirmed_by = AUTH.UID(),
      confirmed_at = CASE WHEN p_accept THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_request_id;

  PERFORM public.log_family_tree_validation(
    v_request.target_foyer_id,
    CASE WHEN p_accept THEN 'fiche_rapprochée' ELSE 'rapprochement_refusé' END,
    CASE WHEN p_accept THEN 'Deux fiches familiales ont été rapprochées.' ELSE 'Un rapprochement de fiches a été refusé.' END
  );
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
  INSERT INTO public.family_tree_settings (foyer_id, share_code, share_code_expires_at)
  VALUES (p_foyer_id, v_code, NOW() + INTERVAL '30 days')
  ON CONFLICT (foyer_id) DO UPDATE
    SET share_code = EXCLUDED.share_code,
        share_code_expires_at = EXCLUDED.share_code_expires_at,
        updated_at = NOW();
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.family_tree_code_is_active(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_tree_settings
    WHERE UPPER(TRIM(share_code)) = UPPER(TRIM(p_code))
      AND enabled = TRUE
      AND share_code_expires_at > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION public.review_family_tree_correction(
  p_request_id UUID,
  p_accept BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.family_tree_correction_requests;
BEGIN
  SELECT * INTO v_request
  FROM public.family_tree_correction_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF v_request.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_request.foyer_id) THEN
    RAISE EXCEPTION 'Demande introuvable ou acces refuse';
  END IF;

  UPDATE public.family_tree_correction_requests
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      reviewed_by = AUTH.UID(),
      reviewed_at = NOW()
  WHERE id = p_request_id;

  IF p_accept THEN
    UPDATE public.family_tree_profiles
    SET
      display_name = CASE WHEN v_request.field_name = 'display_name' THEN v_request.proposed_value ELSE display_name END,
      nickname = CASE WHEN v_request.field_name = 'nickname' THEN v_request.proposed_value ELSE nickname END,
      birth_date = CASE WHEN v_request.field_name = 'birth_date' THEN NULLIF(v_request.proposed_value, '')::DATE ELSE birth_date END,
      death_date = CASE WHEN v_request.field_name = 'death_date' THEN NULLIF(v_request.proposed_value, '')::DATE ELSE death_date END,
      branch = CASE WHEN v_request.field_name = 'branch' AND v_request.proposed_value IN ('proche', 'paternelle', 'maternelle', 'autre') THEN v_request.proposed_value ELSE branch END,
      country = CASE WHEN v_request.field_name = 'country' THEN v_request.proposed_value ELSE country END,
      origin_city = CASE WHEN v_request.field_name = 'origin_city' THEN v_request.proposed_value ELSE origin_city END,
      bio = CASE WHEN v_request.field_name = 'bio' THEN v_request.proposed_value ELSE bio END,
      languages = CASE WHEN v_request.field_name = 'languages' THEN REGEXP_SPLIT_TO_ARRAY(v_request.proposed_value, '\\s*,\\s*') ELSE languages END,
      updated_at = NOW()
    WHERE id = v_request.profile_id AND foyer_id = v_request.foyer_id;
  END IF;

  PERFORM public.log_family_tree_validation(
    v_request.foyer_id,
    CASE WHEN p_accept THEN 'correction_acceptée' ELSE 'correction_refusée' END,
    CASE WHEN p_accept THEN 'Une correction de fiche a été acceptée.' ELSE 'Une correction de fiche a été refusée.' END
  );
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

    PERFORM public.log_family_tree_validation(v_connection.target_foyer_id, 'branche_confirmée', 'Une branche familiale a été confirmée.');
    PERFORM public.log_family_tree_validation(v_connection.requester_foyer_id, 'branche_confirmée', 'Une branche familiale a confirmé votre invitation.');
  ELSE
    UPDATE public.family_tree_connections
    SET status = 'rejected', confirmed_by = AUTH.UID(), updated_at = NOW()
    WHERE id = p_connection_id;
    PERFORM public.log_family_tree_validation(v_connection.target_foyer_id, 'branche_refusée', 'Une demande de branche a été refusée.');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_family_tree_correction(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.family_tree_correction_requests;
BEGIN
  SELECT * INTO v_request
  FROM public.family_tree_correction_requests
  WHERE id = p_request_id AND status = 'accepted'
  FOR UPDATE;

  IF v_request.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_request.foyer_id) THEN
    RAISE EXCEPTION 'Correction introuvable ou acces refuse';
  END IF;

  UPDATE public.family_tree_profiles
  SET
    display_name = CASE WHEN v_request.field_name = 'display_name' THEN COALESCE(NULLIF(v_request.current_value, ''), display_name) ELSE display_name END,
    nickname = CASE WHEN v_request.field_name = 'nickname' THEN NULLIF(v_request.current_value, '') ELSE nickname END,
    birth_date = CASE WHEN v_request.field_name = 'birth_date' THEN NULLIF(v_request.current_value, '')::DATE ELSE birth_date END,
    death_date = CASE WHEN v_request.field_name = 'death_date' THEN NULLIF(v_request.current_value, '')::DATE ELSE death_date END,
    branch = CASE WHEN v_request.field_name = 'branch' AND v_request.current_value IN ('proche', 'paternelle', 'maternelle', 'autre') THEN v_request.current_value ELSE branch END,
    country = CASE WHEN v_request.field_name = 'country' THEN NULLIF(v_request.current_value, '') ELSE country END,
    origin_city = CASE WHEN v_request.field_name = 'origin_city' THEN NULLIF(v_request.current_value, '') ELSE origin_city END,
    bio = CASE WHEN v_request.field_name = 'bio' THEN NULLIF(v_request.current_value, '') ELSE bio END,
    languages = CASE
      WHEN v_request.field_name = 'languages' AND COALESCE(TRIM(v_request.current_value), '') = '' THEN ARRAY[]::TEXT[]
      WHEN v_request.field_name = 'languages' THEN REGEXP_SPLIT_TO_ARRAY(v_request.current_value, '\\s*,\\s*')
      ELSE languages
    END,
    updated_at = NOW()
  WHERE id = v_request.profile_id AND foyer_id = v_request.foyer_id;

  UPDATE public.family_tree_correction_requests
  SET status = 'cancelled', reviewed_by = AUTH.UID(), reviewed_at = NOW()
  WHERE id = p_request_id;

  PERFORM public.log_family_tree_validation(
    v_request.foyer_id,
    'correction_annulée',
    'Une correction validée récemment a été annulée.'
  );
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


-- Grant permissions after function creation
REVOKE ALL ON FUNCTION public.get_family_tree_visible_profiles(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_family_tree_correction(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_family_tree_validation(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.undo_family_tree_correction(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_family_tree_connection(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_family_tree_connection(UUID, BOOLEAN, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_family_tree_connection(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_family_tree_code(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_family_tree_relationship(UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_family_tree_relationship(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_family_tree_identity_link(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_family_tree_identity_link(UUID, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_family_tree_visible_profiles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_family_tree_correction(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_family_tree_correction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_family_tree_connection(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_family_tree_connection(UUID, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_family_tree_connection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_family_tree_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_family_tree_relationship(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_family_tree_relationship(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_family_tree_identity_link(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_family_tree_identity_link(UUID, BOOLEAN) TO authenticated;
