-- Allow super admins to update any user's profile fields
-- Stacks with existing users_update_own policy (RLS policies are OR'd)
CREATE POLICY "users_update_super_admin"
  ON public.users FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'super'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'super'
  );
