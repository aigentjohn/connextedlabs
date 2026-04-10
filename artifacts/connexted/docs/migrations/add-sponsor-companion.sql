-- Sponsor companion items — same pattern as event_companion_items
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sponsor_companion_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id   uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  item_type    text NOT NULL,
  item_id      text NOT NULL,
  order_index  integer DEFAULT 0,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_companion_items_sponsor
  ON sponsor_companion_items (sponsor_id, order_index);

ALTER TABLE sponsor_companion_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view sponsor companion items (sponsor profiles are public)
CREATE POLICY "Anyone can view sponsor items"
  ON sponsor_companion_items FOR SELECT
  USING (true);

-- Platform admins or sponsor members (Owner/Admin) can insert
CREATE POLICY "Sponsor members can add items"
  ON sponsor_companion_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super')
    )
    OR EXISTS (
      SELECT 1 FROM sponsor_members sm
      WHERE sm.sponsor_id = sponsor_companion_items.sponsor_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin','director')
    )
  );

-- Same for update and delete
CREATE POLICY "Sponsor members can update items"
  ON sponsor_companion_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super')
    )
    OR EXISTS (
      SELECT 1 FROM sponsor_members sm
      WHERE sm.sponsor_id = sponsor_companion_items.sponsor_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin','director')
    )
  );

CREATE POLICY "Sponsor members can delete items"
  ON sponsor_companion_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super')
    )
    OR EXISTS (
      SELECT 1 FROM sponsor_members sm
      WHERE sm.sponsor_id = sponsor_companion_items.sponsor_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner','admin','director')
    )
  );
