ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON public.users (deleted_at)
  WHERE deleted_at IS NULL;
