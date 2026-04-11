# Visibility & Sharing Model

## Purpose

This document is the authoritative specification for how content and containers are shared, who can see what, and how access is enforced across the Connexted platform. All future feature development, feed design, notification routing, and RLS policy work references this document.

---

## 1. Canonical Audience Levels

Eight audience levels define the complete visibility vocabulary for the platform. Every content item and container maps to one or more of these levels.

| Level | ID | Who It Reaches | Enforced By |
|-------|----|----------------|-------------|
| Guest | `guest` | Unauthenticated visitors | Route guards (`GuestOnly`, `RequireAuth`) |
| Public | `public` | All authenticated members | `visibility: 'public'` + JS filter |
| Self Only | `self` | Author/owner only | `visibility: 'draft'` (to be added) |
| Direct | `direct` | Named recipient(s) | `content_shares` table (to be built) |
| Friends | `friends` | Mutual follows | `user_connections` reciprocal join (to be built) |
| Team | `team` | Small private working group (3–15 people) | `teams` container + `member_ids` |
| Circle | `circle` | Circle members | `circles.member_ids` + `access_type` |
| Program | `program` | Enrolled participants (active state) | `participants` lifecycle + `access_tickets` |

**Rules:**
- Each level is additive — sharing at `circle` level also implies access by `team` members inside that circle
- `guest` access is read-only, no interaction
- `self` is always available — anyone can keep something private to themselves
- `direct` is explicit: you name who receives it; it does not appear in any feed
- `friends` scopes to mutual follows at query time — it is not stored separately

---

## 2. Container Inventory & Audience Mapping

Containers hold members, content, and activity. Each has a natural default audience and a maximum audience it can be opened to.

### Primary Social Containers

| Container | Purpose | Default Audience | Max Audience | Join Model | Has Feed |
|-----------|---------|-----------------|--------------|------------|----------|
| **Circle** | Community group | `public` | `public` | open / request / invite | ✅ |
| **Team** *(new)* | Small private working group | `team` | `team` | invite only | ✅ |
| **Program** | Structured cohort with lifecycle | `public` landing, `program` content | `program` | application / invite | ✅ |
| **Course** | Learning content with enrollment | `public` landing, `program` content | `program` | enroll / purchase | ✅ |

### Operational Containers (live inside a Team or Circle)

| Container | Purpose | Default Audience | Inherited From |
|-----------|---------|-----------------|----------------|
| **Sprint** | Time-boxed working session | `team` | Parent team/circle |
| **Standup** | Regular async check-in | `team` | Parent team/circle |
| **Meeting** | Scheduled synchronous session | `team` | Parent team/circle |
| **Meetup** | Event-style gathering | `circle` or `public` | Parent circle |
| **Build** | Project workspace | `team` or `circle` | Parent |
| **Pitch** | Pitch deck / presentation | `unlisted` or `public` | Creator choice |
| **Elevator** | Intro/pitch format container | `public` | Creator choice |
| **Library** | Curated content collection | `circle` | Parent circle |
| **Checklist** | Task list | `team` | Parent |
| **Playlist** | Content sequence | `circle` | Parent circle |
| **Prompt** | Discussion prompt | `circle` | Parent circle |

### Operational Container Ownership Rule

Operational containers (sprints, standups, meetings, checklists, builds) belong to either:
- A **Team** — private, team-scoped by default
- A **Circle** — inherits circle visibility

They should not float as standalone containers without a parent. The parent determines the audience.

---

## 3. Content Inventory & Audience Mapping

Content is created by members and lives within containers or on profiles.

### Feed & Discussion Content

| Content Type | Where It Lives | Default Audience | Visibility Control | Notes |
|-------------|---------------|-----------------|-------------------|-------|
| **Post** (feed post) | Tagged to container(s) via `*_ids[]` arrays | Inherited from container | Needs `visibility` field added | Currently no per-post override |
| **Forum Thread** | Circle or program | Inherited from container | No visibility field — gap | Needs visibility field |
| **Comment** | On a post or thread | Same as parent post | N/A | Inherits always |
| **Announcement** | Platform-wide | `public` | Admin only creates | No scoping — gap |
| **Standup Response** | Standup container | `team` | Inherited | Tied to standup |

### Long-Form Content

