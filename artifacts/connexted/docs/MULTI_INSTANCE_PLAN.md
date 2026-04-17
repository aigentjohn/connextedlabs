# Multi-Instance Deployment Plan
## Connexted Labs — Segment-Based Replication

**Status:** Planning  
**Goal:** Run two or more isolated instances of the platform on separate URLs, each serving a distinct audience segment, sharing the same codebase but with fully independent databases and configuration.

---

## Architecture Overview

```
GitHub Repo (shared codebase)
        │
        ├── Vercel Project A  →  community-a.connexted.com  →  Supabase Project A
        ├── Vercel Project B  →  community-b.connexted.com  →  Supabase Project B
        └── Vercel Project C  →  community-c.connexted.com  →  Supabase Project C
```

- **One GitHub repo** — all instances deploy from the same branch
- **One Vercel project per instance** — different env vars point each to its own database
- **One Supabase project per instance** — fully isolated data, auth, and storage
- **Shared migrations** — all schema changes apply to every instance

Data is 100% isolated. A user in Instance A cannot see or access Instance B's data.

---

## What Changes Per Instance

| Item | How It's Set | Where |
|------|-------------|-------|
| Supabase project | `VITE_SUPABASE_PROJECT_ID` + `VITE_SUPABASE_ANON_KEY` | Vercel env vars |
| URL / domain | Custom domain in Vercel | Vercel project settings |
| Platform name | `platform_settings.platform_name` | Admin panel → Platform Settings |
| Platform description | `platform_settings.platform_description` | Admin panel |
| Logo / favicon | `platform_settings.logo_url` | Admin panel |
| Feature flags | `platform_settings.*` columns | Admin panel |
| Seed content | Run instance-specific seed SQL | Supabase SQL editor |
| Admin users | First user created + role set to `super` | Post-launch step |

## What Stays the Same

- All React components and pages
- All migrations and database schema
- All RLS policies and security rules
- All Edge Functions
- Vercel build settings and framework config

---

## Phase 1 — Instance Setup Checklist

For each new instance, complete the following steps in order.

### Step 1 · Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it clearly (e.g. `connexted-segment-b`)
3. Choose the closest region to your audience
4. Save the **Project ID**, **Anon Key**, and **Service Role Key** securely
5. Note the **Database password** — needed for migration step

### Step 2 · Run All Migrations

In the Supabase Dashboard → SQL Editor, run each migration file **in order**:

```
supabase/migrations/20260330000000_create_ticket_inventory_items.sql
supabase/migrations/20260407000001_add_missing_tables.sql
supabase/migrations/20260408000001_fix_permissive_rls_policies.sql
supabase/migrations/20260408000002_enable_rls_on_unprotected_tables.sql
supabase/migrations/20260408000003_fix_security_definer_views.sql
supabase/migrations/20260409000001_add_rls_pathways.sql
supabase/migrations/20260409000002_fix_users_rls_policies.sql
supabase/migrations/20260409000003_create_surveys.sql
supabase/migrations/20260414000001_fix_rls_initplan_and_duplicate_indexes.sql
```

> **Note:** Run them one at a time. If a migration fails, stop and fix before proceeding.

### Step 3 · Seed Platform Settings

After migrations, insert a base platform_settings row for this instance:

```sql
INSERT INTO public.platform_settings (
  platform_name,
  platform_description,
  enable_guest_browsing,
  enable_marketplace
) VALUES (
  'Connexted Labs',          -- update to segment-specific name if needed
  'Your community description here',
  false,
  false
);
```

### Step 4 · Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import the same GitHub repo (`aigentjohn/connextedlabs`)
3. Set **Root Directory** to `artifacts/connexted`
4. Add the following environment variables:

```
VITE_SUPABASE_PROJECT_ID     = <new-project-id>
VITE_SUPABASE_ANON_KEY       = <new-anon-key>
SUPABASE_SERVICE_ROLE_KEY    = <new-service-role-key>
NODE_ENV                     = production
LOG_LEVEL                    = info
BASE_PATH                    = /
```

5. Deploy

### Step 5 · Assign a Domain

1. In Vercel → Project Settings → Domains
2. Add the segment URL (e.g. `segment-b.connexted.com`)
3. Add DNS records as instructed by Vercel
4. Wait for SSL provisioning (~2–5 minutes)

### Step 6 · Create the First Admin User

