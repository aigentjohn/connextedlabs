# Sidebar Section: Discover

The DISCOVER section groups all content-finding tools in one collapsible group. It lets members browse containers and content across the platform, follow topics and tags, see what their network is publishing, surface the most-liked items, and bookmark favorites for quick return.

The section is implemented in `src/app/components/sidebar/DiscoverSection.tsx`. It takes an `isExpanded` toggle, and an optional `favoritesCount` badge shown next to "My Favorites".

---

## Home (`/` or `/home`)

> Two versions of `HomePage` exist in the codebase. The one in `src/app/components/HomePage.tsx` is a member dashboard; the one in `src/app/pages/HomePage.tsx` is an action-inbox variant. Both render at the `/home` route depending on which is wired in the router — the pages/ version is the active route.

### pages/HomePage (`src/app/pages/HomePage.tsx`)

**What it does:** An action-inbox dashboard shown when the user logs in. It surfaces what needs attention right now: unread notifications count, pending invites to circles and containers, upcoming events the user is hosting within 7 days, and containers joined in the last 7 days. It also shows the user's platform role (super admin / coordinator / member), user class, and counts of circle and container admin roles.

**Data loaded:**
- Unread notification count from `notifications` table
- Pending circle invites from `circle_members` (status = 'invited')
- Pending container invites from `container_members` (status = 'invited')
- Recent joins (last 7 days) from `circle_members` and `container_members`
- Hosted upcoming events from `events` (host_id = current user, start_time >= now)
- Program applications from `program_applications` with join to `programs`
- Admin role counts from `circles`, `containers`, and `programs` tables

**User actions:**
- Accept or decline pending invites (updates `circle_members` / `container_members` status or deletes the row)
- Navigate to notifications, portfolio, moments, activity feed, calendar via quick-access links
- Navigate to programs requiring next-step action

**Tabs / sub-views:** None — single linear page with named sections: Notifications, Action Required, Recently Joined, Upcoming Events.

**Known issues / gaps:**
- Container invite transformation references a `containers` table (generic), but the actual codebase uses per-type tables (circles, tables, pitches, etc.). The invite query may return no results unless a generic `containers` table exists.
- "Recently Joined" only reflects the `circle_members` / `container_members` tables, not the per-type `member_ids` array approach used in `ExplorePage`.

---

### components/HomePage (`src/app/components/HomePage.tsx`)

**What it does:** An alternate dashboard style showing the user's stats (circles joined, badges, active tickets, portfolio items, moments shared), a quick-access grid for key personal spaces, the 5 most recent posts from their circles, a recommended circles widget, and a "My Applications" widget.

**Data loaded:**
- User's circles (where `member_ids` contains profile.id)
- Recent posts from those circles (up to 5, newest first)
- Platform-wide counts: courses (via circle overlap), program applications, portfolio items, moments posts, documents authored
- Active access tickets via `accessTicketService`
- User badges via `useUserBadges` hook

**User actions:** Click-through links to circles, badges, tickets, portfolio, moments, courses, programs, documents, and the Explore page.

**Known issues / gaps:** This version is not the active route per App.tsx routing; it may be a legacy or alternate implementation kept for reference.

---

## News (`/news`)

**Source:** `src/app/components/NewsPage.tsx`

**What it does:** A platform-wide community bulletin board. Shows administrator announcements (pinned ones first), upcoming events for the next 30 days, recently joined members, recent posts, and recent forum threads. Includes three platform-wide stats: total members, active circles, upcoming events.

**Data loaded:**
- `announcements` table — ordered pinned-first, then newest (up to 10)
- `events` — upcoming in next 30 days (up to 5)
- `users` — most recently created (up to 5)
- `posts` — newest (up to 5) with author join
- `forum_threads` — newest (up to 5) with author join
- Aggregate counts: `users` total, `circles` total

**User actions:**
- Click announcements to read full text inline (no dedicated detail page)
- Click events to navigate to `/calendar`
- Click members to navigate to `/members/:id`
- Click posts to navigate to `/feed`
- Click threads to navigate to `/forums`

**Tabs / sub-views:** None.

**Known issues / gaps:**
- Announcement items have no click-through to a detail route — full content is rendered inline and truncation is only prevented by the whitespace-pre-wrap style.
- Recent posts link to `/feed` rather than the individual post.
- Recent threads link to `/forums` rather than the individual thread.
- The page is not listed in the sidebar's `DiscoverSection` component — it is likely surfaced elsewhere in the nav.

---

## Explore Containers (`/explore`)

**Source:** `src/app/components/ExplorePage.tsx`

**What it does:** Shows all discoverable containers the current user has permission to see, grouped by container type. Unauthenticated guests see only open circles; authenticated users see all container types their membership class permits. Users can search, filter by type, sort, and join containers directly from the list.

