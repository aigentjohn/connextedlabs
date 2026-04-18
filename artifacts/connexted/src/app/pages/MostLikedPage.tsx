/**
 * MostLikedPage — surfaces the highest-liked content across all types.
 *
 * Approach:
 *   1. Query content_likes (optionally filtered by date range)
 *   2. Aggregate in JS: group by content_type + content_id, count likes
 *   3. Batch-fetch content details for the top items
 *   4. Render unified ranked list, filterable by type
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import {
  Search, FileText, MessageSquare, Calendar, BookOpen, ThumbsUp,
  Hammer, Lightbulb, Headphones, Presentation, Heart, Trophy,
  ChevronRight, TrendingUp,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

// ── Types ────────────────────────────────────────────────────────────────────

type TimeRange = 'week' | 'month' | 'year' | 'all';

interface RankedItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  created_at: string;
  likeCount: number;
  rank: number;
}

// ── Content type registry ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  table: string;
  titleField: string;
  descField: string;
  route: string;
  label: string;
}> = {
  post:     { table: 'posts',         titleField: 'title', descField: 'content',     route: '/posts',     label: 'Post' },
  thread:   { table: 'forum_threads', titleField: 'title', descField: 'body',        route: '/forums/thread', label: 'Thread' },
  event:    { table: 'events',        titleField: 'title', descField: 'description', route: '/events',    label: 'Event' },
  course:   { table: 'courses',       titleField: 'title', descField: 'description', route: '/courses',   label: 'Course' },
  document: { table: 'documents',     titleField: 'title', descField: 'description', route: '/documents', label: 'Document' },
  review:   { table: 'endorsements',  titleField: 'title', descField: 'body',        route: '/reviews',   label: 'Review' },
  build:    { table: 'builds',        titleField: 'name',  descField: 'description', route: '/builds',    label: 'Build' },
  pitch:    { table: 'pitches',       titleField: 'title', descField: 'description', route: '/pitches',   label: 'Pitch' },
  book:     { table: 'books',         titleField: 'title', descField: 'description', route: '/books',     label: 'Book' },
  deck:     { table: 'decks',         titleField: 'title', descField: 'description', route: '/decks',     label: 'Deck' },
  episode:  { table: 'episodes',      titleField: 'title', descField: 'description', route: '/episodes',  label: 'Episode' },
  program:  { table: 'programs',      titleField: 'name',  descField: 'description', route: '/programs',  label: 'Program' },
  blog:     { table: 'blogs',         titleField: 'title', descField: 'summary',     route: '/blogs',     label: 'Blog' },
  magazine: { table: 'magazines',     titleField: 'name',  descField: 'description', route: '/magazines', label: 'Magazine' },
  playlist: { table: 'playlists',     titleField: 'name',  descField: 'description', route: '/playlists', label: 'Playlist' },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

function typeIcon(type: string) {
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
    case 'blog':     return <FileText className="w-4 h-4" />;
    case 'magazine': return <BookOpen className="w-4 h-4" />;
    case 'playlist': return <Headphones className="w-4 h-4" />;
    default:         return <FileText className="w-4 h-4" />;
  }
}

function rankMedal(rank: number) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="w-6 text-center text-sm font-bold text-gray-400">#{rank}</span>;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year',  label: 'This Year' },
  { value: 'all',   label: 'All Time' },
];

function getDateCutoff(range: TimeRange): string | null {
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'week')  now.setDate(now.getDate() - 7);
  if (range === 'month') now.setMonth(now.getMonth() - 1);
  if (range === 'year')  now.setFullYear(now.getFullYear() - 1);
  return now.toISOString();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MostLikedPage() {
  const [items, setItems] = useState<RankedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalLikes, setTotalLikes] = useState(0);

  const fetchMostLiked = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Fetch all likes (with optional date filter)
      const cutoff = getDateCutoff(timeRange);
      let query = supabase
        .from('content_likes')
        .select('content_type, content_id');

      if (cutoff) {
        query = query.gte('created_at', cutoff);
      }

      const { data: likesData, error } = await query;
      if (error) throw error;
      if (!likesData || likesData.length === 0) {
        setItems([]);
        setTotalLikes(0);
        return;
      }

      setTotalLikes(likesData.length);

      // Step 2: Aggregate — count likes per (type, id)
      const counts = new Map<string, { type: string; id: string; count: number }>();
      likesData.forEach(like => {
        const key = `${like.content_type}:${like.content_id}`;
        if (!counts.has(key)) {
          counts.set(key, { type: like.content_type, id: like.content_id, count: 0 });
        }
        counts.get(key)!.count++;
      });

      // Step 3: Sort and take top 50 (optionally filtered by type)
      const sorted = [...counts.values()]
        .filter(c => ALL_TYPES.includes(c.type))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      // Step 4: Batch-fetch content details grouped by type
      const byType = new Map<string, { id: string; count: number }[]>();
      sorted.forEach(c => {
        if (!byType.has(c.type)) byType.set(c.type, []);
        byType.get(c.type)!.push({ id: c.id, count: c.count });
      });

      const detailResults = await Promise.allSettled(
        [...byType.entries()].map(async ([type, entries]) => {
          const config = TYPE_CONFIG[type];
          if (!config) return { type, rows: [] };
          const ids = entries.map(e => e.id);
          const { data } = await supabase
            .from(config.table)
            .select(`id, ${config.titleField}, ${config.descField}, created_at`)
            .in('id', ids);
          return { type, rows: data || [], countMap: new Map(entries.map(e => [e.id, e.count])) };
        })
      );

      // Step 5: Assemble ranked list
      const allItems: Omit<RankedItem, 'rank'>[] = [];
      detailResults.forEach(result => {
        if (result.status !== 'fulfilled') return;
        const { type, rows, countMap } = result.value as any;
        const config = TYPE_CONFIG[type];
        if (!config || !rows) return;
        rows.forEach((row: any) => {
          allItems.push({
            id: row.id,
            type,
            title: row[config.titleField] || 'Untitled',
            description: row[config.descField],
            created_at: row.created_at,
            likeCount: countMap?.get(row.id) || 0,
          });
        });
      });

      // Final sort by like count and assign ranks
      allItems.sort((a, b) => b.likeCount - a.likeCount);
      setItems(allItems.map((item, i) => ({ ...item, rank: i + 1 })));
    } catch (err) {
      console.error('Error fetching most liked:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchMostLiked();
  }, [fetchMostLiked]);

  // Client-side type + search filtering (fast, no re-fetch needed)
  const filtered = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
  });

  // Collect which types actually appear in results (for filter pills)
  const presentTypes = [...new Set(items.map(i => i.type))].sort();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Discover', path: '/discovery' }, { label: 'Most Liked' }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Most Liked
        </h1>
        <p className="text-gray-600 mt-1">
          The highest-rated content across the platform, ranked by community likes
        </p>
      </div>

      {/* Time range selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIME_RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTimeRange(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              timeRange === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {!loading && totalLikes > 0 && (
          <span className="text-sm text-gray-400 ml-2 flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {totalLikes.toLocaleString()} total likes
          </span>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search most liked content..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Type filter pills */}
      {!loading && presentTypes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All types
          </button>
          {presentTypes.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {typeIcon(type)}
              {TYPE_CONFIG[type]?.label || type}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            Tallying likes...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700">
              {searchQuery || typeFilter !== 'all'
                ? 'No results match your filters'
                : `No likes recorded for this time period`}
            </p>
            {(searchQuery || typeFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                className="text-sm text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const config = TYPE_CONFIG[item.type];
            const href = config ? `${config.route}/${item.id}` : '#';
            return (
              <Link key={`${item.type}-${item.id}`} to={href} className="block">
                <Card className="hover:shadow-md hover:border-indigo-200 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Rank indicator */}
                      <div className="flex-shrink-0 w-8 flex items-center justify-center pt-0.5">
                        {rankMedal(item.rank)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors leading-snug">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0 text-rose-500 font-semibold text-sm">
                            <Heart className="w-4 h-4 fill-current" />
                            {item.likeCount.toLocaleString()}
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                        )}

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            {typeIcon(item.type)}
                            {config?.label || item.type}
                          </Badge>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
