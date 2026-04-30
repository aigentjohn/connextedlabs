# Template System — Development Plan

## Goal

Give users a consistent **Create from Scratch / Create from Template** choice across all major content and container types. Where a category or type already exists (or should exist), templates are scoped to that type so the user gets a relevant starting point.

---

## UX Pattern (consistent across all types)

When a user clicks "New [Type]", they see a two-option modal or inline card picker:

```
┌──────────────────────────┐  ┌──────────────────────────┐
│  📄 Start from Scratch   │  │  📋 Use a Template        │
│  Blank [type], fill in   │  │  Pick a pre-filled        │
│  your own details.       │  │  template to get started. │
└──────────────────────────┘  └──────────────────────────┘
```

- **Scratch** → existing create form unchanged
- **Template** → filtered list of `is_template = true` rows for that type; optionally filtered by category
- On "Use", all fields are copied to a new instance with `is_template = false`
- The source template is never modified

This is already fully implemented for **Checklists** (`ChecklistDetailPage.tsx` lines 280–323) — that is the reference implementation for all other types.

---

## DB Schema Pattern (same for every type)

```sql
ALTER TABLE public.<table> ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_<table>_is_template ON <table>(is_template);
```

No separate template table needed. Templates live alongside instances.

---

## Content Types

---

### 1. Documents

**Current create fields:** Title, Description, Document URL, Privacy (personal/shared), Visibility, Circles, Tables, Tags

**Proposed category field:** `document_type` — added to create form as a dropdown

| Category | Template pre-fills |
|----------|--------------------|
| `meeting-notes` | Title: "Meeting Notes — [Date]", Description with Agenda / Decisions / Actions sections |
| `project-brief` | Title: "Project Brief — [Name]", Description with Objective / Scope / Stakeholders / Timeline |
| `sop` | Title: "SOP — [Process Name]", Description with Purpose / Steps / Owner |
| `proposal` | Title: "Proposal — [Topic]", Description with Summary / Problem / Solution / Ask |
| `report` | Title: "Report — [Topic]", Description with Executive Summary / Findings / Recommendations |
| `newsletter` | Title: "Update — [Month]", Description with Highlights / What's Next / Links |

**Schema changes:**
```sql
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_documents_is_template ON documents(is_template);
```

---

### 2. Pages (My Pages)

**Current create fields:** Title, Content (markdown editor)

**Proposed category field:** `page_type`

| Category | Template pre-fills |
|----------|--------------------|
| `blog-post` | Title: "Post — [Topic]", Content: `# Title\n\n## Introduction\n\n## Main Content\n\n## Takeaways` |
| `announcement` | Title: "Announcement — [Subject]", Content: `## What's Happening\n\n## Why It Matters\n\n## Next Steps` |
| `resource-page` | Title: "Resources — [Topic]", Content: `## Overview\n\n## Key Links\n\n## How to Use` |
| `long-form-article` | Title: "Article — [Topic]", Content with H2 section skeleton |
| `newsletter` | Title: "Newsletter — [Month]", Content: `## This Month\n\n## Featured Member\n\n## Upcoming Events\n\n## Resources` |

**Schema changes:**
```sql
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS page_type text;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_pages_is_template ON pages(is_template);
```

---

### 3. Books

**Category already exists in settings:** `guide | tutorial | handbook | documentation | reference | workbook | other`

Move category selection to the **create form** so templates can be filtered by it.

| Category | Template pre-fills |
|----------|--------------------|
| `guide` | Title: "Guide to [Topic]", Description: "Step-by-step guide covering..." |
| `tutorial` | Title: "[Topic] Tutorial", Description: "Follow along to learn..." — suggests chapter structure: Intro / Setup / Core Steps / Summary |
| `handbook` | Title: "[Team/Role] Handbook", Description: "Everything you need to know about..." |
| `documentation` | Title: "[Product/Feature] Docs", Description: "Reference documentation for..." |
| `reference` | Title: "[Topic] Reference", Description: "Quick reference for..." |
| `workbook` | Title: "[Topic] Workbook", Description: "Exercises and activities for..." |

**Schema changes:** `is_template` column already exists. Only need to surface category on the create form.

---

### 4. Decks

**Current create fields:** Title, Description, Visibility, Tags

**Proposed category field:** `deck_type`

| Category | Template pre-fills |
|----------|--------------------|
| `pitch-deck` | Title: "[Company] Pitch Deck", Description: "Investor presentation covering Problem / Solution / Market / Team / Ask" |
| `presentation` | Title: "[Topic] Presentation", Description: "Slides for [audience] covering [topic]" |
| `training` | Title: "[Topic] Training", Description: "Training deck for [role/topic] — includes objectives, content, exercises" |
| `report` | Title: "[Topic] Report", Description: "Data and analysis report for [period/topic]" |
| `workshop` | Title: "[Topic] Workshop", Description: "Interactive workshop deck — includes agenda, activities, takeaways" |

