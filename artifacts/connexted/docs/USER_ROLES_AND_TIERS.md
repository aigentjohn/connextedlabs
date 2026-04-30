# User Roles, User Class & Membership Tier

**Last updated:** April 2026

These three systems work together. They are independent but complementary.

---

## The Three Systems at a Glance

| System | Field | Controls | Assigned by | Future model |
|--------|-------|----------|-------------|--------------|
| **Role** | `users.role` + context arrays | Authority — what actions you can perform within the platform | Platform admin manually, or by joining a circle/container in a specific role | Unchanged — roles are operational, not commercial |
| **User Class** | `users.user_class` (1–10) | Capacity — how much you can access and create across content, containers, and circles | Platform admin manually or via tickets | Tickets / one-time purchases unlock higher classes |
| **Membership Tier** | `users.membership_tier` | Platform subscription level — access to platform-level features outside of content, containers, and circles (e.g. analytics, API, storage, advanced admin, support) | Platform admin manually or via billing event | Recurring subscription sets and maintains the tier |

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
| `admin` | Trusted platform operators | Access to platform admin dashboard; manage users, circles, programs |
| `super` | Platform owner | Full access; can promote/demote admins; bypass all permission checks |

> **Note:** `users.role` only stores `member`, `admin`, or `super`. The richer roles below are contextual — they live on the container, not the user.

### Contextual roles (stored as array columns on the resource)

| Role | Assigned via | Scope | What it allows |
|------|-------------|-------|----------------|
| `host` | `container.admin_ids` | Container (Table, Elevator, Meeting, Pitch, Build, Standup, Meetup, Sprint) | Administer a single container |
| `moderator` | `circle.moderator_ids` | Circle | Moderate content; remove posts; manage flagged items within a circle |
| `admin` | `circle.admin_ids` | Circle | Administer a circle; manage members; edit settings |
| `coordinator` | `program.coordinator_ids` | Program | Manage program members; mark completions; view progress |
| `manager` | `program.manager_ids` | Program | Full program administration; edit content; manage journeys |

A user can hold different contextual roles in different circles/programs simultaneously. Their platform-wide `users.role` is unaffected.

### Where roles are checked
- `src/lib/permissions/circlePermissions.ts` — circle CRUD and membership actions
- `src/lib/permissions/containerPermissions.ts` — container CRUD and hosting
- `src/lib/permissions/programPermissions.ts` — program management and coordination
- `src/lib/constants/roles.ts` — hierarchy, level comparisons, display labels

### How to assign roles
- **Platform admin/super**: via `/platform-admin/users/:userId` — "Promote to Admin" / "Demote to Member" button; also via CSV import
- **Circle roles**: via Circle Settings → Members tab — assign moderator or admin per member
- **Container roles**: via container Settings → Members tab
- **Program roles**: via Program admin dashboard → Team tab

---

## 2. User Class — Capacity

### What it is
User class is a **number from 1 to 10** that controls how much a user can access and create across content, containers, and circles. It represents their earned or purchased level of engagement within the community — separate from their billing status.

Higher class = more containers visible, more creation rights, deeper community access. The sidebar navigation reflects this by showing only the features the user's class has unlocked.

### Class thresholds (current defaults)

| Class | Containers and features unlocked |
|-------|----------------------------------|
| 0+ | Home, News, Circles, Calendar |
| 3+ | Tables, Meetings, Libraries, Lists |
| 7+ | Standups, Sprints |
| 10 | Elevators, Pitches, Builds, Meetups |

Admin and super roles bypass class entirely and see everything.

These thresholds are overridable per item via `/platform-admin/container-configuration`.

### How to assign user class
- **Today:** Platform admin manually sets `user_class` on a user via `/platform-admin/users` (inline dropdown on the list) or `/platform-admin/users/:userId` (detail page)
- **Future:** Purchasing a ticket or completing a program automatically advances the user's class (see Future Model below)

### Where it's checked
- `src/lib/nav-config.ts` — `min_class` field on each nav item; filtered at render time
- `ContainerConfigurationPage` — admin UI to override thresholds per item from the DB (`user_class_permissions` table)

---

## 3. Membership Tier — Platform Subscription Level

### What it is
Membership tier is a **string** (`free` | `member` | `premium`) that controls access to **platform-level features** — capabilities that sit above and outside of content, containers, and circles. Think of it as the subscription layer: what the platform itself offers the user as part of their plan.

