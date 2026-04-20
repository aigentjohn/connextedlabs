# Sidebar Section: User

The User section sits at the very top of the sidebar, above all other sections.
It displays the logged-in user's identity (membership tier badge) and, when
expanded, provides links to the user's home, notifications, tickets, profile
edit pages, account/membership page, and help docs.

**Component:** `src/app/components/sidebar/UserSection.tsx`
**Rendered by:** `src/app/components/Sidebar.tsx` (receives `profile`, `isExpanded`, `onToggle`, `ticketCount` props)

---

## Sidebar User Block

**What it shows:**
- A chevron expand/collapse toggle button
- A link to `/` (My Home) labeled **USER** in bold
- A membership tier badge (e.g., "Free", "Pro") derived from `profile.membership_tier` via `formatMembershipTier()`
- The badge uses green styling (`bg-green-50 text-green-700`)

**Expanded links (shown when section is open):**

| Label | Route | Icon | Notes |
|---|---|---|---|
| My Home | `/` | Home | Exact-match active state |
| Notifications | `/notifications` | Bell | |
| My Tickets | `/my-tickets` | Ticket | Shows a count badge if `ticketCount > 0`; count is fetched via `accessTicketService.getUserActiveTickets()` at sidebar load |
| My Basics | `/my-basics` | UserCircle | startsWith match |
| My Professional | `/my-professional` | Briefcase | startsWith match |
| My Engagement | `/my-engagement` | Activity | startsWith match |
| My Account | `/my-account` | CreditCard | startsWith match |
| Help & Docs | `/help/welcome` | HelpCircle | startsWith `/help` |

Active links are highlighted with `bg-indigo-50 text-indigo-700`.

---

## My Home (`/`)

The platform home/dashboard page. Not a profile management page; listed here
because it is the primary link under the USER section header.

---

## Notifications (`/notifications`)

**Component:** `src/app/components/NotificationsPage.tsx`

**What it does:** Shows all of the logged-in user's notifications. Supports
filtering by category and managing read/unread state.

**Filter tabs:** All, Unread, Social, Events, Circles, Programs, System

**Notification categories and types:**
- **Social:** comment, comment_reply, mention, like, favorite, follow, share
- **Events:** event_created, event_cancelled, rsvp, session_reminder, etc.
- **Circles:** circle.member_joined, circle_invite, join_request, container.state_changed, etc.
- **Programs:** application_received/approved/rejected, enrollment_complete, payment_update, ticket_assigned, waitlist_fulfilled, course_enrolled, etc.
- **System:** welcome, announcement, content_flagged, content_approved, etc.

**Actions available:**
- Click a notification to mark it as read and navigate to its link
- Mark individual notifications as read
- Mark all as read
- Delete individual notifications
- Open a **Preferences** dialog (gear icon) to toggle whole categories on/off

**Notification preferences:**
Stored in `user_notification_preferences` table (columns: `user_id`, `category`, `enabled`).
Categories are enabled by default. The table is handled gracefully — a missing
table (error codes `PGRST116`, `PGRST204`, `42P01`) does not break the page.

**Known issues / gaps:**
- "Load More" button is shown when notifications hit the 100-item limit, but the
  handler is not implemented (the button renders but performs no action).
- Actor avatars are fetched as part of the notification record (`actor` field)
  but are not rendered in the notification list UI.
- `notification.link` vs `notification.link_url` vs `notification.action_url`:
  the code handles both `link_url` and `action_url` column names for navigation,
  but the `MemberStatusDashboard` uses a `notification.link` field — these column
  names may not be consistent across all notification sources.

---

## My Tickets (`/my-tickets`)

**Component:** `src/app/components/tickets/TicketWalletDashboard.tsx`

**What it does:** The user's ticket wallet. Shows inventory tickets assigned to
the user and waitlist positions they hold.

**Tabs:** (inferred from component structure) active tickets, waitlist positions

**What tickets represent:** Tickets unlock access to containers (programs,
courses, marketplace offerings). They are purchased or claimed through the
marketplace and can carry a referral code, expiry date, progress percentage,
and status.

**Actions available:**
- View ticket details (template color, container type/name, expiry)
- Copy referral code
- Link through to the associated container
- Cancel a waitlist position (with confirmation dialog)

---

## My Basics (`/my-basics`)

**Component:** `src/app/components/MyBasicsPage.tsx`
**Shell:** `ProfilePageShell` — shared header card showing avatar, name, bio,
follower/following counts, and earned badges.

