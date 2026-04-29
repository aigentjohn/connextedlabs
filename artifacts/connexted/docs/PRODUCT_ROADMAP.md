# Connexted Labs — Product Roadmap

Last updated: April 2026
Maintained by: @aigentjohn

This document is the **phased delivery view** of the product.
The full feature inventory lives in `PRODUCT_BACKLOG.md`.
Deep-dives and design rationale live in the linked detail documents.

Status legend:
✅ Done · 🔄 In progress · 📋 Next · ⏳ Later · 💡 Hypothesis (validate first)

---

## Guiding Principles

1. **Validate before building.** Features marked 💡 need at least 3 real user
   conversations confirming the problem before a sprint starts.
2. **Unblock blockers first.** A feature that unblocks 5 other features is worth
   more than 5 isolated features.
3. **Use the platform to build the platform.** Advisory cohort → Program + Circle.
   Product roadmap → Build in platform. Dev sprints → platform Sprints.
4. **Small, complete slices.** A feature ships when the user can do the full
   action — create, view, act on, and exit — without hitting a dead end.

---

## Sprint 1 — Foundation Cleanup (April 2026)  ✅ Complete

Everything that was broken or partially built when this sprint started.

| Done | Feature |
|------|---------|
| ✅ | RLS initplan fix (49 policies → fast at scale) |
| ✅ | Lazy loading all routes with retry-aware wrapper |
| ✅ | Invitation-only registration (self-registration disabled) |
| ✅ | PrivacySelector fixed across Books, Decks, Lists, Libraries |
| ✅ | Circles — view circles I'm in (all roles), role badges |
| ✅ | Companion list — `updated_at` migration, Active/Not Started |
| ✅ | Share document dialog fixed |
| ✅ | LifecycleDashboard JSX corruption fixed (PR #3) |
| ✅ | Pages content type — full CRUD + Journey integration |
| ✅ | Pathway steps — `read_page`, `view_pitch`, `view_build` verbs |
| ✅ | Pathway steps — editable title + instructions per step |
| ✅ | Pathway steps — `watch_episode` wired to specific instance |
| ✅ | Pathway save hang fixed — `sort_order` removed, 15s timeout added |
| ✅ | `circle_members` + `container_memberships` tables created (migration `20260427000003`) |
| ✅ | Book edit — topic race condition fixed; TopicSelector in edit dialog |
| ✅ | Library document counts — auto-generated filter_rules applied; Shared with Me fixed |
| ✅ | Admin dashboard — real activity counts from `membership_states` + `container_memberships` |
| ✅ | `/help/discover` — Discover Guide page built and registered |
| ✅ | `/markets/search` — Market search page built and registered |
| ✅ | P4-1: Item reordering — up/down arrows on EditCompanyPage, EventCompanionDetailPage, PlaylistSettingsPage |
| ✅ | P4-2: Skills/credentials `is_public` toggle — Eye/EyeOff on each row; public profile filters immediately |
| ✅ | P4-3: Moments comments — lazy-loaded per post, gated by `allow_comments`; submit via Enter or button |
| ✅ | P4-4: Course completion certificate — print-ready HTML via `window.open`; no dependencies |
| ✅ | P4-5: Start from Scratch program creation — inline name form bypasses template picker |
| ✅ | Interactive journey content types — Poll, Reflection, Assignment, FAQ, Schedule Picker; migration + pages + inline viewers + AddContentDialog Interactive tab |
| ✅ | Platform-wide moderation — ReportContentDialog on 8 content types; FlaggedContentPage extended to 20 types; ContentModerationPage imports fixed (PR #8) |
| ✅ | Creator edit/delete rights — Deck edit dialog; Build/Pitch creator self-service; Book/Review/Moments/Magazine gaps closed (PR #9) |
| ✅ | Dead code cleanup — deleted orphaned PlaylistSettingsPage + MagazineSettingsPage; removed stale Episode.views interface field (PR #10) |

---

## Sprint 2 — Surfacing Saved Content (May 2026)  ✅ Complete

**Theme:** Make the platform's existing engagement data visible to users.
Everything users have saved, liked, or favorited is already stored — they just
can't see it in one place.

**Unblocks:** Advisory cohort onboarding, queue validation, companion enhancements.

---

### 2a. My Favorites — audit and extend  🟡 Medium
*Frontend only — no API server or deployment needed.*

My Favorites (`/my-content`) already exists: `MyContentPage.tsx` queries
`content_favorites`, groups by type, and renders remove buttons.
The Discover sidebar already links to it with a count badge.

| Feature | File | Notes |
|---------|------|-------|
| Audit which content types are missing a favorite button | Compare `JOURNEY_ITEM_TYPES` vs pages using `useContentEngagement` | Client-side only |
| "Save" action on Pathway step cards | `PathwayDetailPage.tsx` | Calls `toggleFavorite('pathway_step', step.id)` |
| "Save" action on Companion items | Companion panel | Calls `toggleFavorite` |

### 2b. Pathway admin RLS fix  ✅ Done
Pathway writes use the `make-server-d7930c7f` Supabase Edge Function (service role key).
All pathway CRUD works. Step-level completion tracking shipped
(`pathway_step_completions` table + `self-report` / `verify-report` endpoints).

### 2c. Circle shareable invite link  🔴 Critical
*Frontend + migration — no API server needed.*

Circle admins currently cannot generate their own invite links — only platform
admins can. Blocks organic community growth.

| Feature | Notes |
|---------|-------|
| Migration: `circle_invites` table | `id`, `circle_id`, `token` (uuid), `created_by`, `expires_at`, `max_uses`, `use_count` |
| "Copy invite link" button on Circle admin panel | Generates token, copies URL to clipboard |
| Token-based join flow (`/join/:token`) | Validates token via Supabase client, adds to `circle_members`, redirects to circle |

### 2d. Unified content view  🟡 Medium
*Frontend only — no API server needed. Build before the export.*

A user today must visit 8+ separate pages to see all their content. The existing
Content Audit (`/my-content/audit`) covers documents, links, posts, and tags —
it needs to be extended to cover everything.

**Architecture note:** All content tables have RLS policies that let users read
their own rows. This is purely parallel Supabase client queries from the browser —
the Express API is not involved.

| Feature | Notes |
|---------|-------|
| Extend Content Audit with new tabs | Add: Pages, Books, Decks, Lists, Libraries |
| Count badge per tab | Each tab shows total item count |
| Quick actions per type | Edit / Delete / Change visibility inline |

### 2e. Tech debt & cleanup  🟡 Medium
*Frontend + DB migrations — no API server needed.*

Carried from `CLEANUP_AND_DEVELOPMENT_NOTES.md`.

| Item | Notes |
|------|-------|
| Dead DB columns — drop `blogs.view_count`, `blogs.click_count`, `episodes.views` | Migration only; or wire real server-side tracking via Edge Function |
| Nav page audit — Tables, Meetings, Libraries, Checklists, Standups, Sprints, Elevators, Meetups | Verify route + page exists and renders for each; fix or stub empty states |
| TopicSelector compact context audit | Search all `<TopicSelector` usages; confirm none render in a card/modal/sidebar where the inline tabs would overflow |
| Prompts quick fixes (CirclePrompts, ProgramPrompts) | Replace `confirm()` with AlertDialog; remove unused `Edit2` import; align permission model (any member vs admin-only) |
| Books soft delete — add `deleted_at timestamptz` to `books` table | Filter `WHERE deleted_at IS NULL` in all queries; prevents permanent data loss on creator delete |

### 2f. Data export (GDPR)  🔴 Critical — requires Edge Function  *(was 2e)*
*Supabase Edge Function. Build before 2g.*

**Architecture note:** Export cannot run in the browser — ZIP generation is
server-side, and the service role key guarantees complete retrieval across all
tables regardless of RLS gaps. The browser sends a JWT; the Edge Function validates it,
queries everything as service role filtered by `user_id`, streams a ZIP back.

| Feature | File | Notes |
|---------|------|-------|
| `supabase/functions/account-export` Edge Function | New file | Validate JWT; query all 12+ content tables; package as JSON-per-type + ZIP |
| Export button in Account Settings | `AccountSettings.tsx` or similar | Triggers download; shows progress spinner |
| Auto-trigger export on deletion request | Part of 2f | Generate and store ZIP before any data is touched |

Tables to include in export: `documents`, `pages`, `books` + `book_chapters`,
`decks`, `checklists`, `libraries`, `my_contents`, `posts`, `episodes`,
`playlists`, `builds`, `pitches`, `badges`, user profile.

### 2h. Access tickets unique index  🔴 Critical — live bug
*Single migration — no frontend changes needed.*

Error in browser console: `42P10 — there is no unique or exclusion constraint matching the ON CONFLICT specification`.
The upsert in `accessTicketService` uses `ON CONFLICT (user_id, container_id, container_type)` but the index does not exist.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS access_tickets_user_container_unique
  ON public.access_tickets (user_id, container_id, container_type);
```

### 2g. Account deletion (GDPR/CCPA)  🔴 Critical — requires Edge Function  *(was 2f)*
*Supabase Edge Functions + pg_cron inside Supabase. Build after 2f is done.*

**Architecture note:** The flow is split across two systems by design.
Edge Functions handle user-triggered actions (soft-delete, cancel).
The hard-delete cron runs inside Supabase on a schedule.

| Step | Where | Feature |
|------|-------|---------|
| 1 | Edge Function `account-delete` | `POST` — validate JWT, trigger export (2f), set `users.deleted_at = now()` |
| 2 | Frontend | Account Settings: "Delete my account" button → confirmation dialog with 30-day grace warning |
| 3 | Frontend | On login: if `deleted_at` is set, show "Your account is scheduled for deletion" + Cancel button |
| 4 | Edge Function `account-delete` | `DELETE` — validate JWT, clear `users.deleted_at` |
| 5 | Supabase | pg_cron job: nightly, hard-delete users where `deleted_at < now() - interval '30 days'`; cascade across all content tables |

---

## Sprint 3 — Image Uploads + Visual Polish (May 2026)  📋 Next

**Theme:** Make the platform look like a finished product before onboarding the advisory cohort.
Profiles, circles, programs, and companies are all missing real imagery — this sprint fixes that once, for everything.

**Moved earlier:** Originally Sprint 6a. Prioritised because the advisory cohort experience depends on visual quality, not just functionality.

**Unblocks:** Avatar/cover uploads everywhere, inline images in Pages, My Assets page, Photos and Albums.

### 3a. Supabase Storage setup

| Feature | Notes |
|---------|-------|
| Configure Storage buckets: `avatars`, `covers`, `assets` | Private buckets with signed URLs; set CORS + RLS policies |
| Shared `ImageUpload` component | Drag-drop or click-to-upload; shows preview; returns signed URL; drop into any form |
| Avatar upload on profile edit | First consumer of `ImageUpload` |
| Cover image on Program / Circle / Build | Second consumer |
| Company logo upload | Third consumer — `logo_url` field already exists |
| Inline image paste/upload in Page editor | Fourth consumer; inserts `![alt](url)` into markdown |
| My Assets page (`/my-content/assets`) | Lists all user uploads; delete with ref-check |

---

## Sprint 4 — Advisory Cohort + Validation (June 2026)

**Theme:** Use the platform to recruit and run the first advisory cohort.
The cohort validates §10 backlog hypotheses before any is built.

**Dependencies:** Sprint 3 complete (platform looks polished for cohort onboarding).

### 3a. Advisory cohort program
| Feature | Notes |
|---------|-------|
| Create Circle: "Connexted Early Access" | Admin-only, invitation-only |
| Create Program: "Founder Beta Q3 2026" | Attached to the Circle |
| Journey 1 — Onboarding (Weeks 1–2) | Pages: welcome, platform tour, first action checklist |
| Journey 2 — Feedback Sprint 1 (Weeks 3–4) | Survey: queue feature, micro-pathway; Standup: weekly wins |
| Journey 3 — Feature Pilots (Weeks 5–8) | Pilot builds for validated features; reaction polls |
| Completion tracking (manual for now) | Host marks items complete |

### 3b. Validate queue / watchlist
Send the one-question survey through Journey 2:
> "Do you ever want to save something to do later — not add it to a course,
> just mark it for yourself?" Yes / No / It depends

If >60% Yes → `/my-saved` page plus "Save" actions on Pathway steps and Companions.
If <40% → favorites remain a social signal only.

### 3c. Validate micro-pathway
> "Would you start a pathway if it only had 3 steps and took 20 minutes?"

If >50% → build micro-pathway creator in PathwayAdminPage.

---

## Sprint 5 — Learning Completions + Lifecycle (July 2026)

**Theme:** Close the feedback loop for learners and instructors.

**Dependencies:** Sprint 2 (account deletion done); sprint 3 results in.

### 4a. Journey item completion tracking  ⚠️ Partially done early

| Feature | Status | Notes |
|---------|--------|-------|
| `journey_item_completions` table | ✅ Done | Pre-existing table; `user_id`, `program_id`, `journey_id`, `item_id`, `completed_at` |
| Mark item complete (checkbox + auto-complete for interactive types) | ✅ Done | Shipped with interactive types Apr 2026; checkboxes in JourneyDetailView; Poll/Reflection auto-complete on submit |
| Learner progress bar on Program dashboard | 📋 Remaining | `completed / total` per journey — completions stored but not surfaced yet |
| Instructor view — completion per member | 📋 Remaining | Admin-only progress view not yet built |

### 4b. Pathway step completion (durable)  ✅ Done early (shipped Sprint 1)
| Feature | Status |
|---------|--------|
| `pathway_step_completions` table | ✅ `user_id`, `pathway_id`, `step_id`, `status`, `evidence_note`, admin review fields |
| Step-level completion marker in PathwayDetailPage | ✅ Persists across page reloads |
| `self-report` API endpoint | ✅ Upserts completion + recalculates `progress_pct` |
| `verify-report` API endpoint (admin approve/reject) | ✅ Moves step to approved/rejected state |
| "Pending Review" state for admin-verify steps | ✅ Amber clock icon; Done button hidden |

### 4c. Expiry on Documents, Books, Decks, Lists
| Feature | Notes |
|---------|-------|
| DB migration — `expires_at`, `is_permanent` per type | Follow pattern from builds/pitches |
| My Content Admin — show expiring items per type | Extend existing 4-tab page |
| Expiry notification type | `content.expiring_soon` in notifications table |
| Book metadata parity — `tagline` (text), `reading_time_minutes` (int) | Two nullable columns; `tagline` shown on BookCard; reading time displayed in detail view and journey viewer |

---

## Sprint 6 — Discovery + Content Surface (August 2026)

**Theme:** Members can find and act on content more easily.

### 5a. Page templates (8 system types)
See `PAGES_AND_TEMPLATES_PLAN.md` for full list. Ship as a template picker on the
"New Page" dialog — pre-filled markdown scaffold, no backend changes.

### 5b. Link library enhancements
| Feature | Notes |
|---------|-------|
| Tag filter on `/links` browse page | Client-side; tags already stored |
| Submit link for admin review | `link_submissions` table + admin review queue |

### 5c. Prompts container type
*Full standalone container — same shape as Magazine/Playlist.*

A `prompts` table already exists with `name`, `slug`, `member_ids`, `admin_ids`.
No pages, routes, or create flow exist yet.

| Feature | Notes |
|---------|-------|
| `PromptsPage.tsx` — browse/search | Same pattern as MagazinesPage |
| `PromptDetailPage.tsx` — view + manage | Tabs: Prompts, Manage |
| `CreatePromptPage.tsx` + route | `/prompts/create` |
| Register routes in `App.tsx` + nav item | Restore `Prompts` nav entry |

### 5d. Portfolio audit  *(was 5c)*
| Feature | Notes |
|---------|-------|
| Audit `/portfolio/:userId` — what renders today | Read and document before fixing |
| Fix any broken or empty states | — |

### 5e. Books engagement parity
*No schema changes needed — reuses existing `content_ratings` / `content_shares` tables.*

| Feature | Notes |
|---------|-------|
| Ratings + review text on Books | Add `content_type = 'book'` support; drop in the Rating widget already used by episodes/blogs |
| Share tracking on Books | `content_shares` insert on share action; same pattern as episodes |
| Average rating on BookCard | Pull from `content_ratings`; sortable in discovery |
| Premium visibility on Books | Add `'premium'` to visibility enum; update RLS policy |
| Blogs as journey items | Add `'blog'` to `journey-item-types.ts`; add to `AddJourneyContentDialog`; inline viewer shows "Open article" button + manual "Mark as read" |

### 5f. List enhancements (priority tier)
*See `docs/archive/LISTS_FUTURE_DEVELOPMENT.md` for full 11-item backlog.*

| Feature | Notes |
|---------|-------|
| Inline item editing | Click-to-edit item text; auto-save on blur; fixes existing UX gap (delete-and-recreate workaround) |
| Item expand / accordion | Reveals `assignment`, `notes`, `due_date`, `priority_level` in-place; no navigation away |
| `due_date` + `priority_level` fields | Migration; `priority_level text CHECK (low\|medium\|high\|critical)`; unlocks punchlist + sort |
| Punchlist mode | Per-list toggle; compact table layout; color-code overdue (red) and due-today (amber) |
| Template library view + name prompt | Separate `is_template = true` tab; prompt for list name on copy instead of inheriting template name |

---

## Sprint 7 — Infrastructure + Platform Depth  ⏳ Later

**Note:** Supabase Storage (image uploads) moved to Sprint 3.

### 7a. Engagement metrics architecture
| Feature | Notes |
|---------|-------|
| Materialised count columns on `blogs`/`episodes` via DB triggers or batch Edge Function | Replace multi-query fan-out on browse pages; not urgent until thousands of items |

### 7b. Sessions unified pre-event structure
*ADR approved — see `docs/archive/SESSIONS_EVENTS_MEETINGS_ARCHITECTURE.md`.*

| Feature | Notes |
|---------|-------|
| Migration: make `sessions.start_date` nullable | Sessions can exist before scheduling; no date = "planned but unscheduled" |
| Add `circle_id` + `pathway_id` FKs to `sessions` | Sessions are contextual inside Circle, Program, or Pathway |
| `/my-sessions` sidebar — fetch sessions from all contexts | Currently fetches nothing useful; unify across circles/programs/pathways |
| Calendar integration — sessions with `start_date` appear on unified calendar | `calendarHelpers.ts` today fetches `events` only; extend to include sessions |

### 7c. Interactive content types Phase 2
*Phase 1 (Poll, Reflection, Assignment, FAQ, Schedule Picker) shipped Sprint 1.*

| Feature | Notes |
|---------|-------|
| Ranking — drag-to-reorder; aggregated consensus ranking per option | New `question_type = 'ranking'`; average rank position per option across responses |
| Cohort Intro — structured member introduction card | Name, role, goal fields; visible to all cohort members |
| Peer Review — structured peer feedback exchange | Assign reviewer pairs; rubric-based scoring |
| Office Hours — admin posts availability slots; members book | Time slot table + booking confirmation |

### 7d. Member retention automation — Phase 1
*See `docs/archive/MEMBER_RETENTION_AND_PROGRESSION.md` for full strategy.*

| Feature | Notes |
|---------|-------|
| `get_lifecycle_metrics` RPC | Powers LifecycleDashboard with real aggregate data; currently dashboard renders nothing |
| Activation check | Detects if new member has joined a circle + completed profile + attended an event; surfaces in admin dashboard |
| At-risk notifications | When `get_state_suggestions()` flags a member, create in-platform admin notification |
| Class advancement triggers | Define participation thresholds per class; auto-advance on program/pathway complete or N posts |

---

## Sprint 8 — AI Draft Generation  ⏳ Later

**Dependencies:** Sprint 6 (pages established, markdown editor stable).

| Feature | Notes |
|---------|-------|
| Page AI draft at creation time | Claude API; prompt = title + template type + tags |
| "Regenerate section" button | Per heading; targeted regeneration |
| AI-assisted Page description | One-sentence summary on save |

---

## Hypothesis Pipeline

Ideas in this state are NOT on the roadmap. They move to a sprint only after
advisory cohort validation.

| Idea | Sprint candidate if validated |
|------|------------------------------|
| My Saved / queue as action-intent list | Sprint 2 → Sprint 3 expansion |
| Micro-pathway (3–5 steps) | Sprint 4 or 5 |
| Section schema for Pages (v4) — typed field editor; structured templates | Sprint 5 or 6 |
| Pages v5 — completion tracking (`page_completions` table); reading time column; full-screen `/pages/:id` route | Sprint 5 or 6 |
| Pages v6 — embed in Circles; public URLs for `visibility = 'public'` pages | Sprint 6 |
| Kanban view for Lists — status columns (To Do / In Progress / Done); drag-and-drop | Sprint 5 |
| List schedule view — calendar/timeline when items have `due_date` | Sprint 6 |
| List assignment — replace free-text `assignment` with `assigned_to_user_id` user picker | Sprint 6 |
| Community Picks leaderboard | Sprint 5 |
| Cohort program expiry | Sprint 4 |
| Public page URLs | Sprint 5 |
| Email notifications | Sprint 6+ |
| Shelf (book collection type) — `shelves` + `shelf_items` tables; ShelvesPage + ShelfDetailPage; fix `shelf` key in `journey-item-types.ts` (currently mislabeled as Library) | Post-Sprint 6 |
| Books — video chapters (`video_url`, `video_platform`, `duration_minutes` on `book_chapters`) | Post-Sprint 6 |
| Books — external URL option (reference a published book on Amazon/Leanpub/PDF) | Post-Sprint 6 |
| Member engagement score dashboard — per-member score formula; quartile segmentation; admin user list column | Post-Sprint 6 |
| Circle health score — aggregate activity score per circle; admin view | Post-Sprint 6 |
| Cross-instance content import | Post-MVP |
| Photos and Albums | Post-Sprint 6 (Storage) |
| Audio / Podcast episodes — `media_type` column on episodes; VideoPlayer → MediaPlayer; Spotify/SoundCloud embeds; square cover art for audio | Post-Sprint 6 |

---

## Blocked — Do Not Schedule

| Feature | Blocked on | Est. unblock |
|---------|-----------|--------------|
| Image uploads (all forms) | Storage buckets not configured | Sprint 6 |
| Reviews tab in Content Audit | `reviews` table missing | TBD |
| Expiry notifications cron | pg_cron / scheduled Edge Function | Sprint 4 |
| Hard-delete cron | Account deletion flow | Sprint 2 |
| Cloud folder import | OAuth app registration per provider | Post-MVP |
| ~~Pathway admin writes~~ | ✅ Fixed — Supabase Edge Function + service role key | Done |

---

## What "Done" Means Per Sprint

A feature is done when:
- [ ] A logged-in user can complete the full action (no dead ends)
- [ ] An unauthenticated user sees a sensible empty/login state
- [ ] No TypeScript errors introduced
- [ ] Vercel build passes
- [ ] PR merged to main

It does not require:
- Unit tests (we validate in cohort sessions)
- Perfect design polish (iterate after cohort feedback)
- Mobile responsiveness (desktop-first until cohort confirms mobile need)
