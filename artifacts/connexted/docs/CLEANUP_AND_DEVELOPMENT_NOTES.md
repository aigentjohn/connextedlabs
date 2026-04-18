# Cleanup & Further Development Notes

This document captures known gaps, dead code, and incomplete features identified during the
UX normalization work on Blogs, Episodes, Magazines, and Playlists (April 2026).
Items are grouped by area and rated by priority.

---

## 1. Dead Database Columns

### `blogs.view_count`
- **Status:** Column exists in DB, was previously incremented client-side on every page load.
  Removed from UI because client-side incrementing is noise, not real tracking.
- **Action needed:** Either drop the column in a migration, or wire up real server-side view
  tracking (e.g. via an Edge Function that deduplicates by user+day).

### `blogs.click_count`
- **Status:** Column exists in DB but is never updated. `blog_clicks` inserts go to a separate
  `blog_clicks` table (written in `BlogDetailPage.handleClickThrough`) but that value is never
  read back into `blogs.click_count`. The column is always 0.
- **Action needed:** Either drop the column and build a proper analytics query against
  `blog_clicks`, or remove `blog_clicks` inserts entirely if click tracking is not a priority.

### `episodes.views`
- **Status:** Same pattern as `blogs.view_count` — exists in DB, was displayed in EpisodeCard
  and EpisodeDetailPage header, removed from UI in the same pass.
- **Action needed:** Same as above — drop or wire up real tracking.

---

## 2. Dead Routes

### `/episodes/:id/edit`
- **Status:** Linked from the old owner action buttons in EpisodesPage. No such route exists
  in `App.tsx`. Fixed in EpisodeCard by changing "Edit" → "Manage" linking to `/episodes/:id`.
- **Action needed:** Confirm no other components still link to `/episodes/:id/edit` and that
  it is not defined anywhere in `App.tsx`. Safe to ignore if nothing links to it.

### `/magazines/:id/settings`
- **Status:** Linked from the old MagazineDetailPage Settings button. MagazineSettingsPage
  content has been absorbed into the Manage tab of the new MagazineDetailPage.
- **Action needed:** Check `App.tsx` for a `/magazines/:id/settings` route and remove it.
  Check whether `MagazineSettingsPage.tsx` still exists and can be deleted.

### `/playlists/:slug/settings`
- **Status:** Same as above — PlaylistSettingsPage content absorbed into PlaylistDetailPage
  Manage tab.
- **Action needed:** Check `App.tsx` for a `/playlists/:slug/settings` route and remove it.
  Check whether `PlaylistSettingsPage.tsx` still exists and can be deleted.

---

## 3. Prompts — Deferred Container Type

### Background
The nav item `Prompts → /prompts` was removed from `nav-config.ts` because no pages were built.
Two separate things exist under the "prompts" label:

**a) AI Prompt Libraries inside Circles and Programs (working)**
- `circle_prompts` table — used in `CirclePrompts.tsx` as a tab inside Circle detail pages.
- `program_prompts` table — used in `ProgramPrompts.tsx` as a tab inside Program detail pages.
- Both work: members can create, copy, and delete prompts.

**b) Standalone `prompts` container type (not built)**
- A `prompts` table exists with `name`, `slug`, `member_ids`, `admin_ids` — the same shape as
  Magazines and Playlists.
- No `PromptsPage.tsx`, no `PromptDetailPage.tsx`, no `CreatePromptPage.tsx`, no routes.
- Decision needed: build it out as a full container (like Magazines) or leave it deferred.

### Cleanup needed in existing prompt components
- `CirclePrompts.tsx` and `ProgramPrompts.tsx` both use `confirm()` for delete — should be
  upgraded to `AlertDialog` for consistency with the rest of the platform.
- `Edit2` icon is imported in `CirclePrompts.tsx` but there is no edit dialog — either add one
  or remove the unused import.
- Permission model is inconsistent: circles allow any member to create prompts, programs
  restrict to admins only. Should be aligned.