**Purpose:** Core identity and contact information. First of four profile
sub-pages.

**Onboarding wizard:** Auto-launches for new users who have not completed
onboarding (`!profile.onboarding_completed && !profile.bio && !profile.professional_roles?.length`).
Component: `ProfileOnboardingWizard`.

**Tabs:**

### About tab

**Editable fields (saved to `users` table):**
- `name` (required) — full display name
- `tagline` — short headline, max 100 characters
- `bio` — free-text introduction, max 1000 characters
- `avatar` — URL to profile picture (JPEG, PNG, GIF, WebP)

Avatar upload is URL-entry only; there is no file upload picker.
Save is manual (explicit "Save Changes" button); unsaved-changes state is tracked locally.

### Contact tab

**Editable fields (saved to `users` table):**
- `phone_number`
- `location`
- `allow_vcard_export` (toggle — lets other members download user's vCard)
- `contact_preferences` JSONB — opt-in flags for `email`, `phone`, `whatsapp`

**Read-only in this tab:**
- `email` — shown but disabled; cannot be changed here
- `whatsapp_number` — shown but disabled; the tab instructs users to use the
  (now-removed or separate) "Edit Profile" button to change it

**Privacy badges:** Each contact field shows a read-only Public/Private badge
reflecting `privacy_settings` (managed in the Privacy tab). A link navigates
to the Privacy tab directly.

**vCard actions:**
- Export My vCard — generates and downloads a `.vcf` from current profile data
- Import vCard — opens `VCardImportDialog`; on completion calls `importVCardData()`
  and reloads the page (`window.location.reload()`)

**Known issues / gaps:**
- `whatsapp_number` cannot be edited in the Contact tab. The tab instructs users
  to click "Edit Profile" — but no such button is present in the current
  `ProfilePageShell` layout. This is a gap.
- The page reload on vCard import (`setTimeout(() => window.location.reload(), 1000)`)
  is a crude pattern that loses in-page state.

### Social tab

**Editable fields (saved to `users.social_links` JSONB and `users.privacy_settings` JSONB):**

Social link URLs:
- `website`
- `linkedin`
- `twitter` (labeled "X (Twitter)")
- `facebook`
- `instagram`
- `github`
- `calendly`

Per-platform visibility toggles (stored in `privacy_settings`):
- `show_website`, `show_linkedin`, `show_twitter`, `show_facebook`,
  `show_instagram`, `show_github`, `show_calendly`

Global toggle:
- `share_social_links` — master switch; disabling it hides all links regardless
  of individual toggles

Save is manual (explicit "Save Changes" button). Uses a spread-then-overlay
pattern when writing `privacy_settings` to avoid overwriting keys owned by
other tabs (contact privacy, etc.).

### Privacy tab

**Editable fields (saved to `users.privacy_settings` JSONB):**

Contact information visibility (switches toggle between "Visible to members" / "Only visible to you"):
- `email_private` (default: false — email visible)
- `phone_private` (default: true — phone hidden)
- `whatsapp_private` (default: false — WhatsApp visible)
- `location_private` (default: false — location visible)

Profile visibility:
- `profile_public` (default: true)
- `show_connections` (default: true)

Also shows a **Privacy Summary** card listing all settings at a glance.
Uses spread-then-overlay saves to avoid clobbering social-link keys owned by
the Social tab.

Social link visibility is not managed here — the tab explicitly notes that
it is owned by the Social tab.

**Known issues / gaps:**
- `show_looking_for` (used by LookingForTab) is not shown in the Privacy tab
  summary; it is set only from the LookingForTab's own visibility toggle.
- Admins bypass all privacy checks globally (enforced in `UserProfilePage`,
  not in the Privacy tab itself).

---

## My Professional (`/my-professional`)

**Component:** `src/app/components/MyProfessionalPage.tsx`
**Shell:** `ProfilePageShell`

**Purpose:** Professional identity — current role, work history, affiliations,
skills, credentials, earned badges, and bulk data import/export.

**Tabs:**

### Professional tab

**Editable fields (current role — saved to `users` table):**
- `professional_status` — select: Active, Inactive, Retired, Student, Unemployed
- `job_title` (aka `current_role`)
- `company_name` (aka `current_company`)
- `years_experience` — integer

Current-role fields save automatically `onBlur`; no explicit save button.

**Work Experience** (saved to `user_affiliations` table, `organization_type = 'employer'`):
- `role` (job title)
- `organization_name` (company)
- `start_date` / `end_date` (month picker)
- `current` checkbox (clears end_date if checked)
- `description` (optional free text)

Each work history entry saves on field-blur. Add/delete buttons present.

**Professional Affiliations** (saved to `user_affiliations`, non-employer types):
- `organization_name`
- `role` / position
- `description` (optional)

Add/delete buttons present.

**Known issues / gaps:**
- Work history entries save field-by-field on blur rather than with a single
  save action — a network call fires for every changed field.
- `organization_type` for affiliations defaults to `'organization'` and is not
  surfaced as an editable field in the UI.
- `hasChanges` state only tracks the top-level current-role fields; the
  "unsaved changes" indicator does not account for work history or affiliation
  edits.

### Skills tab

**Managed via `user_skills` table:**
- `skill_name` (text)
- `proficiency_level` — select: Beginner, Intermediate, Advanced, Expert

Add/delete buttons present. Skills save on change (field-level blur/change).

**Managed via `user_credentials` table:**
- `credential_name`
- `issuing_organization`
- `issue_date` / `expiry_date` (month pickers)
- `credential_url` (optional link)

Add/delete buttons present.

**Earned Badges** (read-only display from `user_badges` joined with `badges`):
Shows badge name, description, earned date. No editing here — badges are
awarded by the platform.

### Data tab

**Component:** `ProfileDataTab`

Utility operations for bulk profile data:
- **Onboarding Wizard** — "Start Wizard" button navigates to `/my-basics`
  (where the wizard auto-launches)
- **Export JSON Resume** — generates a JSON Resume-format file from current
  profile data (name, bio, contact, social links, skills, credentials from DB)
- **Import JSON Resume** — file picker; imports JSON Resume data into profile
- **Export vCard** — generates a `.vcf` contact card
- **Import vCard** — opens `VCardImportDialog`

**Known issues / gaps:**
- "Start Wizard" navigates to `/my-basics` via `window.location.href` (hard
  redirect) rather than React Router's `navigate()`.

---

## My Engagement (`/my-engagement`)

**Component:** `src/app/components/MyEngagementPage.tsx`
**Shell:** `ProfilePageShell`

**Purpose:** Engagement profile — member status dashboard, interests/topics,
and what the user is looking for from the community.

**Tabs:**

### My Status tab

**Component:** `MemberStatusDashboard`

Read-only dashboard (no editable fields). Shows:
- Recent notifications (last 5, with link to `/notifications`)
- Programs and Circles the user is a member of, grouped by action category
  (Action Required, Upcoming, Active, Pending, Completed)
- Quick stats: count of action-required items, active items, total items

Action items are derived from `getMemberStateForUser()` and `stateToMemberAction()`
utilities. Clears notification flag via `clearNotificationFlag(userId)` on load.

### Interests tab

**Component:** `InterestsTab`

**Editable fields (saved to `users` table):**
- `career_stage` — single-select from 8 options (Student, Emerging Professional,
  Established Professional, Senior Leader, Founder, Coach/Consultant,
  Career Changer, Retired/Advisor). Saves immediately on click.
- `professional_roles` (array) — free-text tags + quick-add from preset list
  (Coach, Consultant, Founder, Manager, etc.). Saves on add/remove.
- `interests` (array) — free-text tags + quick-add from preset list of 17
  common interests. Saves on add/remove.
- **Watched Topics** — follows/unfollows platform topics via Edge Function
  (`make-server-d7930c7f`). Shows watcher/content counts per topic, with
  recommended topics for quick follow.

**Known issues / gaps:**
- Topic follow/unfollow calls a Supabase Edge Function with `publicAnonKey`
  directly in the component — auth token is exposed in client code.
- Recommended topics fetch endpoint (`/users/:id/topics/recommended?limit=3`)
  always requests 3; this limit is not configurable.

### Looking For tab

**Component:** `LookingForTab`

**Editable fields (saved to `users` table and `users.privacy_settings`):**
- `looking_for` (array) — multi-select from 6 preset options:
  Peer Support, Mentorship, Skill Building, Accountability, Clients & Visibility,
  Co-Creation & Collaboration. Custom items can also be added.
- `looking_for_details` — free text, max 500 characters, for additional context
- `privacy_settings.show_looking_for` — visibility toggle (show on public profile)

Save is manual (explicit "Save Changes" button).

---

## My Account (`/my-account`)

**Component:** `src/app/components/MyAccountPage.tsx`
**Shell:** `ProfilePageShell` (sectionLabel "My Account")

**Purpose:** Shows the user's current membership class (access level) and
options for upgrading. This is not a billing page — Connexted uses a ticket/
access-class model rather than subscription billing.

**Component:** `MembershipManagement` (`src/app/components/profile/MembershipManagement.tsx`)

**What it shows:**
- **Your Access Level** card — current `user_class` number and its display name
  (read from `user_classes` table). Shows limits for:
  - Max Admin Circles
  - Max Admin Containers
  - Max Member Containers
  (Unlimited classes show ∞)
- **My Tickets link** — "Have upgrade tickets?" prompt with a button to `/my-tickets`
- **Your Current Usage** — progress bars showing current usage against limits for
  Admin Circles, Admin Containers, Member Containers (and Member Circles, which
  are unlimited)
- **Available for You** — marketplace offerings the user does not already have
  a ticket for; filtered from `market_offerings` table minus already-claimed
  offering tickets
- **Compare User Classes** — grid showing classes 3–9 (Visitor/Guest classes 1–2
  and Platform Admin class 10 are excluded) with their limits; current class
  is highlighted

**No editable fields** — class upgrades are applied by redeeming a ticket on
the My Tickets page, not edited directly here.

**Known issues / gaps:**
- Usage counts for containers query 7 container types (`tables`, `elevators`,
  `meetings`, `pitches`, `builds`, `standups`, `meetups`) but do not include
  `sprints`, `checklists`, `magazines`, `playlists`, or `episodes` — so the
  displayed count may under-report actual usage.
- If the `user_classes` table has no row for the user's class number, a
  hardcoded fallback formula is used (`max_admin_circles = class - 2`,
  `max_admin_containers = class * 5`, etc.) which may not match actual
  platform configuration.
- Upgrade offerings use `accessTicketService.getUserActiveTickets()` to
  determine what the user already has — if a ticket is inactive/expired it
  won't be in the exclusion set, potentially showing an offering the user
  already claimed in a past state.

---

## Help & Docs (`/help/welcome`, route prefix `/help`)

**Component:** `HelpViewer` (registered in App.tsx as `/help` and `/help/:type`)

Not fully researched in this pass. The sidebar links to `/help/welcome` as an
entry point. The route accepts a `:type` param suggesting a multi-section
help system.

---

## Public User Profile (`/users/:userId`)

**Component:** `src/app/components/UserProfilePage.tsx`

This is the **read-only public view** of any member's profile, reached from
member directories, follower/following lists, etc. It is distinct from the
owner-edit pages above.

**What it shows (header):**
- Avatar (24×24), name, email (if not private), role badge, membership tier badge
- Join date
- Earned badges (up to 6 inline via `BadgeDisplay`)
- Followers / Following counts (links to `/users/:id/followers` and `/users/:id/following`)
  — hidden if `privacy_settings.show_connections === false`
- Bio
- Quick-link buttons: WhatsApp (if not private and number set), Moments, Portfolio

**Privacy enforcement:** Reads `user.privacy_settings`:
- `email_private` — hides email
- `whatsapp_private` — hides WhatsApp button
- `show_connections` — hides follower/following counts
Admins bypass all checks.

**Stats cards:** Posts & Threads, Documents, Events Created, Circles Joined

**Tabs:**
- **Recent Activity** — last 10 posts (content preview + date)
- **Professional** — professional status, job title, company, years experience;
  public skills (from `user_skills` where `is_public = true`); public credentials
  (from `user_credentials` where `is_public = true`); public affiliations
  (from `user_affiliations` where `is_public = true`); earned badges
- **Circles** — grid of circles the user is a member of (links to each circle)
- **Contributions** — forum thread count and document count

**Follow / Unfollow:**
Other users can follow/unfollow from the profile header. Follow writes to
`user_connections` table and sends a `notifyNewFollower` notification.
Own-profile view shows a "View My Profile" button linking to `/my-basics`
instead of the follow button.

**Known issues / gaps:**
- Recent posts tab shows only posts (`posts` table), not forum threads; threads
  are fetched but only shown as a count in the Contributions tab.
- `is_public` filtering on skills/credentials/affiliations means items the
  owner marked private are invisible here, but there is no UI in the edit tabs
  (SkillsTab, ProfessionalTab) to toggle the `is_public` flag — it defaults to
  whatever the DB default is and cannot be changed by the user.
- Followers/following counts are stored as denormalized integers
  (`followers_count`, `following_count`) on the `users` row and updated
  optimistically in local state — they are not recalculated from the
  `user_connections` table on load, so they can drift.
