-- Fix: Add RLS policies for the events table so authenticated users
-- can create and manage events they host.
--
-- HOW TO APPLY:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor
--   3. Paste and run this entire script
-- ─────────────────────────────────────────────────────────────────

-- Make sure RLS is enabled (safe to run even if already enabled)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read events
CREATE POLICY IF NOT EXISTS "events_select_all"
  ON events FOR SELECT
  USING (true);

-- Allow authenticated users to insert events they host
CREATE POLICY IF NOT EXISTS "events_insert_own"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Allow hosts to update their own events
CREATE POLICY IF NOT EXISTS "events_update_own"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Allow hosts to delete their own events
CREATE POLICY IF NOT EXISTS "events_delete_own"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);
