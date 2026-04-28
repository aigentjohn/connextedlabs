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
- Feature docs: artifacts/connexted/docs/sidebar/
- Roadmap: artifacts/connexted/docs/PRODUCT_ROADMAP.md
- Services: artifacts/connexted/src/services/
- Shared components: artifacts/connexted/src/app/components/shared/

## Patterns
- Enrollment: use enrollmentBridge (checkAccess + enrollInCourse), not raw supabase queries
- Access tickets: access_tickets table is source of truth; course_enrollments is legacy fallback
- Always use .maybeSingle() not .single() for optional lookups
- PR workflow: create draft PR after every push; mark ready + squash-merge when approved
