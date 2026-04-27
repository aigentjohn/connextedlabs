-- pathway_step_completions
-- Persists per-step completion records for activity steps in pathways.
-- Course and program step completion is auto-detected from existing tables
-- (course_enrollments, program_members), so those types are not stored here.
--
-- status:
--   'pending'  — user submitted self-report; awaiting admin review
--   'approved' — step counts toward progress (either self_report or admin-approved)
--   'rejected' — admin rejected the submission; step does not count

CREATE TABLE public.pathway_step_completions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id    UUID        NOT NULL REFERENCES public.pathways(id) ON DELETE CASCADE,
  step_id       UUID        NOT NULL REFERENCES public.pathway_steps(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'approved'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_note TEXT,
  reviewed_by   UUID        REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pathway_id, step_id, user_id)
);

ALTER TABLE public.pathway_step_completions ENABLE ROW LEVEL SECURITY;

-- Users may read their own completions
CREATE POLICY "step_completions_select_own"
  ON public.pathway_step_completions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Users may submit their own completions
CREATE POLICY "step_completions_insert_own"
  ON public.pathway_step_completions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Admins may read all completions (for verification dashboard)
CREATE POLICY "step_completions_select_admin"
  ON public.pathway_step_completions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super')
    )
  );

-- Admins may verify (approve/reject) completions
CREATE POLICY "step_completions_update_admin"
  ON public.pathway_step_completions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super')
    )
  );

-- Users may update their own pending submissions (to re-submit evidence)
CREATE POLICY "step_completions_update_own_pending"
  ON public.pathway_step_completions
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id AND status = 'pending'
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND status = 'pending'
  );
