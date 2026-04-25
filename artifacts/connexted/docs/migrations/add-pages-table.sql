-- Add pages table
-- Lightweight inline-markdown content type for courses, cohorts, and journeys.
-- Unlike documents (URL-based), pages store their content directly in the DB.

CREATE TABLE IF NOT EXISTS public.pages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  content      text        NOT NULL DEFAULT '',
  description  text,
  template_id  uuid,                          -- nullable; reserved for future page templates
  created_by   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  visibility   text        NOT NULL DEFAULT 'private'
                             CHECK (visibility IN ('public', 'member', 'private')),
  tags         text[]      NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at current on every row change
CREATE OR REPLACE FUNCTION public.set_pages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.set_pages_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS pages_created_by_idx ON public.pages (created_by);
CREATE INDEX IF NOT EXISTS pages_created_at_idx ON public.pages (created_at DESC);

-- Row Level Security
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "pages_own"
  ON public.pages FOR ALL
  USING ((SELECT auth.uid()) = created_by);

-- Public pages visible to all authenticated users
CREATE POLICY "pages_public_read"
  ON public.pages FOR SELECT
  USING (visibility = 'public');

-- Member-visibility pages visible to authenticated users
CREATE POLICY "pages_member_read"
  ON public.pages FOR SELECT
  USING (visibility = 'member' AND (SELECT auth.uid()) IS NOT NULL);
