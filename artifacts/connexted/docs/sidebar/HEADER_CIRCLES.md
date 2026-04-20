# Feature: Circles

Circles are the primary community spaces on the Connexted platform. Each circle is a named group with a defined access type (open, request-to-join, or invite-only), a cover image, short and long descriptions, and a curated set of content tabs. A circle has three internal roles — **admin** (called "host" in some older UI), **moderator**, and **member** — stored as array columns on the `circles` table (`admin_ids`, `moderator_ids`, `member_ids`). A parallel `circle_members` table (with a `status` column) and a `container_memberships` table are maintained in a dual-write pattern for backward compatibility and richer lifecycle tracking.

Circles support optional **guest access**: each of the seven content sections (feed, members, documents, forum, checklists, reviews, calendar) can be toggled open individually so non-members can preview content before joining.

---

## Circles Browse (`/circles`)

**Component:** `CirclesPage.tsx`

**What it does:** The main discovery page. Displays all circles on the platform in a responsive 3-column card grid. Each card is a `ContainerCard` showing name, description, category, member count, admin names, tags, lifecycle state badge, access type badge, and a "Public" badge when any guest-access sections are enabled. Cards link to `/circles/:id`.

**Data loaded:**
- `circles` table: `id, name, description, image, access_type, member_ids, admin_ids, guest_access`
- Lifecycle states via `fetchAndEnrichLifecycle` helper (adds `lifecycle_state`, `member_count`, `content_count`, `posts_last_30_days`, `unique_contributors_last_30_days`, `last_activity_at`)
- Current user's `content_favorites` for the `circle` content type
- Current user's `circle_members` rows to determine membership status per card
- Admin profiles from `users` (names only) for display on cards

**Filtering:**
- Text search across name, description, and tags
- Lifecycle state filter (idea / created / released / active / engaged / stale / all) via `LifecycleFilter` component

**Actions available to any user:**
- **Open circle:** "Join Circle" button — inserts into `circle_members` (status: active) and updates `circles.member_ids` (dual-write)
- **Request circle:** "Request" button — inserts into `circle_members` (status: pending); shows "Applied" state and "Withdraw Application" button thereafter
- **Invited:** "Accept" / "Decline" buttons when a `circle_members` row with status `invited` exists
- **Already member:** "Leave Circle" button — deletes from `circle_members` and removes from `circles.member_ids`
- **Invite-only:** join button is disabled; toast indicates invite-only status
- **Favorite:** toggled via `content_favorites` table

**Known issues / gaps:**
- Membership status is read from the `circle_members` table, but joining an open circle writes to both `circle_members` and `circles.member_ids`. If the two sources drift (e.g., from earlier code that only wrote one), membership badges can be inaccurate.
- The `CirclesPage` uses `admin_ids` from the circles table for the admin display name, not `host_ids` or `moderator_ids`. The distinction between admin, host, and moderator is not surfaced on browse cards.

---

## My Circles (`/my-circles`)

**Component:** `MyCirclesPage.tsx`

**What it does:** Displays circles the current user hosts or moderates. Shows summary stat cards (circles hosted, circles moderated, total members) then a tabbed list: All Managed, Hosted, Moderated. Each circle card shows the user's role badge (Crown = Host, Shield = Moderator), member count, an activity count placeholder, and action buttons to view the circle or go to Settings.

**Data loaded:**
- `circles` table filtered by `host_ids.cs.{userId} OR moderator_ids.cs.{userId}` — plain members are excluded by design
- Activity counts are a `// TODO` placeholder; always returns 0

**Role separation displayed:**
- Host (`host_ids` contains user) — Crown badge
- Moderator (`moderator_ids` contains user) — Shield badge

**Known bug:** The Supabase query only fetches circles where the user is in `host_ids` or `moderator_ids`. Plain members (users only in `member_ids` but not either elevated array) are completely absent from this page. There is no "Joined Circles" tab. This means most users who have joined open circles will see an empty page. `MyCirclesSummaryPage` (below) was likely built to address this gap.

