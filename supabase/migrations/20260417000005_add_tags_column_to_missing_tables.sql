-- =====================================================
-- Add tags column to tables that were missing it
--
-- RankingsPage, TagDetailPage, and the discovery feed
-- pages all query a tags text[] column across 19 tables.
-- These tables exist but were created without tags.
--
-- ADD COLUMN IF NOT EXISTS is a no-op when the column
-- already exists, so this is safe to run at any time.
-- =====================================================

ALTER TABLE public.blogs      ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.pitches     ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.magazines   ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.standups    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.sprints     ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.meetups     ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.libraries   ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.checklists  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN indexes for efficient array overlap queries (used by tag search and rankings)
CREATE INDEX IF NOT EXISTS blogs_tags_idx      ON public.blogs      USING GIN (tags);
CREATE INDEX IF NOT EXISTS pitches_tags_idx    ON public.pitches     USING GIN (tags);
CREATE INDEX IF NOT EXISTS magazines_tags_idx  ON public.magazines   USING GIN (tags);
CREATE INDEX IF NOT EXISTS standups_tags_idx   ON public.standups    USING GIN (tags);
CREATE INDEX IF NOT EXISTS sprints_tags_idx    ON public.sprints     USING GIN (tags);
CREATE INDEX IF NOT EXISTS meetups_tags_idx    ON public.meetups     USING GIN (tags);
CREATE INDEX IF NOT EXISTS libraries_tags_idx  ON public.libraries   USING GIN (tags);
CREATE INDEX IF NOT EXISTS checklists_tags_idx ON public.checklists  USING GIN (tags);
