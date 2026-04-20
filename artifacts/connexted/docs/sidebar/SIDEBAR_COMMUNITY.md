> ⚠️ **SUPERSEDED** — This file has been split into four separate files matching the actual sidebar sections:
> - [SIDEBAR_MEMBERS.md](SIDEBAR_MEMBERS.md)
> - [SIDEBAR_SPONSORS.md](SIDEBAR_SPONSORS.md)
> - [SIDEBAR_MY_BUSINESS.md](SIDEBAR_MY_BUSINESS.md)
> - [SIDEBAR_COMMON_CIRCLES.md](SIDEBAR_COMMON_CIRCLES.md)
>
> This file is kept for reference only and should not be edited.

# Sidebar Sections: Community / Sponsors / My Business

---

## COMMUNITY

### Members

The MEMBERS section in the sidebar (`MembersSection.tsx`) expands to show links including All Members, Contact Directory, Friends, Socials, Following, Followers, Active Members, and Member Matches.

---

#### Members Directory (`/members/all`, `/members/:type`)

**Component:** `src/app/components/MembersPage.tsx`

**What it does:** Displays all platform members in a searchable card grid. The `:type` route param allows deep-linking to the Admins (`/members/admins`) or Circle Hosts (`/members/hosts`) tabs.

**Data loaded:**
- `users` table — full `SELECT *` for all users
- `circles` table — full `SELECT *` for all circles (used to derive host membership)
- `user_connections` table — filtered by `follower_id = currentUser.id` to load follow state

**User actions:**
- Search members by name or email (client-side filter)
- Follow / Unfollow any member (writes to `user_connections`, triggers `notifyNewFollower`)
- Navigate to a member's profile via their name link
- Navigate to a member's Moments page (`/moments/:userId`)
- Navigate to a member's Portfolio page (`/portfolio/:userId`)
- Open WhatsApp chat if member has `whatsapp_number` set (only shown if field is populated)

**Tabs / sub-views:**
| Tab | Filter logic |
|---|---|
| All Members | All users |
| Admins | `users.role === 'admin'` or `'super'` |
| Circle Hosts | Users present in any `circle.host_ids[]` |

**Known issues / gaps:**
- Loads all users and circles with `SELECT *` — no pagination. Will degrade at scale.
- `getActivityCount()` returns a hardcoded `0`; actual activity counts are not fetched.
- `viewMode` and `sortOption` state variables are declared but never used — the sort/view toggle UI is not rendered.
- Admin tab uses `role === 'admin' || role === 'super'`; regular admin role label on cards shows `'admin'` regardless of which super-role variant matched.

---

#### User Profile (`/users/:userId`)

**Component:** `src/app/components/UserProfilePage.tsx`

**What it does:** Displays a member's full public profile — header with avatar, bio, badges, follower/following counts, and connection stats, followed by tabbed sections for activity, professional info, circle memberships, and contributions.

**Data loaded:**
- `users` — single row by `userId`
- `circles` — filtered by `member_ids @> [userId]`
- `posts` — count and last 10 rows by `author_id`
- `forum_threads` — count and last 10 rows by `author_id`
- `documents` — count and last 10 rows by `author_id`
- `events` — count by `host_id`
- `user_connections` — single row to check if current user is following
- `user_skills` — public skills (`is_public = true`)
- `user_credentials` — public credentials (`is_public = true`)
- `user_affiliations` — public affiliations (`is_public = true`)
- `badge_assignments` (via `useUserBadges` hook)

