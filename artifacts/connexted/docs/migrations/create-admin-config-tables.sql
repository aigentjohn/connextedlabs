-- =====================================================
-- Admin Configuration Tables
-- =====================================================
-- Creates the three tables required for the Platform Admin
-- configuration screens to work from the database rather
-- than falling back to hardcoded defaults.
--
-- Run these four blocks IN ORDER in the Supabase SQL Editor.
-- Each block is safe to re-run (IF NOT EXISTS / ON CONFLICT).
--
-- After running, refresh ContainerConfigurationPage and
-- UserClassManagement in the Platform Admin — they will
-- read from the database instead of showing the hardcoded
-- fallback warning.
-- =====================================================


-- ── BLOCK 1: Add user_class column to users table ───────────────────────────
-- UserClassManagement reads users.user_class. If the column does not exist
-- the page silently puts all users in Class 1 as a fallback.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_class integer NOT NULL DEFAULT 1;


-- ── BLOCK 2: user_classes table ─────────────────────────────────────────────
-- Stores capacity limits per class (how many circles/containers a user can
-- admin or join). Managed via Platform Admin → User Class Management.

CREATE TABLE IF NOT EXISTS public.user_classes (
  class_number          integer PRIMARY KEY,
  display_name          text    NOT NULL,
  max_admin_circles     integer NOT NULL DEFAULT 0,
  max_admin_containers  integer NOT NULL DEFAULT 0,
  max_member_containers integer NOT NULL DEFAULT 0,
  description           text    NOT NULL DEFAULT '',
  is_default            boolean NOT NULL DEFAULT false
);

ALTER TABLE public.user_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_classes_read_authenticated"
  ON public.user_classes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_classes_write_super"
  ON public.user_classes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'super'
  ));

-- Seed default class definitions (matches initializeDefaultClasses() in code)
INSERT INTO public.user_classes
  (class_number, display_name, max_admin_circles, max_admin_containers, max_member_containers, description, is_default)
VALUES
  (1,  'Class 1 - Starter',    0,   1,   5,   'Limited participation',  true),
  (2,  'Class 2 - Basic',      0,   2,   10,  'Light container admin',  false),
  (3,  'Class 3 - Standard',   1,   3,   15,  'One circle + containers', false),
  (4,  'Class 4 - Plus',       1,   5,   20,  'Moderate capacity',      false),
  (5,  'Class 5 - Advanced',   2,   10,  30,  'Multiple circles',       false),
  (6,  'Class 6 - Pro',        3,   15,  40,  'Professional level',     false),
  (7,  'Class 7 - Expert',     5,   25,  50,  'High capacity',          false),
  (8,  'Class 8 - Enterprise', 10,  50,  75,  'Large scale',            false),
  (9,  'Class 9 - Executive',  20,  100, 100, 'Very high capacity',     false),
  (10, 'Class 10 - Unlimited', -1,  -1,  -1,  'No limits',              false)
ON CONFLICT (class_number) DO NOTHING;


-- ── BLOCK 3: container_types table ──────────────────────────────────────────
-- Stores display metadata for each container and content type.
-- The ContainerConfigurationPage reads this to build the matrix rows.

CREATE TABLE IF NOT EXISTS public.container_types (
  type_code    text    PRIMARY KEY,
  display_name text    NOT NULL,
  description  text,
  icon_name    text    NOT NULL DEFAULT '',
  route_path   text    NOT NULL DEFAULT '',
  sort_order   numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.container_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "container_types_read_authenticated"
  ON public.container_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "container_types_write_super"
  ON public.container_types FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'super'
  ));

