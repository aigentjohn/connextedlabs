# Sidebar Section: Sponsors

---

### Sponsors Directory (`/sponsors`)

**Component:** `src/app/components/SponsorsPage.tsx`

**What it does:** Lists all platform sponsors as cards ordered by tier then name. Each card shows the sponsor logo/avatar, name, tier badge (platinum/gold/silver/bronze/default), tagline, description preview, contact email, city/state location, website link, and a View Profile button.

**Data loaded:**
- `sponsors` — full `SELECT *` ordered by `tier ASC, name ASC`

**User actions:**
- Click "View Profile" to navigate to `/sponsors/:slug`
- Click contact email to open mail client
- Click website link to open sponsor's external website in a new tab

**Tabs / sub-views:** None.

**Known issues / gaps:**
- No search or filter capability.
- Tier ordering is alphabetical on the string value (`bronze < gold < platinum < silver`) rather than by tier level/rank — gold sorts before platinum correctly but silver sorts after platinum alphabetically, which may not match intended display order.

---

### Sponsor Detail (`/sponsors/:slug`)

**Component:** `src/app/components/SponsorDetailPage.tsx`

**What it does:** Full sponsor profile page. Shows sponsor header (logo, name, tier badge with level-based coloring, tagline, description, contact info, website), a curated content block ("From {Sponsor}"), a sponsored containers section with type-based permission gauges and filters, and management links for users with sponsor admin rights.

**Data loaded:**
- `sponsors` — single row by slug, with `sponsor_tiers(tier_name, tier_level)` join
- `sponsor_companion_items` — ordered content items for this sponsor (elevators, pitches, documents, checklists, episodes, books, QR codes)
- Per container type (tables, elevators, meetings, pitches, builds, standups, meetups) — `id, name, slug, description, created_at` filtered by `sponsor_id`
- `sponsor_tier_permissions` — `container_type, can_view, can_create, max_count` filtered by `tier_id`

**User actions:**
- Click website link (external)
- Click email link
- Navigate to sponsor companion page (`/sponsors/:slug/companion`)
- Navigate to sponsor management page (`/sponsor/:slug/manage`) — visible to users with `canManageSponsor()` rights (owner, admin, director role in `sponsor_memberships`, or platform admin)
- Filter displayed containers by type (checkbox filters)
- Clear type filters
- Navigate to any sponsored container

**Tabs / sub-views:** Single-page layout. The "Sponsored Containers" section has inline type-filter checkboxes.

**Companion content item types:** elevator, pitch, document, checklist, episode, book, qr_code.

**Known issues / gaps:**
- The Manage link uses `/sponsor/:slug/manage` (singular) while the sidebar uses the same path; the detail page Companion link uses `/sponsors/:slug/companion` (plural) — the inconsistent singular/plural prefix is a potential source of routing confusion.
- `showMembers` state is declared but never used — a member list UI may have been planned but not implemented.
- Permission progress bars only render when `sponsor_tier_permissions` exist; if no tier is assigned (`tier_id = null`), the section silently shows no gauges.
