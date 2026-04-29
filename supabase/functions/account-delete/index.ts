import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const userToken = req.headers.get('X-User-Token') ?? req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!userToken) return json({ error: 'Unauthorized' }, 401);

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const uid = user.id;

  // POST /account-delete — schedule deletion (soft-delete)
  if (req.method === 'POST') {
    // Trigger a data export first so it's ready before any data is touched
    const exportUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/account-export`;
    const exportRes = await fetch(exportUrl, {
      headers: { 'X-User-Token': userToken },
    }).catch(() => null);

    // Store the export JSON in Supabase Storage if available; otherwise log and continue
    if (exportRes?.ok) {
      const exportBlob = await exportRes.blob();
      const filename = `exports/${uid}/connexted-export-${new Date().toISOString().slice(0, 10)}.json`;
      await supabaseAdmin.storage.from('account-exports').upload(filename, exportBlob, {
        contentType: 'application/json',
        upsert: true,
      }).catch((err) => console.error('Export storage upload failed (non-fatal):', err));
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', uid);

    if (error) return json({ error: 'Failed to schedule deletion' }, 500);

    return json({ success: true, message: 'Account scheduled for deletion in 30 days.' });
  }

  // DELETE /account-delete — cancel scheduled deletion
  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ deleted_at: null })
      .eq('id', uid);

    if (error) return json({ error: 'Failed to cancel deletion' }, 500);

    return json({ success: true, message: 'Account deletion cancelled.' });
  }

  return json({ error: 'Method not allowed' }, 405);
});
