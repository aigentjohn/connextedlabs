-- Drop dead engagement columns that are never written to from the frontend
-- (view_count/click_count on blogs, views on episodes).
-- If real tracking is added later it will come via server-side triggers
-- or Edge Functions, not these columns.

ALTER TABLE public.blogs    DROP COLUMN IF EXISTS view_count;
ALTER TABLE public.blogs    DROP COLUMN IF EXISTS click_count;
ALTER TABLE public.episodes DROP COLUMN IF EXISTS views;

-- Books soft-delete: creator deletes now set deleted_at instead of hard-deleting.
-- All browse/search queries must add .is('deleted_at', null).
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS books_deleted_at_idx ON public.books (deleted_at)
  WHERE deleted_at IS NULL;
