import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import JourneyCard, { getDefaultIcon } from './JourneyCard';
import { useJourneyCompletion } from '@/hooks/useJourneyCompletion';
import { toast } from 'sonner';
import { 
  Search, 
  Filter,
  FileText,
  BookOpen,
  Plus,
} from 'lucide-react';

interface ProgramLibraryProps {
  programId: string;
  journeys: Array<{ id: string; title: string }>;
  isAdmin: boolean;
}

interface LibraryItem {
  id: string;
  journey_id: string;
  item_type: 'document' | 'container' | 'event' | 'discussion' | 'resource';
  item_id: string;
  title: string;
  description: string | null;
  order_index: number;
  estimated_time: number | null;
  created_at: string;
  journey_title?: string;
  view_count?: number;
}

export default function ProgramLibrary({ programId, journeys, isAdmin }: ProgramLibraryProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LibraryItem[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJourneyFilter, setSelectedJourneyFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchLibraryItems();
    if (profile) {
      fetchAllCompletions();
    }
  }, [programId, profile]);

  useEffect(() => {
    applyFilters();
  }, [items, searchQuery, selectedJourneyFilter, selectedTypeFilter]);

  const fetchLibraryItems = async () => {
    try {
      setLoading(true);

      // Fetch all journey items for this program
      const { data: journeyItems, error: itemsError } = await supabase
        .from('journey_items')
        .select(`
          *,
          journey:program_journeys!inner(id, title, program_id)
        `)
        .eq('journey.program_id', programId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (itemsError) {
        // Gracefully handle missing table
        if (itemsError.code === 'PGRST205') {
          console.warn('Journey items table not yet created. Please run migration: 20260202000200_create_journey_progress_tracking.sql');
          setItems([]);
          setFilteredItems([]);
          setLoading(false);
          return;
        }
        throw itemsError;
      }

      // Enrich with journey titles
      const enrichedItems = (journeyItems || []).map(item => ({
        ...item,
        journey_title: (item as any).journey?.title || 'Unknown Journey',
      }));

      setItems(enrichedItems);
      setFilteredItems(enrichedItems);
    } catch (error) {
      console.error('Error fetching library items:', error);
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCompletions = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('journey_item_completions')
        .select('item_id, completed, journey_id')
        .eq('user_id', profile.id);

      if (error) {
        // Gracefully handle missing table
        if (error.code === 'PGRST205') {
          console.warn('Journey item completions table not yet created. Please run migration: 20260202000200_create_journey_progress_tracking.sql');
          setCompletions({});
          return;
        }
        throw error;
      }

      const completionMap: Record<string, boolean> = {};
      (data || []).forEach((completion) => {
        completionMap[completion.item_id] = completion.completed;
      });
      setCompletions(completionMap);
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.journey_title?.toLowerCase().includes(query)
      );
    }

    // Journey filter
    if (selectedJourneyFilter !== 'all') {
      filtered = filtered.filter((item) => item.journey_id === selectedJourneyFilter);
    }

    // Type filter
    if (selectedTypeFilter !== 'all') {
      filtered = filtered.filter((item) => item.item_type === selectedTypeFilter);
    }

    setFilteredItems(filtered);
  };

  const handleToggleCompletion = async (itemId: string, journeyId: string, completed: boolean) => {
    if (!profile) {
      toast.error('You must be logged in to mark items complete');
      return;
    }

    try {
      const { error } = await supabase
        .from('journey_item_completions')
        .upsert({
          user_id: profile.id,
          journey_id: journeyId,
          item_id: itemId,
          item_type: items.find(i => i.item_id === itemId)?.item_type || 'document',
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: 'user',
        }, {
          onConflict: 'user_id,item_id,journey_id',
        });

      if (error) throw error;

      setCompletions(prev => ({
        ...prev,
        [itemId]: completed,
      }));

      toast.success(completed ? 'Marked as complete' : 'Marked as incomplete');
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast.error('Failed to update completion status');
    }
  };

  const getPrimaryAction = (item: LibraryItem) => {
    switch (item.item_type) {
      case 'document':
      case 'resource':
        return {
          label: 'View',
          href: `/documents/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'container':
        return {
          label: 'Open',
          href: `/tables/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'event':
        return {
          label: 'View Event',
          href: `/events/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'discussion':
        return {
          label: 'Join Discussion',
          href: `/forums/thread/${item.item_id}`,
          variant: 'default' as const,
        };
      default:
        return undefined;
    }
  };

  const getItemMetadata = (item: LibraryItem) => {
    const meta: string[] = [];
    
    if (item.journey_title) {
      meta.push(`Journey: ${item.journey_title}`);
    }
    
    if (item.estimated_time) {
      meta.push(`${item.estimated_time} min`);
    }
    
    if (item.view_count) {
      meta.push(`${item.view_count} views`);
    }
    
    return meta;
  };

  // Get unique item types for filter
  const uniqueTypes = Array.from(new Set(items.map(item => item.item_type)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Program Library</h2>
            <p className="text-sm text-gray-600">
              {filteredItems.length} {filteredItems.length === 1 ? 'resource' : 'resources'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3">
          {/* Journey Filter */}
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedJourneyFilter} onValueChange={setSelectedJourneyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Journeys" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Journeys</SelectItem>
                {journeys.map((journey) => (
                  <SelectItem key={journey.id} value={journey.id}>
                    {journey.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || selectedJourneyFilter !== 'all' || selectedTypeFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedJourneyFilter('all');
                setSelectedTypeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Resources Found</h3>
            <p className="text-gray-500">
              {searchQuery || selectedJourneyFilter !== 'all' || selectedTypeFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'This program doesn\'t have any resources yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <JourneyCard
              key={item.id}
              itemId={item.item_id}
              journeyId={item.journey_id}
              itemType={item.item_type}
              title={item.title}
              description={item.description || undefined}
              icon={getDefaultIcon(item.item_type)}
              metadata={getItemMetadata(item)}
              isCompleted={completions[item.item_id] || false}
              onToggleCompletion={handleToggleCompletion}
              primaryAction={getPrimaryAction(item)}
              showOrderIndex={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}