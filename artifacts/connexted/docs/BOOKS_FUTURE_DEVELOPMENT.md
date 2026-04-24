# Books — Future Development Plan

**Date:** April 2026
**Status:** Planned — not yet built
**Scope:** Enhancements to the Book content type to align it more closely with
Episode and Blog engagement patterns, and to fill gaps in the current design.

---

## Current State Summary

### What a Book Is Today

A **Book** is the only native multi-page content type in the platform. It has:

- A parent record in `books`: `id, title, description, category, cover_image, tags, visibility, is_template, admin_ids[], member_ids[], created_by, views, created_at, updated_at`
- An ordered sub-table `book_chapters`: `id, book_id, title, content (markdown), order_index, created_at`
- Engagement: Likes and Favorites only (no ratings, no reviews, no shares)
- Journey integration: First-class journey item — can be added to courses and programs
- Template support: `is_template` flag allows copying a book as a starting point

### What an Episode Is

An **Episode** is a single video item:
- One row in `episodes` — no sub-table
- Fields: `video_url, video_platform (youtube|vimeo|loom), video_id, duration_minutes, thumbnail_url`
- Engagement: Likes, Ratings (with review text), Shares, Favorites
- Can be grouped into **Playlists** (a separate type that holds multiple episodes)
- Soft-deleted via `deleted_at`
- Journey integration: First-class journey item

### What a Blog Is

A **Blog** is a curated external link:
- Points to a URL on Medium, Substack, Dev.to, Hashnode, etc. — content lives off-platform
- Fields: `external_url (unique), domain, tagline, blog_summary, published_date, reading_time_minutes`
- Engagement: Likes, Ratings (with review text), Favorites
- Can be curated into **Magazines**
- Soft-deleted via `deleted_at`
- **Not** a journey item today — only appears in discovery and magazines

---

## Comparison Table

| Feature | Book | Episode | Blog |
|---|---|---|---|
| Content source | Native (Markdown) | Native (video URL) | External URL only |
| Multi-page / chapters | ✅ Yes | ✗ Single item | ✗ Single item |
| Video support | ✗ | ✅ Yes | ✗ |
| External URL option | ✗ | ✗ | ✅ Required |
| Tagline / summary | ✗ | ✗ | ✅ |
| Reading / watch time | ✗ | ✅ duration_minutes | ✅ reading_time_minutes |
| Thumbnail | Cover image only | ✅ per item | ✅ featured_image_url |
| Likes | ✅ | ✅ | ✅ |
| Ratings + reviews | ✗ | ✅ | ✅ |
| Shares tracking | ✗ | ✅ | ✗ |
| Favorites | ✅ | ✅ | ✅ |
| Playlist / magazine | ✗ | Playlist | Magazine |
| Journey item | ✅ | ✅ | ✗ |
| Template support | ✅ | ✗ | ✗ |
| Soft delete | ✗ | ✅ deleted_at | ✅ deleted_at |
| Premium visibility | ✗ | ✅ | ✅ |

---

## 1. Parity with Episode — Engagement Features

Books currently only support Likes and Favorites. Episodes and Blogs both have
Ratings (1–5 stars with a review comment), which makes them feel more like
social content and gives creators useful feedback.

**Proposed additions:**
- Add `content_ratings` support for `content_type = 'book'`
  - (No schema change needed — the `content_ratings` table already uses a generic `content_type` field)
  - Add Rating widget to `BookDetailPage` (same component already used by episodes/blogs)
- Add `content_shares` tracking for books (same pattern)
- Add average rating display to book cards on `BooksPage`

**Why:** A book someone spent hours writing deserves the same social feedback loop
as a 5-minute video clip. Rating parity also makes books sortable by quality in
discovery — currently they can only be sorted by date or likes.

---

## 2. Parity with Episode — Video Chapters

Today a book chapter is text (Markdown) only. An author may want to attach a
video to a chapter — a recorded lecture, a walkthrough, or a demonstration —
while keeping the written content alongside it.

**Proposed additions to `book_chapters`:**
```
video_url          text        -- optional video for this chapter
video_platform     text        -- youtube | vimeo | loom | wistia
video_id           text        -- extracted from video_url
duration_minutes   integer     -- optional chapter watch time
```

**UI changes:**
- Chapter form: optional "Add video" toggle — shows URL field when enabled
- Chapter view: if `video_url` is set, render the video player above the markdown content
- Chapter list sidebar: show a video icon badge on chapters that have video

**This makes a Book effectively a "video course"** — structured chapters with
optional reading and optional video per chapter. Playlists (episodes-only) cannot
do this because they have no chapter structure or text content.

---

## 3. Parity with Blog — External Book Option

Blogs require an external URL (the content lives elsewhere). Books require native
authorship. There is no way to reference a published book (Amazon, Leanpub, O'Reilly,
a PDF link) on the platform today.

**Proposed: optional `external_url` on books**
- Add `external_url text` column to `books` (nullable — native books leave it null)
- If set, the book detail page shows a "Read on [domain]" button / embed attempt instead
  of the chapters panel
