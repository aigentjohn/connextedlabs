# User Content Plan

Last updated: April 2026

---

## What This Plan Covers

Everything a user can see, manage, add, update, import, share, or audit about their
own content and data on the platform — without requiring admin intervention.

---

## 1. Current State — My Content Features

### My Content sidebar section

| Route | Feature | Status | Notes |
|---|---|---|---|
| `/my-content/audit` | Content Audit — unified footprint across docs, links, posts, tags, shareable links | ✅ Built | Assets + Reviews tabs are stubs (blocked — see below) |
| `/my-content/trash` | Trash — restore or permanently delete soft-deleted documents | ✅ Built | 30-day retention warning; permanent delete with confirmation |
| `/my-documents` | My Documents — edit, delete, share, search, tabs by scope | ✅ Working | Trash button in header links to `/my-content/trash` |
| `/my-contents` | My Links — folder org, import, bulk enrich, health check | ✅ Working | No nested folders; bookmark import still "Coming Soon" |
| `/my-reviews` | My Reviews — rating, tags, circles; edit, delete | ✅ Working | — |
| `/my-content-admin` | Content lifecycle — expiring/scheduled containers, renew, make permanent | ✅ Working | See `EXPIRE_AND_RENEW_PLAN.md` for full detail |
| `/books` | My Books | ✅ Fixed | PrivacySelector `mode="content"` corrected |
| `/decks` | My Decks | ✅ Fixed | PrivacySelector `mode="content"` corrected; client-side visibility filter added |
| `/checklists` | My Lists | ✅ Fixed | PrivacySelector `mode="container"` added; visibility filter on list query |
| `/libraries` | My Libraries | ✅ Fixed | `is_public` replaced with `PrivacySelector mode="container"`; backfill migration run |

### My Growth section

| Route | Feature | Status |
|---|---|---|
| `/my-courses` | Enrolled courses | ⚠️ Not reviewed |
| `/my-programs` | Program enrollments | ⚠️ Not reviewed |
| `/browse-pathways` | Pathway discovery | ✅ Working |
| `/my-growth` | Pathways progress | ✅ Working |
| `/profile/badges` | Badge display | ✅ Working |
| `/moments/{userId}` | Chronological posts feed; edit/delete own | ✅ Working |
| `/portfolio/{userId}` | Portfolio items | ⚠️ Not reviewed |

### Home page

| Feature | Status | Notes |
|---|---|---|
| My Content summary card | ✅ Built | Shows Documents, Saved Links, Moments counts; links to audit + trash |
| Stats grid | ✅ Working | Circles, Badges, Tickets, Portfolio, Moments |
| Quick Access grid | ✅ Working | — |
| Recent Activity feed | ✅ Working | Latest posts from user's circles |
| Two duplicate HomePage files | ✅ Resolved | Dead `pages/HomePage.tsx` deleted; `components/HomePage.tsx` is canonical |

### Known remaining gaps

| Gap | Priority | Blocking on |
|---|---|---|
| Account deletion (user-initiated) | 🔴 High | Product decision on deletion policy + DB migration |
| Full data export (GDPR-style) | 🔴 High | Async ZIP generation + storage access |
| Reviews table does not exist | 🔴 High | Reviews tab in audit page is a stub until table is created |
| Supabase Storage not set up | 🟡 Medium | Assets tab in audit page is a stub; no image uploads work yet |
| Personal shareable link generator | 🟡 Medium | Circle/program admins can't generate invite URLs themselves |
| Tag filtering in Link Library | 🟡 Medium | No tag filter on `/links` browse page |
| Browser bookmark import (HTML) | 🟢 Low | "Coming Soon" tab in ImportUrlDialog |
| User link submission to shared library | 🟢 Low | New `link_submissions` table + admin review UI |
| Link health tracking columns | 🟢 Low | `reviewed_at`, `last_health_check_at`, `health_status` on `my_contents` |

---

## 2. What Was Fixed This Session (April 2026)

### Sprint 1 — Bugs and visibility quick fixes
- **MyCirclesPage** — query now includes `member_ids` so all member circles appear; role badges added (Host / Moderator / Member)
- **BooksPage** — `PrivacySelector` given `mode="content"` on create and edit forms
- **DecksPage** — `PrivacySelector` given `mode="content"` on create and edit forms; line 556 crash fixed (`creator` → `deck.author`)

### Sprint 2 — Visibility parity
- **CreateLibraryPage** — `is_public` boolean replaced with `PrivacySelector mode="container"` writing to `visibility`
- **LibraryDetailPage** — badge now reads `visibility` field
- **CreateChecklistPage** — `PrivacySelector mode="container"` added, `visibility` written on insert
- **ChecklistsPage** — list query filters by `visibility` (public/member/own)
- **Migration** — `20260424000002` backfills `libraries.visibility` from `is_public`

### Sprint 3 — My Content Audit page
- New page at `/my-content/audit` with tabs: Documents, Links, Posts, Tags, Shareable Links, Assets (stub), Reviews (stub)
- Summary strip: counts for documents, links, posts, shareable links; health flag banner
- Route added to App.tsx; sidebar link added as first item under MY CONTENT

### Sprint 6 — Home page and trash
- **TrashPage** — new page at `/my-content/trash`; restores or permanently deletes soft-deleted documents; 30-day expiry warning
- **HomePage** — My Content summary card added (documents, links, moments counts); `linksCount` query added; dead `pages/HomePage.tsx` deleted
- **DecksPage** — client-side visibility filter added (private decks owned by others hidden from list)
- **MyDocumentsPage** — Trash button added to header
- **MyContentSection sidebar** — Trash link added at bottom of MY CONTENT section

