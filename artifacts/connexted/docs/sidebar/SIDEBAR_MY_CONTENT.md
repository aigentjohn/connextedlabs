# Sidebar Section: My Content

The **My Content** section is the user's personal content workspace. It surfaces everything the authenticated user has created or is managing on the platform: URL-based documents, long-form books, flashcard-style decks, checklists/lists, curated libraries, a raw URL staging area (My Links), their written reviews, and a lifecycle-management dashboard (Content Admin). The section is rendered by `MyContentSection.tsx` at `src/app/components/sidebar/MyContentSection.tsx`.

> **Note on "Content Admin":** The `/my-content-admin` route is not listed as a nav item inside `MyContentSection.tsx`. It is accessible via a link in `DashboardLayout.tsx` but is documented here because it appears in the task spec as an eighth My Content item.

---

## My Documents (`/my-documents`)

**Component:** `src/app/components/MyDocumentsPage.tsx`

**What it does:** Shows all documents the authenticated user has authored. A document is a URL pointer with a title, description, tags, and an `access_level` field. The page also displays engagement stats (views, saves) per document and provides a summary of where each document is shared.

**Data loaded:**
- `documents` table — filtered by `author_id = profile.id` and `deleted_at IS NULL`, ordered newest-first.
- `circles` table — user's circle memberships (`member_ids @> [profile.id]`), used to resolve circle names shown on cards.
- `tables` table — user's table memberships, used to resolve table names shown on cards.

**User actions:**
- **Create** — "Create Document" button links to `/documents/new`.
- **Edit** — Edit icon on each card links to `/documents/:id`.
- **Share** — Share icon opens `ShareDocumentDialog`, which lets the user assign the document to circles and/or tables.
- **Delete** — Soft delete: sets `deleted_at`, `deleted_by`, and clears `circle_ids`/`table_ids`. Platform admins can hard-delete via the admin panel.
- **Search** — Client-side filter across title, description, and tags.
- **Navigate to tags** — Tag badges link to `/tags/:tag`.

**Tabs / sub-views:**
| Tab | Contents |
|---|---|
| All Documents | Every authored document |
| Personal | Documents with no `circle_ids` and no `table_ids` (not shared anywhere) |
| Shared with Circles | Documents where `circle_ids.length > 0` |
| Shared with Tables | Documents where `table_ids.length > 0` |

Each tab shows a count badge. Stats row at the top mirrors the four tab counts.

**Known issues / gaps:**
- ~~`isFavorited` hardcoded `false`~~ — **Fixed April 2026**: `MyDocumentsPage` now fetches `favoritedDocIds` from `content_favorites` on mount and uses it to set the favorited state on each document card.
- There is no pagination or infinite scroll; all documents are loaded at once.
- The empty-state "Pro Tip" card cross-links to `/my-contents` (My Links), which is good UX but is the only place that relationship is surfaced.
- The `access_level` field (`public` / `member` / `unlisted` / `private`) is displayed as a badge but is **not editable** from this page — users would need to go into the document detail view.

**Visibility controls:** Each document card shows an `access_level` badge (Members Only, Unlisted, Private) when the level is not `public`. A "Personal" badge is shown when a document has no circle or table associations. The share dialog lets the user add/remove circle and table associations but does not directly expose the `access_level` enum.

---

## My Books (`/books`)

**Component:** `src/app/components/BooksPage.tsx`

**What it does:** Browses and manages all books on the platform. Books are multi-chapter long-form content pieces. The page is not strictly "my books only" — it loads all books and offers a toggle to filter to the current user's books. Each book card shows chapter count, views, likes, and favorites.

**Data loaded:**
- Books fetched via Edge Function: `GET /functions/v1/make-server-d7930c7f/books` (not a direct Supabase query).
- Author profiles resolved via `supabase.from('users').select('id, name, avatar')` for all distinct author IDs.
- `content_likes` — counts per book and current user's likes, filtered by `content_type = 'book'`.
- `content_favorites` — counts per book and current user's favorites, filtered by `content_type = 'book'`.
- On expand: chapters fetched via `GET /books/:id/chapters` Edge Function.

