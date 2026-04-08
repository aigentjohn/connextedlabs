-- =====================================================
-- Fix SECURITY DEFINER views flagged by Supabase Security Advisor
--
-- Views created by Figma Make were automatically given the SECURITY DEFINER
-- property, which means they run with the permissions of whoever created
-- them rather than the querying user. This bypasses RLS policies.
--
-- PostgreSQL 15+ allows changing this without dropping and recreating views.
-- SECURITY INVOKER (the default) makes the view respect the caller's RLS.
-- =====================================================

ALTER VIEW public.course_enrollment_summary  SET (security_invoker = true);
ALTER VIEW public.course_creator_summary     SET (security_invoker = true);
ALTER VIEW public.build_fork_stats           SET (security_invoker = true);
ALTER VIEW public.application_stats_by_program SET (security_invoker = true);
ALTER VIEW public.program_enrollment_summary SET (security_invoker = true);
ALTER VIEW public.enrollment_analytics       SET (security_invoker = true);
ALTER VIEW public.profiles                   SET (security_invoker = true);
ALTER VIEW public.session_overview           SET (security_invoker = true);
ALTER VIEW public.offering_interest_analytics SET (security_invoker = true);
ALTER VIEW public.course_roadmap             SET (security_invoker = true);
