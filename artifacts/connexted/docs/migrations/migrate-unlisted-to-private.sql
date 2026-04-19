-- migrate-unlisted-to-private.sql
-- Step 1: Migrate all 'unlisted' rows to 'private' across every table that
--         has a visibility column.
-- Step 2: Drop/recreate CHECK constraints without 'unlisted'.
--
-- Content tables  → allowed: public | premium | private
-- Container tables → allowed: public | member  | private

-- ─── Step 1: Data migration ───────────────────────────────────────────────────

-- Content tables
UPDATE blogs      SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE episodes   SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE documents  SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE posts      SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE books      SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE decks      SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE reviews    SET visibility = 'private' WHERE visibility = 'unlisted';

-- Container tables
UPDATE tables     SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE elevators  SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE meetings   SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE pitches    SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE builds     SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE standups   SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE sprints    SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE meetups    SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE playlists  SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE libraries  SET visibility = 'private' WHERE visibility = 'unlisted';
UPDATE checklists SET visibility = 'private' WHERE visibility = 'unlisted';

-- ─── Step 2: Drop and recreate constraints without 'unlisted' ─────────────────

-- Content tables (public | premium | private)
ALTER TABLE blogs      DROP CONSTRAINT IF EXISTS blogs_visibility_check;
ALTER TABLE blogs      ADD CONSTRAINT blogs_visibility_check
  CHECK (visibility IN ('public', 'premium', 'private'));

ALTER TABLE episodes   DROP CONSTRAINT IF EXISTS episodes_visibility_check;
ALTER TABLE episodes   ADD CONSTRAINT episodes_visibility_check
  CHECK (visibility IN ('public', 'premium', 'private'));

ALTER TABLE documents  DROP CONSTRAINT IF EXISTS documents_visibility_check;
ALTER TABLE documents  ADD CONSTRAINT documents_visibility_check
  CHECK (visibility IN ('public', 'premium', 'private'));

ALTER TABLE posts       DROP CONSTRAINT IF EXISTS posts_visibility_check;
ALTER TABLE posts       ADD CONSTRAINT posts_visibility_check
  CHECK (visibility IN ('public', 'premium', 'private'));

ALTER TABLE books       DROP CONSTRAINT IF EXISTS books_visibility_check;
ALTER TABLE books       ADD CONSTRAINT books_visibility_check
  CHECK (visibility IN ('public', 'premium', 'private'));

ALTER TABLE decks       DROP CONSTRAINT IF EXISTS decks_visibility_check;
ALTER TABLE decks       ADD CONSTRAINT decks_visibility_check
  CHECK (visibility IN ('public', 'premium', 'private'));

ALTER TABLE reviews     DROP CONSTRAINT IF EXISTS reviews_visibility_check;
ALTER TABLE reviews     ADD CONSTRAINT reviews_visibility_check
  CHECK (visibility IN ('public', 'premium', 'private'));

-- Container tables (public | member | private)
ALTER TABLE tables      DROP CONSTRAINT IF EXISTS tables_visibility_check;
ALTER TABLE tables      ADD CONSTRAINT tables_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE elevators   DROP CONSTRAINT IF EXISTS elevators_visibility_check;
ALTER TABLE elevators   ADD CONSTRAINT elevators_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE meetings    DROP CONSTRAINT IF EXISTS meetings_visibility_check;
ALTER TABLE meetings    ADD CONSTRAINT meetings_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE pitches     DROP CONSTRAINT IF EXISTS pitches_visibility_check;
ALTER TABLE pitches     ADD CONSTRAINT pitches_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE builds      DROP CONSTRAINT IF EXISTS builds_visibility_check;
ALTER TABLE builds      ADD CONSTRAINT builds_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE standups    DROP CONSTRAINT IF EXISTS standups_visibility_check;
ALTER TABLE standups    ADD CONSTRAINT standups_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE sprints     DROP CONSTRAINT IF EXISTS sprints_visibility_check;
ALTER TABLE sprints     ADD CONSTRAINT sprints_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE meetups     DROP CONSTRAINT IF EXISTS meetups_visibility_check;
ALTER TABLE meetups     ADD CONSTRAINT meetups_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE playlists   DROP CONSTRAINT IF EXISTS playlists_visibility_check;
ALTER TABLE playlists   ADD CONSTRAINT playlists_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE libraries   DROP CONSTRAINT IF EXISTS libraries_visibility_check;
ALTER TABLE libraries   ADD CONSTRAINT libraries_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));

ALTER TABLE checklists  DROP CONSTRAINT IF EXISTS checklists_visibility_check;
ALTER TABLE checklists  ADD CONSTRAINT checklists_visibility_check
  CHECK (visibility IN ('public', 'member', 'private'));