| Content Type | Default Audience | Visibility Field | Tier Gate | Notes |
|-------------|-----------------|-----------------|-----------|-------|
| **Document** | Circle or `unlisted` | ✅ `public/member/unlisted/private` | `member` = paid tier | Shareable to circles and teams |
| **Blog** | `public` or `unlisted` | ✅ | `member` = paid tier | |
| **Episode** | `public` or `unlisted` | ✅ | `member` = paid tier | |
| **Book** | `public` or `unlisted` | ✅ | `member` = paid tier | |
| **Deck** | `public` or `unlisted` | ✅ | `member` = paid tier | |
| **Review** | `public` | ✅ | `member` = paid tier | |

### Profile Content

| Content Type | Default Audience | Privacy Control | Notes |
|-------------|-----------------|----------------|-------|
| **Moment** | `public` | No visibility field — gap | Needs `visibility` field |
| **Portfolio item** | `public` | No visibility field — gap | Needs `visibility` field |
| **Profile (basics)** | `public` | `privacy_settings.profile_public` | |
| **Social links** | Controlled per-platform | `privacy_settings.show_*` JSONB keys | ✅ implemented |
| **Email** | Hidden | `privacy_settings.email_private` | ✅ |
| **WhatsApp** | Hidden | `privacy_settings.show_whatsapp` | ✅ |
| **Looking For** | `public` | `privacy_settings.show_looking_for` | ✅ |

### Structured Learning Content

| Content Type | Default Audience | Access Model | Notes |
|-------------|-----------------|-------------|-------|
| **Course content** | `program` | Access ticket (enrolled) | |
| **Pathway** | `public` browse, `program` content | Enrollment | |
| **Badge** | `public` (earned badges visible) | N/A | |

---

## 4. The "Table" Reclassification

### Current State

The `tables` database table and its routes (`/tables`, `/tables/:slug`) implement a **container** with full container semantics: `member_ids`, `admin_ids`, `visibility`, `guest_access`, `circle_id`, its own feed, settings page, and members tab.

The name "tables" is misleading — it implies a spreadsheet/data grid feature, but it actually functions as a small working group container. This creates confusion and makes the concept hard to explain.

### Decision

**`tables` as a container is superseded by `teams`.** See Section 5.

The word "table" is reclaimed as a **lightweight content type** — an embeddable structured data view (rows + columns) that can live inside a document, program, or circle, similar to a Notion table or an embedded spreadsheet.

### Migration Plan for Existing Tables Container

1. Audit all existing `tables` rows in production — how many exist, who owns them, what circle they belong to
2. Migrate each `tables` row to a `teams` row (schema is nearly identical — add `parent_circle_id`, rename column references)
3. Update all `from('tables')` Supabase queries to `from('teams')` — there are ~20 call sites:
   - `FeedPage.tsx` — feed filtering
   - `AdminDashboardTabbed.tsx` — admin counts
   - `DocumentDetailPage.tsx`, `DocumentsPage.tsx` — share targets
   - `AddDocumentForm.tsx`, `AddReviewForm.tsx` — share selectors
   - `ShareDocumentDialog.tsx` — share dialog
   - `PaymentManagement.tsx` — member counts
   - `UserDetailPage.tsx`, `UserManagement.tsx` — user memberships
   - `MyDocumentsPage.tsx`, `MyReviewsPage.tsx` — personal listings
   - `ReviewsPage.tsx`, `AddReviewForm.tsx` — review sharing
   - `program/AddJourneyContentDialog.tsx` — journey content
   - `journey/JourneyInlineViewer.tsx` — journey viewer
   - `table/TableSettingsPage.tsx`, `table/CreateTablePage.tsx` — settings/create pages
4. Update routes: `/tables/*` → `/teams/*`
5. Update sidebar navigation
6. Redirect old `/tables/*` URLs to `/teams/*`
7. Build the new lightweight `table` content type (embeddable, no membership model)

### New "Table" Content Type (lightweight)

```typescript
interface TableContent {
  id: string;
  title: string;
  created_by: string;
  visibility: Visibility;
  columns: { key: string; label: string; type: 'text' | 'number' | 'date' | 'select' | 'url' }[];
  rows: Record<string, any>[];
  // Container context (where it lives)
  circle_ids?: string[];
  team_ids?: string[];
  program_ids?: string[];
  document_id?: string; // if embedded in a document
  created_at: string;
  updated_at: string;
}
```

Lives in a new `content_tables` database table (avoids collision with the existing `tables` table during migration).

---

## 5. The Team Container (New)

### Definition

A **Team** is a small, private, invite-only working group (typically 3–15 people) that is the home for operational containers: sprints, standups, meetings, checklists, and builds. It is the "inner circle" within the platform — more intimate and task-focused than a Circle.

### Why It's Needed

