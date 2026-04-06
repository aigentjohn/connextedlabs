-- Migration: Seed container_types and user_class_permissions for all activity types
-- Run this in the Supabase SQL Editor if the Activities dropdown is missing container types
-- (e.g. Meetings not appearing under Activities in the top header).
--
-- The container_types table holds display metadata for each container type.
-- The user_class_permissions table controls which classes can see which types.
-- Class tiers: 1=Starter, 3=Member, 7=Premium, 10=Unlimited
-- Admins/Super users always bypass class restrictions in the app code.

-- ── 1. Ensure container_types has all activity types ────────────────────────

INSERT INTO container_types (type_code, display_name, description, icon_name, route_path, sort_order)
VALUES
  ('tables',     'Tables',     'Structured discussion tables',           'Library',       '/tables',     4),
  ('meetings',   'Meetings',   'Scheduled meetings and recurring calls',  'Video',         '/meetings',   6),
  ('libraries',  'Libraries',  'Curated resource libraries',             'BookOpen',      '/libraries',  11),
  ('checklists', 'Checklists', 'Task and process checklists',            'CheckSquare',   '/checklists', 12),
  ('standups',   'Standups',   'Daily or weekly standup cadences',       'MessageSquare', '/standups',   9),
  ('sprints',    'Sprints',    'Time-boxed work sprints',                'Zap',           '/sprints',    13),
  ('elevators',  'Elevators',  'Short-form pitch practice spaces',       'TrendingUp',    '/elevators',  5),
  ('pitches',    'Pitches',    'Collaborative pitch workspaces',         'Presentation',  '/pitches',    7),
  ('builds',     'Builds',     'Project build workspaces',               'Hammer',        '/builds',     8),
  ('meetups',    'Meetups',    'Community meetup groups',                'Users2',        '/meetups',    10),
  ('magazines',  'Magazines',  'Curated collections of blog posts',      'BookCopy',      '/magazines',  10.1),
  ('playlists',  'Playlists',  'Curated collections of episodes',        'ListVideo',     '/playlists',  10.2)
ON CONFLICT (type_code) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      icon_name    = EXCLUDED.icon_name,
      route_path   = EXCLUDED.route_path,
      sort_order   = EXCLUDED.sort_order;

-- ── 2. Seed user_class_permissions ──────────────────────────────────────────
-- Grant visibility to each container type per class tier.
-- Adjust the class_number ranges below to match your community's tier structure.

-- All classes (1–10) get tables, meetings, libraries, checklists
INSERT INTO user_class_permissions (class_number, container_type, visible, sort_order)
SELECT c.class_number, t.type_code, true, t.sort_order
FROM (SELECT generate_series(1, 10) AS class_number) c
CROSS JOIN (
  VALUES
    ('tables',     4),
    ('meetings',   6),
    ('libraries',  11),
    ('checklists', 12)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible    = true,
      sort_order = EXCLUDED.sort_order;

-- Class 7+ get standups and sprints
INSERT INTO user_class_permissions (class_number, container_type, visible, sort_order)
SELECT c.class_number, t.type_code, true, t.sort_order
FROM (SELECT generate_series(7, 10) AS class_number) c
CROSS JOIN (
  VALUES
    ('standups', 9),
    ('sprints',  13)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible    = true,
      sort_order = EXCLUDED.sort_order;

-- Class 10 (Unlimited) get everything else
INSERT INTO user_class_permissions (class_number, container_type, visible, sort_order)
SELECT 10, t.type_code, true, t.sort_order
FROM (
  VALUES
    ('elevators', 5),
    ('pitches',   7),
    ('builds',    8),
    ('meetups',   10),
    ('magazines', 10),
    ('playlists', 10)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible    = true,
      sort_order = EXCLUDED.sort_order;
