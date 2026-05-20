-- ----------------------------------------------------
-- Schéma SQL pour MaFamille+ (Synchronisation Cloud)
-- À exécuter dans l'éditeur SQL de votre console Supabase
-- ----------------------------------------------------

-- 1. Créer la table pour stocker les données du foyer
CREATE TABLE IF NOT EXISTS public.family_data (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activer la sécurité au niveau des lignes (RLS)
ALTER TABLE public.family_data ENABLE ROW LEVEL SECURITY;

-- 3. Créer les politiques de sécurité (chaque utilisateur ne peut lire/écrire que son propre foyer)
CREATE POLICY "Les utilisateurs peuvent voir leurs propres données familiales"
    ON public.family_data FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres données familiales"
    ON public.family_data FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres données familiales"
    ON public.family_data FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
