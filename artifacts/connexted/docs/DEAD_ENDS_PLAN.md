# Dead Ends — Development Plan

> **Purpose:** Eliminate every place in the platform where the UI promises a feature
> to the user but the underlying code is missing, stubbed, or hardcoded.
>
> Items are grouped into four phases by effort and type of fix. Each phase can be
> worked independently. Phase 1 and 2 items are pure wiring — no new pages required.
> Phase 3 and 4 items require new components or non-trivial new logic.
>
> Last updated: April 2026

---

## Phase 1 — Honest UI (remove misleading stubs)
*Fix things that actively lie to the user. No new pages. Mostly deleting fake handlers
and replacing them with real ones or honest empty states.*

### P1-1 — Fix fake "Request to Join" toast
**File:** `src/hooks/useContainerActions.ts` (confirmed), also `src/app/components/ExplorePage.tsx`
**Issue:** Clicking "Request to join" on a closed container fires a success toast but writes
nothing to the database. User believes their request was submitted; it was not.
**Fix:** Implement the join request write (`container_join_requests` table or equivalent),
or replace the toast with a genuine "coming soon" state until the feature is built.
**Effort:** 2–4 hours (write + confirmation UI) or 30 min (honest stub replacement)

---

### P1-2 — Fix My Links dead action buttons
**File:** `src/app/components` — My Links / My Contents page
**Issue:** Per-item dropdown actions "Enrich Metadata" and "Delete", plus the
"Add folder" button, have no click handlers. They render but do nothing.
**Fix:**
- Delete: wire to a `DELETE` call on `my_contents` table with confirmation dialog
- Enrich Metadata: wire to existing `BulkEnrichDialog` logic scoped to single item
- Add folder: wire to folder creation flow (folder tree already exists in the component)
**Effort:** 2–3 hours

---

### P1-3 — Fix missing WhatsApp edit button on My Basics
**File:** `src/app/components` — My Basics / profile Contact tab
**Issue:** UI copy instructs the user to click "Edit Profile" to change their WhatsApp
number. No such button exists in the layout. User can never edit this field.
**Fix:** Add an Edit button to the Contact tab that opens an inline edit field or
reuses the existing profile edit dialog scoped to contact fields.
**Effort:** 1–2 hours

---

### P1-4 — Fix My Circles "Create Circle" button for super admins
**File:** `src/app/components` — MyCirclesPage
**Issue:** "Create Circle" button shown to super admins has no `onClick` handler.
**Fix:** Wire to the same `CreateCircleDialog` used in `CircleAdminPage`.
**Effort:** 30 minutes

---

### P1-5 — Fix Events RSVP handler
**File:** `src/app/components/EventsPage.tsx`
**Issue:** `handleAttendEvent` is defined but has no implementation body. Clicking
RSVP does nothing.
**Fix:** Implement the RSVP write — insert into `event_attendees` (or equivalent),
update the local attendee count, toggle button state.
**Effort:** 2–3 hours

---

### P1-6 — Fix Notifications "Load More" button
**File:** `src/app/components/NotificationsPage.tsx`
**Issue:** "Load More" appears after 100 notifications but the handler is not
implemented. Button renders, clicks do nothing.
**Fix:** Implement pagination — increment the page offset and append results to
the existing list.
**Effort:** 1–2 hours

---

## Phase 2 — Real data (replace hardcoded zeros and false values)
*Wire stats and flags to actual database queries. No new pages.*

### P2-1 — Fix My Growth pathway progress tracker
**File:** `src/app/components/growth/PathwayProgressTracker.tsx`,
`src/app/components/growth/MyGrowthPage.tsx`,
`src/lib/services/progressService.ts`
**Issue:** Step completion variables (`isCompleted`, `isSkipped`, etc.) are hardcoded
to `false`. The visual pathway tracker always shows zero progress regardless of what
the user has actually done.
**Fix:** Query `journey_item_completions` and/or `badge_awards` per pathway step
to resolve real completion state. The `progressService` exists — wire the tracker
to use it.
**Effort:** 3–5 hours (query + state mapping per step type)

---

### P2-2 — Fix library document counts and "Shared with Me" filter
**File:** `src/app/components` — Libraries pages
**Issue:**
- Document counts for `auto_generated` libraries are hardcoded to `0`
- The "Shared with Me" system library returns all public documents rather than
  documents explicitly shared with the current user
