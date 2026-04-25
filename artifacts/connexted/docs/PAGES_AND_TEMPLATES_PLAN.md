# Pages and Templates Plan

Last updated: April 2026

---

## 1. What Is a Page?

A **Page** is the lightest inline content type on the platform. Unlike a Document
(which points to an external URL) or a Book (which has chapters, ordering, and an
Edge Function), a Page stores its entire body directly in the database as markdown.

Pages are designed for course and program authors who want to write content _in the
platform_ without leaving it to Google Docs, Notion, or another external tool.

### How Page compares to other content types

| Type | Storage | Structure | Best for |
|---|---|---|---|
| Document | External URL | None — points out | Google Docs, PDFs, Notion links |
| Book | DB (chapters sub-table) | Ordered chapters, TOC | Long-form reference material |
| Deck | DB (cards sub-table) | Front/back cards | Flashcards, FAQs, slide-style content |
| **Page** | **DB (single `content` field)** | **Free-form markdown** | **Lessons, briefings, reading assignments** |
| Post / Moment | DB | Single body | Social feed posts |

Pages sit between a Post (too ephemeral) and a Book (too structured). They are the
right tool for a single screen of course content — a lesson summary, an assignment
brief, a welcome note, a weekly reflection prompt.

---

## 2. What Is Already Built (v1 — April 2026)

### 2a. Database

**`public.pages` table** (`docs/migrations/add-pages-table.sql`)

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key |
| `title` | `text` | Required display title |
| `content` | `text` | Markdown body |
| `description` | `text` | Optional one-liner shown in list views |
| `template_id` | `uuid` | Reserved — nullable FK for future templates table |
| `created_by` | `uuid` | FK → `users.id` |
| `visibility` | `text` | `public` / `member` / `private` |
| `tags` | `text[]` | Free-form tags |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

RLS policies: owner full access, public pages readable by all, member pages readable
by authenticated users.

### 2b. My Pages management surface

**Route:** `/my-pages` — `src/app/pages/MyPagesPage.tsx`

| Feature | Detail |
|---|---|
| List view | Cards sorted by `updated_at`, search by title/description/tags |
| Create | Dialog with title, description, content editor, tags, PrivacySelector |
| Edit | Same dialog, pre-filled |
| Delete | AlertDialog confirmation — warns that journey references will break |
| Editor / Preview toggle | Textarea (editor) ↔ ReactMarkdown render (preview) |
| Import `.md` | File input → FileReader → opens create dialog pre-filled |
| Export `.md` | Blob download, filename derived from page title |
| Sidebar link | MY CONTENT section → My Pages (StickyNote icon) |

### 2c. Journey integration

Pages are a first-class journey item type, identical in pattern to Documents, Books,
Decks, and all other content types.

| File | Change |
|---|---|
| `src/lib/journey-item-types.ts` | `'page'` in `JourneyItemType` union + `JOURNEY_ITEM_TYPES` record |
| `src/types/journey-item-content.ts` | `PageContent { body, description?, tags? }` interface |
| `src/app/components/program/AddJourneyContentDialog.tsx` | `'page'` in `ItemType`, fetch from `pages` table, Page option in dropdown |
| `src/app/components/journey/JourneyInlineViewer.tsx` | `PageViewer` component — renders `page.content` via ReactMarkdown + remarkGfm |

**Workflow:**
1. Author creates a Page at `/my-pages`
2. In a Course or Program, author opens a Journey and clicks "Add Content"
3. Selects "Page" from the content type dropdown
4. Picks a page from their library
5. The page appears as a journey item and renders inline for learners

---

## 3. User Stories — Current v1

### Author stories

**US-01 — Quick lesson creation**
> As a course instructor, I want to write a lesson summary directly in the platform
> so that I don't have to create a Google Doc just to share three paragraphs with
> learners.

**US-02 — Assignment brief**
> As a program manager, I want to write a structured assignment brief — with
> objectives, instructions, and a submission checklist — and attach it to a
> specific week in a journey so learners always find it in context.

