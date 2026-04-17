# My Content Hub — Current State & Development Plan

**Status:** Planning  
**Goal:** Give every user a single, unified place to find, audit, and manage everything they have contributed to the platform — documents, links, AI prompts, images, shareable URLs, and container content — with health checks and update workflows built in.

---

## 1. What Exists Today (Current Capabilities)

Content management is currently **fragmented across 7+ separate pages** with no unified view or cross-feature navigation. Here is what each piece does today:

### 1a. My Content Sidebar Section (`/my-content`)
The sidebar "My Content" section groups seven subitems:

| Sidebar Item | Route | What It Does |
|---|---|---|
| My Documents | `/my-documents` | Lists authored documents; search, edit, soft-delete; shows tags, circles, tables shared with |
| My Links | `/my-contents` | Folder-based URL/link manager; import, enrich, health check, batch create |
| My Books | `/books` | (Not fully reviewed) |
| My Decks | `/decks` | (Not fully reviewed) |
| My Lists | `/checklists` | (Not fully reviewed) |
| My Libraries | `/libraries` | (Not fully reviewed) |
| My Reviews | `/my-reviews` | (Not fully reviewed) |

There is also a **My Content Admin** page (`/my-content-admin`) that tracks content lifecycle — expiring soon, recently expired, scheduled content — with a renewal workflow via the `extend_expiration` RPC.

### 1b. My Links / My Contents (`/my-contents`)
The most capable personal content page. Includes:
- Folder tree with typed folders (document, pitch, build, portfolio, post, custom)
- Import URLs in bulk via `ImportUrlDialog`
- Bulk AI enrichment via `BulkEnrichDialog` (adds metadata)
- Batch content creation via `BatchCreateDialog`
- URL health check to detect dead links
- Reads from `my_contents` table (user_id, url, title, folder_path, status, tags, usage_count)

### 1c. My Documents (`/my-documents`)
- Shows all authored documents from `documents` table
- Stats: Total / Personal / Shared with Circles / Shared with Tables
- Tabs by scope (All, Personal, Circles, Tables)
- Edit and soft-delete per document
- **Note:** A `ShareDocumentDialog` is wired in state but the button to open it is missing — sharing is incomplete

### 1d. Link Library (`/links`)
- Public-facing, read-only for regular users
- Curated by admins; three types: `ai_prompt`, `external_url`, `hosted_content`
- Authenticated users see public + members-only content
- Guests see public only
- Detail page (`/links/:linkId`) supports: copy AI prompt, open in AI platform, visit external URL
- View and click counts tracked via RPCs

### 1e. Admin Link Library (`/platform-admin/links`)
- Full CRUD for `link_library` and `content_library` tables
- Admin-only (super or admin role)
- Create, edit, delete, search links
- Two tabs: Links / Content

### 1f. Shareable Links Manager (`/platform-admin/shareable-links`)
- Admin-only tool
- Generates invitation/landing page URLs for programs and circles
- Reads `programs` and `circles` tables
- Generates: `{baseUrl}/programs/{slug}/landing` and `{baseUrl}/circles/{id}/landing`
- Copy to clipboard + open in new tab
- **No analytics on link usage, no expiration tracking**

### 1g. Data Audit Dashboard (`/platform-admin/data-audit`)
- Admin-only
- Counts users by role, content by type, memberships by tier
- Flags test accounts, empty users, orphaned posts
- Reads: users, circles, posts, moments, companies, circle_memberships, demo_accounts, claimable_profiles, playlists
- **No user-facing equivalent — a user has no way to audit their own content footprint**

---

## 2. Current Gaps (What's Missing)

### For Regular Users
| Gap | Impact |
|---|---|
| No unified view of everything a user has added to the platform | User must visit 5+ pages to get a complete picture |
| No personal audit: "what links have I shared that may be stale?" | Dead links go undetected unless user remembers to health-check |
| No view of images/icons uploaded by the user | Users have no way to find or manage locally stored assets |
| Document sharing dialog exists in code but is never triggered | Users cannot share documents from My Documents page |
| No personal shareable link generator | Users can't generate invite links to their own circles/programs |
| No tag/topic audit: "which of my content uses which tags?" | Content is siloed; no cross-content tag view |
| `my_contents` and `documents` are separate tables with no connection | A URL that becomes a document is not cross-referenced |
| No "content I have contributed to others' containers" view | User doesn't know what they've posted in circles they belong to |
| No notification for expiring content (My Content Admin) | Content expiration silently removes visibility |

