-- Racines familiales: arbre enrichi, invitations temporaires et controles serveur.

ALTER TABLE public.family_tree_settings
  ADD COLUMN IF NOT EXISTS share_code_expires_at TIMESTAMPTZ;

UPDATE public.family_tree_settings
SET share_code_expires_at = NOW() + INTERVAL '30 days'
WHERE share_code_expires_at IS NULL;

ALTER TABLE public.family_tree_settings
  ALTER COLUMN share_code_expires_at SET DEFAULT (NOW() + INTERVAL '30 days');

ALTER TABLE public.family_tree_profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origin_city TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS is_memorial BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS death_date DATE;

ALTER TABLE public.family_tree_profiles
  DROP CONSTRAINT IF EXISTS family_tree_profiles_death_date_check;
ALTER TABLE public.family_tree_profiles
  ADD CONSTRAINT family_tree_profiles_death_date_check
  CHECK (death_date IS NULL OR birth_date IS NULL OR death_date >= birth_date);

ALTER TABLE public.family_tree_relationships
  DROP CONSTRAINT IF EXISTS family_tree_relationships_relationship_type_check;
ALTER TABLE public.family_tree_relationships
  ADD CONSTRAINT family_tree_relationships_relationship_type_check
  CHECK (relationship_type IN (
    'parent', 'enfant', 'fratrie', 'cousin', 'conjoint',
    'oncle_tante', 'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  ));

ALTER TABLE public.family_tree_connections
  DROP CONSTRAINT IF EXISTS family_tree_connections_relationship_type_check;
ALTER TABLE public.family_tree_connections
  ADD CONSTRAINT family_tree_connections_relationship_type_check
  CHECK (relationship_type IN (
    'parent', 'enfant', 'fratrie', 'cousin', 'conjoint',
    'oncle_tante', 'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  ));

ALTER TABLE public.family_tree_events
  ADD COLUMN IF NOT EXISTS agenda_event_id TEXT;

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

CREATE UNIQUE INDEX IF NOT EXISTS family_tree_identity_active_pair_idx
  ON public.family_tree_identity_requests (
    LEAST(source_profile_id, target_profile_id),
    GREATEST(source_profile_id, target_profile_id)
  )
  WHERE status IN ('pending', 'confirmed');

ALTER TABLE public.family_tree_identity_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_tree_identity_select ON public.family_tree_identity_requests;
CREATE POLICY family_tree_identity_select ON public.family_tree_identity_requests FOR SELECT
  USING (
    requester_foyer_id IN (SELECT public.user_foyer_ids())
    OR target_foyer_id IN (SELECT public.user_foyer_ids())
  );

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

  -- Pour les controles, on ramene toujours le lien vers parent -> enfant.
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

-- Un ancien code expire ne doit jamais permettre une nouvelle connexion.
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

REVOKE INSERT ON public.family_tree_relationships FROM authenticated;
REVOKE ALL ON FUNCTION public.add_family_tree_relationship(UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_family_tree_relationship(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_family_tree_identity_link(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_family_tree_identity_link(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_family_tree_relationship(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_family_tree_relationship(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_family_tree_identity_link(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_family_tree_identity_link(UUID, BOOLEAN) TO authenticated;
