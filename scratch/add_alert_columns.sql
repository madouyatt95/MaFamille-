ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS sender_user_id UUID;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS sender_member_id TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS sender_avatar TEXT;
