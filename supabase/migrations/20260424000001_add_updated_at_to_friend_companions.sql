-- Add updated_at to friend_companions and keep it current
-- when items are added, updated, or deleted.

ALTER TABLE public.friend_companions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill: set updated_at = most recent item timestamp (or created_at if no items)
UPDATE public.friend_companions fc
SET updated_at = COALESCE(
  (SELECT MAX(fci.updated_at)
   FROM public.friend_companion_items fci
   WHERE fci.companion_id = fc.id),
  fc.created_at
);

-- Trigger function: bump friend_companions.updated_at on any item change
CREATE OR REPLACE FUNCTION public.touch_friend_companion_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _companion_id uuid;
BEGIN
  _companion_id := COALESCE(NEW.companion_id, OLD.companion_id);
  UPDATE public.friend_companions
  SET updated_at = now()
  WHERE id = _companion_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friend_companion_items_touch ON public.friend_companion_items;

CREATE TRIGGER friend_companion_items_touch
  AFTER INSERT OR UPDATE OR DELETE
  ON public.friend_companion_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_friend_companion_updated_at();
