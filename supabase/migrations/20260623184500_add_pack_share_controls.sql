ALTER TABLE public.justificatif_packs
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS allow_direct_downloads BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.justificatif_packs
SET
  share_duration_days = COALESCE(share_duration_days, 7),
  share_expires_at = COALESCE(share_expires_at, now() + interval '7 days'),
  allow_direct_downloads = COALESCE(allow_direct_downloads, TRUE)
WHERE share_duration_days IS NULL
   OR share_expires_at IS NULL
   OR allow_direct_downloads IS NULL;
