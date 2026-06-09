-- Add malus settings to foyers table
ALTER TABLE public.foyers
ADD COLUMN IF NOT EXISTS malus_settings JSONB DEFAULT '{"enabled": true, "shields_enabled": true, "weekly_shields": 3, "reparation_enabled": true, "max_malus_per_day": 3}'::jsonb;

-- Add shields and streak columns to pocket_money table
ALTER TABLE public.pocket_money
ADD COLUMN IF NOT EXISTS shields INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_shield_reset TIMESTAMPTZ DEFAULT NOW();

-- Create malus_templates table
CREATE TABLE IF NOT EXISTS public.malus_templates (
    id TEXT PRIMARY KEY,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '⚠️',
    description TEXT,
    category TEXT NOT NULL,
    stars_removed INT DEFAULT 0,
    xp_removed INT DEFAULT 0,
    loss_streak BOOLEAN DEFAULT FALSE,
    loss_shield BOOLEAN DEFAULT FALSE,
    comment_required BOOLEAN DEFAULT FALSE,
    double_parent_validation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add basic select/all policies on malus_templates
ALTER TABLE public.malus_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for authenticated users on malus_templates" ON public.malus_templates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create malus_applied table
CREATE TABLE IF NOT EXISTS public.malus_applied (
    id TEXT PRIMARY KEY,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL, -- references child member ID (pocket_money ID)
    title TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '⚠️',
    description TEXT,
    stars_removed INT DEFAULT 0,
    xp_removed INT DEFAULT 0,
    loss_streak BOOLEAN DEFAULT FALSE,
    loss_shield BOOLEAN DEFAULT FALSE,
    comment TEXT,
    shield_used BOOLEAN DEFAULT FALSE,
    repaired BOOLEAN DEFAULT FALSE,
    repaired_at TIMESTAMPTZ,
    reparation_task_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add basic select/all policies on malus_applied
ALTER TABLE public.malus_applied ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for authenticated users on malus_applied" ON public.malus_applied
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
