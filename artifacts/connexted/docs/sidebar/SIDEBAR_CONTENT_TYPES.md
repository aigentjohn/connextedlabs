> ⚠️ **SUPERSEDED** — Replaced by [SIDEBAR_COMMON_CONTENT.md](SIDEBAR_COMMON_CONTENT.md) to match the actual sidebar section name. This file is kept for reference only.

# Sidebar Section: Content Types

These are individually authored pieces of content — they have a single author and support
`public` / `premium` / `private` visibility. They do not have their own membership structure.
Premium content is hidden from all browse pages and is only accessible through program or
course journey enrollment.

---

## Blogs (`/blogs`)

**What it does:**
Browse page listing all non-deleted blog entries. Blogs are links to external articles (Substack,
dev.to, Hashnode, etc.) curated by community members. Renders a responsive 3-column card grid
via `BlogCard`.

**Data loaded:**
- `blogs` table: `id, title, tagline, blog_summary, external_url, domain, published_date,
  reading_time_minutes, featured_image_url, created_at, visibility, user_id, tags`
- Author name + avatar via `users` join (`blogs_user_id_fkey`)
- Topics via `topic_links` (entity_type = 'blog')
- Engagement from `content_likes` (content_type = 'blog') and `content_ratings` (content_type = 'blog')
  — aggregated client-side into `likes_count` and `avg_rating` per blog

**Filtering & sorting:**
- Full-text search on title, tagline, summary, and tags
- Visibility dropdown: all / public / member / premium / private
- Advanced filter panel: tag multi-select (up to 20 shown) and topic multi-select (up to 20 shown);
  both support URL params (`?tag=` and `?topic=`) for deep-linking
- "My Blogs" toggle (filters to `user_id === profile.id`)
- Sort segmented control: Newest / Oldest / Most Liked
- Active filter chips shown inline; "Clear All Filters" button

**User actions:**
- Click card to navigate to detail page (`/blogs/:id`)
- "Share Article" button navigates to `/blogs/create`

**Create flow:**
- Route `/blogs/create` → `ShareBlogForm.tsx`
- Form fields: external URL (required), title (required), tagline (10–150 chars, required),
  blog summary (100–500 words, required), published date, reading time, featured image URL,
  visibility selector, topics (at least 1 required), tags
- Supports saving as draft or publishing immediately
- Duplicate URL is detected via a `23505` unique constraint error

**Detail page (`BlogDetailPage.tsx`) — tabs:**
- **About:** engagement bar (like, favorite, share invite, 5-star rating widget, private comment to
  author), featured image, summary card, topics grouped by type (WHO / WHY / Theme)
- **Read:** inline iframe reader (expandable/collapsible); known-blocked domains (Medium, Towards
  Data Science, etc.) are detected and bypass is offered; iframe errors fall back gracefully
- **In Magazines:** shows magazines that include this blog (via `magazine_items`)
- **Manage (owner only):** full edit form — basic info, topics & tags, visibility & published toggle,
  social feature toggles (comments, reactions, sharing), delete with confirmation

**Visibility controls:**
- `ShareBlogForm` uses a raw `<Select>` with values `public | member | unlisted | private` — does
  **not** use `PrivacySelector`
- `BlogDetailPage` Manage tab uses a raw `<Select>` with values `public | member | private` — also
  does **not** use `PrivacySelector mode="content"`

**Known issues / gaps:**
- Neither the create form (`ShareBlogForm`) nor the Manage tab in `BlogDetailPage` uses
  `PrivacySelector mode="content"`, so the `premium` option is not available when creating or
  editing a blog. The `PrivacySelector` component has a fully defined `CONTENT_OPTIONS` set
  (`public | premium | private`) that should replace the raw selects in both places.
- `BlogsPage` fetches all blogs unfiltered from the database — there is no server-side visibility
  enforcement. Premium blogs currently appear in the browse list because client-side filtering only
  filters by the selected visibility dropdown value.
- Tags in the advanced filter panel are capped at 20 (display only); topics are also capped at 20.

---

## Episodes (`/episodes`)

**What it does:**
Browse page for individual video episodes (YouTube, Vimeo, etc.). Renders a 3-column card grid
via `EpisodeCard`.

