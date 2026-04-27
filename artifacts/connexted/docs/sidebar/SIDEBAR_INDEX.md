# Platform Feature Documentation — Master Index

This directory contains feature documentation organised to match the actual sidebar sections
and top header items exactly. Each file describes what each page does, what data it loads,
what actions are available, and known issues or gaps found in the code.

Last updated: April 2026

---

## How to use this documentation

These files serve two purposes:

1. **Current state reference** — understand what each page actually does today,
   what data it reads and writes, and where the known bugs and gaps are.

2. **Living development plan** — each file can be annotated with status markers
   and development items alongside the feature descriptions, so that planned work
   is always anchored to the specific page it affects.

---

## Sidebar Sections

These files follow the sidebar section names exactly, top to bottom.

| File | Sidebar section | Pages covered |
|---|---|---|
| [SIDEBAR_USER.md](SIDEBAR_USER.md) | User | Notifications, My Tickets, My Basics, My Professional, My Engagement, My Account, Public Profile |
| [SIDEBAR_MY_CONTENT.md](SIDEBAR_MY_CONTENT.md) | My Content | My Documents, My Books, My Decks, My Lists, My Libraries, My Links, My Reviews, Content Admin |
| [SIDEBAR_MY_GROWTH.md](SIDEBAR_MY_GROWTH.md) | My Growth | My Courses, My Programs, My Pathways, Browse Pathways, Badges, Moments, Portfolio |
| [SIDEBAR_CALENDAR_EVENTS.md](SIDEBAR_CALENDAR_EVENTS.md) | Calendar & Events | Calendar, Events, Ticketed Events, Meetings, Meetups, My Sessions, Event Companions, Profile Venues |
| [SIDEBAR_DISCOVER.md](SIDEBAR_DISCOVER.md) | Discover | Home, News, Explore, Browse Content, Topics, Tags, Rankings, My Feed, Most Liked, My Favorites |
| [SIDEBAR_MEMBERS.md](SIDEBAR_MEMBERS.md) | Members | Members directory, User profile |
| [SIDEBAR_SPONSORS.md](SIDEBAR_SPONSORS.md) | Sponsors | Sponsors directory, Sponsor detail |
| [SIDEBAR_MY_BUSINESS.md](SIDEBAR_MY_BUSINESS.md) | My Business | My Companies, Company profile |
| [SIDEBAR_SETUP.md](SIDEBAR_SETUP.md) | Setup | My Admin, Circle Admin, Program Admin, Platform Admin, User Management, Platform Settings, Container Configuration, Data Audit, Course/Pathway/Badge/Ticket admin, Kit Commerce, Market Admin, Companies Admin, Shareable Links, Link Library |
| [SIDEBAR_COMMON_CIRCLES.md](SIDEBAR_COMMON_CIRCLES.md) | Common Circles | Circles browse, My Circles, Circle detail, Circle admin |
| [SIDEBAR_COMMON_CONTENT.md](SIDEBAR_COMMON_CONTENT.md) | Common Content | Blogs, Episodes, Documents, Books, Decks, Reviews |
| [SIDEBAR_COMMON_CONTAINERS.md](SIDEBAR_COMMON_CONTAINERS.md) | Common Containers | Tables, Meetings, Libraries, Checklists, Standups, Sprints, Elevators, Pitches, Builds, Meetups, Magazines, Playlists |

---

## Top Header Items

These files document the major feature areas accessible from the top navigation header.

| File | Header item | Pages covered |
|---|---|---|
| [HEADER_CIRCLES.md](HEADER_CIRCLES.md) | Circles | Circles browse, My Circles, Circle detail, Circle landing, Circle settings, Circle People Manager, Circle admin, all circle tabs (Feed, Forum, Events, Members, Prompts, Resources) |
| [HEADER_COURSES.md](HEADER_COURSES.md) | Courses | Courses browse, Course landing, My Courses, Course player, Create course, Courses management, Instructor course management |
| [HEADER_PROGRAMS.md](HEADER_PROGRAMS.md) | Programs | Programs browse, Program detail, My Programs, Create program, Program admin dashboard, Program prompts, Program journey nav |
| [HEADER_MARKETS.md](HEADER_MARKETS.md) | Markets | Markets landing, Market detail, All Markets, All Offerings, All Companies, Company profile, Offering profile, Create company, Kit Commerce, Market admin |

---

## Key concepts

### User class gates navigation
The sidebar shows different items based on `users.user_class` (1–10).
- Class 1–2: Home, News, Circles, Calendar (basic access)
- Class 3–6: + Tables, Meetings, Libraries, Checklists
- Class 7–9: + Standups, Sprints
- Class 10: + Elevators, Pitches, Builds, Meetups, Magazines, Playlists

