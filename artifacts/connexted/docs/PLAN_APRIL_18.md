# Next Steps Plan — April 18, 2026

A summary of all open work as of April 18. Items are grouped by area and ordered
by dependency. Pick up any section independently.

Reference documents:
- `docs/VISIBILITY_AND_ACCESS_MODEL.md` — visibility model and status
- `docs/IMAGE_SPECIFICATIONS.md` — image types, specs, and upload plan
- `docs/CLEANUP_AND_DEVELOPMENT_NOTES.md` — known gaps and dead code

---

## 1. Visibility & Access Model — Remaining Work

The schema and runtime logic are complete. Two access checks are still stubbed.

### 1a. Premium content — journey enrollment check  *(Phase 2)*
Currently `premium` visibility always returns `false` in `visibility-access.ts`.
Needs a real enrollment check.

**What to build:**
- Helper function `canAccessPremiumContent(profile, contentType, contentId)` in `visibility-access.ts`
- Checks whether the user is enrolled in any program or course whose `journey_items` includes this content item
- Preload enrolled program/course IDs into `profile` at login to avoid per-item queries on browse pages
- Replace the `// TODO Phase 2` stubs in `DocumentsPage.tsx`, `EventsPage.tsx`, `ReviewsPage.tsx` with this function

**Files to change:**
- `src/lib/visibility-access.ts`
- `src/lib/auth-context.tsx` — add enrolled IDs to session profile
- `src/app/components/DocumentsPage.tsx`
- `src/app/components/EventsPage.tsx`
- `src/app/components/ReviewsPage.tsx`

---

### 1b. Companion access check  *(Phase 2)*
Content pinned in a circle companion is accessible to circle members regardless of
visibility. This override is documented but not yet implemented in the runtime check.

**What to build:**
- Helper function `hasCompanionAccess(profile, contentType, contentId)` in `visibility-access.ts`
- Checks `circle_companion_items` (and equivalent companion tables) for any context the user belongs to
- Call this as a fallback in `canViewContainer` when visibility check would otherwise return false

**Files to change:**
- `src/lib/visibility-access.ts`

---

### 1c. Wire `PrivacySelector` mode prop into all forms  *(Phase 3)*
`PrivacySelector` now supports `mode="content"` and `mode="container"` but all
existing forms still call it without the prop (defaults to container mode, showing
`public / member / private` — wrong for content types).

**Action:** Find every usage of `<PrivacySelector` and add the correct `mode` prop:
- Content create/manage forms (blogs, episodes, documents, posts, books, decks) → `mode="content"`
- Container create/manage forms (tables, builds, playlists, etc.) → `mode="container"`

---

### 1d. Filter `member` containers from Explore/Discover  *(Phase 4)*
Containers with `visibility = 'member'` should not appear in Explore/Discover or
global search for users who are not already members.

**Files to check:** `src/app/components/shared/ExploreDialog.tsx`,
`src/app/components/ExplorePage.tsx` (if it exists)

---

## 2. Image Upload  *(new work)*

No file upload exists anywhere on the platform. All images are URL text fields.
Full specifications are in `docs/IMAGE_SPECIFICATIONS.md`.

### 2a. Supabase storage buckets
Create three buckets in Supabase dashboard:
- `avatars` — user profile photos (public read, authenticated write)
- `content-images` — featured images, thumbnails, cover images (public read, authenticated write)
- `logos` — company and platform logos (public read, authenticated write)

### 2b. ImageUpload component
Build `src/app/components/unified/ImageUpload.tsx`:
- Props: `bucket`, `path`, `aspectRatio`, `maxSizeMB`, `currentUrl`, `onUpload`
- Drag-and-drop or click-to-select
- Client-side preview before upload
- Format and size validation
- Upload to Supabase storage, return public URL
- Progress indicator
- Build `AvatarUpload` variant with circular crop preview

### 2c. Wire into forms
Replace URL text fields with `ImageUpload` in (priority order):
1. User avatar — `src/app/components/profile/AboutTab.tsx`
2. Blog featured image — `ShareBlogForm.tsx` / `BlogDetailPage` manage tab
3. Magazine cover image — `CreateMagazineForm.tsx` / `MagazineDetailPage` manage tab
4. Episode thumbnail — `CreateEpisodePage.tsx` / episode manage tab
5. Playlist cover image — `CreatePlaylistPage.tsx` / `PlaylistDetailPage` manage tab
6. Company logo — company create/manage forms
7. Platform logo — `PlatformSettings.tsx`