**US-03 — Reuse across journeys**
> As a cohort facilitator, I want to write a "Community Guidelines" page once and
> add it to the first journey of every cohort I run, without duplicating the content.

**US-04 — Import from existing files**
> As an instructor migrating from another platform, I want to upload `.md` files I
> already have so I don't have to retype content I've already written.

**US-05 — Export for backup**
> As a content creator, I want to export any page as a `.md` file so I can keep
> a local backup or share it outside the platform.

### Learner stories

**US-06 — Read lesson inline**
> As a learner, I want to read a lesson page without leaving the program view so
> my progress context stays intact.

**US-07 — Scan and navigate**
> As a learner, I want headings and bullet lists to render properly so I can skim
> a page and jump to the section I need.

---

## 4. Page Type Examples — Courses and Programs

These are illustrative examples of how Pages are used in practice. Each is a
distinct _use case_ — not a technical template type, just a common pattern authors
reach for.

### 4a. Welcome / Orientation

**Purpose:** First item in a program or course. Sets expectations, introduces the
instructor, and explains how the program works.

```markdown
# Welcome to [Program Name]

Hi, I'm [Instructor Name], and I'm glad you're here.

Over the next 8 weeks we'll cover:
- Topic A
- Topic B
- Topic C

## How this program works
Each week has a journey with readings, a check-in activity, and a discussion prompt.
Aim to spend about 3 hours per week.

## Getting help
Post questions in the **#questions** circle. I check in every Tuesday and Thursday.
```

### 4b. Lesson / Reading

**Purpose:** Delivers the core instructional content for a module. Replaces a
Google Doc or PDF for short-to-medium lessons.

```markdown
# Lesson 3 — Understanding Engagement Metrics

## What is an engagement metric?
An engagement metric measures how actively your audience interacts with content...

## The three metrics that matter most
1. **Time on page** — how long someone reads
2. **Scroll depth** — how far they get
3. **Return visits** — whether they come back

## Key takeaway
Vanity metrics (views, impressions) don't predict outcomes. Focus on depth, not breadth.
```

### 4c. Assignment Brief

**Purpose:** Tells learners exactly what to do, by when, and how it will be evaluated.

```markdown
# Week 4 Assignment — Customer Interview

## Objective
Conduct one 30-minute interview with a potential customer for your product idea.

## Instructions
1. Choose someone who fits your target profile
2. Use the JTBD framework from Lesson 3
3. Record notes using the template below
4. Submit a 300-word reflection in the Week 4 discussion

## Template
| Question | Their answer |
|---|---|
| What were you trying to do when you first looked for a solution? | |
| What alternatives did you try? | |
| What frustrated you about those alternatives? | |

## Due date
Submit by Sunday 11:59 pm (end of Week 4).

## Evaluation
Pass/fail. Pass = submitted on time with substantive notes.
```

### 4d. Reflection Prompt

**Purpose:** Prompts learners to pause and process what they've learned before
moving on.

```markdown
# Week 2 Reflection

Before you move to Week 3, take 10 minutes to answer these questions in your journal
or in a note.

1. What was the most surprising thing you learned this week?
2. What concept do you still feel uncertain about?
3. How does this week's topic connect to a challenge you're facing right now?

There's no submission required — this is for you. But if something comes up that
you'd like to share, bring it to the live session on Thursday.
```

### 4e. Resource Guide / Further Reading

**Purpose:** Curated links and annotations for learners who want to go deeper.

```markdown
# Further Reading — Growth Strategy

These aren't required, but they're the best stuff on this topic.

## Books
- **The Cold Start Problem** — Andrew Chen. Best account of network effects I've read.
- **Continuous Discovery Habits** — Teresa Torres. Practical and tactical.

## Articles
- [The Hierarchy of Engagement](https://medium.com/...) — Sarah Tavel, Benchmark
- [Finding Product-Market Fit](https://a16z.com/...) — Marc Andreessen original essay

## Podcasts
- *Lenny's Podcast* — Episode with Brian Chesky on rebuilding Airbnb post-COVID

## What to look for
When you read these, pay attention to how each author defines "retention" differently.
That tension is worth understanding before Week 5.
```

