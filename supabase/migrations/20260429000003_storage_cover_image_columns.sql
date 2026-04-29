-- Sprint 3: add cover_image to tables that were missing it.
-- Bucket creation (avatars, covers, assets) must be done in the Supabase Dashboard.
-- Storage object RLS policies are set here.

ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE public.circles  ADD COLUMN IF NOT EXISTS cover_image text;

-- ── Storage RLS policies ────────────────────────────────────────────────────
-- These only take effect once the buckets exist in the Dashboard.

-- avatars bucket: any authenticated user can upload to their own folder;
-- public read is handled by the bucket's public flag.
CREATE POLICY IF NOT EXISTS "avatars: users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY IF NOT EXISTS "avatars: users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY IF NOT EXISTS "avatars: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY IF NOT EXISTS "avatars: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- covers bucket: authenticated users can upload; public read.
CREATE POLICY IF NOT EXISTS "covers: users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY IF NOT EXISTS "covers: users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY IF NOT EXISTS "covers: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY IF NOT EXISTS "covers: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'covers');

-- assets bucket: private — users read/write only their own folder.
CREATE POLICY IF NOT EXISTS "assets: users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY IF NOT EXISTS "assets: users read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY IF NOT EXISTS "assets: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
