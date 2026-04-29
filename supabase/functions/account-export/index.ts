import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

function errorJson(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return errorJson('Method not allowed', 405);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const userToken = req.headers.get('X-User-Token') ?? req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!userToken) return errorJson('Unauthorized', 401);

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
  if (authError || !user) return errorJson('Unauthorized', 401);

  const uid = user.id;

  const [
    profileRes,
    documentsRes,
    pagesRes,
    booksRes,
    decksRes,
    checklistsRes,
    checklistItemsRes,
    librariesRes,
    myContentsRes,
    postsRes,
    episodesRes,
    playlistsRes,
    buildsRes,
    pitchesRes,
    badgeAssignmentsRes,
    favoritesRes,
    circlesRes,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*').eq('id', uid).maybeSingle(),
    supabaseAdmin.from('documents').select('*').eq('created_by', uid),
    supabaseAdmin.from('pages').select('*').eq('created_by', uid),
    supabaseAdmin.from('books').select('*').eq('created_by', uid).is('deleted_at', null),
    supabaseAdmin.from('decks').select('*').eq('created_by', uid),
    supabaseAdmin.from('checklists').select('*').eq('created_by', uid),
    supabaseAdmin.from('checklist_items').select('*').eq('created_by', uid),
    supabaseAdmin.from('libraries').select('*').eq('owner_id', uid).eq('owner_type', 'user'),
    supabaseAdmin.from('my_contents').select('*').eq('user_id', uid),
    supabaseAdmin.from('posts').select('*').eq('user_id', uid),
    supabaseAdmin.from('episodes').select('*').eq('created_by', uid),
    supabaseAdmin.from('playlists').select('*').eq('created_by', uid),
    supabaseAdmin.from('builds').select('*').eq('created_by', uid),
    supabaseAdmin.from('pitches').select('*').eq('created_by', uid),
    supabaseAdmin.from('badge_assignments').select('*').eq('user_id', uid),
    supabaseAdmin.from('content_favorites').select('*').eq('user_id', uid),
    supabaseAdmin.from('circles').select('id, name, description, created_at').contains('member_ids', [uid]),
  ]);

  // Book chapters need book IDs from the first batch
  const bookIds = (booksRes.data ?? []).map((b: { id: string }) => b.id);
  const bookChapters = bookIds.length > 0
    ? (await supabaseAdmin.from('book_chapters').select('*').in('book_id', bookIds)).data ?? []
    : [];

  const exportDate = new Date().toISOString();

  const payload = {
    exported_at: exportDate,
    user_id: uid,
    profile: profileRes.data ?? null,
    content: {
      documents: documentsRes.data ?? [],
      pages: pagesRes.data ?? [],
      books: booksRes.data ?? [],
      book_chapters: bookChapters,
      decks: decksRes.data ?? [],
      checklists: checklistsRes.data ?? [],
      checklist_items: checklistItemsRes.data ?? [],
      libraries: librariesRes.data ?? [],
      my_contents: myContentsRes.data ?? [],
      posts: postsRes.data ?? [],
      episodes: episodesRes.data ?? [],
      playlists: playlistsRes.data ?? [],
      builds: buildsRes.data ?? [],
      pitches: pitchesRes.data ?? [],
    },
    engagement: {
      favorites: favoritesRes.data ?? [],
      badges: badgeAssignmentsRes.data ?? [],
    },
    membership: {
      circles: circlesRes.data ?? [],
    },
  };

  const filename = `connexted-export-${exportDate.slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
