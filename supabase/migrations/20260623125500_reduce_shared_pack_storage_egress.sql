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

    IF md5(v_link.token || ':' || trim(p_access_code)) <> v_link.access_code_hash THEN
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
    'file_url', CASE WHEN v_link.allow_direct_downloads THEN d.file_url ELSE NULL END,
    'thumbnail_url', CASE WHEN v_link.allow_direct_downloads THEN d.thumbnail_url ELSE NULL END,
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

REVOKE ALL ON FUNCTION public.get_shared_pack_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_pack_by_token(text, text) TO anon, authenticated;
