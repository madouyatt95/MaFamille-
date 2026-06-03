-- ============================================================
-- MIGRATION BUDGET TRANSVERSAL ET ASSISTANT VOCAL UNIVERSEL
-- À exécuter dans l'éditeur SQL de votre console Supabase
-- ============================================================

-- Ajouter des colonnes à la table transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS module_source TEXT,
ADD COLUMN IF NOT EXISTS category_id TEXT,
ADD COLUMN IF NOT EXISTS subcategory_id TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_interval INT,
ADD COLUMN IF NOT EXISTS start_date TEXT,
ADD COLUMN IF NOT EXISTS end_date TEXT,
ADD COLUMN IF NOT EXISTS next_occurrence TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ajouter des colonnes à la table voice_commands
ALTER TABLE public.voice_commands
ADD COLUMN IF NOT EXISTS raw_text TEXT,
ADD COLUMN IF NOT EXISTS parsed_intent TEXT,
ADD COLUMN IF NOT EXISTS is_success BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS module_source TEXT,
ADD COLUMN IF NOT EXISTS category_id TEXT,
ADD COLUMN IF NOT EXISTS subcategory_id TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS recurrence_type TEXT,
ADD COLUMN IF NOT EXISTS recurrence_interval INT;
