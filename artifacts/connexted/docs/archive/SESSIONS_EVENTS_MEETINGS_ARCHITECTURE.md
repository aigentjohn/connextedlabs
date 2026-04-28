# Sessions, Events & Meetings — Architecture Decision Record

**Date:** April 2026  
**Status:** Approved for implementation  
**Scope:** Sessions as a unified pre-event structure across Circles, Programs, and Pathways

---

## 1. The Problem

The platform currently has three overlapping concepts that do similar but not identical jobs:

| Table | Used For | Date Required | Who Uses It |
|---|---|---|---|
| `events` | Circle gatherings, Journey content, platform events | ✅ always | Circles, Journeys, platform-wide |
| `sessions` | Program scheduled occurrences | ✅ always | Programs only |
| `meetings` | Community spaces (like Circles) | ❌ | Platform nav, unlimited tier |

**Pain points:**
- Circle "events" and program "sessions" are the same concept stored in two different tables
- Neither table supports a date-TBD / pre-event state
- Journeys reference `events` table for their event content type — tying a planning tool to a calendar object
- The `/my-sessions` sidebar link exists but fetches nothing useful — sessions are not unified across contexts
- `calendarHelpers.ts` fetches events but never sessions — they are invisible in the unified calendar

---

## 2. Concept Definitions

### What Each Thing Actually Is

#### Event
A **scheduled calendar occurrence** open to discovery. It always has a date. It may be public or circle-scoped. It has RSVP and an attendee list but no persistent membership or feed. It lives on the calendar.

> Examples: community workshop, ticketed conference, open webinar, platform-wide social

#### Meeting / Meetup
A **persistent community space** — like a Circle but named differently by tier. It has its own member list, admin list, and feed. It is not a scheduled occurrence. It does not require a date. It lives in the sidebar as a community group.

> Examples: a standing working group, a recurring peer group, a community of practice

#### Session *(the hybrid — proposed definition)*
A **contextual pre-event structure** that lives inside a Circle, Program, or Pathway. It inherits membership from its parent context. It has a type (workshop, webinar, meeting, etc.), RSVP, and attendance tracking. A date is **not required** — it exists before scheduling and appears in the user's Sessions sidebar. When given a date, it promotes to the calendar.

> Examples: "Design Sprint" planned for a program cohort, "Monthly Check-in" proposed in a circle, "Kickoff Call" milestone on a pathway

---

## 3. Side-by-Side Comparison

| Feature | Events | Meetings / Meetups | Sessions (proposed) |
|---|---|---|---|
| Date required | ✅ always | ❌ | ❌ never |
| Persistent members | ❌ | ✅ own list | ✅ inherited from context |
| Discussion feed | ❌ | ✅ | ❌ |
| RSVP | ✅ `event_rsvps` | ❌ | ✅ via `session_attendance` |
| Attendance tracking | ❌ | ❌ | ✅ |
| Appears on calendar | ✅ always | ❌ | ✅ when date is set |
| Appears in user sidebar | ❌ | ✅ own nav | ✅ `/my-sessions` |
| Lives in context | standalone | standalone | Circle / Program / Pathway |
| Can exist without date | ❌ | ✅ | ✅ |
| Type/category | `event_type` enum | — | `session_type` enum |
| Promoted from | — | — | becomes calendar event |
| Default timezone | EST | — | EST |

---

## 4. Current State of the `sessions` Table

```sql
sessions
  id              uuid PK
  program_id      uuid FK → programs     -- currently required
  circle_id       uuid FK → circles      -- nullable
  name            text NOT NULL
  description     text
  session_type    text                   -- meeting | workshop | event | class | other
  start_date      timestamptz NOT NULL   -- BLOCKER: required today
  duration_minutes integer
  location        text
  virtual_link    text
  status          text                   -- scheduled | in_progress | completed | cancelled
  max_capacity    integer
  created_at      timestamptz
  updated_at      timestamptz
```

**Problems with current schema:**
- `start_date NOT NULL` — cannot represent a proposed/TBD session
- `program_id` has no equivalent for pathways
- No `proposed` status
- `session_type` enum is limited (missing webinar, training, social, standup, etc.)
- Not fetched by `calendarHelpers.ts` — invisible in unified calendar
- No `pathway_id` — pathways cannot have sessions

---

## 5. Decision: Keep Sessions as the Canonical Pre-Event Structure

### Decision
**Sessions remain their own table and concept.** They are not merged into events or meetings. They are the hybrid described above: contextual, membershipless on their own (inherited), with RSVP and attendance, without a required date.

### What changes
- `start_date` becomes nullable (enables the TBD state)
- `proposed` added as a status
- `pathway_id` added as a context column
- `session_type` enum expanded to match `event_type` values
- Both `program_id` and `circle_id` become nullable (either/or, never both)
- Sessions fetched in `calendarHelpers.ts` so they appear in the unified view

