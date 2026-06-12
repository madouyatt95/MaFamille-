CREATE TABLE IF NOT EXISTS public.push_send_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.foyer_members(id) ON DELETE SET NULL,
  display_name TEXT,
  app_source TEXT,
  platform TEXT,
  token_start TEXT,
  target_module TEXT,
  title TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  fcm_status INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_send_attempts_foyer_created
  ON public.push_send_attempts(foyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_send_attempts_status_created
  ON public.push_send_attempts(status, created_at DESC);

ALTER TABLE public.push_send_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_send_attempts_select" ON public.push_send_attempts;
CREATE POLICY "push_send_attempts_select" ON public.push_send_attempts
  FOR SELECT TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));
