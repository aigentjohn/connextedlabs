-- Sessions: Pre-Event Structure
-- Makes start_date optional, adds proposed status, expands session types,
-- adds pathway context and timezone default.
-- Run in Supabase SQL Editor.

-- 1. Make start_date optional (enables proposed/TBD sessions)
ALTER TABLE sessions ALTER COLUMN start_date DROP NOT NULL;

-- 2. Make duration_minutes optional
ALTER TABLE sessions ALTER COLUMN duration_minutes DROP NOT NULL;

-- 3. Add proposed to status (drop old constraint, recreate with proposed)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('proposed', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- 4. Expand session_type vocabulary (drop old constraint, recreate expanded)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_session_type_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_session_type_check
  CHECK (session_type IN (
    'meeting', 'workshop', 'webinar', 'training',
    'social', 'standup', 'class', 'other'
  ));

-- 5. Add pathway context
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pathway_id uuid REFERENCES pathways(id);

-- 6. Add timezone with EST default
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York';

-- 7. Make program_id fully optional (sessions can belong to circle or pathway without a program)
ALTER TABLE sessions ALTER COLUMN program_id DROP NOT NULL;
