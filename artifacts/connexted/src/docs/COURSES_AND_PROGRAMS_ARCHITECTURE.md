# Courses & Programs Architecture

## Overview

Courses and Programs are the two top-level learning containers in the platform. Both share a common structural layer called **Journeys** (`program_journeys` table), which in turn contain **Journey Items** (`journey_items` table) that point to content, containers, and other platform objects.

```
Program or Course
  |
  +-- Journey 1 (program_journeys row, order_index=0)
  |     +-- Journey Item A (document)
  |     +-- Journey Item B (episode)
  |     +-- Journey Item C (build)
  |
  +-- Journey 2 (program_journeys row, order_index=1)
  |     +-- Journey Item D (deck)
  |     +-- Journey Item E (checklist)
  |
  +-- Journey N ...
```

---

## 1. The Shared Journey Layer

### `program_journeys` Table

Both programs and courses store their structural units in the same `program_journeys` table. The key columns are:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `program_id` | UUID (nullable) | FK to `programs.id` -- set for program journeys |
| `course_id` | UUID (nullable) | FK to `courses.id` -- set for course journeys |
| `title` | text | Journey title (e.g., "Week 1: Foundations") |
| `description` | text | Journey description |
| `order_index` | integer | Display/sequence order (0-based) |
| `status` | text | `not-started`, `in-progress`, `completed` |
| `start_date` | timestamptz | Optional scheduled start |
| `finish_date` | timestamptz | Optional scheduled end |
| `circle_id` | UUID (nullable) | Optional link to a community circle |
| `containers_template` | jsonb | Template definitions for workflow containers |
| `created_at` | timestamptz | Row creation timestamp |

**Key rule:** A journey belongs to exactly one program OR one course -- never both. The code in `JourneyManagement.tsx` sets either `program_id` or `course_id` when inserting:

```ts
if (programId) {
  journeyData.program_id = programId;
} else if (courseId) {
  journeyData.course_id = courseId;
}
```

### `journey_items` Table

Each journey contains ordered items that reference existing platform content:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `journey_id` | UUID | FK to `program_journeys.id` |
| `item_type` | text | Type discriminator (see Item Types below) |
| `item_id` | UUID | FK to the source content table |
| `title` | text | Display title (can differ from source) |
| `description` | text (nullable) | Display description |
| `order_index` | integer | Display order within the journey |
| `is_published` | boolean | Whether visible to participants |
| `icon` | text (nullable) | Optional custom icon |
| `estimated_time` | integer (nullable) | Estimated minutes to complete |

**Important:** The `journey_items` INSERT path does **not** include `created_by` or `estimated_time` columns in the INSERT statement (these were removed to fix a schema mismatch). `estimated_time` is read-only from the SELECT side.

---

## 2. Item Types: Content, Containers, and Other

All item types are defined in `/src/lib/journey-item-types.ts` as the `JourneyItemType` union and the `JOURNEY_ITEM_TYPES` configuration map.

### Content Types (user-created content)

| `item_type` | Source Table | Description |
|-------------|-------------|-------------|
| `document` | `documents` | Text documents, tutorials, guides. Has `media_type` field (document, video, audio, quiz, assignment), `video_url`, `video_provider`, `duration_minutes`, `url` |
| `book` | `books` | Multi-chapter books (chapters in `chapters` table) |
| `magazine` | `magazines` | Periodical publications. Table uses `name` not `title` |
| `episode` | `episodes` | Video episodes. **Uses `video_platform` and `duration`** (NOT `video_provider`/`duration_minutes`) |
| `deck` | `decks` | Slide decks / flashcards (cards in `deck_cards` table) |
| `shelf` | `libraries` | Curated document collections. Table uses `name` not `title` |
| `playlist` | `playlists` | Video/content playlists. Table uses `name` not `title`, routes use `slug` |

### Container Types (group activities)

| `item_type` | Source Table | Description | Route |
|-------------|-------------|-------------|-------|
| `checklist` | `checklists` | Task lists and progress tracking | `/checklists/:id` |
| `build` | `builds` | Tutorials, project builds | `/builds/:slug` |
| `pitch` | `pitches` | Pitch presentations | `/pitches/:slug` |
| `table` | `tables` | Document tables | `/tables/:slug` |
| `elevator` | `elevators` | Quick intro activities | `/elevators/:slug` |
| `standup` | `standups` | Daily/weekly check-ins | `/standups/:slug` |
| `meetup` | `meetups` | Networking events | `/meetups/:slug` |
| `sprint` | `sprints` | Time-boxed challenges | `/sprints/:slug` |

