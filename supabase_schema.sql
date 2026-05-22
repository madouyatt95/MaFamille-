-- ============================================================
-- SCHÉMA MAFAMILLE+ v2 : MULTI-FOYERS & SYNC TEMPS RÉEL
-- À exécuter dans l'éditeur SQL de votre console Supabase
-- ============================================================

-- ========================
-- 1. TABLES STRUCTURELLES
-- ========================

-- FOYERS (Households)
CREATE TABLE IF NOT EXISTS public.foyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Mon Foyer',
    invite_code TEXT UNIQUE NOT NULL,
    invite_link TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_premium BOOLEAN DEFAULT FALSE,
    max_members INT DEFAULT 3
);

-- MEMBRES DU FOYER (liés aux vrais comptes Supabase)
CREATE TABLE IF NOT EXISTS public.foyer_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'child' CHECK (role IN ('admin', 'parent', 'child', 'guest')),
    photo_url TEXT,
    age TEXT,
    birth_date TEXT,
    blood_group TEXT,
    allergies TEXT[] DEFAULT '{}',
    treatments TEXT[] DEFAULT '{}',
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    school_or_employer TEXT,
    has_exemption BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(foyer_id, user_id)
);

-- INVITATIONS EN ATTENTE
CREATE TABLE IF NOT EXISTS public.foyer_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'child' CHECK (role IN ('parent', 'child', 'guest')),
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted BOOLEAN DEFAULT FALSE
);

-- ========================
-- 2. TABLES DE DONNÉES (1 par module, liées au foyer)
-- ========================

-- ÉVÉNEMENTS / AGENDA
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'other',
    date_time TEXT,
    time TEXT,
    member_id TEXT,
    member_name TEXT,
    location TEXT,
    description TEXT,
    done BOOLEAN DEFAULT FALSE,
    amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- TRANSACTIONS FINANCIÈRES
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings')),
    category TEXT,
    date TEXT,
    title TEXT,
    member_id TEXT,
    member_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    sub_category TEXT,
    member_id TEXT,
    member_name TEXT,
    tags TEXT[] DEFAULT '{}',
    upload_date TEXT,
    expiry_date TEXT,
    file_size TEXT,
    is_expired BOOLEAN DEFAULT FALSE,
    description TEXT,
    file_base64 TEXT,
    is_secure BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- LISTE DE COURSES
