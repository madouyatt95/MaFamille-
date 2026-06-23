CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.shared_pack_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id uuid NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  pack_id text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  recipient_label text,
  access_code_hash text,
  expires_at timestamptz NOT NULL,
  allow_direct_downloads boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  opened_count integer NOT NULL DEFAULT 0,
  last_opened_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_pack_links_foyer_id ON public.shared_pack_links(foyer_id);
CREATE INDEX IF NOT EXISTS idx_shared_pack_links_token ON public.shared_pack_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_pack_links_pack_id ON public.shared_pack_links(pack_id);

ALTER TABLE public.shared_pack_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_pack_links_owner_read" ON public.shared_pack_links;
CREATE POLICY "shared_pack_links_owner_read"
  ON public.shared_pack_links
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.foyer_members fm
      WHERE fm.foyer_id = shared_pack_links.foyer_id
        AND fm.user_id = auth.uid()
        AND COALESCE(fm.approved, true) = true
        AND fm.role IN ('admin', 'parent')
    )
  );

DROP POLICY IF EXISTS "shared_pack_links_owner_write" ON public.shared_pack_links;
CREATE POLICY "shared_pack_links_owner_write"
  ON public.shared_pack_links
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.foyer_members fm
      WHERE fm.foyer_id = shared_pack_links.foyer_id
        AND fm.user_id = auth.uid()
        AND COALESCE(fm.approved, true) = true
        AND fm.role IN ('admin', 'parent')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.foyer_members fm
      WHERE fm.foyer_id = shared_pack_links.foyer_id
        AND fm.user_id = auth.uid()
        AND COALESCE(fm.approved, true) = true
        AND fm.role IN ('admin', 'parent')
    )
  );

CREATE OR REPLACE FUNCTION public.create_shared_pack_link(
  p_foyer_id uuid,
  p_pack_id text,
  p_recipient_label text DEFAULT NULL,
  p_access_code text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_allow_direct_downloads boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.shared_pack_links%ROWTYPE;
  v_expires_at timestamptz;
  v_token text;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non connecté';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.foyer_members fm
    WHERE fm.foyer_id = p_foyer_id
      AND fm.user_id = auth.uid()
      AND COALESCE(fm.approved, true) = true
      AND fm.role IN ('admin', 'parent')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    v_expires_at := now() + interval '7 days';
  ELSE
    v_expires_at := p_expires_at;
  END IF;

  v_token := encode(gen_random_bytes(18), 'hex');
  IF p_access_code IS NOT NULL AND length(trim(p_access_code)) > 0 THEN
    v_hash := encode(digest(v_token || ':' || trim(p_access_code), 'sha256'), 'hex');
  END IF;

  INSERT INTO public.shared_pack_links (
    foyer_id,
    pack_id,
    token,
    recipient_label,
    access_code_hash,
    expires_at,
    allow_direct_downloads,
    created_by
  ) VALUES (
    p_foyer_id,
    p_pack_id,
    v_token,
    NULLIF(trim(p_recipient_label), ''),
    v_hash,
    v_expires_at,
    COALESCE(p_allow_direct_downloads, true),
    auth.uid()
  )
  RETURNING * INTO v_link;

  UPDATE public.justificatif_packs
  SET
    share_expires_at = v_link.expires_at,
    share_duration_days = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_link.expires_at - now())) / 86400.0)::integer),
    allow_direct_downloads = v_link.allow_direct_downloads
  WHERE foyer_id = p_foyer_id
    AND id::text = p_pack_id;

  RETURN jsonb_build_object(
    'token', v_link.token,
    'expiresAt', v_link.expires_at,
    'recipientLabel', v_link.recipient_label,
    'openedCount', v_link.opened_count,
    'lastOpenedAt', v_link.last_opened_at,
    'accessCodeRequired', v_link.access_code_hash IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_pack_by_token(
  p_token text,
  p_access_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.shared_pack_links%ROWTYPE;
  v_pack jsonb;
  v_documents jsonb;
BEGIN
  SELECT *
  INTO v_link
  FROM public.shared_pack_links
  WHERE token = p_token
    AND revoked_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('message', 'Lien introuvable');
  END IF;

  IF v_link.expires_at < now() THEN
    RETURN jsonb_build_object('expired', true, 'message', 'Ce lien a expiré');
  END IF;

  IF v_link.access_code_hash IS NOT NULL THEN
    IF p_access_code IS NULL OR length(trim(p_access_code)) = 0 THEN
      RETURN jsonb_build_object('accessCodeRequired', true, 'message', 'Code requis');
    END IF;

    IF encode(digest(v_link.token || ':' || trim(p_access_code), 'sha256'), 'hex') <> v_link.access_code_hash THEN
      RETURN jsonb_build_object('accessCodeRequired', true, 'codeInvalid', true, 'message', 'Code incorrect');
    END IF;
  END IF;

  UPDATE public.shared_pack_links
  SET opened_count = opened_count + 1,
      last_opened_at = now()
  WHERE id = v_link.id
  RETURNING * INTO v_link;

  SELECT jsonb_build_object(
    'id', p.id::text,
    'name', p.name,
    'template_type', p.template_type,
    'document_ids', p.document_ids,
    'created_at_text', p.created_at_text,
    'share_expires_at', v_link.expires_at,
    'share_duration_days', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_link.expires_at - now())) / 86400.0)::integer),
    'allow_direct_downloads', v_link.allow_direct_downloads,
    'recipient_label', v_link.recipient_label,
    'opened_count', v_link.opened_count,
    'last_opened_at', v_link.last_opened_at,
    'access_code_required', v_link.access_code_hash IS NOT NULL
  )
  INTO v_pack
  FROM public.justificatif_packs p
  WHERE p.foyer_id = v_link.foyer_id
    AND p.id::text = v_link.pack_id
  LIMIT 1;

  IF v_pack IS NULL THEN
    RETURN jsonb_build_object('message', 'Dossier supprimé');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id::text,
    'name', d.name,
    'category', d.category,
    'sub_category', d.sub_category,
    'member_id', d.member_id,
    'member_name', d.member_name,
    'tags', d.tags,
    'upload_date', d.upload_date,
    'expiry_date', d.expiry_date,
    'file_size', d.file_size,
    'is_expired', d.is_expired,
    'description', d.description,
    'file_url', CASE WHEN v_link.allow_direct_downloads AND COALESCE(d.is_secure, false) = false THEN d.file_url ELSE NULL END,
    'thumbnail_url', d.thumbnail_url,
    'is_secure', d.is_secure
  ) ORDER BY d.name), '[]'::jsonb)
  INTO v_documents
  FROM public.documents d
  WHERE d.foyer_id = v_link.foyer_id
    AND d.id::text IN (
      SELECT jsonb_array_elements_text(COALESCE(v_pack->'document_ids', '[]'::jsonb))
    );

  RETURN jsonb_build_object(
    'pack', v_pack,
    'documents', COALESCE(v_documents, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shared_pack_link(uuid, text, text, text, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_pack_by_token(text, text) TO anon, authenticated;
