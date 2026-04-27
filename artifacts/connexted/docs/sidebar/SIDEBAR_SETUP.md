# Sidebar Section: Setup

This section is conditionally shown based on user role. It groups pages for managing containers the current user administers, circle and program leadership tools, and the full platform administration suite.

---

## Access Levels

| Role | Pages visible |
|---|---|
| any user listed as admin on at least one container | My Admin |
| any user listed as admin on at least one circle | Circle Admin |
| coordinator / manager (or any program admin) | Program Admin |
| admin or super | + all Platform Admin pages (intended; currently restricted to super only in code — deferred fix) |
| super only | + Link Library Admin |

---

## My Admin (`/admin`)

**Component:** `src/app/components/admin/MyAdminDashboard.tsx`
**Access:** Any user whose ID appears in `admin_ids` on at least one container row, or `role === 'super'`

**What it does:** Personal admin dashboard scoped to containers the current user administers. Super admins see all containers platform-wide.

**Data managed:**
- Tables, Elevators, Meetings, Pitches, Standups, Builds, Meetups, Sprints, Prompts, Playlists, Episodes, Magazines, Checklists, Moments — all filtered to where `admin_ids` contains the current user (or all, if super)

**Stats displayed:**
- Total containers administered
- Total unique members across those containers
- Recent activity counter (placeholder — always 0; complex circle-based calculation was removed)

**Actions:**
- For each container type: link to that container's `/settings` route and a View link
- "Browse Sponsors" CTA shown to users who are not already a sponsor director/admin

**Known issues / gaps:**
- ~~`recentActivity` stat hardcoded to `0`~~ — **Fixed April 2026**: `MyAdminDashboard` now counts `membership_states` activity + `container_memberships` (circle join requests) in the last 30 days. `CircleAdminPage` counts posts across the admin's circles in the last 30 days.
- No inline "create container" actions — creation happens through individual container settings pages
- Episodes use `/episodes/{id}/settings` (by ID, not slug) while other containers use slugs — inconsistent routing
- Checklists link to `/checklists/{id}` with a Settings icon rather than a dedicated checklist settings route

---

## Circle Admin (`/circle-admin`)

**Component:** `src/app/components/admin/CircleAdminPage.tsx`
**Access:** Any user listed as admin on at least one circle, or `role === 'super'`

**What it does:** Lists all circles where the current user has admin rights. Provides circle-level member stats and quick access to manage, edit, and configure each circle.

**Stats displayed:**
- Total circles (with count of circles the user personally created)
- Total members (unique, across all circles)
- Active circles (those with at least one post in the last 30 days)
- Recent posts (last 30 days, across all circles)

**Per-circle membership lifecycle stats:**
- Invited / Applied / Approved / Enrolled / Completed (sourced from `circle_participants`)

**Actions:**
- Create Circle (dialog) — subject to user-class `max_admin_circles` limit; super admins are unlimited
- Manage Members → `/admin/circles/{circleId}`
- Edit Circle → `/platform-admin/circles/{circleId}/edit`
- Settings → `/circles/{circleId}/settings`
- View Circle → `/circles/{circleId}`

**Create Circle dialog fields:**
- Name, short description, full description (optional), cover image URL, access type (open/request/invite), moderation password (optional), admin list (add by email, self is pre-populated)

**Known issues / gaps:**
- Circle creation enforces `max_admin_circles` from `user_classes` but displays the limit using the count of circles where `admin_ids` contains the user — this may differ from "circles created by user" intent
- No bulk-action support on the list

---

## Program Admin (`/program-admin`)

**Component:** `src/app/pages` → routes to `MyProgramsDashboard` (mapped in App.tsx); individual program detail uses `ProgramAdminDashboard` at `/admin/programs/:programId`
**Access:** Users with role `coordinator`, `manager`, or any user with program admin rights; super admins see everything

**What it does (ProgramAdminDashboard):** Per-program dashboard scoped to a single program. Shows engagement metrics and participant funnel states.

**Stats displayed:**
- Total participants, active count, at-risk count, average attendance rate

**Funnel state sections:**
- Access & Enrollment states (category: `access`)
- Engagement Levels (category: `engagement`)
- Exit States (category: `exit`)
- Auto-suggestions via `StateSuggestionsCard`

