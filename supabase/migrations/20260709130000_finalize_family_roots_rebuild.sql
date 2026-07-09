-- Finalisation du nouveau parcours Racines familiales.
-- Le nom de la personne a l'origine d'une demande reste visible au foyer invite.

ALTER TABLE public.family_tree_connections
  ADD COLUMN IF NOT EXISTS requester_display_name TEXT NOT NULL DEFAULT 'Membre de la famille';

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

  SELECT display_name INTO v_requester_name
  FROM public.family_tree_profiles
  WHERE id = p_requester_profile_id AND foyer_id = p_requester_foyer_id;

  IF v_requester_name IS NULL THEN
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
    requester_foyer_id,
    target_foyer_id,
    requester_profile_id,
    requester_display_name,
    relationship_type,
    requested_by
  ) VALUES (
    p_requester_foyer_id,
    v_target_foyer_id,
    p_requester_profile_id,
    v_requester_name,
    p_relationship_type,
    AUTH.UID()
  )
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_family_tree_connection(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_family_tree_connection(UUID, TEXT, UUID, TEXT) TO authenticated;
