-- Sprint 3: add cover_image to tables that were missing it.
-- Bucket creation (avatars, covers, assets) must be done in the Supabase Dashboard.
-- Storage object RLS policies are set here.

ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE public.circles  ADD COLUMN IF NOT EXISTS cover_image text;

-- ── Storage RLS policies ────────────────────────────────────────────────────
-- These only take effect once the buckets exist in the Dashboard.
-- Note: CREATE POLICY does not support IF NOT EXISTS — safe to run once on a fresh setup.

-- avatars bucket
CREATE POLICY "avatars: users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "avatars: users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "avatars: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- covers bucket
CREATE POLICY "covers: users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "covers: users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "covers: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "covers: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'covers');

-- assets bucket (private — users read/write only their own folder)
CREATE POLICY "assets: users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "assets: users read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "assets: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
