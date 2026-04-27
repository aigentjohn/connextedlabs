# Developer Guide

Technical onboarding for incoming developers and technical co-founders. Read this before touching the code.

---

## Origin and Context

This codebase was built by a solo product manager using AI-assisted development tools (Figma Make, Replit, Claude Code). It is a working prototype demonstrating the full product vision — approximately 258,000 lines of TypeScript across a React frontend and Express backend.

What this means practically:
- The product thinking and feature set are intentional and well-considered
- The code has not been through a professional engineering review
- Security hardening, testing, and deployment automation are incomplete
- The architecture foundations are sound and worth building on — not a rewrite situation

Read the known issues section before starting any work.

---

## Architecture

### The Multi-Instance Model

Each community deployment is an independent instance of this codebase with its own:
- Supabase project (complete database and auth isolation)
- Vercel project (frontend)
- Railway service (API server)
- Environment variables (connecting front and back to that community's database)

The same GitHub repository powers all instances. Adding a new community means deploying the same code with different credentials — not forking the codebase.

```
Community A                    Community B
─────────────────────          ─────────────────────
Vercel (frontend)              Vercel (frontend)
    ↓                              ↓
Railway (API)                  Railway (API)
    ↓                              ↓
Supabase Project A             Supabase Project B
(isolated database)            (isolated database)
```

### Package Structure

```
artifacts/connexted/      React 19 + Vite SPA
                          ~258,000 lines, 311 routes
                          Connects directly to Supabase for most operations

artifacts/api-server/     Express 5 Node server
                          ~600 lines, 4 route files
                          Used for pathway operations requiring service role key
                          (bypasses Supabase RLS — see security section)

lib/api-spec/             OpenAPI spec (openapi.yaml) + Orval codegen config
                          Run codegen to regenerate lib/api-zod and
                          lib/api-client-react from the spec

lib/api-zod/              Generated Zod schemas — do not edit directly
lib/api-client-react/     Generated React Query hooks — do not edit directly
```

### Data Flow

Most operations: `React component → Supabase client (browser) → PostgreSQL`

Pathway operations: `React component → Express API → Supabase Admin (service role) → PostgreSQL`

The Express server exists specifically because pathway tables have RLS policies that block the anonymous Supabase key used by the frontend. The service role key bypasses RLS — it lives only in the API server environment, never in the browser.

### User Classification System

Every user has a `user_class` (1–10). This controls which navigation items are visible and which features are accessible:

| Class | Label | Access Level |
|---|---|---|
| 1–2 | Visitor / Guest | Minimal |
| 3–6 | Basic to Regular | Core community and learning features |
| 7–9 | Power to Circle Leader | Extended features (standups, sprints) |
| 10 | Platform Admin | Full platform |

Configuration lives in:
- `lib/db` → `user_class_permissions` table (DB-driven, adjustable via admin UI)
- `artifacts/connexted/src/lib/nav-config.ts` (fallback if DB returns nothing)
- `artifacts/connexted/src/lib/content-auth.ts` (hook for create permission checks)

**Important:** Classification is currently enforced at the UI layer only (nav visibility, create buttons). Database-level RLS enforcement per user class does not yet exist. See security section.

---

## Content Types

The platform has two categories of content: **containers** (spaces users join) and **content** (items users create or consume).

### Containers
Circles, Programs, Courses, Events, Companies, Builds, Pitches — each has member management, visibility, and lifecycle state.

### User Content Types

| Type | Route | Table | Notes |
|---|---|---|---|
| Documents | `/my-documents` | `documents` | URL-based references; shareable links |
| Books | `/books` | `books` + `book_chapters` | Chapters with markdown |
| Decks | `/decks` | `decks` | Slide-style presentations |
| Lists / Checklists | `/checklists` | `checklists` | Task and checklist management |
| Libraries | `/libraries` | `libraries` | Collections of documents |
| Links | `/my-contents` | `my_contents` | Saved URLs with metadata enrichment |
| Pages | `/my-pages` | `pages` | Inline markdown content — stored in DB, not URL-based |
| Episodes | — | `episodes` | Video/audio content with playlists |

### Pages (added April 2026)
Pages are the lightweight inline-markdown content type. Unlike Documents (which store a URL to an external file), Pages store their content directly in the database. Key characteristics:
- Full CRUD at `/my-pages` with editor/preview toggle, `.md` import, `.md` export
- Visibility: `public` / `member` / `private`
- Fully integrated into the Journey system — can be added to any Journey via `AddJourneyContentDialog` and rendered inline via `JourneyInlineViewer`
- Rendered with `react-markdown` + `remark-gfm`

### Journey Integration
Journeys (inside Programs and Courses) can contain any content type. The integration layer is:
- `src/lib/journey-item-types.ts` — registry of all types (icon, label, table name, category)
- `src/types/journey-item-content.ts` — TypeScript interfaces per type
- `src/app/components/program/AddJourneyContentDialog.tsx` — picker UI (fetches from each type's table)
- `src/app/components/journey/JourneyInlineViewer.tsx` — renders each type inline

To add a new content type to Journeys, add entries in all four of these files.

### Pathways
Pathways sequence platform actions across the whole platform (not inside a single Program). They use activity steps that target specific content instances.

Activity types are defined in `PathwayAdminPage.tsx` in the `ACTIVITY_TYPES` constant. The `ACTIVITY_TABLE_MAP` controls which Supabase table is queried to pick a specific target item for a step. Available activity verbs as of April 2026:

**Participation:** `join_circle`, `attend_meeting`, `post_in_forum`, `post_moment`, `create_deck`, `create_build`, `create_pitch`, `mentor_session`, `complete_sprint`, `complete_standup`

**Learning:** `enroll_course`, `complete_program`, `watch_episode`, `read_page`, `view_pitch`, `view_build`

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+ (`npm install -g pnpm`)
- A Supabase project with migrations applied (see [DEPLOYMENT.md](./DEPLOYMENT.md))

### First Run

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — minimum required: VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID,
# VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

# 3. Build TypeScript project references (required before running anything)
pnpm run typecheck

# 4. Start the API server
pnpm --filter @workspace/api-server run dev

# 5. In a second terminal, start the frontend
pnpm --filter @workspace/connexted run dev
```

Frontend runs at `http://localhost:3000`. API server runs at `http://localhost:3001`.

### Regenerating API Client and Zod Schemas

If you change `lib/api-spec/openapi.yaml`, regenerate the downstream packages:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This overwrites `lib/api-zod/src/generated/` and `lib/api-client-react/src/generated/`. Do not hand-edit those folders.

---

## Known Issues — Priority Order

These are documented gaps from the initial code review. Address them in this order.

### Critical — Fix Before Any Real Users

**1. ~~No authentication on Express API routes~~ — FIXED**
`requireAuth` and `requireAdmin` middleware validate Supabase JWTs on all routes. Identity is extracted from the verified token, not request params.

**2. ~~User ID trusted from client~~ — FIXED**
All routes use `(req as AuthRequest).userId` from the verified JWT. URL params are ignored for identity.

**3. ~~Self-report and verify-report endpoints not implemented~~ — FIXED**
Migration `20260427000002_pathway_step_completions.sql` creates the `pathway_step_completions` table.
Both endpoints are implemented: `self-report` upserts a completion record and recalculates progress; `verify-report` lets admins approve or reject pending submissions.
`PathwayDetailPage` loads persisted completions on mount and shows a "Pending Review" state for admin-verify steps.

**4. ~~No Zod validation on API request bodies~~ — FIXED**
All mutation routes (POST/PUT) validate with Zod schemas. GET routes take only path params.

**5. ~~RLS policies too permissive~~ — FIXED**
`participants_update_admin` policy corrected in `20260408000001` and `20260414000001` migrations to require `role IN ('admin', 'super')`.

**6. ~~Pathway admin RLS blocks writes~~ — FIXED**
Express API uses `supabaseAdmin` (service role key) with `requireAdmin` middleware. Pathway CRUD works correctly.

### High Priority — First Sprint

**7. ~~Drizzle removed from stack~~ — DONE**
`lib/db` package deleted. `drizzle-orm` removed from all package.json files and workspace catalog. All table definitions live in Supabase migrations only.

**8. TypeScript strictness gaps**
`tsconfig.base.json` has `strictFunctionTypes: false`, `noUnusedLocals: false`, `skipLibCheck: true`.
- Fix: Enable flags one at a time, work through resulting errors

**9. Pervasive `any` in pathway routes**
24+ uses of `(p: any)`, `(e: any)` in map/filter callbacks throughout `pathways.ts`.
- Fix: Add proper types from the database schema

**10. Raw error messages exposed to clients**
`res.status(500).json({ error: err.message })` appears throughout the API server.
- Fix: Return generic error messages to clients, log details server-side via Pino

**11. `console.error` instead of structured logging**
66 instances of `console.error` across the codebase. Pino is installed and configured.
- Fix: Replace with `logger.error({ err }, 'description')`

### Medium Priority

**12. App.tsx is a single large file**
311 lazy-loaded routes in one file. Hard to navigate and maintain.
- Fix: Extract route groups into separate files (e.g., `routes/admin.tsx`, `routes/community.tsx`)

**13. Template data hardcoded in TypeScript**
`artifacts/connexted/src/data/` contains ~70KB of course and program templates as hardcoded TypeScript arrays.
- Fix: Move to database for multi-instance configurability

**14. ~~`allowedHosts: true` in vite.config.ts~~ — RESOLVED**
Already conditional on `REPL_ID`: `allowedHosts: true` only when running on Replit (required for random subdomains); restricted to `['localhost', '127.0.0.1']` everywhere else. The `server` config is dev-only — Vercel serves the static build output and ignores it entirely.

**15. ~~No step-level completion tracking for Pathways~~ — FIXED**
Migration `20260427000002_pathway_step_completions.sql` and both API endpoints implemented. See item 3 above.

---

## Code Debt

Known UI dead-ends, orphaned files, and hardcoded stubs. Full detail in `artifacts/connexted/docs/DEAD_ENDS_PLAN.md` and `artifacts/connexted/docs/CLEANUP_AND_DEVELOPMENT_NOTES.md`.

### Broken / deceptive UI — fix first

| ID | Issue | File | Status |
|---|---|---|---|
| P1-1 | ~~"Request to Join" writes to wrong table~~ — **FIXED**: dead `useContainerActions.ts` hook deleted; migration `20260427000003` creates `circle_members` and `container_memberships` | — | ✅ |
| P1-2 | ~~My Links Enrich/Delete have no handlers~~ — **FIXED**: `handleEnrichSingle` and `handleDeleteContent` present in `MyContentsPage.tsx` | — | ✅ |
| P1-3 | ~~My Basics Contact tab missing Edit Profile button~~ — **FIXED**: `ContactTab.tsx` is itself an edit form with a Save button | — | ✅ |
| P1-4 | ~~My Circles Create Circle has no onClick~~ — **FIXED**: button navigates to `/circle-admin` (CircleAdminPage with full create flow) | — | ✅ |
| P1-5 | ~~Events RSVP does nothing~~ — **FIXED**: `RSVPActions` component handles RSVP with real DB writes to `session_attendance` / `events.attendee_ids` | — | ✅ |
| P1-6 | ~~Notifications Load More has no handler~~ — **FIXED**: button calls `fetchNotifications(page + 1)` | — | ✅ |

### Hardcoded zeros / false values — real data needed

| ID | Issue | File | Status |
|---|---|---|---|
| P2-2 | ~~Library document counts hardcoded to `0`; "Shared with Me" returns all public docs~~ — **FIXED**: auto-generated libraries apply `filter_rules` (document_type, intended_audience, tags) as a count query; "Shared with Me" queries user's member circle IDs and uses `overlaps` on `documents.circle_ids` | `LibrariesPage.tsx`, `LibraryDetailPage.tsx` | ✅ |
| P2-3 | ~~`recentActivity` hardcoded to `0` on admin dashboard and circle admin page~~ — **FIXED**: `MyAdminDashboard` counts `membership_states` + `container_memberships` (circle joins) in last 30 days; `CircleAdminPage` counts posts across admin's circles in last 30 days | `MyAdminDashboard.tsx`, `CircleAdminPage.tsx` | ✅ |
| P2-4 | ~~`isFavorited` hardcoded to false~~ — **FIXED**: `favoritedDocIds` fetched from `content_favorites` in `MyDocumentsPage.tsx` | — | ✅ |
| P2-5 | ~~Book edit clears topics~~ — **FIXED**: `handleEditBook` now awaits topic fetch before opening dialog; TopicSelector added to edit dialog; update always syncs topics | `BooksPage.tsx` | ✅ |

### Missing pages — all resolved

All previously flagged missing pages exist and are registered in `App.tsx`:

| Route | File | Status |
|---|---|---|
| `/standups/:slug` | `src/app/components/standup/StandupDetailPage.tsx` | ✅ exists + registered |
| `/tables/create` | `src/app/components/table/CreateTablePage.tsx` | ✅ exists + registered |
| `/pitches/create` | `src/app/components/pitch/CreatePitchPage.tsx` | ✅ exists + registered |
| `/builds/new` | `src/app/components/build/CreateBuildPage.tsx` | ✅ exists + registered |
| `/markets/search` | `src/app/pages/MarketSearchPage.tsx` | ✅ created + registered |
| `/help/discover` | `src/app/pages/DiscoverGuidePage.tsx` | ✅ created + registered |

### Dead code — remove

| Item | Action |
|---|---|
| `blogs.view_count` column | Drop or wire up real server-side tracking |
| `blogs.click_count` column | Drop or build analytics query against `blog_clicks` table |
| `episodes.views` column | Drop or wire up real server-side tracking |
| `/episodes/:id/edit` route | Check `App.tsx` — remove if still present |
| `/magazines/:id/settings` route | Absorbed into Manage tab; remove route + check if `MagazineSettingsPage.tsx` is orphaned |
| `/playlists/:slug/settings` route | Same — absorbed; check `PlaylistSettingsPage.tsx` |
| `views: number` field in `Episode` interface in `EpisodesPage.tsx` | Remove — no longer displayed |

---

## Security Model

### What Is Protected

- Circle and container membership enforced by `member_ids` arrays in RLS policies
- Event and ticket access has RLS
- Service role key (Supabase admin) lives only in Railway environment — never in the browser
- Frontend Supabase client uses the anon key — subject to RLS
- RLS initplan fix applied (April 2026) — `auth.uid()` wrapped in `(select auth.uid())` across 49 policies for performance

### What Is Not Protected (Yet)

- User class gating is UI-only — no database enforcement
- Admin routes (`/platform-admin/*`) are protected by navigation only, not by RLS

### Environment Security

Never commit `.env` to source control. The `.env.example` file documents required variables. The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS — treat it as a root credential.

---

## Key Files Reference

| File | What it does |
|---|---|
| `artifacts/connexted/src/app/App.tsx` | All 311 route definitions |
| `artifacts/connexted/src/lib/auth-context.tsx` | User session, class permissions, auth state — exposes `useAuth()` |
| `artifacts/connexted/src/lib/content-auth.ts` | `useContentAuth()` hook — who can create what |
| `artifacts/connexted/src/lib/nav-config.ts` | Fallback navigation tier config |
| `artifacts/connexted/src/lib/journey-item-types.ts` | Registry of all Journey content types |
| `artifacts/connexted/src/types/journey-item-content.ts` | TypeScript interfaces for each Journey content type |
| `artifacts/connexted/src/services/` | Business logic — access tickets, badges, enrollment |
| `artifacts/connexted/src/hooks/useContentEngagement.ts` | Cross-type likes + favorites (`content_likes`, `content_favorites`) |
| `artifacts/connexted/src/hooks/` | All custom React hooks |
| `artifacts/connexted/src/app/pages/MyPagesPage.tsx` | Pages CRUD — create, edit, import, export markdown |
| `artifacts/connexted/src/app/components/ActivePathwaysWidget.tsx` | Home page widget — active pathway enrollments |
| `artifacts/connexted/src/app/components/journey/JourneyInlineViewer.tsx` | Renders any content type inline inside a Journey |
| `artifacts/connexted/src/app/components/program/AddJourneyContentDialog.tsx` | Picker for adding content to a Journey |
| `artifacts/connexted/src/app/components/growth/PathwayAdminPage.tsx` | Pathway creation/editing — ACTIVITY_TYPES, ACTIVITY_TABLE_MAP |
| `artifacts/api-server/src/routes/pathways.ts` | Pathway CRUD (highest priority for security fixes) |
| `artifacts/api-server/src/lib/supabase.ts` | Supabase admin client setup |
| `supabase/migrations/` | All database migrations |
| `artifacts/connexted/docs/PRODUCT_BACKLOG.md` | Full feature inventory — status, priority, notes |
| `artifacts/connexted/docs/PRODUCT_ROADMAP.md` | Phased delivery timeline — sprint themes and dependencies |

---

## Database

Tables and their owner columns — important for RLS and insert operations:

| Table | Owner column | Notes |
|---|---|---|
| `episodes` | `author_id` | |
| `playlists` | `created_by` | INSERT also requires `admin_ids: [userId]` |
| `documents` | `author_id` | |
| `endorsements` | `author_id` | |
| `libraries` | `created_by` + `owner_id` | Dual owner columns |
| `pages` | `created_by` | Added April 2026; inline markdown content |
| `users` | — | Profile table. Name col = `name`, avatar col = `avatar` |
| `posts` | — | Only PLURAL array columns — null all feed columns then set target |
| `pathways` | — | Managed via Express API server, not Supabase client |
| `pathway_steps` | — | Same |
| `pathway_enrollments` | — | Same; stores aggregate `progress_pct` only — no per-step completion |
| `content_likes` | `user_id` | Cross-type likes; use `useContentEngagement()` hook |
| `content_favorites` | `user_id` | Cross-type saved items; viewable at `/my-content` |
| `participants` | — | Member lifecycle state machine |

`useContentAuth()` → `ownerFields('tableName')` returns the correct ownership fields for any table. Use this for all insert operations rather than hardcoding field names.

**Always use `useAuth()` from `@/lib/auth-context` to get the current user profile.** There is no `useProfile` hook — it does not exist.

---

## Contributing

### Before You Start

1. Run `pnpm run typecheck` — fix any type errors before adding new ones
2. Run `pnpm -r run test` — all tests should pass before you begin
3. Read the known issues section — understand what is deliberately deferred vs. broken

### When Adding a Feature

- New API routes need Zod request validation and auth middleware (pattern TBD once middleware is implemented)
- New Supabase tables need a migration file in `supabase/migrations/` and an RLS policy
- New content types need entries in `journey-item-types.ts`, `journey-item-content.ts`, `AddJourneyContentDialog.tsx`, and `JourneyInlineViewer.tsx`
- New services need a corresponding test file in `src/__tests__/services/`
- Do not edit `lib/api-zod/` or `lib/api-client-react/` directly — regenerate from the OpenAPI spec

### Commit to Main

There is no CI pipeline yet. Before merging:
```bash
pnpm run typecheck
pnpm -r run test
pnpm run build
```

---

## Next Engineering Session — Pickup List

Prioritised work as of April 2026. The full product plan lives in
`artifacts/connexted/docs/PRODUCT_ROADMAP.md` — this list covers the
engineering-quality work that sits alongside it.

**Start here — must happen before Sprint 2 features go live in production.**

### 0. Railway deployment (do first — ~3 hrs total)

| Task | Effort | Notes |
|---|---|---|
| Replace `err.message` with generic responses in all API routes | 1–2 hrs | `artifacts/api-server/src/routes/*.ts` — log details server-side, return `"Internal server error"` to client. Required before real users hit the API. |
| Deploy current branch to Railway | 1 hr | Pathway completions + verify-report are built but not live yet. All Sprint 2 API work depends on this. |

### 1. Sprint 2 product work (see PRODUCT_ROADMAP.md Sprint 2 for full spec)

Order matters — follow this sequence:

| Order | Task | Effort | API needed? |
|---|---|---|---|
| 1 | My Favorites audit + Save on Pathway/Companion | 2–3 hrs | No — Supabase client only |
| 2 | Circle shareable invite link + token join flow | 3–4 hrs | No — migration + frontend |
| 3 | Unified content view (extend Content Audit) | 3–4 hrs | No — Supabase client only |
| 4 | Data export endpoint (`GET /account/export`) | 1–2 days | Yes — new Express route, deploy to Railway |
| 5 | Account deletion flow + pg_cron hard-delete | 2–3 days | Yes — new Express routes + Supabase cron |

### 2. Engineering quality (do between product items, not in a block)

| Task | Effort | Notes |
|---|---|---|
| Type the 24+ `(p: any)` casts in `pathways.ts` | 2–3 hrs | `artifacts/api-server/src/routes/pathways.ts` |
| Replace `console.error` with Pino (66 instances) | 2–3 hrs | Frontend + API; use `logger.error({ err }, 'description')` |
| TypeScript strictness — `noUnusedLocals` first | 3–5 hrs | Enable flags one at a time in `tsconfig.base.json` |
| Dead code removal | 1–2 hrs | See "Dead code — remove" table above; check orphaned routes |

### 3. Infrastructure (Sprint 6 on roadmap — schedule separately)

| Task | Effort | Notes |
|---|---|---|
| Supabase Storage setup | 1–2 days | Blocks image uploads on every form + Assets tab in Content Audit. See `IMAGE_SPECIFICATIONS.md`. |
| App.tsx route split | 3–4 hrs | 311 routes in one file; extract into `routes/admin.tsx`, `routes/content.tsx`, etc. |
| Template data → database | 1–2 days | `src/data/` ~70 KB hardcoded; move to `templates` table for multi-instance use |
