-- =====================================================
-- Fix missing RLS policies on public.users
-- =====================================================

-- Drop any conflicting policies first so this is safe to re-run
DROP POLICY IF EXISTS "users_read_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;

-- Allow every authenticated user to read all user profiles.
-- Required for fetchProfile(), admin check subqueries, and member directory.
CREATE POLICY "users_read_authenticated"
  ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to update their own profile only.
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile row on first login.
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow admins full access (impersonation, user management, etc.)
CREATE POLICY "users_admin_all"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'super')
    )
  );
