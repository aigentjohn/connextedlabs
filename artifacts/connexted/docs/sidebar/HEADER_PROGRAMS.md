# Feature: Programs

Programs are structured, cohort-style learning or community experiences. Unlike courses, programs are more community-run: they have `admin_ids`, `coordinator_ids`, and `manager_ids` alongside a `created_by` owner. Programs are built from templates (predefined structures in `PROGRAM_TEMPLATES`) and use the same Journey system as courses — ordered `program_journeys` with `journey_items` and `journey_item_completions`. Programs also have a richer community layer (feed, forum, events, members, and an AI prompt library). Access uses the unified `access_tickets` system with `program_members` as the legacy fallback. Completing all journeys triggers a pathway completion hook and issues a program-completion badge.

---

## ProgramsBrowsePage (`/programs`)

**What it does:** Browse and join all available programs. Two tabs split programs into "Available" (not yet joined) and "My Programs" (joined). Includes search, category filter, and sort.

**Data loaded:**
- `programs` table: all rows (no published filter — all programs are visible)
- `useMyProgramMemberships()` hook: current user's program memberships (from `program_members`)
- `program_members` count per program card (live per-card query for member count)
- `content_likes` (content_type = `program`): like counts and per-user liked state

**User actions:**
- Search by program name or description
- Filter by category: All / Innovation / Learning / Startup / Product / Community / Research (categories come from `PROGRAM_TEMPLATES`, not the DB)
- Sort by: Newest / Oldest / Most Liked
- Like/unlike a program card
- "Join Program" button on available program cards — calls `useJoinProgram()` hook
- "View Program" button on joined program cards — navigates to `/programs/:slug`
- "Create Program" button — navigates to `/programs/new` (requires `canManagePrograms` role)

**Tabs / sub-views:**
- Available Programs tab (programs the user has not joined)
- My Programs tab (programs the user has joined)

**Enrollment / access model:**
- No access gate — all programs are publicly browsable
- Joining is open to any authenticated user (no approval flow at this layer)
- `useJoinProgram` writes a `program_members` row with status `enrolled`

**Known issues / gaps:**
- All programs are fetched regardless of status; there is no `is_published` or `status` filter, so draft or archived programs appear in browse
- Category filter uses `PROGRAM_TEMPLATES` metadata, not a DB field — programs without a matching template are always excluded from non-"All" category filters
- Member count is fetched per-card in a separate query, causing N+1 requests on load
- Requires authentication to load (`fetchAllPrograms` only runs when `profile` is truthy); unauthenticated users see a loading spinner indefinitely

---

## ProgramDetailPage (`/programs/:slug`)

**What it does:** The main program dashboard for enrolled members and admins. Non-members see a read-only overview of journeys with a join prompt. Members see three top-level tabs: Community, Sessions, and Journeys.

**Data loaded:**
- `programs` (by slug): all fields including `admin_ids`, `member_ids`, `circle_id`
- `circles` (if `circle_id` is set): associated circle for feed/forum delegation
- `program_journeys` (by `program_id`, ordered): all journeys
- `journey_progress` (by `user_id` + `program_id`): per-journey completion percentages
- `useIsProgramMember`, `useProgramMembers`: membership status and member list

**User actions (unauthenticated / non-member who navigates directly):**
- Redirected to a "Enrollment Required" modal with links to the landing page and browse page

**User actions (non-member viewing via browse):**
- Preview mode banner with "Join Now" button
- Read-only list of journeys (title + description only, no content)

**User actions (member):**
- Join (if not yet joined): `handleJoinProgram`
- Leave: `handleLeaveProgram` (not available to admins)
- Community tab → Feed, Forum, Members, Prompts sub-sections (via `ProgramSecondLevelNav`)
- Sessions tab → `ProgramEvents` component
- Journeys tab → `JourneyCardsView` overview → drill into `JourneyDetailView` for a specific journey
- Overall progress bar shown in header (journey-level completion percentage)

**User actions (admin / creator):**
- All member actions, plus:
- "Manage Program" button → `/program-admin/:id/setup`
- "Export" button → downloads program as a JSON template via `exportProgram`
- "Settings" button → `/programs/:slug/settings`
- Within Journeys tab: "Add Content" dialog via `AddJourneyContentDialog`

