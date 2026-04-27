# Connexted Labs — Product Backlog

Last updated: April 2026 (updated with Saved Items, Pathway improvements, Advisory Cohort)
Maintained by: @aigentjohn

Status legend:
✅ Live · ⚠️ Partial · 📋 Planned · 💡 Exploring · 🚫 Blocked

Priority: 🔴 Critical · 🟡 Medium · 🟢 Nice to have

---

## How to use this document

This is the single source of truth for what is built, what is coming, and what
is still being validated. Each section maps to a user-facing area of the platform.

Before any feature moves from Planned → In Progress, it should have a validated
user story from at least one interview or conversation. Features marked 💡 are
hypotheses that need that validation first.

---

## 1. My Content

Everything a user can see, manage, and act on about their own content.

### My Pages (NEW)
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create, edit, delete pages | ✅ Live | — | `/my-pages` |
| Markdown editor with preview toggle | ✅ Live | — | — |
| Import `.md` file | ✅ Live | — | — |
| Export page as `.md` | ✅ Live | — | — |
| Visibility control | ✅ Live | — | public / member / private |
| Tags | ✅ Live | — | — |
| Add page to a Journey | ✅ Live | — | Via AddJourneyContentDialog |
| Inline render in Journey viewer | ✅ Live | — | ReactMarkdown |
| Page templates (pre-filled scaffolds) | 📋 Planned | 🟡 | 8 system types; see PAGES_AND_TEMPLATES_PLAN.md |
| AI draft generation | 📋 Planned | 🟡 | Claude API at creation time only |
| Section schema (typed fields) | 💡 Exploring | 🟢 | Absorbs FAQ, Assignment Brief, Rubric |
| Completion tracking per learner | 📋 Planned | 🟡 | `page_completions` table |
| Full-screen read view `/pages/:id` | 📋 Planned | 🟡 | TOC sidebar from headings |
| Public shareable page URL | 💡 Exploring | 🟢 | Lightweight CMS use case |

### My Documents
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create, edit, delete, share documents | ✅ Live | — | `/my-documents` |
| Trash — restore or permanently delete | ✅ Live | — | `/my-content/trash` |
| Share document via dialog | ✅ Live | — | Share button fixed Apr 2026 |
| Search and filter | ✅ Live | — | — |
| Expiration / renewal | 📋 Planned | 🟡 | Needs DB migration; see EXPIRE_AND_RENEW_PLAN.md |

### My Books
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create, edit, delete books | ✅ Live | — | `/books` |
| Chapters with markdown | ✅ Live | — | — |
| Visibility control | ✅ Live | — | PrivacySelector fixed Apr 2026 |
| Episode content type (blogs, video) | 📋 Planned | 🟢 | See BOOKS_FUTURE_DEVELOPMENT.md |
| Shelf collection | 📋 Planned | 🟢 | Curated reading list wrapper |
| Expiration / renewal | 📋 Planned | 🟢 | — |

### My Decks
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create, edit, delete decks | ✅ Live | — | `/decks` |
| Visibility control | ✅ Live | — | Fixed Apr 2026; private decks hidden from others |
| Client-side visibility filter | ✅ Live | — | — |
| Server-side RLS filter (Option B) | 📋 Planned | 🟡 | Edge Function JWT; 3–4 hrs |
| Expiration / renewal | 📋 Planned | 🟢 | — |

### My Lists
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create, edit, delete checklists | ✅ Live | — | `/checklists` |
| Visibility control | ✅ Live | — | Fixed Apr 2026 |
| Kanban view | 💡 Exploring | 🟢 | See LISTS_FUTURE_DEVELOPMENT.md |
| Schedule / calendar view | 💡 Exploring | 🟢 | — |
| Punchlist mode | 💡 Exploring | 🟢 | — |
| List templates | 📋 Planned | 🟡 | Reuse page template pattern |
| Expiration / renewal | 📋 Planned | 🟢 | — |

### My Libraries
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create, edit, delete libraries | ✅ Live | — | `/libraries` |
| Visibility control | ✅ Live | — | Fixed Apr 2026; backfill migration run |
| Add documents to library | ✅ Live | — | — |
| Expiration / renewal | 📋 Planned | 🟢 | — |

