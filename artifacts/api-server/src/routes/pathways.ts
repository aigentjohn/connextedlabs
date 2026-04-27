import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  id: string;
  order_index: number | null;
}

interface PathwayRow {
  id: string;
  pathway_steps: Step[];
}

interface EnrollmentRow {
  id: string;
  progress_pct: number | null;
  pathways: (PathwayRow & Record<string, unknown>) | null;
}

interface StepInput {
  step_type?: string;
  step_id?: string | null;
  title: string;
  description?: string | null;
  is_required?: boolean;
  allow_skip?: boolean;
  activity_type?: string;
  verification_method?: string;
  activity_instance_id?: string | null;
  activity_criteria?: string | null;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const StepSchema = z.object({
  step_type: z.string().optional(),
  step_id: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  is_required: z.boolean().optional(),
  allow_skip: z.boolean().optional(),
  activity_type: z.string().optional(),
  verification_method: z.string().optional(),
  activity_instance_id: z.string().nullable().optional(),
  activity_criteria: z.string().nullable().optional(),
});

const CreatePathwaySchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  is_published: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  steps: z.array(StepSchema).optional(),
}).passthrough();

const UpdatePathwaySchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  is_published: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  steps: z.array(StepSchema).optional(),
}).passthrough();

const SkipStepSchema = z.object({
  step_id: z.string().uuid(),
});

const AdminCompleteSchema = z.object({
  user_id: z.string().uuid(),
  step_id: z.string().uuid(),
});

const SelfReportSchema = z.object({
  step_id: z.string().uuid(),
  evidence_note: z.string().optional(),
});

const VerifyReportSchema = z.object({
  step_id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortSteps(steps: Step[]): Step[] {
  return [...steps].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

async function recalculateProgress(pathwayId: string, userId: string): Promise<void> {
  const [{ count: approvedCount }, { count: totalSteps }] = await Promise.all([
    supabaseAdmin
      .from('pathway_step_completions')
      .select('id', { count: 'exact', head: true })
      .eq('pathway_id', pathwayId)
      .eq('user_id', userId)
      .eq('status', 'approved'),
    supabaseAdmin
      .from('pathway_steps')
      .select('id', { count: 'exact', head: true })
      .eq('pathway_id', pathwayId),
  ]);

  const total = totalSteps ?? 1;
  const done = approvedCount ?? 0;
  const newPct = Math.min(100, Math.round((done / total) * 100));
  const isComplete = done >= total;

  await supabaseAdmin
    .from('pathway_enrollments')
    .update({
      progress_pct: newPct,
      status: isComplete ? 'completed' : 'active',
      ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('pathway_id', pathwayId)
    .eq('user_id', userId);
}

function buildStepRows(steps: StepInput[], pathwayId: string) {
  return steps.map((s, i) => ({
    pathway_id: pathwayId,
    order_index: i,
    step_type: s.step_type ?? 'activity',
    step_id: s.step_id ?? null,
    title: s.title,
    description: s.description ?? null,
    is_required: s.is_required !== false,
    allow_skip: s.allow_skip ?? false,
    activity_type: s.activity_type ?? 'custom',
    verification_method: s.verification_method ?? 'self_report',
    activity_instance_id: s.activity_instance_id ?? null,
    activity_criteria: s.activity_criteria ?? null,
  }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/pathways', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;
    const isAdmin = authReq.isAdmin === true;

    // Platform admins see all pathways; others see only what they created.
    const query = supabaseAdmin
      .from('pathways')
      .select('*, pathway_steps(*)')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query.eq('created_by', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const pathways = (data as PathwayRow[] ?? []).map((p) => ({
      ...p,
      steps: sortSteps(p.pathway_steps ?? []),
    }));

    res.json({ pathways });
  } catch (err) {
    logger.error({ err }, 'GET /pathways failed');
    res.status(500).json({ error: 'Failed to load pathways' });
  }
});

router.get('/pathways/user/enrollments', requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;

    const { data, error } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('*, pathways(*, pathway_steps(*))')
      .eq('user_id', userId);
    if (error) throw error;

    const enrollments = (data as EnrollmentRow[] ?? []).map((e) => {
      const pathway = e.pathways
        ? { ...e.pathways, steps: sortSteps(e.pathways.pathway_steps ?? []) }
        : null;
      return { enrollment: e, pathway };
    });

    res.json({ enrollments });
  } catch (err) {
    logger.error({ err }, 'GET /pathways/user/enrollments failed');
    res.status(500).json({ error: 'Failed to load enrollments' });
  }
});

router.get('/pathways/user/recommended', requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;

    const { data, error } = await supabaseAdmin
      .from('pathways')
      .select('*, pathway_steps(*)')
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;

    let recommendations = (data as PathwayRow[] ?? []).map((p) => ({
      ...p,
      steps: sortSteps(p.pathway_steps ?? []),
    }));

    const { data: enrolled } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('pathway_id')
      .eq('user_id', userId);
    const enrolledIds = new Set((enrolled ?? []).map((e: { pathway_id: string }) => e.pathway_id));
    recommendations = recommendations.filter((p) => !enrolledIds.has(p.id));

    res.json({ recommendations });
  } catch (err) {
    logger.error({ err }, 'GET /pathways/user/recommended failed');
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
});

router.get('/pathways/user/:userId/enrollments', requireAuth, async (req, res) => {
  try {
    // Callers may only view their own enrollments
    const userId = (req as AuthRequest).userId;

    const { data, error } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('*, pathways(*, pathway_steps(*))')
      .eq('user_id', userId);
    if (error) throw error;

    const enrollments = (data as EnrollmentRow[] ?? []).map((e) => {
      const pathway = e.pathways
        ? { ...e.pathways, steps: sortSteps(e.pathways.pathway_steps ?? []) }
        : null;
      return { enrollment: e, pathway };
    });

    res.json({ enrollments });
  } catch (err) {
    logger.error({ err }, 'GET /pathways/user/:userId/enrollments failed');
    res.status(500).json({ error: 'Failed to load enrollments' });
  }
});

router.get('/pathways/admin/progress', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('*, pathways(*, pathway_steps(*)), users(id, name, avatar, email)');
    if (enrollError) throw enrollError;

    const formatted = (enrollments as (EnrollmentRow & { users: Record<string, unknown> | null })[] ?? []).map((e) => {
      const pathway = e.pathways
        ? { ...e.pathways, steps: sortSteps(e.pathways.pathway_steps ?? []) }
        : null;
      return {
        enrollment: e,
        pathway,
        user: e.users ?? { name: 'Unknown', email: '' },
        reports: [],
      };
    });

    res.json({ enrollments: formatted, pending_reports: [] });
  } catch (err) {
    logger.error({ err }, 'GET /pathways/admin/progress failed');
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

router.get('/pathways/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pathways')
      .select('*, pathway_steps(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;

    res.json({
      ...data,
      steps: sortSteps((data as PathwayRow).pathway_steps ?? []),
    });
  } catch (err) {
    logger.error({ err }, 'GET /pathways/:id failed');
    res.status(500).json({ error: 'Failed to load pathway' });
  }
});

router.post('/pathways', requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const parsed = CreatePathwaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { steps, ...pathwayData } = parsed.data as { steps?: StepInput[] } & Record<string, unknown>;

    const name = String(pathwayData.name ?? '');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const payload = {
      ...pathwayData,
      title: pathwayData.title ?? name,
      name,
      slug,
    };

    const { data, error } = await supabaseAdmin
      .from('pathways')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;

    if (steps && steps.length > 0) {
      const { error: stepError } = await supabaseAdmin
        .from('pathway_steps')
        .insert(buildStepRows(steps, (data as { id: string }).id));
      if (stepError) throw stepError;
    }

    res.json({ success: true, id: (data as { id: string }).id });
  } catch (err) {
    logger.error({ err }, 'POST /pathways failed');
    res.status(500).json({ error: 'Failed to create pathway' });
  }
});

