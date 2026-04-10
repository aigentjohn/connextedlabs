-- Create event_rsvps table with check-in and contact sharing support
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS event_rsvps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES users(id) ON DELETE SET NULL,  -- null for host-added guests
  status              text NOT NULL DEFAULT 'going'
                        CHECK (status IN ('going','maybe','not_going','no_response','waitlist','attending')),
  response_date       timestamptz NOT NULL DEFAULT now(),
  plus_one_count      integer DEFAULT 0,
  dietary_restrictions text,
  comments            text,
  -- Check-in fields
  checked_in_at       timestamptz,
  shared_fields       text[] DEFAULT '{}',
  -- Guest (non-member) fields
  guest_name          text,
  guest_email         text,
  guest_phone         text,
  added_by            uuid REFERENCES users(id) ON DELETE SET NULL,
  -- Timestamps
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Prevent duplicate RSVPs for the same member on the same event
CREATE UNIQUE INDEX IF NOT EXISTS event_rsvps_event_user_unique
  ON event_rsvps (event_id, user_id)
  WHERE user_id IS NOT NULL;

-- Fast lookup of checked-in attendees
CREATE INDEX IF NOT EXISTS idx_event_rsvps_checkin
  ON event_rsvps (event_id, checked_in_at)
  WHERE checked_in_at IS NOT NULL;

-- RLS
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Members can read RSVPs for events in their community
CREATE POLICY "Members can view event RSVPs"
  ON event_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN users u ON u.community_id = e.community_id
      WHERE e.id = event_rsvps.event_id
        AND u.id = auth.uid()
    )
  );

-- Members can insert their own RSVP
CREATE POLICY "Members can RSVP to events"
  ON event_rsvps FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Members can update their own RSVP; hosts/admins can update any RSVP on their event
CREATE POLICY "Members can update their own RSVP"
  ON event_rsvps FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_rsvps.event_id
        AND e.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin','super')
    )
  );

-- Members can delete their own RSVP; hosts/admins can remove any
CREATE POLICY "Members can delete their own RSVP"
  ON event_rsvps FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_rsvps.event_id
        AND e.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin','super')
    )
  );