**Actions:**
- Manage Sessions → `/admin/programs/{programId}/sessions`
- Review Applications → `/admin/programs/{programId}/applications`
- Configure Funnel → `/admin/programs/{programId}/funnel-config`
- View members per state (dialog); change individual participant state; bulk state change
- Program Template Manager (inline)

**Known issues / gaps:**
- Comment in source: "Split candidate: ~422 lines — consider extracting ProgramStatsPanel, ProgramMembersPreview, and ProgramQuickActions into sub-components"
- `MyProgramsDashboard` (the `/program-admin` landing) is a separate component not inspected here — document it separately

---

## Platform Admin (`/platform-admin`)

**Component:** `src/app/components/admin/AdminDashboardTabbed.tsx`
**Access:** `role === 'super'` only (renders access-denied state for all other roles)

**What it does:** Main entry point for the full platform administration suite. Shows top-level stats and organises all admin sub-pages into eight thematic tabs.

**Stats always visible:**
- Total Users, Total Circles, Total Posts, Total Documents

**Tabs:**

### Tab 1 — Getting Started
Workflow: Platform Settings → Seed Data Config → Data Seeder → Demo Accounts
- Platform Settings (`/platform-admin/settings`)
- Template Library (`/templates`)
- Seed Data Config (`/platform-admin/seed-data`)
- Data Seeder (`/platform-admin/data-seeder`)
- Demo Accounts (`/platform-admin/demo-accounts`)
- Claimable Profiles (`/platform-admin/claimable-profiles`)
- Documentation Manager (`/platform-admin/documentation`)
- Link Library (`/platform-admin/links`)

### Tab 2 — Users & Permissions
Workflow: Manage Users → User Classes → Container Config → Badges & Notifications
- Manage Users (`/platform-admin/users`)
- User Class Management (`/platform-admin/user-classes`)
- Container Configuration (`/platform-admin/container-configuration`)
- Notification Configuration (`/platform-admin/notifications`)
- Notification Management (`/platform-admin/notifications/manage`)
- Container Memberships (`/platform-admin/container-memberships`)

### Tab 3 — Growth & Acquisition
Workflow: Shareable Links → Prospects → Applications → Invitations → Analytics
- Shareable Links (`/platform-admin/shareable-links`)
- Funnel Analytics (`/platform-admin/analytics`)
- Application Management (`/platform-admin/applications`)
- Prospect Management (`/platform-admin/prospects`)
- Waitlist Management (`/program-admin/waitlist`)
- Invitation System (`/platform-admin/invitations`)

### Tab 4 — Content & Engagement
- Tag Management (`/platform-admin/tags`)
- Events Management (`/platform-admin/events`)
- Feed Management (`/platform-admin/feed`)
- Forums Management (`/platform-admin/forums`)
- Documents Management (`/platform-admin/documents`)
- Reviews Management (`/platform-admin/reviews`)
- Announcements (`/platform-admin/announcements`)
- Topic Interests (`/platform-admin/topic-interests`)
- Topics & Tags Seeder (`/platform-admin/seed-topics-tags`)

### Tab 5 — Programs & Circles
- Programs Management (`/platform-admin/programs`)
- Circles Management (`/platform-admin/circles`)
- Courses Management (`/platform-admin/courses`)
- Program Backup & Restore (`/platform-admin/program-backup-restore`)
- Templates Manager (`/platform-admin/templates`)
- Container Templates (`/platform-admin/template-library`)
- Templates Library (`/platform-admin/templates-library`)
- Shareable Links (`/platform-admin/shareable-links`) — repeated from Tab 3
- Offerings Manager (`/platform-admin/offerings`)

### Tab 6 — Containers
- Batch Container Delete (`/platform-admin/batch-delete`) — marked dangerous; container type list loaded dynamically from `container_types` table with hardcoded fallback
- Lists Management (`/platform-admin/checklists`)
- Sprints Management (`/platform-admin/sprints`)
- Builds Management (`/platform-admin/builds`)