### My Favorites
| Feature | Status | Priority | Notes |
|---|---|---|---|
| `content_favorites` table + `useContentEngagement` hook | ✅ Live | — | Cross-type; works for any content type |
| Like / Favorite buttons on browse pages | ✅ Live | — | Episodes, Decks, Circles, Tables, Meetups |
| My Favorites page (`/my-content`) | ✅ Live | — | `MyContentPage.tsx`; groups by type, remove button |
| Sidebar link — "My Favorites" in Discover section | ✅ Live | — | `DiscoverSection.tsx`; shows count badge |
| "Save" action on Pathway steps | 📋 Planned | 🟡 | Heart/bookmark on step cards; calls `toggleFavorite` |
| "Save" action on Companion items | 📋 Planned | 🟡 | Companion panel → add to favorites |
| Sort / filter by content type on My Favorites | 📋 Planned | 🟢 | Client-side; types already grouped |

### My Links
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Save, organise, search links | ✅ Live | — | `/my-contents` |
| Folder organisation | ✅ Live | — | — |
| Bulk enrich | ✅ Live | — | — |
| Import via URL paste | ✅ Live | — | — |
| Import from browser bookmarks (HTML) | ⚠️ Partial | 🟡 | "Coming Soon" tab; parser not built |
| Cloud folder import (Drive/OneDrive) | 📋 Planned | 🟡 | See CLOUD_STORAGE_INTEGRATION_PLAN.md |
| Link health tracking | 📋 Planned | 🟡 | `health_status` column; broken / stale / ok |
| Submit link to shared library | 📋 Planned | 🟡 | Needs `link_submissions` table + admin review |
| Tag filtering on browse page | 📋 Planned | 🟡 | `/links` missing tag filter |

### My Reviews
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Rate, tag, add to circles | ✅ Live | — | `/my-reviews` |
| Edit and delete reviews | ✅ Live | — | — |
| Reviews visible in Content Audit | 🚫 Blocked | 🔴 | `reviews` table does not exist yet |

### Content Audit
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Documents, Links, Posts, Tags, Shareable Links tabs | ✅ Live | — | `/my-content/audit` |
| Health flag banner | ✅ Live | — | — |
| Assets tab | 🚫 Blocked | 🟡 | Needs Supabase Storage + RPC |
| Reviews tab | 🚫 Blocked | 🔴 | Reviews table missing |

### Content Lifecycle (Expiry & Renewal)
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Expiry on containers (Builds, Pitches, etc.) | ✅ Live | — | `expires_at`, `is_permanent` |
| Manual renewal (3 / 6 month) | ✅ Live | — | `extend_expiration` RPC |
| Make permanent (premium) | ✅ Live | — | `make_content_permanent` RPC |
| Community engagement extension | ✅ Live | — | `extend_on_engagement` RPC |
| My Content Admin page (4 tabs) | ✅ Live | — | `/my-content-admin` |
| Bulk renewal UI | ✅ Live | — | — |
| Engagement hooks wired into pages | 📋 Planned | 🟡 | Like / comment / review wrappers exist but not connected |
| Expiry on Documents, Books, Decks, Lists | 📋 Planned | 🟡 | Needs DB migration per type |
| Expiry notifications (nightly cron) | 📋 Planned | 🟡 | `content.expiring_soon` notification type |
| Community Picks leaderboard | 💡 Exploring | 🟢 | `get_most_extended_content` RPC ready |
| "Expiring Soon" discovery section | 💡 Exploring | 🟢 | — |

---

## 2. Courses and Programs

How instructors build structured learning and how learners move through it.

### Journeys
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create and manage journeys inside programs | ✅ Live | — | — |
| Add Documents, Books, Decks, Episodes, Checklists | ✅ Live | — | — |
| Add Pages to journeys | ✅ Live | — | Built Apr 2026 |
| Inline content viewer per item type | ✅ Live | — | JourneyInlineViewer |
| Journey item completion tracking | 📋 Planned | 🟡 | No per-item completion stored yet |
| Learner progress rollup | 📋 Planned | 🟡 | Depends on completion tracking |
| Estimated time per item | 📋 Planned | 🟢 | `estimated_time` field exists; not surfaced |
| Drag-to-reorder journey items | 💡 Exploring | 🟢 | — |

### Courses
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Course creation and management | ✅ Live | — | — |
| Enrolled courses view | ⚠️ Not reviewed | 🟡 | `/my-courses` — needs audit |
| Course import / export (JSON) | ✅ Live | — | Export schema defined |
| Course landing page | ✅ Live | — | — |
| Prerequisite gating | 💡 Exploring | 🟢 | — |

