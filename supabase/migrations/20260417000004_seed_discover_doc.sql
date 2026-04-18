-- =====================================================
-- Seed platform_docs row for the Discover feature guide
--
-- Uses INSERT ... ON CONFLICT DO NOTHING so this is
-- safe to run multiple times and won't overwrite any
-- admin edits already made through Documentation Manager.
-- =====================================================

INSERT INTO public.platform_docs (
  doc_key,
  title,
  content,
  doc_type,
  description,
  is_active,
  sort_order
)
VALUES (
  'discover',
  'Discover — Feature Guide',
  '',   -- intentionally empty: HelpViewer falls back to DISCOVER.md until an admin saves content here
  'help',
  'How to use the Discover section — topics, tags, feeds, rankings, and favorites',
  true,
  30
)
ON CONFLICT (doc_key) DO NOTHING;
