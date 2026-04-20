# Sidebar Section: Common Containers

> This sidebar section is dynamically filtered — it only shows container types the user's class is permitted to access, as configured in the Container Configuration matrix.

Containers are collaborative spaces with `member_ids` and `admin_ids`.
Visibility: `public | member | private` (some pages also reference `unlisted`). Access gated by user class.

All containers support favorites (`content_favorites`), likes (`content_likes`), and lifecycle states via `fetchAndEnrichLifecycle`.

---

## Tables (`/tables`) — min class: 3

**Purpose:** Lightweight participation spaces organized by topic. Described in the UI as "Discover Tables — Find and join lightweight participation spaces organized by topic." General-purpose community gathering containers; the document-sharing variant of a group.

**Browse page:** `TablesPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Members | Most Liked
- Filter toggle: "Mine" (created_by, member, or admin)
- Visibility filtered via `filterByVisibility` helper
- Join/Leave buttons on each card
- Favorites and likes enriched per row
- Lifecycle state enriched via `fetchAndEnrichLifecycle`
- Grid: 3 columns (lg)

**Detail page:** `TableDetailPage.tsx`
- Route: `/tables/:slug`
- Header: name, description, cover image, member count, visibility label, creator, admins, tags
- Access gate: non-members see a "Members Only" wall with a Join button when `canViewContainer` fails
- Tabs: Documents | Reviews | Feed | Members
  - Documents: lists documents with `table_ids` containing this table's id; members can add documents via inline dialog (title, description, URL)
  - Reviews: `ContainerReviews` component (`containerType="table"`)
  - Feed: `ContainerFeed` component
  - Members: grid of member cards with admin badge
- Actions: Join / Leave / Settings (admin) / PrivateCommentDialog (non-creator)
- Shareable URL widget (`ShareInviteInline`)
- Split candidate note in file: ~499 lines — suggests extracting sub-components

**Create flow:** `/tables/create` link (button in browse header). Create page not in component list (no `CreateTablePage.tsx` found in components directory — may be in a sub-directory or use a shared form).

**Visibility controls:** `visibility` column is read and passed to `filterByVisibility` and `canViewContainer`. No `PrivacySelector` found in the detail page or any table form visible from the component. Correctness of visibility UI on create/settings pages was not confirmed from components reviewed.

**Known issues / gaps:**
- No `CreateTablePage.tsx` found in the top-level components directory (may exist elsewhere; not confirmed).
- The TableDetailPage shows visibility as "Public" or "Members Only" only — does not surface a `private` value separately in the UI label.
- Split refactor recommended per inline comment at line 2.

---

## Meetings (`/meetings`) — min class: 3

**Purpose:** Scheduled gatherings combining networking, events, and shared documents. Described in header as "Scheduled gatherings combining networking, events, and shared documents." Each meeting can optionally link to an `event_id` and `sponsor_id`.

**Browse page:** `MeetingsPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Members | Most Liked
- Filter toggle: "Mine"
- Visibility filtered via `filterByVisibility`
- Join button is hidden on cards (`showJoinButton={false}`) — joining is done from detail page
- Fetches related `events` and `sponsors` tables in parallel on load (but does not display event/sponsor info in the grid cards directly, only available for data joining)
- Favorites and likes enriched per row

**Detail page:** `MeetingDetailPage.tsx` (in `src/app/components/meeting/`)
- Route: `/meetings/:slug`
- Tabs: Event | Feed | Reviews | Members (from component imports: `ContainerFeed`, `ContainerReviews`)
- Event tab: shows linked `event` with datetime, location, virtual link, RSVP controls (attending / maybe / declined)
- Members: list with RSVP status, intros, and join time
- Member RSVP: members can update their `rsvp_status` and `intro` text
- Actions: Join (via membership record in `meeting_members` table), Settings (admin), Share, PrivateCommentDialog
- Access gate: `canViewContainer` enforced

**Create flow:** `/meetings/create` → `CreateMeetingPage.tsx` (in `meeting/` sub-directory).

**Visibility controls:** `visibility` field present on the `Meeting` interface (`public | member | unlisted | private`). Browse page uses `filterByVisibility`. No `PrivacySelector` usage confirmed in create/settings pages from components reviewed.

