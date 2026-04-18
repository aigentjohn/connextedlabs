/**
 * DiscoveryFeedPage — Unified discovery feed with source filters.
 *
 * Sources (each toggleable via checkbox):
 *   Following  — content from people you follow
 *   Followers  — content from people who follow you
 *   Friends    — content from mutual connections only
 *   Topics     — content linked to topics you watch
 *   Tags       — content tagged with tags you follow
 *
 * Data is fetched once on load; checkbox toggles filter in-memory
 * so switching sources is instant without re-fetching.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import {
  Search, FileText, MessageSquare, Calendar, BookOpen, ThumbsUp,
  Hammer, Lightbulb, Headphones, Presentation, Users, Heart,
  Hash, Tag, RefreshCw, Rss,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  created_at: string;
  author?: { id: string; name: string; avatar?: string };
  // Which source buckets this item belongs to
  inFollowing: boolean;
  inFollowers: boolean;
  inFriends: boolean;
  topicName?: string;
  tagName?: string;
}

interface FeedFilters {
  following: boolean;
  followers: boolean;
  friends: boolean;
  topics: boolean;
  tags: boolean;
}

interface FeedStats {
  followingCount: number;
  followerCount: number;
  friendCount: number;
  topicCount: number;
  tagCount: number;
}

// ── Content tables to query for person-based feeds ────────────────────────────

const PERSON_TABLES = [
  { table: 'posts',         type: 'post',     titleF: 'title', descF: 'content',     authorF: 'author_id' },
  { table: 'forum_threads', type: 'thread',   titleF: 'title', descF: 'body',        authorF: 'author_id' },
  { table: 'documents',     type: 'document', titleF: 'title', descF: 'description', authorF: 'author_id' },
  { table: 'builds',        type: 'build',    titleF: 'name',  descF: 'description', authorF: 'created_by' },
  { table: 'pitches',       type: 'pitch',    titleF: 'title', descF: 'description', authorF: 'created_by' },
  { table: 'events',        type: 'event',    titleF: 'title', descF: 'description', authorF: 'host_id' },
  { table: 'endorsements',  type: 'review',   titleF: 'title', descF: 'body',        authorF: 'author_id' },
];

const TAG_TABLES = [
  { table: 'posts',         type: 'post',     titleF: 'title', descF: 'content',     authorF: 'author_id' },
  { table: 'documents',     type: 'document', titleF: 'title', descF: 'description', authorF: 'author_id' },
  { table: 'episodes',      type: 'episode',  titleF: 'title', descF: 'description', authorF: 'created_by' },
  { table: 'books',         type: 'book',     titleF: 'title', descF: 'description', authorF: 'created_by' },
  { table: 'builds',        type: 'build',    titleF: 'name',  descF: 'description', authorF: 'created_by' },
  { table: 'pitches',       type: 'pitch',    titleF: 'title', descF: 'description', authorF: 'created_by' },
];

const TOPIC_CONTENT_MAP: Record<string, { table: string; titleF: string; descF: string; authorF: string }> = {
  book:     { table: 'books',         titleF: 'title', descF: 'description', authorF: 'created_by' },
  deck:     { table: 'decks',         titleF: 'title', descF: 'description', authorF: 'created_by' },
  document: { table: 'documents',     titleF: 'title', descF: 'description', authorF: 'author_id' },
  course:   { table: 'courses',       titleF: 'title', descF: 'description', authorF: 'created_by' },
  program:  { table: 'programs',      titleF: 'name',  descF: 'description', authorF: 'created_by' },
  episode:  { table: 'episodes',      titleF: 'title', descF: 'description', authorF: 'created_by' },
  post:     { table: 'posts',         titleF: 'title', descF: 'content',     authorF: 'author_id' },
  thread:   { table: 'forum_threads', titleF: 'title', descF: 'body',        authorF: 'author_id' },
  event:    { table: 'events',        titleF: 'title', descF: 'description', authorF: 'host_id' },
  build:    { table: 'builds',        titleF: 'name',  descF: 'description', authorF: 'created_by' },
  pitch:    { table: 'pitches',       titleF: 'title', descF: 'description', authorF: 'created_by' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function DiscoveryFeedPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FeedFilters>({
    following: true,
    followers: false,
    friends: true,
    topics: true,
    tags: true,
  });

  const [rawFeed, setRawFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<FeedStats>({
    followingCount: 0, followerCount: 0, friendCount: 0,
    topicCount: 0, tagCount: 0,
  });

  useEffect(() => {
    if (profile) fetchFeed();
  }, [profile?.id]);

  const toggleFilter = (key: keyof FeedFilters) =>
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchFeed = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // 1. Fetch all relationship IDs in parallel
      const [followingRes, followersRes, topicRes, tagRes] = await Promise.all([
        supabase.from('user_connections').select('following_id').eq('follower_id', profile.id),
        supabase.from('user_connections').select('follower_id').eq('following_id', profile.id),
        supabase.from('topic_followers').select('topic_id, topics:topic_id(id, name)').eq('user_id', profile.id),
        supabase.from('tag_followers').select('tag').eq('user_id', profile.id),
      ]);

      const followingIds = followingRes.data?.map(c => c.following_id) || [];
      const followerIds  = followersRes.data?.map(c => c.follower_id)  || [];
      const followingSet = new Set(followingIds);
      const followerSet  = new Set(followerIds);
      const friendIds    = followingIds.filter(id => followerSet.has(id));
      const friendSet    = new Set(friendIds);

      // All unique person IDs we might need
      const allPersonIds = [...new Set([...followingIds, ...followerIds])];

      setStats({
        followingCount: followingIds.length,
        followerCount:  followerIds.length,
        friendCount:    friendIds.length,
        topicCount:     topicRes.data?.length || 0,
        tagCount:       tagRes.data?.length   || 0,
      });

      const items: FeedItem[] = [];
      const seen = new Set<string>();

      const addItem = (
        raw: any,
        type: string,
        titleF: string,
        descF: string,
        authorF: string,
        authorMap: Map<string, any>,
        extra?: Partial<Pick<FeedItem, 'topicName' | 'tagName'>>
      ) => {
        const key = `${type}:${raw.id}`;
        const authorId = raw[authorF];
        const existing = items.find(i => `${i.type}:${i.id}` === key);

        if (existing) {
          // Merge source info into existing item
          if (followingSet.has(authorId)) existing.inFollowing = true;
          if (followerSet.has(authorId))  existing.inFollowers = true;
          if (friendSet.has(authorId))    existing.inFriends   = true;
          if (extra?.topicName && !existing.topicName) existing.topicName = extra.topicName;
          if (extra?.tagName   && !existing.tagName)   existing.tagName   = extra.tagName;
          return;
        }

        seen.add(key);
        items.push({
          id: raw.id,
          type,
          title: raw[titleF] || 'Untitled',
          description: raw[descF] || undefined,
          created_at: raw.created_at || raw.start_time,
          author: authorMap.get(authorId),
          inFollowing: followingSet.has(authorId),
          inFollowers: followerSet.has(authorId),
          inFriends:   friendSet.has(authorId),
          ...extra,
        });
      };

      // 2. Fetch content for all person IDs
      if (allPersonIds.length > 0) {
        const contentResults = await Promise.allSettled(
          PERSON_TABLES.map(t =>
            supabase.from(t.table)
              .select(`id, ${t.titleF}, ${t.descF}, created_at, ${t.authorF}`)
              .in(t.authorF, allPersonIds)
              .order('created_at', { ascending: false })
              .limit(30)
          )
        );

        // Collect all author IDs from results
        const authorIdSet = new Set<string>();
        contentResults.forEach((result, idx) => {
          if (result.status !== 'fulfilled' || result.value.error) return;
          result.value.data?.forEach((row: any) => {
            const authorId = row[PERSON_TABLES[idx].authorF];
            if (authorId) authorIdSet.add(authorId);
          });
        });

        // Fetch author profiles in one shot
        const authorMap = new Map<string, any>();
        if (authorIdSet.size > 0) {
          const { data: authors } = await supabase
            .from('users').select('id, name, avatar').in('id', [...authorIdSet]);
          authors?.forEach(a => authorMap.set(a.id, a));
        }

        contentResults.forEach((result, idx) => {
          if (result.status !== 'fulfilled' || result.value.error) return;
          const t = PERSON_TABLES[idx];
          result.value.data?.forEach((row: any) =>
            addItem(row, t.type, t.titleF, t.descF, t.authorF, authorMap)
          );
        });
      }

      // 3. Fetch topic-linked content
      if (topicRes.data && topicRes.data.length > 0) {
        try {
          const topicIds = topicRes.data.map((tf: any) => tf.topic_id);
          const topicNameMap = new Map(
            topicRes.data.map((tf: any) => [tf.topic_id, (tf.topics as any)?.name || 'Topic'])
          );

          const { data: topicLinks } = await supabase
            .from('topic_links')
            .select('content_id, content_type, topic_id')
            .in('topic_id', topicIds)
            .limit(200);

          if (topicLinks) {
            const grouped: Record<string, { ids: string[]; topicName: string }[]> = {};
            topicLinks.forEach((link: any) => {
              if (!grouped[link.content_type]) grouped[link.content_type] = [];
              grouped[link.content_type].push({
                ids: [link.content_id],
                topicName: topicNameMap.get(link.topic_id) || 'Topic',
              });
            });

            for (const [contentType, entries] of Object.entries(grouped)) {
              const config = TOPIC_CONTENT_MAP[contentType];
              if (!config) continue;
              const allIds = [...new Set(entries.flatMap(e => e.ids))];
              const { data: rows } = await supabase
                .from(config.table)
                .select(`id, ${config.titleF}, ${config.descF}, created_at, ${config.authorF}`)
                .in('id', allIds)
                .order('created_at', { ascending: false })
                .limit(20);

              if (!rows) continue;

              const authorIds = [...new Set(rows.map((r: any) => r[config.authorF]).filter(Boolean))] as string[];
              const topicAuthorMap = new Map<string, any>();
              if (authorIds.length > 0) {
                const { data: authors } = await supabase.from('users').select('id, name, avatar').in('id', authorIds);
                authors?.forEach(a => topicAuthorMap.set(a.id, a));
              }

              rows.forEach((row: any) => {
                const topicName = entries.find(e => e.ids.includes(row.id))?.topicName || 'Topic';
                addItem(row, contentType, config.titleF, config.descF, config.authorF, topicAuthorMap, { topicName });
              });
            }
          }
        } catch (err) {
          console.warn('[DiscoveryFeed] Topic fetch failed:', err);
        }
      }

      // 4. Fetch tag-subscribed content
      if (tagRes.data && tagRes.data.length > 0) {
        try {
          const tagNames = tagRes.data.map((tf: any) => tf.tag);

          const tagResults = await Promise.allSettled(
            TAG_TABLES.map(t =>
              supabase.from(t.table)
                .select(`id, ${t.titleF}, ${t.descF}, created_at, ${t.authorF}, tags`)
                .overlaps('tags', tagNames)
                .order('created_at', { ascending: false })
                .limit(15)
            )
          );

          const tagAuthorIds = new Set<string>();
          const tagRows: { config: typeof TAG_TABLES[0]; rows: any[] }[] = [];
          tagResults.forEach((result, idx) => {
            if (result.status !== 'fulfilled' || result.value.error) return;
            const rows = result.value.data || [];
            tagRows.push({ config: TAG_TABLES[idx], rows });
            rows.forEach((row: any) => { if (row[TAG_TABLES[idx].authorF]) tagAuthorIds.add(row[TAG_TABLES[idx].authorF]); });
          });

          const tagAuthorMap = new Map<string, any>();
          if (tagAuthorIds.size > 0) {
            const { data: authors } = await supabase.from('users').select('id, name, avatar').in('id', [...tagAuthorIds]);
            authors?.forEach(a => tagAuthorMap.set(a.id, a));
          }

          tagRows.forEach(({ config, rows }) => {
            rows.forEach((row: any) => {
              const matchingTag = (row.tags || []).find((t: string) => tagNames.includes(t));
              addItem(row, config.type, config.titleF, config.descF, config.authorF, tagAuthorMap, {
                tagName: matchingTag ? `#${matchingTag}` : undefined,
              });
            });
          });
        } catch (err) {
          console.warn('[DiscoveryFeed] Tag fetch failed:', err);
        }
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRawFeed(items.slice(0, 150));
    } catch (err) {
      console.error('[DiscoveryFeed] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Filter in-memory ────────────────────────────────────────────────────────

  const displayFeed = useMemo(() => {
    return rawFeed.filter(item => {
      const personMatch =
        (filters.following && item.inFollowing) ||
        (filters.followers && item.inFollowers) ||
        (filters.friends   && item.inFriends);
      const topicMatch = filters.topics && !!item.topicName;
      const tagMatch   = filters.tags   && !!item.tagName;

      if (!personMatch && !topicMatch && !tagMatch) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.author?.name.toLowerCase().includes(q)
      );
    });
  }, [rawFeed, filters, searchQuery]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const FILTER_OPTIONS: { key: keyof FeedFilters; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { key: 'following', label: 'Following',  icon: <Users className="w-3.5 h-3.5" />,  count: stats.followingCount, color: 'text-blue-700 border-blue-200 bg-blue-50' },
    { key: 'followers', label: 'Followers',  icon: <Users className="w-3.5 h-3.5" />,  count: stats.followerCount,  color: 'text-gray-700 border-gray-200 bg-gray-50' },
    { key: 'friends',   label: 'Friends',    icon: <Heart className="w-3.5 h-3.5" />,   count: stats.friendCount,    color: 'text-rose-700 border-rose-200 bg-rose-50' },
    { key: 'topics',    label: 'Topics',     icon: <Tag className="w-3.5 h-3.5" />,     count: stats.topicCount,     color: 'text-purple-700 border-purple-200 bg-purple-50' },
    { key: 'tags',      label: 'Tags',       icon: <Hash className="w-3.5 h-3.5" />,    count: stats.tagCount,       color: 'text-indigo-700 border-indigo-200 bg-indigo-50' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Discover', path: '/explore' }, { label: 'My Feed' }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Rss className="w-8 h-8 text-indigo-600" />
            My Feed
          </h1>
          <p className="text-gray-600 mt-1">
            Content from your network, watched topics, and followed tags
          </p>
        </div>
        <button
          onClick={fetchFeed}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Source filter checkboxes */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Show content from</p>
          <div className="flex flex-wrap gap-3">
            {FILTER_OPTIONS.map(opt => (
              <label
                key={opt.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${
                  filters[opt.key] ? opt.color : 'text-gray-400 border-gray-200 bg-white'
                }`}
              >
                <Checkbox
                  checked={filters[opt.key]}
                  onCheckedChange={() => toggleFilter(opt.key)}
                  className="flex-shrink-0"
                />
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {opt.icon}
                  {opt.label}
                  {opt.count > 0 && (
                    <span className="text-xs opacity-70">({opt.count})</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search feed..."
          className="pl-10"
        />
      </div>

      {/* Feed */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            Building your feed...
          </CardContent>
        </Card>
      ) : displayFeed.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Rss className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700">
              {searchQuery ? 'No results match your search' : 'Nothing to show with the current filters'}
            </p>
            <p className="text-sm text-gray-500">
              {!searchQuery && 'Try enabling more sources above, or follow people, topics, and tags to fill your feed.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Activity
              <Badge variant="secondary">{displayFeed.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayFeed.map(item => (
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
                          <Link
                            to={`/users/${item.author.id}`}
                            onClick={e => e.stopPropagation()}
                            className="font-semibold text-sm hover:text-indigo-600"
                          >
                            {item.author.name}
                          </Link>
                          <span className="text-gray-400">•</span>
                        </>
                      )}
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {contentIcon(item.type)}
                        {item.type}
                      </Badge>
                      {/* Relationship badge — most specific wins */}
                      {item.inFriends && (
                        <Badge variant="outline" className="text-xs text-rose-600 border-rose-200 gap-1">
                          <Heart className="w-3 h-3" /> Friend
                        </Badge>
                      )}
                      {!item.inFriends && item.inFollowing && (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 gap-1">
                          <Users className="w-3 h-3" /> Following
                        </Badge>
                      )}
                      {!item.inFriends && item.inFollowers && !item.inFollowing && (
                        <Badge variant="outline" className="text-xs text-gray-600 border-gray-200 gap-1">
                          <Users className="w-3 h-3" /> Follower
                        </Badge>
                      )}
                      {item.topicName && (
                        <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                          📌 {item.topicName}
                        </Badge>
                      )}
                      {item.tagName && (
                        <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                          🏷️ {item.tagName}
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
