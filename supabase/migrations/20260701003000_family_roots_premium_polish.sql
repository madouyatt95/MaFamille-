-- Racines familiales: corrections, souvenirs, partage par champ et journal de confiance.

ALTER TABLE public.family_tree_profiles
  ADD COLUMN IF NOT EXISTS shared_fields TEXT[] NOT NULL DEFAULT ARRAY[
    'display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url', 'bio', 'languages'
  ];

UPDATE public.family_tree_profiles
SET shared_fields = ARRAY['display_name', 'nickname']
WHERE is_minor = TRUE;

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

CREATE INDEX IF NOT EXISTS family_tree_corrections_foyer_idx
  ON public.family_tree_correction_requests (foyer_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.family_tree_memories (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(title)) BETWEEN 1 AND 120),
  note TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(note)) BETWEEN 1 AND 1200),
  memory_date DATE,
  visibility TEXT NOT NULL DEFAULT 'famille' CHECK (visibility IN ('prive', 'famille')),
  created_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS family_tree_memories_profile_idx
  ON public.family_tree_memories (foyer_id, profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.family_tree_validation_logs (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(summary)) BETWEEN 1 AND 240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS family_tree_validation_logs_foyer_idx
  ON public.family_tree_validation_logs (foyer_id, created_at DESC);

ALTER TABLE public.family_tree_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_validation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_tree_corrections_select ON public.family_tree_correction_requests;
CREATE POLICY family_tree_corrections_select ON public.family_tree_correction_requests FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

DROP POLICY IF EXISTS family_tree_corrections_insert ON public.family_tree_correction_requests;
CREATE POLICY family_tree_corrections_insert ON public.family_tree_correction_requests FOR INSERT
  WITH CHECK (
    foyer_id IN (SELECT public.user_foyer_ids())
    AND requested_by = AUTH.UID()
  );

DROP POLICY IF EXISTS family_tree_corrections_update ON public.family_tree_correction_requests;
CREATE POLICY family_tree_corrections_update ON public.family_tree_correction_requests FOR UPDATE
  USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

DROP POLICY IF EXISTS family_tree_memories_select ON public.family_tree_memories;
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

DROP POLICY IF EXISTS family_tree_memories_insert ON public.family_tree_memories;
CREATE POLICY family_tree_memories_insert ON public.family_tree_memories FOR INSERT
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id) AND created_by = AUTH.UID());

DROP POLICY IF EXISTS family_tree_logs_select ON public.family_tree_validation_logs;
CREATE POLICY family_tree_logs_select ON public.family_tree_validation_logs FOR SELECT
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

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

REVOKE ALL ON FUNCTION public.get_family_tree_visible_profiles(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_family_tree_correction(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_family_tree_validation(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_tree_visible_profiles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_family_tree_correction(UUID, BOOLEAN) TO authenticated;
