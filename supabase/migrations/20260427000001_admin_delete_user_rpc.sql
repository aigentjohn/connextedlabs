CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_user(uuid) TO authenticated;
