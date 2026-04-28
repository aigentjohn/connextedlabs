# Expire and Renew — Content Lifecycle System

Last updated: April 2026

---

## 1. Philosophy

The platform treats content as a living thing rather than a permanent archive.
Content that no one engages with naturally fades — and content that the community
finds valuable earns more time. This creates a self-curating platform where
the most useful content stays visible and stale content quietly retires.

Three forces act on content lifetime:

1. **Time decay** — content has a default expiration date set at creation
2. **Community survival** — engagement from other users extends that expiration
3. **Owner renewal** — the creator can manually extend or, on premium tiers, make it permanent

This model also creates a monetization lever: permanent content is a premium feature,
giving free users a meaningful reason to upgrade without restricting their ability
to create and participate.

---

## 2. What Is Already Built

### 2a. Core Expiration Fields

The following columns exist on container tables (`builds`, `pitches`, `tables`,
`elevators`, `journeys`):

| Column | Type | Purpose |
|---|---|---|
| `expires_at` | `timestamptz` | When the content expires |
| `is_permanent` | `boolean` | Bypasses expiration entirely |
| `engagement_score` | `numeric` | Accumulated engagement weight |
| `engagement_extends_count` | `integer` | How many times community has extended this item |
| `last_engagement_extension_at` | `timestamptz` | Timestamp of most recent community extension |
| `is_scheduled` | `boolean` | Content is queued for future publication |
| `scheduled_publish_at` | `timestamptz` | When scheduled content goes live |
| `is_published` | `boolean` | Whether scheduled content has been released |

### 2b. Supabase RPC Functions

Four RPC functions drive the lifecycle:

**`extend_expiration(p_container_type, p_container_id, p_extension_months)`**
Manual renewal by the owner. Extends `expires_at` by the specified number of months.
Currently wired to 3-month (free) and 6-month (free) options in the UI.

**`make_content_permanent(p_container_type, p_container_id, p_user_id)`**
Sets `is_permanent = true`. Returns `{ upgrade_required: true }` if the user's
class does not meet the premium threshold (currently class ≥ 3). This is the
primary premium upsell in the content lifecycle.

**`extend_on_engagement(p_container_type, p_container_id, p_engagement_type, p_engagement_id, p_user_id)`**
Community-driven extension. Called automatically when a user engages with content.
Engagement types and their relative weights:

| Engagement type | Emoji | Relative value |
|---|---|---|
| `award` | 🏆 | Highest |
| `review` | ⭐ | High |
| `share` | 🔗 | High |
| `comment` | 💬 | Medium |
| `bookmark` | 📌 | Medium |
| `upvote` | ⬆️ | Low-medium |
| `like` | 👍 | Low |

Returns `{ days_extended, new_expires_at, total_extensions, total_days_extended }`.
Silent failure if maximum extensions reached — shows a friendly toast instead
("This content has clearly earned its place!").

**`get_engagement_stats(p_container_type, p_container_id)`**
Returns aggregate stats: `total_extensions`, `total_days_extended`, `unique_engagers`,
`breakdown_by_type` (count + days per engagement type).

**`get_most_extended_content(p_container_type, p_limit)`**
Leaderboard query — returns content sorted by total community extensions.
Foundation for a "Most Loved" or "Community Picks" discovery feature.

### 2c. React Hooks

**`useEngagementExtension`** — `src/hooks/useEngagementExtension.ts`

Core hook. Exposes:
- `extendOnEngagement()` — wraps the RPC call with toast feedback
- `getEngagementStats()` — fetches aggregate stats for a container
- `getMostExtended()` — fetches the leaderboard

Three convenience wrapper hooks that compose with existing platform functions:
- `useLikeWithExtension` — wraps an existing like function, silently extends after like
- `useCommentWithExtension` — wraps comment creation, extends with toast notification
- `useReviewWithExtension` — wraps review creation, extends with toast notification

These are designed to be dropped into existing pages without changing their API:
the wrapper calls the original function first, then fires the extension as a side effect.

### 2d. Shared UI Components

**`ExpirationWarning`** — `src/app/components/shared/ExpirationWarning.tsx`

An alert component shown on container detail pages. Handles four urgency states:

| State | Threshold | Visual |
|---|---|---|
| Critical | ≤ 1 day remaining | Red destructive alert + 🚨 |
| High | ≤ 7 days | Warning alert + ⚠️ |
| Medium | ≤ 30 days | Default alert + ⏰ |
| Permanent | `is_permanent = true` | Small "Permanent" badge, no warning |

Actions shown in the alert:
- **Extend 3 Months (Free)** — available to all users
- **Make Permanent** — shown as active button for premium users; shown as
  upgrade link for free users

Props: `containerType`, `containerId`, `expiresAt`, `isPermanent`,
`scheduledArchiveAt`, `userClass`, `onExtend` callback.

