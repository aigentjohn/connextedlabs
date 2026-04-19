# Image Specifications

This document defines the requirements for all image types used across the platform —
avatars, cover images, featured images, thumbnails, and logos. It covers current state,
target specifications, and the work needed to get there.

Last updated: April 2026

---

## Current State

All images are currently handled as **external URL text fields**. There is no file upload
capability anywhere on the platform. Users must supply a hosted URL. There is no image
resizing, optimization, or validation. This is an incomplete implementation.

---

## 1. Image Types

### 1a. Avatar
**What it is:** A person's profile photo. Circular crop everywhere it appears.

**Used on:** `users.avatar`

**Where it renders:**

| Context | Size | Component |
|---|---|---|
| Profile page header | 96×96px | `UserProfilePage`, `ProfileHeaderCard` |
| Sponsor detail | 128×128px | `SponsorDetailPage` |
| Blog author credit | 20×20px | `BlogCard` |
| Episode author credit | 24×24px | `EpisodeCard` |
| Magazine curator | 24×24px | `MagazineCard` |
| Admin/member lists | 32–40px | Various admin components |

**Target spec:**
- Shape: circle
- Recommended upload size: **400×400px minimum**
- Aspect ratio: 1:1 (square)
- Formats: JPEG, PNG, WebP
- Max file size: 2MB
- Fallback: initials on a coloured background (already implemented via Radix `AvatarFallback`)

**Current input:** URL text field in `AboutTab.tsx`

---

### 1b. Featured Image
**What it is:** The hero image for a blog post. Appears at the top of the card and
full-width on the detail page.

**Used on:** `blogs.featured_image_url`

**Where it renders:**

| Context | Size | Component |
|---|---|---|
| Blog card | Full width, 192px tall | `BlogCard` |
| Blog detail page | Full width, auto height | `BlogDetailPage` |

**Target spec:**
- Recommended upload size: **1200×630px** (Open Graph standard — works for both card and full-width)
- Aspect ratio: approximately 1.91:1
- Formats: JPEG, PNG, WebP
- Max file size: 5MB
- Fallback: muted background placeholder (already implemented)

**Current input:** URL text field in `ShareBlogForm`

---

### 1c. Thumbnail
**What it is:** The preview image for a video episode. Always displayed at 16:9.

**Used on:** `episodes.thumbnail_url`

**Where it renders:**

| Context | Size | Component |
|---|---|---|
| Episode card | Full width, 16:9 aspect | `EpisodeCard` |

**Target spec:**
- Recommended upload size: **1280×720px**
- Aspect ratio: 16:9 (enforced by `aspect-video` CSS)
- Formats: JPEG, PNG, WebP
- Max file size: 3MB
- Auto-generated: YouTube episodes auto-fetch `maxresdefault.jpg` from the video ID — no upload needed for YouTube content

**Current input:** URL text field; YouTube auto-generates from `video_id`

---

### 1d. Cover Image
**What it is:** A banner image for a container — magazine, playlist, sprint, etc.
Appears at the top of the card.

**Used on:** `magazines.cover_image_url` · `playlists.cover_image` · `sprints.cover_image_url`

**Where it renders:**

| Context | Size | Component |
|---|---|---|
| Magazine card | Full width, 192px tall | `MagazineCard` |
| Magazine detail (small) | 64×64px | `BlogDetailPage` |
| Playlist card | Full width, 16:9 | `PlaylistCard` (placeholder only — not yet implemented) |

**Target spec:**
- Recommended upload size: **1200×630px**
- Aspect ratio: approximately 1.91:1 for magazine cards; 16:9 for playlists
- Formats: JPEG, PNG, WebP
- Max file size: 5MB
- Fallback: gradient placeholder (already implemented for playlists)

**Current input:** URL text field in `CreateMagazineForm`

---

### 1e. Logo
**What it is:** A company or platform brand mark. Square with rounded corners.

**Used on:** `companies.logo_url` · platform settings `logo_url`

**Where it renders:**

| Context | Size | Component |
|---|---|---|
| Company profile header | 96×96px | `CompanyProfilePage` |
| Sidebar community mark | 32×32px | `Sidebar` |
| Platform admin settings | Variable | `PlatformSettings` |