**Create Circle button:** Only visible to users with `profile.role === 'super'`. The button does not open a form — it is a non-functional placeholder.

---

## My Circles Summary (`/my-circles-summary`)

**Component:** `MyCirclesSummaryPage.tsx`

**What it does:** A more complete "all my circles" view that was built as a replacement/companion to `MyCirclesPage`. Correctly fetches all circles where `member_ids` contains the current user, then enriches each with the user's role (admin > moderator > host > member). Shows four stat cards (total, admin, active, open circles) and a filterable, sortable card grid.

**Data loaded:**
- `circles` table: `.contains('member_ids', [profile.id])` — correctly includes plain members
- Derives user role from `admin_ids`, `moderator_ids`, `host_ids`, `member_ids` arrays
- `enabled_features` field shown as feature badges if present; data may not be populated for all circles

**Filtering / Sorting:**
- Filter by: All / Admin Only / Active (non-open) / Open Circle
- Sort by: Recently Joined, Name A–Z, Member Count

**Actions:**
- "View Circle" links to `/circles/:id`
- Admin-role circles show a Shield icon button linking to `/admin/circles/:id`

**Note:** The distinction between `is_open_circle` (a boolean column) and `access_type === 'open'` is slightly muddled. "Active Circles" in the stats counts circles where `is_open_circle` is false, and "Open Circles" counts those where it is true — this does not directly correspond to the `access_type` used elsewhere.

---

## Circle Detail (`/circles/:id`)

**Component:** `CircleDetailPage.tsx`

**What it does:** The main member-facing view of a circle. Shows the circle header (cover image, name, long description, shareable URL, QR code button, member count, access type), then a sticky second-level navigation bar with tabs, and the content for the selected tab below.

**Data loaded:**
- `circles` table: `id, name, description, long_description, image, access_type, member_ids, admin_ids, guest_access`

**Role detection (local):**
- `isMember` — `circle.member_ids.includes(profile.id)`
- `isPlatformAdmin` — `profile.role === 'super' || profile.role === 'admin'`
- `isAdmin` — `isPlatformAdmin || circle.admin_ids.includes(profile.id)`

**Access gate:** Wrapped in `ContainerAccessGate`. Shows a `ContainerStateBanner` for any lifecycle / access state messaging.

**Tabs (second-level nav, `CircleSecondLevelNav`):**

| Tab | Icon | Member-only? | Guest access key |
|-----|------|-------------|-----------------|
| Feed | MessageSquare | No (guest-configurable) | `feed` |
| Forum | MessageCircle | No (guest-configurable) | `forum` |
| Events | Calendar | No (guest-configurable) | `calendar` |
| Prompts | Sparkles | **Yes — members only** | — |
| Resources | Layers | **Yes — members only** | — |
| Members | Users | No (guest-configurable) | `members` |

Non-members see only the tabs whose corresponding `guest_access` key is true. Prompts and Resources are always member-only regardless of guest access settings.

**Join flow:**
- **Open circle:** Joins directly; writes to `circles.member_ids`, creates `container_memberships` record (status: active), and upserts into `participants` table (best-effort, table may not exist).
- **Request circle:** Navigates to `/circles/:id/request` (application form)
- **Invite-only:** Toast error

**Leave:** Removes from `circles.member_ids` only (does not clean up `circle_members` or `container_memberships`).

**Header action buttons by role:**
- Non-member, non-admin: "Join Circle" or "Request to Join"
- Member: disabled "Member" indicator + "Leave Circle"
- Admin (any): "Settings" → `/circles/:id/settings`
- Platform admin: additional "Edit Circle" → `/platform-admin/circles/:id/edit`

**Shareable URL + QR Code:** Displayed in the header for all users. QR Code dialog opens `/preview/circles/:id`.

---

## Circle Landing Page (`/circles/:id/landing`)

**Component:** `CircleLandingPage.tsx`

**What it does:** A public-facing marketing page for a circle — rendered with `PublicHeader`/`PublicFooter`, accessible without login. Designed to be shareable via URL or QR code.