**User actions:**
- **Create** — "Create Book" dialog (inline in this page) accepts title, description, visibility, topics (up to 3), and tags (up to 10). Topics are linked via a separate `POST /topics/link` Edge Function call after book creation.
- **Edit** — "Edit Book" dialog (inline in this page) updates title, description, visibility, tags, and topics. ~~Topic editing was stubbed with `topicIds: []`~~ — **Fixed April 2026**: `handleEditBook` now awaits a fetch of existing topic links from `content_topics` before opening the dialog; `TopicSelector` added to the edit form; update always syncs topics via the Edge Function.
- **Delete** — `DELETE /books/:id` via Edge Function. Soft-delete: sets `deleted_at` on the book row rather than hard-deleting. Uses `window.confirm` (no modal confirmation). Soft-deleted books are filtered out by `.is('deleted_at', null)` on all read queries.
- **Like / Unlike** — Toggles a row in `content_likes`. Optimistic UI with rollback on error.
- **Favorite / Unfavorite** — Toggles a row in `content_favorites`. Optimistic UI with rollback on error.
- **Inline chapter reader** — Expand icon on each card loads chapters and renders a two-pane reader (chapter list left, markdown content right) inline in the list.
- **Filter "My Books"** — Toggle button filters to `created_by === profile.id`.
- **Sort** — Newest / Oldest / Most Liked (client-side after fetch).
- **Search** — Client-side filter on title and description.

**Tabs / sub-views:** No tabs. The inline chapter reader expands in place below the book card.

