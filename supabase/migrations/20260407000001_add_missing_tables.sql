-- =====================================================
-- Missing tables migration for Connexted platform
-- Apply via Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. member_states: defines valid participant states
CREATE TABLE IF NOT EXISTS public.member_states (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('access', 'engagement', 'exit')),
  description text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT '#6B7280',
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0
);

ALTER TABLE public.member_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_states_read_all" ON public.member_states
  FOR SELECT USING (true);
CREATE POLICY "member_states_admin_write" ON public.member_states
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

INSERT INTO public.member_states (id, name, category, description, color, icon, sort_order) VALUES
  ('invited',       'Invited',       'access',     'User has been invited',           '#8B5CF6', 'Mail',       1),
  ('applied',       'Applied',       'access',     'User has applied',                '#3B82F6', 'FileText',   2),
  ('waitlisted',    'Waitlisted',    'access',     'On waitlist pending availability', '#F59E0B', 'Clock',      3),
  ('approved',      'Approved',      'access',     'Application approved',            '#10B981', 'CheckCircle',4),
  ('rejected',      'Rejected',      'access',     'Application rejected',            '#EF4444', 'XCircle',    5),
  ('enrolled',      'Enrolled',      'engagement', 'Active participant',              '#059669', 'UserCheck',  6),
  ('new_member',    'New Member',    'engagement', 'Recently joined',                '#6366F1', 'UserPlus',   7),
  ('active',        'Active',        'engagement', 'Regularly participating',         '#10B981', 'Activity',   8),
  ('engaged',       'Engaged',       'engagement', 'Highly engaged participant',      '#8B5CF6', 'Star',       9),
  ('at_risk',       'At Risk',       'engagement', 'Low engagement, needs attention', '#F97316', 'AlertTriangle', 10),
  ('inactive',      'Inactive',      'engagement', 'Has not participated recently',   '#6B7280', 'UserX',      11),
  ('completed',     'Completed',     'exit',       'Successfully completed',          '#6366F1', 'Award',      12),
  ('not_completed', 'Not Completed', 'exit',       'Did not complete',                '#EF4444', 'XCircle',    13)
ON CONFLICT (id) DO NOTHING;

-- 2. funnel_configurations: per-program or per-circle funnel settings
CREATE TABLE IF NOT EXISTS public.funnel_configurations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id     uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  circle_id      uuid REFERENCES public.circles(id) ON DELETE CASCADE,
  enabled_states text[] NOT NULL DEFAULT ARRAY['invited','applied','approved','enrolled','active','completed'],
  auto_suggestions jsonb DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funnel_configurations_one_container CHECK (
    (program_id IS NULL) <> (circle_id IS NULL)
  )
);

ALTER TABLE public.funnel_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_config_read_authenticated" ON public.funnel_configurations
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "funnel_config_write_admin" ON public.funnel_configurations
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. participants: tracks member state lifecycle in programs/circles
CREATE TABLE IF NOT EXISTS public.participants (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id             uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  circle_id              uuid REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_state          text NOT NULL REFERENCES public.member_states(id) DEFAULT 'enrolled',
  previous_state         text REFERENCES public.member_states(id),
  state_changed_at       timestamptz NOT NULL DEFAULT now(),
  state_changed_by       uuid REFERENCES public.users(id),
  state_change_reason    text,
  state_change_auto      boolean NOT NULL DEFAULT false,
  state_history          jsonb NOT NULL DEFAULT '[]',
  total_sessions_expected  integer NOT NULL DEFAULT 0,
  total_sessions_attended  integer NOT NULL DEFAULT 0,
  attendance_rate          numeric(5,2) NOT NULL DEFAULT 0,
  consecutive_absences     integer NOT NULL DEFAULT 0,
  last_session_attended_at timestamptz,
  last_activity_at         timestamptz NOT NULL DEFAULT now(),
  application_data         jsonb,
  invite_data              jsonb,
  admin_notes              text,
  tags                     text[],
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participants_one_container CHECK (
    (program_id IS NULL) <> (circle_id IS NULL)
  ),
  UNIQUE NULLS NOT DISTINCT (program_id, user_id),
  UNIQUE NULLS NOT DISTINCT (circle_id,  user_id)
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_read_authenticated" ON public.participants
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "participants_write_authenticated" ON public.participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "participants_update_admin" ON public.participants
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. user_notification_preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel          text NOT NULL DEFAULT 'in_app',
  enabled          boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, channel)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_prefs_own" ON public.user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- 5. Add duration_minutes column to sessions (if missing)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- 6. Unique index on access_tickets for ON CONFLICT support
