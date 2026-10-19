-- Songs for personal invitation cards.
--
-- Songs are audio files the card owner uploads. They live in a PRIVATE bucket, never
-- in a public URL. The owner may write, read and delete only inside their own user-id
-- folder. A guest may read a song only while a published, unexpired card lists that
-- exact object in content->'songs'. Drafts stay owner-only, matching portraits and RSVPs.
-- Idempotent: safe to apply again (ON CONFLICT, DROP POLICY IF EXISTS).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invitation-songs',
  'invitation-songs',
  false,
  10485760,
  ARRAY[
    'audio/mpeg', 'audio/mp3',
    'audio/mp4', 'audio/x-m4a', 'audio/aac',
    'audio/wav', 'audio/x-wav', 'audio/wave',
    'audio/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Owners upload invitation songs" ON storage.objects;
CREATE POLICY "Owners upload invitation songs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'invitation-songs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Owners read own invitation songs" ON storage.objects;
CREATE POLICY "Owners read own invitation songs" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'invitation-songs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Owners delete own invitation songs" ON storage.objects;
CREATE POLICY "Owners delete own invitation songs" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'invitation-songs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Guests hear songs on published invitations" ON storage.objects;
CREATE POLICY "Guests hear songs on published invitations" ON storage.objects
  FOR SELECT TO anon, authenticated USING (
    bucket_id = 'invitation-songs'
    AND EXISTS (
      SELECT 1 FROM public.invitation_cards c
      WHERE c.status = 'published'
        AND (c.expires_at IS NULL OR c.expires_at > now())
        AND c.content->'songs' @> jsonb_build_array(jsonb_build_object('path', storage.objects.name))
    )
  );