| Need | Current Gap | Team Solves |
|------|-------------|-------------|
| Share content with a small known group | No mechanism — only circle-wide | Team = explicit audience |
| Shared sprint/standup/meeting workspace | Containers float without a home | Team is the parent |
| Private working feed separate from community | All Feed mixes community and work | Team has its own feed |
| Audience level between "just me" and "whole circle" | Gap in visibility model | `team` audience level |

### Schema

```sql
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  avatar_url text,
  
  -- Ownership
  created_by uuid REFERENCES users(id),
  admin_ids uuid[] NOT NULL DEFAULT '{}',
  member_ids uuid[] NOT NULL DEFAULT '{}',
  
  -- Context (optional parent circle)
  parent_circle_id uuid REFERENCES circles(id),
  
  -- Visibility (teams are private by default)
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'member')),
  -- Note: teams are never 'public' or 'unlisted'
  -- 'private' = invite only (normal)
  -- 'member' = any platform member can request to join (rare)
  
  -- Settings
  max_members int DEFAULT 15,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Team Membership & Roles

| Role | Can Do |
|------|--------|
| **admin** | Invite/remove members, rename team, delete team, manage all containers |
| **member** | Post to team feed, create/join operational containers, view all team content |

No moderator role — teams are small enough that admins handle everything.

### Team Feed

Team feed shows posts tagged with `team_ids: [teamId]` plus activity from operational containers (sprint updates, standup responses, meeting notes). Visible only to `team.member_ids`.

### Operational Container Ownership

When creating a sprint, standup, meeting, or checklist, the user selects a parent: a **Team** or a **Circle**. The parent's audience becomes the container's audience. This replaces the current model where these containers are freestanding.

```typescript
// New field on operational containers
parent_team_id?: string;   // if owned by a team
parent_circle_id?: string; // if owned by a circle
// Exactly one of these should be set
```

### Routes

```
/teams                    My Teams list
/teams/create             Create a team
/teams/:slug              Team home (feed + containers)
/teams/:slug/members      Team members
/teams/:slug/sprints      Team's sprints
/teams/:slug/standups     Team's standups
/teams/:slug/meetings     Team's meetings
/teams/:slug/settings     Team settings (admin only)
```

### Sidebar Placement

Team lives under a new **MY WORK** sidebar section (or within MEMBERS/COMMUNITY — TBD), alongside sprints, standups, and meetings. It is not under MY GROWTH (which is learning/achievement) or MEMBERS (which is directory).

---

## 6. What "Sharing" Means Per Type

Sharing is not one action — it means different things depending on what is being shared.

### Container Sharing (Circles, Teams, Programs)

| Action | Mechanism | Current State |
|--------|-----------|---------------|
| Invite a person to join | `InviteMembersDialog` → `container_memberships` with status `invited` | ✅ exists |
| Share a public circle link | Shareable URL `/circles/:slug` | ✅ exists |
| Share an invite-only circle via link | `share_tokens` table → `/join/:token` | ❌ not built |
| Share a team | Invite only — no public link | by design |
| Share a program (landing page) | `/programs/:slug/landing` | ✅ exists |

### Content Sharing (Posts, Documents, etc.)

| Action | Mechanism | Current State |
|--------|-----------|---------------|
| Post to a circle | Create post tagged to `circle_ids: [id]` | ✅ exists |
| Post to a team | Create post tagged to `team_ids: [id]` | ❌ pending team build |
| Post to multiple circles | Tag post to multiple IDs in `circle_ids[]` | Data model supports it; UI only writes one — gap |
| Share a document to a circle/team | `ShareDocumentDialog` → updates `circle_ids[]` on document | ✅ exists (references `tables`, needs update to `teams`) |
| Share directly with a person | Named recipient — `content_shares` table | ❌ not built |
| Share a moment/portfolio item | No mechanism — profile content has no share action | ❌ not built |
| Share via link (unlisted) | `visibility: 'unlisted'` + direct URL | ✅ exists for documents/builds/pitches |

### Profile Sharing (Socials page)

| Action | Mechanism | Current State |
|--------|-----------|---------------|
| Share contact card | vCard download | ✅ exists |
| Share social links | `privacy_settings.show_*` per platform | ✅ exists |
| Share profile publicly | `privacy_settings.profile_public` | ✅ exists |

---

## 7. Feed Surfaces — What Each Should Show

Each feed surface has a well-defined scope. This is the authoritative definition.

### `/feed` — All Feed (Community Feed)
**Shows:** Posts from all circles and teams the user is a member of  
**Does NOT show:** Posts from circles the user hasn't joined, even if those circles are public  
**Sort:** Newest first (default), with sort options  
**Filter:** By circle (checkbox), by team  
**Post creation:** Selects target circle(s) or team  
**Current gap:** Posts from public circles are visible to non-members — needs fix

### `/circles/:slug/feed` — Circle Feed
**Shows:** Posts tagged to this circle only  
**Audience:** Circle members + public viewers if circle is public  
**Post creation:** Posts go to this circle only

### `/teams/:slug` — Team Feed
**Shows:** Posts tagged to this team + activity from team's operational containers  
**Audience:** Team members only — always private  
**Post creation:** Posts go to this team only  
**Current gap:** Does not exist yet (pending team build)

### `/news` — Community News
**Shows:** Admin announcements (pinned first), upcoming events (30 days), recent posts (public only, membership-filtered), new members, recent forum threads  
**Current gap:** "Recent Posts" shows all posts with no membership or visibility filter — shows content from private circles  
**Fix:** Filter recent posts to `visibility: 'public'` only, OR posts from circles the viewer is a member of

### Program/Course Feed
**Shows:** Posts tagged to this program, announcements, resource updates  
**Audience:** Enrolled participants (active state in `participants` table OR active `access_ticket`)  
**Current gap:** Program posts only check `program_ids[]` array membership, not participant enrollment status

---

## 8. Notification Routing Per Audience Level

| Trigger | Audience Level | Notification Category | Who Gets It |
|---------|---------------|----------------------|-------------|
| Someone likes your post | `direct` | `social` | Post author only |
| Someone comments on your post | `direct` | `social` | Post author only |
| Someone mentions you | `direct` | `social` | Mentioned user |
| Someone follows you | `direct` | `social` | Followed user |
| New post in a circle | `circle` | `circles` | Circle members (opt-in — not every post) |
| New member joined circle | `circle` | `circles` | Circle admins |
| Circle state changed | `circle` | `circles` | All circle members |
| New post in team | `team` | `circles` (reuse category, or add `teams`) | Team members |
| Team standup posted | `team` | `circles` | Team members |
| Admin announcement | `public` | `system` | All members |
| Membership invited | `direct` | `programs` | Invited user |
| Membership approved | `direct` | `programs` | Approved user |
| Program state changed | `program` | `programs` | Enrolled participants |
| Badge earned | `direct` | `system` | Badge earner |
| New member joined platform | `public` | `system` | Admins only (not all members) |

**Current gap:** The notification type taxonomy in `notificationTypes.ts` covers container and membership events well, but has no types for social actions (like, comment, follow) — those live in `notificationHelpers.ts` as separate functions. These should be unified into the `NotificationType` union.

---

## 9. Access Enforcement — Current State vs. Required

| Rule | Currently Enforced | How | Required Enforcement |
|------|-------------------|-----|---------------------|
| Protected routes require auth | ✅ | `RequireAuth` wrapper | Keep as-is |
| Circle visibility filtering | ✅ (partial) | JS `filterByVisibility()` | Add RLS |
| Post scoped to circle members | ⚠️ partial | JS `userContainerIds` check | Add RLS on `posts` table |
| Post scoped to team members | ❌ | Not built | Add when teams built |
| Document tier gating | ⚠️ JS only | `memberRequiresTier` check | Add RLS |
| Program content behind enrollment | ⚠️ partial | `access_tickets` check (JS) | Add RLS |
| Moments/portfolio visibility | ❌ | No visibility field | Add field + RLS |
| Announcement scoping | ❌ | Broadcasts to all | Add `target_audience` field |
| Forum thread visibility | ❌ | No visibility field | Add field |
| Direct share access | ❌ | Not built | Build `content_shares` table + RLS |

### RLS Priority Order

1. `posts` — add policy checking `circle_ids @> ARRAY[id] AND id = ANY(circles.member_ids)`
2. `moments` / `portfolio_items` — add `visibility` field + policy
3. `teams` — full RLS when table is built
4. `documents` — add tier check at database level
5. `forum_threads` — add visibility field + policy

---

## 10. Fields That Need to Be Added

### To `posts` table
```sql
ALTER TABLE posts ADD COLUMN visibility text NOT NULL DEFAULT 'circle'
  CHECK (visibility IN ('draft', 'team', 'circle', 'public'));