### Friend Companions
- **FriendCompanionsListPage** — full rewrite; page no longer depends on missing `updated_at` column; shows Active / Not started sections
- **Migration** — `20260424000001` adds `updated_at` to `friend_companions` with backfill and trigger

---

## 3. Remaining Work

### Sprint 4 — Account Deletion & Data Export
**Requires product decision first:** what content is deleted vs. anonymised vs. retained when a user deletes their account (posts in circles, reviews, comments).

**Database migration needed:**
```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;
```

**Build order:**
1. `/my-account/delete` — confirmation flow, 30-day grace period, soft-remove from public views
2. `/my-account/export` — async ZIP of all user data (JSON per content type + images from Storage)
3. Hard-delete cron job — nightly pg_cron or Edge Function, processes rows where `deletion_scheduled_for < now()`

**Estimated effort:** 5–7 days

---

### Sprint 5 — Link Health & Import Enhancements

**5a. Link health tracking** (1–2 days)

```sql
ALTER TABLE public.my_contents
  ADD COLUMN IF NOT EXISTS reviewed_at            timestamptz,
  ADD COLUMN IF NOT EXISTS last_health_check_at   timestamptz,
  ADD COLUMN IF NOT EXISTS health_status          text
    CHECK (health_status IN ('ok', 'stale', 'broken', 'unverified'))
    DEFAULT 'unverified';
```

Add "Needs Review" tab to My Links. One-click: Mark Reviewed / Archive / Update URL.
Stale = `last_used_at < now() - interval '90 days'`.

**5b. Browser bookmark import** (1 day)

Complete the "Coming Soon" bookmarks tab in `ImportUrlDialog.tsx`. Parse Netscape
Bookmark Format (HTML export from Chrome / Firefox / Safari). Map folder hierarchy
to `my_contents.folder_path`.

**5c. User link submission to shared library** (2 days)

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
CREATE POLICY "link_submissions_own"        ON public.link_submissions FOR ALL    USING ((SELECT auth.uid()) = submitted_by);
CREATE POLICY "link_submissions_admin_read" ON public.link_submissions FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin','super')));
CREATE POLICY "link_submissions_admin_edit" ON public.link_submissions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin','super')));
```

Admin review UI: new tab in `AdminLinkLibrary`. On approval → insert to `link_library`, notify submitter.

**Estimated effort:** 3–4 days total

---

### Remaining Quick Wins (no sprint assigned yet)

| Item | File(s) | Effort |
|---|---|---|
| Personal shareable link generator for circle/program admins | Reuse `ShareableLinksManager` logic; add "Share" section to circle/program detail pages | 2–3 hrs |
| Tag filtering in Link Library browser | `LinkLibraryBrowser.tsx` — add tag dropdown from `link_library.tags` | 1–2 hrs |
| Decks — proper server-side visibility filter (Option B) | Update Edge Function to accept user JWT; apply RLS | 3–4 hrs |

---

## 4. Blocked Items

These items cannot be built until external prerequisites are met:

| Item | Blocked on |
|---|---|
| Assets tab in My Content Audit | Supabase Storage buckets + `get_user_storage_objects()` RPC — see `STORAGE_AND_ASSETS_STRATEGY.md` |
| Reviews tab in My Content Audit | `reviews` table does not exist yet |
| Data export images | Supabase Storage setup |
| Hard-delete cron | pg_cron extension or scheduled Edge Function |
| Image upload on any form | `ImageUpload` component + bucket setup — see `IMAGE_SPECIFICATIONS.md` |
| Cloud folder import (Google Drive etc.) | OAuth app registration — see `CLOUD_STORAGE_INTEGRATION_PLAN.md` |

---

## 5. Effort Summary

| Sprint | Work | Status | Effort |
|---|---|---|---|
| 1 | MyCircles, Books, Decks fixes | ✅ Done | — |
| 2 | Libraries, Checklists visibility parity | ✅ Done | — |
| 3 | My Content Audit page | ✅ Done | — |
| 6 | Home page + Trash | ✅ Done | — |
| 4 | Account deletion + data export | ❌ Not started | 5–7 days |
| 5 | Link health + bookmark import + submissions | ❌ Not started | 3–4 days |
| — | Quick wins (shareable links, tag filter, decks RLS) | ❌ Not started | 1 day |
| **Remaining total** | | | **~9–12 days** |

---

## 6. Related Documents

These topics have dedicated documents and are not duplicated here:

| Topic | Document |
|---|---|
| Image upload — specs, buckets, upload component plan | `IMAGE_SPECIFICATIONS.md` |
| Storage philosophy — URL model vs. uploads, tiered storage | `STORAGE_AND_ASSETS_STRATEGY.md` |
| Cloud storage integration (Google Drive, OneDrive, Dropbox) | `CLOUD_STORAGE_INTEGRATION_PLAN.md` |
| Content expiration, renewal, community survival mechanics | `EXPIRE_AND_RENEW_PLAN.md` |
| Visibility states, PrivacySelector, access checks | `VISIBILITY_AND_ACCESS_MODEL.md` |
| Books — episodes, blogs, Shelf collection design | `BOOKS_FUTURE_DEVELOPMENT.md` |
| Lists — kanban, schedule, estimate, punchlist, templates | `LISTS_FUTURE_DEVELOPMENT.md` |
| Photos and Albums — first-class content type plan | `PHOTOS_ALBUMS_PLAN.md` |
| Interactive content types — polls, rankings, assignments, etc. | `INTERACTIVE_CONTENT_TYPES_PLAN.md` |
| Cross-instance content import | `MULTI_INSTANCE_PLAN.md` |
