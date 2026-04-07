# Open Events & Ticketed Events — Separate UI Plan

## Summary

Split the current `EventsPage` into two distinct user interfaces — **Open Events** (internal RSVP) and **Ticketed Events** (external registration) — while sharing the same `events` database table.

## Current State

- One `events` table in Supabase
- One `EventsPage` component at `/events`
- `CreateEventDialog` has an `rsvp_type` field but the `external_rsvp_url` column is missing from the DB
- Events can be associated with circles via `circle_ids`

## Database Changes

1. Add `external_rsvp_url` column to `events` table:
   ```sql
   ALTER TABLE events ADD COLUMN external_rsvp_url text;
   ```
2. Ensure `rsvp_type` column exists with values: `'internal'`, `'external'`, `'save-the-date'`
3. No new tables needed — both event types share the `events` table

## New Pages

### OpenEventsPage (`/events`)
- Lists events where `rsvp_type = 'internal'` or `rsvp_type = 'save-the-date'`
- Create form shows: title, description, date/time, location, tags, circle association, internal RSVP settings, capacity
- Hides: external URL, ticket link fields
- RSVP buttons manage attendance internally

### TicketedEventsPage (`/ticketed-events`)
- Lists events where `rsvp_type = 'external'`
- Create form shows: title, description, date/time, location, tags, circle association, external registration URL
- Hides: internal RSVP capacity/management, save-the-date option
- RSVP button opens external URL in new tab

### Shared Components
- `EventCard` — shared card component, renders differently based on `rsvp_type`
- `EventDetailPage` — single detail page that adapts based on the event's `rsvp_type`
- `CreateEventDialog` — could remain unified with conditional field display, or split into two simpler dialogs

## Routing

| Route | Page | Filter |
|-------|------|--------|
| `/events` | OpenEventsPage | `rsvp_type IN ('internal', 'save-the-date')` |
| `/ticketed-events` | TicketedEventsPage | `rsvp_type = 'external'` |
| `/events/:id` | EventDetailPage | Adapts based on record's `rsvp_type` |
| `/circles/:circleId/events` | Filtered by circle | Shows both types within a circle |

## Sidebar (Calendar & Events)

Already in place:
- Open Events → `/events`
- Ticketed Events → `/ticketed-events`

## Create Flow

When creating from the Open Events page:
- Default `rsvp_type` to `'internal'`
- If user selects external registration, the event moves to Ticketed Events after save

When creating from the Ticketed Events page:
- Default `rsvp_type` to `'external'`
- Require `external_rsvp_url`

## Fields by Event Type

| Field | Open Events | Ticketed Events |
|-------|------------|-----------------|
| title | Yes | Yes |
| description | Yes | Yes |
| start_time / end_time | Yes | Yes |
| location | Yes | Yes |
| tags | Yes | Yes |
| circle_ids | Yes | Yes |
| rsvp_type | `'internal'` / `'save-the-date'` | `'external'` |
| external_rsvp_url | Hidden | Required |
| capacity | Yes | Hidden (managed externally) |
| is_paid_event | Yes | Hidden (managed externally) |
| Internal RSVP tracking | Yes | No |

## Implementation Order

1. Add `external_rsvp_url` column to `events` table in Supabase
2. Create `OpenEventsPage` component (adapted from current `EventsPage`, filtered to internal)
3. Create `TicketedEventsPage` component (filtered to external, simplified form)
4. Update routes in `App.tsx`
5. Update `EventDetailPage` to adapt display based on `rsvp_type`
6. Update `CreateEventDialog` to conditionally show/hide fields based on context
7. Test both flows end-to-end
