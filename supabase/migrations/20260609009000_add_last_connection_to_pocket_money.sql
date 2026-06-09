-- Add last_connection column to pocket_money table
ALTER TABLE public.pocket_money
ADD COLUMN IF NOT EXISTS last_connection TIMESTAMPTZ DEFAULT NOW();