-- Seed container types (matches NAV_ITEMS_CONFIG in nav-config.ts)
INSERT INTO public.container_types (type_code, display_name, description, icon_name, route_path, sort_order)
VALUES
  ('tables',     'Tables',     'Structured discussion tables',           'Library',       '/tables',     4),
  ('meetings',   'Meetings',   'Scheduled meetings and recurring calls', 'Video',         '/meetings',   6),
  ('libraries',  'Libraries',  'Curated resource libraries',            'BookOpen',      '/libraries',  11),
  ('checklists', 'Checklists', 'Task and process checklists',           'CheckSquare',   '/checklists', 12),
  ('standups',   'Standups',   'Daily or weekly standup cadences',      'MessageSquare', '/standups',   9),
  ('sprints',    'Sprints',    'Time-boxed work sprints',               'Zap',           '/sprints',    13),
  ('elevators',  'Elevators',  'Short-form pitch practice spaces',      'TrendingUp',    '/elevators',  5),
  ('pitches',    'Pitches',    'Collaborative pitch workspaces',        'Presentation',  '/pitches',    7),
  ('builds',     'Builds',     'Project build workspaces',              'Hammer',        '/builds',     8),
  ('meetups',    'Meetups',    'Community meetup groups',               'Users2',        '/meetups',    10),
  ('magazines',  'Magazines',  'Curated collections of blog posts',     'BookCopy',      '/magazines',  10.1),
  ('playlists',  'Playlists',  'Curated collections of episodes',       'ListVideo',     '/playlists',  10.2),
  -- Content types (also gated by class via the same permissions table)
  ('documents',  'Documents',  'External document links',               'FileText',      '/documents',  30),
  ('episodes',   'Episodes',   'Video content',                         'PlayCircle',    '/episodes',   31),
  ('books',      'Books',      'Long-form structured content',          'BookOpen',      '/books',      32),
  ('blogs',      'Blogs',      'External article links',                'Newspaper',     '/blogs',      33),
  ('reviews',    'Reviews',    'Community product and tool reviews',    'Star',          '/reviews',    34),
  ('decks',      'Decks',      'Carousel and flashcard content',        'LayoutGrid',    '/decks',      35),
  ('posts',      'Posts',      'Short-form posts and moments',          'MessageSquare', '/posts',      36)
ON CONFLICT (type_code) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      icon_name    = EXCLUDED.icon_name,
      route_path   = EXCLUDED.route_path,
      sort_order   = EXCLUDED.sort_order;


-- ── BLOCK 4: user_class_permissions table ───────────────────────────────────
-- The permission matrix: which container/content types are visible per class.
-- Managed via Platform Admin → Container Configuration.
--
-- NOTE: does NOT foreign-key container_type to container_types because
-- content types (documents, episodes, etc.) live in the same column but
-- are not rows in container_types.

CREATE TABLE IF NOT EXISTS public.user_class_permissions (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  class_number   integer NOT NULL,
  container_type text    NOT NULL,
  visible        boolean NOT NULL DEFAULT true,
  sort_order     numeric NOT NULL DEFAULT 0,
  UNIQUE (class_number, container_type)
);

ALTER TABLE public.user_class_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_class_permissions_read_authenticated"
  ON public.user_class_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_class_permissions_write_super"
  ON public.user_class_permissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'super'
  ));

-- Seed container permissions:
-- Classes 1-10 get Tables, Meetings, Libraries, Checklists
INSERT INTO public.user_class_permissions (class_number, container_type, visible, sort_order)
SELECT c.class_number, t.type_code, true, t.sort_order
FROM (SELECT generate_series(1, 10) AS class_number) c
CROSS JOIN (VALUES
  ('tables',     4),
  ('meetings',   6),
  ('libraries',  11),
  ('checklists', 12)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible = true, sort_order = EXCLUDED.sort_order;

-- Classes 7-10 get Standups, Sprints
INSERT INTO public.user_class_permissions (class_number, container_type, visible, sort_order)
SELECT c.class_number, t.type_code, true, t.sort_order
FROM (SELECT generate_series(7, 10) AS class_number) c
CROSS JOIN (VALUES
  ('standups', 9),
  ('sprints',  13)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible = true, sort_order = EXCLUDED.sort_order;

-- Class 10 gets Elevators, Pitches, Builds, Meetups, Magazines, Playlists
INSERT INTO public.user_class_permissions (class_number, container_type, visible, sort_order)
SELECT 10, t.type_code, true, t.sort_order
FROM (VALUES
  ('elevators', 5),
  ('pitches',   7),
  ('builds',    8),
  ('meetups',   10),
  ('magazines', 10.1),
  ('playlists', 10.2)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible = true, sort_order = EXCLUDED.sort_order;

-- Seed content type permissions:
-- Classes 3-10 get all content types
INSERT INTO public.user_class_permissions (class_number, container_type, visible, sort_order)
SELECT c.class_number, t.type_code, true, t.sort_order
FROM (SELECT generate_series(3, 10) AS class_number) c
CROSS JOIN (VALUES
  ('documents', 30),
  ('episodes',  31),
  ('books',     32),
  ('blogs',     33),
  ('reviews',   34),
  ('decks',     35),
  ('posts',     36)
) AS t(type_code, sort_order)
ON CONFLICT (class_number, container_type) DO UPDATE
  SET visible = true, sort_order = EXCLUDED.sort_order;
