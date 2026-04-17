# User Content Control & Data Management Plan
## Connexted Labs — Full Platform Audit & Development Roadmap

**Status:** Planning  
**Scope:** Everything a user can see, manage, add, update, import, share, or audit about their own data  
**Goal:** Give individual users meaningful control over their content footprint, content imports, link sharing, and data visibility — without requiring admin intervention.

---

## Part 1 — Home Page (Authenticated)

### What Exists

There are **two home page files** — a pages version and a components version — both serving the authenticated `/home` route:

**`pages/HomePage.tsx`** — Action-oriented dashboard:
- Welcome banner with personalized greeting
- Unread notification count badge
- Roles & Permissions card (platform role, class tier, admin container count)
- Quick Access links (Portfolio, Moments, Activity Feed, Calendar)
- Action Required section: pending invitations (Accept/Decline), program application statuses, upcoming hosted events
- Recently Joined section (last 7 days)
- Upcoming Events (beyond 7 days)

**`components/HomePage.tsx`** — Stats and discovery dashboard:
- Stats grid: My Circles, Badges Earned, Active Tickets, Portfolio Items, Moments Shared
- Quick Access grid: Tickets, Moments, Portfolio, Badges, Courses, Programs, Documents
- Recent Activity feed (latest posts from user's circles, max 5)
- Recommended Circles widget
- My Circles card (up to 5)
- My Applications widget

### Home Page Gaps

| Gap | Detail |
|---|---|
| Two separate home page files | Unclear which is the canonical one; likely both render in different contexts |
| No content health alerts | Home page doesn't surface "you have 3 broken links" or "2 documents untagged" |
| No import shortcut | No "Add content" or "Import" entry point on home |
| No personalised content recommendations | Recommended Circles is generic, not ML or interest-based |
| No recent content edits summary | No "you last edited X" or "this document hasn't been updated in 90 days" |
| No cross-feature summary widget | User has no dashboard summary of their total content footprint |

### Home Page Recommendations

1. Add a **My Content Summary widget** to the home page — total documents, links, reviews, moments in one glance with health indicators (stale, broken, untagged)
2. Surface **"Action Needed"** content alerts (broken links, expiring content, unshared documents)
3. Add a persistent **"+ Add Content"** quick-action button on the home page linking to import/create flows
4. Consolidate the two home page files into one

---

## Part 2 — My Content Sidebar (Full Inventory)

### Sidebar Sections & What Each Does

#### User Section
| Route | Feature | Status |
|---|---|---|
| `/notifications` | Inbox with read/delete; 5 category filters; preference toggles | ✅ Working |
| `/my-tickets` | Assigned tickets, waitlist, redeem, leave waitlist | ✅ Working |
| `/my-basics` | Bio, contact, social, privacy per-field toggles | ✅ Working |
| `/my-professional` | Work history, skills, JSON Resume export/import, vCard | ✅ Working |
| `/my-engagement` | Engagement metrics, interests, looking-for | ✅ Working |
| `/my-account` | User class, usage breakdown, available offerings | ✅ Working |

#### My Content Section
| Route | Feature | Works | Gaps |
|---|---|---|---|
| `/my-documents` | Authored docs; edit, delete, share (now fixed), search, tabs by scope | ✅ Fixed | No bulk ops, no tag editor |
| `/books` | My Books | ⚠️ Not reviewed | Unknown status |
| `/decks` | My Decks | ⚠️ Not reviewed | Unknown status |
| `/checklists` | My Lists/Checklists | ⚠️ Not reviewed | Unknown status |
| `/libraries` | My Libraries | ⚠️ Not reviewed | Unknown status |
| `/my-contents` | My Links — folder org, import, enrich, health check | ✅ Working | No nested folders, no export |
| `/my-reviews` | Reviews with rating, tags, circles; edit, delete | ✅ Working | Edit flow unclear |
| `/my-content-admin` | Expiring/scheduled content lifecycle, renew RPC | ✅ Working | No renewal history, no auto-notify |

#### My Growth Section
| Route | Feature | Status |
|---|---|---|
| `/my-courses` | Enrolled courses | ⚠️ Not reviewed |
| `/my-programs` | Program enrollments | ⚠️ Not reviewed |
| `/browse-pathways` | Pathway discovery | ✅ Working |
| `/my-growth` | My Pathways progress | ✅ Working |
| `/profile/badges` | Badge display | ✅ Working |
| `/moments/{userId}` | Chronological posts feed; edit/delete own | ✅ Working |
| `/portfolio/{userId}` | Portfolio items | ⚠️ Not reviewed |

#### My Business Section
| Route | Feature | Status |
|---|---|---|
| `/my-ventures` | Ventures | ⚠️ Not reviewed |
| `/my-companies` | Company profiles | ⚠️ Not reviewed |

#### My Circles (Broken)
| Route | Feature | Issue |
|---|---|---|
| `/my-circles` | **Only shows circles where user is host/moderator** | ❌ Excludes all member-only circles |

---

## Part 3 — Links Ecosystem (Full Picture)

There are four distinct link-related features that need to be understood as a connected system:

### 3a. My Links (`/my-contents`) — Personal URL Manager
- **Table:** `my_contents`
- **What it stores:** External URLs the user has bookmarked/imported for personal use
- **Folder types:** document, pitch, build, portfolio, post, custom
- **Status:** pending, enriched, archived
- **Actions:** import (manual/JSON/CSV), enrich via AI, health check, batch create content
- **Gap:** Not connected to the platform link library; no way to "promote" a personal link to the shared library

### 3b. Link Library (`/links`) — Platform Curated Links
- **Table:** `link_library` + `content_library`
- **What it stores:** Admin-curated links visible to all members
- **Types:** `ai_prompt`, `external_url`, `hosted_content`
- **User access:** Read-only browsing and copy; engagement tracked via view/click RPCs
- **Admin access:** Full CRUD via `AdminLinkLibrary` at `/platform-admin/links`
- **Gap:** No user-facing ability to submit a link for inclusion; no favorites/save for users

### 3c. Create/Edit Link (`AdminLinkForm`) — Admin Only
- **Route:** Part of `/platform-admin/links`
- **Link types supported:**
  - **AI Prompt** — title, description, prompt text, AI platform checkboxes (ChatGPT, Claude, Gemini, Perplexity, Grok); auto-generates encoded URLs per platform
  - **External URL** — title, description, URL
  - **Hosted Content** — title, content type (article/guide/case study/tutorial/note), markdown body, auto-slug
- **Common fields:** category, visibility (public/members/private), tags
- **Gap:** Admin-only — regular users cannot create links for the shared library

### 3d. Shareable Links Manager (`/platform-admin/shareable-links`) — Admin Only
- **What it generates:**
  - Program landing page: `{baseUrl}/programs/{slug}/landing`
  - Program application form: `{baseUrl}/programs/{slug}/apply`
  - Circle landing page: `{baseUrl}/circles/{id}/landing`
  - Circle request access: `{baseUrl}/circles/{id}/request`
- **Gap:** Admin-only; circle/program admins who are not platform admins cannot access this

### Link Ecosystem — Missing Connections

```
Personal (my_contents)  ←——  No bridge  ——→  Shared Library (link_library)
                                                        ↑
                                              Admin only: AdminLinkForm
                                                        
User's circles/programs  ←——  No bridge  ——→  Shareable link generator
                                              (Admin only: ShareableLinksManager)
```

**What users need but don't have:**
1. Ability to generate shareable invite links for their own circles/programs (they're the admin of those — they just can't generate the URL)
2. Ability to suggest a link for the shared library (submit for admin review)
3. Ability to see the shareable landing page URL for circles/programs they admin

---

## Part 4 — Content Import Capabilities (Full Inventory)

| Import Feature | Location | Who Can Use | Formats | What It Imports |
|---|---|---|---|---|
| **ImportUrlDialog** | `/my-contents` | All users | Manual text, JSON array, CSV | External URLs into `my_contents` |
| **BulkImportManager** | Admin pages | Admins | JSON, CSV (configurable schema) | Any entity type (configurable) |
| **ExportImportManager** | Circle/Program/Course pages | Admins | JSON | Containers, Circles, Programs, Courses |
| **ClaimableProfilesImport** | `/platform-admin/claimable-profiles` | Super admin | CSV/JSON | Pre-provisioned user profiles |
| **CourseExportImport** | Course detail | Course admin | JSON | Course structure + modules |
| **InitializerPage** | `/initializer` | Super admin | JSON config | Entire community (circles, events, users, posts, courses) |
| **MyProfessionalPage import** | `/my-professional` | All users | JSON Resume, vCard | User profile data only |

### Import Gaps

1. **No document import** — users cannot bulk-import documents; only individual URL-based documents
2. **No image/asset import** — no batch upload of profile images, icons, or cover images
3. **No review import** — cannot import a list of reviews from external sources
4. **No link-to-document pipeline** — importing a URL into `my_contents` doesn't automatically offer to create a full document from it (BatchCreateDialog exists but is not prominent)
5. **No cross-instance import** — cannot import content from one Connexted instance to another (relevant given the multi-instance plan)
6. **ImportUrlDialog has "Bookmarks" option marked "Coming Soon"** — browser bookmark export (HTML) not yet supported
7. **No LinkedIn/social profile import** — only JSON Resume and vCard from professional page
8. **No content deduplication across tables** — a URL in `my_contents` and the same URL in `link_library` are not linked

---

## Part 5 — Database Audit & Content Audit

### 5a. Admin Data Audit (`/platform-admin/data-audit`) — Existing
- **Tables read:** users, circles, posts, moments, companies, circle_memberships, demo_accounts, claimable_profiles, playlists
- **Shows:** counts by role, test accounts, empty users, orphaned posts, membership tiers
- **Access:** Admin only
- **Gaps:** No export, no scheduling, no per-user drill-down from here, no RLS audit

### 5b. User-Facing Content Audit — Does Not Exist
There is **no user-facing equivalent** of the data audit. A user has no single page that shows:
- All content they own across every table
- Which of their content is stale, broken, or untagged
- Which of their images/assets are stored in Supabase Storage
- What circles and programs they belong to across all roles

### 5c. User Storage / Images — Does Not Exist
There is no UI anywhere that lets a user:
- See images they have uploaded (avatars, cover photos, logos, icons)
- Manage, replace, or delete uploaded assets
- Know the storage URL of an uploaded image
- Understand how much storage they are using

**Technical path:** Supabase Storage `storage.objects` table can be queried by owner. An RPC `get_user_storage_objects()` would expose this safely through RLS.

---

## Part 6 — Guest & Pre-Login Experience

### Guest Explore Page (`/join`)
- Shows public circles (`access_type='open'`) and open programs (`enrollment_status='open'`)
- Search by circle name/description/tags
- Max 12 circles, 6 programs shown
- CTAs to register or login
- **Gap:** No conversion tracking, no "interested in X" capture before login, no guest session persistence

### Pre-Login Landing Pages
- `/programs/{slug}/landing` — public program landing with enrollment CTA
- `/circles/{id}/landing` — public circle landing with join CTA
- `/preview/circles/:id` — circle preview for sharing
- `/preview/programs/:slug` — program preview for sharing
- **Gap:** No analytics on which landing pages are converting visitors to registrations

---

## Part 7 — User Data Control (Privacy & Ownership)

### What Users Can Do Today
| Control | Available | How |
|---|---|---|
| Edit profile | ✅ | My Basics, My Professional |
| Per-field contact privacy | ✅ | Privacy tab in My Basics |
| Toggle public/private profile | ✅ | Privacy tab |
| Delete own documents | ✅ | My Documents (soft delete) |
| Delete own posts/moments | ✅ | Moments page |
| Delete own reviews | ✅ | My Reviews |
| Leave circles/programs | ✅ | Circle/Program detail pages |
| Export profile as JSON Resume / vCard | ✅ | My Professional |
| Manage notification preferences | ✅ | Notifications page |
| Redeem/manage tickets | ✅ | My Tickets |

### What Users Cannot Do Today
| Control | Missing | Priority |
|---|---|---|
| Delete own account | ❌ | 🔴 Critical |
| Full data export (GDPR dump) | ❌ | 🔴 Critical |
| See all circles they're a member of | ❌ | 🔴 High |
| Restore soft-deleted content | ❌ | 🟡 Medium |
| See/manage uploaded images & assets | ❌ | 🟡 Medium |
| Generate shareable links for own circles/programs | ❌ | 🟡 Medium |
| See a unified content footprint | ❌ | 🟡 Medium |
| Submit links to the shared library | ❌ | 🟡 Medium |
| Bulk delete/archive content | ❌ | 🟢 Low |
| Activity/login audit log | ❌ | 🟢 Low |
| Per-sender notification muting | ❌ | 🟢 Low |
| Browser bookmark import (HTML) | ❌ (Coming Soon) | 🟢 Low |

---

## Part 8 — Full Development Roadmap

### Phase 1 — Immediate Fixes (Done / Quick Wins)
| # | Item | Status | Effort |
|---|---|---|---|
| 1.1 | Fix document sharing button | ✅ Done | 30 min |
| 1.2 | Fix MyCirclesPage to show all member circles | 🔲 Ready | 2–3 hrs |
| 1.3 | Add personal shareable link generator for circle/program admins | 🔲 Ready | 2–3 hrs |
| 1.4 | Add tag filtering to Link Library browser | 🔲 Ready | 1–2 hrs |

### Phase 2 — User Content Audit Page (New, `/my-content/audit`)
A single page that surfaces everything a user has in the platform.

**Sections:**
- **Summary strip** — total counts: documents, links, posts, reviews, images, tags, memberships
- **Health flags** — broken links, stale content, untagged documents, expiring containers
- **Tabs:**
  - Documents (from `documents` table)
  - Links (from `my_contents` table)
  - Posts (from `posts` table, across all circles)
  - Reviews (from `reviews` table)
  - Images & Assets (from Supabase Storage via RPC)
  - Tags (aggregate of all tags used across all content types)
  - Shareable Links (all landing page URLs for circles/programs user admins)

**Estimated effort:** 4–6 days  
**Database change needed:** `get_user_storage_objects()` RPC (see Part 5c)

### Phase 3 — Account Deletion & Data Export
**3a. Account Deletion (`/my-account/delete`)**
- User-initiated with confirmation step
- 30-day grace period (sets `deletion_requested_at`, cron job hard-deletes after 30 days)
- Soft-removes all associated content from public views immediately
- Cancels active memberships and tickets

**Database change:**
```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;
```

**Estimated effort:** 2–3 days

**3b. Full Data Export (`/my-account/export`)**
- Generates a ZIP containing JSON files:
  - `profile.json` — all profile fields
  - `documents.json` — all authored documents
  - `links.json` — all `my_contents` rows
  - `posts.json` — all authored posts/moments
  - `reviews.json` — all authored reviews
  - `memberships.json` — all circles, programs, courses enrolled
  - `notifications.json` — last 90 days
  - `images/` — all uploaded assets from storage
- Delivered via email or direct download (async generation for large datasets)

**Estimated effort:** 3–4 days

### Phase 4 — Import Enhancements

**4a. Browser Bookmark Import (HTML)**
- Complete the "Coming Soon" bookmarks tab in `ImportUrlDialog`
- Parse standard Netscape Bookmark Format (HTML) exported from Chrome/Firefox/Safari
- Extract URLs, titles, folder structure → map to `my_contents` folder_path

**Estimated effort:** 1 day

**4b. Link Submission Workflow (User → Library)**
- Allow any authenticated user to submit a link for inclusion in the shared Link Library
- Creates a record in a new `link_submissions` table with status `pending`
- Admin reviews via a new tab in `AdminLinkLibrary`
- On approval, inserts into `link_library` and notifies submitter

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
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.link_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "link_submissions_own" ON public.link_submissions
  FOR ALL USING ((SELECT auth.uid()) = submitted_by);
CREATE POLICY "link_submissions_admin_read" ON public.link_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );
CREATE POLICY "link_submissions_admin_update" ON public.link_submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );
```

**Estimated effort:** 2 days

**4c. Cross-Instance Content Import**
- Allow a user to export their content bundle from Instance A and import it to Instance B
- Uses the existing `ExportImportManager` pattern
- Scope: documents, links, reviews, profile (not memberships — those are instance-specific)

**Estimated effort:** 2–3 days (after multi-instance infrastructure is in place)

### Phase 5 — Image & Asset Manager (`/my-content/assets`)

**What it shows:**
- Grid of all images uploaded by the user (profile photo, cover images, logos, icons)
- File name, bucket, upload date, file size, preview thumbnail
- Storage URL with copy button
- Approximate storage used vs. any limit

**Actions:**
- Copy public URL
- Delete asset (removes from storage; warns if asset is referenced somewhere)
- Replace asset (upload new file, keep same URL path)

**Database/RPC needed:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_storage_objects()
RETURNS TABLE (
  name       text, bucket_id text,
  created_at timestamptz, updated_at timestamptz,
  metadata   jsonb, size bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name, bucket_id, created_at, updated_at, metadata,
         (metadata->>'size')::bigint
  FROM storage.objects
  WHERE owner = (SELECT auth.uid())::text;
$$;
```

