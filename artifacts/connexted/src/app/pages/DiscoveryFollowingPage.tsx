import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Input } from '@/app/components/ui/input';
import {
  Search, FileText, MessageSquare, Calendar, BookOpen, ThumbsUp,
  Hammer, Lightbulb, Headphones, Presentation, Users, Hash, Tag,
  RefreshCw,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { format } from 'date-fns';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  created_at: string;
  author?: { id: string; name: string; avatar?: string };
  source?: 'person' | 'topic' | 'tag';
  sourceName?: string;
}

function contentIcon(type: string) {
  switch (type) {
    case 'post':     return <FileText className="w-4 h-4" />;
    case 'thread':   return <MessageSquare className="w-4 h-4" />;
    case 'event':    return <Calendar className="w-4 h-4" />;
    case 'course':   return <BookOpen className="w-4 h-4" />;
    case 'document': return <FileText className="w-4 h-4" />;
    case 'review':   return <ThumbsUp className="w-4 h-4" />;
    case 'build':    return <Hammer className="w-4 h-4" />;
    case 'pitch':    return <Lightbulb className="w-4 h-4" />;
    case 'book':     return <BookOpen className="w-4 h-4" />;
    case 'deck':     return <Presentation className="w-4 h-4" />;
    case 'episode':  return <Headphones className="w-4 h-4" />;
    case 'program':  return <BookOpen className="w-4 h-4" />;
    default:         return <FileText className="w-4 h-4" />;
  }
}

function contentLink(type: string, id: string) {
  switch (type) {
    case 'post':     return `/posts/${id}`;
    case 'thread':   return `/forums/thread/${id}`;
    case 'event':    return `/events/${id}`;
    case 'course':   return `/courses/${id}`;
    case 'document': return `/documents/${id}`;
    case 'review':   return `/reviews/${id}`;
    case 'build':    return `/builds/${id}`;
    case 'pitch':    return `/pitches/${id}`;
    case 'book':     return `/books/${id}`;
    case 'deck':     return `/decks/${id}`;
    case 'episode':  return `/episodes/${id}`;
    case 'program':  return `/programs/${id}`;
    default:         return '#';
  }
}