### What stays the same
- `events` table handles standalone platform/community events with dates
- `meetings` and `meetups` remain as community spaces (their own nav, members, feeds)
- `session_attendance` table continues to handle RSVP + attendance

---

## 6. Why NOT to Replace Sessions in Journeys with Events or Meetings

### The Proposal Being Evaluated
> Replace the `event` content type in `AddJourneyContentDialog` and journey items with a reference to `meetings` or `events` instead of sessions.

### Option A: Replace with `events` table reference

**Why this seems attractive:**
- Events already exist and have rich metadata (type, location, RSVP)
- AddJourneyContentDialog already queries events for its event content type
- Less migration work in the short term

**Why this is wrong:**

1. **Events require a date.** A journey milestone like "Attend Kickoff Call" cannot reference an event that hasn't been scheduled yet. The event doesn't exist. You'd be adding a placeholder to a journey that points at nothing until someone creates the event separately.

2. **Events are standalone.** An event has no awareness of which program or circle it belongs to. Linking a journey to an event is a loose, unguarded association — anyone could attach any platform event to any journey, including events that have nothing to do with the program.

3. **Events have no enrollment context.** When a learner reaches the "Attend Design Sprint" step in their pathway, they should be able to see who else from their cohort is attending, RSVP from within the pathway, and have their attendance tracked against their enrollment. Events have attendee_ids but no concept of cohort membership.

4. **Calendar pollution.** If a journey event content type points to the `events` table, every program's scheduled events show up in the platform-wide event feed. A cohort's internal kickoff call should not appear as a public community event.

5. **Lifecycle mismatch.** A program can be designed months before sessions are scheduled. The journey should be able to say "there will be a workshop here" while the exact date is TBD. The `events` table cannot represent this — it requires `start_time`.

### Option B: Replace with `meetings` table reference

**Why this seems attractive:**
- Meetings don't require a date
- Meetings have persistent membership
- Could represent a standing working group on a journey

**Why this is wrong:**

1. **Meetings are community spaces, not occurrences.** Adding a meeting to a journey would mean "join this community group" not "attend this gathering." These are fundamentally different actions in a learning journey.

2. **No RSVP or attendance.** Meetings have no RSVP mechanism and no attendance tracking. A journey milestone of "Attend the Design Sprint" needs to be checkable — did the person actually attend? Meetings cannot answer that.

3. **Meetings are persistent.** A meeting exists indefinitely with ongoing activity. A journey step should reference something bounded — a session that happens, completes, and can be marked done.

4. **Wrong mental model for learners.** Showing a learner "your next step is to join the Innovation Working Group" (a meeting) versus "your next step is to attend the Design Sprint session on May 15" (a session) are different experiences. The meeting implies ongoing membership; the session implies a specific event in the journey.

### Conclusion: Sessions are the correct reference

Sessions are designed exactly for this purpose — they are contextual, bounded, RSVP-enabled, attendance-tracked, and date-optional. The journey content type `event` should be renamed to `session` and reference the `sessions` table, not the `events` table. This is not a workaround; it is the correct semantic.

---

## 6b. Why Not Relax Meetings Instead

Evaluated: drop attendance tracking + drop required date from meetings, then use meetings as sessions.

Even with those relaxations, meetings still fail for three reasons: (1) meetings own their member list independently — sessions need to *inherit* membership from a parent context without a separate list to sync; (2) the meetings table has no `program_id`, `circle_id`, or `pathway_id` — adding all three would turn meetings into a dual-purpose table serving two different concepts; (3) meetings live in their own nav browser as a community space directory, while sessions need to surface inside their context (program page, circle page, pathway step) and in a personal `/my-sessions` view. Conflating the two would mix standing community groups with cohort sessions in the same browse experience.

**Decision confirmed:** Sessions remain their own lightweight table. The required changes are minimal (8 schema lines) and the semantic clarity is worth it.

---

## 7. Migration Plan

### Phase 1 — Schema Changes (Database)

```sql
-- 1. Make start_date optional
ALTER TABLE sessions 
  ALTER COLUMN start_date DROP NOT NULL;

-- 2. Add proposed to status enum
ALTER TABLE sessions 
  DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions 
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('proposed', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- 3. Add pathway context
ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS pathway_id uuid REFERENCES pathways(id);

-- 4. Make program_id nullable (sessions can exist in circles or pathways without a program)
ALTER TABLE sessions 
  ALTER COLUMN program_id DROP NOT NULL;

-- 5. Expand session_type to match event_type vocabulary
ALTER TABLE sessions 
  DROP CONSTRAINT IF EXISTS sessions_session_type_check;
ALTER TABLE sessions 
  ADD CONSTRAINT sessions_session_type_check
  CHECK (session_type IN (
    'meeting', 'workshop', 'webinar', 'training', 
    'social', 'standup', 'conference', 'office_hours', 'other'
  ));

-- 6. Add default timezone field
ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';
```

**Migration file:** `docs/migrations/sessions-pre-event-structure.sql`

---

