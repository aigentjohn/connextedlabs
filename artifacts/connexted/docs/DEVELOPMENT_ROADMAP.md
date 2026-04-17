# Connexted Labs — Development Roadmap
## Completed Work & Planned Development

**Last Updated:** April 2026  
**Focus:** User content control, platform performance, multi-instance readiness

---

## Part 1 — Completed Work

### 1.1 Authentication & Security

| Item | Description | Commit | Est. Hours |
|---|---|---|---|
| **Auth Web Lock Fix** | Added `forceSignOut()` that bypasses the Supabase Web Lock hang by directly wiping `sb-*` localStorage keys and reloading. Prevents the app from freezing indefinitely during token refresh. Updated 10-second timeout handler and Sign Out button to use this instead of `supabase.auth.signOut()`. | `5c7ac69` | 2 hrs |
| **Disable Self-Registration** | Replaced the "Create Account" card on the login page with a dimmed Coming Soon overlay. Updated the sign-in footnote to read "Registration is by invitation only." The form fields remain visible but are non-interactive. | `8b3b64f` | 1 hr |

### 1.2 Performance

| Item | Description | Commit | Est. Hours |
|---|---|---|---|
| **RLS initplan Fix** | Wrapped `auth.uid()` in `(select auth.uid())` across 49 RLS policies on 18 tables so PostgreSQL evaluates the function once per query instead of once per row. Zero behaviour change — pure performance gain on all authenticated queries. | `4775066` | 3 hrs |
| **Duplicate Index Drop** | Dropped `idx_events_circles` from `public.events` — an exact duplicate of `idx_events_circle_ids`. Reduces write overhead on every INSERT/UPDATE/DELETE on the events table. Left kv_store internal indexes untouched. | `4775066` | 0.5 hrs |

### 1.3 Bug Fixes

| Item | Description | Commit | Est. Hours |
|---|---|---|---|
| **Document Share Button** | `ShareDocumentDialog` was fully built and wired in state but had no button to open it. Added a Share button (using the already-imported `Share2` icon) between Edit and Delete on each document card in `MyDocumentsPage.tsx`. | `e83b13c` | 0.5 hrs |

### 1.4 Documentation & Planning

| Item | Description | Commit |
|---|---|---|
| **My Content Hub Plan** | Audit of all user content management features with gap analysis and 5-phase development plan. | `8aa639f` |
| **User Content Control Plan** | Full audit of home page, links ecosystem, import capabilities, database audit, guest experience, and user data ownership with 7-phase roadmap. | `2eed21c` |
| **Multi-Instance Deployment Plan** | Step-by-step guide for spinning up additional Connexted instances on separate URLs with isolated databases, including migration management strategy. | `6005dab` |

---

## Part 2 — Planned Development

All estimates are in focused development hours. They assume the developer is familiar with the codebase and does not include review or testing time beyond basic smoke testing.

---

### Phase 1 — Quick Wins
**Total estimate: 8–10 hours**

---

#### 1A · Fix MyCirclesPage to Show All Member Circles
**Priority:** 🔴 High — broken for most regular users right now

**Problem:** `/my-circles` only shows circles where the user is host or moderator. A user who is a plain member of 10 circles has no page that lists them.

**What to do:**
- Update the query in `MyCirclesPage` to fetch circles where `member_ids` contains `auth.uid()` (not just where user is in admin/moderator arrays)
- Separate into two sections: "Circles I Manage" and "Circles I'm In"
- Add a Leave button to each non-admin membership card
- Show role badge (Member / Moderator / Host) per card

**Files:** `MyCirclesPage.tsx`  
**Tables:** `circles` (member_ids array)  
**Estimate:** 3–4 hours

---

#### 1B · Personal Shareable Link Generator
**Priority:** 🔴 High — circle/program admins have no way to generate their own invite URLs

**Problem:** The Shareable Links tool at `/platform-admin/shareable-links` is platform-admin only. A user who manages their own circle or program cannot generate a landing page or application link without admin help.

**What to do:**
- Add a "Share This Circle" / "Share This Program" card to CircleDetailPage and ProgramDetailPage for users in `admin_ids`
- Reuse the URL generation logic from `ShareableLinksManager` (already built)
- Show the generated URL with copy and open buttons
- Also surface these links in the My Content Audit page (Phase 2)

**Files:** `CircleDetailPage.tsx`, `ProgramDetailPage.tsx`  
**Tables:** `circles`, `programs`, `platform_settings` (for base URL)  
**Estimate:** 2–3 hours

---

#### 1C · Tag Filtering in Link Library Browser
**Priority:** 🟡 Medium

**Problem:** `/links` has category filtering but no tag filtering. Tags are stored on every link but users can't browse by them.

**What to do:**
- Add a tag cloud or multi-select tag dropdown to `LinkLibraryBrowser`
- Populate from distinct tags across all visible `link_library` rows
- Filter applies in combination with existing category and type filters

**Files:** `LinkLibraryBrowser.tsx`  
**Tables:** `link_library` (tags array)  
**Estimate:** 2–3 hours

---

### Phase 2 — My Content Audit Page
**Total estimate: 28–36 hours**

A new page at `/my-content/audit` — the single place where a user can see everything they have in the platform, its health status, and take action on it.

---

#### 2A · Page Shell & Summary Strip
Build the page layout, routing, and a summary strip showing total counts across all content types.

**Summary strip shows:**
- Documents (total / shared / personal)
- Links (total / broken / stale)
- Posts & Moments (total, across all circles)
- Reviews (total)
- Images & Assets (count from storage)
- Tags used (unique count across all content)
- Circles I manage / Circles I'm in
- Programs enrolled

**Files:** New `MyContentAuditPage.tsx`, add route to `App.tsx`, add sidebar link  
**Estimate:** 4–6 hours

---

#### 2B · Health Flags Panel
Surface actionable alerts at the top of the audit page.

**Flags shown:**
- Broken links (health_status = 'broken' in `my_contents`)
- Stale links (not used in 90+ days)
- Untagged documents
- Expiring content within 30 days (from `my-content-admin` logic)
- Documents with no circle/table sharing (purely personal with no audience)

**Files:** `MyContentAuditPage.tsx`  
**Estimate:** 3–4 hours

---

#### 2C · Documents Tab
Reuse `MyDocumentsPage` display logic inside the audit tab. Add:
- Tag summary panel (which tags you use most across your docs)
- Bulk actions: archive all unshared, export all as JSON

**Estimate:** 3–4 hours

---

#### 2D · Links Tab
Reuse `MyContentsPage` display inside the audit tab. Add:
- Health status column/badge per link
- "Needs Review" quick filter (broken + stale)
- One-click Archive and Mark Reviewed actions

**Database change needed:**
```sql
ALTER TABLE public.my_contents
  ADD COLUMN IF NOT EXISTS reviewed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_status        text
    CHECK (health_status IN ('ok', 'stale', 'broken', 'unverified'))
    DEFAULT 'unverified';
```

**Estimate:** 4–5 hours

---

#### 2E · Posts & Moments Tab
Aggregate all posts/moments authored by the user across all circles.

**Shows:** Circle name, post title/preview, date, view count, like count, delete action  
**Tables:** `posts` WHERE `author_id = auth.uid()`  
**Estimate:** 3–4 hours

---

#### 2F · Images & Assets Tab
Show all files uploaded by the user to Supabase Storage.

