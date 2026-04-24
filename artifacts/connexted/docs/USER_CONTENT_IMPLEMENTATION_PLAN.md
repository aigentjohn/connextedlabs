# User Content Plan — Implementation Priorities

**Date:** April 2026
**Based on:** `USER_CONTENT_PLAN.md`
**Purpose:** Audit of current state + actionable build order

---

## Phase 1 Audit — What Is Actually Done vs Still Broken

| Item | Plan Said | Actual State |
|---|---|---|
| DecksPage `creator` crash (line 556) | Fix needed | ✅ Already fixed — uses `deck.author` correctly |
| MyCirclesPage member scope | Fix needed | ❌ Still broken — query only includes `host_ids` + `moderator_ids`, not `member_ids` |
| Books `PrivacySelector mode="content"` | Fix needed | ❌ Still broken — both create and edit forms omit `mode` prop |
| Decks `PrivacySelector mode="content"` | Fix needed | ❌ Still broken — both create and edit forms omit `mode` prop |
| Libraries replace `is_public` with `visibility` | Fix needed | ⚠️ Partial — still uses boolean `isPublic` RadioGroup, not PrivacySelector |
| Checklists add visibility field | Fix needed | ❌ Missing — no visibility field or PrivacySelector anywhere in checklist flow |
| Decks server-side visibility filter | Fix needed | ⚠️ Partial — fetches via Edge Function with anon key; no per-user visibility filter |

---

## Recommended Build Order

### Sprint 1 — Bugs and Quick Fixes (½ day)

These are isolated, low-risk fixes with no dependencies.

**1. Fix MyCirclesPage scope** — `MyCirclesPage.tsx`

Change the query OR clause to include `member_ids`:
```typescript
// Current (broken):
.or(`host_ids.cs.{${profile.id}},moderator_ids.cs.{${profile.id}}`)

// Fixed:
.or(`host_ids.cs.{${profile.id}},moderator_ids.cs.{${profile.id}},member_ids.cs.{${profile.id}}`)
```
The UI likely needs a "Role" badge per circle (Host / Moderator / Member) since the
list will now show more circles with different roles.

**Effort:** 1–2 hours

---

**2. Add `mode="content"` to Books PrivacySelector** — `BooksPage.tsx`

Two locations — create dialog and edit dialog:
```tsx
// Add mode prop to both:
<PrivacySelector
  mode="content"          // ← add this
  value={newBook.visibility}
  onChange={(value) => setNewBook({ ...newBook, visibility: value })}
  contentType="book"
/>
```
Also check the Book settings/manage tab for a missing visibility field — if absent,
add a `<PrivacySelector mode="content">` there as well, wired to an update call.

**Effort:** 30–45 minutes

---

**3. Add `mode="content"` to Decks PrivacySelector** — `DecksPage.tsx`

Same fix as Books — two locations (create + edit forms):
```tsx
<PrivacySelector
  mode="content"          // ← add this
  value={newDeck.visibility}
  onChange={(value) => setNewDeck({ ...newDeck, visibility: value })}
  contentType="deck"
/>
```
**Effort:** 30 minutes

---

### Sprint 2 — Visibility Parity (1 day)

**4. Libraries: replace `is_public` with `PrivacySelector`** — `CreateLibraryPage.tsx` + manage tab

Replace the boolean RadioGroup with the standard component:
```tsx
// Remove:
const [isPublic, setIsPublic] = useState(false);
// <RadioGroup value={isPublic ? 'public' : 'private'} ...>

// Add:
const [visibility, setVisibility] = useState<string>('public');
// <PrivacySelector mode="container" value={visibility} onChange={setVisibility} />
```

Update the insert/update call to write `visibility` instead of `is_public`.
Update the fetch/filter query to use `visibility` instead of `is_public`.

**Migration note:** The `is_public` column still exists in the DB alongside `visibility`.
Once the UI is updated, create a migration to:
```sql
-- Backfill visibility from is_public for any rows that weren't migrated
UPDATE public.libraries SET visibility = CASE WHEN is_public THEN 'public' ELSE 'private' END
WHERE visibility IS NULL OR visibility = '';
-- Then drop is_public (optional, do after verifying UI)
ALTER TABLE public.libraries DROP COLUMN IF EXISTS is_public;
```

**Effort:** 2–3 hours (code) + migration to run in Supabase

---

**5. Checklists: add visibility field** — `CreateChecklistPage.tsx` + checklist manage tab

Add `PrivacySelector` to the create form:
```tsx
const [visibility, setVisibility] = useState<string>('public');

// In form:
<PrivacySelector
  mode="container"
  value={visibility}
  onChange={setVisibility}
/>

// In insert:
await supabase.from('checklists').insert({
  name, description, category, is_template,
  visibility,               // ← add
  created_by: profile.id,
});
```

Update the checklist list query to filter out `private` checklists not owned by the
current user:
```typescript
.or(`visibility.eq.public,visibility.eq.member,created_by.eq.${profile.id}`)
```

Also add to the checklist manage/settings tab (same pattern).

