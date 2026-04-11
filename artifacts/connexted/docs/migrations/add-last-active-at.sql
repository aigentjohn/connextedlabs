-- Add last_active_at to users table
-- Powers the Active Members page (/members/active)
-- Written by auth-context.tsx on every session change

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Index for fast ordering and range queries used by ActiveMembersPage
CREATE INDEX IF NOT EXISTS users_last_active_at_idx
  ON public.users (last_active_at DESC NULLS LAST);

-- Backfill: set last_active_at to created_at for existing users so they
-- appear in the Active Members list until they next log in
UPDATE public.users
  SET last_active_at = created_at
  WHERE last_active_at IS NULL;
