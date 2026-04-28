# Photos, Images & Albums — Future Development Placeholder

**Date:** April 2026
**Status:** Placeholder — not yet designed or built
**Scope:** Photo/image upload and album (collection) content types

---

## Overview

Photos and Albums follow the same single-item → collection pattern as the rest
of the platform:

| Single item | Collection |
|---|---|
| Photo / Image | Album |

This mirrors:
- Book → Shelf
- Episode → Playlist
- Blog → Magazine
- Document → Library

---

## What a Photo Would Be

A **Photo** is a single uploaded image with metadata. Unlike a cover image or
avatar (which exist only to support other content), a Photo is a first-class
content item that can be browsed, liked, shared, and added to a journey or
collection.

**Likely fields:**
- `id`, `title` (optional caption), `description`
- `image_url` — the uploaded or externally linked image
- `alt_text` — accessibility description
- `taken_at` — optional date the photo was taken (vs uploaded)
- `location` — optional text (city, event name, etc.)
- `tags[]`, `topic_ids[]`
- `visibility` (public / member / premium / private)
- `uploaded_by` (FK to users)
- `allow_comments`, `allow_reactions`, `allow_sharing`
- `created_at`, `updated_at`, `deleted_at`

**Storage:** Supabase Storage bucket for uploads; `image_url` for external links.

---

## What an Album Would Be

An **Album** is an ordered collection of Photos — analogous to a Playlist for
episodes or a Shelf for books.

**Likely fields (parent table `albums`):**
- `id`, `name`, `slug`, `description`, `cover_photo_id`
- `curator_id`, `visibility`, `tags[]`, `topic_ids[]`
- `allow_comments`, `allow_reactions`, `allow_sharing`
- Journey context: `program_id`, `program_journey_id`
- `created_at`, `updated_at`

**Junction table `album_photos`:**
- `album_id`, `photo_id`, `position` (manual order), `added_at`
- `UNIQUE (album_id, photo_id)`

---

## Use Cases

- Event recap gallery (add photos from a cohort session or meetup)
- Member portfolio / showcase
- Course visual resources (diagrams, screenshots, reference images)
- Community gallery (open to all members to submit)
- Journey step: "Submit a photo of your completed project"

---

## Relationship to Other Types

- Photos embedded in Documents, Books (chapters), and Blogs are not Photos
  objects — they are inline images in rich text. A Photo type is for
  standalone images intended to be browsed as content.
- An Album as a journey step would replace the "upload a file" submission
  pattern — members could submit photos as part of an assignment.
- Photos could also appear as items in a Companion (friend, circle, company)
  alongside existing item types.

---

## Open Questions

1. **Upload vs external URL?** — Supabase Storage handles uploads but requires
   a bucket policy. External image URLs are simpler to start with but lower
   quality. Support both (nullable `image_url` + nullable `storage_path`).

2. **Moderation** — Community-submitted photos need a moderation workflow
   (approve / reject / flag). Not needed for private/member visibility, but
   required for public content.

3. **Photo vs Document attachment** — A PDF or image attached to a Document is
   not a Photo. Clarify that Photos are intended to be viewed as images, not
   downloaded as files. File uploads belong to a separate "File" or "Attachment"
   type (or the Assignment submission flow).

4. **Companion integration** — Can a Photo be added to a Friend Companion,
   Circle Companion, or Company Companion? The companion item type registry
   would need `photo` added as a valid `item_type`.

5. **Journey step completion** — If an Album is a journey step, completion could
   mean: (a) member views at least one photo, (b) member submits a photo to the
   album, or (c) manual mark complete. Define per use case.

---

## Implementation Priority

Low — foundational infrastructure (storage bucket, upload component, moderation)
adds meaningful scope. Recommended to implement after Shelf and the higher-priority
Book enhancements are in place.

**Suggested build order when ready:**
1. Photo type + storage bucket + single-image upload/view
2. Album type + album detail page (grid view)
3. Album as journey item
4. Community gallery / open submission
5. Companion integration