**Known issues / gaps:**
- `showJoinButton={false}` on browse cards — users must navigate to detail to join, which is inconsistent with most other containers.
- The `meetings` table is also used as a sub-type within Meetups (`meetup_id` FK). The two concepts can conflict in documentation and UX.

---

## Libraries (`/libraries`) — min class: 3

**Purpose:** Curated collections of documents. Described as "Organize and discover documents across the platform." Three library types: `system` (platform-managed), `auto_generated` (filter-rule driven), and `manual` (user-curated with folders).

**Browse page:** `LibrariesPage.tsx`
- Two tabs: "My Libraries" (owner_type=user, owner_id=current user) and "Discover" (system + public)
- Discover tab sections: "Smart Views" (system libraries) and "Community Libraries" (public manual/auto libraries)
- Sort: Newest | Oldest | Most Liked (no "Most Members" — libraries do not surface member_count in browse)
- System libraries auto-initialize via `initializeSystemLibraries()` on first load
- Document counts fetched per library
- No `filterByVisibility` — uses raw `is_public` boolean (see Known Issues)
- Library card links to `/libraries/:id` (UUID, not slug)

**Detail page:** `LibraryDetailPage.tsx`
- Route: `/libraries/:id`
- No tabs — single scrollable page
- View mode toggle: Folders | All Documents (for manual libraries with folders)
- Folder tree component: recursive, supports nested subfolders, expand/collapse
- Folder admin actions: Create, Rename, Move, Delete sub-folder (via `FolderManagementDialogs`)
- Document admin actions: Move to Folder, Remove from Library (does not delete the document)
- Admin (owner or admin_ids): can add documents via `AddDocumentsDialog`, create folders
- Visibility badge shows `is_public` (Public / Private)
- `useViewTracking` call is commented out
- System library "Shared with Me" is stubbed — returns all public documents as fallback

**Create flow:** `/libraries/create` → `CreateLibraryPage.tsx`.

**Visibility controls:** Uses `is_public` boolean, not the `visibility` column. This is a **known migration gap** (April 2026 migration). Discover tab query filters by `is_public.eq.true` and "My Libraries" shows all owned libraries regardless of `is_public`.

**Known issues / gaps:**
- `is_public` boolean instead of `visibility` column — this is the documented April 2026 migration gap. The browse page `or` query at line 84 uses `is_public.eq.true`, not `visibility`.
- "Shared with Me" system library is unimplemented — falls back to all public documents.
- `auto_generated` library document count always returns 0 (TODO comment at line 109).
- `useViewTracking` is commented out (line 130–131).
- Libraries route uses UUID in URL, not a slug, which is inconsistent with other containers.
- No `member` visibility concept in the UI — only public/private toggle.

---

## Checklists (`/checklists`) — min class: 3

**Purpose:** Task lists for sprints, projects, and onboarding. Called "Lists" in the UI (PageHeader title is "Lists", breadcrumb label is "Lists"). Supports templates: any checklist can be flagged `is_template` and cloned.

**Browse page:** `ChecklistsPage.tsx`
- Search by name or description
- Filter: category pills (dynamic from data), Templates Only toggle
- Sort: Newest | Oldest | Most Liked
- Stats row: Total Lists | Templates | Active Lists
- No "Mine" filter toggle (unlike most other containers)
- Progress bar per card showing completion %
- No `filterByVisibility` — all checklists are fetched without visibility filtering
- No join/leave functionality in browse

**Detail page:** `ChecklistDetailPage.tsx`
- Route: `/checklists/:id`
- Single-page layout (no tabs)
- Header: name, description, category, template badge, creator info, progress bar
- Edit mode (inline): edit name, description, category, is_template flag
- Items list: check/uncheck, move up/down, delete, add new item (text, assignment, notes)
- "Use Template" button: clones checklist and items with `is_template: false`, adds current user to `member_ids`
- Share button (`ShareInviteButton`), PrivateCommentDialog
- Edit and Delete available to any logged-in viewer (no role check — all users can edit)

**Create flow:** `/checklists/new` → `CreateChecklistPage.tsx`.

**Visibility controls:** No visibility field in the UI on either browse or detail pages. No `filterByVisibility` call. No `PrivacySelector` in forms. All checklists are effectively public within the platform.

