-- =====================================================
-- Performance: Fix auth_rls_initplan warnings + duplicate indexes
--
-- 1. auth_rls_initplan — wrap auth.uid() / auth.jwt() in (select ...)
--    so PostgreSQL evaluates the function ONCE per query instead of
--    once per row.  Zero behaviour change; pure performance fix.
--
-- 2. duplicate_index — drop the redundant index on public.events.
--    idx_events_circle_ids and idx_events_circles are identical;
--    keeping idx_events_circle_ids (the earlier name).
--
-- NOTE: kv_store_* duplicate indexes are Supabase-managed internal
--       tables (Realtime presence). Do not touch them here.
-- =====================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DUPLICATE INDEX
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.idx_events_circles;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. auth_rls_initplan FIXES
--    Pattern: DROP the old policy, CREATE it with (select auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────


-- ── ticket_inventory_items ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_full_access_ticket_inventory" ON public.ticket_inventory_items;
CREATE POLICY "admin_full_access_ticket_inventory"
  ON public.ticket_inventory_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'super')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'super')
    )
  );

DROP POLICY IF EXISTS "user_read_own_ticket_inventory" ON public.ticket_inventory_items;
CREATE POLICY "user_read_own_ticket_inventory"
  ON public.ticket_inventory_items FOR SELECT
  USING (assigned_to_user_id = (SELECT auth.uid()));


-- ── member_states ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "member_states_admin_write" ON public.member_states;
CREATE POLICY "member_states_admin_write"
  ON public.member_states FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── funnel_configurations ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "funnel_config_read_authenticated" ON public.funnel_configurations;
CREATE POLICY "funnel_config_read_authenticated"
  ON public.funnel_configurations FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "funnel_config_write_admin" ON public.funnel_configurations;
CREATE POLICY "funnel_config_write_admin"
  ON public.funnel_configurations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── participants ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "participants_read_authenticated" ON public.participants;
CREATE POLICY "participants_read_authenticated"
  ON public.participants FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "participants_write_authenticated" ON public.participants;
CREATE POLICY "participants_write_authenticated"
  ON public.participants FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "participants_update_admin" ON public.participants;
CREATE POLICY "participants_update_admin"
  ON public.participants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── user_notification_preferences ────────────────────────────────────────────

DROP POLICY IF EXISTS "notification_prefs_own" ON public.user_notification_preferences;
CREATE POLICY "notification_prefs_own"
  ON public.user_notification_preferences FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── bookmarks ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own"
  ON public.bookmarks FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── offering_interest ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "offering_interest_own" ON public.offering_interest;
CREATE POLICY "offering_interest_own"
  ON public.offering_interest FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "offering_interest_admin_read" ON public.offering_interest;
CREATE POLICY "offering_interest_admin_read"
  ON public.offering_interest FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── prompt_uses ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "prompt_uses_own" ON public.prompt_uses;
CREATE POLICY "prompt_uses_own"
  ON public.prompt_uses FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── event_companions ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "event_companions_read_authenticated" ON public.event_companions;
CREATE POLICY "event_companions_read_authenticated"
  ON public.event_companions FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "event_companions_write_own" ON public.event_companions;
CREATE POLICY "event_companions_write_own"
  ON public.event_companions FOR ALL
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);


-- ── event_companion_items ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "event_companion_items_read_authenticated" ON public.event_companion_items;
CREATE POLICY "event_companion_items_read_authenticated"
  ON public.event_companion_items FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);


-- ── prompts ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "prompts_read_authenticated" ON public.prompts;
CREATE POLICY "prompts_read_authenticated"
  ON public.prompts FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "prompts_write_admin" ON public.prompts;
CREATE POLICY "prompts_write_admin"
  ON public.prompts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── program_prompts ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "program_prompts_read_authenticated" ON public.program_prompts;
CREATE POLICY "program_prompts_read_authenticated"
  ON public.program_prompts FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "program_prompts_write_admin" ON public.program_prompts;
CREATE POLICY "program_prompts_write_admin"
  ON public.program_prompts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── membership_tier_permissions ───────────────────────────────────────────────

