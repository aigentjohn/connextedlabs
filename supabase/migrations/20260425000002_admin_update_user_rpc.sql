-- SECURITY DEFINER function for admin user updates.
-- Bypasses RLS (which causes recursion when checking the users table from within
-- a users UPDATE policy). The admin check is enforced inside the function.
CREATE OR REPLACE FUNCTION admin_update_user(
  target_user_id uuid,
  new_role text DEFAULT NULL,
  new_user_class integer DEFAULT NULL,
  new_membership_tier text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.users
  SET
    role            = COALESCE(new_role, role),
    user_class      = COALESCE(new_user_class, user_class),
    membership_tier = COALESCE(new_membership_tier, membership_tier)
  WHERE id = target_user_id;
END;
$$;
