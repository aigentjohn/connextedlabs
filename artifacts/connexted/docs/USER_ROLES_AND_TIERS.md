# User Roles, User Class & Membership Tier

**Last updated:** April 2026

Three independent systems that work together. Each governs a distinct dimension of what a user can do on the platform.

---

## The Three Systems at a Glance

| System | Field | Controls | Assigned by | Future model |
|--------|-------|----------|-------------|--------------|
| **Role** | `users.role` + context arrays | Authority — what actions you can perform | Platform admin manually, or contextually within a circle/program/container | Unchanged — operational, not commercial |
| **User Class** | `users.user_class` (1–10) | Access — which content types and container types you can use (the class configuration matrix) | Platform admin manually or via tickets | Tickets / one-time purchases unlock higher classes |
| **Membership Tier** | `users.membership_tier` | Markets — access to the commercial marketplace layer (companies, offerings, analytics) | Platform admin manually or via billing event | Recurring subscription sets and maintains the tier |

---

## 1. Roles — Authority

### What it is
Roles define **what actions a user is authorised to take**. There are two scopes: platform-wide (stored on `users.role`) and contextual (stored as arrays on circles, programs, and containers).

### Role hierarchy
```
member → host → moderator → admin → coordinator → manager → super
  0         1        2          3          4            5        6
```
Higher level = more authority. Permission checks use `hasRoleLevel()` — a manager implicitly passes all checks for coordinator, admin, moderator, host, and member.

### Platform-wide roles (stored on `users.role`)

| Role | Who has it | What it unlocks |
|------|-----------|-----------------|
| `member` | All regular users (default) | Participate in circles and containers |
| `admin` | Trusted platform operators | Platform admin dashboard; manage users, circles, programs |
| `super` | Platform owner | Full access; promote/demote admins; bypass all permission checks |

> `users.role` only stores `member`, `admin`, or `super`. The richer roles below are contextual — they live on the container/circle/program record, not the user.

### Contextual roles (stored as array columns on the resource)

| Role | Assigned via | Scope | What it allows |
|------|-------------|-------|----------------|
| `host` | `container.admin_ids` | Container (Table, Elevator, Meeting, Pitch, Build, Standup, Meetup, Sprint) | Administer a single container |
| `moderator` | `circle.moderator_ids` | Circle | Moderate content; remove posts; manage flagged items |
| `admin` | `circle.admin_ids` | Circle | Administer circle; manage members; edit settings |
| `coordinator` | `program.coordinator_ids` | Program | Manage members; mark completions; view progress |
| `manager` | `program.manager_ids` | Program | Full program administration; edit content; manage journeys |

A user can hold different contextual roles in different circles/programs simultaneously. Their platform-wide `users.role` is unaffected.

### Where roles are checked
- `src/lib/permissions/circlePermissions.ts` — circle CRUD and membership actions
- `src/lib/permissions/containerPermissions.ts` — container CRUD and hosting
- `src/lib/permissions/programPermissions.ts` — program management and coordination
- `src/lib/constants/roles.ts` — hierarchy, level comparisons, display labels

### How to assign roles
- **Platform-wide**: `/platform-admin/users/:userId` — Promote to Admin / Demote to Member; also via CSV import
- **Circle roles**: Circle Settings → Members tab
- **Container roles**: Container Settings → Members tab
- **Program roles**: Program admin dashboard → Team tab

---

## 2. User Class — Content & Container Access

### What it is
User class is a **number from 1 to 10** that controls which **content types** and **container types** a user can access, via the class configuration matrix (`user_class_permissions` table). It has nothing to do with the marketplace — it governs the community and learning layer of the platform.

At login, the user's class is looked up and a `permitted_types` array is loaded. Every content access check (`visibility-access.ts`) runs against this array as Gate 1 before checking visibility. The sidebar navigation also filters to show only the container types the user's class permits.

> From `visibility-access.ts`: *"Use this [permitted_types] for the content class gate — do NOT use membership_tier."*

### Class configuration matrix

The `user_class_permissions` table maps each class number to the container/content types it can access. Managed via `/platform-admin/container-configuration`.

Current default thresholds (overridable per type in the DB):

| Class | Container types unlocked |
|-------|--------------------------|
| 0+ | Home, News, Circles, Calendar |
| 3+ | Tables, Meetings, Libraries, Lists |
| 7+ | Standups, Sprints |
| 10 | Elevators, Pitches, Builds, Meetups |

Admin and super roles bypass class entirely.

