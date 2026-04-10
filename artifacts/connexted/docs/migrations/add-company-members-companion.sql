-- =====================================================
-- Company members and companion items
-- Apply via Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. company_members: allows multiple users to manage a company
CREATE TABLE IF NOT EXISTS public.company_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.market_companies(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read members (company profiles are public)
CREATE POLICY "company_members_read"
  ON public.company_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Owner or platform admin can insert members
CREATE POLICY "company_members_insert"
  ON public.company_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.market_companies
      WHERE id = company_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = company_id AND user_id = auth.uid() AND role = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

-- Owner or platform admin can update/delete members
CREATE POLICY "company_members_update"
  ON public.company_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.market_companies
      WHERE id = company_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

CREATE POLICY "company_members_delete"
  ON public.company_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.market_companies
      WHERE id = company_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

-- 2. company_companion_items: curated content associated with a company
CREATE TABLE IF NOT EXISTS public.company_companion_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.market_companies(id) ON DELETE CASCADE,
  item_type    text NOT NULL,
  item_id      text NOT NULL,
  order_index  integer NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_companion_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read (companion pages are public)
CREATE POLICY "company_companion_items_read"
  ON public.company_companion_items FOR SELECT
  USING (true);

-- Owner, company members, or platform admin can write
CREATE POLICY "company_companion_items_write"
  ON public.company_companion_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.market_companies
      WHERE id = company_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = company_id AND user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.market_companies
      WHERE id = company_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = company_id AND user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );
