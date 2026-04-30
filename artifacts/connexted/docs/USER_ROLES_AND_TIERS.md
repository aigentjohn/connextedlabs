# User Roles, User Class, Membership Tier & Commercial Framework

**Last updated:** April 2026

This document covers all the systems that control what a user can do, access, and create on the platform — including the commercial and sponsor layers.

---

## The Core Systems at a Glance

| System | Field | Controls | Assigned by | Future model |
|--------|-------|----------|-------------|--------------|
| **Role** | `users.role` + context arrays | Authority — what actions you can perform | Platform admin manually, or contextually within a circle/program/container | Unchanged — operational, not commercial |
| **User Class** | `users.user_class` (1–10) | Access — which content types and container types you can use (the class configuration matrix) | Platform admin manually or via tickets | Tickets / one-time purchases unlock higher classes |
| **Membership Tier** | `users.membership_tier` | Markets — access to the commercial marketplace layer (companies, offerings, analytics) | Platform admin manually or via billing event | Recurring subscription sets and maintains the tier |
| **Subscription** | `user_subscriptions` table | Capacity — how many circles/containers you can join or admin; whether you can purchase programs | Subscription purchase or admin manual entry | Automated via billing provider webhook |
| **Sponsor Tier** | `sponsor_tiers` table | Sponsor capabilities — which container types a sponsor organisation can create and how many | Platform admin assigns sponsor tier when creating sponsor | Driven by sponsorship agreement |

---

## 1. Roles — Authority

### What it is
Roles define **what actions a user is authorised to take**. Two scopes: platform-wide (stored on `users.role`) and contextual (stored as arrays on circles, programs, and containers).

### Role hierarchy
```
member → host → moderator → admin → coordinator → manager → super
  0         1        2          3          4            5        6
```
Higher level = more authority. `hasRoleLevel()` — a manager implicitly passes all checks for coordinator, admin, moderator, host, and member.

### Platform-wide roles (stored on `users.role`)

| Role | Who has it | What it unlocks |
|------|-----------|-----------------|
| `member` | All regular users (default) | Participate in circles and containers |
| `admin` | Trusted platform operators | Platform admin dashboard; manage users, circles, programs |
| `super` | Platform owner | Full access; promote/demote admins; bypass all permission checks |

`users.role` only stores `member`, `admin`, or `super`. The richer roles below are contextual — they live on the container/circle/program record.

### Contextual roles (stored as array columns on the resource)

| Role | Assigned via | Scope | What it allows |
|------|-------------|-------|----------------|
| `host` | `container.admin_ids` | Container (Table, Elevator, Meeting, Pitch, Build, Standup, Meetup, Sprint) | Administer a single container |
| `moderator` | `circle.moderator_ids` | Circle | Moderate content; remove posts; manage flagged items |
| `admin` | `circle.admin_ids` | Circle | Administer circle; manage members; edit settings |
| `coordinator` | `program.coordinator_ids` | Program | Manage members; mark completions; view progress |
| `manager` | `program.manager_ids` | Program | Full program administration; edit content; manage journeys |

A user can hold different contextual roles across different circles/programs simultaneously. Their platform-wide `users.role` is unaffected.

### Where roles are checked
- `src/lib/permissions/circlePermissions.ts`
- `src/lib/permissions/containerPermissions.ts`
- `src/lib/permissions/programPermissions.ts`
- `src/lib/constants/roles.ts` — hierarchy, levels, display labels

### How to assign roles
- **Platform-wide**: `/platform-admin/users/:userId` — Promote to Admin / Demote to Member; also via CSV import
- **Circle roles**: Circle Settings → Members tab
- **Container roles**: Container Settings → Members tab
- **Program roles**: Program admin dashboard → Team tab

---

## 2. User Class — Content & Container Access

### What it is
User class is a **number from 1 to 10** that controls which content types and container types a user can access, via the class configuration matrix (`user_class_permissions` table). It governs the community and learning layer — not the marketplace.

At login, the user's class is looked up and a `permitted_types` array is loaded. Every content access check runs against this array as Gate 1 before checking visibility.

> From `visibility-access.ts`: *"Use this [permitted_types] for the content class gate — do NOT use membership_tier."*