### Other Types

| `item_type` | Source Table | Description |
|-------------|-------------|-------------|
| `event` | `events` | Calendar events and sessions |
| `discussion` | `forum_threads` | Forum discussions |
| `resource` | `documents` | External links (uses documents as fallback) |
| `container` | (generic) | **Legacy/deprecated** -- use specific container type |

### Content Type Unification (Architectural Decision)

Courses use the **same content and container types as programs**. There are no course-only element types. The five former course-only types (text lesson, video lesson, audio lesson, quiz, assignment) all map to `documents` rows with the appropriate `media_type` value:

| Former Course Type | Maps To | `media_type` Value |
|--------------------|---------|--------------------|
| Text Lesson | `documents` | `document` |
| Video Lesson | `documents` | `video` |
| Audio Lesson | `documents` | `audio` |
| Quiz | `documents` | `quiz` |
| Assignment | `documents` | `assignment` |

### Schema Column Differences

| Column | `episodes` table | `documents` table |
|--------|-----------------|-------------------|
| Video platform | `video_platform` | `video_provider` |
| Duration | `duration` | `duration_minutes` |

The `EpisodeViewer` component in `JourneyInlineViewer.tsx` handles both gracefully:
```ts
const platform = data.video_platform || data.video_provider || '';
```

---

## 3. Routing Configuration

Navigation from journey items to their full-page detail views is handled by the `ITEM_ROUTE_CONFIG` map in `JourneyDetailView.tsx`:

```ts
const ITEM_ROUTE_CONFIG: Record<string, { table: string; route: string; paramType: 'id' | 'slug' }> = {
  document: { table: 'documents',  route: '/documents',  paramType: 'id' },
  book:     { table: 'books',      route: '/books',      paramType: 'id' },
  deck:     { table: 'decks',      route: '/decks',      paramType: 'id' },
  shelf:    { table: 'libraries',  route: '/libraries',  paramType: 'id' },
  playlist: { table: 'playlists',  route: '/playlists',  paramType: 'slug' },
  build:    { table: 'builds',     route: '/builds',     paramType: 'slug' },
  pitch:    { table: 'pitches',    route: '/pitches',    paramType: 'slug' },
  table:    { table: 'tables',     route: '/tables',     paramType: 'slug' },
  elevator: { table: 'elevators',  route: '/elevators',  paramType: 'slug' },
  standup:  { table: 'standups',   route: '/standups',   paramType: 'slug' },
  meetup:   { table: 'meetups',    route: '/meetups',     paramType: 'slug' },
  sprint:   { table: 'sprints',    route: '/sprints',    paramType: 'slug' },
  event:    { table: 'events',     route: '/events',     paramType: 'id' },
  episode:  { table: 'episodes',   route: '/episodes',   paramType: 'id' },
  checklist:{ table: 'checklists', route: '/checklists',  paramType: 'id' },
  magazine: { table: 'magazines',  route: '/magazines',   paramType: 'id' },
};
```

- **`paramType: 'id'`** -- navigates directly to `/{route}/{item_id}`
- **`paramType: 'slug'`** -- looks up the `slug` column from the source table first, then navigates to `/{route}/{slug}`

---

## 4. Programs

### 4.1 Data Model

**`programs` table:**

| Column | Description |
|--------|-------------|
| `id`, `slug`, `name`, `description` | Identity |
| `template_id` | Links to a program template (e.g., accelerator, bootcamp) |
| `status` | `not-started`, `in-progress`, `completed` |
| `visibility` | `public`, `members-only`, `private` |
| `pricing_type` | `free`, `paid`, `members-only` |
| `enrollment_status` | `open`, `closed`, `invite-only` |
| `member_ids` | UUID array of members (**legacy, being migrated**) |
| `admin_ids` | UUID array of admins |
| `created_by` | UUID of creator |
| `circle_id` | Optional linked community circle |
| `cover_image`, `program_overview`, `learning_outcomes[]`, `prerequisites[]`, etc. | Landing page content |

**`program_members` table (normalized):**

