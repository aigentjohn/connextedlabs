# Visibility & Access Model

This document is the authoritative reference for how user permissions and content/container
visibility work on the platform. All implementation decisions should be checked against this.

Last updated: April 2026

---

## 1. The Three User Systems

These are three independent attributes stored on every user record. They do different jobs
and should never be confused with each other.

### 1a. Platform Role (`users.role`)

Controls what a user can **do** — specifically which admin and setup pages they can access
and what configuration changes they can make to the system.

| Value | What it grants |
|---|---|
| `member` | Standard platform access — no admin capabilities |
| `host` | Can host events and sessions |
| `moderator` | Can moderate content within assigned circles |
| `admin` | Can administer circles, manage members, access most admin pages |
| `coordinator` | Can coordinate programs |
| `manager` | Can manage programs and modify settings |
| `super` | Full platform administrator — unrestricted access to all admin pages and data |

**Role does not control content visibility or navigation items.** It only gates
admin/setup functionality.

---

### 1b. User Class (`users.user_class`, integer 1–10)

Controls **which parts of the UI a user can see** — specifically which nav items and routes
are available to them. This is a capacity/access tier, not a billing concept.

| Class | Tier name | Nav items unlocked |
|---|---|---|
| 1–2 | Starter / Guest | Home, News, Circles, Calendar |
| 3–6 | Member through Professional | + Tables, Meetings, Libraries, Checklists |
| 7–9 | Premium through Executive | + Standups, Sprints |
| 10 | Unlimited | + Elevators, Pitches, Builds, Meetups, Magazines, Playlists |

**User class is enforced at the UI/nav level only.** It does not gate individual content
records or container detail pages. If a user has the URL to a public item, user_class does
not block them from seeing it.

---

### 1c. Membership Tier (`users.membership_tier`)

Controls access to **courses, cohort programs, and pathways** — the commercial/enrollment
layer of the platform.

| Value | What it grants |
|---|---|
| `free` | No access to paid courses or programs |
| `member` | Access to member-tier courses and programs |
| `premium` | Access to all courses, programs, and pathways |

**Membership tier does not control nav visibility or content visibility directly.**
It is the billing/enrollment signal used specifically for course and program access.

---

## 2. Content vs. Container Types

The platform has two kinds of things: **containers** (spaces that hold other things and
have explicit membership) and **content** (individual pieces created by one author).

### Containers — have `member_ids` and `admin_ids`

These are collaborative spaces. Users can be members. Visibility can be controlled
across all four states (see Section 3).

| Container | Description |
|---|---|
| Circles | Community groups |
| Tables | Collaborative workspaces |
| Elevators | Pitch and networking spaces |
| Meetings | Scheduled sessions |
| Pitches | Project pitches |
| Builds | Build projects |
| Standups | Team standups |
| Sprints | Sprint groups |
| Meetups | Events |
| Playlists | Curated episode collections |
| Libraries | Document collections |
| Magazines | Blog/article collections |
| Checklists | Task lists |
| Programs | Cohort programs (enrollment-based) |

### Content — no inherent membership

These are individual pieces created by one person. They do not have their own `member_ids`.
Access control comes from the container context they are shared into, not from the content
itself. Visibility options are limited to `public` or `private` only (see Section 3).

| Content type | Description |
|---|---|
| Blogs | Written articles |
| Episodes | Video or audio content |
| Documents | Files and documents |
| Posts | Social feed moments |
| Books | Long-form content |
| Decks | Presentations |
| Reviews | Review content |

---

## 3. Visibility States

Visibility is stored on every content and container record. It controls both **who can
access** the item and **where it appears** (browse pages, search, Explore/Discover).

### `public`

- Appears in browse pages, search results, and Explore/Discover for all users
- Any logged-in user can open it
- The only state that makes something findable by people with no prior connection to it

### `member`

- Does **not** appear in public browse, search, or Discover
- Only visible to users who are already members of that container (`member_ids`)
- **Applies to containers only.** Content types (blogs, episodes, documents, etc.) cannot
  be set to `member` because they have no membership structure of their own.
- For content to be member-restricted, it should be posted into a member-only container.
  The container's membership boundary applies.

### `premium`

