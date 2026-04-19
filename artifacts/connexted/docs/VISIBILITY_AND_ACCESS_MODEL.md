# Visibility & Access Model

This document is the authoritative reference for how user permissions and content/container
visibility work on the platform. All implementation decisions should be checked against this.

Last updated: April 2026

---

## Purpose

The visibility model exists to **remove barriers to sharing**, not to create them.
Creators and admins should be able to share content and containers as freely as possible,
with just enough control to direct content to the right audience.

The core question the visibility setting answers is:

> *Who should be able to find and access this?*

The default should always lean toward accessible. `private` is the only state that
withholds. Every other state is about enabling sharing to a specific audience.

---

## 1. The Three User Systems

These are three independent attributes on every user record. They do different jobs
and must not be confused with each other.

### 1a. Platform Role (`users.role`)

Controls what a user can **do** — which admin and setup pages they can access and what
configuration changes they can make to the system.

| Value | What it grants |
|---|---|
| `member` | Standard platform access — no admin capabilities |
| `host` | Can host events and sessions |
| `moderator` | Can moderate content in assigned circles |
| `admin` | Can administer circles, manage members, access most admin pages |
| `coordinator` | Can coordinate programs |
| `manager` | Can manage programs and modify settings |
| `super` | Full platform administrator — unrestricted access to everything |

Role does **not** control content visibility or which nav items a user sees.

---

### 1b. User Class (`users.user_class`, integer 1–10)

Controls two things:

1. **Which nav items and routes appear** in the sidebar — which container types a user
   can navigate to
2. **Which content types a user can access** — the platform admin configures this via
   the ContainerConfigurationPage matrix. A user whose class is not permitted for a
   content type (e.g. `episodes`) cannot access any episode, regardless of its
   visibility setting. This is the platform-level governance gate.

| Class | Tier | Nav items unlocked |
|---|---|---|
| 1–2 | Starter / Guest | Home, News, Circles, Calendar |
| 3–6 | Member through Professional | + Tables, Meetings, Libraries, Checklists |
| 7–9 | Premium through Executive | + Standups, Sprints |
| 10 | Unlimited | + Elevators, Pitches, Builds, Meetups, Magazines, Playlists |

The permitted types for each class are stored in `user_class_permissions` and loaded
into `profile.permitted_types` at login. Admins (`admin`, `super`) bypass all class
restrictions.

---

### 1c. Membership Tier (`users.membership_tier`)

Controls access to **courses, cohort programs, and pathways** — the commercial and
enrollment layer of the platform.

| Value | What it grants |
|---|---|
| `free` | No access to paid courses or programs |
| `member` | Access to member-tier courses and programs |
| `premium` | Access to all courses, programs, and pathways |

Membership tier does **not** control nav visibility or content visibility directly.
It is the billing and enrollment signal used for course and program access.

---

## 2. Content vs. Container Types

The platform has two kinds of things: **containers** (spaces that hold other things
and have explicit membership) and **content** (individual pieces created by one author).

### Containers — have `member_ids` and `admin_ids`

Collaborative spaces where users can be members. Support `public | member | private`
visibility. Circles, Programs, and Courses have their own access models and are
treated separately.

| Container | DB table |
|---|---|
| Tables | `tables` |
| Elevators | `elevators` |
| Meetings | `meetings` |
| Pitches | `pitches` |
| Builds | `builds` |
| Standups | `standups` |
| Sprints | `sprints` |
| Meetups | `meetups` |
| Playlists | `playlists` |
| Libraries | `libraries` |
| Magazines | `magazines` |
| Checklists | `checklists` |

### Content — no inherent membership

Individual pieces created by one person. No `member_ids` of their own. Support
`public | premium | private` visibility. Access beyond `public` comes from the
companion or journey systems.

| Content type | DB table |
|---|---|
| Blogs | `blogs` |
| Episodes | `episodes` |
| Documents | `documents` |
| Posts | `posts` |
| Books | `books` |
| Decks | `decks` |

---

## 3. The Two Access Grant Systems

Beyond visibility settings, two systems grant access to content by relationship —
membership or enrollment overrides the content's own visibility for those users.

### 3a. Companion System — for Circles, Companies, Events, Friends