### Class configuration matrix

The `user_class_permissions` table maps each class to the container/content types it can access. Managed via `/platform-admin/container-configuration`.

| Class | Container types unlocked |
|-------|--------------------------|
| 0+ | Home, News, Circles, Calendar |
| 3+ | Tables, Meetings, Libraries, Lists |
| 7+ | Standups, Sprints |
| 10 | Elevators, Pitches, Builds, Meetups |

Admin and super roles bypass class entirely.

### How to assign user class
- **Today:** Platform admin sets `user_class` via `/platform-admin/users` (inline dropdown) or `/platform-admin/users/:userId`
- **Future:** Purchasing a ticket or completing a program automatically advances the class (see Section 6)

### Where it's checked
- `src/lib/visibility-access.ts` — Gate 1 content class check (`permitted_types`)
- `src/lib/auth-context.tsx` — loads `user_class_permissions` on login, builds `permitted_types` + `visible_containers`
- `src/lib/nav-config.ts` — `min_class` per nav item filters the sidebar

---

## 3. Membership Tier — Markets & Commercial Access

### What it is
Membership tier (`free` | `member` | `premium`) controls access to the **commercial marketplace layer** — the Markets feature. It governs company creation, listings, and analytics. It does **not** gate content types, containers, or circles — that is user class territory.

### Membership tier matrix

Managed via `/platform-admin/membership-tier-permissions`. Values live in `membership_tier_permissions` table; hardcoded fallbacks apply if a row is missing.

| Tier | Can create company | Max companies | Max offerings | Featured listings | Analytics |
|------|-------------------|---------------|---------------|-------------------|-----------|
| `free` | No | 0 | 0 | No | No |
| `member` | Yes | 1 | 5 | No | No |
| `premium` | Yes | 3 | Unlimited | Yes | Yes |

Also controls `accessible_market_ids` — which markets a tier can place offerings into.

### How to assign
- **Today:** Platform admin sets `membership_tier` via `/platform-admin/users`
- **Future:** Billing webhook sets tier automatically on subscription start, renewal, cancellation

### Where it's checked
- `src/lib/tier-permissions.ts` — `getTierPermissions()` and `checkMarketAccess()`
- `MyVenturesPage.tsx` — gates company creation
- `CreateOfferingPage.tsx` — gates offering creation

---

## 4. Subscriptions — Circle & Container Capacity

### What it is
The subscription system (`user_subscriptions` table + `membership_tiers` table) controls **how many** circles and containers a user can join and admin. It is separate from the `membership_tier` string — this is the capacity/billing layer for community participation.

A user has an active subscription when `user_subscriptions.is_active = true` and `payment_status IN ('paid', 'trial')`.

### Subscription tier limits (from `membership_tiers` table)

| Limit | Field | Notes |
|-------|-------|-------|
| Max circles joined | `max_circles` | -1 = unlimited |
| Max containers joined | `max_containers` | -1 = unlimited |
| Max circles as admin | `max_admin_circles` | -1 = unlimited |
| Max containers as admin | `max_admin_containers` | -1 = unlimited |
| Can purchase programs | `can_purchase_programs` | boolean |
| Can host containers | `can_host_containers` | boolean |
| Can create circles | `can_create_circles` | boolean |
| Can moderate | `can_moderate` | boolean |

Tier 9–10 (`hasUnlimitedAccess()`) bypasses all capacity checks.

### Where it's checked
- `src/lib/tier-limits.ts` — `canJoinCircle()`, `canCreateCircle()`, `canJoinContainer()`, `canHostContainer()`, `canPurchaseProgram()`

### Admin management
- `/platform-admin/users/:userId` → UserSubscriptionManager — create/edit subscription, set tier, payment status, billing cycle, period dates, override flag
- Changing subscription tier automatically syncs `users.user_class` to match the tier's class number

### Subscription packages (pricing/marketing)
- `/platform-admin/subscription-packages` — define publicly visible tiers with monthly/yearly price, feature list, and which `user_class_number` they map to
- Stored in a `subscription_tiers` table via Edge Function endpoint

