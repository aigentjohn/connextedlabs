# Sidebar Section: Calendar & Events

This section groups all time-based and gathering-related pages. It covers the user's personal unified calendar, several distinct event types (open events, ticketed events, program sessions), recurring containers (meetings, meetups), attachment bundles for events (event companions), and venue management. The sidebar header shows a live count of events + meetings + meetups.

---

## Calendar (`/calendar`) — `CalendarPage.tsx`

**What it does:** The user's personal unified calendar. Aggregates two distinct data sources into a single feed: (1) platform `events` the user has been invited to or that are platform-wide, and (2) program `sessions` from programs the user is enrolled in. Each item shows its source (circle or platform), type badge, RSVP/attendance status, host name (when pending RSVP), and pricing info.

**Data loaded:**
- `circles` — finds all circles the user belongs to
- `fetchUnifiedCalendarData` helper — pulls platform events and program sessions, enriches with user RSVP/attendance status and circle name
- `fetchMyVenues` — loads the user's own venues for the venue filter
- `users` — fetches host name when an item is in `needs_rsvp` state

**User actions:**
- Create a new event (opens `CreateEventDialog`)
- RSVP to platform events: Yes / No / Maybe / external link (via `EventRSVPButtons`)
- RSVP to program sessions: Yes / No / Maybe (via `RSVPActions`)
- Filter by status: Today, This Week, All, Needs RSVP, Attending, Maybe, Hosting
- Filter by venue (only shown when the user has saved venues)
- Sort by: Date, Status, Source
- Download `.ics` file for any item with optional reminder (1 hour or 1 day before)
- Navigate to the source circle from a circle-sourced item

**Tabs / sub-views:**
- **Upcoming** — future items matching active filters
- **Past** — items whose end time has passed
- **My Circles** — sets source filter to `circle`; shows only circle-sourced items
- **Platform Events** — sets source filter to `platform`; shows only platform-wide items

**Known issues / gaps:**
- "Save the Date" events suppress time and location display (time shows as "TBD"), which is intentional, but ICS download still fires and may produce a file with no time data.
- The "Request Reminder" radio group is purely a client-side preference used only to enrich the `.ics` VALARM — it does not trigger any server-side notification.
- The unified calendar renders both events (`start_time` / `end_time`) and sessions (`start_date` / `end_date`). Helper functions normalise this, but the dual-field pattern is a fragility point if the schema diverges further.

---

## Events (`/events`) — `EventsPage.tsx`

**What it does:** A browsable directory of all platform `events` scoped to the user's community. Excludes events with `rsvp_type = 'external'` (those appear in Ticketed Events). Platform admins see all events; regular users see only events with no `circle_ids` (community-wide) or events in circles they belong to. Access-gated events (`member`, `premium`) are shown dimmed with a lock icon. Title is "Open Events" in the UI.

**Data loaded:**
- `events` — all community events ordered by `start_time`
- `circles` — all community circles (for badge display and membership check)
- `users` — all community users (for host name display)
- `content_likes` — like counts for all visible events (used for "Most Liked" sort)

**User actions:**
- Create event (opens `CreateEventDialog`)
- Search by title or description
- Sort: Soonest | Most Liked
- RSVP (Yes / No / Maybe) on accessible events via `RSVPActions`
- Host-only: view attendees list via `EventAttendeesDialog`
- Download `.ics` with optional reminder
- Join virtual meeting link (if `external_link` present and no `registration_url`)
- Click circle or tag badges to navigate

**Tabs / sub-views:**
- **Calendar View** — upcoming events grouped by month
- **List View** — flat sorted list of upcoming events with count badge
- **My Events** — events where `host_id === profile.id`
- **Past Events** — events with `start_time < now`

**Known issues / gaps:**
- `premium` access level is hardcoded to `false` — premium content gating is not yet implemented (marked `// TODO Phase 2: replace with journey enrollment check`).
- When `EventsPage` receives a `meetupId` prop (i.e., rendered inside a meetup context), the meetup filtering block returns `false` for all events, so no events appear. This is explicitly marked `// TODO: Add meetup filtering logic when meetups are migrated`.
- `handleAttendEvent` function is defined but has no implementation body.

---

## Ticketed Events (`/ticketed-events`) — `TicketedEventsPage.tsx`

**What it does:** A separate browsable list of community events where `rsvp_type = 'external'`. These are events that link out to a third-party registration or ticketing system (e.g. Eventbrite). The page does not manage tickets internally — it is purely a discovery surface with an external link button.

**Data loaded:**
- `events` filtered by `rsvp_type = 'external'` and `community_id`
- `circles` — for circle badge display
- `users` — for host name display

**User actions:**
- Search by title or description
- Click "Register / Get Tickets" — opens `event.external_rsvp_url` in a new tab
- Create event (opens `CreateEventDialog`, same dialog used elsewhere)