router.put('/pathways/:id', requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const pathwayId = String(req.params.id);
    const parsed = UpdatePathwaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { steps, ...pathwayData } = parsed.data as { steps?: StepInput[] } & Record<string, unknown>;

    if (pathwayData.name) {
      pathwayData.title = pathwayData.title ?? pathwayData.name;
    }

    const { error } = await supabaseAdmin
      .from('pathways')
      .update(pathwayData)
      .eq('id', pathwayId);
    if (error) throw error;

    if (steps) {
      await supabaseAdmin.from('pathway_steps').delete().eq('pathway_id', pathwayId);

      if (steps.length > 0) {
        const { error: stepError } = await supabaseAdmin
          .from('pathway_steps')
          .insert(buildStepRows(steps, pathwayId));
        if (stepError) throw stepError;
      }
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'PUT /pathways/:id failed');
    res.status(500).json({ error: 'Failed to update pathway' });
  }
});

router.delete('/pathways/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pathwayId = req.params.id;
    await supabaseAdmin.from('pathway_steps').delete().eq('pathway_id', pathwayId);
    const { error } = await supabaseAdmin
      .from('pathways')
      .delete()
      .eq('id', pathwayId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'DELETE /pathways/:id failed');
    res.status(500).json({ error: 'Failed to delete pathway' });
  }
});