**Shows:** Thumbnail preview, file name, bucket, upload date, file size, copy URL, delete  
**Requires new RPC:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_storage_objects()
RETURNS TABLE (
  name text, bucket_id text,
  created_at timestamptz, updated_at timestamptz,
  metadata jsonb, size bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name, bucket_id, created_at, updated_at, metadata,
         (metadata->>'size')::bigint
  FROM storage.objects
  WHERE owner = (SELECT auth.uid())::text;
$$;
```
**Estimate:** 4–5 hours (including RPC and storage delete wiring)

---

#### 2G · Tags Tab
Aggregate all tags used by the user across documents, links, reviews, and moments.

**Shows:** Tag name, count of items using it, which content types, quick filter links  
**Estimate:** 2–3 hours

---

#### 2H · Shareable Links Tab
Show all landing page and application URLs for circles and programs the user manages.

**Shows:** Container name, type, URL, copy button, open button, last shared date  
**Reuses:** URL generation logic from `ShareableLinksManager`  
**Estimate:** 2–3 hours

---

### Phase 3 — Account Deletion & Data Export
**Total estimate: 32–40 hours**

---

#### 3A · Self-Service Account Deletion
**Priority:** 🔴 Critical — legal exposure without this (GDPR/CCPA)

**Flow:**
1. User navigates to `/my-account` → "Delete My Account" button (red, at bottom)
2. Confirmation modal: type email to confirm, acknowledge what will be deleted
3. Sets `deletion_requested_at = now()`, `deletion_scheduled_for = now() + 30 days`
4. Immediately: removes from all `member_ids` arrays, hides content from public views
5. Sends confirmation email with "Cancel deletion" link
6. After 30 days: cron job hard-deletes user row and all owned content

**Database changes:**
```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_cancelled_at  timestamptz;
```

**Files:** `MyAccountPage.tsx` (add section), new `DeleteAccountDialog.tsx`  
**Estimate:** 12–16 hours (UI + email + cron + cancellation flow)

---

#### 3B · Full Data Export (GDPR)
**Priority:** 🔴 Critical

**What it exports (ZIP download):**
- `profile.json` — all profile fields (basics, professional, social, privacy)
- `documents.json` — all authored documents with metadata
- `links.json` — all `my_contents` rows
- `posts.json` — all authored posts and moments
- `reviews.json` — all authored reviews
- `memberships.json` — all circles, programs, courses enrolled with join dates
- `notifications.json` — last 90 days of notifications
- `images/` — download URLs for all uploaded assets

**Approach:**
- User clicks "Export My Data" in `/my-account`
- Edge Function assembles the ZIP server-side (avoids large client-side processing)
- For small datasets: direct download. For large: email with download link valid 24 hours

**Files:** New `ExportMyDataButton.tsx`, new Edge Function `export-user-data`  
**Estimate:** 20–24 hours

---

### Phase 4 — Import Enhancements
**Total estimate: 24–30 hours**

---

#### 4A · Browser Bookmark Import (HTML)
**Priority:** 🟡 Medium — already marked "Coming Soon" in the UI

**What to do:**
- Complete the Bookmarks tab in `ImportUrlDialog`
- Parse Netscape Bookmark Format HTML (exported from Chrome / Firefox / Safari / Edge)
- Extract URLs, titles, and folder structure
- Map folder structure to `my_contents` folder_path
- Deduplicate against existing `my_contents` rows

**Files:** `ImportUrlDialog.tsx`, new `parseBookmarksHtml.ts` utility  
**Estimate:** 6–8 hours

---

#### 4B · User Link Submission to Shared Library
**Priority:** 🟡 Medium — currently users have no way to contribute to the Link Library

**Flow:**
1. User adds a link via a new "Submit to Library" button in My Links or Link Library browser
2. Creates a record in new `link_submissions` table (status: pending)
3. Admin sees pending submissions in a new tab in `AdminLinkLibrary`
4. Admin approves → inserts into `link_library`, notifies submitter
5. Admin rejects → notifies submitter with optional note

**Database change:**
```sql
CREATE TABLE public.link_submissions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  link_type    text        NOT NULL CHECK (link_type IN ('ai_prompt', 'external_url', 'hosted_content')),
  title        text        NOT NULL,
  description  text,
  url          text,
  prompt_text  text,
  category     text,
  tags         text[]      NOT NULL DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  uuid        REFERENCES public.users(id),
  reviewed_at  timestamptz,
  reviewer_notes text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.link_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "link_submissions_own"
  ON public.link_submissions FOR ALL
  USING ((SELECT auth.uid()) = submitted_by);
CREATE POLICY "link_submissions_admin"
  ON public.link_submissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );
