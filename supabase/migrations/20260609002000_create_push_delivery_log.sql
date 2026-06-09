CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  event_key TEXT PRIMARY KEY,
  foyer_id TEXT,
  table_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_delivery_log_created_at
  ON public.push_delivery_log(created_at);

ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
