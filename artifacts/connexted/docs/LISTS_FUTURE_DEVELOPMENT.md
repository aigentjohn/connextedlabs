# Lists (Checklists) — Future Development Plan

**Date:** April 2026
**Status:** Planned — not yet built
**Scope:** Enhancements to the existing checklist/list system

---

## Naming Clarification

There is a persistent ambiguity in the codebase between "List" and "Checklist":

| Layer | Name used |
|---|---|
| Database table | `checklists`, `checklist_items` |
| Journey item type key | `checklist` |
| User-facing label | **List** / **Lists** |
| Create page title | "Create List" |
| Admin dashboard | "Lists" |

**Decision:** The user-facing name is **List**. The internal DB and code identifier remains `checklist` for backwards compatibility. No rename is needed — the distinction is already consistent across the UI. Confusion arises only when reading code alongside UI screenshots.

---

## Current State (What Exists)

- `checklists` table: `id, name, description, category, is_template, tags, access_level, created_by, created_at, updated_at`
- `checklist_items` table: `id, checklist_id, text, is_complete, assignment (free-text), notes, priority (integer for ordering), created_at, updated_at`
- **What works today:**
  - Create a list from scratch or copy from a template
  - Add items with optional `assignment` (free text) and `notes`
  - Toggle items complete/incomplete
  - Reorder items via up/down arrows
  - View all item details on the list detail page
  - Filter/search lists on the lists index page
  - Embed lists as journey steps (inline viewer shows progress)
- **What is missing or incomplete:** (detailed below)

---

## 1. Item Visibility — Expand to See Notes and Assignment

**Problem:** Items show their `text` in the list view but the `assignment` and `notes` fields are not visible unless you scroll to find them in the detail page layout. There is no per-item expand/collapse or modal.

**Proposed fix:**
- Accordion row: clicking a list item row expands it in place to reveal `assignment`, `notes`, `due_date`, `priority_label`, and an Edit button
- Or: a slide-over/drawer panel that opens for a single item — shows all fields + activity log
- Either approach avoids navigating away from the list

**Priority:** High — users are already adding notes and assignments expecting to retrieve them

---

## 2. Inline Item Editing

**Problem:** Editing an item's `text`, `assignment`, or `notes` currently requires deleting and re-adding it. An `handleUpdateItem()` function exists in the code but is not exposed in the UI in an edit-friendly way.

**Proposed fix:**
- Click-to-edit item text (inline `<input>` replacing the span)
- Edit icon per row that opens a small form or the drawer described above
- Auto-save on blur

**Priority:** High — current delete-and-recreate workflow is confusing

---

## 3. Item Fields to Add

The following fields are not in the current `checklist_items` schema but have been discussed:

| Field | Type | Use case |
|---|---|---|
| `due_date` | `date` | Punchlist, schedule, deadline tracking |
| `completed_at` | `timestamptz` | Record when item was actually finished |
| `assigned_to_user_id` | `uuid → users` | Replace free-text `assignment`; enables filtering by user, notifications |
| `priority_level` | `text` (`low\|medium\|high\|critical`) | Punchlist priority badge, Kanban column sorting |
| `estimated_hours` | `numeric` | Work breakdown / estimate use case |
| `category` | `text` | Work breakdown grouping (e.g. Design, Dev, QA) |
| `tags` | `text[]` | Cross-cutting labels |

**Migration approach:** Add columns incrementally as each feature ships. All new columns should be nullable so existing rows are unaffected.

---

## 4. Punchlist Mode

A punchlist is a list where every item has a **priority**, **due date**, **assigned person**, and a **completed date** — used to track defects, open action items, or closeout tasks.

**Proposed additions:**
- Toggle per-list: "Punchlist mode" that shows priority + due date columns in a compact table layout
- Columns: `#` | Item | Assigned to | Priority | Due | Done | Completed date
- Color coding: overdue items highlighted in red, due today in amber
- Filter/sort by priority or due date
- Export to CSV

**This is distinct from a simple task list** — punchlist mode is more structured and status-oriented.

---

## 5. Kanban View

Transform a list into a column-based board where each column represents a status or priority level.

**Column options (two approaches):**

**Option A — Status columns:**
- To Do | In Progress | Done
- Items move between columns by drag-and-drop or a status dropdown
- Requires adding a `status` field to `checklist_items` (`todo | in_progress | done | blocked`)

**Option B — Priority columns:**
- Critical | High | Medium | Low
- Existing `priority_level` field drives column placement
- Completion state still tracked via `is_complete`

**UI:**
- Toggle between List view and Board view at the top of the detail page
- Both views read/write the same `checklist_items` rows — just a display difference
- Drag-and-drop within and between columns updates `status` or `priority_level`

**Priority:** Medium — valuable for project/sprint use cases

---

## 6. Schedule View (List → Calendar / Timeline)

When list items have `due_date` set, offer a calendar or Gantt-style timeline view.

**Two sub-modes:**

**6a. Calendar view:**
- Items with due dates appear as events on a calendar (day/week/month)
- Clicking an item opens the drawer to edit it
- Items without due dates appear in a "Unscheduled" sidebar list
- Shares the same calendar UI used by Sessions if one exists, rather than building from scratch

**6b. Timeline / Gantt view:**
- Items with both `start_date` and `due_date` render as horizontal bars
- Requires adding a `start_date` field to `checklist_items`
- Good for project planning contexts (programs, sprints)

**Note:** A list with due dates on items effectively becomes a lightweight project schedule. This bridges the gap between a task list and a session/event calendar.

---