**Tabs / sub-views:** None — simple upcoming/past split using section headings.

**Known issues / gaps:**
- No sort controls (unlike EventsPage which has "Soonest" and "Most Liked").
- No access-level gating; all external events are shown to any authenticated user regardless of circle membership rules.
- No internal RSVP tracking — there is no way to record that a user clicked "Register".
- The "Create Event" button opens `CreateEventDialog`, which may not default to `rsvp_type = 'external'`. A user creating an event here would need to manually choose that field.

---

## Meetings (`/meetings`) — `MeetingsPage.tsx`

**What it does:** A browsable grid of `meetings` — a container entity that can bundle networking, events, sponsors, and shared documents. Meetings are distinct from bare `events`: they are persistent named spaces with member lists, admin roles, lifecycle states, tags, and optionally a parent meetup. The page title description is "Scheduled gatherings combining networking, events, and shared documents."

**Data loaded:**
- `meetings` — all meetings ordered by `created_at` desc
- `events` — fetched to resolve linked event date/time for individual meeting cards
- `sponsors` — fetched to resolve sponsor association on meeting cards
- `content_favorites` — user's favorites for `meeting` content type
- `content_likes` — like counts and current user's like status per meeting
- `users` — creator name lookups
- `fetchAndEnrichLifecycle` — enriches each meeting with its lifecycle state

**User actions:**
- Search by name, description, or tags
- Toggle "Mine" filter (created by, member of, or admin of)
- Sort: Newest | Oldest | Most Members | Most Liked
- Favorite / Like via `ContainerCard` component
- Create meeting — navigates to `/meetings/create`
- Click card to navigate to meeting detail (`/meetings/:slug`)

**Tabs / sub-views:** None — flat grid with filter/sort controls.

**Known issues / gaps:**
- The `events` and `sponsors` table data are fetched but only used inside `getEvent()` and `getSponsor()` helper functions — these helpers are defined but `getEvent`, `formatEventDateTime`, `calculateDuration`, and `getSponsor` are not called in the render output. The data appears to be scaffolding for a planned "linked event" display on meeting cards that was not completed.
- No visibility/access filter is applied on the meetings query itself; `filterByVisibility` is applied client-side after fetch.

---

## Meetups (`/meetups`) — `MeetupsPage.tsx`

**What it does:** A browsable grid of `meetups` — a higher-level recurring series container that groups multiple meetings together. Meetups have their own members, admins, tags, cover images, and lifecycle. The description "Recurring event series with multiple meetings" distinguishes them from individual meetings.

**Data loaded:**
- `meetups` filtered by `community_id`, ordered by `created_at` desc
- `meetings` — fetched to count how many meetings belong to each meetup (`meetup_id` FK)
- `content_favorites` and `content_likes` — per-meetup favorites and like counts
- `users` — creator name lookups

**User actions:**
- Search by name or description
- Toggle "Mine" filter
- Sort: Newest | Oldest | Most Members | Most Liked
- Favorite / Like via `ContainerCard`
- Create meetup — navigates to `/meetups/create`
- Click card to navigate to meetup detail (`/meetups/:slug`)

**Tabs / sub-views:** None — flat grid with filter/sort controls.

**Known issues / gaps:**
- Meeting count per meetup (`getMeetingCount`) is displayed but the count badge field is not wired into `ContainerCard`'s props — the count is computed but never passed in, so it is silently dropped.
- Visibility check is client-side only: public meetups, meetups where `member_ids` includes the user, or `role === 'super'`. There is no server-side RLS enforcement at this query.

---

## My Sessions (`/my-sessions`) — `MySessionsPage.tsx`

**What it does:** Shows the current user's scheduled program sessions — structured time-blocks belonging to programs the user is enrolled in. Supports RSVP (Yes / No / Maybe) with attendance tracking. Past sessions show an "Attended" badge if the attendance record exists. Also fetches upcoming and past circle events, but they are stored in state (`upcomingEvents`, `pastEvents`) and **not rendered** in the current UI.

**Data loaded:**
- `programs` — finds all programs where `member_ids` contains the user
- `sessions` — upcoming (`status = 'scheduled'`) and past (`status IN ('completed','cancelled')`) sessions for those programs, joined with program name/slug
- `session_attendance` — RSVP and attendance records for the user
- `circles` — finds all circles the user belongs to
- `events` — circle events overlapping user's circle IDs (fetched but not rendered)

**User actions:**
- RSVP to upcoming sessions: Yes / Maybe / No (writes to `session_attendance`)
- Change existing RSVP (update via upsert logic)
- Click "View My Programs" link on empty upcoming state
- View virtual meeting link directly if `virtual_link` is set

**Tabs / sub-views:**
- **Upcoming** — sessions with `start_date >= now` and `status = 'scheduled'`; capped by query (no explicit limit but sorted ascending)
- **Past** — sessions with `start_date < now` and `status IN ('completed','cancelled')`; limited to 20 records