**`ExpirationBadge`** — exported from the same file

A small inline badge for card views: shows "Xd left" in destructive/warning/secondary
colour based on urgency. Hidden if more than 30 days remain or content is permanent.

**`getExpirationBadge()`** — `src/lib/container-state-badges.tsx`

Utility function used by `ContainerCard` to generate the correct badge. Called
in card list views so expiration status is always visible in the grid.

### 2e. My Content Admin Page

Route: `/my-content-admin` — `src/app/pages/MyContentAdminPage.tsx`

The primary management surface. Four tabs:

| Tab | Contents | Action available |
|---|---|---|
| Expiring Soon | Items expiring within 30 days, sorted by urgency | Renew 3mo / 6mo / Make Permanent |
| Active | Items with >30 days remaining or permanent | View only |
| Recently Expired | Items expired within the last 30 days | Recover (renew before permanent archive) |
| Scheduled | Items with `is_scheduled = true` and not yet published | Cancel scheduled publish |

Bulk operations: select multiple expiring items, choose 3 or 6 month renewal,
apply to all selected in sequence.

---

## 3. What Is NOT Covered (Content Type Gaps)

The expiration system currently only applies to **containers** (Builds, Pitches,
Tables, Elevators, Journeys). The following content types have no expiration support:

| Content type | Status | Notes |
|---|---|---|
| Documents | ❌ No expiration | Uses `access_level` + `deleted_at` only |
| Books | ❌ No expiration | — |
| Decks | ❌ No expiration | — |
| Lists / Checklists | ❌ No expiration | — |
| Libraries | ❌ No expiration | — |
| Blogs / Blog Posts | ❌ No expiration | — |
| Episodes / Playlists | ❌ No expiration | — |
| My Links (`my_contents`) | ❌ No expiration | Has `status` field but no time gate |
| Posts / Moments | ❌ No expiration | — |
| Reviews | ❌ No expiration | — |
| Circles | ❌ No expiration | Has invitation expiry (`invite_expires_at`) only |
| Programs / Courses | ⚠️ Partial | Access ticket expiry only (controls access, not visibility) |
| Badges | ⚠️ Partial | `expires_at` exists but no renewal UI or engagement extension |

Access ticket expiry (Programs/Courses) is a separate concept from content
expiration — it controls whether a user can access a container, not whether the
container itself is visible.

---

## 4. Key Design Decisions to Preserve

**Expiration is separate from deletion.** Expired content is not deleted —
it enters a grace period (currently 30 days) where it can be recovered. After
30 days it is archived. This mirrors the document soft-delete pattern.

**Community extension has a ceiling.** The `max_extensions_reached` state
prevents a single viral item from living forever via community engagement alone.
The exact ceiling is set in the `extend_on_engagement` RPC. Permanent status
requires the owner to explicitly upgrade.

**Silent failure on engagement extension.** The `useLikeWithExtension` wrapper
silently extends without a toast, to avoid disrupting the primary like interaction.
The `useCommentWithExtension` and `useReviewWithExtension` wrappers do show a toast
because those actions already have more intentional feedback moments.

**Permanent = premium.** Free users can always extend manually in 3-month increments.
The premium gate is specifically on `is_permanent`, not on the ability to create
time-limited content. This prevents locking out free users while still making
premium meaningful.

**Scheduled content is excluded from expiration logic.** Items with `is_scheduled = true`
and `is_published = false` are filtered out of all expiration tabs — they have not
been released yet and should not be subject to decay.

---

## 5. Future Development

### 5a. Expand to More Content Types

The most immediate gap is that Documents, Books, Decks, and Lists have no
expiration support. Before adding expiration to these:

- Add `expires_at` and `is_permanent` columns to `documents`, `books`,
  `checklists`, and `decks` tables (migration)
- Decide on a **default expiration window** per type:
  - Documents: 1 year (long-lived reference material)
  - Books: 2 years (stable content)
  - Decks: 6 months (time-sensitive presentation material)
  - Lists: 3 months (task-oriented, likely stale quickly)
- Wire `ExpirationWarning` into each content's detail/manage page
- Add expiration tab to My Content Audit page (currently a stub)
- Extend `MyContentAdminPage` to include these new types in its queries

### 5b. Expiration for My Links (`my_contents`)

URL links have a different decay model — they don't expire in the traditional sense,
but they do go **stale** (domain changes, content removed). The existing `health_status`
column (planned in Sprint 5) is the right home for this rather than `expires_at`.

Future: treat broken/stale links as "expired" in the My Content Audit page so
they appear alongside truly expired content in a unified "Needs Attention" view.

### 5c. Per-Type Default Expiration at Creation

Currently `expires_at` appears to be set manually or left null. A cleaner model:

