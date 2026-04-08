# Deployment Guide

This platform deploys as three separate services that work together:

| Service | What it is | Hosting |
|---|---|---|
| Frontend | React SPA (the community platform UI) | Vercel |
| API Server | Express backend (pathway operations) | Railway |
| Database + Auth | PostgreSQL + authentication | Supabase |

Each community instance gets its own Supabase project and its own Vercel + Railway deployment. The same GitHub repository powers all instances — only the environment variables differ.

---

## Prerequisites

- Node.js 24+
- pnpm 9+ (`npm install -g pnpm`)
- GitHub account with this repository
- Accounts at: [supabase.com](https://supabase.com), [vercel.com](https://vercel.com), [railway.app](https://railway.app)

---

## Step 1 — Supabase Setup (Database + Auth)

Do this once per community instance.

### 1.1 Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name (e.g. `connexted-ai-manufacturing`)
3. Set a strong database password — save this, you will need it
4. Choose a region close to your users
5. Wait for the project to finish provisioning (~2 minutes)

### 1.2 Collect your credentials

Go to **Project Settings → API** and copy:

| Value | Where to find it | Used in |
|---|---|---|
| Project URL | Project Settings → API → Project URL | `VITE_SUPABASE_URL` |
| Project ID | The subdomain of your Project URL | `VITE_SUPABASE_PROJECT_ID` |
| `anon` public key | Project Settings → API → Project API keys | `VITE_SUPABASE_ANON_KEY` |
| `service_role` key | Project Settings → API → Project API keys | `SUPABASE_SERVICE_ROLE_KEY` |
| Database URI | Project Settings → Database → Connection string → URI | `DATABASE_URL` |

> **Security:** The `anon` key is safe to use in the browser. The `service_role` key bypasses all Row Level Security — never expose it in the frontend.

### 1.3 Run database migrations

From the project root, with your `.env` file configured:

```bash
# Install dependencies
pnpm install

# Run all migrations against your Supabase project
pnpm --filter @workspace/db run push
```

If you encounter permission errors, use:
```bash
pnpm --filter @workspace/db run push-force
```

### 1.4 Configure Authentication

In your Supabase dashboard:

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel domain (e.g. `https://your-community.vercel.app`)
3. Add the same URL to **Redirect URLs**
4. Once you have a custom domain, update both values

---

## Step 2 — Fix Hardcoded Supabase Credentials

> **Important:** Before deploying, the frontend Supabase credentials must be moved from hardcoded values to environment variables. This is required for the multi-instance model to work.

Open `artifacts/connexted/src/utils/supabase/info.tsx` and replace the contents with:

```typescript
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!projectId || !publicAnonKey) {
  throw new Error('VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY must be set');
}
```

This allows each community instance to connect to its own Supabase project via environment variables rather than hardcoded values.

---

## Step 3 — Deploy the Frontend to Vercel

### 3.1 Connect your repository

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your GitHub repository
3. Vercel will detect it as a Vite project

### 3.2 Configure the build settings

In Vercel project settings, set:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `artifacts/connexted` |
| Build Command | `pnpm run build` |
| Output Directory | `dist/public` |
| Install Command | `pnpm install` |

### 3.3 Set environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `PORT` | `3000` |
| `BASE_PATH` | `/` |
| `NODE_ENV` | `production` |

> **Note:** `REPL_ID` must NOT be set in Vercel. Its absence tells the build to skip Replit-specific plugins.

### 3.4 Deploy

Click **Deploy**. Vercel will build and deploy the frontend. The first deployment takes 2–3 minutes.

Your frontend is now live at `https://your-project.vercel.app`.

---

## Step 4 — Deploy the API Server to Railway

### 4.1 Create a new Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Choose **Deploy from GitHub repo**
3. Select your repository

### 4.2 Configure the service

Railway will detect a Node.js project. In the service settings:

| Setting | Value |
|---|---|
| Root Directory | `artifacts/api-server` |
| Build Command | `pnpm install && pnpm run build` |
| Start Command | `node --enable-source-maps ./dist/index.mjs` |

### 4.3 Set environment variables

In **Railway → Service → Variables**, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |

> **Note:** Railway provides `PORT` automatically. Do not set it manually.

### 4.4 Get your Railway URL

Once deployed, Railway assigns a URL like `https://your-service.railway.app`. Copy this — you will need it to connect the frontend to the API server.

### 4.5 Connect frontend to API server

In your Vercel environment variables, add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Railway service URL |

Then redeploy the Vercel frontend for the change to take effect.

---

## Step 5 — Verify the Deployment

1. Open your Vercel URL in a browser
2. The login/signup page should load
3. Create an account and confirm it via email (Supabase sends a confirmation)
4. Visit `/api/healthz` on your Railway URL — it should return `{"status":"ok"}`
5. Log in and navigate through the platform

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/connextedlabs
cd connextedlabs
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Build shared libraries first

```bash
pnpm run typecheck
```

This builds the TypeScript project references in the correct order.

### 4. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

### 5. Start the frontend (in a second terminal)

```bash
pnpm --filter @workspace/connexted run dev
```

The frontend runs at `http://localhost:3000` by default.

---

## Multi-Instance Deployment (Additional Communities)

Each new community instance requires its own Supabase project and its own Vercel + Railway deployment. The process is the same as above with different credentials.

### Checklist for a new instance

- [ ] Create new Supabase project
- [ ] Run migrations on new project
- [ ] Create new Vercel project pointing to same GitHub repo
- [ ] Set Vercel environment variables with new Supabase credentials
- [ ] Create new Railway service pointing to same GitHub repo
- [ ] Set Railway environment variables with new Supabase service role key
- [ ] Update Supabase Auth URL configuration with new Vercel domain
- [ ] Seed the new instance with community-specific configuration via Platform Admin

**Estimated time per new instance:** 2–3 hours the first time, under 1 hour once familiar with the process.

---

## Environment Variable Reference

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PROJECT_ID` | Yes | Supabase project ID |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public) |
| `PORT` | Yes | Set to `3000` for Vercel builds |
| `BASE_PATH` | Yes | Set to `/` |
| `NODE_ENV` | Yes | Set to `production` |
| `VITE_API_URL` | Yes | Railway API server URL |

### API Server (Railway)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Auto | Provided by Railway automatically |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (secret) |
| `NODE_ENV` | Yes | Set to `production` |
| `LOG_LEVEL` | No | Defaults to `info` |

### Local Development

| Variable | Required | Description |
|---|---|---|
| All of the above | Yes | See `.env.example` |
| `DATABASE_URL` | For migrations only | PostgreSQL connection string |

---

## Troubleshooting

**Build fails on Vercel with "PORT environment variable is required"**
Add `PORT=3000` to your Vercel environment variables.

**Build fails with "BASE_PATH environment variable is required"**
Add `BASE_PATH=/` to your Vercel environment variables.

**API server starts but pathway routes return 500 errors**
Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Railway. Look for the warning in Railway logs: `SUPABASE_SERVICE_ROLE_KEY is not set`.

**Login works but data does not load**
Confirm migrations have been run against this Supabase project. Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` match the project you migrated.

**Users can register but confirmation email does not arrive**
Check Supabase → Authentication → Email Templates and confirm the SMTP settings. Supabase's built-in email works for development; production use requires a custom SMTP provider.

**Frontend loads but shows blank pages after login**
Check browser console for errors. Most commonly caused by `VITE_SUPABASE_PROJECT_ID` or `VITE_SUPABASE_ANON_KEY` mismatch.
