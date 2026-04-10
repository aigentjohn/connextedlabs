-- Event check-in and contact sharing consent
-- Run in Supabase SQL Editor

-- Add check-in fields to existing event_rsvps table
ALTER TABLE event_rsvps
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS shared_fields text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES users(id);

-- Allow user_id to be null (for host-added guests who aren't platform members)
ALTER TABLE event_rsvps ALTER COLUMN user_id DROP NOT NULL;

-- Index for fast look-up of checked-in attendees
CREATE INDEX IF NOT EXISTS idx_event_rsvps_checkin
  ON event_rsvps (event_id, checked_in_at)
  WHERE checked_in_at IS NOT NULL;
