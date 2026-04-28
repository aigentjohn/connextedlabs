# Feature: Courses

Last updated: April 2026

Courses are **self-paced, individually-enrolled learning experiences** structured as ordered modules (journeys) with tracked completion. A learner enrolls on their own schedule and progresses at their own pace — there is no cohort start date, no application, and no group lifecycle.

**Courses vs. Programs (Cohort Programs):** Programs are cohort-based — members apply, are accepted into a cohort with a fixed start date, and progress together as a group with a facilitator managing their lifecycle states (at_risk, inactive, completed). Courses are the opposite: open enrollment, self-paced, no cohort grouping. The `EnrollButton` label reflects this distinction ("Enroll" for courses, "Join Program" for programs).

Each course has:
- A **landing page** for discovery and enrollment
- A **player UI** for learners working through content
- An **admin surface** for course leaders and platform admins
- A **JSON export/import/duplicate** system for course portability

Access is controlled by a unified ticket system (`access_tickets`) with a legacy `course_enrollments` table maintained as a fallback. Paid courses delegate checkout to ConvertKit Commerce; free courses enroll instantly. Completing a course triggers a badge award and fires a pathway completion hook so any enrolled learning pathways that include the course are advanced automatically.

---

## Journey Item Types Available in Courses

Course modules (journeys) support all platform item types grouped into four categories. The **Core** set is most relevant for self-paced courses.

| Category | Types | Notes |
|----------|-------|-------|
| **Core content** | `page`, `episode`, `document`, `book`, `deck` | Lessons, video, reading, flashcards |
| **Interactive** | `poll`, `reflection`, `assignment`, `faq`, `schedule_picker` | Engagement, submissions, Q&A |
| **Collections** | `playlist`, `magazine`, `shelf` (library) | Curated content groups |
| **Containers** | `checklist`, `build`, `pitch`, `table`, `elevator`, `standup`, `meetup`, `sprint` | Project activities, cohort-style tools |
| **Other** | `event`, `discussion`, `resource` | Live sessions, external links |

> **Note:** `AddJourneyContentDialog` (used in the program journey builder, `src/app/components/program/AddJourneyContentDialog.tsx`) does not include the interactive types (poll, reflection, assignment, faq, schedule_picker). Those are available in the separate `AddContentDialog` used in `JourneyManagement`. Both dialogs are used in the admin setup surface.

---

## CoursesPage (`/courses`)

**What it does:** The public course catalog — browse and discover all published courses.

**Data loaded:**
- `courses` (published only): `id`, `slug`, `title`, `description`, `instructor_name`, `instructor_avatar_url`, `pricing_type`, `price_cents`, `is_published`, `featured`, `circle_ids`, `created_at`
- `course_enrollments` (current user): enrolled `course_id` values for the "My Courses" filter
- `content_likes` (`content_type = 'course'`): like counts and per-user liked state

**User actions:**
- Search by title, description, or instructor name
- Filter by pricing type: All / Free / Paid / Members Only
- Filter to enrolled courses only ("My Courses" checkbox)
- Sort by: Newest / Oldest / Most Liked
- Like/unlike a course card
- Click through to the course landing page

**Tabs / sub-views:**
- Featured Courses section (`featured = true`) rendered above a general "All Courses" grid

**Enrollment / access model:**
- No access gate on browse — all published courses visible to everyone
- Enrollment check at landing page and player level only
- Circle-scoped variant: `circleId` URL param filters to courses whose `circle_ids` array contains that circle

**Known issues / gaps:**
- "My Courses" filter reads only `course_enrollments`, not `access_tickets` — users enrolled via the ticket system may not appear as enrolled
- No profile-based course matching — `career_stage`, `looking_for`, `interests`, and `tags` on the user's profile are not used to surface relevant courses; a "Recommended for you" section is planned (client-side tag overlap scoring, no schema change needed)
- No pagination — all published courses load at once
- No topic filter — courses have `topic_links` but the browse page has no topic facet

---

## CourseLandingPage (`/courses/:slug`)

**What it does:** Public detail page for a single course — full description, syllabus, instructor bio, pricing, and enrollment card.

**Data loaded:**
- `courses` (by slug, published): all fields including `convertkit_product_id`
- `program_journeys` (by `course_id`): module titles, descriptions, `order_index`
- `journey_items` count per journey (for "N lessons" badge on each module card)
- `checkAccess` via `enrollmentBridge`: determines current user access (ticket first, legacy fallback)
- `templateApi.forContainer('course', courseId)`: loads linked `TicketTemplate` for waitlist block

