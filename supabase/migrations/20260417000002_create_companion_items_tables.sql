-- =====================================================
-- Companion Items Tables
--
-- Three companion item tables were referenced by UI
-- components but never created by a migration.
-- This migration creates all three with consistent
-- structure and RLS policies.
--
--   circle_companion_items   — curated resources on a circle
--   company_companion_items  — curated items on a company profile
--   sponsor_companion_items  — curated items on a sponsor profile
-- =====================================================


-- ── circle_companion_items ────────────────────────────────────────────────
-- Curated content pinned to a circle by its admins.
-- Members can read; circle admins (and platform admins) can write.

CREATE TABLE IF NOT EXISTS public.circle_companion_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     uuid        NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  item_type     text        NOT NULL,
  item_id       text        NOT NULL,
  order_index   integer     NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (circle_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS circle_companion_items_circle_idx
  ON public.circle_companion_items(circle_id, order_index);

ALTER TABLE public.circle_companion_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "circle_companion_items_read"  ON public.circle_companion_items;
DROP POLICY IF EXISTS "circle_companion_items_write" ON public.circle_companion_items;

-- Any authenticated user who is a member (or admin) of the circle can read
CREATE POLICY "circle_companion_items_read"
  ON public.circle_companion_items FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (
          (SELECT auth.uid()) = ANY(c.member_ids)
          OR (SELECT auth.uid()) = ANY(c.admin_ids)
        )
    )
  );

-- Circle admins and platform admins can add / update / remove items
CREATE POLICY "circle_companion_items_write"
  ON public.circle_companion_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (SELECT auth.uid()) = ANY(c.admin_ids)
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.role IN ('admin', 'super')
    )
  );


-- ── company_companion_items ───────────────────────────────────────────────
-- Curated content pinned to a company profile.
-- Authenticated users can read (companies are public profiles).
-- Company owner, company members, and platform admins can write.

CREATE TABLE IF NOT EXISTS public.company_companion_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.market_companies(id) ON DELETE CASCADE,
  item_type     text        NOT NULL,
  item_id       text        NOT NULL,
  order_index   integer     NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (company_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS company_companion_items_company_idx
  ON public.company_companion_items(company_id, order_index);

ALTER TABLE public.company_companion_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_companion_items_read"  ON public.company_companion_items;
DROP POLICY IF EXISTS "company_companion_items_write" ON public.company_companion_items;

-- Any authenticated user can read companion items (company profiles are public)
CREATE POLICY "company_companion_items_read"
  ON public.company_companion_items FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Owner, company members, and platform admins can write
CREATE POLICY "company_companion_items_write"
  ON public.company_companion_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.market_companies mc
      WHERE mc.id = company_id
        AND mc.owner_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_id
        AND cm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.role IN ('admin', 'super')
    )
  );


-- ── sponsor_companion_items ───────────────────────────────────────────────
-- Curated content pinned to a sponsor profile.
-- Authenticated users can read (sponsors are public).
-- Platform admins manage sponsor content.

CREATE TABLE IF NOT EXISTS public.sponsor_companion_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id    uuid        NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  item_type     text        NOT NULL,
  item_id       text        NOT NULL,
  order_index   integer     NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sponsor_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS sponsor_companion_items_sponsor_idx
  ON public.sponsor_companion_items(sponsor_id, order_index);

ALTER TABLE public.sponsor_companion_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsor_companion_items_read"  ON public.sponsor_companion_items;
DROP POLICY IF EXISTS "sponsor_companion_items_write" ON public.sponsor_companion_items;

-- Any authenticated user can read
CREATE POLICY "sponsor_companion_items_read"
  ON public.sponsor_companion_items FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Platform admins can write
CREATE POLICY "sponsor_companion_items_write"
  ON public.sponsor_companion_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.role IN ('admin', 'super')
    )
  );
