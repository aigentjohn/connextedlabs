-- Backfill libraries.visibility from is_public for any rows
-- where visibility is still null or empty (pre-migration rows).
UPDATE public.libraries
SET visibility = CASE WHEN is_public THEN 'public' ELSE 'private' END
WHERE visibility IS NULL OR visibility = '';

-- Once the UI is confirmed working and all rows are backfilled,
-- the is_public column can be dropped:
--   ALTER TABLE public.libraries DROP COLUMN IF EXISTS is_public;
-- (Commented out intentionally — run manually after verifying.)