**Data loaded:**
- Container types visible to the user are determined by `userPermissions.visible_containers` filtered against `DISCOVERABLE_CONTAINER_TYPES` from `visibility-access.ts`
- All containers from each accessible type table are fetched in parallel
- `content_favorites` table queried per type to flag `is_favorited`
- `content_likes` queried per type to compute `like_count` and `is_liked`
- Guests and users without permissions fall back to only seeing open circles

**User actions:**
- Full-text search across name, description, tags
- Sort by Newest / Oldest / Most Liked
- Filter by container type via checkboxes (Select All / Deselect All)
- Toggle "Exclude from My Favorites" checkbox (default: on — hides already-favorited items)
- Join open containers directly (optimistic update to `member_ids` array)
- Request to join request-access containers (shows toast; no DB write yet — stub only)
- Favorite / like containers via `ContainerCard` component
- Navigate to individual container detail pages

**Tabs / sub-views:** No tabs. Types are rendered as named sections with count badges.

**Known issues / gaps:**
- "Request to join" is a stub — it shows a success toast but does not write a join request to the database.
- Invite-only containers block join with a toast; there is no in-UI way to contact the admin.
- Guest view shows read-only cards with no interaction beyond a sign-up CTA.

---

## Browse Content (`/explore/content`)

**Source:** `src/app/pages/ExploreContentPage.tsx`

**What it does:** Lets any authenticated user browse platform-wide content (not containers) across seven types: Blogs, Episodes, Documents, Books, Decks, Reviews, Events. Each type is its own tab with its own search, sort, and paginated item list.

**Data loaded:**
- Each tab independently queries its respective table (blogs, episodes, documents, books, decks, reviews, events)
- Fields fetched: id, title/name, description/summary, created_at/start_time, tags
- Like counts fetched from `content_likes` per visible page of items (authenticated users only)
- Pagination: 25 items per page with a "Load more" button (infinite-style)
- Most-liked sort: fetches up to 100 items then sorts client-side by like count

**User actions:**
- Switch between type tabs (Blogs, Episodes, Documents, Books, Decks, Reviews, Events)
- Search within the active tab (client-side filter on already-loaded items)
- Sort: Newest / Oldest / Most Liked
- Load more (fetches next 25 from DB)
- Click any item to navigate to its detail page

**Tabs / sub-views:** One tab per content type. Each tab has its own independent state (search query, sort, page).

**Known issues / gaps:**
- "Most Liked" sort fetches up to 100 items then sorts in memory — does not paginate by like count. Items outside the top 100 by date are invisible to the most-liked sort.
- Author information is not fetched or displayed on cards.
- Search only filters the already-loaded items; it does not re-query the DB for matches beyond the current page.

---

## Topics (`/topics`)

**Source:** `src/app/pages/TopicsPage.tsx`

**What it does:** Displays the structured topic taxonomy, letting users browse all topics and watch/unwatch them. Topics are organized along three axes: **WHO** (audience/identity), **WHY** (goals/purpose), and **Themes** (industry/cross-cutting). Each topic shows follower count, linked content count, and its type badge.

**Data loaded:**
- Topics fetched from a Supabase Edge Function: `GET /topics/grouped` — returns `{ success, grouped: { audience, purpose, theme } }`
- Each topic includes: id, name, slug, description, icon, color, topic_type, is_featured, follower_count, content_count
- Followed topics fetched from `topic_followers` for authenticated users (used to set watch button state)

**User actions:**
- Switch between tabs: Featured / WHO / WHY / Themes
- Search across all topics by name or description (client-side)
- Watch / unwatch a topic via the bell icon (calls Edge Function: `POST /topics/:id/follow` or `/unfollow`)
- Click a topic card to navigate to `/topics/:slug` (topic detail page)

**Tabs / sub-views:** Four tabs — Featured (is_featured = true), WHO (audience), WHY (purpose), Themes.

**Known issues / gaps:**
- Data depends on `topics/grouped` Edge Function being deployed and seeded. Shows explicit error states if the function is unavailable or the table is empty, including SQL hints for seeding.
- The "Featured" tab shows topics where `is_featured = true` — there is no admin UI visible in this file to set that flag (managed separately in admin/TopicsManagement).
- Follow/unwatch calls the Edge Function using the public anon key, meaning server-side auth validation must be handled in the function itself.

---

## Tags (`/tags`)

**Source:** `src/app/pages/TagsPage.tsx`

**What it does:** Displays the tag vocabulary, letting users browse tags and subscribe/unsubscribe to them. Tags are organized along two axes: **WHAT** (subject matter) and **HOW** (format/delivery method). Each card shows usage count, category, and type badge.

