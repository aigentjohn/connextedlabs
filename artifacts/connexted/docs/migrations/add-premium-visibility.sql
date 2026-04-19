-- add-premium-visibility.sql
-- Adds 'premium' as a valid visibility value for all content tables.
-- Safe to run multiple times (DROP CONSTRAINT IF EXISTS before re-adding).

-- blogs
ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_visibility_check;
ALTER TABLE blogs ADD CONSTRAINT blogs_visibility_check
  CHECK (visibility IN ('public', 'member', 'premium', 'private'));

-- episodes
ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_visibility_check;
ALTER TABLE episodes ADD CONSTRAINT episodes_visibility_check
  CHECK (visibility IN ('public', 'member', 'premium', 'private'));

-- documents
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
ALTER TABLE documents ADD CONSTRAINT documents_visibility_check
  CHECK (visibility IN ('public', 'member', 'premium', 'private'));

-- posts
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_visibility_check;
ALTER TABLE posts ADD CONSTRAINT posts_visibility_check
  CHECK (visibility IN ('public', 'member', 'premium', 'private'));

-- books
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_visibility_check;
ALTER TABLE books ADD CONSTRAINT books_visibility_check
  CHECK (visibility IN ('public', 'member', 'premium', 'private'));

-- decks
ALTER TABLE decks DROP CONSTRAINT IF EXISTS decks_visibility_check;
ALTER TABLE decks ADD CONSTRAINT decks_visibility_check
  CHECK (visibility IN ('public', 'member', 'premium', 'private'));

-- reviews
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_visibility_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_visibility_check
  CHECK (visibility IN ('public', 'member', 'premium', 'private'));
