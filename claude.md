# Connexted — Claude Code context

## Repo
- Working dir: /home/user/connextedlabs
- GitHub: aigentjohn/connextedlabs
- Branch convention: develop on `claude/<feature-name>`, squash-merge PR to main
- Never push directly to main

## Stack
- React + TypeScript + Vite
- Supabase (Postgres + Edge Functions)
- Vercel (auto-deploys main; PR previews on every branch)
- Tailwind + shadcn/ui components

## Key paths
- App source: artifacts/connexted/src/
- All pages (flat, no pages/ subfolder): artifacts/connexted/src/app/components/
- Shared components: artifacts/connexted/src/app/components/shared/
- Hooks: artifacts/connexted/src/hooks/
- Lib utilities: artifacts/connexted/src/lib/
- Services: artifacts/connexted/src/services/
- Route registration: artifacts/connexted/src/app/App.tsx
- Feature docs: artifacts/connexted/docs/sidebar/
- Roadmap: artifacts/connexted/docs/PRODUCT_ROADMAP.md
- Edge Functions: supabase/functions/
- Migrations: supabase/migrations/

## Patterns
- Enrollment: use enrollmentBridge (checkAccess + enrollInCourse), not raw supabase queries
- Access tickets: access_tickets table is source of truth; course_enrollments is legacy fallback
- Always use .maybeSingle() not .single() for optional lookups
- Supabase client: `import { supabase } from '@/lib/supabase'` — 30s timeout built-in
- Server-side privileged ops: use Supabase Edge Functions with service role key (no Express API)
- PR workflow: create draft PR after every push; mark ready + squash-merge when approved

## Key hooks (artifacts/connexted/src/hooks/)
- `useAuth` — re-exports from @/lib/auth-context; gives current user + session
- `useContentEngagement(contentType, id)` — likes + favorites on any content type; reads content_likes + content_favorites
- `useAccessTicket(courseId)` — access check for gated content
- `useJourneyCompletion(journeyId)` — journey item completion tracking
- `useViewTracking` — increments view counts

## Key lib files (artifacts/connexted/src/lib/)
- `entity-urls.ts` — single source of truth for building URLs to any content/container type
- `journey-item-types.ts` — registry of all journey item types (content/container/interactive categories)
- `companion-types.ts` — companion surface registry (circle/company/sponsor/event/friend contexts)
- `nav-config.ts` — sidebar nav items per user class tier
- `permissions/` — circlePermissions, containerPermissions, programPermissions, roles

## Shared components (artifacts/connexted/src/app/components/shared/)
FavoriteButton, ShareButton, RatingDialog, ReportContentDialog, ContentEngagement,
ContainerCard, ContainerBreadcrumbs, PageHeader, UserDisplay, QRCodeGenerator,
JoinCircleDialog, ShareInviteButton, ExpirationWarning, ReviewsList,
ImageUpload (preset: 'square'|'wide' — canvas-resizes to 400×400 or 1200×400 WebP before upload)

## Edge Functions (supabase/functions/)
- `invite-user` — admin sends invitation email
- `account-export` — GDPR data export (GET, JWT auth)
- `account-delete` — soft-delete (POST) + cancel (DELETE)
- `hard-delete-accounts` — scheduled nightly cron, hard-deletes users past 30-day grace
- `make-server-d7930c7f` — pathway writes, completions, badge mappings (deployed directly in Supabase)

## Migrations
- File format: `YYYYMMDD000NNN_description.sql` in `supabase/migrations/`
- When a migration is needed, always show the full SQL before creating the file
- Apply by pasting into Supabase SQL editor
- Example filename: `20260428000001_add_circle_invites.sql`