### Bundles — not yet implemented
Subscriptions are currently individual tier purchases. Bundles (combining multiple tiers, content access, or sponsor benefits into one package) are a future commercial model — no table or UI exists yet.

**Design decision needed:** Should bundles be implemented as:
- A `bundles` table mapping a bundle to a set of tier grants and ticket grants?
- Or as a single subscription tier that encompasses the combined access?

---

## 5. Pathways, Courses & Cohort Programs — Creation Gating

### Current state — role-gated, not tier-gated

Creation of learning structures is gated by **role**, not subscription or user class:

| Entity | Who can create | Role required | Where checked |
|--------|---------------|---------------|---------------|
| **Pathway** | Platform admins | `admin` (level 3+) | `PathwayAdminPage.tsx` — `hasRoleLevel(profile.role, 'admin')` |
| **Program** | Platform managers | `manager` (level 5+) | `CreateProgramPage.tsx` — `canManagePrograms(profile.role)` |
| **Course** | Platform managers | `manager` (level 5+) | Same pattern as programs |
| **Circle** | Tier + capacity | `can_create_circles` boolean + `maxAdminCircles` count | `tier-limits.ts` — `canCreateCircle()` |
| **Container (hosted)** | Tier permission | `can_host_containers` boolean | `tier-limits.ts` — `canHostContainer()` |

### Future model — member-created pathways, courses, and cohort programs

The platform will eventually allow **members** to create their own learning structures. This requires a design decision on whether creation rights are unlocked by:

**Option A — Role-based (current approach extended)**
A member is promoted to `coordinator` or `manager` contextually (e.g. within their own circle) and gains program/pathway creation rights within that scope.

**Option B — Subscription-based**
A higher subscription tier includes `can_create_pathway` or `can_create_program` permissions, allowing any member on that tier to create learning structures.

**Option C — Ticket/one-time purchase**
A "Creator" ticket unlocks pathway or program creation for a user regardless of tier, associated with user class advancement.

**Option D — Membership tier (marketplace-style)**
Member-created pathways and cohorts become a marketplace product — users on `premium` tier can create and sell cohort programs, treated like companies/offerings in the marketplace.

**Recommendation:** Option D aligns with the existing architecture — pathways and cohort programs created by members would sit under their company in the Markets layer, gated by `membership_tier = 'premium'`. Platform-run programs remain role-gated (manager/super only).

**Design decisions needed:**
- Can a `member` tier user create a pathway for their own use (private, no charge)?
- Can a `premium` tier user create a cohort program and charge for it?
- Does cohort program creation require a company in the marketplace first?

---

## 6. Sponsors

### What it is
Sponsors are **organisations** (not individual users) that partner with the platform. They have their own member directory, role hierarchy, and tier-based permissions for creating and hosting containers.

### Data model
- `sponsors` — organisation record (name, slug, logo, website, contact, `tier_id`)
- `sponsor_tiers` — Bronze / Silver / Gold / Platinum (each with a `tier_level`)
- `sponsor_members` — users who belong to a sponsor (`role`: owner, director, admin, member, viewer)
- `sponsor_tier_permissions` — which container types a sponsor tier can create (`container_type`, `can_view`, `can_create`, `max_count`)
- `sponsor_companion_items` — curated content pinned to the sponsor profile

### Sponsor role hierarchy

```
owner → director → admin → member → viewer
```

| Role | What it allows |
|------|----------------|
| `owner` | Full control; financial responsibility; can transfer ownership |
| `director` | Full admin capability; designated financial contact |
| `admin` | Create/delete containers; manage sponsor members |
| `member` | Participate in sponsor containers; no management |
| `viewer` | Read-only access to sponsor content |

### Sponsor tier permissions matrix

Each sponsor tier (Bronze → Platinum) defines which container types the sponsor can create and how many, via `sponsor_tier_permissions`. Managed via `/platform-admin/sponsor-tiers`.

### How sponsors appear on the platform
- Sponsor logo/name appears on containers they host (`sponsor_id` FK on container records)
- Elevators, Pitches, Tables, Meetings, Builds, and Meetups support `sponsor_id`
- Sponsor profile page accessible via `/sponsors/:slug`
- Sponsor Companion surface — curated resource panel visible in their containers

