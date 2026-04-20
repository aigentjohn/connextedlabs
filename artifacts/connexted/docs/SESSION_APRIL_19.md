# Session Notes — April 19, 2026

## Focus Areas

1. Container visibility matrix verification and cleanup
2. User class capacity audit and fixes
3. Development issue triage for the Platform Admin configuration area
4. SIDEBAR_SETUP.md documentation review and update

---

## 1. Container Visibility Matrix — Post-Update Verification

After the user updated the matrix via Platform Admin → Container Configuration, the
current state was verified via SQL queries against `user_class_permissions`.

### Issues resolved by the matrix update

| Issue | Status |
|---|---|
| Class 1 had more nav items enabled than Class 2 | ✅ Fixed — Class 1: 4 items, Class 2: 8 items |
| Class 5 missing news and calendar | ✅ Fixed — both present |
| Builds skipping Classes 2–5 | ✅ Fixed — builds starts at Class 5 |

### Current matrix summary (April 19)

| Class | Nav items enabled |
|---|---|
| 1 | home, news, events, calendar |
| 2 | home, news, programs, events, calendar, courses, blogs, documents |
| 3 | home, programs, news, circles, courses, events, tables, elevators, meetings, pitches, meetups, libraries, checklists, calendar, documents, episodes, books, blogs, reviews, decks, posts |
| 4 | Same as Class 3 (differentiated by capacity limits only) |
| 5 | Class 3/4 + standups, builds, sprints, playlists, magazines |
| 6 | Class 5 + forums |
| 7 | Class 6 + prompts |
| 8–10 | Same as Class 7 |

### Remaining deferred items

| Item | Notes |
|---|---|
| `prompts` enabled Classes 7–10 | No page/route exists — deferred |
| `forums` enabled Classes 6–10 | No page/route exists — deferred |

---

## 2. User Class Capacity — Fixes Applied

Queries against `user_classes` confirmed two issues and both were fixed via SQL.

### Fixes applied

**Class 1 unlimited capacity** — `max_admin_containers` and `max_member_containers`
were `-1` (unlimited) for the most restricted class. Fixed:

```sql
UPDATE public.user_classes
SET max_admin_containers = 0,
    max_member_containers = 5
WHERE class_number = 1;
```

**Class 7 typo** — `max_admin_containers` was 89, not 90. Fixed:

```sql
UPDATE public.user_classes
SET max_admin_containers = 90
WHERE class_number = 7;
```

### Current capacity table (April 19)

| Class | Name | max_admin_circles | max_admin_containers | max_member_containers |
|---|---|---|---|---|
| 1 | Starter | 0 | 0 | 5 |
| 2 | Basic | 0 | 10 | 10 |
| 3 | Standard | 1 | 30 | 30 |
| 4 | Plus | 5 | 40 | 40 |
| 5 | Advanced | 10 | 50 | 50 |
| 6 | Pro | 30 | 60 | 60 |
| 7 | Expert | 30 | 90 | 90 |
| 8 | Enterprise | 90 | 90 | 90 |
| 9 | Executive | -1 | -1 | -1 |
| 10 | Unlimited | -1 | -1 | -1 |

---

## 3. container_types — Fixes Applied

Three SQL fixes applied to `container_types` and `user_class_permissions`.

### Fix 1 — `is_advertised` values set

The `is_advertised` column was added to `user_classes` in the previous session but
values had not been set. Fixed:

```sql
UPDATE public.user_classes SET is_advertised = true  WHERE class_number BETWEEN 3 AND 9;
UPDATE public.user_classes SET is_advertised = false WHERE class_number IN (1, 2, 10);
```

Classes 3–9 are advertised to members for upgrade. Classes 1, 2, and 10 are not.

### Fix 2 — Duplicate sort_order values in `container_types`

Multiple type codes shared the same sort_order, causing non-deterministic nav
ordering. Fixed using decimal values (sort_order is `numeric` type):

```sql
UPDATE public.container_types SET sort_order = 7.5  WHERE type_code = 'prompts';
UPDATE public.container_types SET sort_order = 10.1 WHERE type_code = 'magazines';
UPDATE public.container_types SET sort_order = 10.2 WHERE type_code = 'playlists';
UPDATE public.container_types SET sort_order = 14.5 WHERE type_code = 'episodes';
UPDATE public.container_types SET sort_order = 16.5 WHERE type_code = 'blogs';
```

### Fix 3 — `standups` sort_order inconsistency across classes

`standups` had sort_order 6 in `user_class_permissions` for Classes 5–6, but
sort_order 9 for Classes 7–10 (matching `container_types`). Normalised:

```sql
UPDATE public.user_class_permissions
SET sort_order = 9
WHERE container_type = 'standups' AND class_number IN (5, 6);
```

---

## 4. Development Issues — Platform Admin Configuration Area

Full list identified and triaged. Configuration-only items (capacity values, matrix
adjustments) are not tracked as development issues.

| # | Issue | Status |
|---|---|---|
| 1 | `AdminDashboardTabbed` blocks `admin` role — only `super` can access Platform Admin | ⏸️ Deferred |
| 2 | `forums` in `container_types` and matrix but no page/route exists | ⏸️ Deferred |
| 3 | `prompts` same — no page/route exists | ⏸️ Deferred (prior) |
| 4 | `is_advertised` values not set in DB | ✅ Fixed (see above) |
| 5 | Ticket → `user_class` upgrade flow — code path not verified | ⏸️ Deferred |
| 6 | Duplicate `sort_order` in `container_types` | ✅ Fixed (see above) |
| 7 | `standups` sort_order inconsistency across classes | ✅ Fixed (see above) |
| 8 | `checklists` display_name "Lists" vs type_code `checklists` | ⏸️ Deferred |

---

## 5. SIDEBAR_SETUP.md — Documentation Updates

File reviewed and updated to reflect current state. Changes made:

| Section | What changed |
|---|---|
| Access levels table | Clarified Platform Admin is currently `super` only in code; deferred fix noted |
| Platform Admin known issues | Added `AdminDashboardTabbed` role restriction as named deferred item |
| User Management | Replaced stale hardcoded class name list with DB-sourced names; noted `defaultClass` is fetched dynamically |
| User Class Management | Added as a full new section — was listed in Tab 2 but had no documentation |
| Container Configuration | Updated scope description to cover all nav item types; noted dynamic `userClasses` fetch; noted `forums`/`prompts` as deferred broken nav items |
| Tab 6 — Batch Container Delete | Noted container type list is now DB-driven |
| Tab 8 — Data Cleanup Utility | Noted container table list is now DB-driven |

---

## 6. Git Commits (April 19)

| Commit | Description |
|---|---|
| `3836cf3` | docs: update SIDEBAR_SETUP and add admin config migration |

All changes pushed to `origin/main` at `https://github.com/aigentjohn/connextedlabs.git`.

---

## Open / Deferred Items Carried Forward

| Item | Area |
|---|---|
| `AdminDashboardTabbed` blocks `admin` role | Platform Admin |
| `forums` page does not exist | Nav / Containers |
| `prompts` page does not exist | Nav / Containers |
| Ticket → user_class upgrade flow unverified | Access / Tickets |
| `checklists` display_name vs type_code alignment | container_types |
| `is_advertised` not yet editable in User Class Management UI | User Class Management |
| Future capacity and matrix configuration adjustments | Admin UI (not development) |
