# Interactive Content Types — Development Plan

**Date:** April 2026
**Status:** Phase 1 shipped (Poll, Reflection, Assignment, FAQ, Schedule Picker — April 2026). Phase 2 (Ranking, Cohort Intro, Peer Review, Office Hours) planned.
**Scope:** New interactive content types for Courses and Programs (journeys/cohorts)

---

## Background

The current survey system (`surveys` table, `survey_type = survey | quiz | assessment`) covers
structured multi-question forms. A separate family of lighter, more interactive content types
was discussed for use inside courses and cohort programs — types where members participate
and can see aggregated responses in real time.

These types are distinct from surveys in that they are designed to be:
- **Quick** — one question or a short interaction, not a long form
- **Social** — participants can see how others responded
- **Contextual** — embedded inside a journey step, not a standalone page

---

## 1. Poll

**What it is:** A single question with multiple choice answers. Any member in the
course or cohort can vote once. Results (vote counts and percentages per option) are
visible to all members after voting.

**How it differs from Survey:** A survey is a multi-question private form. A poll is
one question, social, and shows live results.

**Data model (proposed):**
- Reuse `surveys` table with `survey_type = 'poll'`
- Single question enforced at the UI level
- Results shown immediately on submission (no waiting for admin to close)
- Add `show_results_before_vote: boolean` flag for anonymous benchmarking use case

**UI:**
- Card with question + radio buttons
- After voting: bar chart showing % per option + vote count
- Admin view: same card + option to close voting

---

## 2. Ranking

**What it is:** A list of options (items, ideas, priorities) that each respondent
drag-reorders from most to least preferred. Aggregated results show the community's
consensus ranking.

**How it differs from Poll:** Poll picks one winner. Ranking orders all options.

**Data model (proposed):**
- New `question_type = 'ranking'` added to the survey question types
- Each response stores an ordered array of option IDs
- Aggregation: compute average rank position per option across all responses

**UI:**
- Drag-and-drop list of options (respondent view)
- After submitting: each option shows its average rank position + a reordered list
  reflecting community consensus
- Admin view: full breakdown + ability to export

---

## 3. FAQ (Frequently Asked Questions)

**What it is:** Admin-created question + answer pairs, displayed as an expandable
accordion. Members can browse and search. Optionally members can submit questions
for the admin to answer.

**How it differs from Discussion:** Discussion is open-ended threaded conversation.
FAQ is curated — admin controls both questions and answers.

**Data model (proposed):**
- New `faqs` table: `id, title (question), body (answer), context_type (course|program),
  context_id, order_index, tags, visibility, created_by, created_at`
- Optionally: `faq_questions` table for member-submitted questions awaiting admin answer

**UI:**
- Accordion list: question headline → expands to show answer
- Search/filter by tag
- Admin: inline add/edit/reorder questions
- Member: read + optional "Submit a question" button

**Note:** Currently `deck` type is loosely described as covering FAQs, but decks are
slide/flashcard format and not a natural fit for Q&A. FAQs warrant a dedicated type.

---

## 4. Schedule Picker (Doodle-style)

**What it is:** Admin proposes a set of time slots (or locations). Members mark which
slots they are available for. Admin sees which slot has the most availability and can
confirm one. Similar to Doodle or When2meet.

**Use cases:**
- "Pick the best time for our cohort kickoff call"
- "Which city works best for our in-person retreat?"
- "Which week works for our peer review session?"

**Data model (proposed):**
- New `schedule_polls` table: `id, title, description, context_type, context_id,
  closes_at, confirmed_slot_id, created_by`
- New `schedule_slots` table: `id, schedule_poll_id, label (e.g. "Tue May 6 at 2pm EST"),
  order_index`
- New `schedule_responses` table: `id, schedule_poll_id, slot_id, user_id, available: boolean`

**UI:**
- Grid: rows = members, columns = time slots, cells = available / unavailable
- Summary row showing availability count per slot
- Admin: confirm a slot → notifies all members
- Confirmed slot promotes to a Session (see Sessions architecture doc)

---

## 5. Assignment

**What it is:** A structured submission task. Admin defines a prompt and optional
rubric. Members submit text, a link, or an uploaded file. Admin (or peers) review and
optionally score/provide feedback.

**Use cases:**
- "Submit your business model canvas"
- "Record a 2-minute pitch and paste the link"
- "Write your week 3 reflection and submit"

**Data model (proposed):**
- New `assignments` table: `id, title, description, rubric, context_type, context_id,
  due_at, allow_late: boolean, submission_type (text|link|file), created_by`
- New `assignment_submissions` table: `id, assignment_id, user_id, content (text|link),
  file_url, submitted_at, score, feedback, reviewed_by, reviewed_at`

**UI:**
- Member: assignment card with due date + text/link/file submission form
- After submission: confirmation, shows submitted content
- Admin: list of submissions, inline feedback + optional score field
- Journey item type: `assignment`

