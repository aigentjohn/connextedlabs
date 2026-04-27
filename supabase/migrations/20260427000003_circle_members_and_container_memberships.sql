-- circle_members: tracks who belongs to a circle and their status.
-- Used by CirclesPage, AllMembersPage, AffinityMembersPage, etc.
CREATE TABLE IF NOT EXISTS public.circle_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   uuid        NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('pending', 'active', 'inactive', 'banned')),
  invited_by  uuid        REFERENCES public.users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "circle_members_read_authenticated"
  ON public.circle_members FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "circle_members_insert_own"
  ON public.circle_members FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "circle_members_update_admin"
  ON public.circle_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );

CREATE POLICY "circle_members_delete_own_or_admin"
  ON public.circle_members FOR DELETE
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- container_memberships: stores join applications for circles (and future container types).
-- ApplicationForm writes here; admins review and approve/reject.
CREATE TABLE IF NOT EXISTS public.container_memberships (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  container_type    text        NOT NULL,
  container_id      uuid        NOT NULL,
  status            text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'active', 'rejected', 'withdrawn')),
  applied_at        timestamptz NOT NULL DEFAULT now(),
  application_text  text,
  application_data  jsonb,
  referral_source   text,
  reviewed_by       uuid        REFERENCES public.users(id),
  reviewed_at       timestamptz,
  review_notes      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, container_type, container_id)
);

ALTER TABLE public.container_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "container_memberships_read_own"
  ON public.container_memberships FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "container_memberships_read_admin"
  ON public.container_memberships FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );

CREATE POLICY "container_memberships_insert_own"
  ON public.container_memberships FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "container_memberships_update_own"
  ON public.container_memberships FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "container_memberships_update_admin"
  ON public.container_memberships FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );
