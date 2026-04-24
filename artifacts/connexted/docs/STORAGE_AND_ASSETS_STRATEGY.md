# Storage & Assets Strategy

Last updated: April 2026

---

## 1. The Core Tension

The platform's URL-sharing philosophy is correct and worth preserving.
It keeps the platform lean, makes content portable, and avoids becoming a
CDN for content that already has a better home (YouTube for video, Substack
for newsletters, GitHub for code). The URL is not just a workaround — it is
the deliberate architecture.

But that philosophy has gaps. Not everything a user needs to express their
identity or create content on this platform has a natural hosted URL. Forcing
a URL input for a user's own profile photo is a poor experience. The question
is not whether to add storage — some storage is already implied by the
platform's existence — but how to draw the line clearly.

---

## 2. What Does NOT Fit the URL Model

These are cases where requiring an external URL creates real friction or
breaks the experience entirely:

### 2a. Identity Assets (everyone, every tier)
| Asset | Why URL fails |
|---|---|
| User avatar / profile photo | People don't have a hosted URL for their own face |
| Company logo | Most companies don't have a direct image URL handy |
| Platform logo (admin) | Needs to be served by the platform itself |

These are not "user content" — they are operational requirements for the platform
to function. They should be stored in dedicated Supabase buckets regardless of tier.

### 2b. Cover Images for Platform-Created Content
| Asset | Why URL fails |
|---|---|
| Magazine cover image | User creates the magazine here; there's no external source |
| Playlist cover image | Same — the playlist exists on this platform |
| Book / shelf cover | Same pattern |
| Sprint / course cover | Admin-created content with no external home |

These are images that exist specifically because of content created on this platform.
The content and the cover image are inseparable. They should be treated as
platform-managed assets, not user-uploaded files.

### 2c. Documents and Formatted Text (Markdown)
Currently documents are stored as text/HTML in the database. Users write in the
editor and the content lives in the DB. This works for simple documents.

What falls through:
- Importing an existing `.md` file into a document (no ingest path exists)
- Exporting a document as markdown (no export path exists)
- Sharing a standalone `.md` file without wrapping it in a document
- Long-form reference documents (technical specs, templates) that are maintained
  outside the platform but referenced from it

Markdown is not a storage problem — it is a content format problem.
The right answer is to treat markdown as a first-class import/export format
for Documents, not to build a markdown file hosting system.

### 2d. Attachments and Submissions (course / program context)
| Asset | Why URL fails |
|---|---|
| Assignment submission (PDF, DOCX) | Student work; they have no hosted URL for it |
| Course handout (PDF, slide deck) | Instructor uploads alongside course content |
| Peer review artifacts | Referenced files tied to a review cycle |

These are content that only exists in the context of a program or course.
They need storage, but it is scoped to the program/course, not to a general
user quota. This is the highest-value case for actual file storage.

### 2e. Photos (future)
The PHOTOS_ALBUMS_PLAN.md establishes that photos as a content type are planned.
A photo has no external URL by definition if the user is creating it on this
platform. This is the clearest future storage requirement.

---

## 3. What DOES Fit the URL Model (keep as-is)

| Content type | Why URL works |
|---|---|
| Blog featured image | Should be hosted where the author already manages their media (Cloudinary, CMS, etc.) |
| Episode thumbnail | YouTube auto-generates from video ID; no upload needed |
| External links / my_contents | The entire point is that content lives elsewhere |
| Embed content (YouTube, Vimeo, CodeSandbox) | These are platform-native hosted experiences |
| Resource links in a course | If it exists on a public site, URL is correct |
| Stock photos, Unsplash images | Already have hosted URLs |

---

## 4. Storage Models

### Option A: Functional Storage Only (minimal)
Store only what the platform operationally requires: avatars, logos, and cover
images for platform-created containers. No user file quota. No general uploads.

- Pros: Simple, no metering needed, no abuse vector for large files
- Cons: No path to assignments, photos, markdown import, or attachments

### Option B: Functional + Program Storage (recommended near-term)
Add Option A plus storage scoped to program/course context: instructors can
upload handouts, students can submit assignments. Storage is attached to the
container (program), not to the user.

- Pros: Solves the highest-value use case (education) without building a
  general file hosting system; storage quotas are per-program, not per-user
- Cons: Does not address personal content (photos, personal markdown, etc.)

### Option C: Tiered Personal Storage (full build)
Every user gets a storage quota. Free tier gets a small allowance (e.g. 250MB),
paid tier gets more (e.g. 5GB).

- Pros: Enables photos, markdown imports, personal attachments — full feature parity
- Cons: Complex to build and meter; support burden; requires storage billing integration;
  opens abuse surface (spam uploads, copyright)

### Option D: Community Shared Storage (admin-managed)
Admins upload a library of shared assets — backgrounds, icon sets, template covers,
brand kits — that any user can reference when creating content. No personal storage.

