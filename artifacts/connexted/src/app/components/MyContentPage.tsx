/**
 * MyContentPage — unified My Favorites
 *
 * Shows every item the user has favorited across all 20+ content
 * and container types, grouped into two sections with type filters.
 * Unfavoriting an item removes it from the list immediately.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';
import {
  Star, BookOpen, FileText, Video, Layers, ListVideo,
  GraduationCap, Rocket, BookCopy, Library, CheckSquare,
  Users, Table as TableIcon, TrendingUp, Presentation,
  Hammer, MessageSquare, Users2, CalendarClock, ExternalLink,
  Bookmark,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

// ── Type registry ──────────────────────────────────────────────────────────

interface FavType {
  contentType: string;   // matches content_favorites.content_type
  table: string;         // Supabase table name
  label: string;
  pluralLabel: string;
  titleField: string;    // column for display name
  slugField?: string;    // if route uses slug instead of id
  route: string;         // base path — item linked as route/slug or route/id
  icon: React.ElementType;
  group: 'content' | 'container';
}

const FAV_TYPES: FavType[] = [
  // ── Content ──
  { contentType: 'episode',   table: 'episodes',   label: 'Episode',   pluralLabel: 'Episodes',   titleField: 'title', route: '/episodes',   icon: Video,          group: 'content' },
  { contentType: 'book',      table: 'books',      label: 'Book',      pluralLabel: 'Books',      titleField: 'title', route: '/books',      icon: BookOpen,       group: 'content' },
  { contentType: 'document',  table: 'documents',  label: 'Document',  pluralLabel: 'Documents',  titleField: 'title', route: '/documents',  icon: FileText,       group: 'content' },
  { contentType: 'playlist',  table: 'playlists',  label: 'Playlist',  pluralLabel: 'Playlists',  titleField: 'name',  slugField: 'slug', route: '/playlists',  icon: ListVideo,      group: 'content' },
  { contentType: 'deck',      table: 'decks',      label: 'Deck',      pluralLabel: 'Decks',      titleField: 'title', route: '/decks',      icon: Layers,         group: 'content' },
  { contentType: 'course',    table: 'courses',    label: 'Course',    pluralLabel: 'Courses',    titleField: 'title', slugField: 'slug', route: '/courses',    icon: GraduationCap,  group: 'content' },
  { contentType: 'program',   table: 'programs',   label: 'Program',   pluralLabel: 'Programs',   titleField: 'name',  slugField: 'slug', route: '/programs',   icon: Rocket,         group: 'content' },
  { contentType: 'magazine',  table: 'magazines',  label: 'Magazine',  pluralLabel: 'Magazines',  titleField: 'name',  route: '/magazines',  icon: BookCopy,       group: 'content' },
  { contentType: 'blog',      table: 'blogs',      label: 'Blog',      pluralLabel: 'Blogs',      titleField: 'title', slugField: 'slug', route: '/blogs',      icon: FileText,       group: 'content' },
  // ── Containers ──
  { contentType: 'circle',    table: 'circles',    label: 'Circle',    pluralLabel: 'Circles',    titleField: 'name',  route: '/circles',    icon: Users,          group: 'container' },
  { contentType: 'table',     table: 'tables',     label: 'Table',     pluralLabel: 'Tables',     titleField: 'name',  slugField: 'slug', route: '/tables',     icon: TableIcon,      group: 'container' },
  { contentType: 'elevator',  table: 'elevators',  label: 'Elevator',  pluralLabel: 'Elevators',  titleField: 'name',  slugField: 'slug', route: '/elevators',  icon: TrendingUp,     group: 'container' },
  { contentType: 'meeting',   table: 'meetings',   label: 'Meeting',   pluralLabel: 'Meetings',   titleField: 'name',  slugField: 'slug', route: '/meetings',   icon: Video,          group: 'container' },
  { contentType: 'pitch',     table: 'pitches',    label: 'Pitch',     pluralLabel: 'Pitches',    titleField: 'name',  slugField: 'slug', route: '/pitches',    icon: Presentation,   group: 'container' },
  { contentType: 'build',     table: 'builds',     label: 'Build',     pluralLabel: 'Builds',     titleField: 'name',  slugField: 'slug', route: '/builds',     icon: Hammer,         group: 'container' },
  { contentType: 'standup',   table: 'standups',   label: 'Standup',   pluralLabel: 'Standups',   titleField: 'name',  slugField: 'slug', route: '/standups',   icon: MessageSquare,  group: 'container' },
  { contentType: 'meetup',    table: 'meetups',    label: 'Meetup',    pluralLabel: 'Meetups',    titleField: 'name',  slugField: 'slug', route: '/meetups',    icon: Users2,         group: 'container' },
  { contentType: 'sprint',    table: 'sprints',    label: 'Sprint',    pluralLabel: 'Sprints',    titleField: 'name',  slugField: 'slug', route: '/sprints',    icon: CalendarClock,  group: 'container' },
  { contentType: 'library',   table: 'libraries',  label: 'Library',   pluralLabel: 'Libraries',  titleField: 'name',  route: '/libraries',  icon: Library,        group: 'container' },
  { contentType: 'checklist', table: 'checklists', label: 'Checklist', pluralLabel: 'Checklists', titleField: 'name',  route: '/checklists', icon: CheckSquare,    group: 'container' },
];

const TYPE_MAP = new Map(FAV_TYPES.map(t => [t.contentType, t]));

interface FavItem {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  href: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MyContentPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);

      // 1. Fetch all favorite records for this user
      const { data: favRows, error } = await supabase
        .from('content_favorites')
        .select('content_id, content_type')
        .eq('user_id', profile.id);
      if (error) throw error;

      if (!favRows || favRows.length === 0) {
        setItems([]);
        return;
      }

      // 2. Group IDs by content_type
      const byType: Record<string, string[]> = {};
      for (const row of favRows) {
        if (!byType[row.content_type]) byType[row.content_type] = [];
        byType[row.content_type].push(row.content_id);
      }

      // 3. For each known type that has favorites, fetch item details
      const fetches = Object.entries(byType).map(async ([contentType, ids]) => {
        const cfg = TYPE_MAP.get(contentType);
        if (!cfg) return [];
        const fields = cfg.slugField
          ? `id, ${cfg.titleField}, description, ${cfg.slugField}`
          : `id, ${cfg.titleField}, description`;
        const { data } = await supabase.from(cfg.table).select(fields).in('id', ids);
        return (data || []).map((row: any): FavItem => {
          const slug = cfg.slugField ? row[cfg.slugField] : null;
          return {
            id: row.id,
            title: row[cfg.titleField] || 'Untitled',
            description: row.description || undefined,
            contentType,
            href: `${cfg.route}/${slug || row.id}`,
          };
        });
      });

      const results = await Promise.allSettled(fetches);
      const allItems: FavItem[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      setItems(allItems);

      // Initialise filters to show all types that have results
      const presentTypes = new Set(allItems.map(i => i.contentType));
      setActiveFilters(presentTypes);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const unfavorite = async (item: FavItem) => {
    if (!profile?.id) return;
    setRemovingId(item.id);
    try {
      const { error } = await supabase
        .from('content_favorites')
        .delete()
        .eq('user_id', profile.id)
        .eq('content_type', item.contentType)
        .eq('content_id', item.id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Removed from favorites');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove favorite');
    } finally {
      setRemovingId(null);
    }
  };

  const toggleFilter = (contentType: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(contentType) ? next.delete(contentType) : next.add(contentType);
      return next;
    });
  };

  const toggleAll = (typesPresent: FavType[]) => {
    const presentTypes = typesPresent.map(t => t.contentType);
    setActiveFilters(prev =>
      prev.size === presentTypes.length
        ? new Set()
        : new Set(presentTypes)
    );
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">Loading favorites...</div>
    );
  }

  // Build filtered display list
  const filtered = items.filter(i => activeFilters.has(i.contentType));

  // Which types actually have items
  const typesPresent = FAV_TYPES.filter(t => items.some(i => i.contentType === t.contentType));
  const contentTypesPresent = typesPresent.filter(t => t.group === 'content');
  const containerTypesPresent = typesPresent.filter(t => t.group === 'container');

  const filteredContent = filtered.filter(i => TYPE_MAP.get(i.contentType)?.group === 'content');
  const filteredContainers = filtered.filter(i => TYPE_MAP.get(i.contentType)?.group === 'container');

  const renderItem = (item: FavItem) => {
    const cfg = TYPE_MAP.get(item.contentType);
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
      <Card key={item.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-400 uppercase tracking-wide">{cfg.label}</span>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{item.title}</p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" asChild>
                <Link to={item.href}><ExternalLink className="w-4 h-4" /></Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unfavorite(item)}
                disabled={removingId === item.id}
                className="text-yellow-500 hover:text-gray-400"
                title="Remove from favorites"
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Favorites' }]} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {items.length} saved item{items.length !== 1 ? 's' : ''} across {typesPresent.length} type{typesPresent.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      {typesPresent.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Filter by type</p>
              <button
                onClick={() => toggleAll(typesPresent)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {activeFilters.size === typesPresent.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {typesPresent.map(t => {
                const Icon = t.icon;
                const count = items.filter(i => i.contentType === t.contentType).length;
                const active = activeFilters.has(t.contentType);
                return (
                  <button
                    key={t.contentType}
                    onClick={() => toggleFilter(t.contentType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                      ${active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                  >
                    <Icon className="w-3 h-3" />
                    {t.pluralLabel}
                    <span className={`ml-0.5 ${active ? 'opacity-80' : 'text-gray-400'}`}>({count})</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content section */}
      {filteredContent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Content — {filteredContent.length} item{filteredContent.length !== 1 ? 's' : ''}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredContent.map(renderItem)}
          </div>
        </div>
      )}

      {/* Containers section */}
      {filteredContainers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Containers — {filteredContainers.length} item{filteredContainers.length !== 1 ? 's' : ''}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredContainers.map(renderItem)}
          </div>
        </div>
      )}

      {/* Empty — no favorites at all */}
      {items.length === 0 && (
        <Card className="py-16 text-center">
          <CardContent>
            <Star className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No favorites yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
              Tap the bookmark icon on any episode, book, circle, document, or other content to save it here for quick access.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="default" size="sm" asChild>
                <Link to="/explore">Explore</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/circles">Browse Circles</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All active filters deselected but have items */}
      {items.length > 0 && filtered.length === 0 && (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-sm text-gray-500">All filters are deselected. Choose a type above to see results.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
