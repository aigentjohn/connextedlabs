-- normalize-magazines-visibility.sql
-- Magazines currently use is_public (boolean).  This migration adds a
-- standard visibility column and migrates existing data from is_public.
-- The is_public column is intentionally left in place for backward
-- compatibility; remove it in a later migration once all code reads
-- from visibility instead.

ALTER TABLE magazines ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

UPDATE magazines
SET visibility = CASE
  WHEN is_public = true  THEN 'public'
  ELSE 'private'
END;

ALTER TABLE magazines DROP CONSTRAINT IF EXISTS magazines_visibility_check;
ALTER TABLE magazines ADD CONSTRAINT magazines_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));