CREATE TABLE IF NOT EXISTS public.groceries (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    quantity TEXT,
    checked BOOLEAN DEFAULT FALSE,
    in_stock BOOLEAN DEFAULT FALSE,
    expiry_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- MENUS DE LA SEMAINE
CREATE TABLE IF NOT EXISTS public.dishes (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    day TEXT,
    meal_type TEXT CHECK (meal_type IN ('lunch', 'dinner')),
    name TEXT NOT NULL,
    image TEXT,
    ingredients TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- TÂCHES MÉNAGÈRES
CREATE TABLE IF NOT EXISTS public.chore_tasks (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    reward_points INT DEFAULT 0,
    assigned_member_id TEXT,
    assigned_member_name TEXT,
    done BOOLEAN DEFAULT FALSE,
    rotation TEXT DEFAULT 'none',
    validated_by_parent BOOLEAN DEFAULT FALSE,
    due_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- VÉHICULES
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    plate TEXT,
    insurance_expiry TEXT,
    technical_control TEXT,
    last_service TEXT,
    next_service TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- ENTRETIEN LOGEMENT
CREATE TABLE IF NOT EXISTS public.maintenance (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT,
    cost NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'scheduled',
    provider TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- VOYAGES
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    budget NUMERIC DEFAULT 0,
    checklist JSONB DEFAULT '[]'::jsonb,
    booking_refs TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- ANIMAUX
CREATE TABLE IF NOT EXISTS public.pets (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT,
    last_vaccine TEXT,
    next_vaccine TEXT,
    vet_appointment TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- ARGENT DE POCHE
CREATE TABLE IF NOT EXISTS public.pocket_money (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    points INT DEFAULT 0,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- OBJECTIFS D'ÉPARGNE
CREATE TABLE IF NOT EXISTS public.saving_goals (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    target_date TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.alerts (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    time TEXT,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    module TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- CAPSULE TEMPORELLE / SOUVENIRS
CREATE TABLE IF NOT EXISTS public.memories (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    date TEXT,
    title TEXT NOT NULL,
    description TEXT,
    author_name TEXT,
    author_photo TEXT,
    image_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    likes_count INT DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    theme TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- VOTES / CONSEIL DE FAMILLE
CREATE TABLE IF NOT EXISTS public.votes (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    author_name TEXT,
    active BOOLEAN DEFAULT TRUE,
    due_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- DEVOIRS SCOLAIRES
CREATE TABLE IF NOT EXISTS public.school_tasks (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    subject TEXT,
    title TEXT NOT NULL,
    due_date TEXT,
    done BOOLEAN DEFAULT FALSE,
    assigned_member_id TEXT,
    difficulty TEXT DEFAULT 'medium',
    grade TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- GROUPES DE CHAT
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    member_ids TEXT[] DEFAULT '{}',
    last_message TEXT,
    last_message_time TEXT,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- MESSAGES DE CHAT
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    group_id TEXT,
    sender_id TEXT,
    sender_name TEXT,
    type TEXT DEFAULT 'text',
    content TEXT,
    timestamp TEXT,
    read_by TEXT[] DEFAULT '{}',
    reactions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- DÉMARCHES ADMINISTRATIVES
CREATE TABLE IF NOT EXISTS public.demarches (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    template_id TEXT,
    title TEXT NOT NULL,
    icon TEXT,
    status TEXT DEFAULT 'draft',
    assigned_member_id TEXT,
    assigned_member_name TEXT,
    steps JSONB DEFAULT '[]'::jsonb,
    pieces JSONB DEFAULT '[]'::jsonb,
    created_at_text TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- PACKS DE JUSTIFICATIFS
CREATE TABLE IF NOT EXISTS public.justificatif_packs (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_type TEXT,
    document_ids TEXT[] DEFAULT '{}',
    created_at_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- HISTORIQUE MÉDICAL (lié aux membres)
CREATE TABLE IF NOT EXISTS public.medical_history (
    id TEXT NOT NULL,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL,
    date TEXT,
    title TEXT NOT NULL,
    doctor TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, foyer_id)
);

-- ========================
-- 3. ROW LEVEL SECURITY (RLS)
-- ========================

-- Activer RLS sur toutes les tables
ALTER TABLE public.foyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foyer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foyer_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groceries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pocket_money ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demarches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justificatif_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;

-- Helper function: récupère les foyer_ids de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.user_foyer_ids()
RETURNS SETOF UUID AS $$
    SELECT foyer_id FROM public.foyer_members WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- FOYERS : visible par les membres
CREATE POLICY "foyers_select" ON public.foyers FOR SELECT
    USING (id IN (SELECT public.user_foyer_ids()));
CREATE POLICY "foyers_insert" ON public.foyers FOR INSERT
    WITH CHECK (created_by = auth.uid());
CREATE POLICY "foyers_update" ON public.foyers FOR UPDATE
    USING (created_by = auth.uid());
CREATE POLICY "foyers_delete" ON public.foyers FOR DELETE
    USING (created_by = auth.uid());

-- FOYER MEMBERS : visible par les co-membres
CREATE POLICY "members_select" ON public.foyer_members FOR SELECT
    USING (foyer_id IN (SELECT public.user_foyer_ids()));
CREATE POLICY "members_insert" ON public.foyer_members FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_delete" ON public.foyer_members FOR DELETE
    USING (user_id = auth.uid() OR foyer_id IN (
        SELECT foyer_id FROM public.foyer_members WHERE user_id = auth.uid() AND role = 'admin'
    ));
CREATE POLICY "members_update" ON public.foyer_members FOR UPDATE
    USING (user_id = auth.uid() OR foyer_id IN (
        SELECT foyer_id FROM public.foyer_members WHERE user_id = auth.uid() AND role IN ('admin', 'parent')
    ));

-- INVITATIONS : visible par les membres admin/parent du foyer
CREATE POLICY "invitations_select" ON public.foyer_invitations FOR SELECT
    USING (foyer_id IN (SELECT public.user_foyer_ids()));
CREATE POLICY "invitations_insert" ON public.foyer_invitations FOR INSERT
    WITH CHECK (foyer_id IN (
        SELECT foyer_id FROM public.foyer_members WHERE user_id = auth.uid() AND role IN ('admin', 'parent')
    ));

-- MACRO : Politique générique "les membres du foyer peuvent tout faire"
-- Appliquée à toutes les tables de données
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'events', 'transactions', 'documents', 'groceries', 'dishes',
        'chore_tasks', 'vehicles', 'maintenance', 'trips', 'pets',
        'pocket_money', 'saving_goals', 'alerts', 'memories', 'votes',
        'school_tasks', 'chat_groups', 'chat_messages', 'demarches',
        'justificatif_packs', 'medical_history'
    ])
    LOOP
        EXECUTE format('
            CREATE POLICY "%s_select" ON public.%I FOR SELECT
                USING (foyer_id IN (SELECT public.user_foyer_ids()));
            CREATE POLICY "%s_insert" ON public.%I FOR INSERT
                WITH CHECK (foyer_id IN (SELECT public.user_foyer_ids()));
            CREATE POLICY "%s_update" ON public.%I FOR UPDATE
                USING (foyer_id IN (SELECT public.user_foyer_ids()));
            CREATE POLICY "%s_delete" ON public.%I FOR DELETE
                USING (foyer_id IN (SELECT public.user_foyer_ids()));
        ', tbl || '_sel', tbl, tbl || '_ins', tbl, tbl || '_upd', tbl, tbl || '_del', tbl);
    END LOOP;
END $$;

-- ========================
-- 4. FONCTIONS RPC
-- ========================

-- Générer un code d'invitation aléatoire (FAM-XXXX)
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'FAM-';
    i INT;
BEGIN
    FOR i IN 1..5 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- CRÉER UN FOYER
CREATE OR REPLACE FUNCTION public.create_foyer(
    p_name TEXT,
    p_display_name TEXT,
    p_is_premium BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
    v_foyer_id UUID;
    v_code TEXT;
    v_max INT;
BEGIN
    -- Générer un code unique
    LOOP
        v_code := public.generate_invite_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.foyers WHERE invite_code = v_code);
    END LOOP;

    v_max := CASE WHEN p_is_premium THEN 999 ELSE 3 END;

    -- Créer le foyer
    INSERT INTO public.foyers (name, invite_code, created_by, is_premium, max_members)
    VALUES (p_name, v_code, auth.uid(), p_is_premium, v_max)
    RETURNING id INTO v_foyer_id;

    -- Ajouter le créateur comme admin
    INSERT INTO public.foyer_members (foyer_id, user_id, display_name, role)
    VALUES (v_foyer_id, auth.uid(), p_display_name, 'admin');

    RETURN json_build_object(
        'foyer_id', v_foyer_id,
        'invite_code', v_code,
        'name', p_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REJOINDRE UN FOYER PAR CODE
CREATE OR REPLACE FUNCTION public.join_foyer(
    p_invite_code TEXT,
    p_display_name TEXT,
    p_role TEXT DEFAULT 'child'
)
RETURNS JSON AS $$
DECLARE
    v_foyer_id UUID;
    v_foyer_name TEXT;
    v_member_count INT;
    v_max INT;
    v_already BOOLEAN;
BEGIN
    -- Trouver le foyer
    SELECT id, name, max_members INTO v_foyer_id, v_foyer_name, v_max
    FROM public.foyers
    WHERE invite_code = UPPER(TRIM(p_invite_code));

    IF v_foyer_id IS NULL THEN
        RAISE EXCEPTION 'Code d''invitation invalide. Vérifiez le code et réessayez.';
    END IF;

    -- Vérifier si déjà membre
    SELECT EXISTS(
        SELECT 1 FROM public.foyer_members WHERE foyer_id = v_foyer_id AND user_id = auth.uid()
    ) INTO v_already;

    IF v_already THEN
        RAISE EXCEPTION 'Vous êtes déjà membre de ce foyer.';
    END IF;

    -- Vérifier la limite
    SELECT COUNT(*) INTO v_member_count FROM public.foyer_members WHERE foyer_id = v_foyer_id;
    IF v_member_count >= v_max THEN
        RAISE EXCEPTION 'Ce foyer a atteint la limite de % membres. Passez au Premium pour inviter plus de monde.', v_max;
    END IF;

    -- Valider le rôle
    IF p_role NOT IN ('parent', 'child', 'guest') THEN
        p_role := 'child';
    END IF;

    -- Ajouter
    INSERT INTO public.foyer_members (foyer_id, user_id, display_name, role)
    VALUES (v_foyer_id, auth.uid(), p_display_name, p_role);

    RETURN json_build_object(
        'foyer_id', v_foyer_id,
        'foyer_name', v_foyer_name,
        'role', p_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INVITER PAR EMAIL
CREATE OR REPLACE FUNCTION public.invite_by_email(
    p_foyer_id UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'child'
)
RETURNS VOID AS $$
BEGIN
    -- Vérifier que l'appelant est admin ou parent du foyer
    IF NOT EXISTS (
        SELECT 1 FROM public.foyer_members
        WHERE foyer_id = p_foyer_id AND user_id = auth.uid() AND role IN ('admin', 'parent')
    ) THEN
        RAISE EXCEPTION 'Seuls les parents et admins peuvent inviter.';
    END IF;

    INSERT INTO public.foyer_invitations (foyer_id, email, role, invited_by)
    VALUES (p_foyer_id, LOWER(TRIM(p_email)), p_role, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RÉGÉNÉRER LE CODE D'INVITATION (admin only)
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_foyer_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.foyer_members
        WHERE foyer_id = p_foyer_id AND user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Seul l''admin peut régénérer le code.';
    END IF;

    LOOP
        v_code := public.generate_invite_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.foyers WHERE invite_code = v_code);
    END LOOP;

    UPDATE public.foyers SET invite_code = v_code, updated_at = NOW() WHERE id = p_foyer_id;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- METTRE À JOUR LE PROFIL D'UN MEMBRE (contourne le RLS - Version Unifiée sans Surcharges)
DROP FUNCTION IF EXISTS public.update_member_profile(uuid, text, text, text, text, text, text[], text[], text, text, text, text);
DROP FUNCTION IF EXISTS public.update_member_profile(uuid, text, text, text, text, text, text[], text[], text, text, text, text, boolean, text);
DROP FUNCTION IF EXISTS public.update_member_profile(uuid, text, text, text, text, text, text[], text[], text, text, text, text, numeric, numeric, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.update_member_profile(uuid, text, text, text, text, text, text[], text[], text, text, text, text, boolean, text, numeric, numeric, text, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.update_member_profile(
    p_member_id UUID,
    p_display_name TEXT DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL,
    p_age TEXT DEFAULT NULL,
    p_birth_date TEXT DEFAULT NULL,
    p_blood_group TEXT DEFAULT NULL,
    p_allergies TEXT[] DEFAULT NULL,
    p_treatments TEXT[] DEFAULT NULL,
    p_emergency_contact_name TEXT DEFAULT NULL,
    p_emergency_contact_phone TEXT DEFAULT NULL,
    p_emergency_contact_relation TEXT DEFAULT NULL,
    p_school_or_employer TEXT DEFAULT NULL,
    p_has_exemption BOOLEAN DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_location_status TEXT DEFAULT NULL,
    p_last_located_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_foyer_id UUID;
BEGIN
    -- 1. Vérifier que le membre cible existe et récupérer son foyer
    SELECT foyer_id INTO v_foyer_id
    FROM public.foyer_members WHERE id = p_member_id;

    IF v_foyer_id IS NULL THEN
        RAISE EXCEPTION 'Membre introuvable.';
    END IF;

    -- 2. Vérifier que l'appelant est membre du même foyer
    IF NOT EXISTS (
        SELECT 1 FROM public.foyer_members
        WHERE foyer_id = v_foyer_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Vous n''êtes pas membre de ce foyer.';
    END IF;

    -- 3. Appliquer les mises à jour (seuls les champs non-NULL sont modifiés)
    UPDATE public.foyer_members SET
        display_name = COALESCE(p_display_name, display_name),
        photo_url = COALESCE(p_photo_url, photo_url),
        age = COALESCE(p_age, age),
        birth_date = COALESCE(p_birth_date, birth_date),
        blood_group = COALESCE(p_blood_group, blood_group),
        allergies = COALESCE(p_allergies, allergies),
        treatments = COALESCE(p_treatments, treatments),
        emergency_contact_name = COALESCE(p_emergency_contact_name, emergency_contact_name),
        emergency_contact_phone = COALESCE(p_emergency_contact_phone, emergency_contact_phone),
        emergency_contact_relation = COALESCE(p_emergency_contact_relation, emergency_contact_relation),
        school_or_employer = COALESCE(p_school_or_employer, school_or_employer),
        has_exemption = COALESCE(p_has_exemption, has_exemption),
        role = COALESCE(p_role, role),
        latitude = COALESCE(p_latitude, latitude),
        longitude = COALESCE(p_longitude, longitude),
        location_status = COALESCE(p_location_status, location_status),
        last_located_at = COALESCE(p_last_located_at, last_located_at)
    WHERE id = p_member_id;

    RETURN json_build_object('success', true, 'member_id', p_member_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- 5. ACTIVER REALTIME
-- ========================

-- Activer Realtime sur les tables de données les plus fréquemment mises à jour
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groceries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chore_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.foyer_members;