**Target spec:**
- Recommended upload size: **400×400px minimum**
- Aspect ratio: 1:1 (square)
- Formats: JPEG, PNG, WebP (PNG preferred for logos with transparency)
- Max file size: 2MB
- Fallback: gradient with initial letter (already implemented in `CompanyProfilePage`)

**Current input:** URL text field in admin forms; bulk CSV import supported

---

## 2. Gaps and Issues

| Issue | Detail |
|---|---|
| No file upload | All images require an external URL. No upload to Supabase storage exists anywhere. |
| No validation | No format, size, or dimension checks on any image input |
| No resizing | Images served at full original resolution — no optimization |
| Inconsistent column naming | `cover_image_url` (magazines) vs `cover_image` (playlists) vs `thumbnail_url` (episodes) — should be standardized to `*_url` |
| Playlist cover image not displayed | `PlaylistCard` has an `aspect-video` container but renders a gradient placeholder — the `cover_image` field exists in the DB but is never shown |
| No `ImageWithFallback` used consistently | The `ImageWithFallback` component exists (`src/app/components/figma/ImageWithFallback.tsx`) but most components use raw `<img>` tags with no error handling |

---

## 3. Development Plan

### Phase 1 — Supabase storage setup

- [ ] Create storage buckets in Supabase:
  - `avatars` — user profile photos
  - `content-images` — featured images, thumbnails, cover images
  - `logos` — company and platform logos
- [ ] Set bucket policies: public read, authenticated write
- [ ] Define folder structure: `avatars/{user_id}`, `content-images/{type}/{record_id}`, etc.

### Phase 2 — Upload component

- [ ] Build a reusable `ImageUpload` component:
  - Accepts `bucket`, `path`, `aspectRatio`, `maxSizeMB` props
  - Drag-and-drop or click-to-select
  - Client-side preview before upload
  - Validates format (JPEG/PNG/WebP) and file size before uploading
  - Uploads to Supabase storage, returns public URL
  - Shows upload progress
  - Displays current image with a "change" option
- [ ] Build an `AvatarUpload` variant — circular crop preview

### Phase 3 — Wire upload into forms

Replace URL text fields with the `ImageUpload` component in:

- [ ] `AboutTab.tsx` — user avatar
- [ ] `ShareBlogForm.tsx` / `BlogDetailPage` manage tab — featured image
- [ ] `CreateEpisodePage.tsx` / episode manage tab — thumbnail
- [ ] `CreateMagazineForm.tsx` / `MagazineDetailPage` manage tab — cover image
- [ ] `CreatePlaylistPage.tsx` / `PlaylistDetailPage` manage tab — cover image
- [ ] `CreateBuildPage.tsx`, `CreateTablePage.tsx`, etc. — cover images on containers
- [ ] `PlatformSettings.tsx` — platform logo
- [ ] Company create/manage forms — logo

### Phase 4 — Consistency cleanup

- [ ] Standardize column names: rename `cover_image` → `cover_image_url` on `playlists`
  and any other table using the short form
- [ ] Display playlist cover image in `PlaylistCard` (currently shows gradient only)
- [ ] Replace raw `<img>` tags with `ImageWithFallback` consistently across all
  components that render user-supplied images
- [ ] Add dimension guidance text to all image inputs (shown below the field):
  e.g. "Recommended: 1200×630px · Max 5MB · JPEG, PNG or WebP"

### Phase 5 — Image optimization (future)

- [ ] Add a Supabase Edge Function or use Supabase image transformations to serve
  resized/optimized versions — avoid loading a 1200px image in a 24px avatar slot
- [ ] Evaluate Supabase's built-in image transformation API (`?width=96&height=96`)
  as a low-effort optimization pass

---

## 4. Quick Reference

| Image type | Column | Recommended size | Aspect ratio | Max file size |
|---|---|---|---|---|
| Avatar | `users.avatar` | 400×400px | 1:1 | 2MB |
| Featured image | `blogs.featured_image_url` | 1200×630px | 1.91:1 | 5MB |
| Episode thumbnail | `episodes.thumbnail_url` | 1280×720px | 16:9 | 3MB |
| Cover image | `magazines.cover_image_url` | 1200×630px | 1.91:1 | 5MB |
| Cover image | `playlists.cover_image` | 1280×720px | 16:9 | 5MB |
| Logo | `companies.logo_url` | 400×400px | 1:1 | 2MB |
| Platform logo | platform settings `logo_url` | 400×400px | 1:1 | 2MB |
