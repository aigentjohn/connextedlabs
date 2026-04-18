/**
 * ExploreContentPage — Browse content (not containers) by type.
 *
 * Types driven by CONTENT_TAXONOMY in taxonomy.ts:
 *   Blogs, Episodes, Documents, Books, Decks, Reviews, Events
 *
 * Features:
 *   - Type tabs with item counts
 *   - Search within selected type
 *   - Sort: newest / most liked
 *   - Infinite-style load-more (25 per page)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import {
  Search, FileText, BookOpen, Headphones, Presentation,
  ChevronRight, SortAsc, Calendar, Star, Video, Layers,
  TrendingUp, Hash, Loader2, PenTool,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { format } from 'date-fns';

// ── Content type definitions ──────────────────────────────────────────────────

interface ContentTypeConfig {
  key: string;
  label: string;
  pluralLabel: string;
  table: string;
  titleField: string;
  descField: string;
  dateField: string;
  authorField: string;
  route: string;
  icon: React.ReactNode;
  iconColor: string;
}

// Types aligned with CONTENT_TAXONOMY in src/lib/taxonomy.ts.
// Containers (playlists, builds, pitches, magazines) and MY GROWTH types
// (courses) intentionally excluded — they live in Explore Containers and
// MY GROWTH respectively.
const CONTENT_TYPES: ContentTypeConfig[] = [
  {
    key: 'blog',
    label: 'Blog',
    pluralLabel: 'Blogs',
    table: 'blogs',
    titleField: 'title',
    descField: 'summary',
    dateField: 'created_at',
    authorField: 'author_id',
    route: '/blogs',
    icon: <PenTool className="w-5 h-5" />,
    iconColor: 'text-blue-600',
  },
  {
    key: 'episode',
    label: 'Episode',
    pluralLabel: 'Episodes',
    table: 'episodes',
    titleField: 'title',
    descField: 'description',
    dateField: 'created_at',
    authorField: 'created_by',
    route: '/episodes',
    icon: <Video className="w-5 h-5" />,
    iconColor: 'text-purple-600',
  },
  {
    key: 'document',
    label: 'Document',
    pluralLabel: 'Documents',
    table: 'documents',
    titleField: 'title',
    descField: 'description',
    dateField: 'created_at',
    authorField: 'author_id',
    route: '/documents',
    icon: <FileText className="w-5 h-5" />,
    iconColor: 'text-slate-600',
  },
  {
    key: 'book',
    label: 'Book',
    pluralLabel: 'Books',
    table: 'books',
    titleField: 'title',
    descField: 'description',
    dateField: 'created_at',
    authorField: 'created_by',
    route: '/books',
    icon: <BookOpen className="w-5 h-5" />,
    iconColor: 'text-emerald-600',
  },
  {
    key: 'deck',
    label: 'Deck',
    pluralLabel: 'Decks',
    table: 'decks',
    titleField: 'title',
    descField: 'description',
    dateField: 'created_at',
    authorField: 'created_by',
    route: '/decks',
    icon: <Layers className="w-5 h-5" />,
    iconColor: 'text-pink-600',
  },
  {
    key: 'review',
    label: 'Review',
    pluralLabel: 'Reviews',
    table: 'reviews',
    titleField: 'title',
    descField: 'content',
    dateField: 'created_at',
    authorField: 'author_id',
    route: '/reviews',
    icon: <Star className="w-5 h-5" />,
    iconColor: 'text-amber-500',
  },
  {
    key: 'event',
    label: 'Event',
    pluralLabel: 'Events',
    table: 'events',
    titleField: 'title',
    descField: 'description',
    dateField: 'start_time',
    authorField: 'host_id',
    route: '/events',
    icon: <Calendar className="w-5 h-5" />,
    iconColor: 'text-sky-600',
  },
];

type SortOption = 'newest' | 'oldest' | 'most-liked';

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  author?: { id: string; name: string; avatar?: string };
  tags?: string[];
  likeCount?: number;
}

const PAGE_SIZE = 25;

// ── Per-type tab panel ────────────────────────────────────────────────────────

function ContentTypePanel({ config, initialSort }: { config: ContentTypeConfig; initialSort: SortOption }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [likeMap, setLikeMap] = useState<Map<string, number>>(new Map());

  const fetchItems = useCallback(async (pageNum: number, currentSort: SortOption, reset = false) => {
    if (pageNum === 0) setLoading(true); else setLoadingMore(true);

    try {
      let query = supabase
        .from(config.table)
        .select(`id, ${config.titleField}, ${config.descField}, ${config.dateField}, tags`)
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (currentSort === 'newest') {
        query = query.order(config.dateField, { ascending: false });
      } else if (currentSort === 'oldest') {
        query = query.order(config.dateField, { ascending: true });
      } else {
        // most-liked: fetch all then sort client-side (after like count join)
        query = query.order(config.dateField, { ascending: false }).limit(100);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((row: any) => ({
        id: row.id,
        title: row[config.titleField] || 'Untitled',
        description: row[config.descField],
        created_at: row[config.dateField],
        tags: row.tags,
      }));

      if (reset || pageNum === 0) {
        setItems(rows);
      } else {
        setItems(prev => [...prev, ...rows]);
      }
      setHasMore(rows.length === PAGE_SIZE);

      // Fetch like counts for these items if profile exists
      if (profile && rows.length > 0) {
        const ids = rows.map(r => r.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', config.key)
          .in('content_id', ids);

        if (likesData) {
          const newMap = new Map(likeMap);
          const countMap = new Map<string, number>();
          likesData.forEach(l => { countMap.set(l.content_id, (countMap.get(l.content_id) || 0) + 1); });
          countMap.forEach((count, id) => newMap.set(id, count));
          setLikeMap(newMap);
        }
      }
    } catch (err) {
      console.warn(`Error fetching ${config.table}:`, err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [config, profile]);

  useEffect(() => {
    setPage(0);
    setItems([]);
    fetchItems(0, sort, true);
  }, [sort]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchItems(nextPage, sort);
  };

  const displayItems = searchQuery
    ? items.filter(item => {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      })
    : (sort === 'most-liked'
        ? [...items].sort((a, b) => (likeMap.get(b.id) || 0) - (likeMap.get(a.id) || 0))
        : items);

  return (
    <div className="space-y-4 mt-4">
      {/* Search + sort row */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${config.pluralLabel.toLowerCase()}...`}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden text-xs">
          {([
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'most-liked', label: 'Most Liked' },
          ] as { value: SortOption; label: string }[]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-3 py-2 transition-colors ${
                sort === opt.value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : displayItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {searchQuery ? `No ${config.pluralLabel.toLowerCase()} match your search` : `No ${config.pluralLabel.toLowerCase()} yet`}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayItems.map(item => {
              const likes = likeMap.get(item.id);
              return (
                <Link key={item.id} to={`${config.route}/${item.id}`} className="block group">
                  <Card className="h-full hover:shadow-md hover:border-indigo-200 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${config.iconColor}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h3 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {item.title}
                            </h3>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5" />
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(item.created_at), 'MMM d, yyyy')}
                            </span>
                            {likes !== undefined && likes > 0 && (
                              <span className="text-xs text-rose-500 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {likes}
                              </span>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {item.tags.slice(0, 2).join(', ')}
                                {item.tags.length > 2 && ` +${item.tags.length - 2}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Load more */}
          {!searchQuery && hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <SortAsc className="w-4 h-4" />}
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExploreContentPage() {
  const [activeTab, setActiveTab] = useState(CONTENT_TYPES[0].key);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Explore', path: '/explore' }, { label: 'Content' }]} />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Content</h1>
        <p className="text-gray-600 mt-1">
          Explore blogs, episodes, documents, books, decks, reviews, and events across the platform
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {CONTENT_TYPES.map(ct => (
            <TabsTrigger key={ct.key} value={ct.key} className="flex items-center gap-1.5 text-xs">
              <span className={ct.iconColor}>{ct.icon}</span>
              {ct.pluralLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONTENT_TYPES.map(ct => (
          <TabsContent key={ct.key} value={ct.key}>
            {activeTab === ct.key && (
              <ContentTypePanel config={ct} initialSort="newest" />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