**Data loaded:**
- `episodes` table: all columns, filtered `.is('deleted_at', null)`
- Author lookup via separate `users` query (author_id field)
- Topics via `topic_links` (entity_type = 'episode')
- Engagement from `content_likes`, `content_ratings` (with review text counted separately),
  and `content_shares` (all content_type = 'episode')
- User's own favorited episodes from `content_favorites` (content_type = 'episode')

**Filtering & sorting:**
- Full-text search on title, description, tags
- Visibility dropdown: all / public / member / members-only / private (note: 'members-only' is a
  stale option — the DB value is 'member')
- Advanced filter panel: tag multi-select (up to 12), topic multi-select (up to 12)
- "My Episodes" toggle (filters to `author_id === profile.id`)
- Sort: Newest / Oldest / Most Liked
- Tag filter can be pre-loaded from `?tag=` URL param

**User actions:**
- Favorite toggle (per-episode) — stored in `content_favorites`; optimistic update with revert on
  error
- Delete (owner only) — soft-delete via `deleted_at` field, done directly on the list page
- Topic badge click on card triggers the topic filter in-place

**Create flow:**
- "Create Episode" button navigates to `/episodes/new` → `CreateEpisodePage.tsx`
- Form fields: title (required), description, video platform (YouTube / Vimeo / Loom / Other),
  video URL (required), video ID (auto-extracted or manual), thumbnail URL, duration minutes,
  visibility, published toggle, tags, topics

**Detail page (`EpisodeDetailPage.tsx`) — tabs:**
- **About:** engagement bar (like, favorite, share invite, rating widget, private comment),
  metadata badges (duration, platform, category, views), topics and tags
- **Watch:** embedded `VideoPlayer` component using `video_platform` and `video_id`
- **Playlists:** shows which playlists include this episode
- **Manage (owner only):** full edit form with same fields as create; delete with confirmation

**Visibility controls:**
- `CreateEpisodePage` uses a raw `<Select>` with `public | member | premium | private` — does
  **not** use `PrivacySelector`
- `EpisodeDetailPage` Manage tab similarly uses a raw `<Select>`

**Known issues / gaps:**
- The visibility dropdown in `EpisodesPage` includes `members-only` as a distinct filter option
  alongside `member`, but the database stores only `member`. This means filtering by
  'members-only' will return zero results.
- Neither create nor manage forms use `PrivacySelector mode="content"`.
- No topic filtering support for the `?topic=` URL param (only `?tag=` is handled).

---

## Documents (`/documents`)

**What it does:**
Browse page for externally-hosted documents (Google Docs, Notion, Figma, Dropbox, etc.). Renders
a 2-column card list with inline iframe preview support. Requires the user to be logged in
(`if (!profile) return null`).

**Data loaded:**
- `documents` table: all base fields plus `view_count`, `unique_viewers`
- Author via `users` join (`documents_author_id_fkey`)
- Library associations via `library_documents` → `libraries`
- User favorites from `content_favorites` (content_type = 'document')
- Likes from `content_likes` (content_type = 'document') — counts per document plus user's own

**Access control:**
The page performs a two-step access check before displaying documents:
1. Fetches user's accessible circles (`circles.member_ids` contains profile id) and tables
   (`tables.member_ids` contains profile id)
2. Uses `canAccessContent(accessLevel)`: public = always; member = checks
   `userPermissions.permitted_types.includes('documents')`; premium = always false (TODO: replace
   with journey enrollment check)

Documents with insufficient access render at 60% opacity with a lock icon.

**Filtering & sorting:**
- Search on title and description
- Single-tag filter via a `<Select>` dropdown (first 20 tags)
- Sort segmented control: Newest / Oldest / Most Liked

**Tabs:**
- **All Documents:** full sorted/filtered list
- **Authored:** only documents where `author_id === profile.id`
- **Favorites:** only documents where `is_favorited === true`
- **Recent:** top 10 by `created_at` (sliced after sort)

**User actions:**
- Like toggle — stored in `content_likes`
- Favorite toggle — stored in `content_favorites`
- Inline iframe preview (expandable to 70vh with full-screen link)
- "View details" links to `/documents/:id`
- "View document" links to `/documents/:id?view=inline`
- "Open in new tab" opens `doc.url` directly

