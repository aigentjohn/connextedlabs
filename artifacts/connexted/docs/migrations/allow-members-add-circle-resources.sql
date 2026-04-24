-- Allow any circle member (not just admins) to add resources
-- Run in Supabase SQL Editor

-- Drop the old admin-only insert policy
DROP POLICY IF EXISTS "circle_companion_items_insert" ON public.circle_companion_items;

-- New policy: platform admins, circle admins, OR circle members can insert
CREATE POLICY "circle_companion_items_insert"
  ON public.circle_companion_items
  FOR INSERT
  WITH CHECK (
    -- Platform-level admins
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super', 'admin')
    )
    OR
    -- Circle admins and circle members
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_companion_items.circle_id
        AND (
          auth.uid() = ANY(admin_ids)
          OR auth.uid() = ANY(member_ids)
        )
    )
  );