CREATE UNIQUE INDEX IF NOT EXISTS access_tickets_user_container_unique
  ON public.access_tickets (user_id, container_id, container_type);

-- 7. change_participant_state RPC function
CREATE OR REPLACE FUNCTION public.change_participant_state(
  p_participant_id uuid,
  p_new_state      text,
  p_changed_by     uuid,
  p_reason         text,
  p_auto           boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_state text;
  v_history   jsonb;
BEGIN
  SELECT current_state, state_history
    INTO v_old_state, v_history
    FROM public.participants
   WHERE id = p_participant_id;

  v_history := COALESCE(v_history, '[]'::jsonb) || jsonb_build_object(
    'from_state',  v_old_state,
    'to_state',    p_new_state,
    'changed_at',  now(),
    'changed_by',  p_changed_by,
    'reason',      p_reason,
    'auto',        p_auto
  );

  UPDATE public.participants SET
    previous_state       = current_state,
    current_state        = p_new_state,
    state_changed_at     = now(),
    state_changed_by     = p_changed_by,
    state_change_reason  = p_reason,
    state_change_auto    = p_auto,
    state_history        = v_history,
    updated_at           = now()
  WHERE id = p_participant_id;
END;
$$;

-- 8. get_state_suggestions RPC function
CREATE OR REPLACE FUNCTION public.get_state_suggestions(
  p_program_id uuid DEFAULT NULL,
  p_circle_id  uuid DEFAULT NULL
) RETURNS TABLE (
  participant_id uuid,
  user_id        uuid,
  current_state  text,
  suggested_state text,
  reason         text,
  severity       text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id               AS participant_id,
    p.user_id,
    p.current_state,
    CASE
      WHEN p.consecutive_absences >= 3 AND p.current_state NOT IN ('inactive', 'completed', 'not_completed')
        THEN 'inactive'
      WHEN p.attendance_rate < 50 AND p.current_state = 'active'
        THEN 'at_risk'
      WHEN p.attendance_rate >= 80 AND p.current_state IN ('new_member', 'enrolled')
        THEN 'active'
      ELSE NULL
    END                AS suggested_state,
    CASE
      WHEN p.consecutive_absences >= 3 THEN 'Missed ' || p.consecutive_absences || ' consecutive sessions'
      WHEN p.attendance_rate < 50       THEN 'Attendance rate below 50%'
      WHEN p.attendance_rate >= 80      THEN 'Excellent engagement — ready to mark active'
      ELSE NULL
    END                AS reason,
    CASE
      WHEN p.consecutive_absences >= 3 THEN 'high'
      WHEN p.attendance_rate < 50       THEN 'medium'
      ELSE 'low'
    END                AS severity
  FROM public.participants p
  WHERE
    (p_program_id IS NULL OR p.program_id = p_program_id)
    AND (p_circle_id IS NULL OR p.circle_id = p_circle_id)
    AND (
      (p.consecutive_absences >= 3 AND p.current_state NOT IN ('inactive', 'completed', 'not_completed'))
      OR (p.attendance_rate < 50 AND p.current_state = 'active')
      OR (p.attendance_rate >= 80 AND p.current_state IN ('new_member', 'enrolled'))
    );
$$;

-- 9. program_state_summary view
CREATE OR REPLACE VIEW public.program_state_summary AS
  SELECT
    p.program_id,
    p.current_state AS state,
    ms.name         AS state_name,
    ms.color        AS state_color,
    ms.category     AS state_category,
    ms.sort_order,
    count(*)::int   AS count
  FROM public.participants p
  JOIN public.member_states ms ON ms.id = p.current_state
  WHERE p.program_id IS NOT NULL
  GROUP BY p.program_id, p.current_state, ms.name, ms.color, ms.category, ms.sort_order;

-- 10. circle_state_summary view
CREATE OR REPLACE VIEW public.circle_state_summary AS
  SELECT
    p.circle_id,
    p.current_state AS state,
    ms.name         AS state_name,
    ms.color        AS state_color,
    ms.category     AS state_category,
    ms.sort_order,
    count(*)::int   AS count
  FROM public.participants p
  JOIN public.member_states ms ON ms.id = p.current_state
  WHERE p.circle_id IS NOT NULL
  GROUP BY p.circle_id, p.current_state, ms.name, ms.color, ms.category, ms.sort_order;