### How to assign user class
- **Today:** Platform admin sets `user_class` via `/platform-admin/users` (inline dropdown) or `/platform-admin/users/:userId`
- **Future:** Purchasing a ticket or completing a program automatically advances the class

### Where it's checked
- `src/lib/visibility-access.ts` — Gate 1 content class check (`permitted_types`)
- `src/lib/auth-context.tsx` — loads `user_class_permissions` on login, builds `permitted_types` + `visible_containers`
- `src/lib/nav-config.ts` — `min_class` per nav item filters the sidebar

---

## 3. Membership Tier — Markets & Commercial Access

### What it is
Membership tier is a **string** (`free` | `member` | `premium`) that controls access to the **commercial marketplace layer** — specifically the Markets feature. It governs whether a user can create companies, list offerings, and view marketplace analytics. It does **not** gate content types, containers, or circles.

> From `visibility-access.ts`: *"do NOT use membership_tier"* for content/container access — that is user class territory.

### What the membership tier matrix controls

Managed via `/platform-admin/membership-tier-permissions` (the membership tier matrix). Values live in the `membership_tier_permissions` table; hardcoded fallbacks apply if a row is missing.

| Tier | Can create company | Max companies | Max offerings per company | Featured listings | Analytics |
|------|-------------------|---------------|--------------------------|-------------------|-----------|
| `free` | No | 0 | 0 | No | No |
| `member` | Yes | 1 | 5 | No | No |
| `premium` | Yes | 3 | Unlimited | Yes | Yes |

Also controls `accessible_market_ids` — which markets a tier can place offerings into (array of market UUIDs, configured per tier in the DB).

### How to assign membership tier
- **Today:** Platform admin sets `membership_tier` via `/platform-admin/users` (inline dropdown) or `/platform-admin/users/:userId`
- **Future:** Billing webhook sets tier automatically on subscription start, renewal, and cancellation

### Where it's checked
- `src/lib/tier-permissions.ts` — `getTierPermissions()` and `checkMarketAccess()`
- `MyVenturesPage.tsx` — gates company creation
- `CreateOfferingPage.tsx` — gates offering creation

---

## 4. How the Three Systems Interact

Example: a user with `role = 'member'`, `user_class = 7`, `membership_tier = 'member'`, who is a circle admin in one circle:

| Capability | System | Result |
|-----------|--------|--------|
| Access `/platform-admin` | Role (`member`) | ❌ No |
| Access Standups in sidebar | User class (7, threshold = 7) | ✅ Yes |
| Access Elevators in sidebar | User class (7, threshold = 10) | ❌ No |
| View a `public` episode | User class (permitted_types includes `episodes`) | ✅ Yes |
| Create a company in Markets | Membership tier (`member`) | ✅ Yes (max 1) |
| Create a second company | Membership tier (`member`, limit = 1) | ❌ No |
| View marketplace analytics | Membership tier (`member`, analytics = No) | ❌ No |
| Post in their own circle | Contextual role (`admin` of that circle) | ✅ Yes |
| Delete another user's post in a circle they only joined | Contextual role (`member` in that circle) | ❌ No |

---

## 5. Future Model

### Membership Tier → Subscription (recurring billing)
```
subscribe to "Member" plan  →  membership_tier = 'member'
subscribe to "Premium" plan →  membership_tier = 'premium'
subscription lapses         →  membership_tier = 'free'
```
**What needs building:**
- Billing provider webhook → `set-membership-tier` Edge Function
- Downgrade policy: what happens to a user's companies/offerings if they drop below the limit

### User Class → Tickets & One-Time Purchases
```
purchase "Community Access" ticket  →  user_class = 3
purchase "Full Access" ticket        →  user_class = 10
complete a Program                   →  user_class advances to defined threshold
```
**What needs building:**
- `access_tickets` → `user_class` upgrade rule (Edge Function or DB trigger)
- Admin UI: "this ticket grants class X" on TicketTemplatesAdmin
- Program completion → class advancement rule

### Roles — No automation needed
Roles are assigned intentionally. Contextual roles (host, moderator, coordinator) are granted when a user is added to a circle/container/program in that capacity.

---

## 6. Current Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Billing webhook → `membership_tier` not built | Tier must be set manually after payment | High — needed before public launch |
| User class upgrade via ticket not implemented | Class advancement must be done manually | Medium |
| Downgrade policy for membership_tier not defined | Undefined behaviour if premium user drops to member with 3 companies | Medium — policy decision needed first |
| `platform_admin` role string in some older components | Inconsistency with canonical `admin` value | Low — cleanup task |
