# Feature: Courses

Courses are self-paced, instructor-led learning experiences structured as ordered modules (journeys) with tracked completion. Each course has a landing page for discovery and enrollment, a player UI for learners working through content, and a separate administrative surface for course leaders and platform admins. Access is controlled by a unified ticket system (`access_tickets`) with a legacy `course_enrollments` table maintained as a fallback. Paid courses delegate checkout to ConvertKit Commerce; free courses enroll instantly via the enrollment bridge. Completing a course triggers a badge award and fires a pathway completion hook so any enrollment pathways that include the course are advanced automatically.

---

## CoursesPage (`/courses`)

**What it does:** The public course catalog — browse and discover all published courses.

**Data loaded:**
- `courses` table (published only): `id`, `slug`, `title`, `description`, `instructor_name`, `instructor_avatar_url`, `pricing_type`, `price_cents`, `is_published`, `featured`, `circle_ids`, `created_at`
- `course_enrollments` (current user): fetches enrolled `course_id` values to power the "My Courses" filter
- `content_likes` (content_type = `course`): populates like counts and per-user liked state

**User actions:**
- Search by title, description, or instructor name
- Filter by pricing type: All / Free / Paid / Members Only
- Filter to enrolled courses only ("My Courses" checkbox)
- Sort by: Newest / Oldest / Most Liked
- Like/unlike a course card
- Click through to the course landing page

**Tabs / sub-views:**
- Featured Courses section (courses where `featured = true`) rendered above a general "All Courses" grid

**Enrollment / access model:**
- No access gate on browse — all published courses are visible to everyone
- Enrollment check is done at the landing page and player level
- Circle-scoped variant: if the route includes a `circleId` param, results are filtered to courses whose `circle_ids` array contains that circle

**Known issues / gaps:**
- "My Courses" filter reads from legacy `course_enrollments` only, not the unified `access_tickets` table, so users enrolled via the ticket system may not see their courses ticked
- No pagination — all published courses load at once
- `course_enrollments` table absence (PGRST116 / 42P01) is caught gracefully and shows a "coming soon" toast; the catalog still renders

---

## CourseLandingPage (`/courses/:slug`)

**What it does:** The public detail page for a single course. Shows full description, syllabus (module list), instructor bio, pricing, and an enrollment / checkout card.

**Data loaded:**
- `courses` (by slug, published): title, description, pricing, instructor fields, `convertkit_product_id`
- `program_journeys` (by `course_id`): module titles, descriptions, `order_index`
- `journey_items` count per journey (for "N lessons" badge on each module card)
- `checkAccess` via `enrollmentBridge`: determines whether the current user already has access (ticket first, legacy fallback)
- `templateApi.forContainer('course', courseId)`: loads a linked `TicketTemplate` if one is configured, to display a waitlist block

**User actions (unauthenticated):**
- View course title, description, syllabus preview, pricing, and instructor bio
- No enrollment available — shown "Sign in to enroll" note

**User actions (authenticated, not enrolled):**
- Free courses: click "Enroll Now" — triggers `enrollInCourse` (creates access ticket + legacy enrollment row), then redirects to player
- Paid courses: redirected to ConvertKit Commerce checkout via `convertkit_product_id`
- Members-only courses: shows informational toast; no purchase flow implemented
- "Have a code?" link: opens `RedeemCodeDialog` for access-code redemption
- Waitlist: shown when a linked `TicketTemplate` is present

**User actions (authenticated, enrolled):**
- "Continue Learning" button — navigates to `/courses/:slug/learn`

**Tabs / sub-views:**
- Hero section (left: course info + module/lesson stats; right: enrollment card)
- Course Syllabus card listing all journeys as numbered modules
- Course Leader sidebar card

**Enrollment / access model:**
- `checkAccess` (enrollmentBridge): checks `access_tickets` first, falls back to `course_enrollments`
- Free enrollment: `enrollInCourse` writes to both `access_tickets` and `course_enrollments`
- Paid enrollment: delegates entirely to ConvertKit; no in-app payment processing