**Fix:**
- Counts: replace hardcoded `0` with `COUNT(*)` join on `library_documents`
- Shared with Me: add a `shared_with` column filter or query a `document_shares`
  table scoped to `recipient_id = auth.uid()`
**Effort:** 2–4 hours

---

### P2-3 — Fix hardcoded `recentActivity = 0` stats
**Files:**
- `src/app/components/admin/MyAdminDashboard.tsx` (admin recent activity)
- `src/app/components/admin/CircleAdminPage.tsx` (My Circles activity count)
**Issue:** Both pages display a "Recent Activity" stat hardcoded to `0`. The original
circle-dependent calculation was removed without a replacement.
**Fix:** Query `posts` or `circle_activity` in the last 30 days scoped to containers
the user admins. The CircleAdminPage already queries `posts` for its active circles
stat — reuse that count or add a 7/30-day activity window.
**Effort:** 2–3 hours

---

### P2-4 — Fix `isFavorited` hardcoded to `false` in My Documents
**File:** `src/app/components/MyDocumentsPage.tsx`
**Issue:** `isFavorited` is hardcoded to `false` for all documents. The favourite
button always shows unfilled regardless of actual state.
**Fix:** Query `content_likes` (or `favorites`) where `content_type = 'document'`
and `user_id = auth.uid()` and join against the document list to resolve real state.
The `useContentEngagement` hook already handles this pattern — wire it in.
**Effort:** 1–2 hours

---

### P2-5 — Fix Book and Deck topic loss on edit
**Files:** `src/app/components/BooksPage.tsx`,
`src/app/components/DecksPage.tsx` (edit forms)
**Issue:** When editing an existing Book or Deck, topic editing is stubbed.
The form initialises with `topicIds: []` and does not load or preserve the
item's existing topics. Saving overwrites topics with an empty array.
**Fix:** On edit form open, fetch existing topics via the `topics/link` Edge Function
or `content_topics` join table and populate `topicIds` from the result.
**Effort:** 1–2 hours per content type

---

## Phase 3 — Missing pages and routes
*Build the pages that container types and nav items point to but that do not exist.*

### P3-1 — Build StandupDetailPage
**Current state:** `StandupsPage.tsx` browse page exists and links to `/standups/:id`
but `StandupDetailPage.tsx` does not exist — the link goes to a blank/404 page.
**File to create:** `src/app/components/StandupDetailPage.tsx`
**What it needs:**
- Load standup by ID/slug from `standups` table
- Show standup title, description, schedule cadence, member list
- Show recent standup entries/posts
- Join/leave action (member vs admin check)
- Settings link for admins
**Also needed:** `CreateStandupPage.tsx` — there is no creation form for standups
**Effort:** 2–3 days (detail page + create form)

---

### P3-2 — Build missing container create forms
Three container types have browse/detail pages but no creation form, so admins
cannot create new instances of these types from the UI.

| Container | Browse page exists | Detail page exists | Create form |
|---|---|---|---|
| Tables | ✅ `TablesPage.tsx` | ✅ | ❌ `CreateTablePage.tsx` missing |
| Pitches | ✅ `PitchesPage.tsx` | ✅ `PitchDetailPage.tsx` | ❌ `CreatePitchPage.tsx` missing |
| Builds | ✅ `BuildsPage.tsx` | ✅ `BuildDetailPage.tsx` | ❌ `CreateBuildPage.tsx` missing |

**Pattern to follow:** `CreateCircleDialog` / `CreateMeetingPage` — consistent
fields: name, description, visibility (mode="container"), admin list, cover image.
**Effort:** 1 day per form (3 days total); may be compressed if a shared
`CreateContainerForm` base component is extracted first.

---

### P3-3 — Build Market Search page
**File to create:** `src/app/components/markets/MarketSearchPage.tsx`
**Route:** `/markets/search`
**Issue:** The Markets landing page links to this route but no page exists.
**What it needs:** Search input, filter by market category, results grid of
offerings/companies. Can reuse `OfferingCard` and `CompanyCard` components.
**Effort:** 1 day

---

### P3-4 — Build Discover Guide page
**Route:** `/help/discover`
**Issue:** Sidebar links to a "Discover Guide" page that does not exist.
**What it needs:** Static or CMS-driven help content explaining the Discover
section — Home, News, Explore, Browse, Topics, Tags, Rankings, My Feed.
**Effort:** 2–4 hours (static content page)

---

## Phase 4 — Missing features requiring new logic or design
*Features that are visible in the UI or advertised to users but have no
implementation beneath them.*

