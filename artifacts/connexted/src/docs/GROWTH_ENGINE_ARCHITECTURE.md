# Growth Engine Architecture

## The Thesis

Most platforms treat profile, discovery, and learning as separate silos. Users fill out a profile once and forget it. They browse a catalog with no guidance. They complete a course and see no thread connecting it to what comes next. The result: high drop-off, low retention, no sense of progression.

This architecture connects three systems into a single **growth engine**:

- **My Radar** (what I care about right now) -- living preferences that drive discovery
- **My Growth** (how far I've come) -- visible progression through pathways and badges
- **Recommendations** (what should I do next) -- computed from the intersection of radar + growth

Together they create a retention loop:

```
    ┌──────────────┐
    │   My Radar    │  "What I care about"
    │  (interests,  │   Updated by user monthly
    │   topics,     │
    │   looking for)│
    └──────┬───────┘
           │ drives
           ▼
  ┌────────────────────┐
  │  Recommendations    │  "Here's what matches"
  │  (courses, programs,│   Computed from radar + growth
  │   pathways, people) │
  └────────┬───────────┘
           │ leads to enrollment
           ▼
    ┌──────────────┐
    │   My Growth   │  "How far I've come"
    │  (pathways,   │   Updated on completion events
    │   badges,     │
    │   skills)     │
    └──────┬───────┘
           │ informs "what's next"
           ▼
    ┌──────────────┐
    │  Next Steps   │  "What I should do next"
    │  (next course │   Computed from growth + radar
    │   in pathway, │
    │   new pathway)│
    └──────┬───────┘
           │ feeds back
           ▼
      Back to Radar
```

---

## Current State Audit

### What exists and works

| System | Infrastructure | Status |
|--------|---------------|--------|
| **User Profile** | 11 tabs (About, Status, Membership, Contact, Social, Professional, Skills, Interests, Looking For, Privacy, Data) | Built, overloaded |
| **Tags** (folksonomy) | `tags-api.ts`, text arrays on courses/programs/circles, `user_generated_tags` moderation table | Built |
| **Topics** (taxonomy) | `topics-api.ts`, `topics` table (audience/purpose/theme), `topic_links` junction, `topic_followers`, `TopicSelector` component | Built |
| **Topic Matching** | `topic-matching.ts` with circle-to-user matching algorithm (60% topic, 40% audience scoring) | Built for circles only |
| **Badge Types** | `badge_types` table with 6 categories, `badge_image_url`, `auto_issue` flag, `auto_issue_criteria` JSON | Built |
| **Badge Issuance** | `user_badges` + `company_badges` tables, `issueBadge()` RPC, admin assignment UI | Built |
| **Badge Display** | `BadgeDisplay`, `BadgeList` components, badge rendering on public profiles | Built |
| **Skills** | `user_skills` table (skill_name + proficiency_level), `user_credentials` table | Built, self-reported only |
| **Journey Progress** | `journey_item_completions`, `journey_progress` aggregate, `course_enrollments.progress_percentage` | Built, per-content only |
| **Course/Program Creation** | Both support `TopicSelector` for topic linking at creation time | Built, optional |
| **Topic Detail Page** | Shows courses, programs, books, decks, documents linked to a topic | Built |
| **Markets System** | Companies, offerings, market placements (discovery/launch/marketplace), offering cards | Built, disconnected |
| **Onboarding Wizard** | 3-step: basic info -> professional identity -> interests & social | Built |

### What exists but doesn't work correctly

| System | Problem |
|--------|---------|
| **MyBadgesPage** | Uses HARDCODED badge definitions, ignores the real `badge_types`/`user_badges` database system |
| **Auto-issue badges** | `auto_issue` flag and `auto_issue_criteria` exist on `badge_types` but nothing reads or triggers them |
| **Course certificates** | "Get Certificate" button at 100% progress says "coming soon" -- no actual generation |
| **Skill proficiency** | Self-reported only. No connection between completing a course and gaining/validating a skill |
| **Topic linking** | Optional at creation time, often skipped. No nudge, no validation, no "you forgot to tag this" |

### What doesn't exist yet

| Concept | Description |
|---------|-------------|
| **Pathway** | An ordered sequence of courses/programs leading to a credential |
| **Skill vocabulary** | A shared set of skill tags that courses declare they teach and users declare they have |
| **Skill-content mapping** | Courses declaring `teaches_skills`, `assumes_skills`, `difficulty_level` |
| **Assessment** | Any mechanism to evaluate where a user is or should start |
| **Cross-content progress** | Aggregated view of all courses/programs a user has completed |
| **"What's next" logic** | Suggesting the next course/program based on current progress |
| **My Radar surface** | Living preferences separated from the static profile page |
| **My Growth surface** | Unified progression view (pathways + badges + skill growth) |
| **Recommendation engine** | Scoring function matching user signals to content |
| **Markets-Topics bridge** | Offerings linked to topics via `topic_links` |

---

## Data Model: New Entities

### 1. Pathways

A pathway is an ordered sequence of courses and/or programs that represents a coherent growth arc. It earns a credential (badge) on completion.

```
pathways (KV store, key: pathway:{id})
  id: string (UUID)
  name: string                    -- "Leadership Foundations"
  slug: string                    -- "leadership-foundations"
  description: string             -- Rich description of the pathway
  short_description: string       -- One-liner for cards
  
  -- Classification
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
  estimated_hours: number         -- Total estimated time
  skill_tags: string[]            -- Skills this pathway develops
  topic_ids: string[]             -- Topics this pathway covers (via topic_links)
  tags: string[]                  -- Free-form tags
  
  -- Visual
  icon: string | null             -- Lucide icon name
  color: string                   -- Gradient/color for cards
  cover_image_url: string | null  -- Optional cover image
  
  -- Completion
  completion_badge_id: string | null   -- Badge earned on pathway completion
  completion_certificate: boolean      -- Whether to generate a certificate
  
  -- Metadata
  created_by: string              -- User ID
  admin_ids: string[]             -- Who can edit this pathway
  visibility: 'public' | 'members-only' | 'private'
  is_featured: boolean
  status: 'draft' | 'published' | 'archived'
  enrollment_count: number        -- Cached count
  completion_count: number        -- Cached count
  created_at: string
  updated_at: string
```

### 2. Pathway Steps

Each step in a pathway points to a course or program, with ordering and optional badge.

```
pathway_steps (KV store, key: pathway_step:{id})
  id: string (UUID)
  pathway_id: string              -- FK to pathway
  order_index: number             -- 0-based sequence
  
  -- What this step points to
  step_type: 'course' | 'program'
  step_id: string                 -- FK to courses.id or programs.id
  
  -- Step metadata
  title_override: string | null   -- Optional display title (else use course/program title)
  description_override: string | null
  is_required: boolean            -- Required for pathway completion?
  is_gate: boolean                -- Must complete before moving to next step?
  
  -- Step completion reward
  step_badge_id: string | null    -- Badge earned on completing this step
  
  -- Assessment
  pre_assessment_id: string | null   -- Optional assessment before this step
  post_assessment_id: string | null  -- Optional assessment after this step
```

### 3. Pathway Enrollments

Tracks a user's enrollment and progress through a pathway.

```
pathway_enrollments (KV store, key: pathway_enrollment:{pathwayId}:{userId})
  pathway_id: string
  user_id: string
  enrolled_at: string
  started_at: string | null
  completed_at: string | null
  
  -- Progress
  current_step_index: number      -- Which step they're on
  completed_steps: string[]       -- Array of step IDs completed
  progress_percentage: number     -- Computed: completed_required / total_required
  
  -- Status
  status: 'enrolled' | 'active' | 'paused' | 'completed' | 'abandoned'
  last_activity_at: string
```

### 4. Skill Definitions (shared vocabulary)

A curated set of skills that can be referenced by courses, pathways, and users.

```
skill_definitions (KV store, key: skill_def:{slug})
  slug: string                    -- "react", "leadership", "coaching"
  name: string                    -- "React", "Leadership", "Coaching"
  category: string                -- "Technology", "Business", "Personal Development"
  description: string | null
  icon: string | null
  
  -- Progression levels
  levels: [                       -- Ordered from lowest to highest
    { level: 'awareness', label: 'Awareness', description: 'Familiar with the concept' },
    { level: 'beginner', label: 'Beginner', description: 'Can apply basics with guidance' },
    { level: 'intermediate', label: 'Intermediate', description: 'Can apply independently' },
    { level: 'advanced', label: 'Advanced', description: 'Can teach others and handle edge cases' },
    { level: 'expert', label: 'Expert', description: 'Industry-recognized expertise' },
  ]
  
  -- Metadata
  is_official: boolean            -- Admin-curated vs. user-suggested
  created_by: string
  usage_count: number             -- How many courses/pathways reference this skill
```

### 5. Course/Program Skill Metadata

Added to existing course and program records (not a new entity -- added fields).

```
-- Added to courses table / course KV entries:
  teaches_skills: [               -- Skills this course develops
    { skill_slug: 'react', from_level: 'beginner', to_level: 'intermediate' },
    { skill_slug: 'javascript', from_level: 'intermediate', to_level: 'intermediate' },
  ]
  assumes_skills: [               -- Skills expected before starting
    { skill_slug: 'html', min_level: 'beginner' },
    { skill_slug: 'css', min_level: 'beginner' },
  ]
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'

-- Same fields added to programs table / program KV entries
```

### 6. User Skill Progress

Tracks a user's skill levels over time, updated by course/program completions.

```
user_skill_progress (KV store, key: user_skill:{userId}:{skillSlug})
  user_id: string
  skill_slug: string
  current_level: string           -- 'awareness' | 'beginner' | 'intermediate' | 'advanced' | 'expert'
  
  -- How this level was established
  level_source: 'self_reported' | 'course_completion' | 'assessment' | 'badge' | 'endorsement'
  level_evidence: [               -- What supports this level
    { type: 'course_completed', id: 'xxx', title: 'React Fundamentals', date: '2026-01-15' },
    { type: 'badge_earned', id: 'yyy', title: 'React Developer', date: '2026-01-20' },
    { type: 'assessment_passed', id: 'zzz', score: 85, date: '2026-02-01' },
  ]
  
  -- History
  level_history: [                -- Progression timeline
    { level: 'awareness', achieved_at: '2025-11-01', source: 'self_reported' },
    { level: 'beginner', achieved_at: '2026-01-15', source: 'course_completion' },
    { level: 'intermediate', achieved_at: '2026-02-01', source: 'assessment' },
  ]
  
  first_recorded_at: string
  last_updated_at: string
```

### 7. User Radar (living preferences, separated from profile)

```
user_radar (KV store, key: user_radar:{userId})
  user_id: string
  
  -- What I'm interested in right now
  interests: string[]             -- Free text: ['FinTech', 'AI', 'Sustainability']
  followed_topic_ids: string[]    -- From topics table (cached for quick access)
  followed_tags: string[]         -- From tags system
  
  -- Who I am right now
  career_stage: string            -- 'student' | 'early-career' | 'mid-career' | etc.
  professional_roles: string[]    -- ['Founder', 'Product Manager']
  
  -- What I'm looking for right now
  looking_for: string[]           -- ['co-founder', 'mentorship', 'early-adopters']
  looking_for_details: string     -- Free text
  
  -- Pathway preferences
  active_pathway_ids: string[]    -- Pathways I've enrolled in
  skill_goals: [                  -- Skills I want to develop
    { skill_slug: 'leadership', target_level: 'advanced' },
    { skill_slug: 'coaching', target_level: 'intermediate' },
  ]
  
  -- Matching control
  include_in_recommendations: boolean   -- Opt-in/out of recommendations
  
  -- Meta
  last_updated_at: string
  update_count: number            -- Track how often they update (engagement signal)
```

---

## Architecture: Three Surfaces

### Surface 1: My Radar (`/my-radar`)

**Purpose:** Living preferences that drive what the platform shows you.

**What lives here (moved from Profile):**
- Interests (free text tags)
- Followed Topics (moderated taxonomy)
- Followed Tags (user folksonomy)
- Career Stage
- Professional Roles
- Looking For + details
- Skill Goals (NEW)

**What stays on Profile:**
- Name, bio, avatar, headline
- Contact info, social links
- Work history, affiliations, credentials
- Privacy settings, tier/membership
- Data import/export

**Dashboard widget (summary):**
```
┌─ My Radar ──────────────────────────────────────────┐
│ Interests: [FinTech x] [AI x] [+ Add]               │
│ Topics:    [Founders] [Innovation] [Browse]          │
│ Goals:     Leadership → Advanced, Coaching → Inter.  │
│                                                       │
│ 3 courses match · 2 programs match · 1 pathway       │
│                                              View all│
└──────────────────────────────────────────────────────┘
```

### Surface 2: My Growth (`/my-growth`)

**Purpose:** Unified view of progression -- pathways, badges, skills, completions.

**Sections:**

1. **Active Pathways** -- Visual progress through each enrolled pathway
```
Leadership Development ──────────────────── 40%
  ✅ Self-Awareness for Leaders (completed Jan 15)
  🔵 Team Dynamics (in progress, 60%)
  🔒 Leadership Accelerator Program (locked)
  → Badge: "Leadership Foundations" (3/3 steps to earn)
```

2. **Recent Badges** -- Badges earned, with dates and evidence
```
🏅 Self-Aware Leader · Jan 15, 2026 · via "Self-Awareness for Leaders"
🏅 First Course Complete · Jan 15, 2026 · Platform achievement
🏅 Community Contributor · Dec 2025 · 10 forum posts
```

3. **Skill Progress** -- Visual skill levels with evidence trail
```
Leadership   ████████░░ Advanced   ↑ from Intermediate (Jan 2026)
Coaching     ████░░░░░░ Beginner   ↑ from Awareness (Dec 2025)
React        ██████████ Expert     via 3 courses + assessment
```

4. **Completion History** -- Timeline of all courses/programs completed
```
Feb 2026  📘 Team Dynamics (course) · 12 hours · 3 badges
Jan 2026  📘 Self-Awareness for Leaders (course) · 8 hours · 1 badge
Dec 2025  📗 Startup Bootcamp (program) · 6 weeks · 2 badges
```

5. **Suggested Next** -- What to do next based on pathway position + radar
```
📘 "Team Dynamics" -- next in your Leadership pathway (auto-enrolled)
📗 "Coaching Foundations" -- matches your skill goal: Coaching → Intermediate
📘 "AI for Product Managers" -- matches your interests: AI + Product Management
```

**Dashboard widget (summary):**
```
┌─ My Growth ──────────────────────────────────────────┐
│ 📊 2 active pathways · 5 badges earned · 3 skills    │
│                                                       │
│ Leadership Development ████████░░ 67%                 │
│ Technical Mastery      ████░░░░░░ 40%                 │
│                                                       │
│ Next: "Team Dynamics" (2 days until suggested start)  │
│                                              View all │
└──────────────────────────────────────────────────────┘
```

### Surface 3: Pathway Landing Page (`/pathways/:slug`)

**Purpose:** Marketing/enrollment page for a pathway (like course/program landing pages).

**Sections:**
- Hero with pathway name, description, difficulty, estimated hours
- Skill development preview: "This pathway takes you from X to Y in [skill]"
- Steps list with course/program cards (locked/unlocked/completed state)
- Badge preview: what you'll earn
- Social proof: N people enrolled, M completed, testimonials
- Enrollment CTA (free or gated by tier)

---

## Development Phases

### Phase G1: Foundation Layer (weeks 1-2)
**Goal:** Establish the data model and fix existing broken pieces.

#### G1.1 Fix MyBadgesPage
- **File:** `/src/app/components/MyBadgesPage.tsx`
- **Change:** Replace hardcoded `AVAILABLE_BADGES` with real `getUserBadges()` from `badgeService.ts`
- **Dependency:** None
- **Effort:** Small

#### G1.2 Wire course completion → badge auto-issue
- **Files:** `CoursePlayerPage.tsx`, new `completion-engine.ts` server file
- **Change:** When `progress_percentage` hits 100% and user clicks "Complete":
  1. Mark `course_enrollments.completed_at`
  2. Call `checkAndIssueBadges(userId, { courseId })` 
  3. Check all `badge_types` where `auto_issue = true` and `category = 'completion'`
  4. If `issued_for_course_id` matches and badge not already issued, issue it
- **Dependency:** None (badge infrastructure exists)
- **Effort:** Medium

#### G1.3 Wire program completion → badge auto-issue
- **Similar to G1.2** but for programs (all required journeys completed)
- **Dependency:** G1.2 (shared completion engine)
- **Effort:** Medium

#### G1.4 Create skill definitions vocabulary
- **File:** New `skill-definitions.ts` data file + admin UI for managing skill definitions
- **KV pattern:** `skill_def:{slug}` 
- **Seed with:** Initial set of ~30 skills across Technology, Business, Personal Development, Creative
- **Dependency:** None
- **Effort:** Medium

#### G1.5 Add skill metadata to course/program creation
- **Files:** `CreateCoursePage.tsx`, `CreateProgramPage.tsx` / `ProgramTemplates.tsx`, course/program settings pages
- **Change:** Add `teaches_skills`, `assumes_skills`, `difficulty_level` fields
- **UI:** Skill selector component (similar to `TopicSelector`) that references skill definitions
- **Dependency:** G1.4
- **Effort:** Medium

---

### Phase G2: Pathway Entity (weeks 3-4)
**Goal:** Build the pathway concept as a first-class entity.

#### G2.1 Pathway CRUD API
- **File:** New `/supabase/functions/server/pathways-api.ts`
- **Routes:**
  - `GET /pathways` -- list all published pathways
  - `GET /pathways/:slug` -- get pathway with steps
  - `POST /pathways` -- create pathway (admin/leader)
  - `PUT /pathways/:id` -- update pathway
  - `DELETE /pathways/:id` -- archive pathway
  - `POST /pathways/:id/steps` -- add/reorder steps
  - `POST /pathways/:id/enroll` -- enroll current user
  - `GET /pathways/:id/progress/:userId` -- get user's progress
- **KV patterns:** `pathway:{id}`, `pathway_step:{id}`, `pathway_enrollment:{pathwayId}:{userId}`
- **Effort:** Large

#### G2.2 Pathway Builder UI (admin/leader)
- **File:** New `/src/app/components/pathways/PathwayBuilder.tsx`
- **Features:**
  - Create pathway with name, description, difficulty, skills
  - Add steps by searching existing courses/programs
  - Drag-to-reorder steps
  - Mark steps as required/optional, gated/ungated
  - Assign badge per step and for overall completion
  - Preview the learner experience
- **Dependency:** G2.1
- **Effort:** Large

#### G2.3 Pathway Landing Page
- **File:** New `/src/app/components/pathways/PathwayLandingPage.tsx`
- **Route:** `/pathways/:slug`
- **Features:**
  - Hero section with difficulty, estimated hours, skill development preview
  - Step list showing course/program cards with lock/complete state
  - Badge preview carousel
  - Enrollment CTA
  - Social proof (enrollment count, completion rate)
- **Dependency:** G2.1
- **Effort:** Medium

#### G2.4 Pathway Catalog Page
- **File:** New `/src/app/components/pathways/PathwaysCatalogPage.tsx`
- **Route:** `/pathways`
- **Features:**
  - Grid of pathway cards with difficulty badge, step count, skill tags
  - Filter by difficulty, skill, topic
  - "Recommended for you" section (if user has radar data)
- **Dependency:** G2.1
- **Effort:** Medium

#### G2.5 Pathway Progress Tracking
- **Change:** When a user completes a course/program, check if it's a step in any enrolled pathway
- **File:** Extend `completion-engine.ts` from G1.2
- **Logic:**
  1. On course/program completion, query `pathway_step:*` entries matching this content
  2. For each matching pathway the user is enrolled in, mark step complete
  3. Update `pathway_enrollment` progress percentage
  4. If all required steps complete, mark pathway complete and issue pathway badge
- **Dependency:** G1.2, G2.1
- **Effort:** Medium

---

### Phase G3: Profile Separation & My Radar (weeks 5-6)
**Goal:** Separate living preferences from static profile. Build the "pull" surface.

#### G3.1 Create User Radar data layer
- **File:** Extend server with radar endpoints
- **Routes:**
  - `GET /users/:id/radar` -- get radar preferences
  - `PUT /users/:id/radar` -- update radar preferences
- **KV pattern:** `user_radar:{userId}`
- **Migration:** On first access, copy existing `interests`, `professional_roles`, `career_stage`, `looking_for` from profile into radar
- **Effort:** Medium

#### G3.2 Build My Radar page
- **File:** New `/src/app/components/radar/MyRadarPage.tsx`
- **Route:** `/my-radar`
- **Sections:**
  - Interests (chip input, add/remove)
  - Followed Topics (browse/toggle, shows content count per topic)
  - Career Stage + Professional Roles (quick select)
  - Looking For (toggle chips + details text)
  - Skill Goals (NEW: pick skills + target levels)
  - Match preview: "Based on your radar, we found X courses, Y programs, Z pathways"
- **Dependency:** G3.1
- **Effort:** Large

#### G3.3 Slim down Profile page
- **File:** Modify `/src/app/components/ProfilePage.tsx`
- **Change:** 
  - Remove Interests tab, Looking For tab
  - Replace with a "My Radar" link card: "Your interests and goals live on your Radar page →"
  - Reduce tabs from 11 to 9 (or consolidate further)
  - Keep Skills tab but add "See your skill progress on My Growth →" link
- **Dependency:** G3.2
- **Effort:** Small

#### G3.4 Dashboard Radar widget
- **File:** Modify `HomePage.tsx` or dashboard component
- **Change:** Add collapsible "My Radar" card showing current interests, topics, match count
- **Dependency:** G3.1
- **Effort:** Small

---

### Phase G4: My Growth Surface (weeks 7-8)
**Goal:** Build the unified progression visualization.

#### G4.1 User Skill Progress tracking
- **File:** Extend `completion-engine.ts`
- **Change:** When a course/program is completed:
  1. Read its `teaches_skills` metadata
  2. For each skill, update `user_skill:{userId}:{skillSlug}` 
  3. Set level to `to_level` from the course's skill mapping
  4. Append to `level_history` and `level_evidence`
- **KV pattern:** `user_skill:{userId}:{skillSlug}`
- **Dependency:** G1.4, G1.5, G1.2
- **Effort:** Medium

#### G4.2 Build My Growth page
- **File:** New `/src/app/components/growth/MyGrowthPage.tsx`
- **Route:** `/my-growth`
- **Sections:**
  1. Active Pathways (visual progress bars with step indicators)
  2. Recent Badges (earned badges with dates and evidence links)
  3. Skill Progress (horizontal bar charts with level labels)
  4. Completion History (timeline of completed courses/programs)
  5. Suggested Next (computed recommendations)
- **Sub-components:**
  - `PathwayProgressCard.tsx` -- single pathway progress visualization
  - `SkillProgressBar.tsx` -- skill level bar with history tooltip
  - `CompletionTimeline.tsx` -- chronological completion list
  - `BadgeShowcase.tsx` -- earned badges grid
- **Dependency:** G4.1, G2.5, G1.2
- **Effort:** Large

#### G4.3 Dashboard Growth widget
- **File:** Modify `HomePage.tsx` or dashboard component
- **Change:** Add "My Growth" summary card with active pathway progress, recent badges, next step
- **Dependency:** G4.2
- **Effort:** Small

#### G4.4 Update sidebar navigation
- **File:** `Sidebar.tsx`
- **Change:** 
  - Replace "My Badges" link with "My Growth" (`/my-growth`)
  - Add "My Radar" link (`/my-radar`) 
  - Group under a "Me" section: My Growth, My Radar, Profile
  - Optionally add "Pathways" under learning section alongside My Courses, My Programs
- **Dependency:** G3.2, G4.2
- **Effort:** Small

---

### Phase G5: Recommendation Engine (weeks 9-10)
**Goal:** Build the scoring function that connects radar signals to content.

#### G5.1 Recommendation scoring function
- **File:** New `/supabase/functions/server/recommendation-engine.ts`
- **Function:** `getRecommendedContent(userId): RecommendedItem[]`
- **Scoring factors:**

```
Score = (topicOverlap * 30) + (tagOverlap * 15) + (skillMatch * 25) 
      + (difficultyFit * 15) + (peerSignal * 10) + (freshness * 5)

Where:
  topicOverlap:  % of content's topics that user follows
  tagOverlap:    % of content's tags that match user interests
  skillMatch:    content teaches a skill the user has as a goal
  difficultyFit: content difficulty matches user's current level
  peerSignal:    people similar to user (same roles/stage) enrolled
  freshness:     newer content gets a small boost
```

- **Returns:** Sorted list of `{ type, id, title, score, matchReasons[] }`
- **Content types scored:** courses, programs, pathways
- **Dependency:** G3.1 (radar data), G1.5 (skill metadata on content)
- **Effort:** Large

#### G5.2 "Recommended for You" sections on catalog pages
- **Files:** `CoursesPage.tsx`, `ProgramsDiscoverPage.tsx`, `PathwaysCatalogPage.tsx`
- **Change:** Add a "Recommended for You" row above the full catalog when user is logged in
- **Shows:** Top 4-6 items from recommendation engine with match reason badges
- **Dependency:** G5.1
- **Effort:** Medium

#### G5.3 Relevance badges on content cards
- **Files:** Course cards, program cards, pathway cards
- **Change:** Show small badges like "Matches your interest: FinTech" or "Next in your pathway"
- **Dependency:** G5.1
- **Effort:** Small

#### G5.4 "What's Next" logic in My Growth
- **File:** Extend `MyGrowthPage.tsx` suggested next section
- **Logic:**
  1. If user is on a pathway with uncompleted steps, suggest next step
  2. If user has skill goals with courses that develop those skills, suggest those
  3. Fall back to general recommendations from G5.1
- **Dependency:** G5.1, G4.2
- **Effort:** Medium

---

### Phase G6: Markets Integration & Leader Nudges (weeks 11-12)
**Goal:** Connect the markets system to the discovery layer and help content leaders tag properly.

#### G6.1 Topic-link offerings
- **Files:** `CreateOfferingPage.tsx`, `EditOfferingPage.tsx`
- **Change:** Add `TopicSelector` to offering creation/edit (same pattern as courses)
- **Server:** Add `entity_type: 'offering'` support to topics-api link/unlink routes
- **Effect:** Offerings appear on `TopicDetailPage` alongside courses and programs
- **Dependency:** None (topics system already supports arbitrary entity types)
- **Effort:** Small

#### G6.2 Leader tagging nudge
- **Files:** `InstructorDashboard.tsx` / `ProgramSetupDashboard.tsx`
- **Change:** Show a completion checklist for content readiness:
  - [ ] Topics linked (at least 1)
  - [ ] Tags added (at least 2)
  - [ ] Difficulty level set
  - [ ] Skills mapped (teaches at least 1)
  - [ ] Cover image set
- **Effect:** "Your course is 60% discoverable. Add topics and skills to reach more learners."
- **Dependency:** G1.5
- **Effort:** Medium

#### G6.3 Skill-based offering recommendations
- **Change:** If a user completes a pathway that develops "leadership" skills, suggest offerings from companies seeking leaders
- **Logic:** Match user skills to offering `target_audience` + offering topics
- **Dependency:** G5.1, G6.1
- **Effort:** Medium

#### G6.4 Company → pathway connection
- **Change:** Companies can sponsor or recommend pathways
- **Data:** Add `sponsor_company_id` and `recommended_by_company_ids` to pathway entity
- **Effect:** "Recommended by [Company]" badge on pathway cards; company profile shows recommended pathways
- **Dependency:** G2.1
- **Effort:** Small

---

## Phase Dependencies Map

```
Phase G1 (Foundation)
  G1.1 Fix MyBadgesPage ──────────────────────────────→ standalone
  G1.2 Course completion → badge ─────────────────────→ G2.5, G4.1
  G1.3 Program completion → badge ────────────────────→ G2.5, G4.1
  G1.4 Skill definitions vocabulary ──────────────────→ G1.5
  G1.5 Skill metadata on courses/programs ────────────→ G4.1, G5.1, G6.2

Phase G2 (Pathways)
  G2.1 Pathway CRUD API ─────────────────────────────→ G2.2, G2.3, G2.4, G2.5
  G2.2 Pathway Builder UI ───────────────────────────→ standalone
  G2.3 Pathway Landing Page ─────────────────────────→ standalone
  G2.4 Pathway Catalog Page ─────────────────────────→ G5.2
  G2.5 Pathway Progress Tracking ────────────────────→ G4.2

Phase G3 (My Radar)
  G3.1 User Radar data layer ────────────────────────→ G3.2, G5.1
  G3.2 My Radar page ───────────────────────────────→ G3.3, G3.4
  G3.3 Slim down Profile ───────────────────────────→ standalone
  G3.4 Dashboard Radar widget ──────────────────────→ standalone

Phase G4 (My Growth)
  G4.1 Skill progress tracking ─────────────────────→ G4.2
  G4.2 My Growth page ─────────────────────────────→ G4.3, G5.4
  G4.3 Dashboard Growth widget ─────────────────────→ standalone
  G4.4 Sidebar nav update ─────────────────────────→ standalone

Phase G5 (Recommendations)
  G5.1 Scoring function ───────────────────────────→ G5.2, G5.3, G5.4
  G5.2 Catalog "Recommended" sections ─────────────→ standalone
  G5.3 Relevance badges on cards ──────────────────→ standalone
  G5.4 "What's Next" in My Growth ─────────────────→ standalone

Phase G6 (Integration)
  G6.1 Topic-link offerings ───────────────────────→ G6.3
  G6.2 Leader tagging nudge ───────────────────────→ standalone
  G6.3 Skill-based offering recs ──────────────────→ standalone
  G6.4 Company → pathway connection ───────────────→ standalone
```

---

## How This Differentiates

Most coaching/learning platforms have one of these:
- **Catalog-only** (Udemy, Coursera): Here are courses. Pick one. No guidance.
- **Path-only** (LinkedIn Learning paths): Curated lists, but no skill tracking or badges.
- **Badge-only** (Credly): Credential display, but disconnected from learning.
- **Assessment-only** (Pluralsight skill IQ): Measures skills, but doesn't connect to community.

This architecture is different because it closes the loop:

1. **Assessment feeds pathways** -- "Based on your current skills, start here"
2. **Pathways connect courses AND programs** -- structured learning + cohort experience
3. **Completion feeds skill progress** -- objective evidence, not self-reporting
4. **Skill progress feeds badges** -- visible, shareable credentials
5. **Badges feed profile** -- social proof on your public profile
6. **Profile feeds community** -- people with similar skills find each other
7. **Community feeds radar** -- seeing what others do updates your interests
8. **Radar feeds recommendations** -- the loop restarts

The key differentiator: **the platform remembers where you are and knows where you could go.** It's not just a catalog you browse -- it's a coach that tracks your growth across everything you do on the platform.

---

## Relationship to Existing Phase Plan

This Growth Engine plan (G-phases) runs **parallel** to the existing Phase 2-4 plan from the courses/programs work:

| Existing Plan | Growth Engine | Interaction |
|---------------|---------------|-------------|
| **Phase 2:** Course unenroll, progress refresh, certificates, members-only gating | **G1:** Completion engine, badge auto-issue | G1 extends Phase 2's completion work |
| **Phase 3:** Deepen experience | **G2-G4:** Pathways, My Radar, My Growth | G phases ARE the deepening |
| **Phase 4:** Convergence | **G5-G6:** Recommendations, Markets bridge | G phases complete the convergence |

The G1 items (badge fixes, completion engine, skill vocabulary) should be interleaved with Phase 2 work since they share the completion infrastructure. G2+ can proceed as Phase 3/4 work.

---

## Open Questions

1. **Pathway ownership:** Can any leader create a pathway, or is it admin-only? (Recommendation: start admin-only, open to leaders later)

2. **Skill vocabulary governance:** Who maintains the shared skill definitions? (Recommendation: admin seeds initial set, leaders can suggest additions, admin approves)

3. **Assessment format:** What does a pre/post assessment look like? Quiz? Self-assessment? Rubric? (Recommendation: start with self-assessment rating, add quizzes later)

4. **Pathway pricing:** Can a pathway have its own price, or is it free if you've purchased the individual courses/programs? (Recommendation: pathways are free enrollment; individual courses/programs may have their own pricing)

5. **Cross-platform badges:** Should we implement Open Badges 3.0 for external portability? (The schema fields exist. Recommendation: defer until core system works, then add export)

6. **Radar update frequency:** Should we prompt users to update their radar? If so, how often? (Recommendation: gentle monthly nudge on dashboard, never blocking)
