# Dead Ends — Development Plan

> **Purpose:** Eliminate every place in the platform where the UI promises a feature
> to the user but the underlying code is missing, stubbed, or hardcoded.
>
> Items are grouped into four phases by effort and type of fix. Each phase can be
> worked independently. Phase 1 and 2 items are pure wiring — no new pages required.
> Phase 3 and 4 items require new components or non-trivial new logic.
>
> Last updated: April 2026 — All phases complete. All 19 items resolved.

---

## Phase 1 — Honest UI ✅ All complete

### P1-1 — Fix fake "Request to Join" toast  ✅ Fixed
`useContainerActions.ts` deleted (was never imported anywhere — the stub was dead code).
Migration `20260427000003` creates `circle_members` and `container_memberships` tables
with correct RLS. `ApplicationForm.tsx` now writes to the real tables.

### P1-2 — Fix My Links dead action buttons  ✅ Fixed
`handleEnrichSingle` and `handleDeleteContent` are present in `MyContentsPage.tsx`.
Add folder wired to folder creation flow.

### P1-3 — Fix missing WhatsApp edit button on My Basics  ✅ Fixed
`ContactTab.tsx` is itself an edit form with a Save button — no separate Edit Profile
button is needed.

### P1-4 — Fix My Circles "Create Circle" button  ✅ Fixed
Button navigates to `/circle-admin` which contains the full circle creation flow.

### P1-5 — Fix Events RSVP handler  ✅ Fixed
`RSVPActions` component handles RSVP with real DB writes to `session_attendance`
and `events.attendee_ids`.

### P1-6 — Fix Notifications "Load More" button  ✅ Fixed
Button calls `fetchNotifications(page + 1)` with correct pagination logic.

---

## Phase 2 — Real data ✅ All complete

### P2-1 — Fix My Growth pathway progress tracker  ✅ Fixed
`pathway_step_completions` table created (migration `20260427000002`).
`PathwayDetailPage` loads persisted completions on mount. Each step shows correct
state: completed, pending admin review, or not started.

### P2-2 — Fix library document counts and "Shared with Me" filter  ✅ Fixed
Auto-generated libraries now apply `filter_rules` (document_type, intended_audience,
tags[]) as a live count query. "Shared with Me" queries user's member circle IDs and
uses `overlaps` on `documents.circle_ids`, excluding the user's own docs. Same fix
applied in `LibraryDetailPage`.

### P2-3 — Fix hardcoded `recentActivity = 0` stats  ✅ Fixed
`MyAdminDashboard` counts `membership_states` + `container_memberships` (circle join
requests) in the last 30 days. `CircleAdminPage` counts posts across the admin's circles
in the last 30 days.

### P2-4 — Fix `isFavorited` hardcoded to `false` in My Documents  ✅ Fixed
`MyDocumentsPage` fetches `favoritedDocIds` from `content_favorites` on mount and
sets correct state on each document card.

### P2-5 — Fix Book topic loss on edit  ✅ Fixed
`handleEditBook` now awaits a fetch of existing topics from `content_topics` before
opening the dialog. `TopicSelector` added to the edit form. Save always syncs topics.

---

## Phase 3 — Missing pages ✅ All resolved

### P3-1 — Build StandupDetailPage  ✅ Already existed
`src/app/components/standup/StandupDetailPage.tsx` exists and is registered
at `/standups/:slug` in App.tsx. Was a false alarm in the original audit.

### P3-2 — Build missing container create forms  ✅ Already existed
All three pages exist and are registered in App.tsx:
- `CreateTablePage.tsx` → `/tables/create`
- `CreatePitchPage.tsx` → `/pitches/create`
- `CreateBuildPage.tsx` → `/builds/new`
False alarms in the original audit.

### P3-3 — Build Market Search page  ✅ Built April 2026
`src/app/pages/MarketSearchPage.tsx` created. Searches across all `market_placements`
by name, tagline, offering type, and market name. Deduplicates by offering, enriches
with company/owner names. Registered at `/markets/search`.

### P3-4 — Build Discover Guide page  ✅ Built April 2026
`src/app/pages/DiscoverGuidePage.tsx` created. 7-section guide with tips panel per
section, quick-tips strip, and related areas row. Registered at `/help/discover`.

---