### 4f. Weekly Update / Announcements

**Purpose:** Keeps a cohort informed about schedule changes, guest speakers,
upcoming deadlines, or context from the facilitator.

```markdown
# Week 5 Update — April 28

Hey everyone,

A few things before we kick off Week 5:

## Guest speaker Thursday
[Name], Head of Product at [Company], joins us at 6pm. Come with questions about
career pivots into product.

## Assignment reminder
Week 4 assignments are due Sunday. If you haven't submitted, DM me — we can
work something out.

## Reminder about the live session format
We're switching to a fishbowl format this week. Four people discuss; everyone else
observes. Rotating every 15 minutes.

See you Thursday,
[Facilitator Name]
```

### 4g. FAQ / Common Questions

**Purpose:** Answers recurring questions before they're asked. Reduces repeated
support messages.

```markdown
# Frequently Asked Questions

## Am I behind if I haven't finished Week 2?
No. The program is self-paced. The weekly structure is a suggested rhythm, not a
hard deadline (except for the live sessions).

## Can I get a certificate?
Yes. Complete all six assignments and attend at least three live sessions to earn
your completion certificate.

## I'm stuck on the assignment. What should I do?
1. Check if someone already asked in #questions
2. Post your specific blocker (not just "I'm stuck")
3. DM [facilitator] if it's time-sensitive

## Can I share content from this program?
The lessons are for your personal use. Please don't redistribute the materials.
The concepts are yours to apply and share in your own words.
```

### 4h. Module Overview / Syllabus Snapshot

**Purpose:** Gives learners a map of what's coming in a module or week before
they dive in.

```markdown
# Module 2 — Validating Your Idea (Weeks 3–5)

## What this module covers
By the end of Module 2 you will be able to:
- Run a customer interview using the JTBD framework
- Identify signals that distinguish real pain from polite feedback
- Make a go/no-go decision on a product idea with confidence

## Journey overview

| Week | Focus | Key activity |
|---|---|---|
| Week 3 | Why most validation fails | Lesson + reflection prompt |
| Week 4 | Customer interview skills | Interview assignment |
| Week 5 | Synthesising what you heard | Synthesis workshop (live) |

## What you'll need
- 30 minutes for each lesson
- One real human to interview in Week 4
- Access to the live session on Week 5 Thursday (recording available)
```

---

## 5. Future Development

### Phase 2 — Markdown Scaffolds (Templates as Pre-fill)

**What changes:** A `page_templates` table stores named markdown scaffold strings.
At creation time, the author picks a template and the editor opens pre-filled with
the scaffold. They edit it into their specific content.

This is the simplest possible template model — no enforcement, no schema, just
a starting point. The author can delete everything and start fresh.