**Tabs / sub-views:**
- **Community tab**
  - Feed (sub-section): `ProgramFeed` — delegates to circle feed if `circle_id` is set
  - Forum (sub-section): `ProgramForum`
  - Members (sub-section): `ProgramMembers`
  - Prompts (sub-section): `ProgramPrompts` — admin-only creation, members can copy
- **Sessions tab:** `ProgramEvents` — calendar/list of program sessions
- **Journeys tab:** `JourneyCardsView` cards → `JourneyDetailView` detail

**Completion flow:**
- A `useEffect` monitors all journey progress; when all journeys reach `completed`, fires once (guarded by `useRef`)
- Calls `pathways/completion-hook` Edge Function
- Calls `issueProgramCompletionBadge` (non-blocking)
- Shows a "Program Complete!" trophy banner in the header

**Enrollment / access model:**
- `useIsProgramMember`: checks `program_members` table
- Access gate: non-members who hit the URL directly are shown an "Enrollment Required" modal (not a redirect)
- `admin_ids` array on the program row is used for admin detection; `created_by` also grants admin rights

**Known issues / gaps:**
- `journey_progress` table may not exist; the fetch gracefully handles error code `PGRST205` with a console warning and sets progress to `{}`
- Progress completion detection compares against both `journeyProgress[j.id]?.status` and `j.status` (the journey row's own status field), creating two sources of truth
- Non-member access gate is a modal overlay rather than a route redirect — browser back/forward history is inconsistent
- `ProgramSecondLevelNav` is only rendered inside the Community tab; the Prompts section is therefore only accessible via Community, even though it could be a top-level concern
- `coordinator_ids` and `manager_ids` columns exist on the `programs` table (mentioned in context) but are not referenced in this component — no differentiated permissions for those roles

---

## MyProgramsPage (`/my-programs`)

**What it does:** Dashboard showing all programs the current user is enrolled in or participating in, with enrollment status badges and a link to create new programs.

**Data loaded (dual-source, deduped via Map):**
1. `access_tickets` via `accessTicketService.getUserTicketsByType(userId, 'program')` → fetches matching `programs` rows
2. Legacy `program_members` (fallback for any programs not found via tickets): joined with `programs` via Supabase relationship query; filters to statuses `enrolled`, `active`, `completed`

Each entry carries: program metadata, `status`, `enrolledAt`.

**User actions:**
- Click any program card to navigate to `/programs/:slug`
- "Create Program" button → `/programs/new`
- "Browse Programs" button (shown in empty state) → `/programs`

**Tabs / sub-views:**
- 3-column grid of program cards; no tabs
- "About Your Programs" info card shown when programs exist

**Enrollment / access model:**
- Requires authentication; gracefully handles missing tables (PGRST116 / 42P01) without error toast

**Known issues / gaps:**
- Member count displayed on cards uses `program.member_ids.length` (from the programs row array column), which may be stale if memberships are managed primarily through `program_members` rows
- No progress indicator on program cards (unlike `MyCoursesPage` which shows a progress bar)
- Status label mapping is purely presentational; there is no logic to consolidate ticket status with `program_members` status when both exist for the same program

---

## CreateProgramPage (`/programs/new`)

**What it does:** Entry point for creating a new program. Offers two options — "Use a Template" and "Start from Scratch" — both of which open `ProgramTemplatePicker`. On success, navigates to the program admin setup page.

**Data loaded:** None on mount (role check only)

**User actions:**
- "Browse Templates" → opens `ProgramTemplatePicker` modal
- "Create Custom Program" → also opens `ProgramTemplatePicker` (identical behavior; no blank-start flow)
- Cancel → navigates back to `/programs`
- On program created via picker: redirected to `/program-admin/:programId/setup`

**Tabs / sub-views:** None

**Access model:** `canManagePrograms(profile.role)` — redirects to `/programs` if check fails

**Known issues / gaps:**
- "Start from Scratch" button description says it builds a fully custom program, but it opens the same `ProgramTemplatePicker` modal as the template option — no actual blank-start path exists
- No form fields on this page; all input is delegated to `ProgramTemplatePicker`

---

## ProgramAdminDashboard (`/admin/programs/:programId` or `/program-admin/:programId`)

**What it does:** Participant management dashboard for program admins. Shows funnel-state cards grouping members by configured access/engagement/exit states, AI-driven state suggestions, bulk state change tools, and a program template manager.

**Data loaded:**
- `programs` (by `programId`)
- `getProgramFunnelConfig(programId)`: which states are enabled for this program's funnel
- `getAllMemberStates()`: all available member state definitions
- `getProgramParticipants(programId)`: all participants with attendance rate
- `getEngagementMetrics(programId)`: aggregated stats (total, active, at-risk, avg attendance)

**User actions:**
- View participant counts per funnel state via `ParticipantStateCard`
- "View Members" per state → opens inline modal listing participants with checkboxes
- "Change State" per participant → opens `ChangeStateDialog`
- Select multiple participants → "Change N States" bulk action → `BulkStateChange` dialog
- Auto-suggestions from `StateSuggestionsCard` (AI-generated participant state move recommendations)
- Navigation links to: Manage Sessions, Review Applications, Configure Funnel
- `ProgramTemplateManager` inline: export / import / manage program structure templates

**Tabs / sub-views:**
- Quick stats row (4 metric cards)
- Auto-Suggestions panel
- Access & Enrollment states section
- Engagement Levels section
- Exit States section
- Program Template Manager section

**Access model:** No explicit route guard in this component — relies on parent router or the program's `admin_ids` check

**Known issues / gaps:**
- Comment on line 1: "Split candidate: ~422 lines — consider extracting ProgramStatsPanel, ProgramMembersPreview, and ProgramQuickActions into sub-components"
- `programSlug` prop passed to `ProgramTemplateManager` receives `programId` (the UUID), not the slug — this is likely a bug
- View Members dialog is an inline overlay (not a proper dialog component), so it cannot be dismissed by pressing Escape
- No pagination on the participants list within the View Members modal

---

## ProgramPrompts (`ProgramDetailPage` > Community > Prompts)

**What it does:** AI prompt library within a program. Displays a curated list of prompts that members can copy to their clipboard and use in external AI tools (ChatGPT, Claude, Gemini, etc.). Only program admins can create or delete prompts.

**Data loaded:**
- `program_prompts` (by `program_id`, ordered by `created_at` desc): `id`, `title`, `prompt_text`, `description`, `created_by`, timestamps

**User actions (all members):**
- "Copy to AI" button: copies `prompt_text` to clipboard; button shows "Copied!" confirmation for 2 seconds
- "Show/Hide prompt" toggle: expands the raw prompt text in a monospace block

**User actions (admins only):**
- "Add Prompt" button → opens `CreateProgramPromptDialog` to add a new prompt
- "Create First Prompt" in empty state

**User actions (admin or prompt creator):**
- Delete button → `confirm()` dialog, then deletes from `program_prompts`

**Access model:**
- `isAdmin` and `isMember` props passed in from `ProgramDetailPage`
- Create/delete gated by `isAdmin`; delete also allowed for the prompt's own `created_by` user
- No edit functionality — prompts can only be created or deleted, not updated

**Known issues / gaps:**
- Delete uses the browser's native `confirm()` dialog instead of the app's `AlertDialog` component (inconsistent with the rest of the platform)
- No edit/update action despite the `Edit2` icon being imported (dead import)
- `updated_at` is shown only when it differs from `created_at` but there is no UI to trigger an update
- Permission model is admin-only for creation, which differs from circles where any member can add prompts (as noted in design context)

---

## ProgramJourneyNav (shared nav component within program views)

**What it does:** A sticky horizontal navigation bar listing all journeys in a program as clickable tab-style buttons. Renders per-journey status icons (not started / in progress / completed), completion percentage badges, and a progress bar for the currently selected journey.

**Data loaded:** None — receives all data via props:
- `journeys`: array of journey objects with `status` field
- `selectedJourneyId`: currently active journey
- `journeyProgress`: map of journey ID → `JourneyProgress` (total/completed items, percentage)
- `isAdmin`: controls display of numbered journey prefixes

**User actions:**
- Click a journey button to select it (`onSelectJourney` callback)
- Horizontal scroll when journey list overflows viewport

**Tabs / sub-views:** None — this is a navigation component, not a page

**Known issues / gaps:**
- Journey progress (`journeyProgresses` state) is declared but never populated — it initializes as `{}` and there is no fetch or update logic inside the component; all status display falls back to the `journey.status` prop field only
- Progress badge uses `className="hidden xs:inline-block"` but the `xs` breakpoint is not defined in the default Tailwind config
- This component appears to be superseded by the inline journey navigation in `ProgramDetailPage`'s Journeys tab (`JourneyCardsView` + `JourneyDetailView`) and may no longer be mounted anywhere
