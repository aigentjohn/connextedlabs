# Pathway Admin — RLS Fix Plan

## Problem

The Pathway Admin page (`/pathway-admin`) cannot read or write to the `pathways` and `pathway_steps` tables because Supabase Row Level Security (RLS) blocks direct browser queries using the anon key.

The Browse Pathways page works because it fetches through a Supabase Edge Function (`make-server-d7930c7f`) that uses the service role key to bypass RLS.

## Current State

- **Pathway Admin** uses direct Supabase client calls (anon key) — blocked by RLS on reads and writes.
- **Browse Pathways** uses `fetchAPI('/pathways')` which calls the Edge Function — works fine.
- The Edge Function supports `GET /pathways` and `POST /pathways/:id/enroll`, but does NOT have admin CRUD endpoints (create, update, delete pathways/steps).

## Fix Options

### Option A: Add pathway admin routes to the Express API server (recommended)

1. **Add `SUPABASE_SERVICE_ROLE_KEY` as an environment secret** — get from Supabase Dashboard → Settings → API → service_role (secret).
2. **Install `@supabase/supabase-js`** in `artifacts/api-server`.
3. **Create `artifacts/api-server/src/lib/supabase.ts`** — Supabase admin client using the service role key.
4. **Create `artifacts/api-server/src/routes/pathways.ts`** with these endpoints:
   - `GET /api/pathways` — list all pathways with steps
   - `POST /api/pathways` — create a new pathway with steps
   - `PUT /api/pathways/:id` — update a pathway and replace its steps
   - `DELETE /api/pathways/:id` — delete a pathway and its steps
5. **Update `PathwayAdminPage.tsx`** — replace all `supabase.from('pathways')` and `supabase.from('pathway_steps')` calls with fetch calls to the Express API server endpoints.

### Option B: Update Supabase RLS policies

1. In Supabase Dashboard → SQL Editor, add RLS policies on `pathways` and `pathway_steps` that allow authenticated users with admin role to read/write.
2. This requires knowing the exact RLS policy structure currently in place.
3. No code changes needed — the existing direct Supabase calls would just work.

### Option C: Extend the Edge Function

1. Add admin CRUD endpoints to the existing `make-server-d7930c7f` Edge Function.
2. This requires access to the Edge Function source code (not in this repo).
3. Update `PathwayAdminPage.tsx` to call the new Edge Function endpoints.

## Recommendation

**Option B is simplest** if you have access to the Supabase Dashboard. Just add RLS policies that let admin-role users read/write pathways and pathway_steps.

**Option A is best** if you want all admin operations routed through a server you control in this repo.

## Tables Affected

- `pathways` — main pathway records
- `pathway_steps` — steps within each pathway (has FK to pathways)

## Files to Change

- `artifacts/connexted/src/app/components/growth/PathwayAdminPage.tsx`
- `artifacts/api-server/src/routes/pathways.ts` (new, Option A only)
- `artifacts/api-server/src/lib/supabase.ts` (new, Option A only)
- `artifacts/api-server/src/routes/index.ts` (register new routes, Option A only)