**Data loaded:**
- Full `circles` row
- Linked `TicketTemplate` (from `ticket_system` service) — if a template is linked, it replaces the default CTA with a `WaitlistBlock`
- Current user's access ticket (if logged in) to detect ticket-based membership

**Sections shown:**
1. Hero: circle image (round crop), name, description, access-type badge, member count, primary CTA button
2. "About This Circle" — long_description (if present)
3. "What Members Get Access To" — feature cards for Feed, Members, Resources, Events, Forum, Reviews; cards show "Preview Available" badge if guest access is on for that section
4. "Preview Available Content" — visible only if any guest_access is true; links to section-specific routes
5. "Interested in Joining?" — shown for invite-only circles; email capture to `prospects` table
6. Final CTA banner (open/request circles only)

**Behavior:**
- If user is already a member or has an active access ticket → immediately shows "You're Already a Member!" screen with a button to enter the circle
- Tracks every visit to `landing_page_visits` table (records visitor_id, referral source from `?ref=` param, user agent)

---

## Circle Request / Application Form (`/circles/:id/request`)

**Component:** `CircleRequestPage.tsx`

**What it does:** A thin wrapper that loads the circle's `id, name, access_type` and renders the shared `ApplicationForm` component. Redirects invite-only circles back to the landing page. On success, navigates to `/circles/:id`. On cancel, returns to `/circles/:id/landing`.

The `ApplicationForm` collects structured fields: why_join, goals, additional_info, referral_source. This data is stored in `container_memberships.application_data` (JSON) and `status: pending`.

---

## Circle Settings (`/circles/:id/settings`)

**Component:** `CircleSettingsPage.tsx` (admin only)

**What it does:** A 10-tab settings panel for circle admins. Accessible only to users in `admin_ids` or with platform admin role. Linked from the "Settings" button on the circle detail header.

**Tabs:**

### Members tab
Delegates to `CirclePeopleManager` (see below). Full member add/remove/role management plus applications and invitations.

### Topics tab
Delegates to `CircleTopicsAudienceTab`. Lets admins set category, tagline, topic tags (`topics_data[]`), audience tags (`audience_data[]`), and recommendation matching settings (`include_in_recommendations`, `minimum_match_score`). Topics and audience tags are pulled from a pool via Edge Function; official tags shown first, custom tags allowed. Settings saved to `circles` table.

### Guest Access tab (`GuestAccessTab`)
Per-section enable/disable toggles for: Feed, Members, Documents, Forum, Lists, Reviews, Calendar/Events. Saved to `circles.guest_access`. Includes "Enable All" / "Disable All" quick actions.

### Moderation tab (`ModerationTab`)
Lists all posts, documents, and reviews in the circle. Admins can delete any item. Posts and reviews: hard delete. Documents: soft delete (sets `deleted_at`).

### Feed tab (`FeedSettingsTab`)
Saved to `circles.feature_settings.feed`. Options: posting_permissions (all / moderators_and_admins / admins_only), post_approval_required (bool), allow_comments (bool), allow_reactions (bool). Default is all-members-can-post.

### Forums tab (`ForumsSettingsTab`)
Saved to `circles.feature_settings.forums`. Options: thread_creation_permissions, thread_approval_required, allow_replies, allow_anonymous_posts.

### Documents tab (`DocumentsSettingsTab`)
Explains that documents are platform-wide (created at `/documents/new`). Settings: upload_permissions, upload_approval_required. Saved to `circles.feature_settings.documents`.

### Reviews tab (`ReviewsSettingsTab`)
Explains reviews are platform-wide. Settings: submission_permissions, approval_required, allow_anonymous_reviews, rating_scale (5 or 10). Saved to `circles.feature_settings.reviews`.

### Events tab (`EventsSettingsTab`)
Explains events are platform-wide. Settings: creation_permissions, creation_approval_required, rsvp_enabled, rsvp_limit_enabled. Saved to `circles.feature_settings.events`.

### Export/Import tab
Delegates to `ExportImportManager` — generic JSON export/import for the circle entity.

