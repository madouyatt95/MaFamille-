-- Racines familiales : chaque membre peut choisir ce qu'une branche liee voit.

CREATE TABLE IF NOT EXISTS public.family_tree_profile_branch_visibility (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.family_tree_profiles(id) ON DELETE CASCADE,
  target_foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  shared_fields TEXT[] NOT NULL DEFAULT ARRAY['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url'],
  updated_by UUID NOT NULL DEFAULT AUTH.UID() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, target_foyer_id),
  CHECK (foyer_id <> target_foyer_id)
);

CREATE INDEX IF NOT EXISTS family_tree_profile_branch_visibility_owner_idx
  ON public.family_tree_profile_branch_visibility (foyer_id, profile_id);

ALTER TABLE public.family_tree_profile_branch_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_tree_profile_branch_visibility_select ON public.family_tree_profile_branch_visibility;
DROP POLICY IF EXISTS family_tree_profile_branch_visibility_insert ON public.family_tree_profile_branch_visibility;
DROP POLICY IF EXISTS family_tree_profile_branch_visibility_update ON public.family_tree_profile_branch_visibility;
DROP POLICY IF EXISTS family_tree_profile_branch_visibility_delete ON public.family_tree_profile_branch_visibility;

CREATE POLICY family_tree_profile_branch_visibility_select ON public.family_tree_profile_branch_visibility
  FOR SELECT USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY family_tree_profile_branch_visibility_insert ON public.family_tree_profile_branch_visibility
  FOR INSERT WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_profile_branch_visibility_update ON public.family_tree_profile_branch_visibility
  FOR UPDATE USING (public.is_foyer_admin_or_parent(foyer_id))
  WITH CHECK (public.is_foyer_admin_or_parent(foyer_id));

CREATE POLICY family_tree_profile_branch_visibility_delete ON public.family_tree_profile_branch_visibility
  FOR DELETE USING (public.is_foyer_admin_or_parent(foyer_id));

CREATE OR REPLACE FUNCTION public.set_family_tree_profile_branch_visibility(
  p_foyer_id UUID,
  p_profile_id UUID,
  p_target_foyer_id UUID,
  p_is_visible BOOLEAN,
  p_shared_fields TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_foyer_id) THEN
    RAISE EXCEPTION 'Acces refuse a ce foyer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_tree_profiles
    WHERE id = p_profile_id AND foyer_id = p_foyer_id
  ) THEN
    RAISE EXCEPTION 'Profil familial introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_tree_connections
    WHERE status = 'confirmed'
      AND ((requester_foyer_id = p_foyer_id AND target_foyer_id = p_target_foyer_id)
        OR (target_foyer_id = p_foyer_id AND requester_foyer_id = p_target_foyer_id))
  ) THEN
    RAISE EXCEPTION 'Cette branche n est pas reliee a votre foyer';
  END IF;

  INSERT INTO public.family_tree_profile_branch_visibility (
    foyer_id, profile_id, target_foyer_id, is_visible, shared_fields, updated_by
  ) VALUES (
    p_foyer_id, p_profile_id, p_target_foyer_id, p_is_visible,
    ARRAY(SELECT DISTINCT field FROM unnest(COALESCE(p_shared_fields, ARRAY[]::TEXT[])) AS field
          WHERE field IN ('display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url', 'bio', 'languages', 'death_date')),
    AUTH.UID()
  ) ON CONFLICT (profile_id, target_foyer_id) DO UPDATE
    SET is_visible = EXCLUDED.is_visible,
        shared_fields = EXCLUDED.shared_fields,
        updated_by = AUTH.UID(),
        updated_at = NOW();
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
    NULL::TEXT AS member_id,
    CASE WHEN 'display_name' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.display_name ELSE 'Membre de la famille' END,
    CASE WHEN 'birth_date' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.birth_date ELSE NULL END,
    p.branch,
    CASE WHEN 'country' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.country ELSE NULL END,
    CASE WHEN 'origin_city' = ANY(COALESCE(rule.shared_fields, p.shared_fields)) THEN p.origin_city ELSE NULL END,
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

REVOKE ALL ON FUNCTION public.set_family_tree_profile_branch_visibility(UUID, UUID, UUID, BOOLEAN, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_family_tree_profile_branch_visibility(UUID, UUID, UUID, BOOLEAN, TEXT[]) TO authenticated;