**Create flow:**
- "Add Document" button links to `/documents/new` → `AddDocumentForm.tsx`
- Form fields: title, description, URL (required), access level dropdown (`public | member |
  unlisted | private`), optional circle and table associations, tags
- Also handles edit mode at `/documents/:id/edit`

**Visibility controls:**
- `AddDocumentForm` uses `ACCESS_LEVELS` constant with `public | member | unlisted | private` via
  a raw `<Select>` — does **not** use `PrivacySelector`
- The field is named `access_level` (not `visibility`) in this table, with an additional `unlisted`
  option not present on other content types

**Known issues / gaps:**
- `access_level` uses `public | member | unlisted | private` — inconsistent with the platform
  standard `public | premium | private`. The `premium` value is not supported; `unlisted` is
  unique to documents.
- `PrivacySelector mode="content"` is not used anywhere in the Documents create/edit flows.
- The page does not support topic filtering (no `topic_links` integration).
- No advanced filter panel (tags are filtered via a single-select dropdown, not a multi-select).
- "Recent" tab is a static slice of the top 10 results — it is not a separate query and does not
  reflect actual recent views.

---

## Books (`/books`)

**What it does:**
Browse page for long-form structured content composed of ordered chapters (Markdown). Renders as a
vertical list of cards with an inline chapter reader. Data is fetched via a Supabase Edge Function
(`make-server-d7930c7f/books`) rather than direct Supabase queries. If the `books` table is not
set up, the page redirects to `/books/setup`.

**Data loaded:**
- Book list via Edge Function GET `/books` — returns `{ books: [...] }`
- Author info via direct `users` query (supplemented client-side)
- Engagement from `content_likes` (content_type = 'book') and `content_favorites`
  (content_type = 'book')
- Chapter list loaded on demand via GET `/books/:id/chapters` when user expands a book

**Filtering & sorting:**
- Search on title and description
- "My Books" toggle (filters to `created_by === profile.id`)
- Sort: Newest / Oldest / Most Liked (applied client-side to the full book list)

**User actions:**
- Like toggle — stored in `content_likes` with optimistic update
- Favorite toggle — stored in `content_favorites` with optimistic update
- Inline chapter reader (expandable panel with chapter list sidebar + Markdown renderer)
- Edit (owner or super admin): opens Edit Book dialog in-page
- Delete (owner or super admin): DELETE to Edge Function with browser confirm
- "View details" links to `/books/:id`

**Create flow:**
- "Create Book" button opens an in-page dialog (not a separate route)
- Form fields: title (required), description, visibility (`PrivacySelector contentType="book"`),
  topics (up to 3, via `TopicSelector`), tags (via `TagSelector`)
- Topics are linked via a separate Edge Function POST `/topics/link` after book creation
- Chapters are added from the book detail page after creation

**Edit flow:**
- In-page Edit Book dialog (separate from create)
- Same fields as create except topics are not editable (topic editing is noted as a future TODO
  in the code)

**Visibility controls:**
- Both create and edit dialogs use `PrivacySelector contentType="book"` — but without
  `mode="content"`, so it defaults to `mode="container"` and shows `public | member | private`
  rather than `public | premium | private`
- The `visibility` type in the `Book` interface includes `'unlisted'` as an option

**Known issues / gaps:**
- `PrivacySelector` is used but without `mode="content"`, so the `premium` option is absent and
  `member` (container semantics) is shown instead.
- Topic editing is not implemented in the Edit Book dialog (the form initializes `topicIds: []`).
- The `Book` interface includes `member_ids` and `admin_ids` fields, suggesting an older
  membership model — these are not used in the current UI.
- Data fetches through an Edge Function rather than direct Supabase client; error handling for
  missing tables redirects to `/books/setup` but Decks does not (see Decks section).

---

## Decks (`/decks`)

**What it does:**
Browse page for carousel/flashcard-style content made up of ordered cards. Renders a 3-column
card grid. Data is fetched via the same Supabase Edge Function pattern as Books
(`make-server-d7930c7f/decks`).

