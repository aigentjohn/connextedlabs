import { Router, type IRouter } from 'express';
import { supabaseAdmin } from '../lib/supabase';

const router: IRouter = Router();

router.get('/pathways', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pathways')
      .select('*, pathway_steps(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const pathways = (data || []).map((p: any) => ({
      ...p,
      steps: (p.pathway_steps || []).sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      ),
    }));

    res.json({ pathways });
  } catch (err: any) {
    console.error('GET /pathways error:', err);
    res.status(500).json({ error: err.message || 'Failed to load pathways' });
  }
});

router.get('/pathways/user/enrollments', async (req, res) => {
  try {
    const userId = req.query.user_id as string;
    if (!userId) return res.status(400).json({ error: 'user_id query param is required' });

    const { data, error } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('*, pathways(*, pathway_steps(*))')
      .eq('user_id', userId);
    if (error) throw error;

    const enrollments = (data || []).map((e: any) => {
      const pathway = e.pathways ? {
        ...e.pathways,
        steps: (e.pathways.pathway_steps || []).sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      } : null;
      return { enrollment: e, pathway };
    });

    res.json({ enrollments });
  } catch (err: any) {
    console.error('GET /pathways/user/enrollments error:', err);
    res.status(500).json({ error: err.message || 'Failed to load enrollments' });
  }
});

router.get('/pathways/user/recommended', async (req, res) => {
  try {
    const userId = req.query.user_id as string;

    const { data, error } = await supabaseAdmin
      .from('pathways')
      .select('*, pathway_steps(*)')
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;

    let recommendations = (data || []).map((p: any) => ({
      ...p,
      steps: (p.pathway_steps || []).sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      ),
    }));

    if (userId) {
      const { data: enrolled } = await supabaseAdmin
        .from('pathway_enrollments')
        .select('pathway_id')
        .eq('user_id', userId);
      const enrolledIds = new Set((enrolled || []).map((e: any) => e.pathway_id));
      recommendations = recommendations.filter((p: any) => !enrolledIds.has(p.id));
    }

    res.json({ recommendations });
  } catch (err: any) {
    console.error('GET /pathways/user/recommended error:', err);
    res.status(500).json({ error: err.message || 'Failed to load recommendations' });
  }
});

router.get('/pathways/user/:userId/enrollments', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('*, pathways(*, pathway_steps(*))')
      .eq('user_id', req.params.userId);
    if (error) throw error;

    const enrollments = (data || []).map((e: any) => {
      const pathway = e.pathways ? {
        ...e.pathways,
        steps: (e.pathways.pathway_steps || []).sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      } : null;
      return { enrollment: e, pathway };
    });

    res.json({ enrollments });
  } catch (err: any) {
    console.error('GET /pathways/user/:userId/enrollments error:', err);
    res.status(500).json({ error: err.message || 'Failed to load enrollments' });
  }
});

router.get('/pathways/admin/progress', async (_req, res) => {
  try {
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('*, pathways(*, pathway_steps(*)), users(id, name, avatar, email)');
    if (enrollError) throw enrollError;

    const formatted = (enrollments || []).map((e: any) => {
      const pathway = e.pathways ? {
        ...e.pathways,
        steps: (e.pathways.pathway_steps || []).sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      } : null;
      return {
        enrollment: e,
        pathway,
        user: e.users || { name: 'Unknown', email: '' },
        reports: [],
      };
    });

    res.json({
      enrollments: formatted,
      pending_reports: [],
    });
  } catch (err: any) {
    console.error('GET /pathways/admin/progress error:', err);
    res.status(500).json({ error: err.message || 'Failed to load progress' });
  }
});

router.get('/pathways/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pathways')
      .select('*, pathway_steps(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;

    res.json({
      ...data,
      steps: (data.pathway_steps || []).sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      ),
    });
  } catch (err: any) {
    console.error('GET /pathways/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to load pathway' });
  }
});