**User actions:**
- Follow / Unfollow the member (writes to `user_connections`, triggers `notifyNewFollower`)
- Navigate to the member's Moments page (`/moments/:userId`)
- Navigate to the member's Portfolio page (`/portfolio/:userId`)
- Open WhatsApp chat (if permitted by member's privacy settings)
- View member's follower list (`/users/:userId/followers`)
- View member's following list (`/users/:userId/following`)
- Navigate to individual circles the member belongs to

**Tabs / sub-views:**
| Tab | Content |
|---|---|
| Recent Activity | Last 5 posts; counts for threads and documents |
| Professional | Job title, company, status, years of experience, skills, credentials, affiliations, badges |
| Circles | Grid of circles the member belongs to, linking to each circle detail page |
| Contributions | Thread count and document count cards |

**Privacy enforcement:** Respects `users.privacy_settings` flags (`email_private`, `whatsapp_private`, `show_connections`). Platform admins bypass all privacy checks.

**Known issues / gaps:**
- Own-profile button links to `/my-basics` (the edit page) rather than a dedicated self-view page.
- The Recent Activity tab only shows posts; threads and documents appear only as counts in the Contributions tab.

---

### Circles

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

---

## SPONSORS

### Sponsors Directory (`/sponsors`)

**Component:** `src/app/components/SponsorsPage.tsx`

**What it does:** Lists all platform sponsors as cards ordered by tier then name. Each card shows the sponsor logo/avatar, name, tier badge (platinum/gold/silver/bronze/default), tagline, description preview, contact email, city/state location, website link, and a View Profile button.

**Data loaded:**
- `sponsors` — full `SELECT *` ordered by `tier ASC, name ASC`

**User actions:**
- Click "View Profile" to navigate to `/sponsors/:slug`
- Click contact email to open mail client
- Click website link to open sponsor's external website in a new tab

**Tabs / sub-views:** None.

**Known issues / gaps:**
- No search or filter capability.
- Tier ordering is alphabetical on the string value (`bronze < gold < platinum < silver`) rather than by tier level/rank — gold sorts before platinum correctly but silver sorts after platinum alphabetically, which may not match intended display order.

---

### Sponsor Detail (`/sponsors/:slug`)

**Component:** `src/app/components/SponsorDetailPage.tsx`

**What it does:** Full sponsor profile page. Shows sponsor header (logo, name, tier badge with level-based coloring, tagline, description, contact info, website), a curated content block ("From {Sponsor}"), a sponsored containers section with type-based permission gauges and filters, and management links for users with sponsor admin rights.

**Data loaded:**
- `sponsors` — single row by slug, with `sponsor_tiers(tier_name, tier_level)` join
- `sponsor_companion_items` — ordered content items for this sponsor (elevators, pitches, documents, checklists, episodes, books, QR codes)
- Per container type (tables, elevators, meetings, pitches, builds, standups, meetups) — `id, name, slug, description, created_at` filtered by `sponsor_id`
- `sponsor_tier_permissions` — `container_type, can_view, can_create, max_count` filtered by `tier_id`

**User actions:**
- Click website link (external)
- Click email link
- Navigate to sponsor companion page (`/sponsors/:slug/companion`)
- Navigate to sponsor management page (`/sponsor/:slug/manage`) — visible to users with `canManageSponsor()` rights (owner, admin, director role in `sponsor_memberships`, or platform admin)
- Filter displayed containers by type (checkbox filters)
- Clear type filters
- Navigate to any sponsored container

**Tabs / sub-views:** Single-page layout. The "Sponsored Containers" section has inline type-filter checkboxes.

**Companion content item types:** elevator, pitch, document, checklist, episode, book, qr_code.

**Known issues / gaps:**
- The Manage link uses `/sponsor/:slug/manage` (singular) while the sidebar uses the same path; the detail page Companion link uses `/sponsors/:slug/companion` (plural) — the inconsistent singular/plural prefix is a potential source of routing confusion.
- `showMembers` state is declared but never used — a member list UI may have been planned but not implemented.
- Permission progress bars only render when `sponsor_tier_permissions` exist; if no tier is assigned (`tier_id = null`), the section silently shows no gauges.

---

## MY BUSINESS

The MY BUSINESS section in the sidebar (`MyBusinessSection.tsx`) expands to show: All Companies, My Ventures, My Companies, and Company Companions.

---

### My Companies (`/my-companies`)

**Component:** `src/app/components/markets/MyCompaniesPage.tsx`

**What it does:** Lists all companies the current user owns or belongs to as a member. Owned companies are shown first with an "Owner" badge; member companies follow with a "Member" badge. Each card shows the company logo, name, tagline, industry, and action buttons for Profile, Companion, and Manage.

**Data loaded:**
- `market_companies` — `id, name, slug, tagline, logo_url, industry, owner_user_id` filtered by `owner_user_id = userId`
- `company_members` — `company_id` filtered by `user_id = userId` (for member companies)
- `market_companies` — second query for non-owned member company IDs
- `company_companion_items` — `company_id` for all company IDs (to compute companion item counts)

**User actions:**
- Navigate to company profile (`/markets/companies/:slug`)
- Navigate to company companion page (`/markets/companies/:slug/companion`)
- Navigate to company management / edit page (`/markets/edit-company/:id`)
- Navigate to "Browse All" companies (`/markets/all-companies`)
- Navigate to "My Ventures" (`/my-ventures`) — linked from empty state

**Tabs / sub-views:** None (flat list).

**Known issues / gaps:**
- No search or sort within the page.

---

### Company Profile (`/markets/companies/:slug`)

**Component:** `src/app/components/markets/CompanyProfilePage.tsx`

**What it does:** Full company profile. Shows a cover image banner, company logo (overlapping the banner), name, stage badge, tagline, industry, location, founded year, inline earned badges, and an "Founded by" owner attribution. Three tabs cover the company overview, its product/service offerings, and a news feed.

**Data loaded:**
- `market_companies` — single row by slug
- `users` — owner profile (`id, name, email, avatar, bio`)
- `market_offerings` — `id, name, slug, tagline, logo_url, offering_type, pricing_model, is_active, created_at` filtered by `company_id`
- `company_news` — single row by `company_id` (gets the news container ID)
- `posts` — last 5 posts filtered by `company_news_id`
- `badge_assignments` (via `useCompanyBadges` hook) — company's earned badges
- `badge_types` (via `useBadgeTypes` hook) — all badge types (for "Available to Earn" section shown to owner)

**User actions:**
- Visit company website (external link)
- Navigate to the company's companion page (`/markets/companies/:slug/companion`)
- Navigate to manage/edit the company (`/markets/edit-company/:id`) — owner and platform admins only
- Add an offering (`/markets/create-offering?companyId=:id`) — owner only
- View / Edit individual offerings
- Navigate to full news page (`/markets/companies/:slug/news`)

**Tabs / sub-views:**
| Tab | Content |
|---|---|
| Overview | About text, company details grid (industry, stage, location, size, founded), badges earned + available to earn (owner only) |
| Offerings | Grid of offering cards with type/pricing badges; Add Offering button for owner |
| News | Last 5 company news posts with like counts; link to full news page |

**Known issues / gaps:**
- The news tab fetches `company_news` with `.single()`, which will throw if a company has no news container record yet — the error is caught at the top-level try/catch but results in news posts simply being empty with no distinct error state.
- The "Available to Earn" badges section is only shown to the company owner, not to platform admins who might want to award badges.
