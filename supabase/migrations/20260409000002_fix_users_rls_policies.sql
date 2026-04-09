-- =====================================================
-- Fix missing RLS policies on public.users
--
-- When RLS was enabled on users in migration 20260408000002, it was noted
-- that "policies already exist" — but those policies were defined elsewhere
-- (e.g. the original Supabase schema). This migration ensures the required
-- policies are present regardless.
--
-- Without a SELECT policy, every query that does:
--   EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super'))
-- returns empty, breaking admin checks across all tables.
-- =====================================================

-- Allow every authenticated user to read all user profiles.
-- This is required for:
--   1. fetchProfile() in auth-context.tsx
--   2. Admin check subqueries in other table policies
--   3. Community directory / member lists
CREATE POLICY IF NOT EXISTS "users_read_authenticated"
  ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to update their own profile only.
CREATE POLICY IF NOT EXISTS "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile row (needed when profile
-- doesn't exist yet and auth-context creates one on first login).
CREATE POLICY IF NOT EXISTS "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow admins full access (needed for impersonation, user management, etc.)
CREATE POLICY IF NOT EXISTS "users_admin_all"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'super')
    )
  );