**Data loaded:**
- Deck list via Edge Function GET `/decks` — returns `{ decks: [...] }`
- Author info via direct `users` query (supplemented client-side)
- Engagement from `content_likes` and `content_favorites` (content_type = 'deck')

**Filtering & sorting:**
- Search on title and description
- "My Decks" toggle (filters to `created_by === profile.id`)
- Sort: Newest / Oldest / Most Liked (client-side)

**User actions:**
- Like toggle — stored in `content_likes` with optimistic update
- Favorite toggle — stored in `content_favorites` with optimistic update
- View → navigates to `/decks/:id`
- Edit (owner or super admin): opens in-page Edit Deck dialog
- Delete (owner or super admin): DELETE to Edge Function with browser confirm

**Create flow:**
- "Create Deck" button opens an in-page dialog (not a separate route)
- Form fields: title (required), description, visibility (`PrivacySelector contentType="deck"`),
  tags (via `TagSelector`)
- Cards are added from the deck detail page after creation
- No topic selector in the create form (unlike Books)

**Visibility controls:**
- Both create and edit dialogs use `PrivacySelector contentType="deck"` — same gap as Books:
  no `mode="content"` prop, so shows `public | member | private` instead of
  `public | premium | private`

**Known issues / gaps:**
- `PrivacySelector` is missing `mode="content"` in both create and edit dialogs.
- No topic support anywhere on the Decks browse or create flow.
- If the `decks` table is not set up, the page shows a toast error but does not redirect to a
  setup page (unlike Books, which redirects to `/books/setup`).
- The `Deck` interface includes `member_ids` and `admin_ids` fields (same legacy pattern as Books)
  that are unused in the current UI.

---

## Reviews (`/reviews`)

**What it does:**
Browse page for community product/tool/course/book reviews with 1–5 star ratings and optional
external resource links. Renders a vertical list of cards with upvote counts.

> **Important:** The `reviews` table does not exist in the database. `ReviewsPage.tsx` queries
> the `endorsements` table instead (this is the legacy/pre-migration table name). Any migration
> or schema work should target `endorsements` until a rename is completed.

**Data loaded:**
- `endorsements` table: all columns plus author join (`users!author_id`)
- Sorted server-side: `created_at` (recent), `likes_count` (popular), or `external_rating` (rating)
- User's likes from `content_likes` (content_type = 'endorsement')
- Access is pre-filtered by circle and table membership (same pattern as Documents)

**Access control:**
- Non-admins see only reviews belonging to circles/tables they are a member of, plus their own
- `canAccessContent`: public = always; member = checks `userPermissions.permitted_types.includes('reviews')`;
  premium = always false

**Filtering & sorting:**
- Search on title and description (client-side, post-load)
- Sort buttons: Recent / Popular / Rating (triggers a re-fetch with different `order()` call)

**User actions:**
- Upvote toggle — stored in `content_likes` (content_type = 'endorsement'); displayed as a
  `ThumbsUp` count
- "View Details" links to `/reviews/:id`
- "Write Review" links to `/reviews/new`

**Create flow:**
- Route `/reviews/new` → `AddReviewForm.tsx`
- Form fields: title, description, link URL (optional), category (Tool / Book / Course / Service /
  Product / Other), star rating (1–5), optional circle/table/pitch/build/elevator associations, tags
- Inserts into the `endorsements` table

**Visibility controls:**
- No `PrivacySelector` in the create form (`AddReviewForm`)
- The browse page uses `access_level` (from the `endorsements` table) for the lock/opacity logic
- No visibility editing available on the create form

**Known issues / gaps:**
- The database table is named `endorsements`, not `reviews`. This is a naming inconsistency that
  affects all queries, RLS policies, and any future migrations.
- `PrivacySelector mode="content"` is entirely absent from the create flow.
- No visibility field in `AddReviewForm` — users cannot set `access_level` when creating a review;
  the field defaults to whatever the database default is.
- No topic support in the create form or browse page.
- No advanced filter panel (no tag or topic filters).
- `likes_count` is a denormalized column on the `endorsements` table — it is updated directly in
  `handleUpvote` but is not recalculated from `content_likes`, creating a potential drift between
  the two sources of truth.
- The "My Reviews" sub-filter exists in the component's data (`myReviews` variable) but is not
  exposed in the UI as a toggle button.
