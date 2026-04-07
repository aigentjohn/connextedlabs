import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import JourneyCard, { getDefaultIcon } from './JourneyCard';
import { useJourneyCompletion } from '@/hooks/useJourneyCompletion';
import { toast } from 'sonner';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';

interface JourneyItem {
  id: string;
  journey_id: string;
  item_type: 'document' | 'book' | 'deck' | 'shelf' | 'playlist' | 'magazine' | 'episode' | 'table' | 'elevator' | 'pitch' | 'build' | 'standup' | 'meetup' | 'sprint' | 'checklist' | 'event' | 'discussion' | 'resource' | 'container';
  item_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  icon: string | null;
  estimated_time: number | null;
}

interface JourneyCompletion {
  item_id: string;
  completed: boolean;
}

interface JourneyContentGridProps {
  journeyId: string;
  programId: string;
  isAdmin: boolean;
  onAddContent?: () => void;
  onCreateContainer?: () => void;
}

export default function JourneyContentGrid({
  journeyId,
  programId,
  isAdmin,
  onAddContent,
  onCreateContainer,
}: JourneyContentGridProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<JourneyItem[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Fetch journey items
  useEffect(() => {
    if (journeyId) {
      fetchJourneyItems();
      if (profile) {
        fetchCompletions();
      }
    }
  }, [journeyId, profile]);

  const fetchJourneyItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journey_items')
        .select('*')
        .eq('journey_id', journeyId)
        .eq('is_published', true) // Only show published items to non-admins
        .order('order_index', { ascending: true });

      if (error) {
        // Gracefully handle missing table
        if (error.code === 'PGRST205') {
          console.warn('Journey items table not yet created. Please run migration: 20260202000200_create_journey_progress_tracking.sql');
          setItems([]);
          return;
        }
        throw error;
      }
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching journey items:', error);
      toast.error('Failed to load journey content');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletions = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('journey_item_completions')
        .select('item_id, completed')
        .eq('user_id', profile.id)
        .eq('journey_id', journeyId);

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

  const handleToggleCompletion = async (itemId: string, journeyId: string, completed: boolean) => {
    if (!profile) {
      toast.error('You must be logged in to mark items complete');
      return;
    }

    try {
      // Upsert completion record
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

      // Update local state
      setCompletions(prev => ({
        ...prev,
        [itemId]: completed,
      }));

      toast.success(completed ? 'Marked as complete' : 'Marked as incomplete');

      // Refresh completions to get updated progress
      await fetchCompletions();
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast.error('Failed to update completion status');
    }
  };

  const getItemMetadata = (item: JourneyItem) => {
    const meta: string[] = [];
    
    if (item.estimated_time) {
      meta.push(`${item.estimated_time} min`);
    }
    
    meta.push(item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1));
    
    return meta;
  };

  const getPrimaryAction = (item: JourneyItem) => {
    switch (item.item_type) {
      // Content types
      case 'document':
        return {
          label: 'View Document',
          href: `/documents/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'book':
        return {
          label: 'Read Book',
          href: `/books/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'deck':
        return {
          label: 'View Deck',
          href: `/decks/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'shelf':
        return {
          label: 'Browse Library',
          href: `/libraries/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'playlist':
        return {
          label: 'View Playlist',
          href: `/playlists/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'magazine':
        return {
          label: 'Read Magazine',
          href: `/magazines/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'episode':
        return {
          label: 'Watch Episode',
          href: `/episodes/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'checklist':
        return {
          label: 'Open List',
          href: `/checklists/${item.item_id}`,
          variant: 'default' as const,
        };
      
      // Container types
      case 'table':
        return {
          label: 'Open Table',
          href: `/tables/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'elevator':
        return {
          label: 'Join Elevator',
          href: `/elevators/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'pitch':
        return {
          label: 'View Pitch',
          href: `/pitches/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'build':
        return {
          label: 'Open Build',
          href: `/builds/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'standup':
        return {
          label: 'Join Standup',
          href: `/standups/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'meetup':
        return {
          label: 'View Meetup',
          href: `/meetups/${item.item_id}`,
          variant: 'default' as const,
        };
      case 'sprint':
        return {
          label: 'Open Sprint',
          href: `/sprints/${item.item_id}`,
          variant: 'default' as const,
        };
      
      // Other types
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
      case 'resource':
        return {
          label: 'View Resource',
          href: `/documents/${item.item_id}`,
          variant: 'default' as const,
        };
      
      // Legacy container type (fallback to tables)
      case 'container':
        return {
          label: 'Open',
          href: `/tables/${item.item_id}`,
          variant: 'default' as const,
        };
      
      default:
        return undefined;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isAdmin ? 'No Content Yet' : 'No Content Available'}
            </h3>
            <p className="text-gray-500 mb-4">
              {isAdmin
                ? 'Start building this journey by adding content like documents, events, and containers.'
                : 'The program leader hasn\'t added content to this journey yet.'}
            </p>
            {isAdmin && onAddContent && (
              <Button onClick={onAddContent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <JourneyCard
            key={item.id}
            itemId={item.item_id}
            journeyId={item.journey_id}
            itemType={item.item_type}
            title={item.title}
            description={item.description || undefined}
            icon={item.icon ? getDefaultIcon(item.item_type) : undefined}
            metadata={getItemMetadata(item)}
            isCompleted={completions[item.item_id] || false}
            orderIndex={item.order_index}
            onToggleCompletion={handleToggleCompletion}
            primaryAction={getPrimaryAction(item)}
            showOrderIndex={isAdmin}
          />
        ))}
      </div>

      {/* Add Content Button for Admins */}
      {isAdmin && onAddContent && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={onAddContent}>
            <Plus className="w-4 h-4 mr-2" />
            Add More Content
          </Button>
        </div>
      )}
    </div>
  );
}