- When creating any container/content, auto-set `expires_at` based on type defaults
- Show the expiration date in the create form with an override option
- Free tier: locked to a maximum (e.g. 1 year)
- Premium tier: can set any date or immediately mark permanent

This makes expiration visible at creation rather than a surprise later.

### 5d. Expiration Notifications

Currently there is no proactive notification when content is about to expire.
The `notifications` table and `notificationTypes` already define a pattern that
could be extended:

```typescript
// Proposed new notification types
'content.expiring_soon'    // 30 days before expiration
'content.expiring_urgent'  // 7 days before expiration
'content.expired'          // On expiration, with recovery CTA
'content.community_saved'  // When engagement extensions occur (positive moment)
```

A scheduled Supabase Edge Function (or pg_cron job) would run nightly,
query content expiring within 7 and 30 days, and insert notification rows.

### 5e. Engagement Extension — Wiring Into Existing Pages

The `useLikeWithExtension`, `useCommentWithExtension`, and `useReviewWithExtension`
hooks exist but are not yet wired into the actual like/comment/review interactions
on container pages. Connecting them is a low-effort, high-value step:

- In any page that has a like/upvote button on a Build, Pitch, Table, Elevator,
  or Journey — replace the raw like call with `useLikeWithExtension`
- In comment forms — replace with `useCommentWithExtension`
- In review forms — replace with `useReviewWithExtension`

No database changes required — the RPCs already exist.

### 5f. Engagement Leaderboard / "Community Picks"

`get_most_extended_content` RPC already returns a ranked list of content by
total community extensions. This could surface as:

- A "Community Picks" section on the Discover page
- A "Most Extended" tab on the relevant container index pages (Builds, Pitches, etc.)
- An "Engagement Leaderboard" on a creator's profile — content they've made that
  the community has kept alive the longest

### 5g. Circle and Program Expiration

Circles and Programs do not currently expire, but there are natural use cases:

- A program cohort that runs for 3 months — after the cohort ends, new members
  should not be able to join and the content should be read-only
- A circle for an event — active for 60 days before and after the event
- A temporary collaboration circle with a defined end date

This would require `expires_at` and `is_permanent` on `circles` and `programs`,
plus a behavior decision: does expiration prevent new joins, hide the circle entirely,
or just lock content creation?

### 5h. Badge Expiration UI

Badges have `expires_at` in the database but there is no renewal or extension
UI anywhere. Options:

- Badge renewal by re-earning (completing the criteria again resets the expiration)
- Badge renewal by platform admin (manual extension)
- Premium badges never expire, standard badges expire after 1 year

### 5i. Content Expiration Analytics (Admin)

Admins currently have no view of expiration health across the platform.
A future admin panel tab could show:

- Platform-wide expiration rate (what % of content is expiring this month)
- Content type breakdown (which types expire most)
- Renewal rate (what % of expiring content gets renewed)
- Community save rate (what % of content is extended by community engagement)
- Most active community extenders (which users engage most with others' content)

This data would help tune the default expiration windows and engagement weights.

### 5j. Expiration as a Discovery Tool

The gap between "active" and "expiring" creates a natural editorial opportunity:

- "Expiring Soon" section on Discover — surfaces content that is about to disappear,
  encouraging the community to engage (and save it)
- "Rescued Content" feed — shows content that was near expiration but got extended
  by community engagement (social proof of value)
- Creator notifications when their content is saved by community engagement —
  positive reinforcement that their work is valued

---

## 6. Summary — Built vs. Planned

| Feature | Status |
|---|---|
| `expires_at` / `is_permanent` on containers | ✅ Built |
| `extend_expiration` RPC (manual renewal) | ✅ Built |
| `make_content_permanent` RPC (premium) | ✅ Built |
| `extend_on_engagement` RPC (community) | ✅ Built |
| `get_engagement_stats` / `get_most_extended` RPCs | ✅ Built |
| `useEngagementExtension` hook family | ✅ Built |
| `ExpirationWarning` + `ExpirationBadge` components | ✅ Built |
| My Content Admin page (4-tab lifecycle view) | ✅ Built |
| Bulk renewal UI | ✅ Built |
| Scheduled content support | ✅ Built |
| Expiration on Documents / Books / Decks / Lists | ❌ Not built |
| Expiration on Circles / Programs | ❌ Not built |
| Badge expiration renewal UI | ❌ Not built |
| Engagement hooks wired into actual pages | ❌ Not wired |
| Expiration notifications (nightly cron) | ❌ Not built |
| Per-type default expiration at creation | ❌ Not built |
| Community Picks leaderboard surface | ❌ Not built |
| Admin expiration analytics | ❌ Not built |
| "Expiring Soon" discovery section | ❌ Not built |