## 7. Estimate / Work Breakdown

Transform a list into a structured cost or effort estimate.

**How it works:**
- Items have `estimated_hours` (or `estimated_cost`)
- Items are grouped by `category` (e.g. Design, Development, Testing, Management)
- The list detail page shows a summary table: category → subtotal hours/cost → grand total
- A "Markup" or "Rate" field at the list level converts hours to a dollar estimate

**Use cases:**
- Project bid / proposal estimate
- Sprint capacity planning
- Event or program budget breakdown

**Data model additions:**
- `checklist_items.estimated_hours` (numeric)
- `checklist_items.category` (text — grouping label)
- `checklists.hourly_rate` (numeric, optional — for cost conversion)
- `checklists.currency` (text, optional)

**UI:**
- Separate "Estimate" tab or toggle on the list detail page
- Items grouped by category with subtotals
- Printable / exportable summary

---

## 8. Templates — Clarifications and Improvements

**How templates work today:**
- A list with `is_template = true` is a template
- "Use Template" button creates a new list, copies all items with `is_complete = false`
- Template items are duplicated — no live link between template and instance

**What needs to be clearer:**
- Templates should be visually distinct from regular lists (e.g. a "Template" badge, different card style)
- Creating from a template should prompt for a name before copying, not inherit the template name verbatim
- Templates should be browsable in a separate "Template Library" section, not mixed into the main list

**Proposed improvements:**

| Improvement | Detail |
|---|---|
| Prompt for name on copy | Dialog: "Name your new list" before the copy executes |
| Template library view | Separate tab or page showing only `is_template = true` lists |
| Template categories | `category` field on the checklist used to organise templates by type (e.g. "Onboarding", "Sprint", "Punchlist") |
| Partial template | Mark individual items as "required" vs "optional" — optional items can be removed when using the template |
| Template versioning | (future) Track changes to a template without affecting existing instances |

---

## 9. Sorting Enhancements

**Current:** Priority is an integer used only for manual reordering via arrow buttons.

**Proposed sort options:**
- Manual order (current default)
- By due date (ascending)
- By priority level (Critical → Low)
- By assigned person (alphabetical)
- By completion status (incomplete first)
- By date added

A sort control at the top of the item list (dropdown or button group) persists per-session.

---

## 10. Assignment — Move from Free Text to User Picker

**Current:** `assignment` is a free-text string.

**Problem:** Cannot filter "all items assigned to me across all lists," cannot send notifications, cannot link to a profile.

**Proposed fix:**
- Add `assigned_to_user_id uuid REFERENCES users(id)` to `checklist_items`
- Keep the old `assignment` text column for backwards compatibility but stop using it in the UI
- User picker autocomplete (search by name) when adding/editing an item
- "My Items" filter on the list page: shows only items assigned to the current user across all lists

---

## 11. Checklist Item Activity / Audit Log

For punchlist and project list use cases, it is useful to know:
- When was an item completed?
- Who completed it?
- Who changed the assignment?

**Proposed:**
- `checklist_item_events` table: `id, item_id, event_type (completed|assigned|reopened|edited), user_id, created_at, metadata (jsonb)`
- Events written on status changes
- Visible in the item drawer as a small activity timeline

---

## Relationship to Other Types

| Enhancement | Closest existing feature | Notes |
|---|---|---|
| Kanban view | Sprints (time-boxed containers) | Kanban could replace or augment Sprint's task board |
| Schedule view | Sessions / Events | List with dates bridges tasks and calendar events |
| Estimate | Tables (document tables) | Estimate view is a specialised table — could reuse table UI |
| Punchlist | List (current) | Mode switch, not a new type |
| Assignment to user | Member profiles | Requires user picker component (reuse from other forms) |

---

## Implementation Priority (Suggested)

| Priority | Feature | Reason |
|---|---|---|
| 1 | Inline item editing | Fixes existing UX gap — users already expect it |
| 2 | Item expand / drawer | Makes notes and assignment visible without a new DB change |
| 3 | Add `due_date` + `priority_level` fields | Unlocks punchlist, sorting, and schedule view |
| 4 | Punchlist mode | High value for project/construction/event use cases |
| 5 | Template library view + name prompt | Low effort, big clarity improvement |
| 6 | Replace `assignment` text with user picker | Requires user picker component |
| 7 | Sort controls | Simple UI addition once fields exist |
| 8 | Kanban view | Medium effort, good for sprint and program workflows |
| 9 | Schedule / calendar view | Depends on due_date being in place |
| 10 | Estimate / work breakdown | Specialised use case — implement last |
| 11 | Activity log | Nice to have, adds complexity |

---

## Open Questions

1. **Punchlist as a mode vs a separate type?** — Punchlist behaviour (priority + due date columns) could be a toggle on any list, or a distinct `list_type = 'punchlist'` on the `checklists` table. A toggle is simpler; a separate type allows different default views.

2. **Kanban status vs priority columns?** — Status-based columns (To Do / In Progress / Done) require a new `status` field and a workflow concept. Priority columns reuse existing data but are less intuitive for task tracking. Start with status.

3. **Estimate hours vs cost?** — Hours is more portable (different people have different rates). Cost is more useful for client-facing estimates. A rate field on the list converts between the two — offer both.

4. **Template library — who can create templates?** — Currently any user can mark a list as a template. Should templates be admin-only, or creator-owned? A `visibility` field (`private | community | admin`) would give flexibility.

5. **Gantt start date** — A proper Gantt view needs a start date per item, not just due date. This adds complexity. A simpler "due date calendar" is a better first step.