**Data loaded:**
- Tags fetched from Edge Function: `GET /tags/suggestions/grouped` — returns `{ success, grouped: { what, how, status } }`
- Each tag includes: id, tag, slug, type, description, category, usage_count
- Followed tags fetched from `tag_followers` for authenticated users (normalized to lowercase)
- Popular tab: client-side sort of all tags by usage_count, top 30

**User actions:**
- Switch between tabs: Popular (top 30 by usage_count) / WHAT / HOW
- Search across tags by tag text, description, or category (client-side)
- Follow / unfollow a tag via the bell icon (direct Supabase insert/delete on `tag_followers`)
- Click a tag card to navigate to `/tags/:tag` (encoded)

**Tabs / sub-views:** Three tabs — Popular, WHAT, HOW. The `status` group from the API is fetched but has no dedicated tab.

**Known issues / gaps:**
- The `status` tag group is fetched but not shown in any tab — it is silently merged into `allTags` for the Popular sort but has no own display tab.
- Follow/unfollow writes directly to Supabase from the client without going through the Edge Function (unlike topic follow which uses the function).
- Same Edge Function dependency risk as Topics: explicit error state shown if unavailable.

---

## Rankings (`/rankings`)

**Source:** `src/app/pages/RankingsPage.tsx`

**What it does:** Shows the most-used tags and most-active/most-watched topics across the platform, ranked in a leaderboard format with medal icons for top 3.

**Data loaded:**

**Tags tab:**
- Queries the `tags` column from 17 content and container tables (blogs, episodes, documents, books, decks, reviews, events, tables, pitches, builds, standups, sprints, meetups, playlists, magazines, libraries, checklists)
- Only rows where `visibility = 'public'` are included; tables without a visibility column fail silently via `Promise.allSettled`
- Aggregates tag usage counts in JavaScript, normalizes to lowercase, ranks top 100

**Topics tab:**
- Queries `topics` table for all topics
- Queries `topic_links` to count linked content items per topic
- Queries `topic_followers` to count watchers per topic
- Ranks top 100 by content count (default) or watcher count

**User actions:**
- Switch between "Top Tags" and "Top Topics" tabs
- Search by tag text or topic name/description (client-side)
- Toggle Topics sort: By Content vs By Watchers
- Click a tag to navigate to `/tags/:tag`
- Click a topic to navigate to `/topics/:slug`

**Tabs / sub-views:** Two tabs — Top Tags, Top Topics. Topics tab has an inline sort toggle.

