-- Suppression du module Racines familiales.
-- Les tables sont supprimees en premier pour retirer leurs policies RLS,
-- car certaines policies dependent de can_view_family_tree_foyer().

DROP TABLE IF EXISTS public.family_tree_validation_logs CASCADE;
DROP TABLE IF EXISTS public.family_tree_memories CASCADE;
DROP TABLE IF EXISTS public.family_tree_correction_requests CASCADE;
DROP TABLE IF EXISTS public.family_tree_identity_requests CASCADE;
DROP TABLE IF EXISTS public.family_tree_events CASCADE;
DROP TABLE IF EXISTS public.family_tree_relationships CASCADE;
DROP TABLE IF EXISTS public.family_tree_connections CASCADE;
DROP TABLE IF EXISTS public.family_tree_profiles CASCADE;
DROP TABLE IF EXISTS public.family_tree_settings CASCADE;

DROP FUNCTION IF EXISTS public.undo_family_tree_correction(UUID);
DROP FUNCTION IF EXISTS public.review_family_tree_correction(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.get_family_tree_visible_profiles(UUID);
DROP FUNCTION IF EXISTS public.log_family_tree_validation(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.family_tree_code_is_active(TEXT);
DROP FUNCTION IF EXISTS public.regenerate_family_tree_code(UUID);
DROP FUNCTION IF EXISTS public.respond_family_tree_identity_link(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.request_family_tree_identity_link(UUID, UUID);
DROP FUNCTION IF EXISTS public.delete_family_tree_relationship(UUID, UUID);
DROP FUNCTION IF EXISTS public.add_family_tree_relationship(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.cancel_family_tree_connection(UUID);
DROP FUNCTION IF EXISTS public.respond_family_tree_connection(UUID, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.request_family_tree_connection(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.can_view_family_tree_foyer(UUID);
