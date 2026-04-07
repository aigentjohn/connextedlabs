# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

---

## Connexted Platform (`artifacts/connexted`)

React + Vite SPA connected to Supabase (`bxxcfgizpcfaopsyxgnj.supabase.co`). Uses `react-router` (not `react-router-dom`), React 19.1.0.

### Key Supabase table notes

| Table | Owner column | Notes |
|---|---|---|
| `episodes` | `author_id` | No `created_by` column |
| `playlists` | `created_by` | No `author_id`; INSERT RLS also requires `auth.uid() = ANY(admin_ids)` — always include `admin_ids: [userId]` on create |
| `documents` | `author_id` | |
| `endorsements` | `author_id` | |
| `libraries` | `created_by` + `owner_id` | Dual owner columns |
| `users` | — | Profile table is `users` (NOT `profiles`); name col = `name`, avatar col = `avatar` |
| `posts` | — | Only PLURAL array columns; null all feed columns then set target one |
| `platform_docs` | — | Single source for all editable text: home page content + help/onboarding docs |

### Content auth (`lib/content-auth.ts`)

`useContentAuth()` is the single source of truth for INSERT ownership fields. `ownerFields('tableName')` returns the correct `{ author_id }` or `{ created_by }` or both based on the table. `AUTHOR_ID_TABLES` = `['documents', 'endorsements', 'episodes']`.

### Platform docs system

`platform_docs` table stores all editable platform text (doc_key is unique):
- `welcome` — Help & Docs → Welcome Guide (`/help/welcome`)
- `help` — Help & Docs → Full reference (`/help/help`)
- `home_hero` — Public home page hero (headline / tagline / paragraphs)
- `home_about` — Public home page philosophy strip
- `home_cta` — Public home page call-to-action

Admin edits via Platform Admin → Documentation Manager (`/platform-admin/documentation`). Markdown format. HelpViewer and MarketingLandingPage fall back to static `src/WELCOME.md` / `src/HELP.md` and hardcoded copy respectively when DB rows are empty.

### Pathway API (API Server routes)

All pathway operations go through the Express API server (`artifacts/api-server/src/routes/pathways.ts`) using the Supabase service role key to bypass RLS. Tables: `pathways`, `pathway_steps`, `pathway_enrollments`, `pathway_step_reports`.

Pages using the API server (`/api/pathways/...`):
- **PathwayAdminPage** — CRUD pathways + steps
- **BrowsePathwaysPage** — list pathways, enroll
- **MyGrowthPage** — user enrollments, recommendations, skip/self-report steps
- **PathwayProgressTracker** — admin progress view, verify reports, admin-complete

All frontend pages pass `user_id` explicitly (not via auth token headers).

### Known DB-side issues

All previously known issues are resolved:
- `forum_threads` trigger — fixed (`NEW.content` → `to_jsonb(NEW)->>'content'` with `body` fallback)
- Pathway CRUD — routed through Express API server with service role key (RLS on `pathways`/`pathway_steps` blocks anon key)

### Discovery & Tagging System

**Tags** are free-form text arrays (`text[]`) stored directly on 21 content/container tables. The `TagDetailPage` searches ALL tables via `Promise.allSettled` with `.contains('tags', [tag])`. Filter sidebar groups results into Content vs Container sections, only showing types that have matching results. **TagsPage** (`/tags`) fetches grouped tag suggestions from the Edge Function `/tags/suggestions/grouped` (types: what/how/status) with Popular/WHAT/HOW tabs, search, and links to `/tags/:tagName` detail pages. Route is grouped with Topics in App.tsx.

**Topics** are structured records in `topics` table (3 types: audience/purpose/theme). Linked to content via `topic_links` junction table. `TopicDetailPage` fetches linked content IDs from Edge Function, then loads from 8 tables: books, decks, documents, courses, programs, episodes, playlists, magazines. Tabs are only shown when content exists for that type.

**Topic following**: Stars on `TopicsPage` cards allow batch follow/unfollow. Follow data stored in `topic_followers` table. Batch-loaded on mount via single Supabase query. Toggle calls Edge Function `/topics/:id/follow` or `/topics/:id/unfollow`.

**Rankings** (`/rankings`): Shows top tags (aggregated usage counts across 14 content tables) and top topics (ranked by content linked via `topic_links` + follower counts). Each entry links to its detail page (`/tags/:name` or `/topics/:slug`). Accessible from sidebar DISCOVER section.

**Following Feed** (`/discovery?tab=following`): Aggregates content from three sources — followed people (`user_connections`), followed topics (`topic_followers` + `topic_links`), and followed tags (`tag_followers` + `.overlaps()` queries). Each card shows source badges indicating why it appeared.

### Naming conventions (Checklists → Lists)

The DB table is `checklists` / `checklist_items` and internal code identifiers (variable names, route paths like `/checklists`, type keys) remain `checklist`/`checklists`. All **user-facing labels** use **"List" / "Lists"** — taxonomy, sidebar, page titles, toasts, buttons, admin pages. This is enforced across taxonomy.ts, entity-urls.ts, container-types.ts, nav-config.ts, journey-item-types.ts, and all component files.

### Navigation / permissions

`auth-context.tsx` fetches user class permissions via two separate queries (not embedded FK join): `user_class_permissions` (204 rows) + `container_types` (24 rows), joined in JS. Nav config falls back to `nav-config.ts` if DB returns 0 rows for user's class.