---

## 6. Reflection

**What it is:** A guided journaling prompt. Members write a private response visible
only to themselves (and optionally the admin). Not a form, not a discussion — a
personal record tied to a journey step.

**Use cases:**
- "What is your biggest insight from week 1?"
- "What will you commit to doing differently?"
- "How confident do you feel about your pitch? (1–10) Why?"

**Data model (proposed):**
- New `reflections` table: `id, title, prompt, context_type, context_id, created_by`
- New `reflection_responses` table: `id, reflection_id, user_id, content, created_at,
  updated_at, shared_with_admin: boolean`

**UI:**
- Member: prompt card + rich text editor, Save/Update button
- Previous response pre-filled if returning
- Admin: opt-in view of responses (only if `shared_with_admin = true`)
- Journey item type: `reflection`

---

## 7. Peer Review

**What it is:** Members review each other's assignment submissions using a structured
rubric. Admin assigns reviewer pairs or uses random assignment.

**Use cases:**
- "Review two classmates' pitch decks using the provided rubric"
- "Give structured feedback on a peer's business plan"

**Data model (proposed):**
- Extends `assignment_submissions` — adds `peer_reviews` table:
  `id, submission_id, reviewer_id, scores (jsonb), feedback, submitted_at`
- `peer_review_assignments` table: `id, assignment_id, reviewer_id, reviewee_id`

**UI:**
- Member: "You have 2 peer reviews to complete" card
- Rubric-based scoring form per criterion
- After submitting: can see reviews received on own submission
- Admin: overview of review completion rates

---

## 8. Cohort Introduction

**What it is:** A structured "introduce yourself" prompt shown to new cohort members.
Responses are visible to all cohort members as a member directory card.

**Use cases:**
- "Tell us your name, background, and what you're hoping to get from this program"
- Onboarding step shown on first program login

**Data model (proposed):**
- Could reuse `reflection_responses` with `shared_with_admin = false` and
  `visible_to_cohort = true`
- Or a dedicated `introductions` table per program/course

**UI:**
- Prompted on first visit to the program
- Cohort member grid: card per member showing their intro
- Journey item type: `introduction`

---

## 9. Office Hours Booking

**What it is:** Instructor/facilitator publishes available time slots. Members book
one slot. Confirmation sent to both parties.

**Data model (proposed):**
- New `office_hours` table: `id, host_id, context_type, context_id, slot_duration_minutes`
- New `office_hours_slots` table: `id, office_hours_id, starts_at, booked_by, booked_at`

**UI:**
- Host: add available slots (calendar-style or list)
- Member: pick an open slot → confirmed
- Both: see upcoming booking with join link field
- Journey item type: `office_hours`

---

## Relationship to Existing Types

| New Type | Closest Existing | Why Separate |
|---|---|---|
| Poll | Survey | Single question, live public results |
| Ranking | Survey | Drag-reorder interaction, aggregate rank output |
| FAQ | Deck | Q&A format, admin curated, searchable |
| Schedule Picker | Session | Precedes a session — used to find the time |
| Assignment | Checklist | Submission + review workflow, not just completion |
| Reflection | Document | Private, prompt-driven, personal record |
| Peer Review | — | Requires pairing + rubric, extends assignment |
| Cohort Intro | Profile | Cohort-scoped, prompted, visible to group |
| Office Hours | Session | Booking flow, 1:1, slot-based |

---

## Implementation Priority (Suggested)

| Priority | Type | Reason |
|---|---|---|
| 1 | **Poll** | Simplest — reuses surveys table, high engagement value |
| 2 | **FAQ** | High value for courses, straightforward CRUD |
| 3 | **Schedule Picker** | Directly feeds into Session creation workflow |
| 4 | **Assignment** | Core to cohort programs, needed for accountability |
| 5 | **Reflection** | High learning value, simple data model |
| 6 | **Ranking** | Engaging but specialized |
| 7 | **Cohort Intro** | Nice UX, lower priority |
| 8 | **Peer Review** | Complex pairing logic, depends on Assignment |
| 9 | **Office Hours** | Booking complexity, lower frequency of use |

---

## Open Questions

1. **Poll vs Survey routing** — Does a poll live at `/polls/:id` (separate route) or
   is it a survey detail page filtered by type? The survey system already handles
   type-based routing (`/surveys`, `/quizzes`, `/assessments`).

2. **Standalone vs journey-only** — Can a poll or FAQ exist standalone (accessible
   from sidebar) or only as a journey step? Likely both, like sessions.

3. **Ranking aggregation** — Average rank is the simplest aggregation but can be
   gamed by extreme rankings. Borda count or Condorcet method may produce better
   results for important decisions.

4. **Assignment file uploads** — Requires Supabase Storage bucket setup. Text and
   link submissions can ship first.

5. **Peer review assignment** — Random pairing vs admin-assigned vs self-select.
   Random is simplest to implement.