**User actions (unauthenticated):** View only; "Sign in to enroll" shown.

**User actions (authenticated, not enrolled):**
- Free: "Enroll Now" → `enrollInCourse` (ticket + legacy row) → redirect to player
- Paid: redirect to ConvertKit Commerce via `convertkit_product_id`
- Members-only: informational toast; no purchase flow implemented
- "Have a code?": opens `RedeemCodeDialog`
- Waitlist shown when a linked `TicketTemplate` is present

**User actions (enrolled):** "Continue Learning" → `/courses/:slug/learn`

**Known issues / gaps:**
- Members-only pricing has no enforcement — shows toast but does not check `users.membership_tier`
- "Certificate of completion" listed as a feature bullet on the enrollment card but not implemented on this page
- SEO schema hardcodes `https://connexted.app` as the base URL

---

## MyCoursesPage (`/my-courses`)

**What it does:** Current user's enrolled courses grouped by progress status.

**Data loaded (dual-source, deduped via Map):**
1. `access_tickets` via `accessTicketService.getUserTicketsByType(userId, 'course')` → matching `courses` rows
2. Legacy `course_enrollments` (fallback) → matching `courses` rows

Each enrollment carries: `progress_percentage`, `enrolled_at`, `last_accessed_at`, `completed_at`, `source` ('ticket' | 'legacy').

**User actions:**
- Click any course card → navigates to `/courses/:slug/learn`
- "Browse Courses" links to `/courses`

**Tabs / sub-views:**
- Summary stats: Total Enrolled / In Progress / Completed
- "Continue Learning" (0% < progress < 100%)
- "Start Learning" (progress = 0%)
- "Completed" (progress = 100%)

**Known issues / gaps:**
- Progress on ticket-sourced enrollments comes from `ticket.progress_percentage`; on legacy enrollments from `enrollment.progress_percentage` — these may diverge
- No unenroll action
- No course companion access from this page (planned)

---

## CoursePlayerPage (`/courses/:slug/learn`)

**What it does:** Full-screen course learning experience. Left sidebar lists all modules with completion status and progress bars; main content renders the selected module via `JourneyDetailView`.

**Data loaded:**
- `courses` (by slug)
- `checkAccess` via `enrollmentBridge`: gates entry — unenrolled users redirect to landing page
- `course_enrollments` (legacy): progress write-back and `last_accessed_at` tracking
- `access_tickets` via `accessTicketService.recordAccess`: records a visit timestamp
- `program_journeys` (by `course_id`): all modules in order
- `journey_items` count per journey (total items)
- `journey_item_completions` count per journey per user (completed items)

**User actions (enrolled learner):**
- Toggle sidebar open/close (hamburger menu)
- Navigate modules with Previous / Next buttons or by clicking module list
- Mark journey items complete via `JourneyDetailView` (calls back `onProgressChange`)
- Auto-resumes at first incomplete module on each visit

**Completion flow:**
1. All modules reach 100% → `fireCourseCompletion` fires (guarded by `useRef` to fire once per session)
2. Marks `course_enrollments.completed_at`, sets `progress_percentage = 100`
3. POSTs to `pathways/completion-hook` Edge Function to advance enrolled pathways
4. Calls `issueCourseCompletionBadge` (non-blocking)
5. Sidebar shows "Congratulations / Complete Course" panel

**Known issues / gaps:**
- Progress is averaged across modules — an empty module depresses progress to 0
- `fireCourseCompletion` button in the congratulations panel can re-trigger even though the `useRef` guard prevents double-writes
- Progress written to `course_enrollments` only, not to `access_tickets.progress_percentage`
- Sidebar hidden on load with no memory of user preference (always starts closed on mobile)
- No "Message instructor" entry point — course companion not yet built

---

## CreateCoursePage (`/courses/create`)

**What it does:** Form for creating a new course. Restricted to `canManagePrograms` role. On success navigates to course admin setup.

**User actions:**
- Fill in: title (required), description, pricing type (Free / Paid / Members-only), price (USD), visibility, course leader name and bio
- Select topics (up to 5) via `TopicSelector`
- Add tags via `TagSelector`
- Paid courses: enter ConvertKit Product ID
- Submit: creates `courses` row (`is_published = false`), calls `/topics/link` Edge Function if topics selected, redirects to `/course-admin/:id/setup`

