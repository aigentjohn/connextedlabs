# Developer Guide

Technical onboarding for incoming developers and technical co-founders. Read this before touching the code.

---

## Origin and Context

This codebase was built by a solo product manager using AI-assisted development tools (Figma Make, Replit, Claude Code). It is a working prototype demonstrating the full product vision — approximately 76,000 lines of TypeScript across a React frontend and Express backend.

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
                          ~75,000 lines, 264 routes
                          Connects directly to Supabase for most operations

artifacts/api-server/     Express 5 Node server
                          ~600 lines, 4 route files
                          Used for pathway operations requiring service role key
                          (bypasses Supabase RLS — see security section)

lib/db/                   Drizzle ORM config + PostgreSQL connection
                          Schema is currently empty — all tables live in
                          Supabase migrations, not Drizzle schema

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

**1. No authentication on Express API routes**
All pathway routes are publicly accessible. No middleware verifies the caller's identity. The admin endpoint (`/api/pathways/admin/progress`) has no access control at all.
- File: `artifacts/api-server/src/routes/pathways.ts`
- Fix: Add JWT verification middleware that validates the Supabase auth token from the request header

**2. User ID trusted from client**
Routes accept `user_id` from query params without verifying the caller owns that ID.
- Example: `GET /api/pathways/user/:userId/enrollments` — any caller can pass any userId
- Fix: Extract user identity from the verified JWT, not from the request params

**3. Two stub endpoints that do nothing**
`/self-report` and `/verify-report` return hardcoded success without touching the database.
- File: `artifacts/api-server/src/routes/pathways.ts` (lines ~419, ~428)
- Fix: Implement or remove

**4. No Zod validation on API request bodies**
Routes accept any shape of data. Zod is installed and available.
- Fix: Add `.parse()` or `.safeParse()` on `req.body` using schemas from `@workspace/api-zod`

**5. RLS policies too permissive**
Several migration-defined RLS policies allow any authenticated user to perform admin-level updates.
- File: `supabase/migrations/20260407000001_add_missing_tables.sql`
- Look for: `participants_update_admin` — should check `is_admin` flag, not just `auth.uid() IS NOT NULL`

### High Priority — First Sprint

**6. Drizzle schema is empty**
`lib/db/src/schema/index.ts` exports nothing. All table definitions exist only in Supabase migrations. The ORM layer is installed but unused.
- Decision needed: populate Drizzle schema to match the actual database, or remove Drizzle from the stack

**7. TypeScript strictness gaps**
`tsconfig.base.json` has `strictFunctionTypes: false`, `noUnusedLocals: false`, `skipLibCheck: true`.
- Fix: Enable flags one at a time, work through resulting errors

**8. Pervasive `any` in pathway routes**
24+ uses of `(p: any)`, `(e: any)` in map/filter callbacks throughout `pathways.ts`.
- Fix: Add proper types from the database schema

**9. Raw error messages exposed to clients**
`res.status(500).json({ error: err.message })` appears throughout the API server.
- Fix: Return generic error messages to clients, log details server-side via Pino

**10. `console.error` instead of structured logging**
66 instances of `console.error` across the codebase. Pino is installed and configured.
- Fix: Replace with `logger.error({ err }, 'description')`

### Medium Priority

**11. App.tsx is a single large file**
264 lazy-loaded routes in one file. Hard to navigate and maintain.
- Fix: Extract route groups into separate files (e.g., `routes/admin.tsx`, `routes/community.tsx`)

**12. Template data hardcoded in TypeScript**
`artifacts/connexted/src/data/` contains ~70KB of course and program templates as hardcoded TypeScript arrays.
- Fix: Move to database for multi-instance configurability

**13. `allowedHosts: true` in vite.config.ts**
Overly permissive for production deployment.
- Fix: Set to the actual deployment domain

---

## Security Model

### What Is Protected

- Circle and container membership enforced by `member_ids` arrays in RLS policies
- Event and ticket access has RLS
- Service role key (Supabase admin) lives only in Railway environment — never in the browser
- Frontend Supabase client uses the anon key — subject to RLS

### What Is Not Protected (Yet)

- Express API routes have no auth middleware
- User class gating is UI-only — no database enforcement
- Admin routes (`/platform-admin/*`) are protected by navigation only, not by RLS

### Environment Security

Never commit `.env` to source control. The `.env.example` file documents required variables. The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS — treat it as a root credential.

---

## Key Files Reference

| File | What it does |
|---|---|
| `artifacts/connexted/src/app/App.tsx` | All 264 route definitions |
| `artifacts/connexted/src/lib/auth-context.tsx` | User session, class permissions, auth state |
| `artifacts/connexted/src/lib/content-auth.ts` | `useContentAuth()` hook — who can create what |
| `artifacts/connexted/src/lib/nav-config.ts` | Fallback navigation tier config |
| `artifacts/connexted/src/services/` | Business logic — access tickets, badges, enrollment |
| `artifacts/connexted/src/hooks/` | Custom React hooks |
| `artifacts/api-server/src/routes/pathways.ts` | Pathway CRUD (highest priority for security fixes) |
| `artifacts/api-server/src/lib/supabase.ts` | Supabase admin client setup |
| `lib/db/src/schema/index.ts` | Drizzle schema (currently empty) |
| `supabase/migrations/` | All database migrations |

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
| `users` | — | Profile table. Name col = `name`, avatar col = `avatar` |
| `posts` | — | Only PLURAL array columns — null all feed columns then set target |
| `pathways` | — | Managed via Express API server, not Supabase client |
| `pathway_steps` | — | Same |
| `pathway_enrollments` | — | Same |
| `participants` | — | Member lifecycle state machine |

`useContentAuth()` → `ownerFields('tableName')` returns the correct ownership fields for any table. Use this for all insert operations rather than hardcoding field names.

---

## Contributing

### Before You Start

1. Run `pnpm run typecheck` — fix any type errors before adding new ones
2. Run `pnpm -r run test` — all tests should pass before you begin
3. Read the known issues section — understand what is deliberately deferred vs. broken

### When Adding a Feature

- New API routes need Zod request validation and auth middleware (pattern TBD once middleware is implemented)
- New Supabase tables need a migration file and an RLS policy
- New services need a corresponding test file in `src/__tests__/services/`
- Do not edit `lib/api-zod/` or `lib/api-client-react/` directly — regenerate from the OpenAPI spec

### Commit to Main

There is no CI pipeline yet. Before merging:
```bash
pnpm run typecheck
pnpm -r run test
pnpm run build
```
