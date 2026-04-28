CREATE TABLE public.circle_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  token       uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz,
  max_uses    integer,
  use_count   integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.circle_invites ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read invites (needed to validate token in the join flow)
CREATE POLICY "authenticated_read_circle_invites"
  ON public.circle_invites FOR SELECT
  TO authenticated USING (true);

-- Circle admins can create invites for their circles
CREATE POLICY "circle_admins_insert_circle_invites"
  ON public.circle_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    circle_id IN (
      SELECT id FROM circles WHERE admin_ids @> ARRAY[auth.uid()]
    )
  );

-- Circle admins can update (e.g. increment use_count) their circle's invites
CREATE POLICY "circle_admins_update_circle_invites"
  ON public.circle_invites FOR UPDATE
  TO authenticated
  USING (
    circle_id IN (
      SELECT id FROM circles WHERE admin_ids @> ARRAY[auth.uid()]
    )
  );

-- Circle admins can revoke (delete) their circle's invites
CREATE POLICY "circle_admins_delete_circle_invites"
  ON public.circle_invites FOR DELETE
  TO authenticated
  USING (
    circle_id IN (
      SELECT id FROM circles WHERE admin_ids @> ARRAY[auth.uid()]
    )
  );