**Known issues / gaps:**
- No visibility field in the UI at all — this is a **documented known gap**.
- No access control on edit/delete in `ChecklistDetailPage` — any authenticated user can edit or delete any checklist.
- Browse page has no "Mine" filter, inconsistent with other containers.
- Checklist items in `SprintDetailPage` show only the first 3 items as a preview; users must navigate to the checklist detail for full view.
- `ChecklistsPage` redirects to `/checklists/setup` if the `checklists` table doesn't exist (error code check at line 71).

---

## Standups (`/standups`) — min class: 7

**Purpose:** Async status-sharing spaces for teams. Described as "Share what you're working on with your team." Members post standup updates within the container.

**Browse page:** `StandupsPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Members | Most Liked
- Filter toggle: "Mine"
- Visibility filtered via `filterByVisibility`
- Join/Leave buttons on cards via `onJoin`/`onLeave`
- Favorites and likes enriched

**Detail page:** No `StandupDetailPage.tsx` found in the top-level components directory or known sub-directories. No detail page file was identified in this codebase review.

**Create flow:** `/standups/create` link shown in browse header. No `CreateStandupPage.tsx` found in the top-level components directory.

**Visibility controls:** `visibility` field present on `Standup` interface (`public | member | unlisted | private`). Browse uses `filterByVisibility`. No detail or create page reviewed.

**Known issues / gaps:**
- **No detail page found** — `StandupDetailPage.tsx` was not located. The browse page links to `/standups/:slug` but no detail component was identified. This is a significant gap.
- No create page found (`CreateStandupPage.tsx` absent from components).
- Standup is classified as min class 7 but no class gate is visible in the browse component itself (class gating may be at router level).

---

## Sprints (`/sprints`) — min class: 7

**Purpose:** Time-boxed collaborative challenges with attached checklists. Described as "Time-boxed collaborative challenges with lists." Sprints have `start_date` and `end_date`; status is derived as upcoming/active/completed.

**Browse page:** `SprintsPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Members | Most Liked
- Filter toggle: "Mine"
- Inline visibility filter (not using `filterByVisibility` helper — custom logic: public/member/unlisted/private)
- Create button only shown for `profile.role === 'super'` (super admins only)
- Fallback to `/checklists/setup` if sprints table not configured
- Slug falls back to `id` if slug column doesn't exist (error code `42703` handled)

**Detail page:** `SprintDetailPage.tsx`
- Route: `/sprints/:slug`
- Header: name, description, status badge (upcoming/active/completed), date range, days remaining, member count
- Overall progress bar across all attached checklists
- Checklists section: lists attached checklists with per-checklist progress preview (first 3 items shown)
- Admin: can add checklists via dialog (search + multi-select), remove checklists
- Non-admin: view-only
- Access gate: `canViewContainer`, redirects to `/sprints` if blocked
- Settings link for admins: `/sprints/:slug/settings`
- PrivateCommentDialog for non-creators

**Create flow:** `/sprints/new` → `CreateSprintPage.tsx`. Only super admins see the Create button in browse.

**Visibility controls:** `visibility` field present on `Sprint` interface (`public | member | unlisted | private`). Browse page has custom visibility filter logic (not using the shared `filterByVisibility` helper). No `PrivacySelector` confirmed in create/settings forms.

**Known issues / gaps:**
- Create button is restricted to `super` role in browse — regular class-7 users cannot create sprints from the browse page, which may be intentional (admin-managed sprints) or a gap.
- Slug column is handled with graceful fallback to `id`, suggesting slug was added to the schema after initial launch.
- Sprint detail does not have a feed or reviews tab (unlike Tables, Meetings, etc.).

---

## Elevators (`/elevators`) — min class: 10

**Purpose:** Networking hubs for member introductions. Described as "Find and join networking hubs to connect with others." Elevators feature a member intro field — each member writes a short intro when joining, visible to other members.

