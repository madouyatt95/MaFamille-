-- CREATE TABLE family_join_requests
CREATE TABLE IF NOT EXISTS public.family_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    applicant_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT,
    applicant_avatar TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    requested_by_code BOOLEAN DEFAULT TRUE,
    requested_by_qr BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, applicant_user_id)
);

-- ENABLE RLS
ALTER TABLE public.family_join_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: applicant or foyer admin/parent
CREATE POLICY "join_requests_select" ON public.family_join_requests FOR SELECT
    USING (applicant_user_id = auth.uid() OR public.is_foyer_admin_or_parent(family_id));

-- INSERT: applicant must be the auth user
CREATE POLICY "join_requests_insert" ON public.family_join_requests FOR INSERT
    WITH CHECK (applicant_user_id = auth.uid());

-- UPDATE: only foyer admin/parent (to accept/reject)
CREATE POLICY "join_requests_update" ON public.family_join_requests FOR UPDATE
    USING (public.is_foyer_admin_or_parent(family_id));

-- DELETE: applicant can cancel their own, or foyer admin/parent can delete it
CREATE POLICY "join_requests_delete" ON public.family_join_requests FOR DELETE
    USING (applicant_user_id = auth.uid() OR public.is_foyer_admin_or_parent(family_id));

-- CREATE RPC get_foyer_by_invite_code
CREATE OR REPLACE FUNCTION public.get_foyer_by_invite_code(p_variations TEXT[])
RETURNS TABLE(id UUID, name TEXT, invite_code TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.name, f.invite_code
    FROM public.foyers f
    WHERE UPPER(TRIM(f.invite_code)) = ANY(p_variations);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