```

**Files:** New `SubmitLinkDialog.tsx`, update `AdminLinkLibrary.tsx` (add Submissions tab)  
**Estimate:** 10–12 hours

---

#### 4C · Cross-Instance Content Import
**Priority:** 🟢 Low — depends on multi-instance infrastructure being in place

**What it enables:** A user exports their content bundle from Instance A (documents, links, reviews, profile) and imports it to Instance B where they also have an account.

**Approach:** Extend `ExportImportManager` pattern with a user-scoped bundle format. Profile fields and content are portable; memberships are not (instance-specific).

**Files:** New `CrossInstanceImportPage.tsx` or tab in `MyProfessionalPage`  
**Estimate:** 8–10 hours

---

### Phase 5 — Image & Asset Manager
**Total estimate: 10–14 hours**

---

#### 5A · My Assets Page (`/my-content/assets`)
A new page showing all files the user has uploaded to Supabase Storage.

**Shows:**
- Thumbnail preview (for images)
- File name, bucket name, upload date, file size
- Public URL with copy button
- Delete button (with warning if asset may be referenced elsewhere)
- Replace button (upload new file to same path)
- Total storage used (sum of file sizes)

**Requires:** `get_user_storage_objects()` RPC (SQL in Phase 2F above)  
**Also requires:** Storage delete permission via RLS on `storage.objects`  
**Files:** New `MyAssetsPage.tsx`, add route to `App.tsx`, add sidebar link under My Content  
**Estimate:** 8–10 hours

---

#### 5B · Asset Reference Warning
Before deleting an asset, check if its URL appears in any of the user's documents, posts, or profile fields and warn them.

**Estimate:** 2–4 hours

---

### Phase 6 — Home Page Enhancements
**Total estimate: 8–12 hours**

---

#### 6A · Content Health Widget
A small card on the home page showing the user's content health at a glance.

**Shows:**
- Total documents / links / posts
- Red dot or count badge if any health flags exist (broken links, expiring content, untagged docs)
- "Review Now" link to `/my-content/audit`

**Files:** `HomePage.tsx` (either/both versions)  
**Estimate:** 2–3 hours

---

#### 6B · Quick Import Shortcut
A persistent "+ Add Content" button in the home page header or as a floating action button.

**Opens a small menu with three options:**
- Import URLs (opens `ImportUrlDialog`)
- Create Document (navigates to `/documents/new`)
- Add Review (navigates to `/reviews/new`)

**Files:** `HomePage.tsx`, `DashboardLayout.tsx`  
**Estimate:** 2–3 hours

---

#### 6C · Consolidate Two Home Page Files
`pages/HomePage.tsx` and `components/HomePage.tsx` both exist and serve the `/home` route in different contexts. Merge them into one canonical file combining:
- Action-required items (invitations, applications) from the pages version
- Stats/discovery widgets (badges, tickets, circles, posts feed) from the components version

**Files:** `pages/HomePage.tsx`, `components/HomePage.tsx`  
**Estimate:** 4–6 hours

---

### Phase 7 — Deleted Content Recovery
**Total estimate: 6–8 hours**

---

#### 7A · Trash View & Restore (`/my-content/trash`)
Surface soft-deleted content so users can restore or permanently delete it.

**Shows:** Document title, deletion date, "Restore" button, "Delete Permanently" button  
**Logic:** Query `documents` WHERE `deleted_at IS NOT NULL AND deleted_by = auth.uid()`  
**Retention:** Items auto-purge after 30 days (set by cron)

**Files:** New `MyTrashPage.tsx`, add route, add sidebar link  
**Estimate:** 4–5 hours

---

#### 7B · Permanent Delete Cron
A Supabase scheduled function or Edge Function cron that permanently deletes documents where `deleted_at < now() - interval '30 days'`.

**Estimate:** 2–3 hours

---

## Part 3 — Summary

### Completed
| Item | Hours Spent |
|---|---|
| Auth Web Lock fix (`forceSignOut`) | 2 hrs |
| Disable self-registration (Coming Soon overlay) | 1 hr |
| RLS initplan performance fix (49 policies, 18 tables) | 3 hrs |
| Duplicate index drop (`idx_events_circles`) | 0.5 hrs |
| Document Share button fix | 0.5 hrs |
| Planning documentation (3 plan docs) | 4 hrs |
| **Total completed** | **~11 hrs** |

---

### Planned
| Phase | Feature | Est. Hours |
|---|---|---|
| **Phase 1** | MyCirclesPage fix + Shareable Links + Tag Filter | 8–10 hrs |
| **Phase 2** | My Content Audit Page (full, all tabs) | 28–36 hrs |
| **Phase 3** | Account Deletion + Full Data Export | 32–40 hrs |
| **Phase 4** | Import Enhancements (bookmarks, submissions, cross-instance) | 24–30 hrs |
| **Phase 5** | Image & Asset Manager | 10–14 hrs |
| **Phase 6** | Home Page Enhancements + Consolidation | 8–12 hrs |
| **Phase 7** | Deleted Content Recovery (Trash + Restore) | 6–8 hrs |
| **Total planned** | | **116–150 hrs** |

---

### What the User Gets After All Phases

| Capability | Before | After |
|---|---|---|
| See all circles they belong to | ❌ Admin only | ✅ Phase 1 |
| Generate shareable invite links for own circles/programs | ❌ Admin only | ✅ Phase 1 |
| Tag filtering in Link Library | ❌ | ✅ Phase 1 |
| Unified content footprint in one page | ❌ Fragmented across 7+ pages | ✅ Phase 2 |
| Health flags (broken links, stale content) | ❌ | ✅ Phase 2 |
| See and manage uploaded images | ❌ | ✅ Phase 2 + Phase 5 |
| Shareable link generator from own circles | ❌ | ✅ Phase 2 |
| Self-service account deletion | ❌ | ✅ Phase 3 |
| Full GDPR data export | ❌ Profile only | ✅ Phase 3 |
| Browser bookmark import (HTML) | ⚠️ Coming Soon | ✅ Phase 4 |
| Submit links to shared library | ❌ | ✅ Phase 4 |
| Content health widget on home page | ❌ | ✅ Phase 6 |
| Quick Import shortcut from home | ❌ | ✅ Phase 6 |
| Restore accidentally deleted documents | ❌ | ✅ Phase 7 |
| Document sharing from My Documents | ❌ Broken | ✅ Fixed |
| Sign-out never hangs | ❌ Could freeze | ✅ Fixed |
| RLS query performance | ⚠️ Per-row auth evaluation | ✅ Fixed |
