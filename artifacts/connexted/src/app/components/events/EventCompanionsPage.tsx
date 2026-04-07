import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  CalendarDays,
  Layers,
  Trash2,
} from 'lucide-react';

interface EventCompanion {
  id: string;
  name: string;
  event_id: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  event?: { id: string; title: string; start_time: string } | null;
  creator?: { id: string; name: string } | null;
  item_count?: number;
}

export default function EventCompanionsPage() {
  const { profile } = useAuth();
  const [companions, setCompanions] = useState<EventCompanion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanions();
  }, []);

  async function fetchCompanions() {
    try {
      const { data, error } = await supabase
        .from('event_companions')
        .select(`
          *,
          event:events!event_companions_event_id_fkey(id, title, start_time),
          creator:users!event_companions_created_by_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const companionIds = (data || []).map((c: any) => c.id);
      let itemCounts: Record<string, number> = {};
      if (companionIds.length > 0) {
        const { data: items } = await supabase
          .from('event_companion_items')
          .select('companion_id')
          .in('companion_id', companionIds);

        if (items) {
          for (const item of items) {
            itemCounts[item.companion_id] = (itemCounts[item.companion_id] || 0) + 1;
          }
        }
      }

      setCompanions(
        (data || []).map((c: any) => ({ ...c, item_count: itemCounts[c.id] || 0 }))
      );
    } catch (err: any) {
      console.error('Error fetching companions:', err);
      toast.error('Failed to load event companions');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event companion?')) return;
    try {
      const { error } = await supabase.from('event_companions').delete().eq('id', id);
      if (error) throw error;
      setCompanions((prev) => prev.filter((c) => c.id !== id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  }

  const filtered = companions.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.event?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Event Companions' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Companions</h1>
          <p className="text-gray-500 mt-1">
            Bundle tables, elevators, pitches, and more with your events
          </p>
        </div>
        <Button asChild>
          <Link to="/event-companions/new">
            <Plus className="w-4 h-4 mr-2" /> New Companion
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search companions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {search ? 'No companions match your search' : 'No event companions yet'}
            </p>
            {!search && (
              <Button asChild className="mt-4" size="sm">
                <Link to="/event-companions/new">Create your first companion</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((companion) => (
            <Link key={companion.id} to={`/event-companions/${companion.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{companion.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-500 -mt-1 -mr-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(companion.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {companion.event && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <CalendarDays className="w-4 h-4 text-blue-500" />
                      <span className="line-clamp-1">{companion.event.title}</span>
                    </div>
                  )}

                  {companion.event?.start_time && (
                    <p className="text-xs text-gray-400 mb-3">
                      {new Date(companion.event.start_time).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {companion.item_count || 0} {companion.item_count === 1 ? 'item' : 'items'}
                    </Badge>
                    {companion.creator && (
                      <span className="text-xs text-gray-400">by {companion.creator.name}</span>
                    )}
                  </div>

                  {companion.notes && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{companion.notes}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