**Schema changes:**
```sql
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS deck_type text;
-- is_template column already exists
```

---

### 5. Checklists (Lists)

**Already fully implemented.** Category is a free-form text field.

**Suggested standard category values** (shown as suggestions in the input):

| Category | Template pre-fills |
|----------|--------------------|
| `onboarding` | Items: Welcome / Profile setup / Join circles / First post / Meet your cohort |
| `project-launch` | Items: Define scope / Assign roles / Set milestones / Create comms channel / Kick-off meeting |
| `event-planning` | Items: Set date & venue / Create agenda / Send invites / Confirm speakers / Send reminders / Debrief |
| `sprint` | Items: Define goals / Assign tasks / Daily standup / Mid-sprint check / Retro |
| `review-process` | Items: Self-assessment / Peer review / Manager review / Goal-setting / Sign-off |

**No schema changes needed.** Just add suggested categories to the create form UI.

---

### 6. Builds

**Current create fields:** Name, Description, Visibility, Tags

**Proposed category field:** `build_type`

| Category | Template pre-fills |
|----------|--------------------|
| `product` | Name: "[Product Name] Build", Description: "Building [product] — tracking progress, decisions, and resources" |
| `project` | Name: "[Project Name]", Description: "Project workspace for [goal] — team, timeline, and deliverables" |
| `research` | Name: "[Topic] Research", Description: "Research initiative exploring [question/topic]" |
| `campaign` | Name: "[Campaign Name]", Description: "Campaign workspace — brief, assets, timeline, and results" |
| `initiative` | Name: "[Initiative Name]", Description: "Strategic initiative covering [objective]" |

**Schema changes:**
```sql
ALTER TABLE public.builds ADD COLUMN IF NOT EXISTS build_type text;
ALTER TABLE public.builds ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_builds_is_template ON builds(is_template);
```

---

### 7. Pitches

**Current create fields:** Name, Short Description, Full Description, Cover Image, Video URL, Pitch URL, Visibility, Tags, Sponsor

**Proposed category field:** `pitch_type`

| Category | Template pre-fills |
|----------|--------------------|
| `investor` | Name: "[Company] — Investor Pitch", Short Desc: "Raising [amount] to [goal]", Full Desc skeleton: Problem / Solution / Market / Traction / Team / Ask |
| `partnership` | Name: "[Company] Partnership Pitch", Short Desc: "Proposing a partnership to [goal]", Full Desc skeleton: About Us / Opportunity / What We're Offering / What We Need |
| `product-demo` | Name: "[Product] Demo", Short Desc: "See [product] in action", Full Desc: Overview / Key Features / Use Cases / Get Started |
| `job-role` | Name: "[Role] at [Company]", Short Desc: "We're hiring a [role]", Full Desc: About the Role / Responsibilities / What We're Looking For / Why Join Us |
| `idea` | Name: "[Idea Name]", Short Desc: "Early-stage idea for [topic]", Full Desc: The Idea / Problem / Vision / Help Needed |

**Schema changes:**
```sql
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS pitch_type text;
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_pitches_is_template ON pitches(is_template);
```

---

### 8. Tables (Resource Libraries)

**Current create fields:** Name, Description, Cover Image, Visibility, Tags, Sponsor

**Proposed category field:** `table_type`

| Category | Template pre-fills |
|----------|--------------------|
| `resource-library` | Name: "[Topic] Resources", Description: "Curated library of resources for [topic/audience]" |
| `knowledge-base` | Name: "[Topic] Knowledge Base", Description: "Reference knowledge base for [team/topic]" |
| `team-hub` | Name: "[Team] Hub", Description: "Central resource hub for the [team] team — links, docs, and tools" |
| `project-hub` | Name: "[Project] Hub", Description: "Everything you need for [project] — references, assets, and links" |
| `directory` | Name: "[Topic] Directory", Description: "Directory of [type of resource] for [audience]" |

**Schema changes:**
```sql
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS table_type text;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_tables_is_template ON tables(is_template);
```

---

### 9. Elevators (Networking Hubs)

**Current create fields:** Name, Description, Cover Image, Visibility, Tags, Sponsor

**Proposed category field:** `elevator_type`

| Category | Template pre-fills |
|----------|--------------------|
| `networking` | Name: "[Topic] Networking Hub", Description: "Connect with others around [topic/interest]" |
| `community-directory` | Name: "[Community] Directory", Description: "Find and connect with [community] members" |
| `partner-network` | Name: "[Industry/Topic] Partners", Description: "Network of partners and collaborators in [space]" |
| `alumni` | Name: "[Program/Org] Alumni", Description: "Stay connected with fellow [program/org] alumni" |

