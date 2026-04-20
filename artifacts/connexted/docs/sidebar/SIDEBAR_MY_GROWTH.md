# Sidebar Section: My Growth

The **My Growth** section is the member-facing learning and achievement hub. It groups all personal learning progress (enrolled courses and programs), structured growth journeys (pathways), recognition (badges), and public-facing profile surfaces (Moments, Portfolio) into a single collapsible sidebar block. The section is rendered by `MyGrowthSection.tsx` and appears for every authenticated user.

Sidebar items (in order):
1. My Courses → `/my-courses`
2. My Programs → `/my-programs`
3. Browse Pathways → `/browse-pathways`
4. My Pathways → `/my-growth`
5. My Badges → `/profile/badges`
6. My Moments → `/moments/{profileId}`
7. My Portfolio → `/portfolio/{profileId}`

---

## My Courses (`/my-courses`)

**Source:** `src/app/components/MyCoursesPage.tsx`

**What it does:** Shows the current user's full course enrollment history, segmented into three groups: "Continue Learning" (in-progress), "Start Learning" (not yet started), and "Completed". Each course is displayed as a card with a progress bar, instructor name, and a context-aware CTA button ("Start Course", "Continue Learning", or "Review Course"). A stats row at the top summarises total enrolled, in-progress, and completed counts.

**Data loaded:**
- `access_tickets` via `accessTicketService.getUserTicketsByType(userId, 'course')` — the primary source of truth (unified access system). Joined against the `courses` table for title, slug, description, and instructor name.
- `course_enrollments` table (legacy fallback) — picks up any courses not yet represented in the tickets system, deduplicating by `course_id`.
- Progress comes from `progress_percentage` on whichever record is used.

**User actions:**
- Click a course card → navigates to `/courses/{slug}/learn` (the course player).
- "Browse Courses" button → navigates to `/courses`.

**Tabs / sub-views:** None. The three groups ("Continue Learning", "Start Learning", "Completed") render conditionally based on data — they are not tabs.

**Known issues / gaps:**
- The dual-source (tickets + legacy fallback) design is a transitional state; once all enrollments migrate to access tickets, the legacy path can be removed.
- No search or filter capability on this page.
- Course cards use a generic purple-to-blue gradient header; there is no actual cover image support here even though the `courses` table has a `cover_image_url` field.

---

## My Programs (`/my-programs`)

**Source:** `src/app/components/MyProgramsPage.tsx`

**What it does:** Displays all programs the current user is enrolled in or participating in. Each program is shown as a card with cover image (if available), member count, enrollment date, and a status badge. A "Create Program" button in the header lets any member create their own program. An info card at the bottom explains what programs are when the user has active enrollments.

**Data loaded:**
- `access_tickets` via `accessTicketService.getUserTicketsByType(userId, 'program')` — primary source. Joined against `programs` table for name, slug, description, cover image, member/admin arrays.
- `program_members` table (legacy fallback) — filters for status in (`enrolled`, `active`, `completed`), deduplicating against the ticket map.
- Status is normalised to either `'enrolled'` or `'completed'` for ticket-sourced records; legacy records preserve the raw status value (`enrolled`, `active`, `approved`, `applied`, `completed`).

**User actions:**
- Click a program card → navigates to `/programs/{slug}` (the program detail/player page).
- "Create Program" button → navigates to `/programs/new`.
- "Browse Programs" link (empty state) → navigates to `/programs`.

**Tabs / sub-views:** None.

**Known issues / gaps:**
- Same dual-source transitional pattern as My Courses; legacy path will eventually be removed.
- Member count is derived from the `member_ids` array field on the program record, which may lag behind `program_members` table in some configurations.
- No progress indicator for programs (unlike courses, there is no `progress_percentage` surfaced here).

---

## My Pathways (`/my-growth`)

**Source:** `src/app/components/growth/MyGrowthPage.tsx`

**What it does:** The unified growth dashboard. Described in the file header as replacing the old `MyBadgesPage` as the "progression" view. It renders four main sections: Active Pathways, Recommended For You, Earned Badges, and Completion History. A summary stat row at the top shows counts for active pathways, completed courses, badges earned, and completed pathways. A fifth section (Completed Pathways) appears only when the user has finished at least one.

**Data loaded:**
- `/api/pathways/user/enrollments?user_id=...` — enrolled pathways with `progress_pct`, `status`, and nested `pathway` + `pathway_steps` data.
- `/api/pathways/user/recommended?user_id=...` — personalised pathway recommendations with `match_score` and `match_reasons` (matched against user profile topics, tags, roles).
- `course_enrollments` (Supabase direct) — completed courses only (`completed_at IS NOT NULL`), limited to 10 most recent, joined with `courses` for title and slug.
- `useUserBadges(userId, true)` hook — all earned badges with badge type details.

