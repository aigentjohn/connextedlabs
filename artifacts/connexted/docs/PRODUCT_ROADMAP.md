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

---

## Sprint 2 — Surfacing Saved Content (May 2026)  📋 Next

**Theme:** Make the platform's existing engagement data visible to users.
Everything users have saved, liked, or favorited is already stored — they just
can't see it in one place.

**Unblocks:** Advisory cohort onboarding, queue validation, companion enhancements.

### 2a. My Favorites — audit and extend  🟡 Medium
My Favorites (`/my-content`) already exists: `MyContentPage.tsx` queries
`content_favorites`, groups by type, and renders remove buttons.
The Discover sidebar already links to it with a count badge.

| Feature | Notes |
|---------|-------|
| Audit which content types are missing a favorite button | Compare `JOURNEY_ITEM_TYPES` list vs. pages that use `useContentEngagement` |
| "Save" action on Pathway step cards | Heart/bookmark calls `toggleFavorite('pathway_step', step.id)` |
| "Save" action on Companion items | Companion panel → add to favorites |

### 2b. Pathway admin RLS fix  ✅ Done
Express API uses `supabaseAdmin` (service role key) with `requireAdmin` middleware.
All pathway CRUD operations work. Step-level completion tracking also shipped early
(`pathway_step_completions` table + `self-report` / `verify-report` endpoints).

### 2c. Circle shareable invite link  🔴 Critical
Circle admins currently cannot generate their own invite links — only platform
admins can. Blocks organic community growth.

| Feature | Notes |
|---------|-------|
| "Copy invite link" button on Circle admin panel | Generates token stored in `circle_invites` |
| Token-based join flow (`/join/:token`) | Validates token, adds member, redirects |

### 2d. Account deletion (GDPR/CCPA)  🔴 Critical
Legal exposure without this. Must ship before any paid tier.

| Feature | Notes |
|---------|-------|
| Self-service account deletion request | Soft-delete with 30-day grace |
| 30-day grace — cancel deletion | User can undo during grace period |
| Hard-delete cron (post-grace) | pg_cron or nightly Edge Function |
| Data export (GDPR ZIP) | All content + profile JSON + avatar |

---

## Sprint 3 — Advisory Cohort + Validation (June 2026)

**Theme:** Use the platform to recruit and run the first advisory cohort.
The cohort validates §10 backlog hypotheses before any is built.

**Dependencies:** Sprint 2 complete (invite links, saved items surfaced).

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

## Sprint 4 — Learning Completions + Lifecycle (July 2026)

**Theme:** Close the feedback loop for learners and instructors.

**Dependencies:** Sprint 2 (account deletion done); sprint 3 results in.

### 4a. Journey item completion tracking
| Feature | Notes |
|---------|-------|
| `journey_item_completions` table | `user_id`, `program_id`, `journey_id`, `item_id`, `completed_at` |
| Mark item complete button in JourneyInlineViewer | Calls upsert on completion table |
| Learner progress bar on Program dashboard | `completed / total` per journey |
| Instructor view — completion per member | Admin-only tab on Program page |

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

---

## Sprint 5 — Discovery + Content Surface (August 2026)

**Theme:** Members can find and act on content more easily.

### 5a. Page templates (8 system types)
See `PAGES_AND_TEMPLATES_PLAN.md` for full list. Ship as a template picker on the
"New Page" dialog — pre-filled markdown scaffold, no backend changes.

### 5b. Link library enhancements
| Feature | Notes |
|---------|-------|
| Tag filter on `/links` browse page | Client-side; tags already stored |
| Submit link for admin review | `link_submissions` table + admin review queue |

### 5c. Portfolio audit
| Feature | Notes |
|---------|-------|
| Audit `/portfolio/:userId` — what renders today | Read and document before fixing |
| Fix any broken or empty states | — |

---

## Sprint 6 — Infrastructure (Supabase Storage)  ⏳ Later

**Unblocks:** Avatar/cover uploads, inline images in Pages, My Assets page,
Photos and Albums, asset reference check before delete.

This sprint does nothing visible to users except fix the "no image upload"
problem that affects every form in the app. Do it once, do it right.

| Feature | Notes |
|---------|-------|
| Configure Storage buckets (avatars, covers, assets) | See `IMAGE_SPECIFICATIONS.md` |
| Upload component (`ImageUpload`) | Shared; drop into any form |
| Avatar upload on profile edit | First consumer |
| Cover image on Program / Circle / Build | Second consumer |
| Inline image paste in Page editor | Third consumer; `![alt](url)` in markdown |
| My Assets page (`/my-content/assets`) | Lists all user uploads; delete with ref-check |

---

## Sprint 7 — AI Draft Generation  ⏳ Later

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
| Section schema for Pages | Sprint 5 or 6 |
| Kanban view for Lists | Sprint 5 |
| Community Picks leaderboard | Sprint 5 |
| Cohort program expiry | Sprint 4 |
| Public page URLs | Sprint 5 |
| Email notifications | Sprint 6+ |
| Cross-instance content import | Post-MVP |
| Photos and Albums | Post-Sprint 6 (Storage) |

---

## Blocked — Do Not Schedule

| Feature | Blocked on | Est. unblock |
|---------|-----------|--------------|
| Image uploads (all forms) | Storage buckets not configured | Sprint 6 |
| Reviews tab in Content Audit | `reviews` table missing | TBD |
| Expiry notifications cron | pg_cron / scheduled Edge Function | Sprint 4 |
| Hard-delete cron | Account deletion flow | Sprint 2 |
| Cloud folder import | OAuth app registration per provider | Post-MVP |
| ~~Pathway admin writes~~ | ✅ Fixed — Express API + service role key | Done |

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