**Known issues / gaps:**
- Slug uniqueness check uses `.single()` which throws on zero results — should use `.maybeSingle()`
- No "Start from template" option — template picker (`course-template-exports.ts` has full content templates) not surfaced at creation time
- `difficulty_level` hardcoded to `'beginner'`; no UI field
- No "Build from prompt" / AI scaffold option (planned — same JSON prompt pattern as profile section import)

---

## CourseAdminSetupPage (`/course-admin/:courseId/setup`)

**Component:** `src/app/components/admin/ProgramSetupDashboard.tsx` (shared with programs; detects context from URL param)

**Access:** Course instructor (`instructor_id` or `created_by`) or `role >= admin`.

**Tabs:**

### Overview tab
- Course description and ordered journey list with status badges
- Quick-action buttons linking to Journeys, Analytics, Audit tabs

### Journeys tab — `JourneyManagement` component
Primary course-building surface. Manages modules (journeys) and lessons (journey items).

**Journey actions:** create, edit (inline dialog), delete, expand/collapse.

**Journey item types supported in the admin `AddContentDialog`:**
`document`, `book`, `deck`, `shelf`, `playlist`, `magazine`, `episode`, `page`, `checklist`, `build`, `pitch`, `table`, `elevator`, `standup`, `meetup`, `sprint`, `event`, `discussion`, `resource`
Plus interactive types (via separate tab): `poll`, `reflection`, `assignment`, `faq`, `schedule_picker`

> `AddJourneyContentDialog` (program journey builder path) does not include interactive types — use `AddContentDialog` in the Journeys tab for full type coverage.

### Progress & Analytics tab
- **Courses:** "Coming Soon" placeholder — `JourneyProgressAnalytics` not wired for courses
- **Programs:** Full `JourneyProgressAnalytics` component