### P4-1 — Implement drag-and-drop reordering
Three places show a `GripVertical` drag handle icon with no drag logic:
- Edit Company Companion view
- Event Companions list
- Playlists (`PlaylistDetailPage.tsx` / `PlaylistsPage.tsx`)

**Fix:** Implement using `@dnd-kit/core` (already a common React drag library) or
`react-beautiful-dnd`. On drop, update `order_index` for the reordered items via
an upsert. The `JourneyManagement` component likely already uses a drag pattern
that can be referenced.
**Effort:** 1–2 days (shared drag hook + wire into all three locations)

---

### P4-2 — Add `is_public` toggle for skills and credentials on profile
**File:** `src/app/components/circle/CircleSettingsPage.tsx` and profile edit tabs
**Issue:** The public profile page correctly filters out private skills and credentials
where `is_public = false`, but there is no UI control anywhere that lets the user
actually set this flag. Once a skill or credential is created, there is no way to
make it private.
**Fix:** Add an `is_public` toggle (switch or visibility selector) to the skill and
credential edit/create forms in the profile edit tabs.
**Effort:** 2–3 hours

---

### P4-3 — Implement Moments comments
**Files:** `src/app/components/MomentsPage.tsx`,
`src/app/components/MomentsSettingsPage.tsx`
**Issue:** The `allow_comments` flag exists on moment records in the database
but no comment UI or data fetch is implemented. The setting is stored but
has no effect on what the user sees.
**Fix:** Build a `MomentComments` component — load `comments` table filtered
to `content_type = 'moment'` and `content_id`, render threaded list, add reply
input. Only show when `allow_comments = true`.
**Effort:** 1–2 days

---

### P4-4 — Implement Course Certificate of Completion
**File:** `src/app/components/CoursePlayerPage.tsx`
**Issue:** "Certificate of completion" is advertised on course enrollment cards and
the player sidebar shows a "Get Certificate" button on completion, but the button
only marks `completed_at` — no certificate is generated or issued.
**Options (in order of effort):**
1. **Simple PDF generation:** Use a browser `window.print()` / `@react-pdf/renderer`
   approach with a styled certificate template populated with user name, course name,
   and completion date. No DB change needed.
2. **Stored certificate record:** Add a `course_certificates` table, generate a
   unique certificate ID, store it, and provide a shareable verification URL.
**Effort:** Option 1: 1 day. Option 2: 2–3 days.

---

### P4-5 — Fix "Start from Scratch" for custom program/course creation
**Files:** `src/app/components/unified/CreateMethodSelector.tsx`,
`src/app/components/program/CreateProgramPage.tsx`
**Issue:** Selecting "Start from Scratch" routes the user back to the template
picker instead of opening a blank creation form. Users cannot create a custom
program without starting from a template.
**Fix:** The "Start from Scratch" path should bypass template selection and navigate
directly to the program/course creation form with no pre-filled template data.
**Effort:** 2–4 hours

---

## Priority Summary

| Phase | Items | Total effort | When |
|---|---|---|---|
| **Phase 1** — Honest UI | P1-1 through P1-6 | ~2 days | Now |
| **Phase 2** — Real data | P2-1 through P2-5 | ~2–3 days | Now |
| **Phase 3** — Missing pages | P3-1 through P3-4 | ~1 week | Soon |
| **Phase 4** — Missing features | P4-1 through P4-5 | ~1–2 weeks | Planned |

**Recommended starting order within Phase 1 & 2:**
1. P1-1 (fake Request to Join) — actively misleads users
2. P2-1 (pathway progress) — core growth feature showing wrong data
3. P2-4 (isFavorited) and P2-5 (topic loss on edit) — silent data corruption
4. P1-2 (My Links dead buttons) — common action, frustrating to hit
5. P1-5 (Events RSVP) — core event interaction
6. P2-3, P2-2 (hardcoded zeros) — cosmetic but erodes trust
7. P1-3, P1-4, P1-6 — quick wires, low risk

---

## Related Documentation

| Document | Relevance |
|---|---|
| `docs/sidebar/SIDEBAR_INDEX.md` | Cross-cutting issues table — several items above were first noted there |
| `docs/sidebar/HEADER_COURSES.md` | Course certificate gap documented in CourseLandingPage known issues |
| `docs/USER_CONTENT_PLAN.md` | My Links dead buttons overlap with Phase 1 content plan items |
| `docs/SESSION_APRIL_19.md` | Platform Admin dead ends (forums, prompts pages) — tracked separately |
