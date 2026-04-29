import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Scheduled daily at 3am UTC via supabase/config.toml.
// Permanently deletes users whose deleted_at crossed the 30-day grace period.

serve(async (_req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Find users past the 30-day grace period
  const { data: users, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (fetchError) {
    console.error('hard-delete-accounts: fetch error', fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!users || users.length === 0) {
    console.log('hard-delete-accounts: no users to delete');
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const user of users) {
    // deleteUser removes the auth.users row; content tables cascade via FK
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`hard-delete-accounts: failed to delete ${user.id}`, error);
      results.push({ id: user.id, success: false, error: error.message });
    } else {
      console.log(`hard-delete-accounts: deleted ${user.id}`);
      results.push({ id: user.id, success: true });
    }
  }

  return new Response(JSON.stringify({ deleted: results.filter(r => r.success).length, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