**Browse page:** `ElevatorsPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Members | Most Liked
- Filter toggle: "Mine"
- No `filterByVisibility` call (all elevators fetched, no visibility filter applied in this component)
- Join/Leave buttons on cards
- Lifecycle state enriched

**Detail page:** `ElevatorDetailPage.tsx` (in `src/app/components/elevator/`)
- Route: `/elevators/:slug`
- Tabs: Members | Feed
- Members tab: grid of member cards with intro text visible
- Feed tab: `ContainerFeed`
- Join: opens `JoinElevatorDialog` — requires user to write an intro before joining; intro stored in `elevator_members` table
- Members can edit their intro via `EditIntroDialog`
- Admin can remove members and edit elevator settings
- Access gate: `canViewContainer` with Members Only wall

**Create flow:** `/elevators/create` → `CreateElevatorPage.tsx` (in `elevator/` sub-directory).

**Visibility controls:** `visibility` field is present on the Elevator record and passed to `canViewContainer`. Browse page does not call `filterByVisibility` — visibility filtering may be missing from the browse list.

**Known issues / gaps:**
- Browse page (`ElevatorsPage.tsx`) does not call `filterByVisibility` — all elevators are returned from the query without visibility gating at the component level. Member-only elevators may be visible in the list to non-members (though join is gated).
- No reviews tab in the detail page (other containers have reviews).

---

## Pitches (`/pitches`) — min class: 10

**Purpose:** Showcase and collaboration containers for pitching ideas or projects. Described as "Showcase your ideas and projects." Supports a pitch URL (embeddable), a video URL (YouTube embed), documents, and reviews.

**Browse page:** `PitchesPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Liked (no Most Members)
- Filter toggle: "Mine"
- Custom visibility filter (inline logic, not `filterByVisibility` helper) — includes `unlisted` pass-through
- Join button hidden (`showJoinButton={false}`)
- Lifecycle state enriched

**Detail page:** `PitchDetailPage.tsx`
- Route: `/pitches/:slug`
- Header: name, description, long_description, visibility badge, tags, pitch URL link, video URL link
- Cover image
- Pitch video: YouTube embed via `YouTubeEmbed` component
- Pitch URL: inline iframe embed with domain-based `canEmbedUrl()` check; falls back to "Open in Window" / "Open in Tab" buttons for blocked domains (list includes LinkedIn, Twitter, Notion workspace, etc.)
- Document preview: first document's URL is also iframe-embedded inline
- Meta card: creator, created date, document count, review count
- Tags with links
- Sponsor section (if `sponsor_id` set)
- Director section (`DirectorInfo` component, if `director_id` set)
- Documents section: list of attached documents, admin can add via `AddDocumentDialog`
- Reviews section: list of attached reviews, admin can add via `AddReviewDialog`
- Actions: Join, Favorite (`FavoriteButton`), PrivateCommentDialog, Settings (admin)
- View tracking (`useViewTracking`)
- Access gate: `canViewContainer`
- Shareable URL widget

**Create flow:** `/pitches/create` link in browse header. No `CreatePitchPage.tsx` found in the top-level components directory (may exist in a sub-directory).

**Visibility controls:** `visibility` field present (`public | member | unlisted | private`). Browse uses custom inline filter. Detail shows visibility badge. No `PrivacySelector` confirmed in create/settings.

**Known issues / gaps:**
- TODO comment at line 837 of detail page: `// TODO: Create AddReviewDialog component for pitches` — but `AddReviewDialog` is imported and used, so the TODO may be stale.
- No `CreatePitchPage.tsx` found in top-level components directory.
- Pitch detail has no dedicated tabs — all content sections are sequential cards, which becomes unwieldy for pitches with many documents/reviews.

---

## Builds (`/builds`) — min class: 10

**Purpose:** Document collections for projects, initiatives, and collaborative work. Described as "Document collections for projects, initiatives, and collaborative work." Supports forking — public builds can be forked by other users.