- Pros: Raises content quality without per-user complexity; useful for platforms
  with a consistent brand or curriculum
- Cons: Does not solve the avatar / personal cover image problem; can't scale to
  user-generated photos

---

## 5. Recommended Approach

### Phase 1: Functional Storage (do this now, ties to IMAGE_SPECIFICATIONS.md)
Implement Supabase Storage for the three operational buckets already defined
in IMAGE_SPECIFICATIONS.md:

```
avatars/           → user avatars (1 file per user, 2MB max)
covers/            → cover images for magazines, playlists, books, sprints
logos/             → company logos + platform logo
```

Policies: public read, authenticated write (RLS by owner).
These are not "user storage" in a quota sense — they are platform infrastructure.
Implement the `ImageUpload` component and wire into the 8 forms identified in
IMAGE_SPECIFICATIONS.md Phase 3.

This alone resolves the most painful UX gap (can't upload your own profile photo)
without needing any storage tier strategy.

### Phase 2: Markdown Import/Export for Documents
Before treating markdown as a storage concern, add it as a Document format:

- **Import:** In `ShareBlogForm` / Document create flow, add a "Upload .md file"
  option that reads the file client-side and populates the editor — no storage needed,
  the content ends up in the DB like any other document.
- **Export:** On any Document or Blog detail page manage tab, add "Download as .md"
  — converts the stored HTML/text to markdown client-side, no storage needed.

This gives markdown first-class status without any server-side storage architecture.

### Phase 3: Program/Course Attachment Storage (next feature sprint)
Add a scoped attachment system for Programs and Courses:

```
program-attachments/{program_id}/{file_id}   → instructor uploads
submissions/{program_id}/{assignment_id}/{user_id}/{file_id}  → student work
```

RLS: program admins can write to `program-attachments/`. Students can write to their
own submissions path. Program members can read instructor uploads.

This serves the education use case without building general-purpose personal storage.

### Phase 4 (future): Community Asset Library
Admin-managed shared assets. Useful once the platform has a defined visual brand
or a content curriculum that benefits from reusable imagery.

### Phase 5 (future): Personal Storage Quota (if Photos ship)
If the Photos / Albums feature ships, personal storage becomes unavoidable.
At that point, introduce a quota model:
- Free tier: 500MB personal storage
- Pro tier: 10GB
- Metering via Supabase Storage metadata + a `storage_usage` view

---

## 6. Image Specifications Reconciliation

IMAGE_SPECIFICATIONS.md already has the correct 5-phase plan and is aligned
with this strategy. The reconciliation is:

| IMAGE_SPECIFICATIONS.md | This document |
|---|---|
| Phase 1: Create buckets (avatars, content-images, logos) | Phase 1 here: renamed to avatars / covers / logos for clarity |
| Phase 2: ImageUpload component | Phase 1 here: build as part of same sprint |
| Phase 3: Wire into forms | Phase 1 here: same scope |
| Phase 4: Consistency cleanup | Remains in IMAGE_SPECIFICATIONS.md scope |
| Phase 5: Image optimization | Remains in IMAGE_SPECIFICATIONS.md scope |

The `content-images` bucket from IMAGE_SPECIFICATIONS.md should be split into:
- `covers/` — for platform-created container cover images
- `blog-images/` — for featured images on blogs (optional; blog images could
  remain URL-only since bloggers typically have their images hosted already)

**One open question:** Episode thumbnails are auto-generated from YouTube video IDs.
There is no upload needed for YouTube content. Non-YouTube episodes (future) would
need thumbnail uploads; defer that bucket until non-YouTube episodes are supported.

---

## 7. The Assets Tab in My Content Audit

The current Assets tab stub in `MyContentAuditPage.tsx` can be staged as follows:

**Now (Phase 1):** Show the user's uploaded operational assets only — their avatar,
any cover images they have uploaded for their own content. Query from the
`avatars` and `covers` buckets filtered by owner. Simple grid with file name,
size, upload date, and a "Copy URL" button.

**Later (Phase 3):** Expand to include program attachments they have uploaded.

**Future (Phase 5):** Full storage usage meter + photo library if quota model ships.

---

## 8. What to Build Next (Priority Order)

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 1 | Supabase bucket setup (avatars, covers, logos) | 1 day | Unblocks all image uploads |
| 2 | `ImageUpload` + `AvatarUpload` components | 1–2 days | Reusable; fixes avatar pain |
| 3 | Wire ImageUpload into avatar + cover image forms | 1–2 days | Visible to all users |
| 4 | Markdown import for Documents | 0.5 day | High perceived value, zero storage cost |
| 5 | Markdown export (Download as .md) | 0.5 day | Same |
| 6 | Program attachment storage | 2–3 days | Education use case |
| 7 | Community asset library (admin) | 1–2 days | Brand / curriculum quality |
| 8 | Personal storage quota + Photos | 5–7 days | Deferred until Photos ships |