Admins (`admin`, `super` role) bypass all class restrictions.

### Common Circles / Common Content / Common Containers
These three sidebar sections are dynamically filtered — they only show items the
user actually has access to or belongs to. They are not static lists.

### Content vs. Container
**Content types** (Blogs, Episodes, Documents, Books, Decks, Reviews) are authored by one
person. Visibility: `public | premium | private`. No membership structure of their own.

**Container types** (Tables through Playlists) have `member_ids` and `admin_ids`.
Visibility: `public | member | private`.

### PrivacySelector mode
The `PrivacySelector` component requires a `mode` prop:
- `mode="content"` → shows `public / premium / private`
- `mode="container"` → shows `public / member / private`

Many forms across the platform are missing this prop — see individual section files for details.

---

## Cross-cutting issues found during audit (April 2026)

| Issue | Affected pages |
|---|---|
| `PrivacySelector` missing `mode="content"` prop | Books, Decks, Blogs, Episodes and their create/manage forms |
| `PrivacySelector` missing `mode="container"` prop | Most container create forms |
| `is_public` boolean not yet replaced by `visibility` column in UI | Libraries, Magazines |
| No visibility field in UI at all | Checklists |
| No server-side visibility filter on browse query | Decks, Elevators, Playlists, most container browse pages |
| `reviews` / `endorsements` table mismatch — `ReviewsPage` queries `reviews`, actual table is `endorsements` | Reviews browse, My Reviews, Browse Content reviews tab |
| ~~`StandupDetailPage` does not exist~~ — **false alarm**: `src/app/components/standup/StandupDetailPage.tsx` exists and is registered at `/standups/:slug` | — |
| `MyCirclesPage` only shows hosted/moderated circles, not plain member circles | My Circles |
| ~~Hardcoded `0` or `false` for stats~~ — **partially fixed April 2026**: My Admin recent activity ✅, isFavorited in My Documents ✅, library document counts ✅, "Shared with Me" count ✅. Remaining: My Circles activity count (still hardcoded 0 in default state, `CircleAdminPage` counts posts but `MyAdminDashboard` circle section not yet audited) | My Circles |
| Platform Settings branding fields not editable via UI | Company name, product name, tagline |
| `AdminDashboardTabbed` restricted to `super` role, blocking `admin` users from the hub | Platform Admin |
| Dual enrollment stores (tickets + legacy `course_enrollments`) can diverge | Courses, My Courses |
| `coordinator_ids` / `manager_ids` on programs never read by any component | Programs |
| Certificate of completion advertised but not implemented | Course landing page |
| `ProgramJourneyNav` progress state never populated | Program detail |
| Kit Commerce has hardcoded ConvertKit account subdomain | Kit Commerce button |
| Two overlapping market models (enum-based and table-based) are inconsistent | Markets |
| ~~Markets search redirects to `/markets/search` but no page exists~~ — **Fixed April 2026**: `MarketSearchPage.tsx` built and registered | — |
| `CirclePeopleManager` only manages `admin_ids` — `moderator_ids` and `host_ids` have no management UI | Circle settings |

---

## Superseded files

These files were created with incorrect names and have been replaced. They are kept for reference only.

| Superseded file | Replaced by |
|---|---|
| `SIDEBAR_COMMUNITY.md` | `SIDEBAR_MEMBERS.md`, `SIDEBAR_SPONSORS.md`, `SIDEBAR_MY_BUSINESS.md`, `SIDEBAR_COMMON_CIRCLES.md` |
| `SIDEBAR_CONTENT_TYPES.md` | `SIDEBAR_COMMON_CONTENT.md` |
| `SIDEBAR_CONTAINERS.md` | `SIDEBAR_COMMON_CONTAINERS.md` |
| `SIDEBAR_ADMIN.md` | `SIDEBAR_SETUP.md` |

---

## Related planning documents

| Document | What it covers |
|---|---|
| `docs/USER_CONTENT_PLAN.md` | Detailed development plan for the My Content section |
| `docs/PLAN_APRIL_18.md` | All pending work across visibility, image upload, code cleanup, nav audit |
| `docs/VISIBILITY_AND_ACCESS_MODEL.md` | Authoritative reference for the visibility and access model |
| `docs/IMAGE_SPECIFICATIONS.md` | Image types, specs, and upload development plan |
| `docs/CLEANUP_AND_DEVELOPMENT_NOTES.md` | Known dead code, dead routes, deferred features |