---

## 4. TopicSelector — Context Risk

### Background
`TopicSelector` was changed from a `Popover` (click to open) to an always-visible inline
tabbed interface to match `TagSelector` behaviour.

### Risk
If `TopicSelector` is used anywhere in a **compact context** (small card, modal dialog,
sidebar panel), it will now be unexpectedly tall — the full Trending/WHO/WHY/Theme tab panel
renders immediately. The change is correct for full-page forms (Manage tabs, Create pages)
but may look wrong in tight spaces.

### Action needed
Search for all usages of `<TopicSelector` and verify each renders in a context with sufficient
vertical space. Known usages (all full-page, safe):
- `BlogDetailPage` Manage tab
- `EpisodeDetailPage` Manage tab
- `MagazineDetailPage` Manage tab
- `PlaylistDetailPage` Manage tab
- `ShareBlogForm`
- `CreateEpisodePage`
- `CreatePlaylistPage`

---

## 5. EpisodesPage — Stale Interface Field

The `Episode` interface in `EpisodesPage.tsx` still declares `views: number` even though
`episode.views` is no longer displayed anywhere in the component. The field is fetched from
the DB but silently ignored.

**Action needed:** Remove `views` from the `Episode` interface in `EpisodesPage.tsx` and
confirm no remaining references.

---

## 6. Nav Items With Unknown Page Status

The following items appear in `nav-config.ts` but their page completeness has not been
reviewed. Each should be checked to confirm a working route and page exists:

| Nav item | Route | Min class | Status |
|---|---|---|---|
| Tables | `/tables` | 3 | Unknown |
| Meetings | `/meetings` | 3 | Unknown |
| Libraries | `/libraries` | 3 | Unknown |
| Checklists | `/checklists` | 3 | Unknown |
| Standups | `/standups` | 7 | Unknown |
| Sprints | `/sprints` | 7 | Unknown |
| Elevators | `/elevators` | 10 | Unknown |
| Pitches | `/pitches` | 10 | Unknown |
| Builds | `/builds` | 10 | Unknown |
| Meetups | `/meetups` | 10 | Unknown |

For each: verify a route exists in `App.tsx`, a page component exists, and the page renders
meaningfully rather than showing an empty or broken state.

---

## 7. MagazineSettingsPage and PlaylistSettingsPage

These files may still exist as orphaned components now that their content has been absorbed
into the respective detail page Manage tabs.

**Action needed:**
- Locate `MagazineSettingsPage.tsx` and `PlaylistSettingsPage.tsx`.
- If routes to them still exist in `App.tsx`, remove those routes.
- Delete the files if they are no longer reachable.

---

## 8. Blog / Episode Engagement Architecture

`content_likes`, `content_ratings`, and `content_shares` tables drive engagement metrics
across both blogs and episodes. Currently these are loaded with separate parallel queries
on each browse page (`BlogsPage`, `EpisodesPage`). At scale this becomes expensive.

**Options to consider:**
- Materialised counts columns on `blogs` and `episodes` tables (updated via DB triggers),
  replacing the multi-query fan-out on page load.
- A dedicated Edge Function that returns pre-aggregated metrics for a batch of content IDs.

Not urgent at current scale, but worth noting before the browse pages handle thousands of items.

---

## 9. Audio / Podcast Support (Deferred)

Discussed and deferred. The recommended approach when ready:

- Add `media_type: 'video' | 'audio'` column to the `episodes` table.
- Extend `media_url`, `media_platform` to replace video-specific field names (or alias them).
- Update `VideoPlayer` → `MediaPlayer` to handle `<audio>` and Spotify/SoundCloud embeds.
- Update `EpisodeCard` to show square cover art instead of 16:9 thumbnail for audio.
- Add audio platform options to `CreateEpisodePage`.

All other episode infrastructure (topics, tags, playlists, engagement, visibility) reuses
without change.