| Column | Description |
|--------|-------------|
| `user_id` | FK to profiles |
| `program_id` | FK to programs |
| `status` | `enrolled`, `active`, `completed`, `applied`, etc. |
| `enrolled_at` | Enrollment timestamp |

### 4.2 Page Flow

```
/programs                    --> ProgramsPage (redirects to /my-programs)
/my-programs                 --> MyProgramsPage (user's enrolled programs)
/programs/discover           --> ProgramsDiscoverPage (browse all public programs)
/programs/:slug              --> ProgramPageRouter (smart router)
  |-- Non-member             --> ProgramLandingPage (marketing/enrollment page)
  |-- Member                 --> ProgramDetailPage (full dashboard)
/programs/:slug/settings     --> ProgramSettingsPage (admin only)
/program-admin/:programId/setup --> ProgramSetupDashboard (admin setup)
/programs/create             --> CreateProgramPage (template picker)
```

### 4.3 ProgramPageRouter (Decision Logic)

Located at `/src/app/components/program/ProgramPageRouter.tsx`. It:
1. Fetches the program by `slug`
2. Checks membership via `useIsProgramMember` hook
3. Checks visibility permissions (`canViewProgram()`)
4. Routes to `ProgramLandingPage` (non-member) or `ProgramDetailPage` (member)

### 4.4 ProgramDetailPage (Member Dashboard)

Three main tabs:

| Tab | Component | Sections |
|-----|-----------|----------|
| **Community** | `ProgramSecondLevelNav` | Feed, Forum, Members, Prompts |
| **Sessions** | `ProgramEvents` | Calendar events linked to the program |
| **Journeys** | `JourneyCardsView` / `JourneyDetailView` | Journey navigation + content |

**Journey navigation flow:**
1. `JourneyCardsView` shows all journeys as cards with progress bars, lock icons, and status badges
2. Clicking a journey card switches to `JourneyDetailView` which shows the ordered list of journey items
3. Each item has a completion checkbox, "View" (inline expand), and "Open" (navigate to full page) buttons

**Progress tracking (Programs):**
- Uses the `journey_progress` **aggregate table** (pre-computed server-side)
- Query: `supabase.from('journey_progress').select('*').eq('user_id', ...).eq('program_id', ...)`
- Returns `{ journey_id, total_items, completed_items, completion_percentage, status }`

### 4.5 ProgramLandingPage (Non-Member View)

Shows:
- Program title, description, cover image
- Template badge, member count, duration
- Learning outcomes, prerequisites, application requirements
- Pricing information
- Journey syllabus preview (titles + descriptions only)
- Enrollment CTA button
- Creator/instructor info

---

## 5. Courses

### 5.1 Data Model

**`courses` table:**

| Column | Description |
|--------|-------------|
| `id`, `slug`, `title`, `description` | Identity |
| `instructor_id`, `instructor_name`, `instructor_bio`, `instructor_avatar_url` | Course Leader info (DB columns retain "instructor" naming; UI displays "Course Leader") |
| `thumbnail_url`, `preview_video_url` | Media (DB columns retained; **hidden in UI** — courses use gradient placeholders) |
| `difficulty_level` | `beginner`, `intermediate`, `advanced` (DB column retained with default; **hidden in UI**) |
| `duration_hours`, `total_lessons` | Duration metadata (DB columns retained; **hidden in UI**) |
| `pricing_type` | `free`, `paid`, `members-only` |
| `price_cents`, `currency` | Pricing |
| `category`, `tags[]` | Categorization (category **hidden in UI**; tags shown) |
| `learning_objectives[]`, `requirements[]` | Syllabus metadata (DB columns retained; **hidden in UI**) |
| `average_rating`, `enrollment_count` | Engagement metrics (DB columns retained; **hidden in public UI**, enrollment_count shown in admin) |
| `is_published`, `featured` | Visibility |
| `circle_ids[]` | Circle scoping |
| `convertkit_product_id` | Kit Commerce integration for paid courses |
| `created_by` | UUID of creator |

**`course_enrollments` table (normalized):**

| Column | Description |
|--------|-------------|
| `id` | Primary key |
| `course_id` | FK to courses |
| `user_id` | FK to profiles |
| `enrolled_at` | Enrollment timestamp |
| `started_at` | First access timestamp |
| `completed_at` | Completion timestamp |
| `last_accessed_at` | Most recent access |
| `progress_percentage` | Overall % (written back from player) |
| `completed_journeys` | Count of completed journeys |
| `payment_status` | `free`, `paid`, etc. |