### Admin management
- `/platform-admin/sponsors` — create sponsors, assign tier, manage members
- `/platform-admin/sponsor-tiers` — configure Bronze/Silver/Gold/Platinum permissions

### Relationship to membership tier and user class
Sponsorship is **independent** of a user's `membership_tier` and `user_class`. A user can be a sponsor admin at any tier or class. Sponsor capabilities are governed by the sponsor's tier, not the individual user's subscription.

---

## 7. Account Management

### User-facing (`/my-account`)

Every user has an account management page covering:

| Feature | Status | Notes |
|---------|--------|-------|
| Membership info | ✅ Live | Displays current `membership_tier` and subscription status |
| Data export (GDPR) | ✅ Live | Calls `account-export` Edge Function; downloads full JSON of all user content |
| Schedule account deletion | ✅ Live | Calls `account-delete` Edge Function; sets `users.deleted_at`; 30-day grace period before hard delete |
| Cancel deletion | ✅ Live | Calls `account-delete` (DELETE method); clears `deleted_at` |

The hard delete runs nightly via the `hard-delete-accounts` scheduled Edge Function — permanently removes users whose `deleted_at` is older than 30 days.

### Admin-facing (`/platform-admin/account-management`)

Platform admin tool for exporting and importing user account data as JSON. Used for backup/restore and migration. Super admin only.

### Future account management scope

As subscriptions and bundles mature, account management will need to surface:
- Current subscription plan with upgrade/downgrade actions
- Billing history and invoices
- Active tickets and access grants
- Bundle contents and expiry dates
- Connected sponsor memberships

---

## 8. How the Systems Interact — Example

Example: a `member` role user, `user_class = 7`, `membership_tier = 'member'`, active subscription (can_host_containers = true), and admin of one sponsor at Silver tier:

| Capability | System | Result |
|-----------|--------|--------|
| Access `/platform-admin` | Role (`member`) | ❌ No |
| Access Standups in sidebar | User class (7, threshold = 7) | ✅ Yes |
| Access Elevators in sidebar | User class (7, threshold = 10) | ❌ No |
| View a public episode | User class (permitted_types includes `episodes`) | ✅ Yes |
| Create a company in Markets | Membership tier (`member`) | ✅ Yes (max 1) |
| View marketplace analytics | Membership tier (`member`, analytics = No) | ❌ No |
| Create a circle | Subscription (`can_create_circles`) | Depends on subscription tier |
| Host a container | Subscription (`can_host_containers = true`) | ✅ Yes |
| Create a pathway | Role (`member`, requires `admin`) | ❌ No |
| Create a program | Role (`member`, requires `manager`) | ❌ No |
| Create a container as their sponsor | Sponsor tier (Silver permissions) | Depends on Silver `max_count` |

---

## 9. Future Automation Roadmap

### Membership tier → subscription (billing webhook)
```
subscribe to "Member" plan  →  membership_tier = 'member'
subscribe to "Premium" plan →  membership_tier = 'premium'
subscription lapses         →  membership_tier = 'free'
```

### User class → tickets & one-time purchases
```
purchase "Community Access" ticket  →  user_class = 3
purchase "Full Access" ticket        →  user_class = 10
complete a Program                   →  user_class advances to defined threshold
```

### Bundles (future)
A bundle purchase could grant a combination of:
- `membership_tier` upgrade
- `user_class` advancement
- Ticket grants for specific programs or containers

### Member-created cohort programs (future)
Under Option D (recommended): creating and selling cohort programs becomes a `premium` membership tier feature, treated like a marketplace product under the user's company.

---

## 10. Current Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Billing webhook → `membership_tier` not built | Tier must be set manually after payment | High |
| User class upgrade via ticket not implemented | Class must be advanced manually | Medium |
| Downgrade policy for membership_tier not defined | Undefined behaviour if premium user drops to member with 3 companies | Medium — policy decision first |
| Member-created pathways/cohort programs not designed | Creation locked to `manager` role only | Medium — design decision needed |
| Bundles not implemented | Can only sell individual subscription tiers | Low — post-launch |
| `platform_admin` role string in some older components | Inconsistency with canonical `admin` value | Low — cleanup |