### Programs
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Program creation and management | ✅ Live | — | — |
| Program enrollments view | ⚠️ Not reviewed | 🟡 | `/my-programs` — needs audit |
| Program landing page | ✅ Live | — | — |
| Circle attached to program | ✅ Live | — | — |
| Access ticket expiry | ⚠️ Partial | 🟡 | Controls access, not visibility |
| Cohort expiry (program-level) | 💡 Exploring | 🟢 | See EXPIRE_AND_RENEW_PLAN.md §5g |

### Interactive Content (in Journeys)
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Poll (single question, live results) | 📋 Planned | 🟡 | See INTERACTIVE_CONTENT_TYPES_PLAN.md |
| Ranking (drag to order, consensus view) | 📋 Planned | 🟢 | — |
| Assignment (submit work, instructor review) | 📋 Planned | 🟡 | — |
| Reflection prompt (private journal entry) | 📋 Planned | 🟡 | — |
| FAQ (admin-curated Q&A accordion) | 📋 Planned | 🟢 | Could be a Page section schema instead |
| Quiz / Assessment | ⚠️ Partial | 🟡 | `surveys` table exists; UI incomplete |

---

## 3. Community

How members connect, share, and collaborate.

### Circles
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create and manage circles | ✅ Live | — | — |
| View circles I belong to (all roles) | ✅ Live | — | Fixed Apr 2026; member_ids included |
| Role badges (Host / Moderator / Member) | ✅ Live | — | Fixed Apr 2026 |
| Circle landing page | ✅ Live | — | — |
| Circle preview (public) | ✅ Live | — | — |
| Personal shareable invite link | 📋 Planned | 🔴 | Circle admins can't self-generate; admin-only now |
| Circle expiration / end date | 💡 Exploring | 🟢 | Event circles, cohort circles |
| Embed Page in Circle resources | 💡 Exploring | 🟢 | Pin a Page to a Circle tab |

### Posts and Moments
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Create, edit, delete posts | ✅ Live | — | `/moments/:userId` |
| Posts feed per circle | ✅ Live | — | — |
| Like, comment on posts | ✅ Live | — | — |
| Post expiry | 💡 Exploring | 🟢 | Low priority |

### Friend Companions
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Companion list (Active / Not started) | ✅ Live | — | Fixed Apr 2026; `updated_at` migration |
| Companion detail and progress | ✅ Live | — | — |

---

## 4. Growth and Learning

How members track their own development over time.

### Pathways
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Browse pathways | ✅ Live | — | `/browse-pathways` |
| My growth / pathway progress | ✅ Live | — | `/my-growth` |
| Activity types: join, post, create, mentor, attend | ✅ Live | — | Core doing/participation verbs |
| Activity type: `watch_episode` with specific instance | ✅ Live | — | Fixed Apr 2026; `ACTIVITY_TABLE_MAP` wired |
| Activity types: `read_page`, `view_pitch`, `view_build` | ✅ Live | — | Added Apr 2026; learning/observation verbs |
| Editable step title and instructions | ✅ Live | — | Added Apr 2026; inline edit in step card |
| Pathway admin RLS fix | ✅ Live | — | Fixed — Express API uses service role key with `requireAdmin` middleware |
| Step-level completion tracking | ✅ Live | — | `pathway_step_completions` table + self-report/verify-report API; built Apr 2026 |
| Step targeting a specific item (pick from list) | ✅ Live | — | `activity_criteria.target_id` + search dialog |
| Step instructions visible to learner | ✅ Live | — | `step.description` rendered in PathwayDetailPage |
| Pathway templates (starter sequences) | 📋 Planned | 🟢 | Pre-built onboarding, mentorship, cohort sequences |
| Micro-pathway (3–5 steps, shareable) | 💡 Exploring | 🟢 | Short prerequisite or challenge sequences |
| Pathway completion certificate | 💡 Exploring | 🟢 | Badge award on completion |

### Badges
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Badge display on profile | ✅ Live | — | `/profile/badges` |
| Badge expiration field | ⚠️ Partial | 🟡 | Column exists; no renewal UI |
| Badge renewal UI | 📋 Planned | 🟢 | See EXPIRE_AND_RENEW_PLAN.md §5h |

### Portfolio
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Portfolio items display | ⚠️ Not reviewed | 🟡 | `/portfolio/:userId` — needs audit |

---

## 5. Discovery

How members find content and other members on the platform.

### Link Library (Shared)
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Browse shared links by category | ✅ Live | — | `/links` |
| Tag filtering | 📋 Planned | 🟡 | No tag filter on browse page today |
| Submit link for admin review | 📋 Planned | 🟡 | Needs `link_submissions` table |
| Link detail page | ✅ Live | — | `/links/:id` |