**Known issues / gaps:**
- `book.author_id` is used in the ownership check on line 749 (`isOwner = book.author_id === profile.id`) but the `Book` interface defines the field as `created_by`, not `author_id`. This means `canEdit` will always be `false` for the current user unless they are a `super` admin — the edit and delete buttons will not appear for normal book owners.
- ~~Topic editing in the edit dialog not implemented~~ — **Fixed April 2026**: existing topics are fetched before the dialog opens; `TopicSelector` in the edit form; save always calls the topic sync endpoint.
- No setup redirect: if the `books` table is missing (`PGRST205`), the page redirects to `/books/setup`, but a `BooksSetupPage` is the only recovery path — there is no in-page notice.
- The page loads **all** books platform-wide on mount (not just the user's own), which will be a performance issue at scale.

**Visibility controls:** `PrivacySelector` component used in both create and edit dialogs. Supports `public`, `member`, `private`, `unlisted`. `VisibilityBadge` is imported but not rendered in the book list cards (only non-public books in `DecksPage` render the badge).

---

## My Decks (`/decks`)

**Component:** `src/app/components/DecksPage.tsx`

**What it does:** Browses and manages all decks on the platform. Decks are carousel-based content made of individual cards. Structure and behavior are very similar to `BooksPage` — the two components are near-copies of each other with different content types.

**Data loaded:**
- Decks fetched via Edge Function: `GET /functions/v1/make-server-d7930c7f/decks`.
- Author profiles resolved via `supabase.from('users').select('id, name, avatar')`.
- `content_likes` — counts and current user state for `content_type = 'deck'`.
- `content_favorites` — counts and current user state for `content_type = 'deck'`.

**User actions:**
- **Create** — "Create Deck" dialog accepts title, description, visibility, and tags. Note: no topic selector (unlike Books).
- **Edit** — "Edit Deck" dialog updates title, description, visibility, and tags.
- **Delete** — `DELETE /decks/:id` via Edge Function. Uses `window.confirm`.
- **Like / Unlike** — Toggles `content_likes`. Optimistic UI.
- **Favorite / Unfavorite** — Toggles `content_favorites`. Optimistic UI.
- **View** — "View" button and title link navigate to `/decks/:id`.
- **Filter "My Decks"** — Toggle button filters to `created_by === profile.id`.
- **Sort** — Newest / Oldest / Most Liked (client-side).
- **Search** — Client-side filter on title and description.

**Tabs / sub-views:** None. Renders as a responsive 3-column card grid.

**Known issues / gaps:**
- Same `author_id` vs. `created_by` bug as BooksPage does not appear here — `DecksPage` correctly uses `deck.created_by === profile.id` for the ownership check.
- No topic selector in the create dialog (Books has one; Decks does not). This is likely an omission.
- If the `decks` table is missing, a toast error is shown but there is no redirect to a setup page (unlike Books which redirects to `/books/setup`).
- The page loads all decks platform-wide on mount.
- Tags beyond 3 are shown as "+N more" with no way to expand them in the list view.

**Visibility controls:** `PrivacySelector` in both create and edit dialogs. `VisibilityBadge` is rendered on each card for non-public decks.

---

## My Lists (`/checklists`)

**Component:** `src/app/components/ChecklistsPage.tsx`

**What it does:** Shows all checklists (called "Lists" in the UI) on the platform. Each list has items with completion state, priority, assignment, and notes. The page shows a completion progress bar per list and distinguishes template lists from active lists.

**Data loaded:**
- `checklists` table — all rows with `creator:created_by(id, name, avatar)` join, ordered newest-first. No user filter — loads platform-wide.
- `checklist_items` table — all items for all fetched checklists, ordered by `priority`.
- `content_likes` — like counts and current user's likes for `content_type = 'checklist'`.
- If table missing (`PGRST205`), redirects to `/checklists/setup`.

**User actions:**
- **Create** — "Create List" button links to `/checklists/new` (separate page: `CreateChecklistPage.tsx`).
- **View** — Each card links to `/checklists/:id`.
- **Filter by template** — "Templates Only" toggle.
- **Filter by category** — Category pill buttons (derived from unique `category` values in fetched data).
- **Sort** — Newest / Oldest / Most Liked (client-side).
- **Search** — Client-side filter on name and description.

**Tabs / sub-views:** None. Stats row shows Total Lists, Templates, and Active Lists counts.

**Known issues / gaps:**
- Like count is displayed on cards but there is no like/unlike button on the list page — likes can only be toggled from the detail page.
- No "My Lists" filter — the page loads all checklists platform-wide with no way to see only checklists you created.
- No delete action from the list page.
- `checklist_items` are fetched for **every** checklist in a single query (no per-list lazy loading), which will be expensive at scale.
- No favorites support (only likes).
- The `ChecklistsPage` title in the PageHeader says "Lists" but the breadcrumb also says "Lists" — the underlying model and URL say "checklists". The naming is inconsistent across the codebase.

**Visibility controls:** None visible on the list page. No `access_level` or visibility field on the `Checklist` interface — lists appear to be globally visible to all platform members once created.

---

## My Libraries (`/libraries`)

**Component:** `src/app/components/LibrariesPage.tsx`

**What it does:** Organizes documents into curated collections. Supports three library types: `system` (platform-managed smart views), `auto_generated` (filter-rule based), and `manual` (user-curated with folders). On first load, the page calls `initializeSystemLibraries()` to ensure the platform's built-in system libraries exist.

**Data loaded:**
- `libraries` table — filtered by tab:
  - "My Libraries" tab: `owner_type = 'user' AND owner_id = profile.id`
  - "Discover" tab: `type = 'system' OR (is_public = true AND owner_id != profile.id)`
- Per-library document counts via secondary queries:
  - Manual: counts from `library_documents` and `library_folders`.
  - System "All Documents": count from `documents`.
  - System "My Documents": count from `documents` where `author_id = profile.id`.
  - System "Saved Documents": count from `content_favorites` where `content_type = 'document'`.
  - System "Shared with Me": ~~hardcoded `0`~~ — **Fixed April 2026**: queries user's member circle IDs, counts `documents` with overlapping `circle_ids`, excludes user's own docs.
  - Auto-generated: ~~hardcoded `0`~~ — **Fixed April 2026**: applies `filter_rules` (document_type, intended_audience, tags) as a count query against `documents`.
- `content_likes` — counts and current user state for `content_type = 'library'`.

**User actions:**
- **Create** — "Create Library" button links to `/libraries/create`.
- **View** — Each card links to `/libraries/:id`.
- **Sort** — Newest / Oldest / Most Liked (client-side).
- **Search** — Client-side filter on name and description.
- **Tab switch** — "My Libraries" / "Discover".

**Tabs / sub-views:**
- **My Libraries** — User-owned libraries. Empty state has an onboarding explainer card.
- **Discover** — Split into "Smart Views" (system libraries) and "Community Libraries" (public libraries from other users).

**Known issues / gaps:**
- ~~`auto_generated` library document counts hardcoded `0`~~ — **Fixed April 2026**: `filter_rules` (document_type, intended_audience, tags[]) applied as a live count query against `documents`.
- ~~"Shared with Me" count hardcoded `0`~~ — **Fixed April 2026**: user's member circle IDs fetched, then `documents.circle_ids` queried with `overlaps`, excluding the user's own docs. Same fix applied in `LibraryDetailPage` for the document list itself.
- `initializeSystemLibraries()` is called on every mount as long as `initialized` state is `false`. This triggers one run per page load per session, which may cause redundant DB writes if system libraries already exist.
- No delete or edit action from the list page for user-owned libraries.
- Like button is not rendered on library cards (data is fetched but unused in the UI).

**Visibility controls:** The `LibraryCard` shows a `Lock` icon for private libraries (`is_public = false`). The create flow at `/libraries/create` presumably sets `is_public`. No visibility selector is inline on this page.

---

## My Links (`/my-contents`)

**Component:** `src/app/pages/MyContentsPage.tsx`

**What it does:** A URL staging and enrichment workspace. Users import raw URLs in bulk, organize them into a folder hierarchy, enrich their metadata, and then batch-publish them as platform content (Documents, Pitches, Builds, etc.). This is distinct from My Documents — it is a pre-publish holding area, not a public content surface.

**Data loaded:**
- `my_contents` table — all rows for `user_id = profile.id`, ordered newest-first.
- Per-card (lazy): `my_contents_usage` joined to content tables (`documents`, `pitches`, `builds`, etc.) to show which platform content was created from each URL.

**User actions:**
- **Import URLs** — Opens `ImportUrlDialog` (supports CSV, JSON, or paste). Available both from the header button and from the empty-state card. Applies to the currently selected folder.
- **Bulk Enrich** — Opens `BulkEnrichDialog` for selected items; enriches metadata (title, description, tags, etc.) in bulk.
- **Batch Create Content** — Opens `BatchCreateDialog` for selected items; creates platform content objects (Documents, Pitches, Builds) from the selected URLs.
- **URL Health Check** — `UrlHealthCheckButton` available both in the header (all URLs) and in the bulk-actions bar (selected URLs). Checks whether URLs are still live.
- **Select items** — Checkbox on each card or list row for multi-select. Bulk actions bar appears when items are selected.
- **Per-item actions** (dropdown menu on each card):
  - Enrich Metadata
  - Open URL (external link)
  - Delete
- **View mode toggle** — Grid / List.
- **Filter by usage** — All / Used / Unused (client-side).
- **Search** — Client-side filter on title, description, and tags.
- **Folder navigation** — Sidebar folder tree; selecting a folder filters the main content area to that folder's items only.

**Tabs / sub-views:** No tabs. Two-column layout: folder tree sidebar (left) + content area (right). Stats row: Total URLs / Pending / Enriched / Used.

**Known issues / gaps:**
- The per-item "Enrich Metadata" and "Delete" dropdown menu items have no `onClick` handlers — they are placeholders that do nothing. Only the bulk enrich dialog is wired up.
- The "Add folder" button (`Plus` icon in the folder sidebar header) has no `onClick` handler — folders are derived purely from `folder_path` values in the data; there is no UI to create a new folder directly.
- There is no edit form for individual URL records (title, description, tags, folder assignment) outside of the bulk enrich flow.
- `my_contents_usage` query inside each `ContentCard` fires independently on mount — if the folder contains many cards, this results in N+1 queries.
- Status tracking (pending / enriched / archived) has no automated transition logic visible in this component — status appears to be set manually via the enrich dialogs.

**Visibility controls:** None. Items in `my_contents` are always private to the owning user and are never surfaced to other platform members. Visibility becomes relevant only after content is published via BatchCreateDialog.

---

## My Reviews (`/my-reviews`)

**Component:** `src/app/components/MyReviewsPage.tsx`

**What it does:** Lists reviews (stored in the `endorsements` table) that the user has written, or that others have written and are visible to the user based on circle/table membership. Each review has a star rating (1–5), title, description, optional link URL, category, tags, and an upvote count.

**Data loaded:**
- `endorsements` table — with author join `users!author_id(id, name, avatar)`.
  - Filter by `filterType`: `my_reviews` (own only), `all_reviews` (no filter), `others_reviews` (not authored by self).
  - Date filter: last 30 days by default; "show all time" checkbox removes the filter.
  - For non-admins viewing others' reviews: client-side filtered to only reviews shared with circles/tables the user belongs to.
- `circles` and `tables` tables — fetched to get the user's membership IDs for access filtering (non-admins only).
- `content_likes` — current user's upvoted review IDs for `content_type = 'endorsement'`.

**User actions:**
- **Write Review** — "Write Review" button navigates to `/reviews/new`.
- **View/Edit own review** — "View" button (with Edit icon) navigates to `/reviews/:id`.
- **Delete own review** — Hard delete from `endorsements`. Uses `window.confirm`.
- **Upvote / Remove upvote** — Toggles `content_likes` for `content_type = 'endorsement'`. Updates `likes_count` locally. No optimistic rollback on error.
- **Filter** — My Reviews / All Reviews / Others' Reviews toggle buttons.
- **Sort** — Most Recent (server-side) / Most Popular (client-side using `likes_count`).
- **Date range** — Last 30 days (default) or all-time checkbox.
- **Navigate to tags** — Tag badges link to `/tags/:tag`.
- **Open linked resource** — External link icon if `link_url` is set.

**Tabs / sub-views:** None. Single list view with filter/sort controls in a card above the results.

**Known issues / gaps:**
- "Most Popular" sort is applied client-side after fetching with `ORDER BY created_at DESC`. When combined with a 30-day window, this is acceptable, but for all-time views with large datasets this will retrieve all rows before sorting.
- The upvote handler has no optimistic rollback — if the Supabase insert/delete fails, the local state is left incorrect (unlike likes in BooksPage/DecksPage which do rollback).
- Access control for "All Reviews" / "Others' Reviews" is enforced client-side only: the query fetches all matching rows, then JavaScript filters them. A malicious client could bypass this filtering.
- No search input on this page.
- The "Edit" button on own reviews navigates to the detail page rather than opening an inline edit form.
- The page label says "My Reviews" but the page also shows others' reviews depending on the filter — the page title is misleading.

**Visibility controls:** Reviews are implicitly scoped to circles and tables they are shared with (`circle_ids`, `table_ids` on the `endorsements` row). The platform-admin role bypasses all access filtering. There is no visibility selector on this page; sharing is set during review creation.

---

## My Assets (`/my-content/assets`)

**Component:** `src/app/components/MyAssetsPage.tsx` (added Sprint 3)

**What it does:** Lists all images and files the authenticated user has uploaded
to the private `assets` Supabase Storage bucket. Provides a central place to
manage uploaded assets, copy their URLs for use in the Page editor or other URL
fields, and delete files that are no longer needed.

**Data loaded:**
- `supabase.storage.from('assets').list(userId)` — up to 200 objects in the
  user's folder, ordered newest-first. Folder objects (no `id`) are filtered out.
- Public URL constructed via `getPublicUrl` per object (assets bucket has user-scoped
  RLS, not truly public — URL is constructed but requires auth to fetch).

**User actions:**
- **Upload** — header Upload button opens a file picker (images only, max 10 MB).
  File is stored as `{userId}/{timestamp}-{safeName}` with no resize (assets are
  variable-use, unlike covers/avatars).
- **Copy URL** — hover over any thumbnail, click "Copy URL" to copy the public URL
  to clipboard. Paste into the Page editor Image button or any URL field.
- **Delete** — hover → trash icon → `AlertDialog` confirmation. Before deleting,
  a ref-check queries `pages.content` for the asset's URL; if found, deletion is
  blocked and the referencing page title is shown.
- **Refresh** — re-fetches the storage listing.

**Thumbnail grid:** 2–4 columns responsive. Shows filename, file size badge, and
upload age. Non-image files show a generic icon.

**Known issues / gaps:**
- The ref-check only scans `pages.content`. Assets referenced in other markdown
  fields (book chapters, etc.) are not checked — the delete warning says so explicitly.
- `getPublicUrl` on the private `assets` bucket returns a URL that requires
  authenticated access; pasting it into a public page would result in a broken
  image for unauthenticated viewers. Consider using signed URLs for assets embedded
  in member-only pages.
- No search or filter; all assets load at once (capped at 200).
- The route `/my-content/assets` is registered in App.tsx but is not yet linked
  from the `MyContentSection.tsx` sidebar nav — users must navigate directly.

---

## Content Audit (`/my-content/audit`)

**Component:** `src/app/components/ContentAuditPage.tsx` (added Sprint 2d)

**What it does:** A unified, cross-type audit view of all content the authenticated
user has created. Covers four content types in a single tabbed interface —
Books, Decks, Lists (checklists), and Libraries — with inline visibility controls
and delete actions. Intended as a central management page for content owners who
create across multiple types.

**Data loaded (direct Supabase queries — not Edge Functions):**
- `books` — `created_by = user.id AND deleted_at IS NULL`, ordered newest-first.
- `decks` — `created_by = user.id`, ordered newest-first.
- `checklists` — `created_by = user.id`, ordered newest-first.
- `libraries` — `owner_id = user.id AND owner_type = 'user'`, ordered newest-first.
All four are fetched in parallel (`Promise.all`).

**Tabs:**

| Tab | Count badge | Edit link |
|---|---|---|
| Books | book count | `/books/:id` |
| Decks | deck count | `/decks/:id` |
| Lists | checklist count | `/checklists/:id` |
| Libraries | library count | `/libraries/:id` |

**Per-item actions (dropdown menu on each row):**
- **Edit** — navigates to the item's detail/edit page.
- **Change visibility** (Books, Decks) — inline dropdown cycles through
  `public` / `member` / `private` / `unlisted`. Writes directly via
  `supabase.from(table).update({ visibility })`.
- **Toggle public/private** (Libraries) — toggles `is_public` boolean.
  Lists (checklists) have no visibility field; only Edit and Delete are shown.
- **Delete** — opens an `AlertDialog` confirmation, then calls
  `supabase.from(table).delete()` (hard delete for all four types in this view).
  Note: the `books` delete here is a hard delete, unlike the soft-delete performed
  by the Edge Function when deleting from `BooksPage`.

**Known issues / gaps:**
- Delete is a hard delete (`.delete()`), not a soft delete — inconsistent with
  `BooksPage` where `DELETE /books/:id` via Edge Function sets `deleted_at`.
- No search or sort controls; items are displayed in creation order only.
- Lists (checklists) show no visibility badge because `checklists` has no
  `visibility` or `access_level` column.

---

## Content Admin (`/my-content-admin`)

**Component:** `src/app/pages/MyContentAdminPage.tsx`

**What it does:** A lifecycle management dashboard for the user's content across container types (Builds, Pitches, Tables, Elevators, Journeys). The platform uses an expiration model where content expires after a set period unless renewed or marked permanent. This page surfaces items that are expiring soon, already expired, actively live, or scheduled for future publication.

**Data loaded:**
- Direct Supabase queries (not Edge Functions) to each of: `builds`, `pitches`, `tables`, `elevators`, `journeys` — all rows where `created_by = user.id`. Results are merged into a single `ContentItem[]` array and categorized client-side.
- No `content_likes`, `content_favorites`, or view stats are fetched — engagement data is read from fields on the content rows themselves (`engagement_score`, `engagement_extends_count`).

**User actions:**
- **Renew (3 or 6 months)** — Calls `supabase.rpc('extend_expiration', ...)` with the item type and ID.
- **Make Permanent** — Calls `supabase.rpc('make_content_permanent', ...)`. Returns an `upgrade_required` flag if the user is not on a premium plan; redirects to `/pricing`.
- **Bulk Renew** — Select multiple items in "Expiring Soon" tab and renew all at once (3 or 6 months).
- **Recover expired content** — In "Recently Expired" tab, calls `handleRenew` with 3 months extension.
- **Cancel scheduled publish** — Calls `supabase.rpc('cancel_scheduled_publish', ...)`. Cancelling publishes the item immediately according to the RPC response message.
- **Refresh** — Re-fetches all content.

**Tabs / sub-views:**
| Tab | Description |
|---|---|
| Expiring Soon | Items with `expires_at` within the next 30 days and `is_published` (or no schedule). Badge count shown. |
| Active | Items either permanent, without expiration, or expiring beyond 30 days. |
| Recently Expired | Items expired within the last 30 days (recoverable window). |
| Scheduled | Items where `is_scheduled = true`, `is_published = false`, and `scheduled_publish_at` is set. |

Overview stats row: Active count / Expiring Soon count / Recently Expired count / Total engagement extensions.

**Known issues / gaps:**
- The component is exported both as a named export (`export function MyContentAdminPage`) and a default export (`export default MyContentAdminPage`) at lines 46 and 726. The router import uses the default export — this is harmless but inconsistent.
- Only five container types are queried: `builds`, `pitches`, `tables`, `elevators`, `journeys`. Other content types tracked elsewhere in the platform (books, decks, documents, checklists, libraries) are not included in this lifecycle view.
- Navigation links for content items use `/${item.type}s/${item.id}` (line 601), which produces correct paths for most types (`/builds/...`, `/pitches/...`) but will produce `/tables/...` and `/elevators/...` which may not be valid detail routes.
- The "Content Admin" link appears in `DashboardLayout.tsx` but is **not included** in the `MyContentSection.tsx` sidebar nav items. Users can only reach it via the dashboard layout link, making it semi-hidden.
- The premium upsell card at the bottom links to `/pricing`, which may not exist as a route.
- Bulk renew calls `handleRenew` per item in a loop (lines 195–206) but `handleRenew` itself sets and unsets `setRenewing(true/false)` internally — the outer `handleBulkRenew` sets `renewing` again after the loop regardless, leading to redundant state updates.

**Visibility controls:** Not applicable to this page — it manages expiration and scheduling of content, not audience access controls. Access control for the content itself is managed on each container type's own settings page.

---

## Data Portability & Account Deletion

Connexted provides GDPR/CCPA-compliant data controls accessible from `/my-account`
(not from the My Content sidebar section directly, but documented here because
they affect all user-created content):

- **Export my data** — Downloads a full account export as JSON via the
  `account-export` Edge Function. Includes: profile, documents, pages, books
  (with chapters), decks, checklists, libraries, my_contents, posts, episodes,
  playlists, builds, pitches, badge_assignments, content_favorites, and circles.
- **Delete my account** — Soft-deletes the user record (`users.deleted_at = now()`).
  All content remains in the database during the 30-day grace period. The
  `hard-delete-accounts` Edge Function (runs daily at 3am UTC) permanently removes
  users and their data after the grace period via `auth.admin.deleteUser()` which
  cascades to `public.users`.
- A red dismissal banner appears in `DashboardLayout` for any user with
  `deleted_at` set, linking back to `/my-account` to cancel the deletion.