### For Admins
| Gap | Impact |
|---|---|
| Shareable Links has no click/conversion analytics | No data on which invitation links drive signups |
| Data Audit has no export (CSV/JSON) | Audit results cannot be shared or processed externally |
| No per-user content footprint view | Admin cannot see everything a specific user has contributed |
| No image/asset manager | Uploaded logos, icons, and avatars have no management UI |
| Link Library has no bulk import/export | Large collections must be created one by one |

---

## 3. Development Plan

### Phase 1 — Fix Immediate Broken Functionality (Quick wins, ~1 day)

**P1-1: Fix document sharing dialog**
- `MyDocumentsPage.tsx` has `ShareDocumentDialog` in state but no button to open it
- Add "Share" button to each document card that sets `shareDocumentId` state
- Effort: 30 minutes

**P1-2: Add personal shareable link generator to My Links**
- Users who admin circles or programs should be able to generate their own landing page URLs
- Reuse the same URL generation logic from `ShareableLinksManager`
- Query circles/programs where user is in `admin_ids`
- Effort: 2–3 hours

**P1-3: Add tag filtering to Link Library browser**
- `LinkLibraryBrowser` has category filter but no tag filter
- Add a tag cloud or tag dropdown using data from `link_library.tags`
- Effort: 1–2 hours

---

### Phase 2 — My Content Audit Page (New feature, ~1–2 days)

A new page at `/my-content/audit` that gives the user a complete picture of their content footprint.

**What it shows:**

```
MY CONTENT AUDIT
─────────────────────────────────────────────────────
SUMMARY
  Documents:     12 total · 3 shared · 1 draft
  Links:         47 total · 8 stale · 3 broken
  Posts:         34 total (across 6 circles)
  Images:         6 uploaded (profile, icons, covers)
  Tags used:     18 unique tags across all content
  Circles I admin: 3 · Programs I admin: 1
  Shareable links: 4 generated

HEALTH FLAGS
  ⚠ 8 links flagged as stale (not used in 90+ days)
  ⚠ 3 links returning 404
  ⚠ 2 documents with no tags
  ⚠ 1 circle with expired landing page link
─────────────────────────────────────────────────────
TABS: Documents · Links · Posts · Images · Tags · Shareable Links
```

**Data sources:**
- `documents` WHERE author_id = user
- `my_contents` WHERE user_id = user
- `posts` WHERE author_id = user (with circle name)
- `storage.objects` WHERE owner = user (Supabase Storage for images)
- All tags aggregated across the above
- `circles` + `programs` WHERE user in admin_ids

**Effort:** 3–5 days

---

### Phase 3 — User Image & Asset Manager (New feature, ~1 day)

A new tab within the My Content Audit page (or standalone at `/my-content/assets`) that shows all images uploaded by the user to Supabase Storage.

**What it needs:**
- Query `storage.objects` (or the `storage` schema) filtering by owner = auth.uid()
- Buckets likely involved: `avatars`, `logos`, `covers`, `icons`
- Show: filename, bucket, file size, upload date, preview thumbnail
- Actions: Copy URL, Delete, Replace

**Database work needed:**
```sql
-- May need a view or RPC to query storage safely from RLS context
CREATE OR REPLACE FUNCTION public.get_user_storage_objects()
RETURNS TABLE (
  name text,
  bucket_id text,
  created_at timestamptz,
  updated_at timestamptz,
  metadata jsonb
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name, bucket_id, created_at, updated_at, metadata
  FROM storage.objects
  WHERE owner = auth.uid();
$$;
```

**Effort:** 1–2 days

---

### Phase 4 — Link Health & Review Workflow (Enhancement, ~1 day)

Extend the existing URL health check in `My Links` into a proactive review workflow:

**Stale link detection:**
- Flag `my_contents` rows where `last_used_at < now() - interval '90 days'`
- Add a `reviewed_at` column to `my_contents` to track when user last confirmed link is still valid

**Review workflow UI:**
- New "Needs Review" filter tab in My Links showing stale + broken links
- One-click "Mark as reviewed" to update `reviewed_at`
- One-click "Archive" to set status = 'archived'
- One-click "Update URL" to open edit dialog pre-filled

**Database change:**
```sql
ALTER TABLE public.my_contents
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_status text
    CHECK (health_status IN ('ok', 'stale', 'broken', 'unverified'))
    DEFAULT 'unverified';
```

