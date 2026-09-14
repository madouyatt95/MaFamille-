-- Chosen memories and linked preparations only. Source modules stay authoritative.
CREATE TABLE IF NOT EXISTS public.assistant_workspace_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  owner_member_id UUID NOT NULL REFERENCES public.foyer_members(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('memory', 'meal', 'day')),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 100),
  audience TEXT NOT NULL CHECK (audience IN ('personal', 'family')),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 20000),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assistant_workspace_foyer ON public.assistant_workspace_records(foyer_id, updated_at DESC);
ALTER TABLE public.assistant_workspace_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_workspace_records FROM anon, authenticated;
GRANT SELECT ON public.assistant_workspace_records TO authenticated;
DROP POLICY IF EXISTS assistant_workspace_read ON public.assistant_workspace_records;
CREATE POLICY assistant_workspace_read ON public.assistant_workspace_records FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.foyer_members m WHERE m.foyer_id = assistant_workspace_records.foyer_id
    AND m.user_id = auth.uid() AND m.approved = true
    AND (m.id = assistant_workspace_records.owner_member_id OR assistant_workspace_records.audience = 'family'))
);

CREATE OR REPLACE FUNCTION public.save_assistant_workspace_record(
  p_foyer_id UUID, p_id UUID, p_kind TEXT, p_title TEXT, p_audience TEXT, p_payload JSONB, p_revision INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.foyer_members%ROWTYPE;
  previous public.assistant_workspace_records%ROWTYPE;
  saved public.assistant_workspace_records%ROWTYPE;
BEGIN
  IF p_revision IS NULL OR p_revision < 0 OR p_id IS NULL THEN RAISE EXCEPTION 'invalid revision'; END IF;
  SELECT * INTO actor FROM public.foyer_members WHERE foyer_id = p_foyer_id AND user_id = auth.uid() AND approved = true ORDER BY joined_at LIMIT 1;
  IF actor.id IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  -- Serialize quota and competing updates for this household.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_foyer_id::text, 50905));
  SELECT * INTO previous FROM public.assistant_workspace_records WHERE id = p_id FOR UPDATE;
  IF previous.id IS NOT NULL AND (previous.foyer_id <> p_foyer_id OR (previous.owner_member_id <> actor.id AND NOT (previous.audience = 'family' AND actor.role IN ('admin', 'parent')))) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_audience = 'family' AND actor.role NOT IN ('admin', 'parent') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF previous.id IS NOT NULL AND previous.owner_member_id <> actor.id AND p_audience <> previous.audience THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF (previous.id IS NULL AND p_revision <> 0) OR (previous.id IS NOT NULL AND previous.revision <> p_revision) THEN RAISE EXCEPTION 'revision conflict'; END IF;
  IF previous.id IS NULL AND (SELECT count(*) FROM public.assistant_workspace_records WHERE foyer_id = p_foyer_id) >= 150 THEN RAISE EXCEPTION 'workspace limit'; END IF;
  IF p_kind NOT IN ('memory', 'meal', 'day') OR p_audience NOT IN ('personal', 'family') OR length(trim(p_title)) NOT BETWEEN 2 AND 100
    OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR octet_length(p_payload::text) > 20000 THEN RAISE EXCEPTION 'invalid record'; END IF;
  IF previous.id IS NOT NULL AND previous.kind <> p_kind THEN RAISE EXCEPTION 'record kind cannot change'; END IF;
  IF p_kind = 'memory' AND (COALESCE(p_payload->>'kind', '') NOT IN ('preference', 'shortcut')
    OR COALESCE(length(trim(p_payload->>'trigger')), 0) NOT BETWEEN 2 AND 80
    OR COALESCE(length(trim(p_payload->>'meaning')), 0) NOT BETWEEN 2 AND 500) THEN RAISE EXCEPTION 'invalid memory'; END IF;
  INSERT INTO public.assistant_workspace_records(id, foyer_id, owner_member_id, kind, title, audience, payload, revision)
  VALUES(p_id, p_foyer_id, actor.id, p_kind, trim(p_title), p_audience, p_payload, 1)
  ON CONFLICT(id) DO UPDATE SET title = EXCLUDED.title, audience = EXCLUDED.audience, payload = EXCLUDED.payload,
    revision = assistant_workspace_records.revision + 1, updated_at = now()
  RETURNING * INTO saved;
  RETURN to_jsonb(saved) - 'foyer_id';
END;
$$;
REVOKE ALL ON FUNCTION public.save_assistant_workspace_record(UUID, UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_assistant_workspace_record(UUID, UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_assistant_workspace_record(p_foyer_id UUID, p_id UUID, p_revision INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.foyer_members%ROWTYPE; target public.assistant_workspace_records%ROWTYPE;
BEGIN
  IF p_revision IS NULL THEN RAISE EXCEPTION 'invalid revision'; END IF;
  SELECT * INTO actor FROM public.foyer_members WHERE foyer_id = p_foyer_id AND user_id = auth.uid() AND approved = true ORDER BY joined_at LIMIT 1;
  SELECT * INTO target FROM public.assistant_workspace_records WHERE id = p_id AND foyer_id = p_foyer_id FOR UPDATE;
  IF actor.id IS NULL OR target.id IS NULL OR (actor.id <> target.owner_member_id AND NOT (target.audience = 'family' AND actor.role IN ('admin', 'parent'))) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF target.revision <> p_revision THEN RAISE EXCEPTION 'revision conflict'; END IF;
  DELETE FROM public.assistant_workspace_records WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_assistant_workspace_record(UUID, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_assistant_workspace_record(UUID, UUID, INTEGER) TO authenticated;