Circle admins (and equivalents) curate a pinned list of content and containers for
their members. Stored in `circle_companion_items` (and equivalent tables for other
companion surfaces).

- A flat, ordered list of pinned items
- Admin curates what members see
- Any content type can be pinned
- Circle members get access to pinned content regardless of the content's own
  visibility setting

**Companion contexts:** `circle` · `company` · `sponsor` · `event` · `friend`

### 3b. Journey System — for Programs and Courses

Programs and courses use structured journeys — ordered, multi-step learning paths
with completion tracking. Stored as `journeys` → `journey_items`.

- Structured, sequential content delivery
- Items have completion tracking, estimated time, and published state
- A program or course contains one or more journeys, each with ordered items
- Enrolled users get access to all journey items regardless of the item's own
  visibility setting

**Supported journey item types:** documents, episodes, books, decks, playlists,
checklists, builds, pitches, tables, elevators, standups, meetups, sprints,
events, discussions

### Access grant rule

> If content appears as a companion item or journey item in any context the user
> has membership or enrollment access to — they can access that content regardless
> of its own visibility setting.

| User is... | Access granted via... |
|---|---|
| Member of a Circle | `circle_companion_items` |
| Enrolled in a Program | `journey_items` on that program's journeys |
| Enrolled in a Course | `journey_items` on that course's journeys |

---

## 4. Visibility States

Visibility is stored on every content and container record as a `visibility` text
column. It controls both **who can access** the item and **where it appears** in
browse pages, search, and Explore/Discover.

### `public`
- Appears in browse pages, search results, and Explore/Discover for all users
- Any logged-in user whose class permits this type can open it
- The only state that makes something findable by people with no prior connection
- **Default for new content and containers**

### `member`  *(containers only)*
- Does **not** appear in public browse, search, or Discover
- Only visible to users already in `member_ids` of that container
- Applies to containers only — content does not have its own membership structure
- For content to be member-restricted, place it in a member-only container

### `premium`  *(content only)*
- Does **not** appear in public browse, search, or Discover
- Signals that this content was created specifically for a course or program
- Hidden from global browse so that non-enrolled users cannot find it
- Accessible to any user enrolled in a program or course that includes it
  as a journey item
- The `premium` flag is a **browse filter**, not a lock — journey enrollment
  handles actual access control

### `private`
- Only the creator can see it
- Invisible to all other users
- Does not appear in browse, search, or Discover
- Use for drafts, personal working files, or content not yet ready to share

---

## 5. Visibility Options by Type

Circles, Programs, and Courses are not included here — each has its own visibility
and membership model treated separately.

| Type | public | member | premium | private |
|---|:---:|:---:|:---:|:---:|
| Tables | ✅ | ✅ | — | ✅ |
| Elevators | ✅ | ✅ | — | ✅ |
| Meetings | ✅ | ✅ | — | ✅ |
| Pitches | ✅ | ✅ | — | ✅ |
| Builds | ✅ | ✅ | — | ✅ |
| Standups | ✅ | ✅ | — | ✅ |
| Sprints | ✅ | ✅ | — | ✅ |
| Meetups | ✅ | ✅ | — | ✅ |
| Playlists | ✅ | ✅ | — | ✅ |
| Libraries | ✅ | ✅ | — | ✅ |
| Magazines | ✅ | ✅ | — | ✅ |
| Checklists | ✅ | ✅ | — | ✅ |
| Blogs | ✅ | — | ✅ | ✅ |
| Episodes | ✅ | — | ✅ | ✅ |
| Documents | ✅ | — | ✅ | ✅ |
| Posts | ✅ | — | ✅ | ✅ |
| Books | ✅ | — | ✅ | ✅ |
| Decks | ✅ | — | ✅ | ✅ |

---

## 6. Discoverability Rules

| Visibility | Appears in browse / search / Discover | Accessible via direct URL |
|---|---|---|
| `public` | ✅ Yes — for permitted user classes | ✅ Yes |
| `member` | ❌ No — members find it through their container | ✅ Yes — for members only |
| `premium` | ❌ No — enrolled users find it through their journey | ✅ Yes — for enrolled users only |
| `private` | ❌ No | ✅ Creator only |

---

## 7. Access Override Rules