**Note:** `feature_settings` is stored as a JSONB field on the `circles` table and controls contribution permissions within the circle. These settings are defined in the UI schema but enforcement in the feed/forum/documents components is not verified — the settings may be stored but not yet read by the child components.

---

## Circle People Manager (`CirclePeopleManager.tsx`)

**Component:** `src/app/components/circle/CirclePeopleManager.tsx`

**What it does:** The definitive member management panel. Used inside the Settings page's Members tab. Has three sub-tabs: Members, Applications, Invitations.

### Members sub-tab (`MembersPanel`)
- Lists all users whose IDs appear in `circles.member_ids`, fetched from the `users` table
- Search/filter by name or email
- **Add member directly** by email (admin action): looks up user by email, adds to `circles.member_ids`, notifies via `notifyMemberJoined`
- **Remove member**: removes from `circles.member_ids`; blocked if the user is an admin (must demote first)
- **Toggle admin**: adds/removes from `circles.admin_ids`; sends `notifyRoleChanged` notification; last admin cannot be removed
- Role badge: "Admin" (shield icon) for users in `admin_ids`; "You" badge for current user

**Note:** `CirclePeopleManager` manages `admin_ids` only — it has no UI for `moderator_ids` or `host_ids`. Those arrays exist in the schema but are not surfaced here.

### Applications sub-tab (`ApplicationsPanel`)
- Reads from `container_memberships` where `container_type = 'circle'` and `status IN ('pending', 'rejected', 'active')`
- Pending applications shown with expandable detail cards (why_join, goals, additional_info, referral_source from `application_data` JSON)
- **Approve**: sets `container_memberships.status = 'active'`, adds user to `circles.member_ids`, upserts `participants` record (state: 'enrolled'), sends `membership.approved` notification
- **Reject**: sets `container_memberships.status = 'rejected'`, optionally includes rejection reason in `membership.rejected` notification
- Past decisions (approved/rejected) shown in a collapsed history section

### Invitations sub-tab (`InvitationsPanel`)
- Reads from `container_memberships` where `status IN ('invited', 'accepted', 'expired')`
- **Send Invitation**: looks up user by email, checks for existing pending invitation or application, inserts `container_memberships` record (status: 'invited'), sends `membership.invited` notification with optional personal message
- **Revoke Invitation**: sets status to `expired`
- Shows invitation history (accepted / expired)

---

## Circle Admin Dashboard (`/admin/circles/:id`)

**Component:** `admin/CircleAdminDashboard.tsx`

**What it does:** A participant-state-focused admin view for a specific circle. Shows engagement metrics and participant funnel states grouped by category: Access & Enrollment, Engagement Levels, Exit States. Uses the `participant-states` library to load funnel configuration per circle.

**Data loaded:**
- `circles` row
- `getCircleFunnelConfig(circleId)` — loads enabled participant states for this circle
- `getAllMemberStates()` — full list of possible states
- `getCircleParticipants(circleId)` — participants with attendance data (from `participants` table; gracefully degrades if table absent)
- `getEngagementMetrics(undefined, circleId)` — total, active count, at-risk count, avg attendance rate

**Metrics cards:** Total Members, Active, At Risk, Avg Attendance %

**Auto-Suggestions:** `StateSuggestionsCard` — automated state-change suggestions based on attendance/engagement data.

**State cards:** `ParticipantStateCard` per enabled state, showing count and a "View Members" action. Clicking opens a member list dialog with checkboxes for bulk state changes.

**Individual/Bulk state changes:** `ChangeStateDialog` and `BulkStateChange` components. Admins can move participants between funnel states manually.

**Navigation:** "Configure Funnel" links to `/admin/circles/:id/funnel-config`.

---

## Circle Admin Page (`/circle-admin` or top-level admin entry)

**Component:** `admin/CircleAdminPage.tsx`

**What it does:** The top-level admin dashboard showing all circles the current user administers (or all circles for `super` role). Serves as the launch point for circle creation and management.