**Known issues / gaps:**
- A warning banner is shown if any of the 17 table queries fail (e.g., if a table doesn't have a `visibility` column). Rankings will be incomplete in those cases.
- Tag counts only include publicly-visible content; member-only content is excluded from the tally.
- Tags tab fetches up to all rows from all 17 tables — there is no limit, which could be slow on large datasets.

---

## My Feed (`/discovery/feed`)

**Source:** `src/app/pages/DiscoveryFeedPage.tsx`

**What it does:** A personalized activity feed that aggregates content from five sources: people the user follows, people who follow the user, mutual connections (friends), watched topics, and followed tags. All data is fetched once on load; source filters operate in-memory without re-fetching.

**Data loaded (all in parallel on load):**
- Social graph: `user_connections` for following and follower IDs; friends = intersection
- Topic subscriptions: `topic_followers` with join to `topics` for topic names
- Tag subscriptions: `tag_followers`
- Person-based content (posts, forum_threads, documents, builds, pitches, events, endorsements) from `PERSON_TABLES` — up to 30 newest per table from all followed/follower authors
- Topic-linked content via `topic_links` then content tables — up to 20 per type, up to 200 links total
- Tag-matched content via `overlaps('tags', tagNames)` across 6 tables — up to 15 per table
- Author profiles batch-fetched for all content found
- Total feed capped at 150 items, sorted newest-first

**User actions:**
- Toggle source checkboxes: Following (default on), Followers (default off), Friends (default on), Topics (default on), Tags (default on)
- Search feed by title, description, or author name (client-side)
- Refresh button re-fetches everything
- Click any feed item to navigate to its detail page

**Tabs / sub-views:** None. Single unified list labeled "Recent Activity".

**Known issues / gaps:**
- Default filter excludes "Followers" — content from people who follow you but who you don't follow back is hidden unless explicitly enabled.
- The 150-item cap means a busy feed will silently truncate older content.
- Topic content fetches up to 200 `topic_links` then resolves them — if a user watches many active topics this could be slow.
- No pagination or infinite scroll; the full load happens once per session unless the user clicks Refresh.

---

## Most Liked (`/discovery/most-liked`)

**Source:** `src/app/pages/MostLikedPage.tsx`

**What it does:** Surfaces the most-liked content across all content and container types, ranked by community like counts. Supports time-range filtering (This Week / This Month / This Year / All Time) and type filtering.

**Data loaded:**
1. Fetches all `content_likes` rows (optionally filtered by `created_at >= cutoff`) — no per-user filter, this is platform-wide
2. Aggregates like counts in JavaScript: groups by (content_type, content_id), sorts descending, takes top 50
3. Batch-fetches content details (title, description, created_at) for those 50 items grouped by type
4. Assembles final ranked list and assigns rank numbers

**Content types covered:** post, thread, event, course, document, review, build, pitch, book, deck, episode, program, blog, magazine, playlist (15 types total)

**User actions:**
- Select time range: This Week / This Month (default) / This Year / All Time — triggers a re-fetch
- Filter by content type (pill buttons; only types present in results are shown)
- Search by title or description (client-side)
- Clear filters button when type or search filter is active
- Click any ranked item to navigate to its detail page

**Tabs / sub-views:** None.

**Known issues / gaps:**
- Fetching all `content_likes` rows with a date filter but no type or count filter could be expensive at scale — no server-side aggregation.
- The top-50 cap means very active platforms could miss items that have many likes but fall outside the top 50 by count before detail lookups.
- Type filter pills appear only after data loads; initial render shows no filter pills.

---

## My Favorites (`/my-content`)

**Source:** `src/app/components/MyContentPage.tsx`

**What it does:** Shows every item the logged-in user has favorited across all content and container types, grouped into two sections (Content and Containers) with type-filter checkboxes. Unfavoriting an item removes it from the list immediately (optimistic update). Also displays the total favorites count, which the sidebar uses for its badge.

**Data loaded:**
- `content_favorites` table queried for all rows where `user_id = profile.id`
- Groups results by `content_type`, then batch-fetches item details from the corresponding tables (up to 20 types)
- Fields fetched per item: id, title/name field, slug (if applicable), created_at

**Content types supported (FAV_TYPES registry):**

| Group | Types |
|-------|-------|
| Content | Episode, Book, Document, Playlist, Deck, Course, Program, Magazine, Blog |
| Container | Circle, Table, Elevator, Meeting, Pitch, Build, Standup, Meetup, (Moment implied) |

**User actions:**
- Filter by content group (Content / Containers) via tab or checkbox
- Filter by specific type via checkbox pills (only shows types with at least one favorited item)
- Search by title (client-side)
- Unfavorite an item (removes from `content_favorites`, removes from list immediately)
- Click any item to navigate to its detail page

**Tabs / sub-views:** Two sections — Favorited Content and Favorited Containers — each with their own type filter checkboxes.

**Known issues / gaps:**
- The sidebar `DiscoverSection` links to `/my-content` but the route file shows `/my-subscriptions` also redirects here (legacy alias).
- There is a separate `/my-contents` route (`MyContentsPage`) which is a URL/link management tool — not the same as favorites. The naming is confusingly similar.
- No sort controls — items appear in the order they come back from the DB (insertion order of favorites).

---

## Discover Guide (`/help/discover`)

**Source:** `src/app/pages/DiscoverGuidePage.tsx` *(built April 2026)*

**What it does:** A static guide page explaining each area in the Discover section. Covers 7 sections — Explore, Explore Content, Topics, Tags, Rankings, Discovery Feed, Most Liked — each with a description, a "Go" button, and a tips panel. Includes a quick-tips strip at top and a "Related areas" row at the bottom (Browse Members, Link Library, My Saved Content). Listed in the sidebar (`DiscoverSection.tsx`) with a `HelpCircle` icon.

**Data loaded:** None — fully static content.

**User actions:** Click "Go" on any section card to navigate directly to that route.

**Known issues / gaps:** None.

---

## Supporting Notes

### Favorites storage
Favorites are stored in `content_favorites` (columns: `user_id`, `content_type`, `content_id`). Container type keys are stored as singulars (e.g., `circle`, not `circles`). The `ExplorePage` handles the plural-to-singular conversion with a local helper function. The `FavoriteButton` shared component (`src/app/components/shared/FavoriteButton.tsx`) abstracts toggle logic for use across container and content detail pages.

### Likes storage
Likes are stored in `content_likes` (columns: `user_id`, `content_type`, `content_id`, `created_at`). The same singular content type convention applies. Like counts are computed client-side by most pages rather than through a stored aggregate column.

### Topic follow vs tag follow
- Topic follows are routed through a Supabase Edge Function (`make-server-d7930c7f`) using the public anon key.
- Tag follows write directly to `tag_followers` via the Supabase JS client.
- Both are read from their respective tables (`topic_followers`, `tag_followers`) client-side on page load.

### Access gating on Explore Containers
Container type visibility is driven by `userPermissions.visible_containers` — a list of container type codes the user's membership class can see. Users with no permissions see only open circles. The upgrade prompt links to `/my-payments`.