ALTER TABLE posts ADD COLUMN team_ids uuid[] NOT NULL DEFAULT '{}';
```
- `draft` — only author can see
- `team` — only members of teams in `team_ids[]`
- `circle` — only members of circles in `circle_ids[]` (current default behavior, made explicit)
- `public` — all authenticated members

### To `moments` table
```sql
ALTER TABLE moments ADD COLUMN visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('draft', 'friends', 'public'));
```

### To `forum_threads` table
```sql
ALTER TABLE forum_threads ADD COLUMN visibility text NOT NULL DEFAULT 'circle'
  CHECK (visibility IN ('circle', 'public'));
ALTER TABLE forum_threads ADD COLUMN circle_id uuid REFERENCES circles(id);
```

### To `announcements` table
```sql
ALTER TABLE announcements ADD COLUMN target_audience text NOT NULL DEFAULT 'all'
  CHECK (target_audience IN ('all', 'circle', 'program', 'team'));
ALTER TABLE announcements ADD COLUMN target_id uuid; -- circle_id / program_id / team_id
```

### To operational containers (sprints, standups, meetings, checklists, builds)
```sql
ALTER TABLE sprints ADD COLUMN parent_team_id uuid REFERENCES teams(id);
ALTER TABLE sprints ADD COLUMN parent_circle_id uuid REFERENCES circles(id);
-- Same pattern for standups, meetings, checklists, builds
```

### New tables needed
```sql
-- Direct content sharing
CREATE TABLE content_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,  -- 'post', 'document', 'moment', etc.
  content_id uuid NOT NULL,
  shared_by uuid REFERENCES users(id),
  shared_with uuid REFERENCES users(id),
  message text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Shareable invite links for non-public circles/teams