**Data loaded:**
- `user_classes` — limits row for the user's class number (`max_admin_circles`)
- `circles` — all circles where `admin_ids` contains the user (super sees all)
- `circle_participants.member_state` aggregated for each circle — provides invited/applied/approved/enrolled/completed/not_completed counts
- Recent post counts per circle (last 30 days) for "active circles" stat
- Community users list (for admin email lookup in create dialog)

**Stats overview (4 cards):** Total Circles, Total Members (unique across all), Active Circles (with any post in 30 days), Recent Activity (post count in 30 days).

**Per-circle action buttons:**
- "Manage Members" → `/admin/circles/:id` (CircleAdminDashboard)
- "Edit Circle" → `/platform-admin/circles/:id/edit` (CircleEditor)
- "Settings" → `/circles/:id/settings` (CircleSettingsPage)
- "View Circle" → `/circles/:id`

**Create Circle (inline dialog):**
- Available when user is under their `max_admin_circles` limit (or is super role)
- Fields: name (required), short description (required), full description, cover image URL, access type (open/request/invite), moderation password
- Admin management: current user auto-added; additional admins added by email lookup
- On create: inserts `circles` row with `admin_ids`, `member_ids` (admins auto-joined), `moderator_ids: []`, auto-generated URL-safe slug, default `guest_access: all false`

**Class limits:** Shows current user's `user_class` display name and usage (X of Y circles used). Disable button when limit reached.

---

## Circle Feed (`CircleFeed.tsx`)

**Component:** `src/app/components/circle/CircleFeed.tsx`

**What it does:** The Feed tab content inside Circle Detail. Shows a unified activity stream of posts, documents, reviews, and checklists associated with this circle.

**Data loaded:**
- Posts: `posts` table where `circle_ids` contains the circle ID (with author join)
- Documents: `documents` table where `circle_ids` contains the circle ID; enriched with `library_documents` join for library badges
- Reviews (endorsements): `endorsements` table where `circle_ids` contains the circle ID
- Current user's favorited document IDs from `content_favorites`
- Current user's liked review IDs from `content_likes`
- Note: Checklists are commented out — previously fetched but removed; the code retains filter button for checklists but no data loads

**Posts:** Rendered via `ContainerFeed` shared component (handles post creation for members).

**Filter buttons:** All Activity / Documents (count) / Reviews (count) / Checklists (count — always 0 now).

**Document cards:** Title, description, source domain extracted from URL, author + timestamp, category/library/tag badges, star favorite button, "View Document" link. Items with access level above user's class show a lock icon and are greyed out.

**Review cards:** Star rating, author, description, "View Resource" link (if URL provided), upvote button with count. Like state tracked in `content_likes`.

**Guest access:** Non-members see documents only if `guestAccess.documents !== false`; same for reviews and checklists. Feed posts (ContainerFeed) are shown regardless of the filter (based on the outer isMember/hasGuestAccess check in CircleDetailPage).

---

## Circle Forum (`CircleForum.tsx`)

**Component:** `src/app/components/circle/CircleForum.tsx`

**What it does:** A threaded discussion forum within a circle. Two-panel layout: thread list on the left (1/3 width), selected thread with replies on the right (2/3).

**Data loaded:**
- `forum_threads` where `circle_ids` contains the circle ID, joined with author profile
- `forum_thread_replies` for all loaded thread IDs, grouped by thread

**Thread list:** Shows title, author name, reply count. Click to open thread in detail panel.

**Thread detail:** Shows title, author avatar + name + date, body text. Reply list (chronological) with avatar, author, date, body. Reply input at bottom (Enter or Send button).

**Actions:**
- Any user (logged in): can create a new thread via "+" button and dialog (title + description required)
- Any user: can add replies to any thread
- Thread delete: available to thread author or admins
- No reply delete UI exists (admin or otherwise)

**Note:** Threads support `pinned` and `locked` boolean fields in the data model but neither is surfaced in the UI — no pin/lock controls or visual indicators.

**Notification:** `notifyThreadReply` is called when a reply is added.

---

## Circle Members (`CircleMembers.tsx`)