1. Open the new instance URL
2. Use the Magic Link login with your admin email
3. In Supabase Dashboard → Table Editor → `users` table
4. Find your user row and set `role = 'super'`
5. Log in and complete platform configuration via Admin Panel

---

## Phase 2 · Per-Instance Configuration (Admin Panel)

Once the instance is live, customise it via **Admin → Platform Settings**:

- Platform name and description
- Logo and favicon URLs
- Feature flags (guest browsing, marketplace, etc.)
- Membership tiers and pricing
- Notification settings
- Seed initial circles, programs, and content specific to the segment

---

## Phase 3 · Migration Management (Keeping Instances in Sync)

Every time a new migration is added to the repo, it must be applied to **all active instances**.

### Current Manual Process

1. New migration added to `supabase/migrations/` and pushed to GitHub
2. For each instance: open Supabase Dashboard → SQL Editor → paste and run the migration
3. Track which migrations have been applied per instance in the log below

### Instance Migration Log

Maintain this table as migrations are applied:

| Migration File | Instance A | Instance B | Instance C |
|----------------|-----------|-----------|-----------|
| 20260330000000_create_ticket_inventory_items | ✅ | ⬜ | ⬜ |
| 20260407000001_add_missing_tables | ✅ | ⬜ | ⬜ |
| 20260408000001_fix_permissive_rls_policies | ✅ | ⬜ | ⬜ |
| 20260408000002_enable_rls_on_unprotected_tables | ✅ | ⬜ | ⬜ |
| 20260408000003_fix_security_definer_views | ✅ | ⬜ | ⬜ |
| 20260409000001_add_rls_pathways | ✅ | ⬜ | ⬜ |
| 20260409000002_fix_users_rls_policies | ✅ | ⬜ | ⬜ |
| 20260409000003_create_surveys | ✅ | ⬜ | ⬜ |
| 20260414000001_fix_rls_initplan_and_duplicate_indexes | ✅ | ⬜ | ⬜ |

> ✅ Applied · ⬜ Pending · ❌ Failed

### Future Improvement — Automated Migration Runner

Once three or more instances exist, consider a GitHub Action that:
1. Triggers on push to `main` when a file in `supabase/migrations/` changes
2. Reads a list of Supabase project IDs from a GitHub secret
3. Runs `supabase db push` against each project automatically

This removes the manual step entirely.

---

## Phase 4 · Segment-Specific Customisation (Future)

Currently the platform name "Connexted Labs" and all UI copy is shared. If instances need distinct identity beyond just the URL and database content, the following changes enable it:

### 4a · Per-Instance Theme Colors

Add to `platform_settings`:
```sql
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS primary_color   text DEFAULT '#4F46E5',
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#06B6D4';
```

Inject into CSS variables at app startup from the settings row.

### 4b · Per-Instance Hero Copy

Add to `platform_settings`:
```sql
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS hero_headline    text,
  ADD COLUMN IF NOT EXISTS hero_subheadline text,
  ADD COLUMN IF NOT EXISTS hero_cta_label   text;
```

Pull these in `MarketingLandingPage.tsx` instead of hardcoded strings.

### 4c · Centralise Remaining Hardcoded Brand Strings

There are currently ~66 references to "CONNEXTED" hardcoded across ~20 component files. To make all of them dynamic:

1. Add a `usePlatformSettings()` hook that fetches and caches the settings row
2. Expose `platformName`, `logoUrl`, `primaryColor` from the hook
3. Replace hardcoded strings in components with the hook values
4. Estimated effort: **3–5 hours**

This phase is optional as long as all instances remain "Connexted Labs" branded.

---

## Instance Registry

Track all active instances here:

| Instance | URL | Supabase Project | Vercel Project | Segment | Status |
|----------|-----|-----------------|----------------|---------|--------|
| Primary | connexted.com | (existing) | connexted-main | General | 🟢 Live |
| Instance B | TBD | TBD | TBD | TBD | ⬜ Planned |

---

## Estimated Effort Summary

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Spin up new Supabase project + run migrations | 1 hour |
| 1 | Create Vercel project + set env vars + domain | 30 min |
| 1 | First admin user + initial platform settings | 30 min |
| 2 | Seed content specific to the segment | 1–3 hours |
| 3 | Manual migration application per new release | 5–10 min per instance |
| 3 | GitHub Actions auto-migration runner | 2–3 hours (one-time) |
| 4 | Centralise hardcoded brand strings (optional) | 3–5 hours |

**Total to launch a second instance: ~2–4 hours**