Regardless of visibility setting, the following always have access:

1. **The creator** (`created_by` matches user id)
2. **Container admins** (`admin_ids` includes user id)
3. **Circle/companion members** — any content pinned in a companion they belong to
4. **Program/course enrollees** — any content included in a journey they are enrolled in
5. **`super` role** — sees everything (moderation and administration)
6. **`admin` role** — sees everything except super-only admin pages

---

## 8. Implementation Reference

**Single source of truth for runtime access checks:**
`src/lib/visibility-access.ts`

Two core functions:
- `canViewContainer(profile, record, containerType)` — used on detail pages
- `filterByVisibility(records, profile, containerType)` — used on browse/list pages

**Visibility field:** `visibility` (text) on all tables
**Valid values:** `'public' | 'member' | 'premium' | 'private'`
**Content types use:** `'public' | 'premium' | 'private'` only
**Container types use:** `'public' | 'member' | 'private'` only

**Two-level content access check** (applied in order):

| Gate | Check |
|---|---|
| 1. Class gate | `profile.permitted_types.includes(contentType)` — loaded from `user_class_permissions` at login. If false, access is blocked regardless of visibility. |
| 2. Visibility check | `public` → pass · `premium` → journey enrollment check · `private` → creator only |

**Container access check:**

| State | Check |
|---|---|
| `public` | Always true |
| `member` | `record.member_ids.includes(profile.id)` |
| `private` | `record.created_by === profile.id` |

**UI selector component:** `src/app/components/unified/PrivacySelector.tsx`
- Pass `mode="content"` for content types → shows `public / premium / private`
- Pass `mode="container"` (default) for container types → shows `public / member / private`

**Visibility badge component:** `src/app/components/unified/VisibilityBadge.tsx`

**Legacy field notes:**
- `blogs` previously used `is_public` boolean — now has `visibility` column; `is_public` column remains for backward compatibility
- `documents` and `posts` previously used `access_level` text — now also have `visibility` column; `access_level` remains
- `libraries` and `magazines` previously used `is_public` boolean — now have `visibility` column
- `members-only` was a legacy visibility value on some container tables — migrated to `member`

---

## 9. Development Status

### Phase 1 — Schema cleanup ✅ Complete

- ✅ `visibility` column added to all content tables (blogs, episodes, documents, posts, books, decks)
- ✅ `visibility` column added to all container tables (tables, elevators, meetings, pitches, builds, standups, sprints, meetups, playlists, libraries, magazines, checklists)
- ✅ CHECK constraints applied — content: `public|premium|private`, containers: `public|member|private`
- ✅ `members-only` legacy values migrated to `member`
- ✅ `_premium` type codes removed from `user_class_permissions`
- ✅ `reviews` table does not yet exist — will need the same treatment when created

### Phase 2 — Runtime access logic ✅ Complete (partial)

- ✅ `visibility-access.ts` rewritten — `Visibility` type updated, `memberRequiresTier` removed, `isContent` flag added, two-level content access check implemented
- ✅ `VISIBILITY_RULES` config updated — all content types flagged `isContent: true`
- ⬜ `premium` access check — currently stubbed as `false`; needs journey enrollment lookup (`canAccessPremiumContent`)
- ⬜ Companion access check — needs `hasCompanionAccess` helper checking `circle_companion_items`

### Phase 3 — UI visibility selectors ✅ Complete

- ✅ `PrivacySelector` updated — `mode` prop controls content vs container option sets
- ✅ `VisibilityBadge` updated — `premium` entry added (amber/Star), `unlisted` and `members-only` removed
- ⬜ All create/manage forms need to pass correct `mode` prop to `PrivacySelector`

### Phase 4 — Browse and discovery pages ✅ Partial

- ✅ `BlogsPage`, `EpisodesPage` — `visibility` types updated, `unlisted` removed
- ⬜ `premium` content still excluded from browse (returns false) — will surface correctly once journey enrollment check is implemented in Phase 2
- ⬜ `member` containers should be filtered from Explore/Discover for non-members

### Phase 5 — ContainerConfigurationPage ✅ Complete

- ✅ `_premium` rows confirmed removed from matrix
- ✅ Info card updated to document the two-level access model