**Component:** `src/app/components/circle/CircleMembers.tsx`

**What it does:** The Members tab content. Displays a searchable card grid of all circle members with profile information.

**Data loaded:**
- Fetches the circle's `member_ids` array, then loads matching `users` rows: `id, name, email, avatar, tagline, location, interests, badges`
- The component is generic: accepts a `containerType` prop (circle/table/elevator/meeting/pitch) and switches the source table accordingly

**Member cards:** Avatar, name, tagline, email, location (with MapPin icon), interest badges (first 3), platform badges (first 2). No clickthrough to profile pages.

**Search:** Filters by name, email, or location string. Client-side only.

**Role display:** No role indicators on this view — admins and plain members look identical. This is intentional as a member-facing directory.

---

## Circle Calendar / Events (`CircleCalendar.tsx`)

**Component:** `src/app/components/circle/CircleCalendar.tsx`

**What it does:** The Events tab content. Shows upcoming (and past) events associated with this circle.

**Data loaded:**
- `events` table where `circle_ids` contains the circle ID, ordered by `start_time`, joined with host name

**Event cards:** Title, description, event type badge, date/time (formatted), location (or "Virtual Event" + platform badge), external join link, tags, attendee count (with optional max), RSVP button.

**RSVP:** Any member can RSVP. Toggles the user's ID in `events.attendee_ids` array. Shows "Full" when `max_attendees` is reached. No authentication check — the component trusts that it is only rendered for members/guests with calendar access.

**Admin create:** "Create Circle Event" button shown to admins, opens `CreateEventDialog` with the circle ID pre-set.

**No calendar grid view:** Events are rendered as a flat list, ordered by start time. No month/week calendar UI exists.

---

## Circle Prompts (`CirclePrompts.tsx`)

**Component:** `src/app/components/circle/CirclePrompts.tsx`

**What it does:** An AI prompt library within a circle. Members can browse, copy, and contribute curated prompts that others can paste into external AI tools.

**Data loaded:**
- `circle_prompts` table: `*` where `circle_id` matches, ordered by `created_at` desc

**Prompt cards:** Title (with Sparkles icon), optional description, expandable prompt text (shown in a monospace code block), creation/update dates. Collapsed by default — user clicks "Show prompt" to expand.

**Copy to AI button:** Copies `prompt_text` to clipboard via `navigator.clipboard`. Shows "Copied!" state for 2 seconds.

**Create prompt:** Available to **any member** (`isMember` check). Opens `CreatePromptDialog`. Fields: title, prompt_text, optional description.

**Delete:** Available to the **prompt owner** (`created_by === profile.id`) or an **admin**. No confirmation dialog — uses `confirm()`.

**Instructional card:** Shown at the bottom when prompts exist — a numbered 4-step how-to: copy → open AI tool → paste → share results back to circle.

**Tabs:** None; flat list only, newest first.

---

## Circle Resources (`CircleResources.tsx`)

**Component:** `src/app/components/circle/CircleResources.tsx`

**What it does:** A curated "start here" resource kit pinned by circle admins. Admins select platform content items (documents, episodes, checklists, etc.) and order them for members to find easily. This is the circle's "companion" feature — analogous to `EventCompanionDetailPage` or `CompanyCompanionPage`.

**Data loaded:**
- `circle_companion_items` table: `*` where `circle_id` matches, ordered by `order_index`
- Each item's name/description/slug resolved from the appropriate source table (e.g., `documents`, `episodes`) using the `COMPANION_ITEM_TYPES` registry from `@/lib/companion-types`
- QR code items are special: `item_type = 'qr_code'` renders a `CompanionQRCode` component pointing to the circle's URL

**Item types supported:** Any type registered in `getTypesForContext('circle')` — the platform-wide companion type registry. Currently includes documents, episodes, checklists, and QR codes at minimum.

**Member view:** Ordered list of resource cards. Each shows: type icon, item name, type badge, optional admin note badge, description (1 line), and an external link button to the item's route.