### 5.2 Page Flow (9 Routes)

```
/courses                     --> CoursesPage (catalog/browse with filters)
/courses/:slug               --> CourseLandingPage (marketing/enrollment page)
/courses/:slug/learn         --> CoursePlayerPage (learning player, requires enrollment)
/my-courses                  --> MyCoursesPage (user's enrolled courses with progress)
/course-admin/:courseId/setup --> ProgramSetupDashboard (instructor management, shared with programs)
/courses/create              --> CreateCoursePage (course creation form)
/circles/:circleId/courses   --> CoursesPage (circle-scoped catalog)
```

### 5.3 CoursesPage (Catalog)

Located at `/src/app/components/CoursesPage.tsx`. Features:
- Search by title/description/course leader name
- Filter by pricing type (All / Free / Paid / Members Only)
- "My Courses" enrolled-only toggle
- Course cards showing: gradient header, title, description, course leader name/avatar, pricing badge
- Circle-scoped filtering when accessed via `/circles/:circleId/courses`

**UI lean-down (Phase 1):** Category filter, difficulty filter, thumbnail images, duration, lesson count, rating stars, and enrollment count have been removed from the catalog UI. DB columns are retained with defaults.

### 5.4 CourseLandingPage (Marketing/Enrollment)

Located at `/src/app/components/CourseLandingPage.tsx`. Shows:
- Hero section: course title, description, module/lesson count summary
- Enrollment card: pricing display, enroll button, value props
- Course syllabus: journey titles, descriptions, item counts
- Course Leader sidebar: name, avatar, bio
- SEO meta tags and Schema.org JSON-LD

**UI lean-down (Phase 1):** Difficulty badge, duration, total_lessons, rating stars, enrollment count, thumbnail, preview video, learning objectives, requirements, and tags sections have been removed from the landing page UI. DB columns are retained with defaults.

