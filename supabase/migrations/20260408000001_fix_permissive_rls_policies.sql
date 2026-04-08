-- =====================================================
-- Fix overly permissive RLS policies
-- Identified in code review: two policies allowed any
-- authenticated user to perform admin-level writes.
-- =====================================================

-- Fix 1: funnel_config_write_admin
-- Was: any authenticated user could write funnel configurations
-- Now: only users with is_admin = true
DROP POLICY IF EXISTS "funnel_config_write_admin" ON public.funnel_configurations;
CREATE POLICY "funnel_config_write_admin" ON public.funnel_configurations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- Fix 2: participants_update_admin
-- Was: any authenticated user could update participant records
-- Now: only users with is_admin = true
DROP POLICY IF EXISTS "participants_update_admin" ON public.participants;
CREATE POLICY "participants_update_admin" ON public.participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