**Known issues / gaps:**
- Circle events (stored in `upcomingEvents` / `pastEvents` state) are fetched but never rendered — the JSX only maps over `upcomingSessions` and `pastSessions`. This appears to be incomplete or was removed without cleaning up the fetch logic.
- Past sessions are limited to 20 rows with no pagination or "load more" control.
- There is no `PageHeader` component used here; the page uses its own inline `h1` and `Breadcrumbs`, inconsistent with other Calendar & Events pages.
- No `.ics` download or reminder option, unlike CalendarPage and EventsPage.

---

## Event Companions (`/event-companions`) — `EventCompanionsPage.tsx`

**What it does:** Lists all event companions — named bundles that attach supplementary content items to a specific event. A companion can hold references to tables, elevator pitches, agenda documents, attendee lists, and QR codes. The concept allows event hosts to package a curated set of materials under one named object linked to a parent event. The detail page (`/event-companions/:id`) handles item management.

**Data loaded:**
- `event_companions` — all records ordered by `created_at` desc, joined with linked event title/start_time and creator name
- `event_companion_items` — item counts per companion (for the count badge)

**User actions:**
- Search companions by name or linked event title
- Create a new companion — navigates to `/event-companions/new`
- Delete a companion (with confirmation) — removes the record immediately
- Click a companion card to view/edit its items at `/event-companions/:id`

**Detail page actions** (`EventCompanionDetailPage.tsx`):
- Rename the companion or edit notes
- Add items by type (tables, pitches, QR codes, attendees, etc.) using `getTypesForContext('event')`
- QR code items take a URL and optional label; a scannable QR is rendered inline
- Attendee widget (`CompanionAttendees`) shows event check-in data for the host
- Remove individual items
- Delete the entire companion

**Tabs / sub-views:** None on the list page. Detail page is a single scrolling view.

**Known issues / gaps:**
- No access control on the list query — all companions (across all creators) are loaded, not just the current user's. Any authenticated user can delete any companion via the list page.
- Drag-to-reorder is visually suggested by a `GripVertical` icon on each item row in the detail page, but drag-and-drop logic is not implemented. The `order_index` field exists but is only set at insert time.
- `item_id` for QR code items is set to the companion's own `id` (a self-reference) as a placeholder; actual data lives in the `notes` JSON field.

---

## Profile Venues (`/profile/venues`) — `VenuesPage.tsx`

**What it does:** Allows users to save and manage physical or virtual venue records for reuse when creating events. The page has two audiences: the user managing their own venues (edit/delete/view usage) and the community browsing publicly shared venues.

**Data loaded:**
- `fetchMyVenues(profile.id)` — user's own venue records
- `getVenueUsageCount(venue.id)` — event count per owned venue (sequential per-venue calls)
- `fetchPublicVenues(profile.id)` — all public venues excluding the user's own, with creator profile joined

**User actions:**
- Add a new venue (opens `VenueFormDialog` in create mode)
- Edit an owned venue (opens `VenueFormDialog` in edit mode)
- Delete an owned venue — warns if events are using it; events retain their `location` text even after deletion
- View events at a venue — opens `VenueEventsDialog` modal (works for both owned and public venues)
- Filter public venues by type: All | Physical | Virtual
- Search public venues by name, city, state, address, or creator name

**Tabs / sub-views:**
- **My Venues** — owned venues displayed as cards with full edit controls
- **Public Venues** — community-shared venues with creator attribution, search, and type filter; read-only (no edit/delete)

**Known issues / gaps:**
- Usage count is loaded with a sequential loop (`for...of`) rather than a single batch query, which will be slow when a user has many venues.
- Physical venue cards display address, city/state/zip, and country as separate paragraphs with no map link or geocoding.
- Virtual venue cards display the raw URL only; there is no "Join" button or link copy action.
- The route `/profile/venues` is slightly inconsistent with the rest of the Calendar & Events routes (which are top-level), suggesting venues may be moved or are considered part of the user profile section.

---

## How Events, Sessions, Meetings, and Meetups Differ

| Concept | Table | Container? | RSVP / Attendance | Key distinguisher |
|---|---|---|---|---|
| **Event** (open) | `events` | No | Internal RSVP (yes/no/maybe) | Single occurrence; scoped to community or specific circles; may be free or paid |
| **Ticketed Event** | `events` (`rsvp_type = 'external'`) | No | External URL only | Links out to third-party ticketing; no internal tracking |
| **Session** | `sessions` | No (child of Program) | `session_attendance` table with RSVP + check-in | Structured time-block inside a Program; attendance-tracked |
| **Meeting** | `meetings` | Yes (members, admins, docs) | None at this level | Persistent named space; can embed events, sponsors, documents |
| **Meetup** | `meetups` | Yes (parent of Meetings) | None at this level | Series grouping multiple Meetings; recurring in intent |
