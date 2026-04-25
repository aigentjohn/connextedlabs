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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify caller is admin or super
    const userToken = req.headers.get('X-User-Token');
    if (!userToken) return json({ error: 'Unauthorized' }, 401);

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(userToken);
    if (!caller) return json({ error: 'Unauthorized' }, 401);

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !['admin', 'super'].includes(callerProfile.role)) {
      return json({ error: 'Forbidden' }, 403);
    }

    const { email, name, user_class, membership_tier, role, circle_id } = await req.json();

    if (!email?.trim() || !name?.trim()) {
      return json({ error: 'email and name are required' }, 400);
    }

    let userId: string;
    let alreadyExisted = false;

    // Try to invite as a new user
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim(), {
        data: { name: name.trim() },
      });

    if (inviteError) {
      // If already registered, look up the existing auth user and update their profile
      if (inviteError.message?.toLowerCase().includes('already been registered') ||
          inviteError.message?.toLowerCase().includes('already registered')) {
        const { data: listData, error: listError } =
          await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

        if (listError) return json({ error: listError.message }, 400);

        const existing = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.trim().toLowerCase(),
        );

        if (!existing) return json({ error: 'User exists in auth but could not be located' }, 400);

        userId = existing.id;
        alreadyExisted = true;

        // Send a magic link so they can log in
        await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email.trim(),
        });
      } else {
        return json({ error: inviteError.message }, 400);
      }
    } else {
      userId = inviteData.user.id;
    }

    // Upsert the profile row with the admin-specified values
    await supabaseAdmin.from('users').upsert(
      {
        id: userId,
        email: email.trim(),
        name: name.trim(),
        user_class: user_class ?? 3,
        membership_tier: membership_tier ?? 'free',
        role: role ?? 'member',
        community_id: Deno.env.get('COMMUNITY_ID') ?? '',
      },
      { onConflict: 'id' },
    );

    // Add to onboarding circle if specified
    if (circle_id) {
      const { data: circle } = await supabaseAdmin
        .from('circles')
        .select('member_ids')
        .eq('id', circle_id)
        .single();

      if (circle) {
        const memberIds: string[] = circle.member_ids ?? [];
        if (!memberIds.includes(userId)) {
          await supabaseAdmin
            .from('circles')
            .update({ member_ids: [...memberIds, userId] })
            .eq('id', circle_id);
        }
      }
    }

    return json({ success: true, user_id: userId, already_existed: alreadyExisted });
  } catch (_err) {
    return json({ error: 'Internal server error' }, 500);
  }
});
