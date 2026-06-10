ALTER TABLE public.foyers
  ADD COLUMN IF NOT EXISTS premium_source TEXT,
  ADD COLUMN IF NOT EXISTS premium_plan TEXT,
  ADD COLUMN IF NOT EXISTS premium_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS app_store_original_transaction_id TEXT;

UPDATE public.foyers
SET premium_status = CASE WHEN COALESCE(is_premium, false) THEN 'active' ELSE 'inactive' END
WHERE premium_status IS NULL OR premium_status = 'inactive';

CREATE INDEX IF NOT EXISTS idx_foyers_premium_status
  ON public.foyers(premium_status);

CREATE INDEX IF NOT EXISTS idx_foyers_stripe_customer_id
  ON public.foyers(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_foyers_app_store_original_transaction_id
  ON public.foyers(app_store_original_transaction_id)
  WHERE app_store_original_transaction_id IS NOT NULL;