**Effort:** 2–3 hours

---

**6. Decks server-side visibility filter**

The deck list currently fetches all decks via an Edge Function with the anon key and
then only filters client-side by search query and ownership. Private decks are
accessible to anyone who knows the deck's URL.

Two options:

**Option A (quick):** Add a client-side visibility filter after the fetch:
```typescript
const visibleDecks = decks.filter(deck =>
  deck.visibility === 'public' ||
  deck.created_by === profile?.id
);
```
This hides private decks from the UI but doesn't prevent direct API access.

**Option B (proper):** Pass the user's auth token to the Edge Function and apply
a server-side visibility filter using RLS. This requires updating the Edge Function
to accept and validate the user's JWT.

**Recommendation:** Do Option A now as a safety net; schedule Option B with the
broader API/RLS audit.

**Effort:** Option A — 30 minutes. Option B — 3–4 hours.

---

### Sprint 3 — My Content Audit Page (4–6 days)

A single page at `/my-content/audit` giving users a full picture of everything they
have contributed. This is the most user-facing of the remaining phases.

**Prerequisites before building:**
- Phase 1 and 2 fixes should be in place (visibility fields consistent across types)
- Supabase Storage bucket must exist for the Images & Assets tab to work
- `reviews` table does not exist yet — the Reviews tab will show a "coming soon" state

**Build order within this page:**
1. Page shell + tab structure
2. Documents tab (simplest — direct Supabase query)
3. Links tab (from `my_contents` table)
4. Posts / Moments tab
5. Summary strip (counts + health flags)
6. Shareable Links tab (circles + programs where user is in `admin_ids`)
7. Images & Assets tab (blocked on Storage bucket — build last)
8. Reviews tab (blocked on `reviews` table — build as stub)

**Run this SQL first:**
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

### Sprint 4 — Account Deletion & Data Export (5–7 days)

**Prerequisites:**
- Legal/product decision: what content is deleted vs retained vs anonymised
- 30-day grace period requires either a cron job (Supabase pg_cron) or an Edge Function
  triggered nightly

**Run this SQL first:**
```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;
```

**Build order:**
1. Account deletion UI (`/my-account/delete`) — confirmation flow + grace period logic
2. Soft-remove content from public views on deletion request
3. Data export UI (`/my-account/export`) — async ZIP generation
4. Export delivery (email link or direct download)
5. Hard delete cron job (runs nightly, processes rows where `deletion_scheduled_for < now()`)

**Effort:** 5–7 days

---

### Sprint 5 — Link Health & Import Enhancements (3–4 days)

**5a. Link health review workflow** (1–2 days)

```sql
ALTER TABLE public.my_contents
  ADD COLUMN IF NOT EXISTS reviewed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_status        text
    CHECK (health_status IN ('ok', 'stale', 'broken', 'unverified'))
    DEFAULT 'unverified';
```

Add "Needs Review" tab to My Links. One-click actions: Mark Reviewed / Archive / Update URL.

**5b. Browser bookmark import** (1 day)

Complete the "Coming Soon" bookmarks tab in `ImportUrlDialog`. Parse Netscape
Bookmark Format (HTML export from all major browsers). Map folders to
`my_contents.folder_path`.

**5c. User link submission to shared library** (2 days)

New `link_submissions` table (SQL in USER_CONTENT_PLAN.md §5b). Admin review tab
in `AdminLinkLibrary`. Notification on approval.

---

### Sprint 6 — Home Page & Trash (2–3 days)

**6a. Consolidate duplicate HomePage files** (2–3 hours)
- `pages/HomePage.tsx` and `components/HomePage.tsx` both serve `/home`
- Merge into one canonical file

**6b. My Content Summary widget on home** (1 day)
- Small card: Documents / Links / Posts / Reviews counts
- Red indicator if health flags exist
- "View All" links to audit page

**6c. Deleted content recovery — Trash view** (1 day)
- Query soft-deleted documents/content owned by the user
- Restore button + permanent delete button
- 30-day retention warning

---

## What Is Blocked

| Item | Blocked on |
|---|---|
| Reviews tab in audit page | `reviews` table not yet created |
| Images & Assets tab | Supabase Storage bucket not yet set up |
| Data export — images | Storage bucket required |
| Hard-delete cron | pg_cron or Edge Function scheduler setup |
| Option B deck visibility | Edge Function update to accept user JWT |

---

## Effort Summary (Updated)

| Sprint | Work | Effort |
|---|---|---|
| 1 | MyCircles fix + PrivacySelector mode fixes (Books, Decks) | ½ day |
| 2 | Libraries visibility, Checklists visibility, Decks filter | 1 day |
| 3 | My Content Audit page | 4–6 days |
| 4 | Account deletion + data export | 5–7 days |
| 5 | Link health + import enhancements | 3–4 days |
| 6 | Home page consolidation + trash view | 2–3 days |
| **Total** | | **~16–22 days** |

Sprints 1 and 2 are the highest value per hour — they fix real user-facing bugs
and data integrity gaps with minimal effort. Start there.
