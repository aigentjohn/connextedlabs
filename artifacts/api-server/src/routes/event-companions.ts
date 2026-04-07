import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

async function ensureTable() {
  const { error } = await supabaseAdmin.rpc('exec_sql', { query: '' }).maybeSingle();
  const { data } = await supabaseAdmin.from('event_companions').select('id').limit(1);
  if (data !== null) return;

  await supabaseAdmin.from('event_companions').select('id').limit(0);
}

router.get('/event-companions', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('event_companions')
      .select(`
        *,
        event:events!event_companions_event_id_fkey(id, title, start_time),
        table:tables!event_companions_table_id_fkey(id, name, slug),
        elevator:elevators!event_companions_elevator_id_fkey(id, name, slug),
        pitch:pitches!event_companions_pitch_id_fkey(id, name, slug),
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

router.get('/event-companions/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('event_companions')
      .select(`
        *,
        event:events!event_companions_event_id_fkey(id, title, start_time),
        table:tables!event_companions_table_id_fkey(id, name, slug),
        elevator:elevators!event_companions_elevator_id_fkey(id, name, slug),
        pitch:pitches!event_companions_pitch_id_fkey(id, name, slug),
        creator:users!event_companions_created_by_fkey(id, name, avatar)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err: any) {
    console.error('GET /event-companions/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/event-companions', async (req, res) => {
  try {
    const { name, event_id, table_id, elevator_id, pitch_id, notes, created_by } = req.body;
    if (!name || !event_id || !created_by) {
      return res.status(400).json({ error: 'name, event_id, and created_by are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('event_companions')
      .insert({
        name,
        event_id,
        table_id: table_id || null,
        elevator_id: elevator_id || null,
        pitch_id: pitch_id || null,
        notes: notes || null,
        created_by,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('POST /event-companions error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/event-companions/:id', async (req, res) => {
  try {
    const { name, event_id, table_id, elevator_id, pitch_id, notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('event_companions')
      .update({
        name,
        event_id,
        table_id: table_id || null,
        elevator_id: elevator_id || null,
        pitch_id: pitch_id || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('PUT /event-companions/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/event-companions/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('event_companions')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /event-companions/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/event-companions/migrate', async (_req, res) => {
  try {
    const { error } = await supabaseAdmin.rpc('_create_event_companions_table');
    if (error && !error.message.includes('already exists')) {
      console.error('Migration error via RPC:', error);
    }
    res.json({ success: true, message: 'Table ready' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