### 2d. Consistency cleanup
- Rename `playlists.cover_image` → `cover_image_url` (migration needed)
- Display playlist cover image in `PlaylistCard` (currently shows gradient only)
- Replace raw `<img>` tags with `ImageWithFallback` across all components that render user-supplied images
- Add dimension guidance text below each image input field

---

## 3. Code Cleanup  *(from CLEANUP_AND_DEVELOPMENT_NOTES.md)*

### 3a. Dead routes — quick wins
- Check `App.tsx` for `/magazines/:id/settings` and `/playlists/:slug/settings` routes — remove if present
- Delete `MagazineSettingsPage.tsx` and `PlaylistSettingsPage.tsx` if they exist and are unreachable
- Confirm nothing links to `/episodes/:id/edit`

### 3b. Stale interface field
- Remove `views: number` from the `Episode` interface in `EpisodesPage.tsx`

### 3c. Dead database columns
Decide on each:
- `blogs.view_count` — drop or wire up server-side tracking
- `blogs.click_count` — drop or build analytics query against `blog_clicks` table
- `episodes.views` — drop or wire up server-side tracking

### 3d. Prompt component cleanup
- `CirclePrompts.tsx` and `ProgramPrompts.tsx` — replace `confirm()` with `AlertDialog`
- `CirclePrompts.tsx` — remove unused `Edit2` import or add edit dialog
- Align permission model between circles (any member) and programs (admins only)

### 3e. TopicSelector audit
Verify `<TopicSelector` renders in a full-page context in all usages — it is now
always-visible (not a popover) so compact contexts will look broken.
Known safe usages already verified. Check any new usages added since April.

---

## 4. Nav Page Audit  *(unknown status)*

The following nav items exist in `nav-config.ts` but have not been verified as
working. For each: confirm a route exists in `App.tsx`, a page component exists,
and the page renders meaningfully.

| Nav item | Route | Min class |
|---|---|---|
| Tables | `/tables` | 3 |
| Meetings | `/meetings` | 3 |
| Libraries | `/libraries` | 3 |
| Checklists | `/checklists` | 3 |
| Standups | `/standups` | 7 |
| Sprints | `/sprints` | 7 |
| Elevators | `/elevators` | 10 |
| Pitches | `/pitches` | 10 |
| Builds | `/builds` | 10 |
| Meetups | `/meetups` | 10 |

---

## 5. Deferred Features  *(decide when to pick up)*

### 5a. Standalone Prompts container
A `prompts` table exists with the right shape but no pages or routes are built.
Decision needed: build out as a full container type (like Magazines) or leave deferred.
See `docs/CLEANUP_AND_DEVELOPMENT_NOTES.md` section 3 for details.

### 5b. Audio / Podcast support
Episodes are video-only. Adding audio requires:
- `media_type: 'video' | 'audio'` column on `episodes`
- `MediaPlayer` component replacing `VideoPlayer`
- Square cover art layout in `EpisodeCard` for audio
See `docs/CLEANUP_AND_DEVELOPMENT_NOTES.md` section 9 for full plan.

### 5c. Engagement metrics at scale
`content_likes`, `content_ratings`, `content_shares` are fetched with separate
parallel queries on browse pages. Fine at current scale but will need materialised
counts or a batch Edge Function before browse pages handle thousands of items.

### 5d. Reviews content type
The `reviews` table does not yet exist. When created:
- Add `visibility` column with CHECK `(visibility IN ('public', 'premium', 'private'))`
- Add to `user_class_permissions` for the appropriate class tiers
- Build `ReviewsPage`, review cards, create/manage flow

---

## 6. Completed This Session  *(for reference)*

- ✅ UserManagement page crash fixed (USER_CLASSES undefined, badges null guard, adminFetch timeout)
- ✅ Visibility & Access Model designed and documented
- ✅ `_premium` type codes removed from permissions model and code
- ✅ DB schema normalised — `visibility` column on all content and container tables, CHECK constraints applied, `members-only` migrated to `member`
- ✅ `visibility-access.ts` rewritten — two-level content access check, `isContent` flag, `memberRequiresTier` removed
- ✅ `PrivacySelector` updated — `mode` prop, correct option sets per type
- ✅ `VisibilityBadge` updated — `premium` added, `unlisted` and `members-only` removed
- ✅ Browse pages updated — `unlisted` removed, `premium` stubbed
- ✅ `ContainerConfigurationPage` info card updated
- ✅ `VISIBILITY_AND_ACCESS_MODEL.md` updated to reflect current implementation
- ✅ `IMAGE_SPECIFICATIONS.md` created with full audit and development plan