**Database:**
```sql
CREATE TABLE public.page_templates (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text    NOT NULL,
  description  text,
  category     text,   -- 'lesson' | 'assignment' | 'reflection' | 'announcement' | etc.
  scaffold     text    NOT NULL,   -- the pre-fill markdown
  is_system    boolean NOT NULL DEFAULT false,  -- platform defaults vs. user-created
  created_by   uuid    REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

**UI change:** Add a "Start from template" step before the editor opens. Shows a
grid of template cards by category. Selecting one pre-fills `content`. Skipping
opens a blank editor.

**System templates to ship at launch:**
- Lesson / Reading (headings + bullet structure)
- Assignment Brief (objective, instructions, due date, evaluation)
- Reflection Prompt (3 open questions)
- Resource Guide (books, articles, podcasts sections)
- Weekly Update / Announcement (what's happening, reminders)
- FAQ (question + answer pairs)
- Module Overview / Syllabus Snapshot (table of contents)
- Welcome / Orientation (intro, how it works, getting help)

**Estimated effort:** 2 days (table + template picker UI + 8 system scaffolds)

---

### Phase 3 — AI-Assisted Generation

**What changes:** On the "New Page" flow, the author can optionally provide a
prompt. The platform sends a system prompt (constructed from the chosen template
category) + the author's prompt to the Claude API and streams the generated
markdown into the editor. The author reviews and edits before saving.

AI generation is **creation-time only** — it drafts the initial content. The
author always owns the final version. There is no "regenerate" button on an
existing page (that would risk overwriting work).

**How the system prompt is constructed:**

```typescript
const SYSTEM_PROMPTS: Record<string, string> = {
  lesson: `You are a course author writing a lesson page in markdown. 
    Write clear, direct instructional content with headings, numbered 
    steps where appropriate, and a key takeaway at the end. 
    Avoid padding. Target reading time: 5–8 minutes.`,

  assignment: `You are a course author writing an assignment brief in markdown.
    Include: objective, step-by-step instructions, any templates or 
    frameworks needed, submission format, and evaluation criteria.
    Be specific. Ambiguity in assignments creates support load.`,

  reflection: `You are a course facilitator writing a reflection prompt in markdown.
    Write 3–5 open-ended questions that help learners process and 
    connect this week's content to their real situation.
    Questions should be specific enough to be answerable but open 
    enough to generate varied responses.`,

  faq: `You are a course author writing an FAQ page in markdown.
    Each question should be written from the learner's perspective.
    Answers should be direct and scannable. Use a table of contents 
    at the top if there are more than 5 questions.`,
};
```

**UI change:** Below the template picker, an optional "Describe what this page
should cover" textarea. If filled in, a "Generate draft" button appears. On click,
streams the AI response into the content editor. The author can then edit freely.

**Estimated effort:** 2–3 days (API route or Edge Function for streaming + UI)

---

### Phase 4 — Section Schema (Structured Pages)

**What changes:** Instead of free-form markdown, some templates define a _section
schema_ — a typed list of fields (heading, body, URL, checklist, etc.) stored as
JSON. The editor becomes a form rather than a textarea. On render, the JSON is
transformed to a styled layout rather than plain markdown.

This model absorbs several content types that don't fit free-form markdown well:

| Content need | Section schema approach |
|---|---|
| Assignment with a grading rubric | Rubric rows as typed fields, not a markdown table |
| FAQ | `{ question: string, answer: string }[]` — enforces the format |
| Resource guide | `{ title, url, annotation }[]` — validates URLs, renders cards |
| Reflection prompt | Numbered question list — rendered as a fill-in form for learners |

**Database addition:**
```sql
CREATE TABLE public.page_template_schemas (
  template_id  uuid  REFERENCES public.page_templates(id) ON DELETE CASCADE,
  schema       jsonb NOT NULL  -- field definitions
);
```

**Schema example (Assignment Brief):**
```json
[
  { "key": "objective",    "label": "Learning objective",   "type": "text",      "required": true },
  { "key": "instructions", "label": "Step-by-step instructions", "type": "markdown", "required": true },
  { "key": "template",     "label": "Learner template",     "type": "markdown",  "required": false },
  { "key": "due_date",     "label": "Due date",             "type": "date",      "required": false },
  { "key": "evaluation",   "label": "Evaluation criteria",  "type": "text",      "required": true }
]
```

**Page content storage** for schema-driven pages:
The `pages.content` field stores the JSON object keyed by schema field keys.
The renderer reads the schema to decide how to display each field.

**Estimated effort:** 4–5 days (schema editor, JSON content storage, typed renderer)

---

### Phase 5 — Learner-Facing Enhancements

These changes make pages more useful for the _learner_ experience (not just the
author experience).

#### 5a. Completion tracking

Mark a page as "read" — stores a `page_completions` row per user. Journey progress
rolls up completion of all items including pages. Currently no journey item type
tracks individual completion.

```sql
CREATE TABLE public.page_completions (
  page_id     uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);
```

#### 5b. Estimated reading time

Calculate from `content` word count at save time (`words / 200 = minutes`). Store
in a `reading_time_minutes` column on `pages`. Display alongside the page in the
journey viewer ("~4 min read").

#### 5c. Page detail route

A dedicated full-screen reading view at `/pages/:id` with proper typography,
table of contents sidebar (auto-generated from `##` headings), and a "Mark as
read" button.

