# ConnextedLabs

Professional community and cohort learning platform for niche industrial verticals.

Built as a multi-instance platform — the same codebase deployed independently for each community, with its own database and branding. Each instance serves one focused professional group: AI in Manufacturing, Safety in Electrical Contracting, PMO Leadership, Industrial Capital Equipment, and similar verticals.

---

## What This Platform Does

Operators — mentors, training consultants, professional associations — deploy an instance for their community. They build structured learning pathways, run cohort programs, and manage member progression. Members experience an exclusive, purpose-built community rather than a generic social platform.

The operational model: one program manager runs four instances on a staggered schedule, alternating between active cohort mode and community mode so no two cohorts overlap.

---

## Documentation

| Document | What it covers |
|---|---|
| [DEVELOPER.md](./DEVELOPER.md) | Technical onboarding — architecture, known issues, priorities, how to get started |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Step-by-step deployment to Vercel + Railway + Supabase |
| [PRODUCT.md](./PRODUCT.md) | Business model, target verticals, operational model — context for technical decisions |
| [TESTING.md](./TESTING.md) | Test infrastructure, how to run tests, how to add new tests |
| [replit.md](./replit.md) | Original monorepo structure reference (Replit-era, still accurate for package layout) |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment template and fill in your Supabase credentials
cp .env.example .env

# Build shared libraries
pnpm run typecheck

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (second terminal)
pnpm --filter @workspace/connexted run dev

# Run tests
pnpm -r run test
```

Full setup instructions: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Query |
| Backend API | Express 5, Node 24, Zod, Pino |
| Database + Auth | PostgreSQL via Supabase, Drizzle ORM |
| Hosting | Vercel (frontend), Railway (API), Supabase (database) |
| Package manager | pnpm workspaces (monorepo) |

---

## Repository Structure

```
connextedlabs/
├── artifacts/
│   ├── connexted/          # React SPA — the community platform
│   └── api-server/         # Express API — pathway operations
├── lib/
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-zod/            # Generated Zod schemas
│   └── api-client-react/   # Generated React Query hooks
├── supabase/
│   └── migrations/         # SQL migrations — run against each instance
├── scripts/                # Utility scripts
├── .env.example            # Required environment variables
├── DEPLOYMENT.md           # Deployment guide
├── DEVELOPER.md            # Technical onboarding
├── PRODUCT.md              # Product and business context
└── TESTING.md              # Test strategy and infrastructure
```
