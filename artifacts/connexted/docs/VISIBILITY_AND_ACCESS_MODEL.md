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

Controls **which parts of the UI a user can navigate to** — which nav items and routes
are available. This is a capacity tier, not a billing concept.

| Class | Tier | Nav items unlocked |
|---|---|---|
| 1–2 | Starter / Guest | Home, News, Circles, Calendar |
| 3–6 | Member through Professional | + Tables, Meetings, Libraries, Checklists |
| 7–9 | Premium through Executive | + Standups, Sprints |
| 10 | Unlimited | + Elevators, Pitches, Builds, Meetups, Magazines, Playlists |

User class is enforced at the **UI/nav level only**. It does not gate individual content
records or container detail pages. A user who receives a direct link to a public item
is not blocked by their user class.

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

Collaborative spaces where users can be members. Support the full range of visibility
options.

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
| Courses | Structured learning (enrollment-based) |

### Content — no inherent membership

Individual pieces created by one person. No `member_ids` of their own. Access comes
either from global visibility (`public`) or from the context they are placed into
via the companion or journey systems.

| Content type | Description |
|---|---|
| Blogs | Written articles |
| Episodes | Video or audio content |
| Documents | Files and documents |
| Posts | Social feed moments |
| Books | Long-form content |
| Decks | Presentations and flashcards |
| Reviews | Review content |

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

Visibility is stored on every content and container record. It controls both
**who can access** the item and **where it appears** in browse pages, search,
and Explore/Discover.

### `public`
- Appears in browse pages, search results, and Explore/Discover for all users
- Any logged-in user can open it
- The only state that makes something findable by people with no prior connection
- **Default for new content and containers**

### `member`  *(containers only)*
- Does **not** appear in public browse, search, or Discover
- Only visible to users already in `member_ids` of that container
- Applies to containers only — content does not have its own membership structure
- For content to be member-restricted, place it in a member-only container;
  the container's membership boundary applies

### `premium`  *(content only)*
- Does **not** appear in public browse, search, or Discover
- Signals that this content was created specifically for a course or program
- Hidden from global browse so that non-enrolled users cannot find it
- Accessible to any user enrolled in a program or course that includes it
  as a journey item
- The `premium` flag is a **browse filter**, not a lock — the journey enrollment
  check handles actual access control

### `private`
- Only the creator can see it
- Invisible to all other users
- Does not appear in browse, search, or Discover
- Use for drafts, personal working files, or content not yet ready to share

---

## 5. Visibility Options by Type

| Type | public | member | premium | private |
|---|:---:|:---:|:---:|:---:|
| Circles | ✅ | ✅ | — | ✅ |
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
| Programs | ✅ | ✅ | — | ✅ |
| Courses | ✅ | ✅ | — | ✅ |
| Blogs | ✅ | — | ✅ | ✅ |
| Episodes | ✅ | — | ✅ | ✅ |
| Documents | ✅ | — | ✅ | ✅ |
| Posts | ✅ | — | ✅ | ✅ |
| Books | ✅ | — | ✅ | ✅ |
| Decks | ✅ | — | ✅ | ✅ |
| Reviews | ✅ | — | ✅ | ✅ |

---

## 6. Discoverability Rules

| Visibility | Appears in browse / search / Discover | Accessible via direct URL |
|---|---|---|
| `public` | ✅ Yes — for all users | ✅ Yes |
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

**Visibility field:** `visibility` (string) on all tables  
**Valid values:** `'public' | 'member' | 'premium' | 'private'`  
**Content types use:** `'public' | 'premium' | 'private'` only  
**Container types use:** `'public' | 'member' | 'private'` only

**Runtime check logic per state:**

| State | Check |
|---|---|
| `public` | Always true |
| `member` | `record.member_ids.includes(profile.id)` |
| `premium` | User is enrolled in any program/course whose journey contains this item |
| `private` | `record.created_by === profile.id` |

---

## 9. Development Plan

The following work is required to bring the codebase in line with this model.
Items are ordered by dependency — earlier items unblock later ones.

### Phase 1 — Schema cleanup (DB migrations)

- [ ] **Add `premium` to visibility enum**
  Add `'premium'` as a valid value to the `visibility` column on all content tables
  (blogs, episodes, documents, posts, books, decks, reviews)

- [ ] **Migrate `unlisted` records**
  Any existing records with `visibility = 'unlisted'` should be migrated:
  - If `created_by` only → set to `private`
  - If publicly shared → set to `public`
  Then drop `unlisted` as a valid value

- [ ] **Normalize Magazines**
  Magazines currently use `is_public` (boolean). Replace with `visibility` field
  matching all other containers. Migrate: `is_public = true` → `public`,
  `is_public = false` → `private`

- [ ] **Remove content type entries from `user_class_permissions`**
  The entries for `documents`, `episodes`, `blogs`, `reviews`, `decks`, `books`,
  `posts`, `documents_premium`, `episodes_premium`, `decks_premium` should be
  removed. User class only controls nav item visibility, not content access.

### Phase 2 — Runtime access logic (`visibility-access.ts`)

- [ ] **Remove `memberRequiresTier` flag**
  This flag currently routes `member` visibility on content through `user_class_permissions`.
  Remove it entirely. Content types no longer support `member` visibility.

- [ ] **Add `premium` access check**
  When `visibility = 'premium'`, check if the user is enrolled in any program or course
  whose `journey_items` includes this content item. Implement as a helper function:
  `canAccessPremiumContent(profile, contentType, contentId)`.
  Preload enrolled program/course IDs into the user's session profile to avoid
  per-item queries on browse pages.

- [ ] **Add companion access check**
  When a user attempts to access non-public content, also check `circle_companion_items`
  (and equivalent companion tables) to see if the item is pinned in any context the
  user belongs to. Implement as: `hasCompanionAccess(profile, contentType, contentId)`.

- [ ] **Update `VISIBILITY_RULES` config**
  Remove all `memberRequiresTier: true` entries for content types.
  Update the `Visibility` type to include `'premium'`.

### Phase 3 — UI visibility selectors

- [ ] **Content visibility selectors** (blogs, episodes, documents, etc.)
  Replace current options (public / member / unlisted / private) with:
  `public` · `premium` · `private`
  Remove `member` and `unlisted` options from all content create/manage forms.

- [ ] **Container visibility selectors** (circles, tables, playlists, etc.)
  Replace current options with: `public` · `member` · `private`
  Remove `unlisted` option from all container create/manage forms.

- [ ] **Visibility option labels**
  Use plain language in the UI. Suggested labels:
  - `public` → "Anyone can find this"
  - `member` → "Members only"
  - `premium` → "Course & program members only"
  - `private` → "Only me"

### Phase 4 — Browse and discovery pages

- [ ] **Filter `premium` content from global browse pages**
  BlogsPage, EpisodesPage, DocumentsPage, and all other content browse pages
  should exclude `visibility = 'premium'` records from results unless the user
  is enrolled in a program/course that includes them.

- [ ] **Filter `member` containers from public Discover/Explore**
  Containers with `visibility = 'member'` should not appear in Explore/Discover
  or global search for users who are not already members.

- [ ] **Surface `premium` content within journey pages**
  Program and course journey views should show all enrolled content regardless
  of visibility setting — the enrollment check has already passed by the time
  the user is on the journey page.

### Phase 5 — ContainerConfigurationPage cleanup

- [ ] **Split nav permissions from content permissions**
  Remove the content type rows (documents, episodes, etc.) from the
  ContainerConfigurationPage matrix. It should only show nav container types.
  Content access is now handled entirely by the visibility + companion/journey model.