**Known issues / gaps:**
- Members-only pricing type has no actual enforcement — shows a toast but does not gate access based on `users.membership_tier`
- "Certificate of completion" is listed as a feature bullet on the enrollment card but is not implemented
- SEO schema (`generateCourseSchema`) hardcodes `https://connexted.app` as the base URL

---

## MyCoursesPage (`/my-courses` or `/my-learning`)

**What it does:** Shows the current user's enrolled courses grouped by progress status: In Progress, Start Learning (0%), and Completed.

**Data loaded (dual-source, deduped via Map):**
1. `access_tickets` via `accessTicketService.getUserTicketsByType(userId, 'course')` → fetches matching `courses` rows
2. Legacy `course_enrollments` (fallback for any courses not already found via tickets) → fetches matching `courses` rows

Each enrollment record carries: `progress_percentage`, `enrolled_at`, `last_accessed_at`, `completed_at`, `source` ('ticket' | 'legacy').

**User actions:**
- Click any course card to navigate directly to `/courses/:slug/learn` (bypasses landing page)
- "Browse Courses" button links to `/courses`

**Tabs / sub-views:**
- Summary stat cards: Total Enrolled / In Progress / Completed
- "Continue Learning" section (0% < progress < 100%)
- "Start Learning" section (progress = 0%)
- "Completed" section (progress = 100%)

**Enrollment / access model:**
- Requires authentication (`profile?.id`); renders empty state if not logged in
- No additional access check — presence in either tickets or enrollments is sufficient

**Known issues / gaps:**
- Progress percentage on ticket-sourced enrollments comes from `ticket.progress_percentage`; on legacy enrollments it comes from `enrollment.progress_percentage`. These values may diverge if progress is written only to one store
- No way to unenroll from this page
- Ticket source field is tracked in component state but not surfaced in the UI

---

## CoursePlayerPage (`/courses/:slug/learn`)

**What it does:** The full-screen course learning experience. Left sidebar lists all modules with completion status and progress bars; main content area renders the currently selected module via `JourneyDetailView`.

**Data loaded:**
- `courses` (by slug)
- `checkAccess` via `enrollmentBridge`: gates entry — unenrolled users are redirected to the landing page
- `course_enrollments` (legacy): loaded for progress write-back and `last_accessed_at` tracking
- `access_tickets` via `accessTicketService.recordAccess`: records a visit timestamp on the ticket
- `program_journeys` (by `course_id`): all modules in order
- `journey_items` count per journey (total items)
- `journey_item_completions` count per journey per user (completed items)

**User actions (enrolled learner):**
- Toggle sidebar open/close via hamburger menu
- Navigate modules with Previous / Next buttons or by clicking module list items
- Mark individual journey items complete via `JourneyDetailView` (which calls back `onProgressChange`)
- Auto-resumes: player opens at the first incomplete module on each visit

**Completion flow:**
1. When all modules reach 100%, `fireCourseCompletion` is called (guarded by a `useRef` flag to fire only once per session)
2. Marks `course_enrollments.completed_at` and sets `progress_percentage = 100`
3. POSTs to `pathways/completion-hook` Edge Function to advance any enrolled learning pathways
4. Calls `issueCourseCompletionBadge` (non-blocking)
5. Sidebar shows a "Congratulations / Complete Course" panel with a manual trigger button

**Tabs / sub-views:**
- Sliding sidebar: course title, overall progress bar, module list with per-module status icons and progress
- Main content: top bar (module counter + Prev/Next nav) + `JourneyDetailView` for current module

**Enrollment / access model:**
- Hard gate: `checkAccess` runs before any content is shown; unauthorized users redirected
- Access is recorded on both the ticket (`recordAccess`) and the legacy enrollment (`last_accessed_at`)

**Known issues / gaps:**
- Progress is computed as the average of all module completion percentages, so a course with an empty module artificially depresses progress to 0 for that module
- `fireCourseCompletion` button in the sidebar's congratulations panel calls the function again even though it's already been fired by `handleProgressChange`; the `useRef` guard prevents double-writes but it's inconsistent UX
- Progress is written back to `course_enrollments` but not to the ticket's `progress_percentage` field
- Sidebar is always hidden off-screen on load (mobile-first) with no memory of user preference

---

## CreateCoursePage (`/courses/create`)

