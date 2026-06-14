-- Cloud sync for family notes and Eco-Chef recipe notebook.

CREATE TABLE IF NOT EXISTS public.family_memos (
  id TEXT PRIMARY KEY,
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  assigned_to TEXT NOT NULL DEFAULT 'all',
  created_by TEXT NOT NULL DEFAULT 'Famille',
  created_by_member_id TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_memos_foyer_updated
  ON public.family_memos(foyer_id, updated_at DESC);

ALTER TABLE public.family_memos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "family_memos_select" ON public.family_memos;
DROP POLICY IF EXISTS "family_memos_insert" ON public.family_memos;
DROP POLICY IF EXISTS "family_memos_update" ON public.family_memos;
DROP POLICY IF EXISTS "family_memos_delete" ON public.family_memos;

CREATE POLICY "family_memos_select" ON public.family_memos
  FOR SELECT TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "family_memos_insert" ON public.family_memos
  FOR INSERT TO authenticated
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "family_memos_update" ON public.family_memos
  FOR UPDATE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()))
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "family_memos_delete" ON public.family_memos
  FOR DELETE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE TABLE IF NOT EXISTS public.family_recipes (
  id TEXT PRIMARY KEY,
  foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  uses JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing JSONB NOT NULL DEFAULT '[]'::jsonb,
  time TEXT,
  difficulty TEXT,
  rating TEXT,
  prompt_keywords TEXT,
  estimated_cost NUMERIC,
  servings INTEGER,
  family_fit TEXT,
  prep_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author_name TEXT NOT NULL DEFAULT 'Famille',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'family' CHECK (source IN ('ia', 'local', 'family')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_recipes_foyer_saved
  ON public.family_recipes(foyer_id, saved_at DESC);

ALTER TABLE public.family_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "family_recipes_select" ON public.family_recipes;
DROP POLICY IF EXISTS "family_recipes_insert" ON public.family_recipes;
DROP POLICY IF EXISTS "family_recipes_update" ON public.family_recipes;
DROP POLICY IF EXISTS "family_recipes_delete" ON public.family_recipes;

CREATE POLICY "family_recipes_select" ON public.family_recipes
  FOR SELECT TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "family_recipes_insert" ON public.family_recipes
  FOR INSERT TO authenticated
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "family_recipes_update" ON public.family_recipes
  FOR UPDATE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()))
  WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));

CREATE POLICY "family_recipes_delete" ON public.family_recipes
  FOR DELETE TO authenticated
  USING (foyer_id IN (SELECT public.user_foyer_ids()));
