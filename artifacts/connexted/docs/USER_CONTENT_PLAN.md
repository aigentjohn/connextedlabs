# User Content Plan

This document merges the former `MY_CONTENT_HUB_PLAN.md` and
`USER_CONTENT_CONTROL_PLAN.md` into a single reference. Items have been evaluated
against the April 2026 platform updates (visibility model, schema normalisation,
PrivacySelector, image specifications).

Last updated: April 2026

---

## What This Plan Covers

Everything a user can see, manage, add, update, import, share, or audit about their
own content and data on the platform — without requiring admin intervention.

---

## 1. Current State of User Content Features

### My Content sidebar section

| Route | Feature | Status | Notes |
|---|---|---|---|
| `/my-documents` | Authored docs — edit, delete, share, search, tabs by scope | ✅ Working | Share dialog fixed |
| `/my-contents` | My Links — folder org, import, bulk enrich, health check | ✅ Working | No nested folders, no export |
| `/my-reviews` | Reviews with rating, tags, circles; edit, delete | ✅ Working | Edit flow unclear |
| `/my-content-admin` | Expiring/scheduled content lifecycle, renew RPC | ✅ Working | No renewal history, no auto-notify |
| `/books` | My Books | ⚠️ Issues found | PrivacySelector wrong mode; settings page missing visibility |
| `/decks` | My Decks | ⚠️ Issues found | PrivacySelector wrong mode; no server-side access control; line 556 bug |
| `/checklists` | My Lists | ❌ Incomplete | No visibility field or access control in UI |
| `/libraries` | My Libraries | ⚠️ Issues found | UI still uses `is_public` boolean despite DB migration |

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

### Known broken / incomplete

| Issue | Detail |
|---|---|
| My Circles shows wrong scope | `/my-circles` only shows circles where user is host/moderator — excludes all member-only circles |
| No unified content view | User must visit 5+ pages to see all their content |
| No image/asset manager | No way to see or manage uploaded avatars, covers, logos |
| No personal shareable link generator | Users who admin circles/programs cannot generate landing page URLs |
| No account deletion | No user-initiated delete flow |
| No full data export | No GDPR-style data dump |

---

## 2. Review Findings — My Books, My Decks, My Lists, My Libraries

These four pages were audited in April 2026 as part of the visibility model normalisation work.

---

### My Books (`/books`)

**What works:**
- Books load and display correctly for the owner
- `PrivacySelector` is present on the create/manage form

**Issues found:**
- `PrivacySelector` is called without a `mode` prop — defaults to `mode="container"`, showing `public / member / private`
  Books are a **content type** and must use `mode="content"` (`public / premium / private`)
- The Settings page for a book does not include a visibility control at all — visibility can only be set at creation time, not updated later

**Fixes needed:**
- Add `mode="content"` to `<PrivacySelector` in the book create form
- Add a visibility field (with `mode="content"`) to the book settings/manage tab

---

### My Decks (`/decks`)

**What works:**
- Decks load and display for the owner
- `visibility` column exists in the DB; `PrivacySelector` is present on create/manage forms

**Issues found:**
- `PrivacySelector` is called without `mode` prop — shows `public / member / private` (wrong for content)
  Must use `mode="content"` → `public / premium / private`
- **Bug on line 556** of `DecksPage.tsx`: references an undefined variable `creator` — should be `deck.author`
  This will throw a runtime error when the deck author block is rendered
- No server-side access control: the API query returns all decks regardless of `visibility`
  A public deck and a private deck are both accessible via direct URL or API call for any user
- `admin_ids` and `member_ids` columns exist on the `decks` table but are not used anywhere in the UI