**User actions:**
- "Show Steps" / "Hide Steps" toggle on each active pathway card expands an inline step list.
- "Go" button on a step → navigates to the linked resource (course, program, or activity page) using `ACTIVITY_ROUTE_MAP`.
- "Report Done" on activity steps → opens an inline textarea to submit a self-report evidence note via `POST /api/pathways/{id}/self-report`.
- "I know this" on skippable non-activity steps → calls `POST /api/pathways/{id}/skip-step`.
- "Start This Pathway" on recommended cards → calls `POST /api/pathways/{id}/enroll`.
- Completion history items → link to `/courses/{slug}`.

**Tabs / sub-views:** No tabs. Sections render conditionally based on data presence.

**Known issues / gaps:**
- **Step completion state is not loaded.** In `PathwayProgressCard`, the variables `isCompleted`, `isSkipped`, `isPending`, and `isCurrent` are all hardcoded to `false`. The step list renders correctly but every step appears as "not started" regardless of actual progress. This is a significant gap — the visual step tracker does not reflect reality.
- The `progress_pct` value from the enrollment _is_ displayed correctly at the pathway level; the per-step indicators are the broken part.
- Completion history only shows courses (not completed programs).
- Completed courses are fetched from the legacy `course_enrollments` table, not via the tickets system.

---

## Browse Pathways (`/browse-pathways`)

**Source:** `src/app/components/growth/BrowsePathwaysPage.tsx`

**What it does:** A community-wide catalog of all published pathways. Members can search, filter by tag and target role, and enroll directly from the catalog. Each pathway card shows its destination goal, step composition (course / program / activity counts), estimated hours, enrollment count, tags, and — if already enrolled — a progress bar. Featured pathways appear in a dedicated section at the top.

**Data loaded:**
- `pathways` table with `pathway_steps(*)` — filtered to `status = 'published'`, ordered by `is_featured DESC`.
- `pathway_enrollments` for the current user — to show per-pathway enrollment status and progress percentage.

**User actions:**
- Search box — filters by pathway name, destination, short description, or tags.
- Tag / role filter chips — single-select, toggle off with a "Clear" link.
- "Enroll in Pathway" button — inserts a row into `pathway_enrollments` (checks for existing record first to prevent duplicates).
- "View My Progress" button (enrolled, not completed) → navigates to `/my-growth`.
- Completed pathways show a static "Pathway complete!" label with no further action.

**Tabs / sub-views:** "Featured" and "All Pathways" sub-sections rendered conditionally; not tabs.

**Known issues / gaps:**
- Enroll action writes directly to `pathway_enrollments` from the client, bypassing the API; the My Growth page enrolls via the `/api/pathways/{id}/enroll` endpoint. These two code paths should be consolidated.
- Tag and role filter chips are limited to 12 tags and 6 roles displayed; no "show more" affordance.
- No pagination or infinite scroll; all published pathways load at once.

---

## My Badges (`/profile/badges`)

**Source:** `src/app/components/MyBadgesPage.tsx`

**What it does:** A dedicated badge reference page designed to answer three questions for every badge: what it is, how to earn it, and what to do next. The page is structured into four sections: Earned Badges, Earn by Completing a Pathway (pathway-linked unearthed badges), Auto-Awarded Badges (auto-issue, non-pathway), and Recognition Badges (manually awarded by admins/sponsors). A collapsible "How do I earn badges?" explainer panel and an overall badge collection progress bar (earned / total available) appear at the top. Earned badge cards show issuer context — the linked pathway name, issuer person, or system flag — plus an optional `issuer_message` quote and an evidence link.

**Data loaded:**
- `useUserBadges(userId, true)` hook — earned badges with full `badge_type` join.
- `useBadgeTypes()` hook — all badge types with `assignable_to` metadata, filtered to `'user'`-assignable types.
- `/pathways/badge-mappings` (Supabase Edge Function via `make-server-...`) — maps badge type IDs to the pathway that awards them (name, slug, destination, step counts, estimated hours, color).
- `/pathways/user/enrollments` (same Edge Function) — current user's pathway enrollment status and progress for inline progress bars on available pathway-linked badges.

**User actions:**
- "How do I earn badges?" toggle → expands a 3-column explainer.
- Badge name links on available badge cards → navigate to `/badges/{badgeTypeId}` (badge detail page).
- "Go to My Growth" / "Browse Courses" / "Browse Programs" CTA buttons on available badge cards.
- "Continue" / "Start" buttons on pathway-linked badge cards → navigate to `/my-growth`.
- "View Evidence" link on earned badges (when `evidence_url` is set).

**Tabs / sub-views:** None. The four badge sections render conditionally based on data.

**Known issues / gaps:**
- API calls to `/pathways/badge-mappings` and `/pathways/user/enrollments` go to a Supabase Edge Function via a hardcoded URL built from `projectId` + `publicAnonKey` constants. If the function is unavailable, badge-pathway context silently fails — earned badges still display, but pathway linkage and inline enrollment progress are missing.
- The `progress_percentage` field on enrollment objects returned by the Edge Function is mapped as-is; there is a different field name (`progress_pct`) used on the Supabase `pathway_enrollments` table directly. If the Edge Function normalises this correctly it works, otherwise enrollment progress bars on this page may show 0.
- "You've collected every badge!" state only triggers when `availableTypes.length === 0 && badges.length > 0`; if `useBadgeTypes` returns an empty list (load failure), it will falsely appear to the user.