Current examples include market access and company/offering limits, but the intended scope is broader: analytics access, API access, storage quotas, advanced admin features, and support level. These are the features that vary with a recurring subscription, not with community participation.

### Current tier limits (from `membership_tier_permissions` table, with hardcoded fallbacks)

| Tier | Can create company | Max companies | Max offerings per company | Market access |
|------|-------------------|---------------|--------------------------|---------------|
| `free` | No | 0 | 0 | None |
| `member` | Yes | 1 | 5 | Defined in DB |
| `premium` | Yes | 3 | Unlimited | Defined in DB |

These values are live in the `membership_tier_permissions` table — change them in Supabase without a code deploy. If a row is missing, hardcoded fallbacks apply.

### How to assign membership tier
- **Today:** Platform admin manually sets `membership_tier` on a user via `/platform-admin/users` (inline dropdown on the list) or `/platform-admin/users/:userId` (detail page)
- **Future:** A billing webhook (Kit / Stripe) sets and maintains the tier automatically on subscription start, renewal, and cancellation (see Future Model below)

### Where it's checked
- `src/lib/tier-permissions.ts` — `getTierPermissions()` and `checkMarketAccess()`
- `MyVenturesPage.tsx` — gates company creation
- `CreateOfferingPage.tsx` — gates offering creation

> **Design note from `roles.ts`:** *"Membership tiers control capacity limits (HOW MUCH you can do) while roles control authority (WHAT you can do)."*

---

## 4. How the Three Systems Interact

A concrete example for a user who is a `member` on the platform, `user_class = 7`, `membership_tier = 'member'`, and a circle admin in one circle:

| Capability | System | Result |
|-----------|--------|--------|
| Can access /platform-admin | Role (`member`) | ❌ No |
| Sees Standups in sidebar | User class (7 — capacity) | ✅ Yes |
| Sees Elevators in sidebar | User class (7, needs 10) | ❌ No |
| Can create a company | Membership tier (`member` — platform feature) | ✅ Yes (max 1) |
| Can create a second company | Membership tier (`member`) | ❌ No (limit 1) |
| Can post in their circle | Contextual role (`admin` of that circle) | ✅ Yes |
| Can delete others' posts in their circle | Contextual role (`admin`) | ✅ Yes |
| Can delete posts in a circle they only joined | Contextual role (`member`) | ❌ No |

---

## 5. Future Model — Automation Roadmap

### Membership Tier → Subscription
When a user subscribes to a paid plan (Kit Commerce / Stripe), a webhook fires an Edge Function that sets `membership_tier` automatically:

```
subscribe to "Member" plan  →  membership_tier = 'member'
subscribe to "Premium" plan →  membership_tier = 'premium'
subscription lapses         →  membership_tier = 'free'
subscription renews         →  no change needed
```

**What needs building:**
- Billing provider webhook → `set-membership-tier` Edge Function
- Graceful downgrade logic (what happens to companies/offerings over the new limit when a user downgrades)

### User Class → Tickets & One-Time Purchases
User class (capacity) advances are unlocked by tickets or milestone events, not subscription status:

```
purchase "Community Access" ticket  →  user_class = 3  (Tables, Meetings, Libraries, Lists)
complete a Program                   →  user_class advances by 1 (or to a set threshold)
purchase "Full Access" ticket        →  user_class = 10 (all features)
attend N events                      →  user_class advances automatically
```

**What needs building:**
- `access_tickets` → `user_class` upgrade rule (Edge Function or DB trigger)
- Program completion → class advancement rule
- Admin UI to configure "this ticket grants class X" on TicketTemplatesAdmin

### Roles — No automation needed
Roles are assigned intentionally by admins. The only automation that might make sense:
- Joining a circle as a paying member could auto-assign `host` for their own containers
- Program enrollment via ticket could auto-assign `coordinator` for their own program workspace

---

## 6. Current Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| `users.role` only has `member`/`admin`/`super` — richer roles like `coordinator` and `manager` exist in the permissions lib but aren't surfaced in UserDetailPage | Coordinators/managers can only be assigned via circle/program settings, not platform admin | Low — contextual assignment is the right model |
| User class upgrade via ticket is documented intent but not implemented | Class advancement must be done manually by admin | Medium |
| Billing webhook → membership_tier automation not built | Tier must be set manually after payment | Medium — needed before public launch |
| Downgrade handling for membership_tier not defined | If a premium user downgrades with 3 companies, what happens? | Medium — needs a policy decision before building |
| `platform_admin` role string appears in some older components | Inconsistency with the canonical `admin` role value | Low — cleanup task |