**Estimated effort:** 1–2 days

### Phase 6 — Home Page Enhancements

**6a. My Content Summary widget**
- Small card on home page showing: Documents, Links, Posts, Reviews counts
- Red dot indicator if any health flags exist (broken links, expiring content)
- "View All" links to audit page

**6b. Quick Import shortcut**
- Floating or header "+ Add Content" button surfacing 3 options:
  - Import URLs (opens ImportUrlDialog)
  - Create Document
  - Add Review

**6c. Consolidate two HomePage files**
- Merge `pages/HomePage.tsx` and `components/HomePage.tsx` into one canonical file
- Combine action-required items (invitations, applications) with the stats/discovery widgets

**Estimated effort:** 1–2 days

### Phase 7 — Deleted Content Recovery (`/my-content/trash`)

- Query soft-deleted documents (where `deleted_at IS NOT NULL AND deleted_by = user.id`)
- Show in a "Trash" tab or page with restore button
- Permanent delete option (sets a `permanently_deleted_at` field, purged by cron)
- 30-day retention before automatic permanent deletion

**Estimated effort:** 1 day

---

## Summary: Current vs. Planned State

| Capability | Today | After All Phases |
|---|---|---|
| Home page content health alerts | ❌ | ✅ Phase 6 |
| My Circles shows all member circles | ❌ | ✅ Phase 1 |
| Personal shareable link generator | ❌ | ✅ Phase 1 |
| Unified content audit (all owned content) | ❌ | ✅ Phase 2 |
| Image/asset manager | ❌ | ✅ Phase 5 |
| Account deletion | ❌ | ✅ Phase 3a |
| Full GDPR data export | ❌ | ✅ Phase 3b |
| Browser bookmark import (HTML) | ⚠️ Coming Soon | ✅ Phase 4a |
| User link submission to shared library | ❌ | ✅ Phase 4b |
| Cross-instance content import | ❌ | ✅ Phase 4c |
| Deleted content recovery | ❌ | ✅ Phase 7 |
| Document sharing button | ❌ (broken) | ✅ Fixed |
| Tag filtering in Link Library | ❌ | ✅ Phase 1 |
| Create AI Prompt links | ✅ Admin only | ✅ (submit for review: Phase 4b) |
| Shareable URL for own circles/programs | ❌ | ✅ Phase 1 |
| Link health tracking and review | ⚠️ Partial | ✅ MY_CONTENT_HUB_PLAN Phase 4 |

---

## Effort Summary

| Phase | Description | Estimated Effort |
|---|---|---|
| 1 | Quick fixes (circles, shareable links, tag filter) | 1 day |
| 2 | My Content Audit page | 4–6 days |
| 3 | Account deletion + full data export | 5–7 days |
| 4 | Import enhancements (bookmarks, submissions, cross-instance) | 5–6 days |
| 5 | Image & asset manager | 1–2 days |
| 6 | Home page enhancements + consolidation | 1–2 days |
| 7 | Deleted content recovery (Trash) | 1 day |
| **Total** | | **~18–25 days** |
