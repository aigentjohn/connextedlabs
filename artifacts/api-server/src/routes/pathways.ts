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

router.get('/pathways/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pathways')
      .select('*, pathway_steps(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Pathway not found' });

    data.steps = (data.pathway_steps || []).sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    res.json({ pathway: data });
  } catch (err: any) {
    console.error('GET /pathways/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to load pathway' });
  }
});

router.post('/pathways', async (req, res) => {
  try {
    const { steps, ...pathwayData } = req.body;

    const slug = (pathwayData.name || pathwayData.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const payload = {
      ...pathwayData,
      slug,
      title: pathwayData.title || pathwayData.name,
      name: pathwayData.name || pathwayData.title,
    };

    const { data, error } = await supabaseAdmin
      .from('pathways')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;

    if (steps && steps.length > 0) {
      const stepsPayload = steps.map((s: any, i: number) => ({
        ...s,
        pathway_id: data.id,
        order_index: i,
        sort_order: i,
      }));
      const { error: stepsError } = await supabaseAdmin
        .from('pathway_steps')
        .insert(stepsPayload);
      if (stepsError) throw stepsError;
    }

    res.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('POST /pathways error:', err);
    res.status(500).json({ error: err.message || 'Failed to create pathway' });
  }
});

router.put('/pathways/:id', async (req, res) => {
  try {
    const { steps, ...pathwayData } = req.body;
    const pathwayId = req.params.id;

    if (pathwayData.name || pathwayData.title) {
      pathwayData.title = pathwayData.title || pathwayData.name;
      pathwayData.name = pathwayData.name || pathwayData.title;
    }

    const { error } = await supabaseAdmin
      .from('pathways')
      .update(pathwayData)
      .eq('id', pathwayId);
    if (error) throw error;

    if (steps !== undefined) {
      await supabaseAdmin.from('pathway_steps').delete().eq('pathway_id', pathwayId);

      if (steps.length > 0) {
        const stepsPayload = steps.map((s: any, i: number) => ({
          ...s,
          pathway_id: pathwayId,
          order_index: i,
          sort_order: i,
        }));
        const { error: stepsError } = await supabaseAdmin
          .from('pathway_steps')
          .insert(stepsPayload);
        if (stepsError) throw stepsError;
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
        status: 'active',
        progress_percentage: 0,
        completed_step_ids: [],
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

router.get('/pathways/user/:userId/enrollments', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pathway_enrollments')
      .select('*, pathways(*)')
      .eq('user_id', req.params.userId);
    if (error) throw error;

    const enrollments = (data || []).map((e: any) => ({
      enrollment: e,
      pathway: e.pathways,
    }));

    res.json({ enrollments });
  } catch (err: any) {
    console.error('GET /pathways/user/:userId/enrollments error:', err);
    res.status(500).json({ error: err.message || 'Failed to load enrollments' });
  }
});

export default router;
