ALTER TABLE public.foyers
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_foyers_stripe_subscription_id
  ON public.foyers(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
