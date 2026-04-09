import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/event-companions', requireAuth, async (_req, res) => {
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
    res.json(data ?? []);
  } catch (err) {
    logger.error({ err }, 'GET /event-companions failed');
    res.status(500).json({ error: 'Failed to load event companions' });
  }
});

export default router;
