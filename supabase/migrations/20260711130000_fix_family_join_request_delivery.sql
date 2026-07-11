-- Make family join requests visible immediately to the adults who manage the foyer.

CREATE OR REPLACE FUNCTION public.can_manage_family_join_requests(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.foyer_members AS member
    WHERE member.foyer_id = p_family_id
      AND member.user_id = auth.uid()
      AND member.role IN ('admin', 'parent')
      AND member.approved IS DISTINCT FROM false
  ) OR EXISTS (
    SELECT 1
    FROM public.foyers AS foyer
    WHERE foyer.id = p_family_id
      AND foyer.created_by = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "join_requests_select" ON public.family_join_requests;
CREATE POLICY "join_requests_select"
ON public.family_join_requests
FOR SELECT
USING (
  applicant_user_id = auth.uid()
  OR public.can_manage_family_join_requests(family_id)
);

DROP POLICY IF EXISTS "join_requests_update" ON public.family_join_requests;
CREATE POLICY "join_requests_update"
ON public.family_join_requests
FOR UPDATE
USING (public.can_manage_family_join_requests(family_id))
WITH CHECK (public.can_manage_family_join_requests(family_id));

DROP POLICY IF EXISTS "join_requests_delete" ON public.family_join_requests;
CREATE POLICY "join_requests_delete"
ON public.family_join_requests
FOR DELETE
USING (
  applicant_user_id = auth.uid()
  OR public.can_manage_family_join_requests(family_id)
);

CREATE OR REPLACE FUNCTION public.get_pending_family_join_requests(p_family_id UUID)
RETURNS TABLE (
  id UUID,
  family_id UUID,
  applicant_user_id UUID,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_avatar TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,
  requested_by_code BOOLEAN,
  requested_by_qr BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_family_join_requests(p_family_id) THEN
    RAISE EXCEPTION 'Accès refusé aux demandes de ce foyer';
  END IF;

  RETURN QUERY
  SELECT
    request.id,
    request.family_id,
    request.applicant_user_id,
    request.applicant_name,
    request.applicant_email,
    request.applicant_avatar,
    request.created_at,
    request.status,
    request.requested_by_code,
    request.requested_by_qr
  FROM public.family_join_requests AS request
  WHERE request.family_id = p_family_id
    AND request.status = 'pending'
  ORDER BY request.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_family_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id TEXT := 'join-request-' || NEW.id::TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.alerts (
      id,
      foyer_id,
      title,
      description,
      time,
      type,
      read,
      module,
      sender_user_id,
      sender_name,
      created_at
    ) VALUES (
      v_alert_id,
      NEW.family_id,
      'Nouvelle demande d''adhésion',
      NEW.applicant_name || ' souhaite rejoindre votre foyer.',
      'À l''instant',
      'info',
      false,
      'membres',
      NEW.applicant_user_id,
      NEW.applicant_name,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      description = EXCLUDED.description,
      read = false,
      sender_user_id = EXCLUDED.sender_user_id,
      sender_name = EXCLUDED.sender_name,
      created_at = now();
  ELSE
    DELETE FROM public.alerts WHERE id = v_alert_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS family_join_request_notification ON public.family_join_requests;
CREATE TRIGGER family_join_request_notification
AFTER INSERT OR UPDATE OF status, applicant_name, created_at
ON public.family_join_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_family_join_request();

-- Surface requests that were already pending before this migration.
INSERT INTO public.alerts (
  id,
  foyer_id,
  title,
  description,
  time,
  type,
  read,
  module,
  sender_user_id,
  sender_name,
  created_at
)
SELECT
  'join-request-' || request.id::TEXT,
  request.family_id,
  'Nouvelle demande d''adhésion',
  request.applicant_name || ' souhaite rejoindre votre foyer.',
  'En attente',
  'info',
  false,
  'membres',
  request.applicant_user_id,
  request.applicant_name,
  request.created_at
FROM public.family_join_requests AS request
WHERE request.status = 'pending'
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  read = false,
  sender_user_id = EXCLUDED.sender_user_id,
  sender_name = EXCLUDED.sender_name,
  created_at = EXCLUDED.created_at;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'family_join_requests'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.family_join_requests;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_family_join_requests(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_family_join_requests(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_family_join_requests(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_family_join_requests(UUID) TO authenticated;