- `book_chapters` would be unused for external books (or could be used for notes/summary)
- Prevents duplicate entries via a UNIQUE constraint on `external_url` (same as blogs)

**Additional fields to add alongside:**
- `tagline` (text, short 1-line pitch) — currently books only have `description`
- `reading_time_minutes` (integer) — estimated total reading time, displayed on the card
- `author_name` (text, nullable) — for books authored by someone other than the platform user
  (e.g. "curating" a third-party book)

---

## 4. Parity with Blog/Episode — Soft Delete

Books currently have no `deleted_at` column — deletion is immediate and permanent,
cascading to all chapters.

**Proposed:**
- Add `deleted_at timestamptz` to `books`
- Filter `WHERE deleted_at IS NULL` in all queries
- Keep the chapter cascade — if a book is soft-deleted, its chapters are effectively
  hidden too (they're inaccessible without the parent)
- Allows recovery window and audit trail

---

## 5. Parity with Blog — Magazine Integration

Blogs can be curated into Magazines. Books cannot. A magazine about a topic
area could benefit from featuring a relevant book alongside blog articles.

**Proposed:**
- Allow `content_type = 'book'` in the `magazine_items` table
  (currently limited to blogs and episodes)
- Magazine editor: add Books to the "Add content" type picker
- Book card in magazine: show cover image, title, chapter count, rating

---

## 6. Premium Visibility

Books only support `public | member | private | unlisted`. Episodes and Blogs
both support a `premium` tier (visible only to premium members).

**Proposed:**
- Add `'premium'` to the visibility enum on `books`
- Consistent with episodes and blogs

---

## 7. Journey Integration for Blogs

Blogs are currently **not** journey items — they cannot be added to a course or
program journey step. This is inconsistent: a curated external article is exactly
the kind of reading assignment a course facilitator might assign.

**Proposed:**
- Add `blog` as a valid journey item type in `journey-item-types.ts`
  - `tableName: 'blogs'`, `label: 'Blog'`, icon: `Rss` or `ExternalLink`
- Add blogs to the `AddJourneyContentDialog` content picker
- Journey inline viewer: show title, tagline, reading time, and an "Open article" button

---

## 8. Collection Hierarchy — Shelf, Playlist, Magazine, Library

The platform has a consistent single-item → collection pattern:

| Single item | Collection | Status |
|---|---|---|
| Book | **Shelf** | **Not built yet** |
| Episode | **Playlist** | Built (`playlists` table) |
| Blog | **Magazine** | Built (`magazines` + `magazine_items` tables) |
| Document | **Library** | Built (`libraries` table, currently mislabeled as "Shelf" in the UI) |
| Photo / Image | **Album** | **Not built yet** — see `PHOTOS_ALBUMS_PLAN.md` |

**Current naming problem in `journey-item-types.ts`:**
The `shelf` type key exists but is labeled `Library`, mapped to the `libraries`
table, and described as "Curated collections of documents." There is no Shelf
(book collection) anywhere in the codebase. The `libraries` table is a document
collection, not a book collection.

---

### Shelf — Proposed Design

A **Shelf** is a curated, ordered collection of Books — analogous to a Playlist
for episodes or a Magazine for blogs.

**Why a junction table (like Magazine), not an array (like Playlist):**
- Books are long-form; reading status per book in the shelf is valuable
  (Unread / Reading / Finished)
- Manual ordering by curator (drag-to-reorder) requires a `position` column
- A shelf may grow large — arrays on the parent row become unwieldy
- Consistent with the Magazine pattern, which is the more mature design

#### Proposed schema

```sql
CREATE TABLE public.shelves (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        UNIQUE NOT NULL,
  tagline         text,                          -- short 1-line description
  description     text,
  cover_image_url text,
  curator_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  visibility      text        NOT NULL DEFAULT 'public'
                              CHECK (visibility IN ('public','member','premium','private','unlisted')),
  topic_ids       uuid[],
  tags            text[],
  allow_comments  boolean     NOT NULL DEFAULT true,
  allow_reactions boolean     NOT NULL DEFAULT true,
  allow_sharing   boolean     NOT NULL DEFAULT true,
  is_featured     boolean     DEFAULT false,
  -- journey context (same pattern as playlists)
  program_id         uuid     REFERENCES public.programs(id) ON DELETE SET NULL,
  program_journey_id uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.shelf_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id     uuid        NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
  book_id      uuid        NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  position     integer     NOT NULL DEFAULT 0,   -- curator-controlled order
  notes        text,                              -- curator's note about this book
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shelf_id, book_id)
);

-- Per-member reading status within a shelf (optional, phase 2)
CREATE TABLE public.shelf_reading_progress (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id     uuid        NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
  book_id      uuid        NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'unread'
                           CHECK (status IN ('unread','reading','finished')),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shelf_id, book_id, user_id)
);
```

#### UI — Create / Edit

Fields (modelled on `CreateMagazineForm`):
- Name (required)
- Tagline (short pitch, optional)
- Description (optional)
- Cover image URL (optional)
- Visibility (public / member / premium / private)
- Topics (multi-select, up to 5)
- Tags
- Allow comments / reactions / sharing toggles

#### UI — Detail page tabs

```
Shelf Detail
├── About tab
│   ├── Engagement bar (Like, Favorite, Rating, Share)
│   ├── Tagline + description
│   ├── Topics, tags
│   └── Stats: book count, follower count, curator
│
├── Books tab
│   ├── Ordered list of BookCard rows
│   ├── Each row: cover thumbnail, title, chapter count, reading time, reading status badge
│   ├── (Curator only) Drag-to-reorder handle + remove button
│   ├── (Curator only) Add Books button → search panel (same pattern as Magazine)
│   └── Reading status toggle per book (Unread / Reading / Finished) — phase 2
│
└── Manage tab (curator only)
    ├── Edit metadata
    ├── Subscribers list
    └── Danger zone (archive / delete)
```

#### Journey integration

Same pattern as Playlist:
- `program_id` and `program_journey_id` columns on `shelves`
- Register `shelf` in `journey-item-types.ts`:
  ```typescript
  shelf: {
    icon: BookMarked,        // or Library icon
    label: 'Shelf',
    labelPlural: 'Shelves',
    category: 'content',
    tableName: 'shelves',
    description: 'Curated collections of books'
  }
  ```
- Journey inline viewer: shows shelf cover, book count, progress bar (X of Y finished)

#### What changes to existing code

1. `journey-item-types.ts` — update `shelf` entry: correct label, description, and `tableName` from `'libraries'` to `'shelves'`
2. `journey-item-types.ts` — add a `library` entry for the existing `libraries` table (document collections)
3. New pages to build (modelled on Magazine):
   - `ShelvesPage` (browse/search)
   - `CreateShelfPage`
   - `ShelfDetailPage` (tabs: About, Books, Manage)
   - `AddBookToShelfDialog` (search + add)
4. New SQL migration: `shelves`, `shelf_items`, `shelf_reading_progress` tables + RLS

---

## Relationship Between Types (Clarified)

| Use case | Best type today | Gap |
|---|---|---|
| Written tutorial with chapters | Book | No video per chapter |
| Video lesson | Episode | No chapters / text |
| Mixed video + text course | Book with video chapters *(not built yet)* | Requires item 2 above |
| Curate an external article | Blog | Cannot add to a journey |
| Curate an external book / ebook | *(no type fits)* | Requires item 3 above |
| Multi-part video series | Playlist of Episodes | No text or chapter structure |
| Curated article collection | Magazine of Blogs | Cannot include books or episodes |
| Curated book reading list | **Shelf** *(not built yet)* | Requires item 8 above |
| Curated document collection | Library (`libraries` table) | Exists, mislabeled as "Shelf" in UI |

---

## Implementation Priority (Suggested)

| Priority | Feature | Effort | Reason |
|---|---|---|---|
| 1 | Ratings + reviews on Books | Low | No schema change — reuse existing `content_ratings` table and widget |
| 2 | Soft delete on Books | Low | Simple schema addition, prevents data loss |
| 3 | Blogs as journey items | Low | Type config + dialog change only |
| 4 | `tagline` + `reading_time_minutes` on Books | Low | Two nullable columns, minor UI update |
| 5 | Video chapters (optional video per chapter) | Medium | Schema + chapter form + chapter viewer changes |
| 6 | External URL option for Books | Medium | Schema + conditional detail page rendering |
| 7 | Premium visibility on Books | Low | Enum update + RLS policy update |
| 8 | Books in Magazines | Medium | `magazine_items` policy + magazine editor update |
| 9 | **Shelf** (book collection) | High | New tables (`shelves`, `shelf_items`), new pages modelled on Magazine; fix `shelf` type label in journey config |
| 10 | Reading progress per book in Shelf | Medium | `shelf_reading_progress` table; Unread/Reading/Finished badge per member |

---

## Open Questions

1. **Video chapters vs separate Episode** — If a chapter has a video, is it still
   a Book chapter or should the author just create an Episode and link it? A hybrid
   approach (video URL on a chapter) is more seamless but adds complexity. Start by
   linking to an episode from a chapter (reference by ID), rather than duplicating
   the video embed logic.

2. **External books vs curating external content** — If a user adds a book via
   `external_url`, are they "authoring" it or "curating" it? The distinction matters
   for attribution and how it shows up on their profile. A separate `curated_by` field
   alongside `created_by` would clarify this.

3. **Ratings on books — chapter-level or book-level?** — Rating a book as a whole
   is straightforward. Rating individual chapters would require a chapter-level ratings
   table. Start with book-level ratings (consistent with episodes and blogs).

4. **Blogs in journeys — completion tracking** — A blog is an external link. How do
   you mark it "done"? Options: (a) manual "Mark as read" button, (b) auto-complete
   on click, (c) no completion tracking. Manual button is safest.

5. **Library label migration** — The existing `shelf` journey type is currently
   labeled "Library" in the UI. When Shelf is built and the label is corrected,
   any existing `journey_items` rows with `item_type = 'shelf'` will still point
   to the old `libraries` table. A data migration will be needed to move those
   items to the new `shelves` table, or the `libraries` table will need to be
   repurposed as the shelves backing store. Decide before building Shelf.
