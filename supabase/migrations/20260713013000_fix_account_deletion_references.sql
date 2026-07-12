-- Invitations are disposable account-owned records and must not block Auth deletion.
ALTER TABLE public.foyer_invitations
  DROP CONSTRAINT IF EXISTS foyer_invitations_invited_by_fkey;

ALTER TABLE public.foyer_invitations
  ADD CONSTRAINT foyer_invitations_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
