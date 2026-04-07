# Visibility Cleanup Plan

## Goal

Ensure every content type and container type properly enforces its `visibility` field on standalone pages (list pages and detail pages). Journey pages continue to show all content freely to enrolled users — no changes needed there.

## Principle

- **Inside a journey** (pathway, course, program): all linked content/containers are shown without visibility checks. The parent program/course controls access via enrollment.
- **Outside a journey** (standalone browse/detail pages): each item's own `visibility` field is enforced. If an item is `private`, it is not accessible unless the user is a member/admin/owner.

---

## Current State Audit

### Pages that ALREADY enforce visibility (using `canViewContainer` or `filterByVisibility`)

| Page | Type | Check |
|------|------|-------|
| TablesPage | list | `filterByVisibility` |
| StandupsPage | list | `filterByVisibility` |
| MeetingsPage | list | `filterByVisibility` |
| BuildDetailPage | detail | `canViewContainer` |
| TableDetailPage | detail | `canViewContainer` |
| PitchDetailPage | detail | `canViewContainer` |
| ElevatorDetailPage | detail | `canViewContainer` |
| MeetupDetailPage | detail | `canViewContainer` |
| MeetingDetailPage | detail | `canViewContainer` |
| StandupDetailPage | detail | `canViewContainer` |
| SprintDetailPage | detail | `canViewContainer` |

### Pages that DO NOT enforce visibility

#### Container list pages (missing `filterByVisibility`)

| Page | DB Table | Notes |
|------|----------|-------|
| ElevatorsPage | elevators | Has visibility field in create form but doesn't filter list |
| MeetupsPage | meetups | Has visibility field in create form but doesn't filter list |
| SprintsPage | sprints | No list filtering |
| BuildsPage | builds | No list filtering |
| PitchesPage | pitches | No list filtering |
| PlaylistsPage | playlists | Displays visibility badge but doesn't filter |
| ChecklistsPage | checklists | No visibility handling at all |
| LibrariesPage | libraries | Needs checking |

#### Container detail pages (missing `canViewContainer`)

| Page | DB Table |
|------|----------|
| PlaylistDetailPage | playlists |
| ChecklistDetailPage | checklists |

#### Content list pages (missing `filterByVisibility`)

| Page | DB Table | Notes |
|------|----------|-------|
| EpisodesPage | episodes | Has visibility in type but only uses it as a UI filter, not access control |
| BooksPage | books | Has visibility in create form but doesn't filter list |
| DecksPage | decks | Has visibility in create form but doesn't filter list |
| ReviewsPage | endorsements | No visibility field at all |
| BlogsPage | blogs | Needs checking |
| DocumentsPage | documents | Needs checking |
| MomentsPage | posts | Needs checking |

#### Content detail pages (missing `canViewContainer`)

| Page | DB Table |
|------|----------|
| EpisodeDetailPage | episodes |
| BookDetailPage | books |
| DeckDetailPage | decks |
| ReviewDetailPage | endorsements |
| BlogDetailPage | blogs |
| DocumentDetailPage | documents |

### Special cases

| Page/Type | DB Table | Current Approach | Issue |
|-----------|----------|-----------------|-------|
| MagazineDetailPage | magazines | Uses `is_public` (boolean) | Different field name than standard `visibility` |
| Badges | badges | Uses `is_public` (boolean) | Different field name |
| Programs | programs | Uses `visibility` but maps `'member'` → `'members-only'` in DB | Mapping quirk |

---

## Work Items

### 1. Verify DB columns exist

Before adding checks, confirm which tables actually have a `visibility` column. Tables without one will need the column added in Supabase first.

**Tables expected to have `visibility`:** circles, tables, elevators, meetings, meetups, standups, sprints, libraries, playlists, checklists, builds, pitches, programs, episodes, documents, blogs, books, decks, prompts

**Tables that may NOT have `visibility`:** endorsements (reviews), posts (moments)

### 2. Add `filterByVisibility` to list pages

For each list page missing the check:
- Import `filterByVisibility` from `@/lib/visibility-access`
- After fetching records, pass them through `filterByVisibility(records, profile, 'tableName')`
- Ensure the query selects `visibility`, `member_ids`, `admin_ids` fields

### 3. Add `canViewContainer` to detail pages

For each detail page missing the check:
- Import `canViewContainer` from `@/lib/visibility-access`
- After fetching the record, check `canViewContainer(profile, record, 'tableName')`
- If false, show an access-denied message instead of the content

### 4. Handle special cases

- **Magazines**: Decide whether to add a standard `visibility` column or keep `is_public` and add a small adapter
- **Endorsements (reviews)**: Add `visibility` column to `endorsements` table if missing; default to `'public'`
- **Posts (moments)**: Determine if standalone visibility applies or if posts always inherit from their circle

### 5. Add visibility selector to create/edit forms

For content types that have the `visibility` column but no UI to set it:
- Add a visibility dropdown (public / member / unlisted / private) to the create and settings pages

### 6. Journey pages — no changes

Confirm that `JourneyInlineViewer`, `JourneyContentGrid`, and `ProgramDetailPage` do NOT call `canViewContainer` or `filterByVisibility` on journey items. They should continue showing everything to enrolled users.

---

## Order of Execution

1. Audit DB columns (query Supabase to confirm which tables have `visibility`)
2. Add missing DB columns where needed
3. Add `filterByVisibility` to all list pages (batch — same pattern repeated)
4. Add `canViewContainer` to all detail pages (batch — same pattern repeated)
5. Add visibility selectors to create/edit forms that are missing them
6. Test standalone pages respect visibility
7. Confirm journey pages still show everything freely