### Tab 7 — Commercial
Workflow: Membership Tiers → Sponsor Tiers → Payment Validation → Market Config
- Sponsor Management (`/platform-admin/sponsors`)
- Sponsor Tier Configuration (`/platform-admin/sponsor-tiers`)
- Membership Tier Permissions (`/platform-admin/membership-tiers`)
- Payment & Invoice Validation (`/platform-admin/payment`)
- Subscription Packages (`/platform-admin/subscription-packages`)
- Market Management (`/platform-admin/markets`)
- Companies Management (`/platform-admin/companies`)
- Ticket Templates (`/platform-admin/ticket-templates`)
- Ticket Inventory (`/platform-admin/ticket-inventory`)
- Kit Commerce Setup (`/platform-admin/kit-commerce`)

### Tab 8 — Database & Maintenance
Production launch workflow: Data Audit → Data Cleanup → Seed Data Config → Data Seeder → Verify

Analysis & Monitoring:
- Platform Analytics (`/platform-admin/analytics`)
- Data Audit (`/platform-admin/data-audit`)
- Content Moderation (`/platform-admin/content-moderation`)
- Flagged Content (`/platform-admin/flagged-content`)

Data Operations:
- Data Cleanup Utility (`/platform-admin/data-cleanup-utility`) — marked dangerous; container table list loaded dynamically from `container_types` table with hardcoded fallback
- Data Cleanup (`/platform-admin/data-cleanup`) — permanent deletion
- Account Management (`/platform-admin/account-management`)
- Deleted Documents (`/platform-admin/deleted-documents`)
- Batch Container Delete (`/platform-admin/batch-delete`) — repeated from Tab 6

Demo & Seed Data:
- Seed Data Config (`/platform-admin/seed-data`) — repeated from Tab 1
- Data Seeder (`/platform-admin/data-seeder`) — repeated from Tab 1
- Demo Accounts (`/platform-admin/demo-accounts`) — repeated from Tab 1

