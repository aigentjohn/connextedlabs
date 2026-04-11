-- circle_companion_items — curated resource kit for a circle
-- Circle admins pin ordered content items (documents, episodes, checklists,
-- playlists, pathways, QR codes, etc.) that members see as a "start here" panel.
-- The item_type column maps to values in the shared COMPANION_ITEM_TYPES registry.

CREATE TABLE IF NOT EXISTS public.circle_companion_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  item_type     text NOT NULL,          -- e.g. 'document', 'episode', 'qr_code'
  item_id       text NOT NULL,          -- UUID of the backing row (or circle_id for qr_code)
  order_index   integer NOT NULL DEFAULT 0,
  notes         text,                   -- optional admin annotation, e.g. "Start here"
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by circle
CREATE INDEX IF NOT EXISTS circle_companion_items_circle_id_idx
  ON public.circle_companion_items (circle_id, order_index);

-- Prevent duplicate items of the same type in the same circle
CREATE UNIQUE INDEX IF NOT EXISTS circle_companion_items_unique_item_idx
  ON public.circle_companion_items (circle_id, item_type, item_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS circle_companion_items_updated_at ON public.circle_companion_items;
CREATE TRIGGER circle_companion_items_updated_at
  BEFORE UPDATE ON public.circle_companion_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.circle_companion_items ENABLE ROW LEVEL SECURITY;

-- Members and guests of the circle can read items
-- (guest visibility per item_type is enforced in the application layer)
CREATE POLICY "circle_companion_items_select"
  ON public.circle_companion_items
  FOR SELECT
  USING (
    -- Platform admins always see everything
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super', 'admin')
    )
    OR
    -- Circle members see all items
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_companion_items.circle_id
        AND auth.uid() = ANY(member_ids)
    )
    OR
    -- Circle admins
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_companion_items.circle_id
        AND auth.uid() = ANY(admin_ids)
    )
  );

-- Only circle admins (and platform admins) can insert
CREATE POLICY "circle_companion_items_insert"
  ON public.circle_companion_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_companion_items.circle_id
        AND auth.uid() = ANY(admin_ids)
    )
  );

-- Only circle admins (and platform admins) can update (e.g. reorder)
CREATE POLICY "circle_companion_items_update"
  ON public.circle_companion_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_companion_items.circle_id
        AND auth.uid() = ANY(admin_ids)
    )
  );

-- Only circle admins (and platform admins) can delete
CREATE POLICY "circle_companion_items_delete"
  ON public.circle_companion_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_companion_items.circle_id
        AND auth.uid() = ANY(admin_ids)
    )
  );