router.post('/pathways/:id/enroll', requireAuth, async (req, res): Promise<void> => {
  try {
    const pathwayId = req.params.id;
    const userId = (req as AuthRequest).userId;

    const { data: existing } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('id')
      .eq('pathway_id', pathwayId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, enrollment_id: (existing as { id: string }).id, message: 'Already enrolled' });
    }

    const { data, error } = await supabaseAdmin
      .from('pathway_enrollments')
      .insert({ pathway_id: pathwayId, user_id: userId })
      .select('id')
      .single();
    if (error) throw error;

    res.json({ success: true, enrollment_id: (data as { id: string }).id });
  } catch (err) {
    logger.error({ err }, 'POST /pathways/:id/enroll failed');
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

router.post('/pathways/:id/skip-step', requireAuth, async (req, res): Promise<void> => {
  try {
    const pathwayId = req.params.id;
    const userId = (req as AuthRequest).userId;
    const parsed = SkipStepSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { step_id } = parsed.data;

    const { data: pathway } = await supabaseAdmin
      .from('pathways')
      .select('pathway_steps(id)')
      .eq('id', pathwayId)
      .single();

    const totalSteps = (pathway as PathwayRow | null)?.pathway_steps?.length ?? 1;

    const { data: enrollment } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('progress_pct')
      .eq('pathway_id', pathwayId)
      .eq('user_id', userId)
      .single();

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const currentPct = (enrollment as { progress_pct: number | null }).progress_pct ?? 0;
    const stepPct = Math.round(100 / totalSteps);
    const newPct = Math.min(100, currentPct + stepPct);
    const isComplete = newPct >= 100;

    const { error } = await supabaseAdmin
      .from('pathway_enrollments')
      .update({
        progress_pct: newPct,
        status: isComplete ? 'completed' : 'active',
        ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('pathway_id', pathwayId)
      .eq('user_id', userId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'POST /pathways/:id/skip-step failed');
    res.status(500).json({ error: 'Failed to skip step' });
  }
});

router.post('/pathways/:id/admin-complete', requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const pathwayId = req.params.id;
    const parsed = AdminCompleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { user_id: targetUserId, step_id } = parsed.data;

    const { data: pathway } = await supabaseAdmin
      .from('pathways')
      .select('pathway_steps(id)')
      .eq('id', pathwayId)
      .single();

    const totalSteps = (pathway as PathwayRow | null)?.pathway_steps?.length ?? 1;

    const { data: enrollment } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('progress_pct')
      .eq('pathway_id', pathwayId)
      .eq('user_id', targetUserId)
      .single();

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const currentPct = (enrollment as { progress_pct: number | null }).progress_pct ?? 0;
    const stepPct = Math.round(100 / totalSteps);
    const newPct = Math.min(100, currentPct + stepPct);
    const isComplete = newPct >= 100;

    const { error } = await supabaseAdmin
      .from('pathway_enrollments')
      .update({
        progress_pct: newPct,
        status: isComplete ? 'completed' : 'active',
        ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('pathway_id', pathwayId)
      .eq('user_id', targetUserId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'POST /pathways/:id/admin-complete failed');
    res.status(500).json({ error: 'Failed to complete step' });
  }
});

router.post('/pathways/:id/self-report', requireAuth, async (req, res): Promise<void> => {
  try {
    const pathwayId = String(req.params.id);
    const userId = (req as AuthRequest).userId;

    const parsed = SelfReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { step_id, evidence_note } = parsed.data;

    // Verify the step belongs to this pathway
    const { data: step, error: stepError } = await supabaseAdmin
      .from('pathway_steps')
      .select('id, verification_method')
      .eq('id', step_id)
      .eq('pathway_id', pathwayId)
      .single();

    if (stepError || !step) {
      return res.status(404).json({ error: 'Step not found in this pathway' });
    }

    // Verify the user is enrolled
    const { data: enrollment } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('id')
      .eq('pathway_id', pathwayId)
      .eq('user_id', userId)
      .single();

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this pathway' });
    }

    const status = (step as { verification_method: string | null }).verification_method === 'admin_verify'
      ? 'pending'
      : 'approved';

    const { error: upsertError } = await supabaseAdmin
      .from('pathway_step_completions')
      .upsert(
        { pathway_id: pathwayId, step_id, user_id: userId, status, evidence_note: evidence_note ?? null },
        { onConflict: 'pathway_id,step_id,user_id' },
      );
    if (upsertError) throw upsertError;

    if (status === 'approved') {
      await recalculateProgress(pathwayId, userId);
    }

    res.json({ success: true, status });
  } catch (err) {
    logger.error({ err }, 'POST /pathways/:id/self-report failed');
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

router.post('/pathways/:id/verify-report', requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const pathwayId = String(req.params.id);
    const adminId = (req as AuthRequest).userId;

    const parsed = VerifyReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { step_id, user_id: targetUserId, action } = parsed.data;

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabaseAdmin
      .from('pathway_step_completions')
      .update({ status: newStatus, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('pathway_id', pathwayId)
      .eq('step_id', step_id)
      .eq('user_id', targetUserId);
    if (error) throw error;

    if (action === 'approve') {
      await recalculateProgress(pathwayId, targetUserId);
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    logger.error({ err }, 'POST /pathways/:id/verify-report failed');
    res.status(500).json({ error: 'Failed to verify report' });
  }
});

export default router;
