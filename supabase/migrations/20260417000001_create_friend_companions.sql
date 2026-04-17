-- =====================================================
-- Friend Companions
--
-- A persistent shared space between two mutual friends.
-- Accessible via the Friends page MessageCircle button.
-- Follows the same companion item pattern as
-- company_companion_items and sponsor_companion_items.
--
-- user_a_id is always the lexicographically smaller UUID
-- (enforced by CHECK constraint) so there is exactly one
-- row per friendship pair regardless of who opens it first.
-- =====================================================


-- ── friend_companions ─────────────────────────────────────────────────────
-- One row per mutual friendship. Auto-created on first visit.

CREATE TABLE public.friend_companions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Enforce consistent ordering so (A,B) and (B,A) are the same companion
  CONSTRAINT friend_companions_ordered CHECK (user_a_id < user_b_id),
  CONSTRAINT friend_companions_unique  UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX friend_companions_user_a_idx ON public.friend_companions(user_a_id);
CREATE INDEX friend_companions_user_b_idx ON public.friend_companions(user_b_id);

ALTER TABLE public.friend_companions ENABLE ROW LEVEL SECURITY;

-- Only the two participants can see or manage their companion
CREATE POLICY "friend_companions_participants"
  ON public.friend_companions FOR ALL
  USING (
    (SELECT auth.uid()) = user_a_id
    OR (SELECT auth.uid()) = user_b_id
  );


-- ── friend_companion_items ────────────────────────────────────────────────
-- Curated content items shared between the two friends.
-- Follows the same structure as company_companion_items.

CREATE TABLE public.friend_companion_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id  uuid        NOT NULL REFERENCES public.friend_companions(id) ON DELETE CASCADE,
  item_type     text        NOT NULL,
  item_id       text        NOT NULL,
  order_index   integer     NOT NULL DEFAULT 0,
  notes         text,
  added_by      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Prevent the same item appearing twice in the same companion
  UNIQUE (companion_id, item_type, item_id)
);

CREATE INDEX friend_companion_items_companion_idx ON public.friend_companion_items(companion_id, order_index);

ALTER TABLE public.friend_companion_items ENABLE ROW LEVEL SECURITY;

-- Participants in the companion can read and write items
CREATE POLICY "friend_companion_items_participants"
  ON public.friend_companion_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_companions fc
      WHERE fc.id = companion_id
        AND (
          (SELECT auth.uid()) = fc.user_a_id
          OR (SELECT auth.uid()) = fc.user_b_id
        )
    )
  );
