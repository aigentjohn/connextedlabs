-- =====================================================
-- RLS policies for Pathways tables
-- Apply via Supabase Dashboard > SQL Editor
-- =====================================================

-- ─── pathways ──────────────────────────────────────────────────────────────────
-- Members see published pathways only.
-- Admins see all pathways (draft + published).
-- Only admins can create/update/delete.
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pathways_read_published"
  ON public.pathways
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "pathways_read_admin"
  ON public.pathways
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

CREATE POLICY "pathways_write_admin"
  ON public.pathways
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );


-- ─── pathway_steps ─────────────────────────────────────────────────────────────
-- All authenticated users can read steps (needed to render pathway cards/details).
-- Only admins can write.
ALTER TABLE public.pathway_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pathway_steps_read_authenticated"
  ON public.pathway_steps
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "pathway_steps_write_admin"
  ON public.pathway_steps
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );


-- ─── pathway_enrollments ───────────────────────────────────────────────────────
-- Users can see and create their own enrollments.
-- Admins can see all enrollments and update them (progress tracking).
ALTER TABLE public.pathway_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pathway_enrollments_read_own"
  ON public.pathway_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "pathway_enrollments_read_admin"
  ON public.pathway_enrollments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

CREATE POLICY "pathway_enrollments_insert_own"
  ON public.pathway_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pathway_enrollments_update_admin"
  ON public.pathway_enrollments
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );
