INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/json']::text[]),
  ('receipts', 'receipts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]),
  ('dishes', 'dishes', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('chat-media', 'chat-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav']::text[])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS attachment_url text;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

DROP POLICY IF EXISTS "storage_binary_public_read" ON storage.objects;
CREATE POLICY "storage_binary_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id IN ('documents', 'receipts', 'dishes', 'avatars', 'chat-media'));

DROP POLICY IF EXISTS "storage_binary_authenticated_upload" ON storage.objects;
CREATE POLICY "storage_binary_authenticated_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('documents', 'receipts', 'dishes', 'avatars', 'chat-media'));

DROP POLICY IF EXISTS "storage_binary_authenticated_update_own" ON storage.objects;
CREATE POLICY "storage_binary_authenticated_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id IN ('documents', 'receipts', 'dishes', 'avatars', 'chat-media') AND owner = auth.uid())
WITH CHECK (bucket_id IN ('documents', 'receipts', 'dishes', 'avatars', 'chat-media') AND owner = auth.uid());

DROP POLICY IF EXISTS "storage_binary_authenticated_delete_own" ON storage.objects;
CREATE POLICY "storage_binary_authenticated_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id IN ('documents', 'receipts', 'dishes', 'avatars', 'chat-media') AND owner = auth.uid());