CREATE TABLE share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  container_type text NOT NULL,
  container_id uuid NOT NULL,
  created_by uuid REFERENCES users(id),
  max_uses int,
  use_count int DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Lightweight embeddable table content
CREATE TABLE content_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_by uuid REFERENCES users(id),
  visibility text NOT NULL DEFAULT 'circle',
  columns jsonb NOT NULL DEFAULT '[]',
  rows jsonb NOT NULL DEFAULT '[]',
  circle_ids uuid[] DEFAULT '{}',
  team_ids uuid[] DEFAULT '{}',
  program_ids uuid[] DEFAULT '{}',
  document_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 11. Implementation Roadmap

### Phase 1 — Fix What's Broken (no new model)
1. Fix `NewsPage` — filter "Recent Posts" to public-only or membership-filtered posts
2. Add `visibility` field to `posts` — default `'circle'`, migrate existing rows
3. Fix `FeedPage` All Feed — enforce that `visibility: 'circle'` posts only show to circle members
4. Fix `NotificationType` union — add `like`, `comment`, `follow` types to unify with `notificationHelpers.ts`
5. Write `last_active_at` on auth — fix Active Members page

### Phase 2 — Rename Tables → Teams
1. Audit `tables` rows in production
2. Create `teams` table (new schema)
3. Migrate `tables` rows to `teams`
4. Update all 20 call sites from `from('tables')` to `from('teams')`
5. Update routes `/tables/*` → `/teams/*` with redirects
6. Update sidebar navigation
7. Add `parent_team_id` / `parent_circle_id` to operational containers
8. Build Team pages: list, detail/feed, members, settings

### Phase 3 — Add Missing Visibility Fields
1. Add `visibility` to `moments` + `portfolio_items`
2. Add `visibility` + `circle_id` to `forum_threads`
3. Add `target_audience` + `target_id` to `announcements`
4. Add `team_ids[]` to `posts`
5. Add `parent_team_id` / `parent_circle_id` to operational containers

### Phase 4 — RLS Enforcement
1. RLS on `posts` — circle membership check
2. RLS on `teams` — member_ids check
3. RLS on `moments` — visibility field check
4. RLS on `documents` — tier check at database level
5. RLS on `forum_threads` — circle membership check

### Phase 5 — New Sharing Primitives
1. `content_shares` table + direct share UI (share button on posts/documents/moments)
2. `share_tokens` table + invite link generation for circles/teams
3. Friends-scoped visibility on moments/posts (resolve via `user_connections` reciprocal)
4. `content_tables` lightweight table content type

---

## 12. Open Questions

1. **Notification volume:** Notifying all circle members on every post would be noisy. Define which circle events trigger push notifications vs. in-app only vs. digest.

2. **Team vs. Circle for operational containers:** Should a standup/sprint always require a team parent, or can a circle directly own one without creating a team first?

3. **`friends` as a visibility level for posts:** Is "friends only" a meaningful post audience in this platform, or is it primarily a social graph feature (following, member matching) rather than a content gate?

4. **Cross-circle posts:** Should the UI allow a single post to be shared to multiple circles at creation time? (Data model supports it; UI currently does not.)

5. **Program announcements:** Should program admins be able to post announcements scoped to just their enrolled members, separate from the global announcements table?
