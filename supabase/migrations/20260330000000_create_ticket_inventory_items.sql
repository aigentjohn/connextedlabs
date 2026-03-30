-- Ticket Inventory Items
-- Stores individual sellable ticket units generated from KV-backed templates.
-- Templates remain in the edge function KV store; inventory lives here in Postgres.

CREATE TABLE IF NOT EXISTS ticket_inventory_items (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          TEXT        NOT NULL,
  template_name        TEXT        NOT NULL,
  serial_number        TEXT        NOT NULL UNIQUE,
  batch_id             TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'available'
                         CHECK (status IN ('available', 'assigned', 'voided')),
  assigned_to_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_email    TEXT,
  assigned_to_name     TEXT,
  assigned_at          TIMESTAMPTZ,
  assigned_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  price_paid_cents     INTEGER,
  payment_reference    TEXT,
  access_ticket_id     UUID,
  application_id       TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_inventory_template ON ticket_inventory_items (template_id);
CREATE INDEX IF NOT EXISTS idx_ticket_inventory_batch    ON ticket_inventory_items (batch_id);
CREATE INDEX IF NOT EXISTS idx_ticket_inventory_user     ON ticket_inventory_items (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_inventory_status   ON ticket_inventory_items (status);

ALTER TABLE ticket_inventory_items ENABLE ROW LEVEL SECURITY;

-- Admins and super-admins have full access
CREATE POLICY "admin_full_access_ticket_inventory"
  ON ticket_inventory_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super')
    )
  );

-- Assigned users can read their own tickets
CREATE POLICY "user_read_own_ticket_inventory"
  ON ticket_inventory_items FOR SELECT
  USING (assigned_to_user_id = auth.uid());