DROP POLICY IF EXISTS "membership_tier_permissions_read_authenticated" ON public.membership_tier_permissions;
CREATE POLICY "membership_tier_permissions_read_authenticated"
  ON public.membership_tier_permissions FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "membership_tier_permissions_write_admin" ON public.membership_tier_permissions;
CREATE POLICY "membership_tier_permissions_write_admin"
  ON public.membership_tier_permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── product_mappings ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "product_mappings_read_authenticated" ON public.product_mappings;
CREATE POLICY "product_mappings_read_authenticated"
  ON public.product_mappings FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "product_mappings_write_admin" ON public.product_mappings;
CREATE POLICY "product_mappings_write_admin"
  ON public.product_mappings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── offering_marketing_templates ──────────────────────────────────────────────

DROP POLICY IF EXISTS "offering_marketing_templates_read_authenticated" ON public.offering_marketing_templates;
CREATE POLICY "offering_marketing_templates_read_authenticated"
  ON public.offering_marketing_templates FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "offering_marketing_templates_write_admin" ON public.offering_marketing_templates;
CREATE POLICY "offering_marketing_templates_write_admin"
  ON public.offering_marketing_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── pathways ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "pathways_read_admin" ON public.pathways;
CREATE POLICY "pathways_read_admin"
  ON public.pathways FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );

DROP POLICY IF EXISTS "pathways_write_admin" ON public.pathways;
CREATE POLICY "pathways_write_admin"
  ON public.pathways FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── pathway_steps ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "pathway_steps_read_authenticated" ON public.pathway_steps;
CREATE POLICY "pathway_steps_read_authenticated"
  ON public.pathway_steps FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "pathway_steps_write_admin" ON public.pathway_steps;
CREATE POLICY "pathway_steps_write_admin"
  ON public.pathway_steps FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── pathway_enrollments ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "pathway_enrollments_read_own" ON public.pathway_enrollments;
CREATE POLICY "pathway_enrollments_read_own"
  ON public.pathway_enrollments FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "pathway_enrollments_read_admin" ON public.pathway_enrollments;
CREATE POLICY "pathway_enrollments_read_admin"
  ON public.pathway_enrollments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );

DROP POLICY IF EXISTS "pathway_enrollments_insert_own" ON public.pathway_enrollments;
CREATE POLICY "pathway_enrollments_insert_own"
  ON public.pathway_enrollments FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "pathway_enrollments_update_admin" ON public.pathway_enrollments;
CREATE POLICY "pathway_enrollments_update_admin"
  ON public.pathway_enrollments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── users ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_read_authenticated" ON public.users;
CREATE POLICY "users_read_authenticated"
  ON public.users FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);


-- ── surveys ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "surveys_read_active" ON public.surveys;
CREATE POLICY "surveys_read_active"
  ON public.surveys FOR SELECT
  USING (status = 'active' AND (SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "surveys_read_admin" ON public.surveys;
CREATE POLICY "surveys_read_admin"
  ON public.surveys FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );

DROP POLICY IF EXISTS "surveys_write_admin" ON public.surveys;
CREATE POLICY "surveys_write_admin"
  ON public.surveys FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── survey_questions ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "survey_questions_read_authenticated" ON public.survey_questions;
CREATE POLICY "survey_questions_read_authenticated"
  ON public.survey_questions FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "survey_questions_write_admin" ON public.survey_questions;
CREATE POLICY "survey_questions_write_admin"
  ON public.survey_questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── survey_conclusions ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "survey_conclusions_read_authenticated" ON public.survey_conclusions;
CREATE POLICY "survey_conclusions_read_authenticated"
  ON public.survey_conclusions FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "survey_conclusions_write_admin" ON public.survey_conclusions;
CREATE POLICY "survey_conclusions_write_admin"
  ON public.survey_conclusions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );


-- ── survey_responses ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "survey_responses_read_own" ON public.survey_responses;
CREATE POLICY "survey_responses_read_own"
  ON public.survey_responses FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "survey_responses_read_admin" ON public.survey_responses;
CREATE POLICY "survey_responses_read_admin"
  ON public.survey_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super'))
  );

DROP POLICY IF EXISTS "survey_responses_insert_own" ON public.survey_responses;
CREATE POLICY "survey_responses_insert_own"
  ON public.survey_responses FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
