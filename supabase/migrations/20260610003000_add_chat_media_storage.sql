INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  5242880,
  ARRAY['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "chat_media_public_read" ON storage.objects;
CREATE POLICY "chat_media_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_authenticated_upload" ON storage.objects;
CREATE POLICY "chat_media_authenticated_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_authenticated_delete_own" ON storage.objects;
CREATE POLICY "chat_media_authenticated_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND owner = auth.uid());