---

## Moments (`/moments/{userId}`)

**Source:** `src/app/components/MomentsPage.tsx`

**What it does:** A personal work-in-progress feed for a specific user. The feed owner can post free-text "moments" (short updates on what they're working on), edit or delete them, and react with hearts. Visitors can view the feed (if public) and react. The feed header shows the owner's avatar, feed name, visibility (public/private badge), post count, and a link to the owner's Portfolio. A time-window filter lets viewers narrow posts to the last 3, 30, or 90 days (or all time).

**Data loaded:**
- `users` table — owner's name, email, avatar, bio.
- `moments` table — feed container record for the given `userId` (name, description, visibility settings, `allow_reactions`, `visibility_window`).
- `posts` table — all posts with `moments_id` matching the container, ordered by `created_at DESC`. Reactions are stored as a JSONB column `{ [userId]: string[] }`.

**User actions (owner):**
- Write and post a new moment (textarea + "Post Moment" button → inserts into `posts`).
- Edit an existing post (inline textarea, "Save" / "Cancel").
- Delete a post (confirm dialog → deletes from `posts`).
- "Settings" button → navigates to `/moments/{userId}/settings`.

**User actions (visitor):**
- Heart reaction on any post (toggles `❤️` in the `reactions` JSONB for the current user).
- Time window filter (client-side only — filters already-loaded posts).
- "View Portfolio" badge link → navigates to `/portfolio/{userId}`.

**Tabs / sub-views:** None. The time window filter is a `<Select>` component, not a tab.

**Known issues / gaps:**
- The owner's visibility window (`moments.visibility_window`) is enforced on the client side (`getFilteredPosts`), not on the database query. A visitor with direct Supabase access could bypass it.
- Comments (`allow_comments` setting exists on the record) are not implemented — there is no comment UI or data fetch. The setting is stored but has no effect.
- The in-page time filter (`timeWindow` state) and the `visibility_window` enforced from the record are two separate, parallel filter mechanisms — potentially confusing.
- No pagination; all posts are loaded at once.
- Reactions only support `❤️`; the data model (array of emoji strings per user) would support multi-emoji, but the UI only exposes one type.

---

## Portfolio (`/portfolio/{userId}`)

**Source:** `src/app/components/PortfolioPage.tsx`

**What it does:** A curated showcase of a member's work. The page displays the portfolio owner's avatar, tagline, description, and visibility status, followed by: an earned badges display (via `BadgeDisplay` component), a "Featured Work" section (items with `is_featured = true`), optional category filter buttons, and the remaining portfolio items in grid, list, or masonry layout (controlled by `portfolio.layout_style`). Each item shows title, category badge, description, tags, and links to an external URL and/or an internal document. A cross-link badge in the header navigates to the owner's Moments feed.

**Data loaded:**
- `users` table — owner name, avatar, bio.
- `portfolios` table — the portfolio container for the given `userId` (name, description, tagline, visibility, layout style, `show_categories`).
- `portfolio_items` table — all items for the portfolio, ordered by `display_order ASC`, then `created_at DESC`.
- `useUserBadges(userId)` hook — the portfolio owner's earned badges (not the viewing user's badges).

**User actions (owner):**
- "Add Item" button → navigates to `/portfolio/{userId}/add-item`.
- "Settings" button → navigates to `/portfolio/{userId}/settings`.
- "Remove" button on each item → deletes from `portfolio_items` with a confirm dialog.

**User actions (visitor/owner):**
- Category filter buttons (shown when `portfolio.show_categories = true` and categories exist) — client-side filter.
- "View" link on items → opens `item.url` in a new tab.
- "View Document" / "Document" link on items → navigates to `/documents/{document_id}`.
- Tag badges → navigate to `/tags/{tag}`.
- "View Moments" badge → navigates to `/moments/{userId}`.

**Tabs / sub-views:** Featured Work and the main grid are separate visual sections, not tabs. Category filter acts as a client-side filter over the already-loaded item list.

**Known issues / gaps:**
- The file header notes this is a "split candidate" (~481 lines) and suggests extracting `PortfolioProjectCard`, `PortfolioAddDialog`, and `PortfolioEmptyState` into sub-components.
- `portfolio.layout_style` affects layout class for non-featured items only (`grid` vs. `list`); masonry is referenced in `getLayoutIcon()` but the grid CSS class logic only branches on `'list'` vs. anything else — masonry renders identically to grid.
- No thumbnail image rendering despite `thumbnail_url` existing on the `PortfolioItem` interface.
- Private portfolios redirect the viewer to `/` with a toast error; there is no "request access" flow.
- Featured items always appear above the category filter, so a featured item in a non-selected category is still visible — category filtering only applies to the non-featured grid below.