## Phase 4 — Missing features requiring new logic or design
*Features that are visible in the UI or advertised to users but have no
implementation beneath them.*

### P4-1 — Implement reordering for companion/playlist items  ✅ Fixed
Three places had a `GripVertical` drag handle icon with no logic:
- Edit Company Companion view (`EditCompanyPage.tsx`)
- Event Companions list (`EventCompanionDetailPage.tsx`)
- Playlists (`PlaylistSettingsPage.tsx`)

**Fix applied:** Used up/down arrow buttons (consistent with `PathwayAdminPage` and
`MarketsConfiguration` patterns already in the codebase — `react-dnd` was installed
but never used anywhere). Each location now has a `moveItem` function that swaps
`order_index` values between adjacent rows via two concurrent Supabase UPDATE calls,
then re-sorts local state. `PlaylistSettingsPage` already had working `handleReorderEpisode`
— only the decorative `GripVertical` wrapper was removed.

---

### P4-2 — Add `is_public` toggle for skills and credentials on profile  ✅ Fixed
Eye/EyeOff toggle added to each skill row and credential card in `SkillsTab.tsx`.
Calls `updateSkill` / `updateCredential` with `is_public: true/false` on click.
New items default to `is_public: true`. `UserProfilePage.tsx` already filtered on
`is_public = true` — the toggle takes effect immediately on the public profile.

---

### P4-3 — Implement Moments comments  ✅ Fixed
**Files:** `src/app/components/MomentsPage.tsx`
`allow_comments` flag now gates a visible comment section on each post card.
Comments load lazily from the `comments` table (keyed by `post_id`) when the user
clicks the MessageSquare / Comment toggle. Submitting inserts to `comments` with
`post_id` + `author_id` + `content`. Enter key submits. The footer row combines
reactions and comment toggle; both are hidden if both flags are off.

---

### P4-4 — Implement Course Certificate of Completion  ✅ Fixed
**File:** `src/app/components/CoursePlayerPage.tsx`
Sidebar "Complete Course" button replaced with "Get Certificate" (visible only
when `overallProgress === 100`). Clicking calls `handleGetCertificate()` which
opens a new tab with a styled HTML certificate (user name, course title, completion
date) and a "Print / Save as PDF" button — no new dependencies needed.
`completed_at` added to the `Enrollment` interface so the date is pulled from the
actual enrollment record when available.

---

### P4-5 — Fix "Start from Scratch" for custom program creation  ✅ Fixed
`CreateProgramPage.tsx`: "Create Custom Program" button now expands an inline
name form instead of opening the template picker. On submit: inserts a minimal
program record (no circle, no journeys pre-created) and navigates to
`/program-admin/:id/setup` where the admin builds it out from scratch.

---

## Priority Summary

| Phase | Items | Status |
|---|---|---|
| **Phase 1** — Honest UI | P1-1 through P1-6 | ✅ All complete |
| **Phase 2** — Real data | P2-1 through P2-5 | ✅ All complete |
| **Phase 3** — Missing pages | P3-1 through P3-4 | ✅ All complete (2 were false alarms, 2 built) |
| **Phase 4** — Missing features | P4-1 through P4-5 | ✅ All complete |

**Phase 4 status:**
- ✅ P4-5 (Start from Scratch) — fixed April 2026
- ✅ P4-2 (skills/credentials visibility toggle) — fixed April 2026
- ✅ P4-1 (item reordering — up/down arrows) — fixed April 2026; 3 locations: EditCompanyPage, EventCompanionDetailPage, PlaylistSettingsPage
- ✅ P4-3 (Moments comments) — fixed April 2026; lazy-loaded per post, gated by `allow_comments`
- ✅ P4-4 (Course certificate) — fixed April 2026; print-to-PDF via `window.open` + styled HTML template

---

## Related Documentation

| Document | Relevance |
|---|---|
| `docs/sidebar/SIDEBAR_INDEX.md` | Cross-cutting issues table — several items above were first noted there |
| `docs/sidebar/HEADER_COURSES.md` | Course certificate gap documented in CourseLandingPage known issues |
| `docs/USER_CONTENT_PLAN.md` | My Links dead buttons overlap with Phase 1 content plan items |
| `docs/SESSION_APRIL_19.md` | Platform Admin dead ends (forums, prompts pages) — tracked separately |
