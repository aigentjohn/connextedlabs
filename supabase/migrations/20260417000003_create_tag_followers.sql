-- =====================================================
-- Tag Followers
--
-- Allows users to follow (star) text tags so their
-- content surfaces in the Discovery following feed.
--
-- Tags are free-text strings stored on content rows,
-- not a UUID-keyed table, so we store the tag text
-- directly. Tag is lowercased on insert for consistency.
-- =====================================================

CREATE TABLE public.tag_followers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tag        text        NOT NULL CHECK (char_length(trim(tag)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, tag)
);

CREATE INDEX tag_followers_user_idx ON public.tag_followers(user_id);
CREATE INDEX tag_followers_tag_idx  ON public.tag_followers(tag);

ALTER TABLE public.tag_followers ENABLE ROW LEVEL SECURITY;

-- Users can read and manage only their own tag follows
CREATE POLICY "tag_followers_own"
  ON public.tag_followers FOR ALL
  USING ((SELECT auth.uid()) = user_id);
