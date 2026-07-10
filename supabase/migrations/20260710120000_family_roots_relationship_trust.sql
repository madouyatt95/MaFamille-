-- Racines familiales : liens complets, carte reelle et journal annulable.

ALTER TABLE public.family_tree_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.family_tree_profiles
  DROP CONSTRAINT IF EXISTS family_tree_profiles_latitude_check;
ALTER TABLE public.family_tree_profiles
  ADD CONSTRAINT family_tree_profiles_latitude_check
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);

ALTER TABLE public.family_tree_profiles
  DROP CONSTRAINT IF EXISTS family_tree_profiles_longitude_check;
ALTER TABLE public.family_tree_profiles
  ADD CONSTRAINT family_tree_profiles_longitude_check
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

ALTER TABLE public.family_tree_relationships
  DROP CONSTRAINT IF EXISTS family_tree_relationships_relationship_type_check;
ALTER TABLE public.family_tree_relationships
  ADD CONSTRAINT family_tree_relationships_relationship_type_check
  CHECK (relationship_type IN (
    'parent', 'parent_biologique', 'beau_parent', 'tuteur', 'enfant',
    'fratrie', 'cousin', 'conjoint', 'ex_conjoint', 'oncle_tante',
    'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  ));

ALTER TABLE public.family_tree_connections
  DROP CONSTRAINT IF EXISTS family_tree_connections_relationship_type_check;
ALTER TABLE public.family_tree_connections
  ADD CONSTRAINT family_tree_connections_relationship_type_check
  CHECK (relationship_type IN (
    'parent', 'parent_biologique', 'beau_parent', 'tuteur', 'enfant',
    'fratrie', 'cousin', 'conjoint', 'ex_conjoint', 'oncle_tante',
    'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
  ));

ALTER TABLE public.family_tree_validation_logs
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS reversible_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.log_family_tree_action(
  p_foyer_id UUID,
  p_action TEXT,
  p_summary TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_reversible_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_foyer_id) AND NOT (
    p_entity_type = 'connection'
    AND p_entity_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.family_tree_connections c
      WHERE c.id = p_entity_id
        AND (public.is_foyer_admin_or_parent(c.requester_foyer_id)
          OR public.is_foyer_admin_or_parent(c.target_foyer_id))
    )
  ) THEN
    RAISE EXCEPTION 'Acces refuse a ce foyer';
  END IF;

  INSERT INTO public.family_tree_validation_logs (
    foyer_id, actor_user_id, action, summary, entity_type, entity_id,
    details, reversible_until
  ) VALUES (
    p_foyer_id, AUTH.UID(), p_action, p_summary, p_entity_type, p_entity_id,
    COALESCE(p_details, '{}'::JSONB), p_reversible_until
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
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
    'parent', 'parent_biologique', 'beau_parent', 'tuteur', 'enfant',
    'fratrie', 'cousin', 'conjoint', 'ex_conjoint', 'oncle_tante',
    'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
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

  IF p_relationship_type IN ('conjoint', 'ex_conjoint')
     AND (v_source.is_minor OR v_target.is_minor) THEN
    RAISE EXCEPTION 'Un lien de couple ne peut pas concerner un profil mineur';
  END IF;

  IF p_relationship_type = 'conjoint' AND EXISTS (
    SELECT 1 FROM public.family_tree_relationships r
    WHERE r.foyer_id = p_foyer_id
      AND ((r.source_profile_id = p_source_profile_id AND r.target_profile_id = p_target_profile_id)
        OR (r.source_profile_id = p_target_profile_id AND r.target_profile_id = p_source_profile_id))
      AND r.relationship_type IN ('parent', 'parent_biologique', 'enfant', 'fratrie')
  ) THEN
    RAISE EXCEPTION 'Ce lien de couple est incompatible avec le lien familial deja renseigne';
  END IF;

  v_direct_source := p_source_profile_id;
  v_direct_target := p_target_profile_id;
  v_direct_type := p_relationship_type;
  v_inverse_type := CASE p_relationship_type
    WHEN 'parent' THEN 'enfant'
    WHEN 'parent_biologique' THEN 'enfant'
    WHEN 'beau_parent' THEN 'enfant'
    WHEN 'tuteur' THEN 'enfant'
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

  IF v_direct_type IN ('parent', 'parent_biologique') THEN
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
          AND relationship_type IN ('parent', 'parent_biologique')
        UNION
        SELECT r.target_profile_id
        FROM public.family_tree_relationships r
        JOIN descendants d ON d.id = r.source_profile_id
        WHERE r.foyer_id = p_foyer_id
          AND r.relationship_type IN ('parent', 'parent_biologique')
      )
      SELECT 1 FROM descendants WHERE id = v_direct_source
    ) THEN
      RAISE EXCEPTION 'Ce lien creerait une boucle impossible dans l arbre';
    END IF;
  END IF;

  IF v_direct_type = 'grand_parent'
     AND v_source.birth_date IS NOT NULL AND v_target.birth_date IS NOT NULL
     AND v_source.birth_date > v_target.birth_date - INTERVAL '24 years' THEN
    RAISE EXCEPTION 'Les dates de naissance ne sont pas coherentes avec ce lien grand-parent';
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

  PERFORM public.log_family_tree_action(
    p_foyer_id,
    'lien_ajoute',
    'Un lien familial a ete ajoute.',
    'relationship',
    v_id,
    JSONB_BUILD_OBJECT(
      'source_id', v_direct_source,
      'target_id', v_direct_target,
      'direct_type', v_direct_type,
      'inverse_type', v_inverse_type
    ),
    NOW() + INTERVAL '24 hours'
  );

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
    WHEN 'parent' THEN 'enfant'
    WHEN 'parent_biologique' THEN 'enfant'
    WHEN 'beau_parent' THEN 'enfant'
    WHEN 'tuteur' THEN 'enfant'
    WHEN 'enfant' THEN 'parent'
    WHEN 'grand_parent' THEN 'petit_enfant'
    WHEN 'petit_enfant' THEN 'grand_parent'
    WHEN 'oncle_tante' THEN 'neveu_niece'
    WHEN 'neveu_niece' THEN 'oncle_tante'
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

  PERFORM public.log_family_tree_action(
    p_foyer_id, 'lien_supprime', 'Un lien familial a ete supprime.',
    'relationship', p_relationship_id
  );
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
    'parent', 'parent_biologique', 'beau_parent', 'tuteur', 'enfant',
    'fratrie', 'cousin', 'conjoint', 'ex_conjoint', 'oncle_tante',
    'neveu_niece', 'grand_parent', 'petit_enfant', 'famille'
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
  ) RETURNING id INTO v_connection_id;

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

    PERFORM public.log_family_tree_action(
      v_connection.target_foyer_id, 'branche_confirmee',
      'Une branche familiale a ete confirmee.', 'connection', p_connection_id,
      '{}'::JSONB, NOW() + INTERVAL '24 hours'
    );
    PERFORM public.log_family_tree_action(
      v_connection.requester_foyer_id, 'branche_confirmee',
      'Une branche familiale a confirme votre invitation.', 'connection', p_connection_id,
      '{}'::JSONB, NOW() + INTERVAL '24 hours'
    );
  ELSE
    UPDATE public.family_tree_connections
    SET status = 'rejected', confirmed_by = AUTH.UID(), updated_at = NOW()
    WHERE id = p_connection_id;
    PERFORM public.log_family_tree_action(
      v_connection.target_foyer_id, 'branche_refusee',
      'Une demande de branche a ete refusee.', 'connection', p_connection_id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_family_tree_action(p_log_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.family_tree_validation_logs;
  v_source UUID;
  v_target UUID;
  v_direct TEXT;
  v_inverse TEXT;
BEGIN
  SELECT * INTO v_log
  FROM public.family_tree_validation_logs
  WHERE id = p_log_id
  FOR UPDATE;

  IF v_log.id IS NULL OR NOT public.is_foyer_admin_or_parent(v_log.foyer_id) THEN
    RAISE EXCEPTION 'Action introuvable ou acces refuse';
  END IF;
  IF v_log.reverted_at IS NOT NULL OR v_log.reversible_until IS NULL OR v_log.reversible_until < NOW() THEN
    RAISE EXCEPTION 'Cette action ne peut plus etre annulee';
  END IF;

  IF v_log.action = 'lien_ajoute' THEN
    v_source := NULLIF(v_log.details->>'source_id', '')::UUID;
    v_target := NULLIF(v_log.details->>'target_id', '')::UUID;
    v_direct := v_log.details->>'direct_type';
    v_inverse := v_log.details->>'inverse_type';
    DELETE FROM public.family_tree_relationships
    WHERE foyer_id = v_log.foyer_id
      AND ((source_profile_id = v_source AND target_profile_id = v_target AND relationship_type = v_direct)
        OR (source_profile_id = v_target AND target_profile_id = v_source AND relationship_type = v_inverse));
  ELSIF v_log.action = 'branche_confirmee' AND v_log.entity_id IS NOT NULL THEN
    UPDATE public.family_tree_connections
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = v_log.entity_id
      AND status = 'confirmed'
      AND (requester_foyer_id = v_log.foyer_id OR target_foyer_id = v_log.foyer_id);
  ELSE
    RAISE EXCEPTION 'Cette action ne propose pas d annulation automatique';
  END IF;

  UPDATE public.family_tree_validation_logs
  SET reverted_at = NOW()
  WHERE id = p_log_id;

  INSERT INTO public.family_tree_validation_logs (
    foyer_id, actor_user_id, action, summary, entity_type, entity_id
  ) VALUES (
    v_log.foyer_id, AUTH.UID(), 'action_annulee',
    'Une action recente a ete annulee.', v_log.entity_type, v_log.entity_id
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_family_tree_visible_profiles(UUID);
CREATE FUNCTION public.get_family_tree_visible_profiles(p_viewer_foyer_id UUID)
RETURNS TABLE (
  id UUID,
  foyer_id UUID,
  member_id TEXT,
  display_name TEXT,
  birth_date DATE,
  branch TEXT,
  country TEXT,
  origin_city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
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
    SELECT DISTINCT CASE
      WHEN c.requester_foyer_id = p_viewer_foyer_id THEN c.target_foyer_id
      ELSE c.requester_foyer_id
    END AS foyer_id
    FROM public.family_tree_connections c
    WHERE c.status = 'confirmed'
      AND (c.requester_foyer_id = p_viewer_foyer_id OR c.target_foyer_id = p_viewer_foyer_id)
      AND p_viewer_foyer_id IN (SELECT public.user_foyer_ids())
  )
  SELECT
    p.id,
    p.foyer_id,
    NULL::TEXT,
    CASE WHEN 'display_name' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.display_name ELSE 'Membre de la famille' END,
    CASE WHEN 'birth_date' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.birth_date ELSE NULL END,
    p.branch,
    CASE WHEN 'country' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.country ELSE NULL END,
    CASE WHEN 'origin_city' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.origin_city ELSE NULL END,
    CASE WHEN 'origin_city' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.latitude ELSE NULL END,
    CASE WHEN 'origin_city' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.longitude ELSE NULL END,
    CASE WHEN 'nickname' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.nickname ELSE NULL END,
    CASE WHEN 'bio' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.bio ELSE NULL END,
    CASE WHEN 'languages' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.languages ELSE ARRAY[]::TEXT[] END,
    CASE WHEN 'photo_url' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.photo_url ELSE NULL END,
    p.is_memorial,
    CASE WHEN 'death_date' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.death_date ELSE NULL END,
    p.is_minor,
    p.visibility,
    COALESCE(rule.shared_fields, p.shared_fields)
  FROM public.family_tree_profiles p
  JOIN connected_foyers f ON f.foyer_id = p.foyer_id
  LEFT JOIN public.family_tree_profile_branch_visibility rule
    ON rule.profile_id = p.id AND rule.target_foyer_id = p_viewer_foyer_id
  WHERE p.visibility = 'famille' AND COALESCE(rule.is_visible, TRUE);
$$;

REVOKE ALL ON FUNCTION public.log_family_tree_action(UUID, TEXT, TEXT, TEXT, UUID, JSONB, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.undo_family_tree_action(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_family_tree_visible_profiles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_family_tree_action(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_tree_visible_profiles(UUID) TO authenticated;