### Member Discovery
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Browse all members | ✅ Live | — | `/members` |
| Active members | ✅ Live | — | `last_active_at` column |
| Friends / following / followers | ✅ Live | — | — |
| Affinity matching | ✅ Live | — | `/members/affinity` |
| Social stats | ✅ Live | — | — |

---

## 6. Account and Profile

What a user can manage about themselves.

### Profile
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Basic profile (name, bio, avatar) | ✅ Live | — | — |
| Professional profile | ✅ Live | — | — |
| Social links | ✅ Live | — | — |
| Privacy settings | ✅ Live | — | — |

### Account Management
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Change password | ✅ Live | — | — |
| Notification preferences | ✅ Live | — | — |
| Self-service account deletion | 📋 Planned | 🔴 | Legal exposure without this (GDPR/CCPA) |
| 30-day grace period + cancellation | 📋 Planned | 🔴 | Part of deletion flow |
| Full data export (GDPR ZIP) | 📋 Planned | 🔴 | All content types + images |

---

## 7. Platform Administration

Tools for platform owners and admins.

### Content Management
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Link library management | ✅ Live | — | — |
| Link submission review queue | 📋 Planned | 🟡 | New tab in AdminLinkLibrary |
| Content lifecycle dashboard | ⚠️ Partial | 🟡 | LifecycleDashboard.tsx exists; RPC may be missing |
| Shareable link generator | ✅ Live | — | Admin only today |

### User Management
| Feature | Status | Priority | Notes |
|---|---|---|---|
| User roles and permissions | ✅ Live | — | — |
| Invitation-only registration | ✅ Live | — | Self-registration disabled Apr 2026 |
| Hard-delete cron (post-grace-period) | 📋 Planned | 🔴 | Depends on account deletion (§6) |
| Expiration analytics | 💡 Exploring | 🟢 | See EXPIRE_AND_RENEW_PLAN.md §5i |

### Multi-Instance
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Deploy separate instances (own URL + DB) | 📋 Planned | 🟡 | See MULTI_INSTANCE_PLAN.md |
| Cross-instance content import | 💡 Exploring | 🟢 | User exports bundle from A, imports to B |

---

## 8. Infrastructure

Foundation that other features depend on.

### Image Uploads and Storage
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Avatar / cover / logo uploads | 🚫 Blocked | 🔴 | Supabase Storage buckets not configured |
| Inline image in documents / pages | 🚫 Blocked | 🔴 | Depends on Storage setup |
| My Assets page (`/my-content/assets`) | 📋 Planned | 🟡 | After Storage is configured |
| Asset reference check before delete | 📋 Planned | 🟢 | Warn if URL appears in other content |
| See STORAGE_AND_ASSETS_STRATEGY.md | — | — | Full strategy documented |
| See IMAGE_SPECIFICATIONS.md | — | — | Bucket, size, format specs |

### Notifications
| Feature | Status | Priority | Notes |
|---|---|---|---|
| In-app notifications | ✅ Live | — | — |
| Expiry notifications (nightly cron) | 📋 Planned | 🟡 | `content.expiring_soon` type |
| Email notifications | 💡 Exploring | 🟡 | No email provider integrated yet |

### Performance
| Feature | Status | Priority | Notes |
|---|---|---|---|
| RLS initplan fix (49 policies) | ✅ Live | — | Fixed Apr 2026 |
| Lazy loading all routes | ✅ Live | — | Custom retry-aware lazy() wrapper |

### Photos and Albums
| Feature | Status | Priority | Notes |
|---|---|---|---|
| Photos as a content type | 💡 Exploring | 🟢 | See PHOTOS_ALBUMS_PLAN.md |
| Albums / collections | 💡 Exploring | 🟢 | Depends on Storage being live |

---

## 9. Product-Led Growth and Feedback

Using the platform itself to validate and shape future development.

| Feature | Status | Priority | Notes |
|---|---|---|---|
| Product Roadmap BUILD in platform | 📋 Planned | 🔴 | This document → import as Build items |
| Feature feedback via Build comments | 📋 Planned | 🔴 | Members can react to roadmap items |
| Sprint tracking for development | 📋 Planned | 🟡 | Use platform Sprints for dev cycles |
| Standup for solo/team check-ins | 📋 Planned | 🟡 | Use platform Standups |
| **Advisory cohort program** | 📋 Planned | 🔴 | Circle of 5–10 early adopters run as a Program with Journeys containing polls, surveys, standups, and sprint reviews; validates backlog hypotheses before build |
| Survey/poll to validate queue feature | 💡 Exploring | 🟡 | One-question survey: "Do you ever want to save something to do later but not add it to a course?" |
| Survey/poll to validate micro-pathway | 💡 Exploring | 🟡 | "Would a 3-step challenge sequence motivate you to try something new?" |