export default function DiscoveryFollowingPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ people: 0, topics: 0, tags: 0 });

  useEffect(() => {
    if (profile) fetchActivity();
  }, [profile?.id]);

  const fetchActivity = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const allActivity: ActivityItem[] = [];

      // ── People you follow ──────────────────────────────────────────────
      const { data: connectionsData } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', profile.id);

      const followingIds = connectionsData?.map(c => c.following_id) || [];

      if (followingIds.length > 0) {
        const [postsR, threadsR, docsR, reviewsR, buildsR, pitchesR, eventsR, authorsR] =
          await Promise.all([
            supabase.from('posts').select('id, title, content, created_at, author_id').in('author_id', followingIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('forum_threads').select('id, title, body, created_at, author_id').in('author_id', followingIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('documents').select('id, title, description, created_at, author_id').in('author_id', followingIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('endorsements').select('id, title, body, created_at, author_id').in('author_id', followingIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('builds').select('id, name, description, created_at, created_by').in('created_by', followingIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('pitches').select('id, title, description, created_at, created_by').in('created_by', followingIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('events').select('id, title, description, created_at, host_id').in('host_id', followingIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('users').select('id, name, avatar').in('id', followingIds),
          ]);

        const authorMap = new Map(authorsR.data?.map(a => [a.id, a]) || []);

        const push = (items: any[], type: string, titleF: string, descF: string, authorF: string) => {
          items?.forEach(row => {
            const author = authorMap.get(row[authorF]);
            if (author) {
              allActivity.push({ id: row.id, type, title: row[titleF] || 'Untitled', description: row[descF], created_at: row.created_at, author, source: 'person' });
            }
          });
        };

        push(postsR.data || [],    'post',     'title', 'content',     'author_id');
        push(threadsR.data || [],  'thread',   'title', 'body',        'author_id');
        push(docsR.data || [],     'document', 'title', 'description', 'author_id');
        push(reviewsR.data || [],  'review',   'title', 'body',        'author_id');
        push(buildsR.data || [],   'build',    'name',  'description', 'created_by');
        push(pitchesR.data || [],  'pitch',    'title', 'description', 'created_by');
        push(eventsR.data || [],   'event',    'title', 'description', 'host_id');
      }

      // ── Topic subscriptions ────────────────────────────────────────────
      let topicCount = 0;
      try {
        const { data: topicFollows } = await supabase
          .from('topic_followers')
          .select('topic_id, topics:topic_id(id, name)')
          .eq('user_id', profile.id);

        topicCount = topicFollows?.length || 0;

        if (topicFollows && topicFollows.length > 0) {
          const topicIds = topicFollows.map((tf: any) => tf.topic_id);
          const topicNameMap = new Map(topicFollows.map((tf: any) => [tf.topic_id, (tf.topics as any)?.name || 'Topic']));

          const { data: topicLinks } = await supabase
            .from('topic_links')
            .select('content_id, content_type, topic_id')
            .in('topic_id', topicIds)
            .limit(100);

          if (topicLinks && topicLinks.length > 0) {
            const topicContentMap: Record<string, { table: string; titleField: string; descField: string; authorField: string }> = {
              book:     { table: 'books',         titleField: 'title', descField: 'description', authorField: 'created_by' },
              deck:     { table: 'decks',         titleField: 'title', descField: 'description', authorField: 'created_by' },
              document: { table: 'documents',     titleField: 'title', descField: 'description', authorField: 'author_id' },
              course:   { table: 'courses',       titleField: 'title', descField: 'description', authorField: 'created_by' },
              program:  { table: 'programs',      titleField: 'name',  descField: 'description', authorField: 'created_by' },
              episode:  { table: 'episodes',      titleField: 'title', descField: 'description', authorField: 'created_by' },
              post:     { table: 'posts',         titleField: 'title', descField: 'content',     authorField: 'author_id' },
              thread:   { table: 'forum_threads', titleField: 'title', descField: 'body',        authorField: 'author_id' },
              event:    { table: 'events',        titleField: 'title', descField: 'description', authorField: 'host_id' },
              build:    { table: 'builds',        titleField: 'name',  descField: 'description', authorField: 'created_by' },
              pitch:    { table: 'pitches',       titleField: 'title', descField: 'description', authorField: 'created_by' },
              review:   { table: 'endorsements',  titleField: 'title', descField: 'body',        authorField: 'author_id' },
            };

            const grouped: Record<string, { ids: string[]; topicName: string }[]> = {};
            topicLinks.forEach((link: any) => {
              if (!grouped[link.content_type]) grouped[link.content_type] = [];
              grouped[link.content_type].push({ ids: [link.content_id], topicName: topicNameMap.get(link.topic_id) || 'Topic' });
            });

            const seenKeys = new Set(allActivity.map(a => `${a.type}:${a.id}`));

            for (const [contentType, entries] of Object.entries(grouped)) {
              const config = topicContentMap[contentType];
              if (!config) continue;
              const allIds = [...new Set(entries.flatMap(e => e.ids))];
              const { data: rows } = await supabase
                .from(config.table)
                .select(`id, ${config.titleField}, ${config.descField}, created_at, ${config.authorField}`)
                .in('id', allIds)
                .order('created_at', { ascending: false })
                .limit(10);

              if (rows) {
                const authorIds = [...new Set(rows.map((r: any) => r[config.authorField]).filter(Boolean))] as string[];
                let authorMap2 = new Map<string, any>();
                if (authorIds.length > 0) {
                  const { data: authors } = await supabase.from('users').select('id, name, avatar').in('id', authorIds);
                  authorMap2 = new Map(authors?.map(a => [a.id, a]) || []);
                }
                rows.forEach((row: any) => {
                  const key = `${contentType}:${row.id}`;
                  if (seenKeys.has(key)) return;
                  seenKeys.add(key);
                  const topicName = entries.find(e => e.ids.includes(row.id))?.topicName || 'Topic';
                  allActivity.push({
                    id: row.id,
                    type: contentType,
                    title: row[config.titleField] || 'Untitled',
                    description: row[config.descField],
                    created_at: row.created_at,
                    author: authorMap2.get(row[config.authorField]),
                    source: 'topic',
                    sourceName: topicName,
                  });
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Topic subscription fetch failed:', err);
      }

      // ── Tag subscriptions ──────────────────────────────────────────────
      let tagCount = 0;
      try {
        const { data: tagFollows } = await supabase
          .from('tag_followers')
          .select('tag')                          // ← fixed: was 'tag_name'
          .eq('user_id', profile.id);

        tagCount = tagFollows?.length || 0;

        if (tagFollows && tagFollows.length > 0) {
          const tagNames = tagFollows.map((tf: any) => tf.tag);
          const seenKeys2 = new Set(allActivity.map(a => `${a.type}:${a.id}`));

          const tagTables = [
            { table: 'posts',         type: 'post',      titleField: 'title', descField: 'content',     authorField: 'author_id' },
            { table: 'documents',     type: 'document',  titleField: 'title', descField: 'description', authorField: 'author_id' },
            { table: 'episodes',      type: 'episode',   titleField: 'title', descField: 'description', authorField: 'created_by' },
            { table: 'courses',       type: 'course',    titleField: 'title', descField: 'description', authorField: 'created_by' },
            { table: 'books',         type: 'book',      titleField: 'title', descField: 'description', authorField: 'created_by' },
            { table: 'builds',        type: 'build',     titleField: 'name',  descField: 'description', authorField: 'created_by' },
            { table: 'pitches',       type: 'pitch',     titleField: 'title', descField: 'description', authorField: 'created_by' },
            { table: 'forum_threads', type: 'thread',    titleField: 'title', descField: 'body',        authorField: 'author_id' },
          ];

          const tagResults = await Promise.allSettled(
            tagTables.map(t =>
              supabase.from(t.table)
                .select(`id, ${t.titleField}, ${t.descField}, created_at, ${t.authorField}, tags`)
                .overlaps('tags', tagNames)
                .order('created_at', { ascending: false })
                .limit(10)
            )
          );

          const allAuthorIds = new Set<string>();
          const tagRows: { config: typeof tagTables[0]; rows: any[] }[] = [];

          tagResults.forEach((result, idx) => {
            if (result.status !== 'fulfilled') return;
            const { data, error } = result.value;
            if (error || !data) return;
            tagRows.push({ config: tagTables[idx], rows: data });
            data.forEach((row: any) => { if (row[tagTables[idx].authorField]) allAuthorIds.add(row[tagTables[idx].authorField]); });
          });

          let tagAuthorMap = new Map<string, any>();
          if (allAuthorIds.size > 0) {
            const { data: authors } = await supabase.from('users').select('id, name, avatar').in('id', [...allAuthorIds]);
            tagAuthorMap = new Map(authors?.map(a => [a.id, a]) || []);
          }

          tagRows.forEach(({ config, rows }) => {
            rows.forEach((row: any) => {
              const key = `${config.type}:${row.id}`;
              if (seenKeys2.has(key)) return;
              seenKeys2.add(key);
              const matchingTags = (row.tags || []).filter((t: string) => tagNames.includes(t));
              allActivity.push({
                id: row.id,
                type: config.type,
                title: row[config.titleField] || 'Untitled',
                description: row[config.descField],
                created_at: row.created_at,
                author: tagAuthorMap.get(row[config.authorField]),
                source: 'tag',
                sourceName: matchingTags[0] ? `#${matchingTags[0]}` : '#tag',
              });
            });
          });
        }
      } catch (err) {
        console.warn('Tag subscription fetch failed:', err);
      }

      allActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivity(allActivity.slice(0, 60));
      setStats({ people: followingIds.length, topics: topicCount, tags: tagCount });
    } catch (err) {
      console.error('Error fetching following activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activity.filter(item =>
    !searchQuery ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.author?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Discover', path: '/discovery' }, { label: 'Following Feed' }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Following Feed</h1>
          <p className="text-gray-600 mt-1">Content from people, topics, and tags you follow</p>
          {!loading && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{stats.people} people</span>
              <span className="flex items-center gap-1"><Tag className="w-4 h-4" />{stats.topics} topics</span>
              <span className="flex items-center gap-1"><Hash className="w-4 h-4" />{stats.tags} tags</span>
            </div>
          )}
        </div>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search following feed..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            Loading activity...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Users className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700">
              {searchQuery ? 'No results match your search' : 'Nothing in your following feed yet'}
            </p>
            <p className="text-sm text-gray-500">
              {!searchQuery && (
                <>
                  Follow members from their profile, or star topics and tags to see content here.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className="hover:shadow-md transition-shadow cursor-pointer border border-gray-100 rounded-lg p-4"
                onClick={() => navigate(contentLink(item.type, item.id))}
              >
                <div className="flex items-start gap-3">
                  {item.author ? (
                    <Link to={`/users/${item.author.id}`} onClick={e => e.stopPropagation()} className="flex-shrink-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={item.author.avatar || undefined} />
                        <AvatarFallback>{item.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                      {contentIcon(item.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {item.author && (
                        <>
                          <Link to={`/users/${item.author.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-sm hover:text-indigo-600">
                            {item.author.name}
                          </Link>
                          <span className="text-gray-400">•</span>
                        </>
                      )}
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {contentIcon(item.type)}
                        {item.type}
                      </Badge>
                      {item.source && item.source !== 'person' && item.sourceName && (
                        <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                          {item.source === 'topic' ? '📌' : '🏷️'} {item.sourceName}
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.title}</h3>

                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-1">{item.description}</p>
                    )}

                    <p className="text-xs text-gray-400">{format(new Date(item.created_at), 'PPp')}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