**Admin view:** Adds an "Add Resource" form and per-item delete buttons. Items can be reordered (up/down) using a GripVertical handle; order persisted immediately to `circle_companion_items.order_index`.

**Add Resource form:** Select content type → select specific item from that type (fetched live) → optional note → "Add to Resources". QR code type skips item selection and uses the circle ID as reference.

**Error handling:** Gracefully handles missing `circle_companion_items` table (migration guard: catches `42P01` error code and shows an informational message).

---

## Supporting / Ancillary Components

### `RecommendedCirclesWidget.tsx`
A widget (used in sidebar or dashboard contexts) that shows circles recommended to the current user based on their topics/interests. Not part of the Circles header nav flow but surfaces circles to users.

### `CircleLandingPage` (already documented above) and `preview/CirclePreviewPage.tsx`
`CirclePreviewPage` is a read-only preview shown at `/preview/circles/:id`, linked from QR codes. Not fully documented here; likely shows basic circle info for unauthenticated sharing.

### `admin/CircleManagement.tsx`
Platform-admin circle management (not the per-circle admin page). Likely a table/list of all circles with CRUD operations. Listed in the admin sidebar context.

### `admin/CircleEditor.tsx`
Full edit form for circle metadata (name, description, images, access type, etc.). Accessed via `/platform-admin/circles/:id/edit`. Requires platform admin role.

### `admin/CircleMemberFunnelSection.tsx`
A sub-component used within `CircleAdminDashboard` or the admin context to display the participant funnel for a specific state — counts, member list, and state-change actions.

### `admin/MyCircleLinksCard.tsx`
A sidebar/dashboard card component showing quick links for a circle admin's circles (e.g., view, settings, member manage).

### `JourneyCircleSection.tsx`
Displays circles associated with a journey (learning path). Shows the circles in a journey-step context, not the standalone Circles feature.

### `shared/JoinCircleDialog.tsx`
A reusable dialog for joining a circle from contexts outside `CirclesPage` (e.g., recommendations widget, profile suggestions).

---

## Data Model Summary

| Table | Purpose |
|-------|---------|
| `circles` | Primary record: name, description, image, access_type, member_ids[], admin_ids[], moderator_ids[], host_ids[], guest_access{}, feature_settings{}, enabled_features{}, topics_data[], audience_data[], matching_settings{}, slug, community_id |
| `circle_members` | Legacy/dual-write membership: circle_id, user_id, status (active/pending/invited) |
| `container_memberships` | Richer membership lifecycle: user_id, container_type='circle', container_id, status, applied_at, application_data{}, invited_by, request_message |
| `participants` | Funnel/attendance tracking: circle_id, user_id, current_state, state_history[], attendance_rate, consecutive_absences |
| `circle_prompts` | AI prompt library per circle |
| `circle_companion_items` | Curated resource kit (ordered list of content items) |
| `forum_threads` | Circle forum threads; `circle_ids[]` allows a thread to span multiple circles |
| `forum_thread_replies` | Threaded replies to forum posts |
| `landing_page_visits` | Tracks visits to `/circles/:id/landing` |
| `prospects` | Email capture for invite-only circles |

## Role Terminology Inconsistency

The platform has accumulated multiple overlapping role terms. In the `circles` table schema there are four arrays: `admin_ids`, `moderator_ids`, `host_ids`, and `member_ids`. In practice:

- `CircleAdminPage` and `CircleAdminDashboard` use `admin_ids`
- `MyCirclesPage` uses `host_ids` + `moderator_ids` (does not read `admin_ids`)
- `CirclePeopleManager` manages only `admin_ids` (no UI for moderator or host)
- `CircleDetailPage` computes `isAdmin` from `admin_ids` only
- `MyCirclesSummaryPage` checks all four arrays in priority order: admin > moderator > host > member

This inconsistency means circles created via `CircleAdminPage` (which sets `admin_ids`) will not appear for their creator in `MyCirclesPage` (which queries `host_ids`/`moderator_ids`). This is the root cause of the `MyCirclesPage` "known bug" — it is a query mismatch between different parts of the codebase using different role columns.
