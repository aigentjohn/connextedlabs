# Sidebar Section: Common Circles

The CIRCLES section in the sidebar is labelled "COMMON CIRCLES" (`MinorSections.tsx › CirclesSection`) and lists circles that are not owned by a Program. My Circles and Circle Admin links are in the SETUP section (`SetupSection.tsx`).

---

#### All Circles (`/circles`)

**Component:** `src/app/components/CirclesPage.tsx`

**What it does:** Browse and join all platform circles. Displays a searchable, filterable grid of circle cards showing name, description, member count, admin names, tags, lifecycle state, and access type. Users can act on membership directly from the card.

**Data loaded:**
- `circles` — `id, name, description, image, access_type, member_ids, admin_ids, guest_access` ordered by name
- `lifecycle_states` (via `fetchAndEnrichLifecycle`) — enriches each circle with `lifecycle_state`, `member_count`, `content_count`, `posts_last_30_days`, etc.
- `content_favorites` — filtered by `user_id` and `content_type = 'circle'` to load favorite state
- `circle_members` — filtered by `user_id = currentUser.id` to load membership status
- `users` — names of all admins referenced in `admin_ids`

**User actions:**
- Search circles by name, description, or tags
- Filter by lifecycle state (idea / created / released / active / engaged / stale)
- Join an open circle (writes to `circle_members` with `status = 'active'`, updates `member_ids[]`)
- Request to join a request-access circle (writes to `circle_members` with `status = 'pending'`)
- Withdraw a pending join request
- Accept or decline an invite
- Leave a circle
- Favorite / unfavorite a circle

**Known issues / gaps:**
- Joining both writes to `circle_members` AND updates the `member_ids` array. The dual-write is explicitly noted in comments as backward-compatibility overhead that should eventually be removed.
- Invite-only circles show a disabled Join button with a toast error rather than a clear locked-state UI.

---

#### My Circles (`/my-circles`)

**Component:** `src/app/components/MyCirclesPage.tsx`

**What it does:** Shows circles where the current user is a **host** or **moderator**, grouped into summary stat cards and three tabs. Provides quick links to view or manage each circle.

**Data loaded:**
- `circles` — filtered with `.or('host_ids.cs.{userId},moderator_ids.cs.{userId}')` — only circles where user is host or moderator

**User actions:**
- Navigate to a circle's detail page
- Navigate to a circle's settings page (`/circles/:id/settings`) — only shown if user has a role
- Create a new circle (button shown only for `role === 'super'`)

**Tabs / sub-views:**
| Tab | Content |
|---|---|
| All Managed Circles | Union of hosted + moderated circles (deduplicated) |
| Hosted | Circles where `circle.host_ids` includes current user |
| Moderated | Circles where `circle.moderator_ids` includes current user |

Summary stat cards: Circles Hosted / Circles Moderated / Total Members across managed circles.

**Known issues / gaps (KNOWN BUG):** The query only returns circles where the user is host or moderator. Circles where the user is a regular member (present in `member_ids[]` only) are **not shown**. The page description says "Circles you host or moderate" which reflects the current behaviour, but the intended scope for a "My Circles" view should include all circles the user has joined. This is an acknowledged gap.

- `getActivityCount()` is a stub returning `0` with a TODO comment: "Fetch actual activity counts from Supabase."
- The "Create Circle" button has no `onClick` handler attached; it renders as a dead button for `super` users. Circle creation is done through `/circle-admin` instead.

---

#### Circle Detail (`/circles/:id`)

**Component:** `src/app/components/CircleDetailPage.tsx`

**What it does:** The main circle page. Shows the circle header (name, description, member count, access type, shareable URL, QR code) and a second-level nav for accessing circle sections. Non-members see a join prompt unless the circle has guest access enabled.

**Data loaded:**
- `circles` — single row: `id, name, description, long_description, image, access_type, member_ids, admin_ids, guest_access`

**User actions:**
- Join an open circle (direct join; writes to `member_ids[]`, `container_memberships`, and `participants` tables)
- Request to join a request-access circle (redirects to `/circles/:id/request`)
- Leave the circle
- View QR code for the circle's preview URL
- Share the circle via the platform share button
- Copy the shareable URL
- Navigate to circle settings (admins only, links to `/circles/:id/settings`)
- Edit circle via platform admin (platform admins only, links to `/platform-admin/circles/:id/edit`)

**Tabs / sub-views (second-level nav via `CircleSecondLevelNav`):**
| Section | Component | Available to |
|---|---|---|
| Feed | `CircleFeed` | Members (and guests if `guest_access.feed`) |
| Forum | `CircleForum` | Members (and guests if `guest_access.forum`) |
| Events | `CircleCalendar` | Members (and guests if `guest_access.calendar`) |
| Members | `CircleMembers` | Members (and guests if `guest_access.members`) |
| Prompts | `CirclePrompts` | Members |
| Resources | `CircleResources` | Members |

Members also see a documents, checklists, and reviews section (referenced in `getAvailableTabs` but rendered by sub-components not shown here). Admins get an additional `admin` tab.

**Known issues / gaps:**
- The `participants` upsert (step 3 of join) is fire-and-forget; failures are only logged as warnings with the note "table pending migration."
- Admin detection uses both `circle.admin_ids` and `profile.role`; the older `host_ids`/`moderator_ids` fields used by `MyCirclesPage` are not checked here, meaning a host who is not in `admin_ids` will not see admin controls.

---

#### Circle Admin (`/circle-admin`)

**Component:** `src/app/components/admin/CircleAdminPage.tsx`

**What it does:** Admin dashboard for users who have admin rights on one or more circles. Platform admins (`role === 'super'`) see all circles; circle admins see only their own. Shows summary stats (total circles, members, active circles, recent posts) and a searchable list of administered circles with per-circle membership funnel stats and action links.

**Data loaded:**
- `users` — `id, name, email` filtered by `community_id` (for admin management UI)
- `user_classes` — row matching the current user's `user_class` number (for creation limit display)
- `circles` — all circles, then client-filtered to those where `admin_ids` includes current user (unless platform admin)
- `posts` — count of posts in last 30 days across administered circles
- `circle_participants` — `member_state` for each circle to build membership funnel stats (invited / applied / approved / enrolled / completed / not_completed)

**User actions:**
- Search administered circles by name or description
- Create a new circle via an inline dialog (name, short description, full description, cover image URL, access type, moderation password, admin co-assignees)
- Navigate to per-circle member management (`/admin/circles/:id`)
- Navigate to per-circle edit page (`/platform-admin/circles/:id/edit`)
- Navigate to per-circle settings (`/circles/:id/settings`)
- Navigate to the public circle view

**Visibility rule:** A "Create Circle" button is shown if the user has not reached their `user_classes.max_admin_circles` limit (or is platform admin). The button is rendered as disabled with "(Limit Reached)" label when at the cap.

**Known issues / gaps:**
- Membership funnel stats are read from `circle_participants.member_state`, but other parts of the codebase use `participants.current_state` — there may be a table name mismatch. Errors are caught silently and stats default to zero.
- The create-circle form accepts a cover image URL but has no upload mechanism.
- No inline way to delete a circle.