router.post('/pathways', async (req, res) => {
  try {
    const { steps, ...pathwayData } = req.body;

    const slug = (pathwayData.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const payload = {
      ...pathwayData,
      title: pathwayData.title || pathwayData.name,
      name: pathwayData.name,
      slug,
    };

    const { data, error } = await supabaseAdmin
      .from('pathways')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;

    if (steps?.length > 0) {
      const stepRows = steps.map((s: any, i: number) => ({
        pathway_id: data.id,
        order_index: i,
        step_type: s.step_type || 'activity',
        step_id: s.step_id || null,
        title: s.title,
        description: s.description || null,
        is_required: s.is_required !== false,
        allow_skip: s.allow_skip || false,
        activity_type: s.activity_type || 'custom',
        verification_method: s.verification_method || 'self_report',
        activity_instance_id: s.activity_instance_id || null,
        activity_criteria: s.activity_criteria || null,
      }));

      const { error: stepError } = await supabaseAdmin
        .from('pathway_steps')
        .insert(stepRows);
      if (stepError) throw stepError;
    }

    res.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('POST /pathways error:', err);
    res.status(500).json({ error: err.message || 'Failed to create pathway' });
  }
});

router.put('/pathways/:id', async (req, res) => {
  try {
    const pathwayId = req.params.id;
    const { steps, ...pathwayData } = req.body;

    if (pathwayData.name) {
      pathwayData.title = pathwayData.title || pathwayData.name;
    }

    const { error } = await supabaseAdmin
      .from('pathways')
      .update(pathwayData)
      .eq('id', pathwayId);
    if (error) throw error;

    if (steps) {
      await supabaseAdmin.from('pathway_steps').delete().eq('pathway_id', pathwayId);

      if (steps.length > 0) {
        const stepRows = steps.map((s: any, i: number) => ({
          pathway_id: pathwayId,
          order_index: i,
          step_type: s.step_type || 'activity',
          step_id: s.step_id || null,
          title: s.title,
          description: s.description || null,
          is_required: s.is_required !== false,
          allow_skip: s.allow_skip || false,
          activity_type: s.activity_type || 'custom',
          verification_method: s.verification_method || 'self_report',
          activity_instance_id: s.activity_instance_id || null,
          activity_criteria: s.activity_criteria || null,
        }));

        const { error: stepError } = await supabaseAdmin
          .from('pathway_steps')
          .insert(stepRows);
        if (stepError) throw stepError;
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('PUT /pathways/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update pathway' });
  }
});

router.delete('/pathways/:id', async (req, res) => {
  try {
    const pathwayId = req.params.id;
    await supabaseAdmin.from('pathway_steps').delete().eq('pathway_id', pathwayId);
    const { error } = await supabaseAdmin
      .from('pathways')
      .delete()
      .eq('id', pathwayId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /pathways/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete pathway' });
  }
});

router.post('/pathways/:id/enroll', async (req, res) => {
  try {
    const pathwayId = req.params.id;
    const userId = req.body.user_id;

    if (!userId) return res.status(400).json({ error: 'user_id is required' });

    const { data: existing } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('id')
      .eq('pathway_id', pathwayId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, enrollment_id: existing.id, message: 'Already enrolled' });
    }

    const { data, error } = await supabaseAdmin
      .from('pathway_enrollments')
      .insert({
        pathway_id: pathwayId,
        user_id: userId,
      })
      .select('id')
      .single();
    if (error) throw error;

    res.json({ success: true, enrollment_id: data.id });
  } catch (err: any) {
    console.error('POST /pathways/:id/enroll error:', err);
    res.status(500).json({ error: err.message || 'Failed to enroll' });
  }
});

router.post('/pathways/:id/skip-step', async (req, res) => {
  try {
    const pathwayId = req.params.id;
    const { user_id, step_id } = req.body;

    if (!user_id || !step_id) {
      return res.status(400).json({ error: 'user_id and step_id are required' });
    }

    const { data: pathway } = await supabaseAdmin
      .from('pathways')
      .select('pathway_steps(id)')
      .eq('id', pathwayId)
      .single();

    const totalSteps = pathway?.pathway_steps?.length || 1;

    const { data: enrollment } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('progress_pct')
      .eq('pathway_id', pathwayId)
      .eq('user_id', user_id)
      .single();

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const currentPct = enrollment.progress_pct || 0;
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
      .eq('user_id', user_id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    console.error('POST /pathways/:id/skip-step error:', err);
    res.status(500).json({ error: err.message || 'Failed to skip step' });
  }
});

router.post('/pathways/:id/admin-complete', async (req, res) => {
  try {
    const pathwayId = req.params.id;
    const { user_id, step_id } = req.body;

    if (!user_id || !step_id) {
      return res.status(400).json({ error: 'user_id and step_id are required' });
    }

    const { data: pathway } = await supabaseAdmin
      .from('pathways')
      .select('pathway_steps(id)')
      .eq('id', pathwayId)
      .single();

    const totalSteps = pathway?.pathway_steps?.length || 1;

    const { data: enrollment } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('progress_pct')
      .eq('pathway_id', pathwayId)
      .eq('user_id', user_id)
      .single();

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const currentPct = enrollment.progress_pct || 0;
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
      .eq('user_id', user_id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    console.error('POST /pathways/:id/admin-complete error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete step' });
  }
});

router.post('/pathways/:id/self-report', async (req, res) => {
  try {
    res.json({ success: true, message: 'Self-reporting noted' });
  } catch (err: any) {
    console.error('POST /pathways/:id/self-report error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit report' });
  }
});

router.post('/pathways/:id/verify-report', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err: any) {
    console.error('POST /pathways/:id/verify-report error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify report' });
  }
});

export default router;