**Schema changes:**
```sql
ALTER TABLE public.elevators ADD COLUMN IF NOT EXISTS elevator_type text;
ALTER TABLE public.elevators ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_elevators_is_template ON elevators(is_template);
```

---

### 10. Standups

**Current create fields:** Name, Description, Custom Question, Visibility, Cover Image, Tags

**Proposed category field:** `standup_type`

| Category | Template pre-fills |
|----------|--------------------|
| `daily` | Name: "[Team] Daily Standup", Description: "Daily async check-in for the [team] team", Custom Question: "What did you accomplish yesterday, what's your focus today, any blockers?" |
| `weekly` | Name: "[Team] Weekly Check-in", Description: "Weekly async update for [team]", Custom Question: "What's your highlight from last week and your priority for this week?" |
| `sprint-review` | Name: "[Sprint] Review", Description: "Sprint review standup for [project/team]", Custom Question: "What did you complete this sprint, what didn't get done, and what's the plan for next sprint?" |
| `accountability` | Name: "[Goal/Topic] Accountability", Description: "Accountability check-in for [goal or cohort]", Custom Question: "What did you commit to last time? Did you do it? What's your commitment for next time?" |

**Schema changes:**
```sql
ALTER TABLE public.standups ADD COLUMN IF NOT EXISTS standup_type text;
ALTER TABLE public.standups ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_standups_is_template ON standups(is_template);
```

---

### 11. Meetups

**Current create fields:** Name, Description, Visibility, Cover Image, Tags

**Proposed category field:** `meetup_type`

| Category | Template pre-fills |
|----------|--------------------|
| `social` | Name: "[Community] Social", Description: "Casual gathering for [community] members — come as you are" |
| `workshop` | Name: "[Topic] Workshop", Description: "Hands-on workshop for [topic] — bring your questions and ideas" |
| `networking` | Name: "[Topic] Networking", Description: "Structured networking event for [topic/audience]" |
| `qa-session` | Name: "Q&A with [Person/Topic]", Description: "Open Q&A session — submit your questions in advance" |
| `study-group` | Name: "[Topic] Study Group", Description: "Collaborative study session for [topic] — come prepared to discuss" |

**Schema changes:**
```sql
ALTER TABLE public.meetups ADD COLUMN IF NOT EXISTS meetup_type text;
ALTER TABLE public.meetups ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_meetups_is_template ON meetups(is_template);
```

---

### 12. Events

**Current create fields:** Name, Notes, Event selection (links to an existing event)

Events have a different lifecycle (tied to a scheduled calendar event) so a full template system is a lower priority. A lightweight approach:

| Category | Template pre-fills |
|----------|--------------------|
| `workshop` | Name: "Workshop — [Topic]", Notes skeleton: Objectives / Agenda / Materials / Follow-up |
| `webinar` | Name: "Webinar — [Topic]", Notes skeleton: Host / Topic / Key Points / Resources |
| `roundtable` | Name: "Roundtable — [Topic]", Notes skeleton: Discussion questions / Participants / Key takeaways |
| `social` | Name: "Social — [Occasion]", Notes: Casual format, no prep required |

**Schema changes:** Lower priority — evaluate after higher-value types above are done.

---

## Implementation Priority

| Priority | Type | Reason |
|----------|------|--------|
| 1 | **Documents** | High frequency, clear template value, no schema exists yet |
| 2 | **Books** | Category already in DB, just needs create-form surfacing + template UX |
| 3 | **Pages** | Markdown editor — templates with content skeletons are very useful |
| 4 | **Standups** | Custom question is the killer template field |
| 5 | **Pitches** | Full description skeleton varies heavily by type |
| 6 | **Builds** | Useful once community scale grows |
| 7 | **Checklists** | Already implemented — just add suggested categories to UI |
| 8 | **Tables / Elevators / Meetups** | Lower differentiation between types |
| 9 | **Decks** | Lower frequency |
| 10 | **Events** | Different lifecycle, lower ROI |

---

## Implementation Steps (per type)

1. **Migration** — add `is_template` and `*_type` columns (show SQL, apply in Supabase)
2. **Create form** — add type dropdown; add Scratch / Template toggle
3. **Template browser** — filter `is_template = true` by type; show cards with name + description
4. **Use template action** — copy all fields to new instance, set `is_template: false`, navigate
5. **Mark as template** — allow any existing instance to be saved as a template (settings/detail page)
6. **Platform admin** — seed 1–2 starter templates per type/category so the picker isn't empty on a fresh install
