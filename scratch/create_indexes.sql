-- ============================================================
-- ADD INDEXES FOR HIGH-PERFORMANCE MULTI-TENANCY RLS
-- Run this in your Supabase SQL Editor to speed up deletes,
-- leaves, and data updates.
-- ============================================================

-- 1. Index on membership table to speed up user_foyer_ids() RLS checks
CREATE INDEX IF NOT EXISTS idx_foyer_members_user_id ON public.foyer_members(user_id);
CREATE INDEX IF NOT EXISTS idx_foyer_members_foyer_id ON public.foyer_members(foyer_id);
CREATE INDEX IF NOT EXISTS idx_foyer_members_user_id_approved ON public.foyer_members(user_id, approved);

-- 2. Indexes on data tables to avoid full table scans during RLS checks
CREATE INDEX IF NOT EXISTS idx_events_foyer_id ON public.events(foyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_foyer_id ON public.transactions(foyer_id);
CREATE INDEX IF NOT EXISTS idx_groceries_foyer_id ON public.groceries(foyer_id);
CREATE INDEX IF NOT EXISTS idx_chore_tasks_foyer_id ON public.chore_tasks(foyer_id);
CREATE INDEX IF NOT EXISTS idx_alerts_foyer_id ON public.alerts(foyer_id);
CREATE INDEX IF NOT EXISTS idx_memories_foyer_id ON public.memories(foyer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_foyer_id ON public.chat_messages(foyer_id);