**What it does:** Form for creating a new course. Restricted to users with `canManagePrograms` role. On success, navigates to the course admin setup page.

**Data loaded:**
- None on mount (checks `profile.role` for redirect guard)

**User actions:**
- Fill in: title (required), description, pricing type (Free / Paid / Members-only), price (USD, shown when paid), visibility (Public / Members Only / Unlisted / Private), course leader name and bio
- Select topics (up to 5) via `TopicSelector`
- Add tags via `TagSelector`
- For paid courses: enter a ConvertKit Product ID to link checkout
- Submit: creates `courses` row with `is_published = false`, then calls `/topics/link` Edge Function if topics selected, then redirects to `/course-admin/:id/setup`

**Tabs / sub-views:** None — single card form

**Access model:** `canManagePrograms(profile.role)` — redirects to `/courses` if check fails

**Known issues / gaps:**
- Slug uniqueness check queries the DB with `.single()` which throws on zero results; should use `.maybeSingle()` to avoid potential error swallowing
- "Start from Scratch" option on `CreateProgramPage` both route to the template picker — courses do not have an equivalent blank-start flow
- `difficulty_level` is hardcoded to `'beginner'`; no UI field exposed

---

## CoursesManagement (`/platform-admin/courses` or similar)

**What it does:** Platform admin and instructor view listing all courses on the platform (admins see all; instructors see only their own). Provides links to view, set up, manage settings, and delete courses.

**Data loaded:**
- `courses` table — all columns
  - Platform admins (`role === 'super' | 'admin'`): no filter
  - Instructors: filtered to `instructor_id = profile.id OR created_by = profile.id`

**User actions:**
- Search by title, description, or instructor name
- View any course (links to `/courses/:slug`)
- Open course content setup (links to `/course-admin/:id/setup`)
- Open instructor settings (links to `/instructor/courses/:slug`)
- Platform admins only: delete a course via the `admin/delete-container` Edge Function (with confirmation dialog)
- Create new course (links to `/courses/create`)

**Tabs / sub-views:**
- Summary stats card: total courses, published count, total enrollments
- Course grid (1–3 columns)

**Access model:** Any authenticated user can access this component — the data query self-limits by role, but there is no hard route guard.

**Known issues / gaps:**
- No hard route guard — a plain member who navigates directly to this path would see an empty or partial list rather than a redirect
- `enrollment_count` stat is taken from the `courses` table column (not a live join), so it may be stale if enrollments are managed via tickets without writing back to the column
- Delete button only shown to `role === 'super' | 'admin'`; instructors cannot delete their own courses here (must use InstructorCourseManagement)

---

## InstructorCourseManagement (`/instructor/courses/:slug`)

**What it does:** Per-course edit and settings page for the course leader (instructor or admin). Provides tabbed editing of metadata, pricing/visibility, content pointer, and advanced settings including publish toggle and delete.

**Data loaded:**
- `courses` (by slug): all editable fields
- Checks `instructor_id` or `created_by` against `profile.id` for ownership; also accepts `hasRoleLevel(profile.role, ROLES.ADMIN)`

**User actions:**
- **Basic Info tab:** edit title, description, course leader name and bio; save
- **Pricing tab:** change pricing type and USD price; change visibility (Public / Members Only / Premium)
- **Content tab:** button links to `/course-admin/:id/setup` for journey/lesson management
- **Settings tab:** toggle Featured and Published toggles; save
- **Danger Zone (Settings tab):** delete course via `admin/delete-container` Edge Function with confirmation dialog
- Header: Preview (link to landing page), Publish/Unpublish toggle

**Tabs / sub-views:**
- Basic Info / Pricing / Content / Settings

**Access model:** Ownership check (`instructor_id` or `created_by`) or admin role; unauthorized users redirected to `/instructor/dashboard`

**Known issues / gaps:**
- Revenue estimate (`price_cents * enrollment_count / 100`) relies on the potentially stale `enrollment_count` column
- `access_level` options in the Pricing tab include `'premium'` but `CreateCoursePage` does not offer this value; slight inconsistency
- ConvertKit Product ID is not editable here (only on create form)
- Content tab is a stub — it just shows a button; no inline journey management