**Fixes needed:**
- Add `mode="content"` to `<PrivacySelector` in deck create/manage forms
- Fix line 556: replace `creator` with `deck.author`
- Add server-side visibility filter to the deck query (exclude `private` decks the user doesn't own; exclude `premium` decks from non-enrolled users)
- Decide whether `admin_ids` / `member_ids` on decks is intentional — if not, ignore or remove

---

### My Lists / Checklists (`/checklists`)

**What works:**
- Checklists load and can be created, edited, and completed

**Issues found:**
- No `visibility` field exists in the checklist create or manage UI — every checklist is effectively always `public`
- No `PrivacySelector` component is used anywhere in the checklist flow
- No access control applied when rendering checklists — visibility column exists in DB (added during April migration) but the UI neither reads nor writes it
- Checklists are a **container type** and should use `mode="container"` → `public / member / private`

**Fixes needed:**
- Add `<PrivacySelector mode="container">` to the checklist create form, wired to `visibility`
- Add visibility field to the checklist manage/settings tab
- Add server-side filter to the checklist list query so `member` and `private` checklists are filtered correctly

---

### My Libraries (`/libraries`)

**What works:**
- Libraries load and display; the `visibility` column was added to the DB during the April 2026 migration

**Issues found:**
- The create page still uses a **boolean toggle** (`is_public: true / false`) instead of the `visibility` column
- The manage/settings page has the same boolean toggle — it does not read or write the `visibility` field
- The `is_public` boolean was not removed from the table — both columns exist; only `is_public` is used in the UI
- Libraries are a **container type** and should use `mode="container"` → `public / member / private`

**Fixes needed:**
- Replace the boolean `is_public` toggle with `<PrivacySelector mode="container">` writing to `visibility`
- Update the library list query to filter by `visibility` (not `is_public`)
- Decide whether to drop `is_public` from the `libraries` table in a migration once UI is updated

---

## 3. Impact of Recent Updates (April 2026)

The following changes from this session affect this plan:

**Visibility model normalised:**
- All content tables now have a `visibility` column with CHECK constraints
- `unlisted` is removed — anything that was unlisted is now `private`
- `premium` is a new valid state for content (hidden from browse, journey-only)
- `private` is the consistent term for creator-only content
- Any references to `unlisted` in content management UI need updating

**PrivacySelector updated:**
- Now has `mode="content"` (public/premium/private) and `mode="container"` (public/member/private)
- All content create/manage forms need the correct `mode` prop wired in — this includes forms in the My Content area (document create, blog create, etc.)

**Reviews table does not exist:**
- `reviews` was listed as a content type in both original plans
- The table has not been created yet — any audit or management features for reviews are blocked until the table is built

**Image specifications documented:**
- `docs/IMAGE_SPECIFICATIONS.md` now covers all image types, specs, and a 5-phase upload plan
- The image/asset manager described in both original plans (Phase 3 / Phase 5) is now covered in detail there
- No duplication needed here — reference that document for image upload work

---

## 4. What Users Cannot Do (Priority Order)

| Capability | Priority | Blocking on |
|---|---|---|
| See all circles they belong to (not just hosted) | 🔴 High | Code fix in MyCirclesPage |
| Delete their account | 🔴 High | New flow + DB change |
| Full data export (GDPR) | 🔴 High | New async export feature |
| Generate invite links for circles/programs they admin | 🟡 Medium | Code — reuse ShareableLinksManager logic |
| See a unified view of all their content | 🟡 Medium | New My Content Audit page |
| See and manage their uploaded images | 🟡 Medium | Image upload plan (IMAGE_SPECIFICATIONS.md) + Supabase Storage RPC |
| Submit links to the shared library | 🟡 Medium | New table + admin review flow |
| Restore soft-deleted content | 🟡 Medium | New Trash view |
| Set visibility on their checklists | 🟡 Medium | Add PrivacySelector to checklist create/manage forms |
| Set visibility on their libraries | 🟡 Medium | Replace is_public toggle with PrivacySelector in library forms |
| Have their private/premium decks protected server-side | 🟡 Medium | Add visibility filter to deck API query |
| Browser bookmark import (HTML) | 🟢 Low | Completes existing "Coming Soon" in ImportUrlDialog |
| Bulk delete/archive content | 🟢 Low | UI addition |
| Activity/login audit log | 🟢 Low | New table |
| Per-sender notification muting | 🟢 Low | Notification preferences extension |

---

## 5. Development Plan

### Phase 1 — Quick Fixes (ready to build)

**1a. Fix MyCirclesPage scope**
- `/my-circles` currently only queries circles where user is host or moderator
- Should query all circles where user is in `member_ids`
- File: `src/app/components/MyCirclesPage.tsx` (or equivalent)
- Effort: 2–3 hours

**1b. Personal shareable link generator**
- Circle and program admins need to generate their own landing page / invite URLs
- Reuse the URL generation logic from `ShareableLinksManager`
- Add a "Share" section to circle and program detail pages for admins
- URLs: `{baseUrl}/circles/{id}/landing`, `{baseUrl}/programs/{slug}/landing`
- Effort: 2–3 hours

**1c. Tag filtering in Link Library**
- `/links` has category filter but no tag filter
- Add tag dropdown from `link_library.tags`
- Effort: 1–2 hours

**1d. Wire correct PrivacySelector mode into content and container forms**
- Content create/manage forms (documents, blogs, episodes, posts, books, decks)
  need `mode="content"` on `PrivacySelector` → shows `public / premium / private`
- Container create/manage forms (checklists, libraries — and any others still missing)
  need `mode="container"` → shows `public / member / private`
- Books settings page is missing a visibility field entirely — add one with `mode="content"`
- Effort: 2–3 hours (search all create/manage forms)

**1e. Fix DecksPage line 556 crash**
- `DecksPage.tsx` line 556 references an undefined variable `creator` — should be `deck.author`
- This causes a runtime error when rendering the deck author credit
- File: `src/app/components/DecksPage.tsx`
- Effort: 15 minutes

**1f. Update Libraries UI to use `visibility` field**
- Libraries create/manage forms still use a boolean `is_public` toggle
- Replace with `<PrivacySelector mode="container">` wired to the `visibility` column
- Update the library list query to filter by `visibility` instead of `is_public`
- File: library create form, `LibraryDetailPage` manage tab
- Effort: 1–2 hours

**1g. Add visibility control to Checklists**
- Checklist create and manage forms have no visibility field at all
- Add `<PrivacySelector mode="container">` wired to `visibility`
- Update checklist list query to apply visibility filter
- File: checklist create form, checklist manage tab
- Effort: 1–2 hours

---

### Phase 2 — My Content Audit Page (`/my-content/audit`)

A single page giving the user a complete picture of everything they have contributed.

**Summary strip:**
- Total counts: Documents · Links · Posts · Reviews · Images · Tags · Memberships
- Health flag count (broken links, expiring content, untagged items)

**Tabs:**

| Tab | Data source |
|---|---|
| Documents | `documents` WHERE `author_id = user.id` |
| Links | `my_contents` WHERE `user_id = user.id` |
| Posts | `posts` WHERE `author_id = user.id` (with circle name) |
| Reviews | `reviews` WHERE `author_id = user.id` — **blocked until reviews table is created** |
| Images & Assets | Supabase Storage via `get_user_storage_objects()` RPC |
| Tags | Aggregate of all tags across documents, links, posts |
| Shareable Links | Circles + programs where user is in `admin_ids` |

**Health flags shown:**
- Links returning 404
- Links not used in 90+ days
- Documents with no tags
- Content expiring soon (from `my_content_admin` logic)

**Database work needed:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_storage_objects()
RETURNS TABLE (
  name        text,
  bucket_id   text,
  created_at  timestamptz,
  updated_at  timestamptz,
  metadata    jsonb,
  size        bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name, bucket_id, created_at, updated_at, metadata,
         (metadata->>'size')::bigint
  FROM storage.objects
  WHERE owner = (SELECT auth.uid())::text;
$$;
```

**Effort:** 4–6 days

---

### Phase 3 — Account Deletion & Data Export

**3a. Account deletion (`/my-account/delete`)**
- User-initiated with confirmation step
- 30-day grace period before hard delete
- Immediately soft-removes content from public views
- Cancels active memberships and tickets

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;
```

**3b. Full data export (`/my-account/export`)**
- Generates a ZIP with JSON files:
  - `profile.json` — all profile fields
  - `documents.json` — all authored documents
  - `links.json` — all `my_contents` rows
  - `posts.json` — all authored posts/moments
  - `reviews.json` — all authored reviews (once reviews table exists)
  - `memberships.json` — all circles, programs, courses
  - `notifications.json` — last 90 days
  - `images/` — all uploaded assets from Supabase Storage
- Async generation; delivered via email or direct download

**Effort:** 5–7 days combined

---

### Phase 4 — Link Health & Review Workflow

Extend the existing URL health check in My Links into a proactive review workflow.

**Database change:**
```sql
ALTER TABLE public.my_contents
  ADD COLUMN IF NOT EXISTS reviewed_at            timestamptz,
  ADD COLUMN IF NOT EXISTS last_health_check_at   timestamptz,
  ADD COLUMN IF NOT EXISTS health_status          text
    CHECK (health_status IN ('ok', 'stale', 'broken', 'unverified'))
    DEFAULT 'unverified';
```

**UI additions:**
- "Needs Review" tab in My Links showing stale + broken links
- One-click: Mark as reviewed / Archive / Update URL
- Stale = not used in 90+ days (`last_used_at < now() - interval '90 days'`)

**Effort:** 1–2 days

---

### Phase 5 — Import Enhancements

**5a. Browser bookmark import (HTML)**
- Complete the "Coming Soon" bookmarks tab in `ImportUrlDialog`
- Parse Netscape Bookmark Format (HTML export from Chrome/Firefox/Safari)
- Map folders → `my_contents.folder_path`
- Effort: 1 day

**5b. User link submission to shared library**
- Allow any user to submit a link for inclusion in the platform Link Library
- Admin reviews and approves via a new tab in `AdminLinkLibrary`
- On approval → inserts to `link_library`, notifies submitter

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

**Effort:** 2 days

---

### Phase 6 — Home Page Enhancements

**6a. My Content Summary widget**
- Small card on home showing: Documents, Links, Posts, Reviews counts
- Red indicator if any health flags exist
- "View All" → audit page

**6b. Quick "+ Add Content" shortcut**
- Floating or header button with three options: Import URLs · Create Document · Add Review

**6c. Consolidate two HomePage files**
- `pages/HomePage.tsx` and `components/HomePage.tsx` both serve `/home`
- Merge into one canonical file combining action items + stats/discovery

**Effort:** 1–2 days

---

### Phase 7 — Deleted Content Recovery (`/my-content/trash`)

- Query soft-deleted documents (`deleted_at IS NOT NULL AND deleted_by = user.id`)
- Show with restore button and permanent delete option
- 30-day retention before automatic hard delete

**Effort:** 1 day

---

## 6. Admin-Side Enhancements

| Item | Detail | Effort |
|---|---|---|
| Per-user content footprint | In UserManagement, "View Content" opens audit page filtered to that user | 1 day |
| Shareable link analytics | Track clicks on landing page URLs; show count + last clicked in ShareableLinksManager | 1 day |
| Data Audit CSV/JSON export | Add export button to DataAuditDashboard | 0.5 days |

---

## 7. Effort Summary

| Phase | Description | Effort |
|---|---|---|
| 1 | Quick fixes (circles, shareable links, tag filter, PrivacySelector mode, Decks bug, Libraries/Checklists UI) | 1–2 days |
| 2 | My Content Audit page | 4–6 days |
| 3 | Account deletion + full data export | 5–7 days |
| 4 | Link health & review workflow | 1–2 days |
| 5 | Import enhancements (bookmarks, link submissions) | 3 days |
| 6 | Home page enhancements + consolidation | 1–2 days |
| 7 | Deleted content recovery | 1 day |
| Admin | Admin-side enhancements | 2–3 days |
| **Total** | | **~18–26 days** |

---

## 8. What Is Covered Elsewhere

These related topics have their own dedicated documents and are not duplicated here:

| Topic | Document |
|---|---|
| Image upload — specs, buckets, upload component | `docs/IMAGE_SPECIFICATIONS.md` |
| Visibility states, access checks, PrivacySelector | `docs/VISIBILITY_AND_ACCESS_MODEL.md` |
| Cross-instance content import | `docs/MULTI_INSTANCE_PLAN.md` |
| Overall next steps as of April 18 | `docs/PLAN_APRIL_18.md` |
