-- Allow admin and super users to update any user's profile fields
-- Stacks with existing users_update_own policy (RLS policies are OR'd)
-- Uses EXISTS pattern consistent with all other admin-check policies in this codebase
DROP POLICY IF EXISTS "users_update_super_admin" ON public.users;

CREATE POLICY "users_update_super_admin"
  ON public.users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );
