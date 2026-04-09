-- =====================================================
-- Fix missing/recursive RLS policies on public.users
--
-- Two problems fixed:
--   1. No SELECT policy existed so fetchProfile() was blocked
--   2. Two existing policies caused infinite recursion by querying
--      public.users from within a public.users policy:
--        - "users_admin_all" (added by us, then dropped)
--        - "Users can view community members" (pre-existing)
-- =====================================================

-- Remove recursive policies
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "Users can view community members" ON public.users;

-- Remove any conflicting versions of the policies we add below
DROP POLICY IF EXISTS "users_read_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- Allow every authenticated user to read all user profiles.
-- Required for fetchProfile(), admin check subqueries, and member directory.
-- NOTE: Must NOT query public.users from within this policy (causes recursion).
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