### Phase 2 — Backend / Data Layer

**`calendarHelpers.ts`**
- Add sessions fetch alongside events fetch in `fetchUnifiedCalendarData()`
- Sessions with `start_date` set appear in calendar timeline
- Sessions with `start_date` null appear in a "Date TBD" bucket
- Map sessions to `UnifiedCalendarItem` with `type: 'session'`
- Default timezone: `America/New_York` for all time display

**`useSidebarData.ts`**
- Add session count fetch for the `/my-sessions` sidebar badge
- Count: sessions where user is member of parent circle/program/pathway

---

### Phase 3 — Journey Content Type

**`AddJourneyContentDialog.tsx`**
- Change `case 'event':` to query `sessions` table instead of `events` table
- Filter sessions by relevant context (program, circle, or all proposed sessions)
- Display session_type as a label
- Show "Date TBD" for sessions without a start_date

**`journey-item-types.ts`**
- Rename content type from `event` to `session` (or add `session` and deprecate `event`)
- Update icon and label to reflect session concept

---

### Phase 4 — Circle Events → Sessions

**`CircleCalendar.tsx`**
- Change query from `events` table (filtered by `circle_ids`) to `sessions` table (filtered by `circle_id`)
- Proposed sessions show in an "Upcoming (Date TBD)" section
- Scheduled sessions (with date) show in the timeline

**`CreateEventDialog.tsx` (for circles)**
- When creating from within a circle context, write to `sessions` table instead of `events` table
- Date field becomes optional
- Default timezone: `America/New_York`

**Data migration** (existing circle events → sessions)
```sql
INSERT INTO sessions (circle_id, name, description, session_type, start_date, status, created_at)
SELECT 
  (circle_ids[1])::uuid,
  title,
  description,
  event_type,
  start_time,
  CASE WHEN event_status = 'confirmed' THEN 'scheduled'
       WHEN event_status = 'completed' THEN 'completed'
       WHEN event_status = 'cancelled' THEN 'cancelled'
       ELSE 'proposed' END,
  created_at
FROM events
WHERE circle_ids IS NOT NULL AND array_length(circle_ids, 1) > 0;
```

---

### Phase 5 — My Sessions Page

**`MySessionsPage.tsx`**
- Expand query to fetch sessions across programs AND circles AND pathways
- Group by context type (Program, Circle, Pathway)
- Show proposed sessions (TBD) alongside scheduled ones
- Add RSVP action for sessions with RSVP enabled

---

### Phase 6 — Session Creation UX

**New: `CreateSessionDialog.tsx`** (or extend existing session management)
- Usable from: Circle detail page, Program admin, Pathway editor
- Fields:
  - Title (required)
  - Type: meeting | workshop | webinar | training | social | standup | other
  - Description (optional)
  - Date & Time (optional — defaults to proposed/TBD)
  - Timezone (default: America/New_York)
  - Duration (optional)
  - Location / Virtual link (optional)
  - Max capacity (optional)
  - RSVP enabled toggle
- Status defaults to `proposed` if no date; `scheduled` if date provided

---

## 8. What Stays Unchanged

| Component | Why |
|---|---|
| `events` table | Standalone platform/community events — open conferences, ticketed events, public webinars |
| `meetings` table | Community spaces — persistent groups with members and feeds |
| `meetups` table | Community spaces — same as meetings, different tier |
| `event_rsvps` table | RSVP for standalone events |
| `session_attendance` table | RSVP + attendance for sessions — already correct |
| `CalendarPage.tsx` | Minimal changes — add TBD section, add sessions to fetch |
| `CreateEventDialog.tsx` | Remains for standalone platform events |

---

## 9. Implementation Sequence

```
Week 1
  ├── Phase 1: Schema migration (SQL, run in Supabase)
  ├── Phase 2: calendarHelpers.ts + useSidebarData.ts
  └── Phase 3: Journey content type → sessions

Week 2
  ├── Phase 4: Circle events → sessions (component + data migration)
  └── Phase 5: My Sessions page expansion

Week 3
  └── Phase 6: Create Session dialog (unified creation UX)
```

---

## 10. Open Questions

1. **Session promotion to Event** — When a session gets a date confirmed, should it automatically create a corresponding record in the `events` table (for calendar display), or should the sessions table + calendarHelpers handle calendar rendering directly? The latter is simpler; the former allows mixing with platform events in one feed.

2. **RSVP for proposed sessions** — Should users be able to RSVP "interested" or "planning to attend" on a session that has no date yet? This would be useful for gauging demand before committing to a date.

3. **Pathway sessions as steps** — When a session is a step in a pathway, does completing attendance on that session automatically mark the pathway step as complete?

4. **Notifications** — When a proposed session gets a date confirmed (promoted to scheduled), should all circle/program/pathway members who haven't RSVP'd receive a notification?

5. **Circle events data migration** — Should existing circle events in the `events` table be migrated to `sessions`, or should both be supported during a transition period?
