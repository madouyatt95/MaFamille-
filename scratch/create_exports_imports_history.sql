-- ============================================================
-- SQL MIGRATION : EXPORTS & IMPORTS HISTORY + STORAGE BUCKET
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Création de l'historique des exports
CREATE TABLE IF NOT EXISTS public.exports_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    user_id UUID,
    member_name TEXT,
    format TEXT NOT NULL, -- 'pdf', 'excel', 'csv', 'json', 'txt'
    period_type TEXT,
    start_date TEXT,
    end_date TEXT,
    file_path TEXT, -- Chemin vers le bucket de stockage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Création de l'historique des imports
CREATE TABLE IF NOT EXISTS public.imports_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    user_id UUID,
    member_name TEXT,
    filename TEXT,
    added_transaction_ids TEXT[] DEFAULT '{}',
    ignored_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS pour les tables d'historique
ALTER TABLE public.exports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exports_history_policy" ON public.exports_history;
CREATE POLICY "exports_history_policy" ON public.exports_history
    FOR ALL USING (foyer_id IN (SELECT public.user_foyer_ids()));

DROP POLICY IF EXISTS "imports_history_policy" ON public.imports_history;
CREATE POLICY "imports_history_policy" ON public.imports_history
    FOR ALL USING (foyer_id IN (SELECT public.user_foyer_ids()));

-- 3. Création du bucket de stockage 'finance-exports'
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-exports', 'finance-exports', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques RLS pour le bucket 'finance-exports' sur storage.objects
DROP POLICY IF EXISTS "Allow authenticated uploads to finance-exports" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to finance-exports" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'finance-exports' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated downloads from finance-exports" ON storage.objects;
CREATE POLICY "Allow authenticated downloads from finance-exports" ON storage.objects
    FOR SELECT USING (bucket_id = 'finance-exports' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated deletes from finance-exports" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from finance-exports" ON storage.objects
    FOR DELETE USING (bucket_id = 'finance-exports' AND auth.role() = 'authenticated');
