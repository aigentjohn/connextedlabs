-- Add content types to user_class_permissions
-- ─────────────────────────────────────────────────────────────────────────────
-- user_class_permissions previously only covered container types (nav items).
-- Content types with visibility='member' were incorrectly gated by
-- membership_tier. This migration brings them into the same table so all
-- access decisions are driven by user_class, not tier.
--
-- Class thresholds for content:
--   Class 1-2 (Starter/Basic)  → public content only
--   Class 3+  (Standard+)      → member-visibility content
--   Class 7+  (Expert+)        → premium-visibility content
--
-- These thresholds match the existing container permission tiers in
-- seed-container-types.sql and can be adjusted via the admin
-- ContainerConfigurationPage without another migration.

-- ── Class 3+ can access member-visibility content ────────────────────────────
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

-- ── Class 7+ can access premium-visibility content ───────────────────────────
INSERT INTO user_class_permissions (class_number, container_type, visible, sort_order)
SELECT c.class_number, t.type_code, true, t.sort_order
FROM (SELECT generate_series(7, 10) AS class_number) c
CROSS JOIN (
  VALUES
    ('documents_premium', 40),
    ('episodes_premium',  41),
    ('decks_premium',     42)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible    = true,
      sort_order = EXCLUDED.sort_order;
