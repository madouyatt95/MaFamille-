-- ============================================================
-- SQL MIGRATION : REFONTE FINANCES PREMIUM
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Mettre à jour la table des transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_base64 TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS attachment_base64 TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- 2. Mettre à jour la table des objectifs d'épargne
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS contributions JSONB DEFAULT '[]'::jsonb;

-- 3. Créer la table des catégories personnalisées
CREATE TABLE IF NOT EXISTS public.custom_categories (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    budget NUMERIC DEFAULT 0,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- Enable RLS
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- 4. Créer la table des comptes multiples
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'bank', -- 'bank', 'cash', 'savings', 'wallet'
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 5. Créer la table des abonnements
CREATE TABLE IF NOT EXISTS public.abonnements (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    period TEXT DEFAULT 'monthly', -- 'monthly', 'yearly'
    next_billing_date TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- Enable RLS
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;

-- 6. Créer la table des dettes / remboursements familiaux
CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payer_id TEXT NOT NULL,
    payer_name TEXT NOT NULL,
    debtor_id TEXT NOT NULL,
    debtor_name TEXT NOT NULL,
    is_repaid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- Enable RLS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- 7. Créer la table pour l'historique des commandes vocales
CREATE TABLE IF NOT EXISTS public.voice_commands (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    user_id UUID,
    member_id TEXT,
    member_name TEXT,
    command TEXT NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- Enable RLS
ALTER TABLE public.voice_commands ENABLE ROW LEVEL SECURITY;

-- 8. Création des politiques RLS pour les nouvelles tables (pour tous les membres du foyer)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'custom_categories', 'accounts', 'abonnements', 'debts', 'voice_commands'
    ])
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "%s_select" ON public.%I;
            DROP POLICY IF EXISTS "%s_insert" ON public.%I;
            DROP POLICY IF EXISTS "%s_update" ON public.%I;
            DROP POLICY IF EXISTS "%s_delete" ON public.%I;

            CREATE POLICY "%s_select" ON public.%I FOR SELECT
                USING (foyer_id IN (SELECT public.user_foyer_ids()));
            CREATE POLICY "%s_insert" ON public.%I FOR INSERT
                WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));
            CREATE POLICY "%s_update" ON public.%I FOR UPDATE
                USING (foyer_id IN (SELECT public.user_foyer_ids()));
            CREATE POLICY "%s_delete" ON public.%I FOR DELETE
                USING (foyer_id IN (SELECT public.user_foyer_ids()));
        ', tbl || '_sel', tbl, tbl || '_ins', tbl, tbl || '_upd', tbl, tbl || '_del', tbl, 
           tbl || '_sel', tbl, tbl || '_ins', tbl, tbl || '_upd', tbl, tbl || '_del', tbl);
    END LOOP;
END $$;

-- 9. Ajouter les index de performance correspondants
CREATE INDEX IF NOT EXISTS idx_custom_categories_foyer_id ON public.custom_categories(foyer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_foyer_id ON public.accounts(foyer_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_foyer_id ON public.abonnements(foyer_id);
CREATE INDEX IF NOT EXISTS idx_debts_foyer_id ON public.debts(foyer_id);
CREATE INDEX IF NOT EXISTS idx_voice_commands_foyer_id ON public.voice_commands(foyer_id);