Currently the only render surface is the inline journey viewer. A standalone route
would let authors share a page URL directly and let learners return to it outside
the journey context.

#### 5d. Annotation / highlights (long term)

Learners can highlight a passage and add a private note. Notes stored in a
`page_annotations` table. Visible only to the learner who created them.

---

### Phase 6 — Sharing and Discoverability

#### 6a. Public page URLs

Pages with `visibility = 'public'` get a canonical URL that works without login.
This makes Pages usable as a lightweight CMS for marketing or community content,
not just course material.

#### 6b. Embed in Circles

A Page can be pinned to a Circle's resource tab — same mechanism as the existing
document pinning, just pointing to a `pages` row instead of a `documents` row.

#### 6c. Page collections / content packs

A named set of Pages (and optionally other content types) that can be imported
into a program as a starting point. Built on top of the Phase 2 template system.
A "New Instructor Starter Pack" would be a collection: Welcome page, FAQ page,
Week 1 Lesson page, Week 1 Assignment page — all scaffolded.

---

## 6. Development Roadmap Summary

| Phase | Feature | Effort | Status |
|---|---|---|---|
| v1 | Pages table + CRUD at `/my-pages` | 2 days | ✅ Done |
| v1 | Journey integration (add + inline render) | 1 day | ✅ Done |
| v1 | Markdown import / export | < 1 day | ✅ Done |
| v2 | Page templates table + scaffold picker | 2 days | ❌ Not started |
| v2 | System template library (8 types) | 1 day | ❌ Not started |
| v3 | AI draft generation (Claude API) | 2–3 days | ❌ Not started |
| v4 | Section schema + typed field editor | 4–5 days | ❌ Not started |
| v5 | Completion tracking + reading time | 1 day | ❌ Not started |
| v5 | Full-screen page detail route `/pages/:id` | 1 day | ❌ Not started |
| v6 | Public page URLs | 1 day | ❌ Not started |
| v6 | Embed in Circles | 1 day | ❌ Not started |

**Recommended next step:** v2 (template scaffolds). Low risk, high author value,
no schema changes to the pages table (only adds a `page_templates` table and a
template picker step in the create flow).

---

## 7. Design Principles to Preserve

**Pages store content, not links.** If the author needs to point to an external
resource, that's a Document. A Page is for content the platform owns.

**Free-form first.** The v1 editor is a textarea. No enforced structure. Authors
who want structure impose it themselves via markdown headings. Phase 4 schema
enforcement is opt-in per template — it should never be required for free-form
pages.

**Separation of creation and placement.** Creating a Page (at `/my-pages`) and
adding it to a Journey (via `AddJourneyContentDialog`) are independent actions.
This means the same Page can appear in multiple Journeys, and Pages can be
authored before a Journey structure exists.

**AI generates drafts, humans own the content.** AI generation (Phase 3) fills
the editor. The author saves. There is no "apply AI to existing page" feature
that could silently overwrite work.

**Template scaffolds do not enforce.** A scaffold is a starting point, not a
constraint. The author can delete every line and write something completely
different. Enforcement is only introduced in Phase 4 (section schema) and only
for templates that opt in.

---

## 8. Related Documents

| Topic | Document |
|---|---|
| Overall user content plan and sprint status | `USER_CONTENT_PLAN.md` |
| Interactive content types (polls, assignments, etc.) | `INTERACTIVE_CONTENT_TYPES_PLAN.md` |
| Books — chapters, episodes, shelf collections | `BOOKS_FUTURE_DEVELOPMENT.md` |
| Lists — kanban, schedules, templates | `LISTS_FUTURE_DEVELOPMENT.md` |
| Visibility states and access control | `VISIBILITY_AND_ACCESS_MODEL.md` |
| Content expiration and renewal system | `EXPIRE_AND_RENEW_PLAN.md` |