**Browse page:** `BuildsPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Liked (no Most Members)
- Filter toggle: "Mine"
- Custom inline visibility filter (not `filterByVisibility` helper)
- Join button hidden (`showJoinButton={false}`)
- Displays `documentCount` and `reviewCount` on cards
- Lifecycle state enriched

**Detail page:** `BuildDetailPage.tsx`
- Route: `/builds/:slug`
- Header: name, visibility badge, description, admin badge
- Action bar: Join, Favorite, PrivateCommentDialog, Fork button (if public and not owner), fork count (if owner)
- Fork lineage banner (`ForkLineage` component) if this build is a fork of another
- Cover image
- Meta card: creator, date, document count, review count, tags
- Documents section: list with external link button, admin can add via `AddDocumentDialog` (junction table `build_documents`)
- Reviews: `ContainerReviews` component (junction table `build_reviews`)
- Favorite triggers `extendOnEngagement` hook
- Access gate: `canViewContainer`
- Shareable URL widget

**Create flow:** `/builds/new` link in browse header. No `CreateBuildPage.tsx` found in top-level components directory.

**Visibility controls:** `visibility` field uses `public | member | private` (note: no `unlisted` in the Build interface, unlike other class-10 containers). Browse uses custom inline filter. Detail shows visibility badge. No `PrivacySelector` confirmed.

**Known issues / gaps:**
- No `CreateBuildPage.tsx` found in top-level components directory.
- Builds use `build_documents` and `build_reviews` junction tables rather than the array-column pattern used by other containers; this is architecturally different.
- No feed tab in the detail page.

---

## Meetups (`/meetups`) — min class: 10

**Purpose:** Recurring event series with multiple meetings. Described as "Recurring event series with multiple meetings." A Meetup is the parent container; individual `meetings` records link back to a meetup via `meetup_id`.

**Browse page:** `MeetupsPage.tsx`
- Search by name or description (no tag search)
- Sort: Newest | Oldest | Most Members | Most Liked
- Filter toggle: "Mine"
- Custom visibility filter (inline; public or member_ids includes user or super)
- Scoped to `community_id` — queries filter by `profile?.community_id` (both meetups and meetings)
- Join button hidden (`showJoinButton={false}`)
- Meeting count per meetup shown via secondary fetch
- Favorites and likes enriched

**Detail page:** `MeetupDetailPage.tsx` (in `src/app/components/meetup/`)
- Route: `/meetups/:slug`
- Tabs: Overview | Meetings | Documents | Reviews | Feed | Members
  - Overview: description, tags, member count, next meeting info
  - Meetings: list of child meetings linked via `meetup_id`, ordered by `event_date`; admin can add new meetings via `AddMeetingToMeetupPage`
  - Documents: `CircleDocuments` component (reused from circles — not a container-specific component)
  - Reviews: `ContainerReviews`
  - Feed: `ContainerFeed`
  - Members: grid of member profiles
- Actions: Join, Settings (admin), Share, PrivateCommentDialog
- Access gate: `canViewContainer`

**Create flow:** `/meetups/create` → `CreateMeetupPage.tsx` (in `meetup/` sub-directory).

**Visibility controls:** `visibility` field present (`public | member | unlisted | private`). Detail uses `canViewContainer`. No `PrivacySelector` confirmed in forms.

**Known issues / gaps:**
- Meetup browse queries are scoped by `community_id` — meetups from other communities are not surfaced. This may be intentional but is not documented in the UI.
- Documents tab reuses `CircleDocuments` (the circles component), not a meetup-specific component. This means document column behavior is tied to circles schema.
- No `filterByVisibility` helper used in browse (custom inline logic).

---

## Magazines (`/magazines`) — min class: 10

**Purpose:** Curated collections of articles (blogs). Described as "Curated collections of articles and resources." Supports subscribe/unsubscribe model (not join/leave). Three curation types: `auto`, `curated`, `hybrid`. Curator is the owner (not `created_by` — field is `curator_id`).

**Browse page:** `MagazinesPage.tsx`
- Search by name, tagline, description
- Sort: Newest | Oldest | Most Liked | Most Subscribed
- No "Mine" filter toggle
- No `filterByVisibility` — all magazines returned without visibility gating in this component
- Subscribe/Unsubscribe from browse card
- Uses custom `MagazineCard` component (not `ContainerCard`)
- Does not use `PageHeader` — has a plain inline header
- Gracefully handles missing `magazines` table (error code `42P01` → sets empty state)
- TODO comment in query: `// Join topics if possible` — topic join is not implemented in the list query

**Detail page:** `MagazineDetailPage.tsx` (in `src/app/components/magazines/`)
- Route: `/magazines/:id` (UUID, not slug — inconsistent with most containers)
- Tabs: Articles | Subscribers | Manage (owner/admin only)
- Articles tab: list of `Blog` records in the magazine, with search/filter; curated/hybrid owners can add blogs via blog search
- Subscribers tab: list of subscribers with avatars
- Manage tab: edit name, tagline, description, icon, cover image, curation type, publishing frequency, topics, visibility; archive/delete actions
- Subscribe/Unsubscribe button in header
- Like, Favorite, Share, Rating, PrivateCommentDialog in engagement bar
- Owner = `curator_id` (not `created_by`)