**Effort:** 1–2 days

---

### Phase 5 — Admin Enhancements (Admin-side, ~1 day)

**P5-1: Shareable Links analytics**
- Track clicks on landing page URLs with a new `shareable_link_clicks` table or using existing view/click count patterns
- Show in `ShareableLinksManager`: generated date, click count, last clicked

**P5-2: Per-user content footprint view**
- In the admin Users management page, add a "View Content" action
- Opens a filtered version of the My Content Audit page scoped to that user
- Lets admins quickly see everything a user has in the system

**P5-3: Data Audit export**
- Add CSV/JSON export button to `DataAuditDashboard`
- Useful for reporting to stakeholders or external review

**Effort:** 1–2 days

---

## 4. Recommended Development Order

| Priority | Phase | Feature | Effort | Value |
|---|---|---|---|---|
| 🔴 Now | P1-1 | Fix document sharing dialog | 30 min | Fixes broken existing feature |
| 🔴 Now | P1-2 | Personal shareable link generator | 2–3 hrs | High user value, reuses existing logic |
| 🟡 Soon | P1-3 | Tag filtering in Link Library | 1–2 hrs | Easy discoverability improvement |
| 🟡 Soon | Phase 2 | My Content Audit page | 3–5 days | Core new capability |
| 🟢 Later | Phase 3 | User image/asset manager | 1–2 days | Completes content ownership picture |
| 🟢 Later | Phase 4 | Link health & review workflow | 1–2 days | Addresses content hygiene at scale |
| 🟢 Later | Phase 5 | Admin enhancements | 1–2 days | Operational improvements |

---

## 5. Data Model Changes Required

```sql
-- Phase 4: Link health tracking on my_contents
ALTER TABLE public.my_contents
  ADD COLUMN IF NOT EXISTS reviewed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS last_health_check_at  timestamptz,
  ADD COLUMN IF NOT EXISTS health_status         text
    CHECK (health_status IN ('ok', 'stale', 'broken', 'unverified'))
    DEFAULT 'unverified';

-- Phase 5: Shareable link click tracking
CREATE TABLE IF NOT EXISTS public.shareable_link_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  container_type text        NOT NULL CHECK (container_type IN ('circle', 'program')),
  container_id   uuid        NOT NULL,
  event_type     text        NOT NULL DEFAULT 'click',
  ip_hash        text,
  referrer       text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shareable_link_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shareable_link_events_admin_read" ON public.shareable_link_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );
CREATE POLICY "shareable_link_events_insert_public" ON public.shareable_link_events
  FOR INSERT WITH CHECK (true); -- anyone clicking a landing page triggers this

-- Phase 3: RPC for user storage objects
CREATE OR REPLACE FUNCTION public.get_user_storage_objects()
RETURNS TABLE (
  name       text,
  bucket_id  text,
  created_at timestamptz,
  updated_at timestamptz,
  metadata   jsonb
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name, bucket_id, created_at, updated_at, metadata
  FROM storage.objects
  WHERE owner = (SELECT auth.uid())::text;
$$;
```

---

## 6. New Routes Required

| Route | Page | Phase |
|---|---|---|
| `/my-content/audit` | My Content Audit (full footprint view) | Phase 2 |
| `/my-content/assets` | My Images & Assets | Phase 3 |
| `/my-content/review` | Links needing review | Phase 4 (or tab in My Links) |

---

## 7. Summary of Current vs Planned State

| Capability | Today | After Plan |
|---|---|---|
| See all my documents | ✅ My Documents page | ✅ + surfaced in Audit page |
| See all my links | ✅ My Links page | ✅ + health status + review workflow |
| See all my posts across circles | ❌ Not available | ✅ Phase 2 |
| See images I've uploaded | ❌ Not available | ✅ Phase 3 |
| See all tags I've used | ❌ Not available | ✅ Phase 2 |
| Generate shareable invite links | ❌ Admin only | ✅ Phase 1 (for circle/program admins) |
| Detect stale or broken links | ⚠️ Health check exists but no tracking | ✅ Phase 4 |
| Share a document from My Documents | ❌ Broken (dialog never opens) | ✅ Phase 1 |
| Unified content footprint in one view | ❌ Fragmented across 5+ pages | ✅ Phase 2 |
| Admin can see a user's full content | ❌ Not available | ✅ Phase 5 |