**Below all tabs:** `MyCircleLinksCard` and administered containers (same lists as My Admin but scoped to the super admin's own records)

**Known issues / gaps:**
- `AdminDashboardTabbed` is restricted to `role === 'super'` — `admin` role users see an access-denied state. The access levels table above reflects intended behaviour. Fix is deferred.
- Shareable Links appears in both Tab 3 (Growth) and Tab 5 (Programs) — duplicate entry
- Several entries in Tab 8 duplicate entries from other tabs (Seed Data Config, Data Seeder, Demo Accounts, Batch Delete)
- Waitlist Management link in Tab 3 points to `/program-admin/waitlist` (not under `/platform-admin`)

---

## User Management (`/platform-admin/users`)

**Component:** `src/app/components/admin/UserManagement.tsx`
**Access:** `role === 'super'`

**What it does:** Full user list with search, filter, and per-user management actions. Uses a server edge function for privileged `auth.admin` operations (the service role key is never exposed to the client).

**Filters:**
- Search (name / email)
- Role filter (member, host, moderator, admin, coordinator, manager, super)
- User class filter (classes 1–10, tabbed display)
- Membership tier filter
- Auth status filter (auth account exists / missing)

**Role definitions managed here:**
- member, host, moderator, admin, coordinator, manager, super

**User class names:** Loaded dynamically from the `user_classes` table. The default class (where `is_default = true`) is fetched at runtime — hardcoded fallback of `3` is retained only if the DB call fails. Current DB names: Class 1 - Starter, Class 2 - Basic, Class 3 - Standard, Class 4 - Plus, Class 5 - Advanced, Class 6 - Pro, Class 7 - Expert, Class 8 - Enterprise, Class 9 - Executive, Class 10 - Unlimited.

**Actions:**
- View user detail → `/platform-admin/users/{userId}`
- Change role
- Change user class
- Delete user (with confirmation dialog)
- Export users (CSV/JSON via download)
- Import users
- Impersonate user (uses `impersonateUser` from auth context)
- Lock / unlock account
- Credit card / payment status view

**Known issues / gaps:**
- Auth operations are proxied through a named Supabase Edge Function (`make-server-d7930c7f`); if that function is unavailable, privileged actions silently fail
- 8-second fetch timeout on server calls — no user-visible retry mechanism

---

## User Class Management (`/platform-admin/user-classes`)

**Component:** `src/app/components/admin/UserClassManagement.tsx`
**Access:** `role === 'super'`

**What it does:** Manages the ten user classes — their display names, capacity limits, and which are advertised to members for upgrade. This is the authoritative source for what each class can do; the nav visibility matrix (Container Configuration) is a separate concern.

**Data managed:** `user_classes` table

**Fields per class:**
- `class_number` (1–10, primary key)
- `display_name` — shown in User Management and MembershipManagement
- `max_admin_circles` — how many circles the user may administer (-1 = unlimited)
- `max_admin_containers` — how many containers the user may administer (-1 = unlimited)
- `max_member_containers` — how many containers the user may join (-1 = unlimited)
- `description` — shown in upgrade prompts
- `is_default` — the class assigned to new users if not set explicitly
- `is_advertised` — controls whether the class appears in the MembershipManagement upgrade UI (replaces former hardcoded range of classes 3–9)

**Actions:**
- Edit any class inline
- Save changes (upserts to `user_class_permissions`)
- Reset to defaults — calls `initializeDefaultClasses()`, which is now a fallback only and will not override existing DB values

**Current class values (as of April 2026):**

| Class | Name | max_admin_circles | max_admin_containers | max_member_containers |
|---|---|---|---|---|
| 1 | Starter | 0 | 0 | 5 |
| 2 | Basic | 0 | 10 | 10 |
| 3 | Standard | 1 | 30 | 30 |
| 4 | Plus | 5 | 40 | 40 |
| 5 | Advanced | 10 | 50 | 50 |
| 6 | Pro | 30 | 60 | 60 |
| 7 | Expert | 30 | 90 | 90 |
| 8 | Enterprise | 90 | 90 | 90 |
| 9 | Executive | -1 | -1 | -1 |
| 10 | Unlimited | -1 | -1 | -1 |

**Known issues / gaps:**
- `is_advertised` field is stored in the DB but is not yet surfaced as an editable toggle in the User Class Management UI — currently set directly via SQL

---

## Platform Settings (`/platform-admin/settings`)

**Component:** `src/app/components/admin/PlatformSettings.tsx`
**Access:** `role === 'super'`

**What it does:** Configures global platform identity, branding, and marketing page content. Reads from and writes to the `platform_settings` Supabase table (single-row).

**Sections:**
1. **Branding Reference** — company name, product name, tagline (read-only; hardcoded in code, shown for reference). Editable: support email, app base URL (used for shareable link generation)
2. **Branding & Assets** — logo URL, favicon URL (with logo preview)
3. **Color Scheme** — primary and secondary hex color with live preview swatches
4. **Demo Account** — toggle, email, password. Requires a DB migration to add columns; shows inline SQL snippet if columns are absent
5. **Guest Browsing** — toggle to show/hide "Browse as Visitor" and "Browse as Guest" options on the login page
6. **Marketing Landing Page Content** — hero badge text, headline (two parts), description, three CTA button labels, three audience segments (title + description each)
7. **ConvertKit Newsletter Integration** — form ID, script URL (for embedded form), or alternatively a button URL and button text
8. **Footer Links** — about, contact, privacy, terms URLs; email and website social links

**Known issues / gaps:**
- Company name, product name, and tagline are described as "hardcoded in application code" and shown read-only in the UI — they cannot actually be changed without a code deploy
- Legacy `platform_name`, `platform_tagline`, `platform_description` fields are hidden under a `<details>` collapse but still saved; relationship to hardcoded branding values is unclear
- No file-upload for logo/favicon — URL entry only
- If the `platform_settings` table does not exist, settings display defaults but save will fail with a `42P01` error

---

## Container Configuration (`/platform-admin/container-configuration`)

**Component:** `src/app/components/admin/ContainerConfigurationPage.tsx`
**Access:** `role === 'super'`

**What it does:** Controls which nav items are visible for each user class (1–10). Reads from `container_types` and `user_class_permissions` tables. The `container_types` table now covers all nav item types — not just containers and content types — including home, news, circles, calendar, programs, courses, events, forums, and prompts as well as the original container types (tables, meetings, libraries etc.) and content types (documents, episodes, books, blogs, reviews, decks, posts).

**Data managed:** A matrix of nav item type × user class → `visible` boolean and `sort_order`

**User class list source:** Fetched dynamically from `user_classes` table. Falls back to a hardcoded list of ten classes only if the DB call fails.

**Actions:**
- Toggle visibility of each nav type per user class
- Adjust sort order
- Save changes (upserts to `user_class_permissions`)
- Reset to defaults

**Known issues / gaps:**
- Comment in source: "Split candidate: ~597 lines — consider extracting NavigationConfigPanel, ContainerVisibilityForm, and ContainerDefaultsPanel into sub-components"
- `forums` and `prompts` are in `container_types` and configurable in the matrix but neither has a page or route yet — enabling them causes a nav item that leads nowhere (both deferred)
- If `container_types` table is missing, the page surfaces a `migrationNeeded` warning and stops loading

---

## Data Audit (`/platform-admin/data-audit`)

**Component:** `src/app/components/admin/DataAuditDashboard.tsx`
**Access:** `role === 'super'` (implied by placement in platform admin; no explicit guard in component)

**What it does:** Health check dashboard that reads across all major tables in parallel and surfaces counts, inconsistencies, and test data.

**Data audited:**
- Users: total, by role, with content, empty profiles, test accounts
- Circles: total, with members, empty
- Content: posts, moments, companies, playlists, orphaned posts
- Memberships: total, by tier
- Demo accounts count
- Claimable profiles count

**Actions:**
- Expand/collapse detail lists for test accounts and empty users
- Refresh audit
- Fix actions (AuditFixButton)

**Known issues / gaps:**
- Comment in source: "Split candidate: ~472 lines — consider extracting AuditSummaryCards, DataConsistencyTable, and AuditFixButton into sub-components"

---

## Course Admin (`/platform-admin/courses`)

**Component:** `src/app/components/admin/CoursesManagement.tsx`
**Access:** `role === 'super'`

**What it does:** Lists all courses with search. Supports creating, editing, deleting, and viewing courses. Links to an instructor view.

**Actions:**
- Create course
- Search by title
- Delete course (with confirmation)
- View course settings
- View course as member

---

## Pathways Admin (`/platform-admin/pathways`)

**Component:** `src/app/components/growth/PathwayAdminPage.tsx`
**Access:** Checked via `hasRoleLevel` (likely `admin` or `super`)

**What it does:** Admin form for creating and editing learning pathways. Not a drag-and-drop builder — a structured form only.

**Fields:** Name, description, visibility, active toggle; pathway steps with ordering (move up/down), step type (badge, course, content, etc.), step content reference

**Actions:**
- Create / edit pathway
- Add / remove / reorder steps
- Publish / archive
- Search existing pathways

---

## Badge Admin (`/platform-admin/badge-admin`)

**Component:** `src/app/components/admin/BadgeAdminHub.tsx`
**Access:** `role === 'admin'` or `role === 'super'` (implied by platform admin routing)

**What it does:** Consolidated badge management hub with four tabs.

**Tabs:**
1. **Badge Types** — create, edit, delete, toggle active/inactive
2. **Award Badge** — manually issue a badge to any user or company (uses `AdminBadgeAssignment` component and `issueBadge` / `revokeBadge` from `badgeService`)
3. **Recipients** — all issued badges with cross-badge filtering, revoke action
4. **Progress** — pathway-linked funnel showing Earned / In Progress / Enrolled counts per user, with progress percentage

**Known issues / gaps:**
- Server-side calls go through the same edge function (`make-server-d7930c7f`) used by UserManagement; failure mode is the same (silent timeout)

---

## Ticket Templates (`/platform-admin/ticket-templates`)

**Component:** `src/app/components/admin/TicketTemplatesAdmin.tsx`
**Access:** `role === 'super'`

**What it does:** Manages ticket template "product definitions" — blueprints from which inventory batches are generated. Templates define what a ticket unlocks (program, course, or marketplace offering access).

**Fields per template:**
- Name, description, price (in cents), expiry configuration, container type linkage (program / course / marketplace offering), unlock rules, status (active / archived)

**Actions:**
- Create / edit template
- Archive template
- Search templates
- Link template to a container via `ContainerSearch` (typeahead on name, min 2 characters)

---

## Ticket Inventory (`/platform-admin/ticket-inventory`)

**Component:** `src/app/components/admin/TicketInventoryAdmin.tsx`
**Access:** `role === 'super'`

**What it does:** Creates batches of inventory items from templates, tracks status (available / assigned / voided), and assigns tickets to specific users.

**Inventory item statuses:** `available`, `assigned`, `voided`

**Actions:**
- Generate inventory batch from a template
- Search inventory (by template, status, user)
- Assign ticket to a user (user search with 300ms debounce, min 2 characters)
- Void ticket (with confirmation)
- Filter by status
- View waitlist entries (via `waitlistApi`)

---

## Kit Commerce (`/platform-admin/kit-commerce`)

**Component:** `src/app/components/admin/KitCommerceAdmin.tsx`
**Access:** `role === 'super'`

**What it does:** Setup and monitoring page for the Kit (ConvertKit) → Ticket pipeline. Shows webhook configuration, pipeline health, and recent purchase logs.

**Sections:**
1. **Webhook URLs** — pre-formatted webhook endpoint URLs to paste into the Kit dashboard, each with a copy-to-clipboard button
2. **Pipeline Chain Audit** — lists all market offerings with Kit product IDs, their linked ticket templates, and inventory health (available vs. assigned count); highlights gaps in the chain
3. **Recent Kit Purchases Log** — reads from KV store; shows email, product name, total, purchase type, timestamp, user match, template name
4. **Quick-action links** — shortcuts to fix each type of gap (missing Kit ID on offering, missing template, low inventory)

**Data managed:** `market_offerings` (kit_product_id, kit_product_url, purchase_type), ticket templates, inventory counts

---

## Market Admin (`/platform-admin/markets`)

**Component:** `src/app/components/admin/MarketManagement.tsx`
**Access:** `role === 'super'`

**What it does:** Manages marketplace "market" categories (name, slug, icon, color, active toggle) and the offerings and companies within each market.

**Data managed:** `markets` table, `companies`, `market_offerings`

**Actions:**
- Create / edit / delete market
- Toggle market active/inactive
- Search markets and their offerings
- View companies per market
- Configure market (link to `/platform-admin/markets/configuration`)

---

## Companies Admin (`/platform-admin/companies`)

**Component:** `src/app/components/admin/CompaniesManagement.tsx`
**Access:** `role === 'super'`

**What it does:** Platform-wide company directory management.

**Data managed:** `companies` table (name, slug, tagline, description, logo, website, industry, location, team size, public/private status)

**Actions:**
- Search companies
- Create company (dialog form)
- Edit company
- Delete company (with confirmation)
- Export as JSON
- Import from JSON or CSV (file upload)
- View company profile (external link)

---

## Shareable Links Manager (`/platform-admin/shareable-links`)

**Component:** `src/app/components/admin/ShareableLinksManager.tsx`
**Access:** `role === 'admin'` or `role === 'super'`

**What it does:** Generates shareable landing page URLs for all programs and circles. Uses the `app_base_url` from `platform_settings` as the base (falls back to `window.location.origin`).

**Data managed:** All programs (id, name, slug, status) and circles (id, name, access_type)

**Actions per item:**
- Copy shareable URL to clipboard
- Open URL in new tab
- Preview link (eye icon)

**Search:** Filters both programs and circles by name in real time

**Known issues / gaps:**
- Comment in source: "Split candidate: ~450 lines — consider extracting ShareableLinkRow, CreateLinkDialog, and LinkAnalyticsPanel into sub-components"
- No analytics shown for individual links (click/view counts are not surfaced here, even though `AdminLinkLibrary` tracks them separately)

---

## Link Library Admin (`/platform-admin/links`) — Super Admin only

**Component:** `src/app/components/admin/AdminLinkLibrary.tsx`
**Access:** `role === 'super'` or `role === 'admin'` (checked in `useEffect`; the route appears only in the "Getting Started" tab of `AdminDashboardTabbed`, which is itself super-only)

**What it does:** Manages the platform's curated link library — both link records and hosted content items. Links can be AI prompts, external URLs, or references to hosted content.

**Link types:** `ai_prompt`, `external_url`, `hosted_content`

**Fields per link:** title, description, category, tags, visibility, external URL or prompt text or content reference, click/view counts

**Actions:**
- Create link → `/platform-admin/links/create`
- Edit link → `/platform-admin/links/{linkId}/edit`
- Delete link (with confirmation dialog)
- View link
- Create / edit / delete hosted content items
- Filter by type

**Known issues / gaps:**
- Comment in source: "Split candidate: ~426 lines — consider extracting LinkCard, LinkCreateForm, and LinkAnalyticsRow into sub-components"
- Access guard allows `role === 'admin'` as well as `super`, but the page is only reachable via the super-only platform admin dashboard — admin-role users have no sidebar path to it
