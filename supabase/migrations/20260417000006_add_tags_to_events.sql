-- =====================================================
-- Add tags column to events table
--
-- Events are now classified as platform-level content
-- (taxonomy.ts CONTENT_TAXONOMY) and must support tag
-- discovery the same way other content types do.
--
-- ADD COLUMN IF NOT EXISTS is a no-op when the column
-- already exists, so this is safe to run at any time.
-- =====================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN index for efficient array overlap queries
CREATE INDEX IF NOT EXISTS events_tags_idx ON public.events USING GIN (tags);