**Enrollment flow:**
1. **Free courses:** Directly inserts into `course_enrollments`, increments `enrollment_count`, redirects to player
2. **Paid courses:** Redirects to Kit Commerce checkout URL (`convertkit_product_id`)
3. **Members-only:** Shows info toast (Gap #1: doesn't check `user_subscriptions`/`membership_tiers`)

### 5.5 CoursePlayerPage (Learning Experience)

Located at `/src/app/components/CoursePlayerPage.tsx`. A two-panel layout:

**Left Sidebar:**
- Course title with "Course Home" back button
- Overall progress bar (percentage)
- Module list (journeys) with:
  - Status icon (complete/in-progress/not-started)
  - Module number and title
  - Item count and mini progress bar
  - Active state highlighting

**Right Content Area:**
- Top bar with module title, module number, and Previous/Next navigation buttons
- `JourneyDetailView` component rendering the current journey's items
- Mobile hamburger menu toggle for sidebar

**Completion Certificate:**
- When `overallProgress === 100`, a congratulations card appears in the sidebar
- "Get Certificate" button marks `course_enrollments.completed_at` and `progress_percentage = 100`

**Progress tracking (Courses):**
- Computed **inline** (different from programs which use `journey_progress` aggregate table)
- For each journey, counts `journey_items` (total) and `journey_item_completions` where `completed=true` (completed)
- Overall percentage = average of all journey completion percentages
- Writes overall `progress_percentage` back to `course_enrollments` for `MyCoursesPage` display

### 5.6 MyCoursesPage

Located at `/src/app/components/MyCoursesPage.tsx`. Shows:
- All courses the user is enrolled in (via `course_enrollments`)
- Per-course: gradient header, title, description, course leader name, progress bar
- "Continue" / "Start" / "Review" button linking to `/courses/:slug/learn`
- Completion badge when `progress_percentage === 100`
- Stats cards: total enrolled, in progress, completed

---

## 6. Participant Experience

### 6.1 Viewing Journey Content

The `JourneyDetailView` component (`/src/app/components/program/JourneyDetailView.tsx`) renders each journey item as a card with:

1. **Completion checkbox** -- toggles `journey_item_completions` records
2. **Order number and type icon** -- visual identification
3. **Title and description** -- from `journey_items` (may differ from source content)
4. **Type badge** -- e.g., "Document", "Episode", "Build"
5. **Estimated time badge** -- if `estimated_time` is set
6. **"View" button** -- expands inline content viewer (`JourneyInlineViewer`)
7. **"Open" button** (external link icon) -- navigates to the full detail page

### 6.2 Inline Content Viewer

The `JourneyInlineViewer` (`/src/app/components/journey/JourneyInlineViewer.tsx`) has 11 type-specific sub-viewers:

| Sub-Viewer | Content Type | Features |
|------------|-------------|----------|
| `DocumentViewer` | document | Markdown rendering, URL embedding (Google Docs, Figma, YouTube, etc.), tag display |
| `BookViewer` | book | Chapter sidebar + chapter content with Markdown |
| `DeckViewer` | deck | Card-by-card navigation with Previous/Next |
| `EpisodeViewer` | episode | YouTube/Vimeo/Loom embed, duration display, fallback for documents with `media_type=video` |
| `PlaylistViewer` | playlist | Item list from `playlist_items` |
| `ShelfViewer` | shelf | Library document listing |
| `MagazineViewer` | magazine | Episode list within magazine |
| `ChecklistViewer` | checklist | Checklist items with completion state |
| `EventViewer` | event | Date, time, location, description |
| `ContainerViewer` | build/pitch/table/elevator/standup/meetup/sprint | Generic container info + link to full page |
| `DiscussionViewer` | discussion | Thread content + reply count |

### 6.3 Progress Tracking

**`journey_item_completions` table:**

| Column | Description |
|--------|-------------|
| `user_id` | FK to profiles |
| `journey_id` | FK to program_journeys |
| `item_id` | FK to journey_items |
| `completed` | boolean |
| `completed_at` | timestamp |

**Programs:** Progress is read from `journey_progress` aggregate table (pre-computed). Completion toggling writes to `journey_item_completions`, and the aggregate is eventually refreshed.

**Courses:** Progress is computed inline by counting `journey_items` (total) and `journey_item_completions` (completed) for each journey. The overall percentage is written back to `course_enrollments.progress_percentage`.

### 6.4 Enrollment

**Programs:**
- Join via `useJoinProgram` hook (inserts into `program_members` + updates `member_ids` array)
- Leave via `useLeaveProgram` hook
- Status-based: `enrolled`, `active`, `completed`, `applied`

**Courses:**
- Enroll via direct `course_enrollments` insert (free) or Kit Commerce redirect (paid)
- No leave/unenroll flow currently
- Tracks: `enrolled_at`, `started_at`, `last_accessed_at`, `completed_at`

### 6.5 Sidebar Navigation

Regular users see two course links in the sidebar (`Sidebar.tsx`):
- **My Courses** (`/my-courses`) -- enrolled courses
- **Browse Courses** (`/courses`) -- course catalog

Program links:
- **My Programs** (`/my-programs`) -- enrolled programs
- **Discover** (`/programs/discover`) -- browse public programs

---

## 7. Instructor / Manager Experience

### 7.1 Program Admin

**Access:** Users listed in `program.admin_ids` or `program.created_by`, plus users with `super`/`admin` role.

**Program Setup Dashboard** (`/program-admin/:programId/setup`):
- Located at `/src/app/components/admin/ProgramSetupDashboard.tsx`
- Tabs: Journey Management, Progress Analytics, Audit View, Export/Import

**Journey Management** (`/src/app/components/admin/JourneyManagement.tsx`):
- **Create journeys:** Dialog with title, description, status, optional circle link
- **Edit journeys:** Update title, description, status
- **Delete journeys:** With confirmation dialog
- **Reorder journeys:** By changing `order_index`
- **Expand journey:** Shows all journey items with their type, title, publish status
- **Add content to journey:** Via `AddContentDialog` or `AddJourneyContentDialog`
- **Delete items:** Remove individual journey items
- Works for both programs (`programId`) and courses (`courseId`)

**Program Settings** (`/programs/:slug/settings`):
- Edit name, description, slug
- Change visibility, pricing type
- Manage admin list
- Delete program

**From ProgramDetailPage:**
- "Manage Program" button -> Setup Dashboard
- "Settings" button -> Settings Page
- "Export" button -> Export program as JSON template
- "Add Content" button in journey view -> `AddJourneyContentDialog`

### 7.2 Course Instructor

**Access:** Users matching `course.instructor_id` or `course.created_by`, plus users with `canManagePrograms` role level.

**Create Course** (`/courses/create`):
- Title, description, category, difficulty level
- Pricing type (free/paid/members-only), price
- Instructor name and bio
- Kit Commerce product ID for paid courses
- Tags and topics

**Course Setup Dashboard** (`/course-admin/:courseId/setup`):
- Shares `ProgramSetupDashboard` component
- Same journey management, progress analytics, and export/import functionality
- The `contentType` variable switches between `'course'` and `'program'` context
- Course-specific: `CourseExportImport` component for course-specific import/export

### 7.3 Adding Content to Journeys

Two dialogs exist for adding content:

**`AddJourneyContentDialog`** (`/src/app/components/program/AddJourneyContentDialog.tsx`):
- Used from `ProgramDetailPage` (member view)
- Dropdown selects item type (all 18 types)
- Fetches available items from the corresponding source table
- Auto-fills title and description from selected item
- Publish toggle
- Inserts into `journey_items`

**`AddContentDialog`** (`/src/app/components/admin/AddContentDialog.tsx`):
- Used from `JourneyManagement` (admin setup view)
- Similar functionality, used in the admin context

**Content type picker in both dialogs:**
```
Content:     Document, Book, Magazine, Episode, Deck, Library, Playlist
Containers:  Table, Elevator, Pitch, Build, Standup, Meetup, Sprint, Checklist
Other:       Event, Discussion Thread, Resource
```

### 7.4 Container Management

**Workflow Containers** (`/src/app/components/journey/JourneyContainersSection.tsx`):
- Journeys can define container templates in `containers_template` JSONB
- Templates specify container type and name
- Admins can create container instances from templates
- Once created, containers link back to the journey
- `ContainerCard` component displays created containers with links

---

## 8. Key Differences: Programs vs. Courses

| Aspect | Programs | Courses |
|--------|----------|---------|
| **Source table** | `programs` | `courses` |
| **Identity field** | `name` | `title` |
| **Journey FK** | `program_journeys.program_id` | `program_journeys.course_id` |
| **Enrollment table** | `program_members` (+ legacy `member_ids[]`) | `course_enrollments` |
| **Enrollment model** | Status-based (enrolled/active/completed) | Binary (enrolled or not) |
| **Progress storage** | `journey_progress` aggregate table | Computed inline, written to `course_enrollments.progress_percentage` |
| **Community features** | Feed, Forum, Members, Prompts | None (content-only) |
| **Sessions/Events** | Dedicated Sessions tab | None |
| **Player UI** | Tab-based dashboard | Left sidebar + right content panel |
| **Access control** | Visibility + enrollment status + pricing | Visibility + enrollment + pricing |
| **Journey locking** | Sequential lock (must complete previous) | No sequential lock |
| **Templates** | Template-based creation (accelerator, bootcamp, etc.) | Form-based creation |
| **Pricing integration** | Direct (pricing_type on program) | Kit Commerce (convertkit_product_id) |
| **Certificate** | Not implemented | Placeholder (marks completed_at) |

---

## 9. Component File Map

### Program Components (`/src/app/components/program/`)

| File | Purpose |
|------|---------|
| `ProgramPageRouter.tsx` | Smart router: Landing vs Dashboard |
| `ProgramLandingPage.tsx` | Non-member marketing/enrollment page |
| `CreateProgramPage.tsx` | Template-based program creation |
| `ProgramSettingsPage.tsx` | Admin settings page |
| `ProgramSecondLevelNav.tsx` | Community tab sub-navigation |
| `JourneyCardsView.tsx` | Journey overview grid with progress |
| `JourneyDetailView.tsx` | Single journey item list with inline viewer |
| `JourneyContentGrid.tsx` | Alternative grid layout for journey items |
| `JourneyCard.tsx` | Individual journey item card component |
| `ProgramJourneyNav.tsx` | Horizontal journey tab navigation |
| `AddJourneyContentDialog.tsx` | Dialog to add content to a journey |
| `CompletionCheckbox.tsx` | Reusable completion toggle button |
| `ProgramFeed.tsx` | Community feed component |
| `ProgramForum.tsx` | Forum/discussion component |
| `ProgramMembers.tsx` | Member list component |
| `ProgramPrompts.tsx` | AI prompts component |
| `ProgramEvents.tsx` | Sessions/events component |
| `ProgramDocuments.tsx` | Program documents component |
| `ProgramLibrary.tsx` | Program library component |
| `ProgramOfferingCard.tsx` | Offering display card |
| `ProgramsDiscoverPage.tsx` | Browse/discover programs |

### Course Components (`/src/app/components/course/`)

| File | Purpose |
|------|---------|
| `CreateCoursePage.tsx` | Course creation form |
| `CourseExportImport.tsx` | Course export/import functionality |

### Top-Level Course Pages (`/src/app/components/`)

| File | Purpose |
|------|---------|
| `CoursesPage.tsx` | Course catalog with filters |
| `CourseLandingPage.tsx` | Course marketing/enrollment page |
| `CoursePlayerPage.tsx` | Learning player with sidebar |
| `MyCoursesPage.tsx` | User's enrolled courses |

### Journey Components (`/src/app/components/journey/`)

| File | Purpose |
|------|---------|
| `JourneyInlineViewer.tsx` | Inline content viewer with 11 sub-viewers |
| `JourneyContainersSection.tsx` | Container template + instance display |
| `JourneyCircleSection.tsx` | Circle association display |
| `JourneyCard.tsx` | Journey card component |

### Admin Components (`/src/app/components/admin/`)

| File | Purpose |
|------|---------|
| `JourneyManagement.tsx` | Full journey + item CRUD (shared by programs and courses) |
| `ProgramSetupDashboard.tsx` | Admin setup dashboard (shared by programs and courses) |
| `AddContentDialog.tsx` | Admin content picker dialog |
| `JourneyProgressAnalytics.tsx` | Progress analytics view |
| `ProgramAuditView.tsx` | Audit/history view |

### Shared Configuration (`/src/lib/`)

| File | Purpose |
|------|---------|
| `journey-item-types.ts` | `JourneyItemType` union, `JOURNEY_ITEM_TYPES` config map, helpers |
| `container-types.ts` | `ContainerType` definitions |

---

## 10. Known Gaps and Outstanding Items

### Terminology

| Term | Programs | Courses |
|------|----------|---------|
| **Leader role** | Program Leader | Course Leader |
| **DB column** | `admin_ids[]` + `created_by` (resolved from `users` table) | `instructor_id` + `instructor_name` (denormalized string) |
| **Route paths** | N/A | `/instructor/dashboard`, `/instructor/courses/:slug` (retain "instructor" in URLs for now) |

### Course Gaps (from original 11)

| Gap | Description | Status |
|-----|-------------|--------|
| 1 | Members-only gating doesn't check `user_subscriptions`/`membership_tiers` | Open |
| 4 | Kit Commerce webhook doesn't create `course_enrollments` rows | Open |
| 6 | No `courses_enabled` feature flag | Open |
| 7 | `average_rating` DB column exists but no review mechanism writes to it; **hidden from UI** | Open |
| 9 | `accessTicketService.ts`/`courseTicketService.ts` are aspirational/unused | Open |

### Component-Layer Drift

| Item | Description | Status |
|------|-------------|--------|
| 1 | Programs use `journey_progress` aggregate; courses compute inline | Open |
| 2 | Programs use `member_ids[]` + `program_members`; courses use `course_enrollments` | Open |
| 3 | `JourneyCardsView`/`JourneyContentGrid` are program-only | Open |

### Completed (Phase 1)

| Item | Description |
|------|-------------|
| 1 | Unified terminology: "Program Leader" / "Course Leader" across all UI |
| 2 | Course UI lean-down: stripped ~12 dead-weight display fields from 6 course files |
| 3 | Fixed containers bug in 4 program template data files (merged into items[]) |
| 4 | Architecture doc updated with terminology and UI lean-down notes |

### Other Outstanding Items

- Build course seeder in admin DataSeeder
- Course unenroll flow (no way to leave a course)
- Progress refresh after completion toggle in CoursePlayerPage
- Certificate generation (currently just marks completed_at)
- Enhance `DocumentDetailPage` for video/quiz/assignment `media_type` variants
- Add `magazine`, `episode`, `checklist` to `journey_items.item_type` DB CHECK constraint
- Courses have zero Hono backend routes (all direct Supabase queries)