---

## 10. What Needs Validation Before Building

These are ideas that have not yet been confirmed by user interviews or market feedback.
Do not build these until at least 3 conversations confirm the problem is real.

| Idea | Hypothesis | What to ask in interviews |
|---|---|---|
| Favorites as action queue | Members save things to do but treat favorites as appreciation | "When you favorite something, do you go back and actually do it?" |
| Section schema for Pages | Authors want enforced structure, not just a scaffold | "When you write course content, do you ever wish the format was locked?" |
| Kanban view for Lists | Members use checklists as project boards, not just task lists | "How do you track work-in-progress on a project today?" |
| Cross-instance content import | Users will run on multiple instances and want portability | "If you moved platforms, what content would you need to take with you?" |
| Cohort program expiry | Facilitators want cohorts to automatically close after N weeks | "What happens in your program after the cohort officially ends?" |
| Community Picks leaderboard | Surfacing most-extended content drives engagement | "What makes you engage with content that's about to disappear?" |
| Photos and Albums | Members want to share photo collections, not just individual images | "When would you upload a photo here rather than Instagram or Google Photos?" |
| Public page URLs | Authors want to share a page outside the platform | "Have you ever wanted to link someone to a specific lesson from outside the app?" |
| Email notifications | In-app notifications aren't enough for time-sensitive alerts | "What would make you miss something important if you didn't check the app?" |
| Micro-pathway (3–5 steps) | Short challenge sequences drive action better than long pathways | "Would you start a pathway if it only had 3 steps and took 20 minutes?" |

---

## 11. Blocked — External Dependencies

Nothing should be scheduled against these until the blocker is resolved.

| Feature | Blocked on |
|---|---|
| Assets tab in Content Audit | Supabase Storage configuration |
| My Assets page | Supabase Storage configuration |
| Image uploads on any form | Supabase Storage configuration |
| Reviews tab in Content Audit | `reviews` table does not exist |
| Expiry notifications cron | pg_cron or scheduled Edge Function |
| Hard-delete cron | Account deletion flow must be built first |
| Cloud folder import (Drive/OneDrive) | OAuth app registration per provider |
| Photos and Albums | Storage + OAuth |

---

## 12. Detail Documents Index

### Product and feature plans

| Topic | Document |
|---|---|
| Phased roadmap — sprint themes, delivery sequence | `PRODUCT_ROADMAP.md` |
| Member retention strategy, KPIs, investor metrics | `MEMBER_RETENTION_AND_PROGRESSION.md` |
| User content features, sprint status, blocked items | `USER_CONTENT_PLAN.md` |
| Content expiry, renewal, community survival | `EXPIRE_AND_RENEW_PLAN.md` |
| Pages content type — current state and Phases 2–6 | `PAGES_AND_TEMPLATES_PLAN.md` |
| Books — video chapters, shelf collections, engagement parity | `BOOKS_FUTURE_DEVELOPMENT.md` |
| Lists — kanban, punchlist, schedule view, templates | `LISTS_FUTURE_DEVELOPMENT.md` |
| Interactive content types — polls, assignments, reflections | `INTERACTIVE_CONTENT_TYPES_PLAN.md` |
| Photos and Albums — placeholder design | `PHOTOS_ALBUMS_PLAN.md` |
| Multi-instance deployment | `MULTI_INSTANCE_PLAN.md` |

### Architecture and reference

| Topic | Document |
|---|---|
| Visibility states, PrivacySelector, access checks | `VISIBILITY_AND_ACCESS_MODEL.md` |
| Image upload specs, buckets, upload component plan | `IMAGE_SPECIFICATIONS.md` |
| Storage philosophy — URL model vs. Supabase Storage | `STORAGE_AND_ASSETS_STRATEGY.md` |
| Cloud storage integration (Drive, OneDrive, Dropbox) | `CLOUD_STORAGE_INTEGRATION_PLAN.md` |
| Sessions, events, meetings — architecture decision record | `SESSIONS_EVENTS_MEETINGS_ARCHITECTURE.md` |

### Code debt and cleanup

| Topic | Document |
|---|---|
| Broken UI, hardcoded stubs, missing pages (4-phase plan) | `DEAD_ENDS_PLAN.md` |
| Dead DB columns, dead routes, orphaned files | `CLEANUP_AND_DEVELOPMENT_NOTES.md` |
