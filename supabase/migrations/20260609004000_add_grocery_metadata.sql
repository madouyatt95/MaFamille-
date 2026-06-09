ALTER TABLE public.groceries
  ADD COLUMN IF NOT EXISTS meal TEXT,
  ADD COLUMN IF NOT EXISTS added_by TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sender_user_id UUID,
  ADD COLUMN IF NOT EXISTS sender_member_id TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

CREATE INDEX IF NOT EXISTS idx_groceries_sender_user_id
  ON public.groceries(sender_user_id);
