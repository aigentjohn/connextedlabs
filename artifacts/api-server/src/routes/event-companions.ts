import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

router.get('/event-companions', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('event_companions')
      .select(`
        *,
        event:events!event_companions_event_id_fkey(id, title, start_time),
        creator:users!event_companions_created_by_fkey(id, name, avatar)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('GET /event-companions error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