**Create flow:** `/magazines/create` → `CreateMagazineForm.tsx` (in `magazines/` sub-directory).

**Visibility controls:** `MagazinesPage` uses `is_public` boolean for filtering in queries (line 84: `is_public.eq.true`). `MagazineDetailPage` has a `visibility` field in the interface (`public | member | unlisted | private`) and the Manage tab lets owners set `visibility`. There is a TODO comment in `MagazinesPage` interface (line 33): `// TODO: update to use visibility field once normalize-magazines-visibility.sql migration has run`.

**Known issues / gaps:**
- Browse page still uses `is_public` boolean — **documented known gap** (same migration issue as Libraries). TODO comment in the interface explicitly calls this out.
- Browse page has no `filterByVisibility` — `member` visibility magazines are not hidden from non-members in the list.
- No `member_ids` / `admin_ids` displayed or managed in browse; these fields exist in the interface from `LibraryDetailPage` but the Magazine detail uses `curator_id` and subscribers, not the standard member/admin pattern.
- Topic join in the browse query is a TODO — topics are not joined in the list fetch.
- Magazine detail uses UUID in URL, not a slug.

---

## Playlists (`/playlists`) — min class: 10

**Purpose:** Curated collections of episodes for structured learning. Described as "Curated collections of episodes for structured learning." Episodes are ordered and stored in `episode_ids` array (with legacy `video_ids` fallback).

**Browse page:** `PlaylistsPage.tsx`
- Search by name, description, or tags
- Sort: Newest | Oldest | Most Liked
- Filter toggle: "Mine" (by `author_id`, not `created_by` — note field name difference)
- Tag filter panel (AND logic — must match all selected tags)
- Topic filter panel (OR logic — match any selected topic via `topic_links` junction table)
- Toggle button to show/hide filters panel
- Engagement metrics fetched separately: likes, ratings/reviews, shares per playlist
- Episode count derived from `episode_ids` or `video_ids` array length
- No `filterByVisibility` helper — browse lists all playlists regardless of visibility (visibility filtering not applied)
- Uses custom `PlaylistCard` component (not `ContainerCard`) for rich display with metrics
- `PrivacySelector` is used in `PlaylistDetailPage` Manage tab with `contentType="playlist"` — this is the only container reviewed where `PrivacySelector` is correctly used with the `mode`/`contentType` prop

**Detail page:** `PlaylistDetailPage.tsx`
- Route: `/playlists/:slug` (also handles UUID fallback)
- Tabs: About | Episodes | Members | Manage (owner/admin only)
- About tab: engagement bar (Like, Favorite, Share, Rating), description, tags, stats (episode count, member count, visibility)
- Episodes tab: ordered list with watch links; owner can add episodes (`AddEpisodeDialog`), reorder (up/down buttons), remove
- Members tab: grid of member profiles with join/leave
- Manage tab: edit name, description, slug, cover image, visibility (`PrivacySelector`), published toggle, allow_comments/reactions/sharing toggles, tags (`TagSelector`), topics (`TopicSelector`); Danger Zone with delete
- Actions: Join / Leave buttons in header
- No access gate (`canViewContainer` not called — all playlists are accessible regardless of visibility)

**Create flow:** `/playlists/create` → `CreatePlaylistPage.tsx`.

**Visibility controls:** `PrivacySelector` component used in the Manage tab with `contentType="playlist"`. This is the most complete visibility implementation among containers reviewed. However, the browse page does not filter by visibility, so `member`-only playlists appear in the public list.

**Known issues / gaps:**
- Browse page does not apply `filterByVisibility` — `member` or `private` playlists are listed to all users.
- Detail page does not call `canViewContainer` — no access gate enforced. Any user can view any playlist regardless of visibility setting.
- `author_id` is used in playlist data (vs. `created_by` used in most other containers) — the "Mine" filter in browse uses `author_id`, but the detail page fetches creator via `created_by`. There is a dual-field inconsistency in the playlist schema.
- Episode IDs are stored in `episode_ids` array with a `video_ids` fallback — schema migration artifact.
- Reorder UI uses simple up/down buttons; no drag-and-drop despite `GripVertical` icon being imported in the detail component.