### Backup & Restore tab — `CourseExportImport` / `ExportImportManager`
- Export course structure + journeys + items as JSON (own format, version `1.0.0`)
- Import from a previously exported JSON file (creates new course, does not overwrite)
- Duplicate course (export + import with new slug/title)
- **Note:** Export captures journey structure and item references but not the item content bodies (e.g. a Page's markdown is not embedded — the `item_id` reference is preserved)

### Audit tab
- **Courses:** "Coming Soon" placeholder
- **Programs:** `ProgramAuditView` with data integrity checks

**Known issues / gaps:**
- Analytics and Audit tabs are stubs for courses
- `enrollment_count` stat in the header reads from the `courses` column (not a live join) — may be stale
- "Manage Sessions" quick action in Overview only renders for programs, not courses

---

## InstructorCourseManagement (`/instructor/courses/:slug`)

**What it does:** Per-course edit and settings page for the course leader.

**Tabs:**
- **Basic Info:** title, description, course leader name and bio
- **Pricing:** pricing type, USD price, visibility (Public / Members Only / Premium)
- **Content:** links to `/course-admin/:id/setup`
- **Settings:** Featured toggle, Published toggle, Danger Zone (delete)

**Access:** Ownership check (`instructor_id` or `created_by`) or admin role; unauthorized → `/instructor/dashboard`.

**Known issues / gaps:**
- Revenue estimate uses potentially stale `enrollment_count` column
- ConvertKit Product ID not editable here (only on create form)
- No course ratings or reviews surface — `average_rating` column exists on `courses` but is never written to; `content_ratings` table is not wired for `content_type = 'course'`
- No course companion management view (planned)
- No instructor prep library or student resource library (planned)

---

## CoursesManagement (`/platform-admin/courses`)

**What it does:** Platform admin and instructor view listing all courses. Admins see all; instructors see their own only.

**User actions:**
- Search by title, description, or instructor name
- View / setup / manage settings / delete any course
- Create new course

**Known issues / gaps:**
- No hard route guard — a plain member who navigates directly sees an empty list rather than a redirect
- `enrollment_count` stat may be stale (column vs. live join)
- Instructors cannot delete their own courses here — must use `InstructorCourseManagement`

---

## Planned Features

---

### Course Companion (Instructor ↔ Student)

**Goal:** Private 1:1 channel between the course instructor and each enrolled student — separate from the friend companion system.

**Proposed schema:**
```sql
course_companions (
  id, course_id, instructor_id, student_id,
  created_at, last_message_at
)
course_companion_messages (
  id, companion_id, sender_id,
  body text,
  item_type text,           -- 'message' | 'assignment_feedback' | 'resource'
  item_ref_id uuid,         -- optional link to a journey_item_completion or resource
  created_at
)
```

**Interaction model:**
- Auto-created when a student enrolls (same pattern as `friend_companions`)
- Instructor sees a roster view at `/course-admin/:courseId/companions` listing all active companions with unread counts
- Student sees a "Message Instructor" button in the `CoursePlayerPage` sidebar (currently missing — noted as a known gap)
- Supports: text messages, file attachments (via storage), assignment feedback threads linked to `journey_item_completions`

**Implementation path:**
1. Schema migration — `course_companions` + `course_companion_messages`
2. Auto-create on enrollment inside `enrollmentBridge.enrollInCourse`
3. Student UI: add "Message Instructor" entry in `CoursePlayerPage` sidebar
4. Instructor UI: companion roster tab in `CourseAdminSetupPage`
5. Shared `CourseCompanionView` component (mirrors `FriendCompanionPage` layout minus the friendship check)

---

### Course Libraries

**Goal:** Two distinct libraries per course — one for the instructor, one for students.

**Instructor prep library:** Resources the instructor uses to build the course (reference texts, slide decks, planning docs). Not visible to students. Linked to the course via `course_id` on an existing `shelves` row with a `visibility = 'instructor'` flag.

**Student resource library:** Supplementary materials released to enrolled students (workbooks, checklists, templates). Visible once enrolled. Same shelf pattern with `visibility = 'enrolled'`.

**Implementation path:**
- No new table: reuse `shelves` with a `course_id FK` + `visibility ENUM('instructor','enrolled','public')` column
- Surface in `CourseAdminSetupPage` as a new "Resources" tab
- Surface in `CoursePlayerPage` sidebar as a "Resources" section (appears after enrollment check)

---

### Book Study Template

**Goal:** Course template where each module corresponds to a book section, followed by a reflection or assignment.

**Template structure (one journey per chapter group):**
```
Module 1 — Chapters 1–3
  ├─ book (item_type: book, pointing to chapters 1-3)
  ├─ reflection ("What resonated with you from this section?")
  └─ assignment ("Complete the Chapter 1 worksheet")
Module 2 — Chapters 4–6
  ...
```

**Dependency on book upgrades:** The current `book_chapters` schema stores chapters as flat markdown blobs. For a book study to work well, chapters need:
- `reading_time_minutes` (computed from word count)
- `section_label` for grouping chapters into parts
- Per-chapter "Mark as Read" completion tracking
- Prev/Next navigation (currently absent — must click sidebar)

See **Book Upgrade Roadmap** section below.

---

### Book Upgrade Roadmap

The current book feature is suited for short-form structured content (~10 chapters, no navigation aids). The following upgrades are needed for it to anchor a course:

| Priority | Change | Schema impact |
|----------|--------|--------------|
| **P0** | Prev / Next chapter buttons at bottom of chapter view | None — client-only using existing `chapters` array |
| **P0** | Per-chapter "Mark as Read" (writes `journey_item_completions`) | None if keyed on chapter `item_id` within a journey |
| **P1** | `word_count INT` + `reading_time_minutes INT` columns on `book_chapters` | `ALTER TABLE book_chapters ADD COLUMN ...` |
| **P1** | `section_label TEXT` on `book_chapters` — groups chapters into parts (e.g. "Part I: Foundations") | Same migration |
| **P2** | Inline annotations / highlights (reader highlights a passage, saved to `book_annotations` table) | New table |
| **P2** | Chapter-level audio URL (`audio_url TEXT`) for authored recordings | Column on `book_chapters` |

**P0 items are client-only changes in `BookDetailPage.tsx`** — no migration needed. These can ship today.

---

### Audio Lectures & Text-to-Speech

**Goal:** Let learners listen to course content — either an authored audio file or synthesized speech.

#### Option A — Authored audio on `book_chapters`
Add `audio_url TEXT` column to `book_chapters`. Render an HTML5 `<audio>` element above the chapter body when `audio_url` is present. Reuse the same pattern for `pages` (`page_sections.audio_url`).

#### Option B — Browser TTS (zero infra cost)
Use `window.speechSynthesis` to read chapter content aloud. Strip markdown before feeding to `speechSynthesis.speak()`. Add a "Listen" button to `BookDetailPage` and `PageView`.

```ts
// Pattern for browser TTS
const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
  utterance.rate = 1.0; // expose as UI control 0.5–2.0
  window.speechSynthesis.speak(utterance);
};
const stopSpeaking = () => window.speechSynthesis.cancel();
```

**Recommendation:** Ship Option B (browser TTS) first — zero cost, no schema change, three files touched (`BookDetailPage.tsx`, a shared `useTTS` hook, and `PageView.tsx`). Add Option A later for production-quality audio.

---

### Course-to-Profile Matching ("Recommended for You")

**Goal:** Surface relevant courses to a learner on `CoursesPage` and their dashboard based on profile overlap.

**Scoring approach (client-side, no schema change):**
```ts
// Simple tag overlap score
const scoreMatch = (course: Course, profile: UserProfile): number => {
  const profileSet = new Set([
    ...(profile.interests ?? []),
    ...(profile.looking_for ?? []),
    profile.career_stage,
  ].filter(Boolean));
  return (course.tags ?? []).filter(t => profileSet.has(t)).length;
};
```

**CoursesPage changes needed:**
1. Fetch current user's profile fields (`career_stage`, `looking_for`, `interests`) — already in `profiles` table
2. Run `scoreMatch` over the published course list
3. Render a "Recommended for You" horizontal scroll section above the All Courses grid when `score > 0` for at least one course
4. Courses with `score = 0` still appear in the main grid — no courses are hidden

**Note:** The "My Courses" filter already has a bug where it reads `course_enrollments` only (misses ticket-enrolled users). Fix that at the same time by joining `access_tickets` in the enrollment check.

---

### Slides Content Type (Planned)

**Concept:** A `slides` journey item type — a deck-style viewer for text-heavy or visual slide content, more suited to long-form presentations than the existing `deck` flashcard format.

**Differences from `deck`:**
| | `deck` (existing) | `slides` (planned) |
|---|---|---|
| Primary use | Flashcard Q&A | Presentation / lecture slides |
| Navigation | Card flip (front/back) | Linear prev/next |
| Content per item | Short answer + question | Rich markdown, image, or embed per slide |
| Import | Manual entry | Markdown frontmatter or CSV import |

**Proposed schema:**
```sql
slide_decks (id, title, description, created_by, created_at)
slides (id, deck_id, order_index, title, body text, image_url, notes text, created_at)
```

**Import path:** Accept a markdown file where each `---` separator creates a new slide (Marp/Reveal.js compatible). This enables import from any markdown-based slide tool.

**Status:** Concept only — no schema migration or UI work done.

---

### Competitive Comparison Summary

| Feature | Connexted Courses | Teachable | Thinkific | Kajabi | Circle (courses) |
|---------|-------------------|-----------|-----------|--------|-----------------|
| Self-paced enrollment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cohort / program mode | ✅ (Programs) | ❌ | ✅ | ✅ | ✅ |
| JSON export/import | ✅ | ❌ | ❌ | ❌ | ❌ |
| Course duplication | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI course builder | ❌ (planned) | ✅ | ✅ | ✅ | ❌ |
| 1:1 instructor-student messaging | ❌ (planned) | ❌ | ❌ | ✅ | ✅ |
| Course ratings/reviews | ❌ (schema exists, not wired) | ✅ | ✅ | ✅ | ❌ |
| Certificate of completion | ❌ (listed as planned) | ✅ | ✅ | ✅ | ❌ |
| Book study template | ❌ (planned) | ❌ | ❌ | ❌ | ❌ |
| Built-in TTS / audio | ❌ (planned) | ❌ | ❌ | ❌ | ❌ |
| Interactive elements (poll, quiz) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cross-platform import | ❌ | ❌ | partial | ❌ | ❌ |
| Profile-based recommendations | ❌ (planned) | ❌ | ❌ | ❌ | ❌ |
| Community integration | ✅ (Circles) | ❌ | ❌ | ✅ | ✅ |

**Key differentiators to build toward:**
1. JSON portability (already done — unique in the market)
2. 1:1 course companion messaging (planned — would differentiate from Teachable/Thinkific)
3. Profile-based matching (planned — no competitor does this client-side)
4. Book study template (planned — no competitor has this pattern)
5. Audio/TTS on any content item (planned — no competitor has browser TTS)
