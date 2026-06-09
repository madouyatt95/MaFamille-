CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.foyer_members(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  app_source TEXT NOT NULL DEFAULT 'pwa',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, device_id, app_source)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_foyer_enabled
  ON public.push_subscriptions(foyer_id, enabled);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_member
  ON public.push_subscriptions(member_id);

CREATE OR REPLACE FUNCTION public.touch_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER tr_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_push_subscriptions_updated_at();

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

