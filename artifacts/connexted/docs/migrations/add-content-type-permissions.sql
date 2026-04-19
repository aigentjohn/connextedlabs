-- Add content types to user_class_permissions
-- ─────────────────────────────────────────────────────────────────────────────
-- user_class_permissions covers both container types (nav items) and content
-- types. The platform admin controls which content types each user class can
-- access via the ContainerConfigurationPage matrix.
--
-- Class thresholds for content:
--   Class 1-2 (Starter/Basic)  → public content only (no content type rows)
--   Class 3+  (Standard+)      → can access all content types below
--
-- These thresholds can be adjusted via the admin ContainerConfigurationPage
-- without another migration.
--
-- NOTE: _premium suffix type codes (documents_premium, episodes_premium, etc.)
-- must NOT be inserted here. Premium visibility is a browse filter on the
-- content record itself — access is determined by journey enrollment, not
-- user class. See VISIBILITY_AND_ACCESS_MODEL.md for details.

-- ── Class 3+ can access all content types ────────────────────────────────────
INSERT INTO user_class_permissions (class_number, container_type, visible, sort_order)
SELECT c.class_number, t.type_code, true, t.sort_order
FROM (SELECT generate_series(3, 10) AS class_number) c
CROSS JOIN (
  VALUES
    ('documents', 30),
    ('episodes',  31),
    ('books',     32),
    ('blogs',     33),
    ('reviews',   34),
    ('decks',     35),
    ('posts',     36)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible    = true,
      sort_order = EXCLUDED.sort_order;