- Does **not** appear in public browse, search, or Discover
- Only visible to users who are enrolled in a course or cohort program
- Applies to containers and content that are specifically designated as course/program material
- The check is enrollment in a program — not the `membership_tier` column on the user record

### `private`

- Only the creator can see it
- Invisible to all other users including admins browsing the platform
  (super role can always access for moderation purposes)
- Does not appear in browse, search, or Discover
- Use this for drafts, personal working files, or content not yet ready to share

---

## 4. Visibility Options by Type

| Type | public | member | premium | private |
|---|:---:|:---:|:---:|:---:|
| Circles | ✅ | ✅ | ✅ | ✅ |
| Tables | ✅ | ✅ | ✅ | ✅ |
| Elevators | ✅ | ✅ | ✅ | ✅ |
| Meetings | ✅ | ✅ | ✅ | ✅ |
| Pitches | ✅ | ✅ | ✅ | ✅ |
| Builds | ✅ | ✅ | ✅ | ✅ |
| Standups | ✅ | ✅ | ✅ | ✅ |
| Sprints | ✅ | ✅ | ✅ | ✅ |
| Meetups | ✅ | ✅ | ✅ | ✅ |
| Playlists | ✅ | ✅ | ✅ | ✅ |
| Libraries | ✅ | ✅ | ✅ | ✅ |
| Magazines | ✅ | ✅ | ✅ | ✅ |
| Checklists | ✅ | ✅ | ✅ | ✅ |
| Programs | ✅ | ✅ | ✅ | ✅ |
| Blogs | ✅ | — | — | ✅ |
| Episodes | ✅ | — | — | ✅ |
| Documents | ✅ | — | — | ✅ |
| Posts | ✅ | — | — | ✅ |
| Books | ✅ | — | — | ✅ |
| Decks | ✅ | — | — | ✅ |
| Reviews | ✅ | — | — | ✅ |

---

## 5. Discoverability Rules

| Visibility | Appears in browse/search/Discover | Accessible via direct URL |
|---|---|---|
| `public` | ✅ Yes — for all users | ✅ Yes |
| `member` | ❌ No — members find it through their container | ✅ Yes — for members only |
| `premium` | ❌ No — enrolled users find it through their program | ✅ Yes — for enrolled users only |
| `private` | ❌ No | ✅ Creator only |

---

## 6. Access Override Rules

Regardless of visibility setting, the following always have access:

1. **The creator** (`created_by` matches user id) — always sees their own content
2. **Container admins** (`admin_ids` includes user id) — always see content in their container
3. **`super` role** — sees everything on the platform (moderation/administration)
4. **`admin` role** — sees everything except super-only admin pages

---

## 7. Implementation Reference

**Single source of truth for runtime access checks:**
`src/lib/visibility-access.ts`

Two core functions:
- `canViewContainer(profile, record, containerType)` — used on detail pages
- `filterByVisibility(records, profile, containerType)` — used on browse/list pages

**Visibility field naming:**
- All tables use `visibility` (string field)
- Valid values: `'public' | 'member' | 'premium' | 'private'`
- Content types only use: `'public' | 'private'`

**What drives each check:**
- `public` → always true
- `member` → `record.member_ids.includes(profile.id)`
- `premium` → user is enrolled in a course or program (check `program_members` or `enrollments` table)
- `private` → `record.created_by === profile.id`

---

## 8. Known Migration Items

The following gaps exist between this documented model and the current implementation.
These are tracked as pending work.

- [ ] `memberRequiresTier` flag in `visibility-access.ts` checks `user_class_permissions`
      instead of actual membership — remove and replace with `member_ids` check
- [ ] `premium` visibility value does not exist in DB schema or runtime checks — needs
      adding to visibility type and implementing against program enrollment
- [ ] `unlisted` visibility value still exists in DB — deprecate and migrate records
      to either `public` or `private`
- [ ] Content type visibility selectors (blogs, episodes, documents, etc.) currently
      offer `member` as an option in the UI — should be removed, leaving only
      `public` and `private`
- [ ] Magazines uses `is_public` (boolean) instead of `visibility` (string) — normalize
      to match all other containers
- [ ] `user_class_permissions` table contains content type entries (documents, episodes,
      blogs, etc.) that gate content access by user_class — these should be removed,
      leaving only nav container type entries
