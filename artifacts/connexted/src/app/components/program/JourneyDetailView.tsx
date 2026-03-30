// Split candidate: ~618 lines — consider extracting JourneyItemList, JourneyItemEditor, and JourneyCompletionBar into sub-components.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { 
  ArrowLeft,
  CheckCircle2,
  FileText,
  BookOpen,
  Presentation,
  Library,
  PlayCircle,
  Table as TableIcon,
  Hammer,
  MessageSquare,
  Handshake,
  CalendarClock,
  Users,
  Calendar,
  Target,
  Clock,
  Plus,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { JourneyInlineViewer } from '@/app/components/journey/JourneyInlineViewer';

interface JourneyItem {
  id: string;
  journey_id: string;
  item_type: 'document' | 'book' | 'deck' | 'shelf' | 'playlist' |
              'build' | 'pitch' | 'table' | 'elevator' | 'standup' | 'meetup' | 'sprint' |
              'event' | 'discussion' | 'resource' | 'container' |
              'magazine' | 'episode' | 'checklist';
  item_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  icon: string | null;
  estimated_time: number | null;
}

interface Journey {
  id: string;
  program_id?: string;
  course_id?: string;
  title: string;
  description: string;
  order_index: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface JourneyProgress {
  journey_id: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface JourneyDetailViewProps {
  journey: Journey;
  journeyProgress: JourneyProgress | undefined;
  onBack: () => void;
  isAdmin: boolean;
  onAddContent?: () => void;
  coursePlayerMode?: boolean;
  onProgressChange?: () => void;
  onNextModule?: () => void;
  isLastModule?: boolean;
}

const getItemIcon = (itemType: string) => {
  switch (itemType) {
    case 'document':
      return <FileText className="w-5 h-5 text-blue-600" />;
    case 'book':
      return <BookOpen className="w-5 h-5 text-purple-600" />;
    case 'deck':
      return <Presentation className="w-5 h-5 text-orange-600" />;
    case 'shelf':
      return <Library className="w-5 h-5 text-green-600" />;
    case 'playlist':
      return <PlayCircle className="w-5 h-5 text-blue-600" />;
    case 'table':
      return <TableIcon className="w-5 h-5 text-indigo-600" />;
    case 'elevator':
      return <Hammer className="w-5 h-5 text-red-600" />;
    case 'pitch':
      return <MessageSquare className="w-5 h-5 text-yellow-600" />;
    case 'build':
      return <Handshake className="w-5 h-5 text-blue-600" />;
    case 'standup':
      return <Users className="w-5 h-5 text-green-600" />;
    case 'meetup':
      return <CalendarClock className="w-5 h-5 text-purple-600" />;
    case 'sprint':
      return <Target className="w-5 h-5 text-orange-600" />;
    case 'event':
      return <Calendar className="w-5 h-5 text-blue-600" />;
    case 'discussion':
      return <MessageSquare className="w-5 h-5 text-green-600" />;
    case 'magazine':
      return <BookOpen className="w-5 h-5 text-pink-600" />;
    case 'episode':
      return <PlayCircle className="w-5 h-5 text-red-600" />;
    case 'checklist':
      return <CheckCircle2 className="w-5 h-5 text-teal-600" />;
    default:
      return <FileText className="w-5 h-5 text-gray-600" />;
  }
};

const getItemTypeLabel = (itemType: string) => {
  // Handle multi-word types (e.g., 'text_lesson' → 'Text Lesson')
  return itemType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const isContentType = (itemType: string) => {
  return ['document', 'book', 'deck', 'shelf', 'playlist', 'magazine', 'episode', 'checklist'].includes(itemType);
};

const isActivityType = (itemType: string) => {
  return ['table', 'elevator', 'pitch', 'build', 'standup', 'meetup', 'sprint'].includes(itemType);
};

// Route configuration for navigating to item detail pages
// paramType: 'id' = route uses UUID, 'slug' = route needs slug lookup
const ITEM_ROUTE_CONFIG: Record<string, { table: string; route: string; paramType: 'id' | 'slug' }> = {
  document: { table: 'documents', route: '/documents', paramType: 'id' },
  book: { table: 'books', route: '/books', paramType: 'id' },
  deck: { table: 'decks', route: '/decks', paramType: 'id' },
  shelf: { table: 'libraries', route: '/libraries', paramType: 'id' },
  playlist: { table: 'playlists', route: '/playlists', paramType: 'slug' },
  build: { table: 'builds', route: '/builds', paramType: 'slug' },
  pitch: { table: 'pitches', route: '/pitches', paramType: 'slug' },
  table: { table: 'tables', route: '/tables', paramType: 'slug' },
  elevator: { table: 'elevators', route: '/elevators', paramType: 'slug' },
  standup: { table: 'standups', route: '/standups', paramType: 'slug' },
  meetup: { table: 'meetups', route: '/meetups', paramType: 'slug' },
  sprint: { table: 'sprints', route: '/sprints', paramType: 'slug' },
  event: { table: 'events', route: '/events', paramType: 'id' },
  episode: { table: 'episodes', route: '/episodes', paramType: 'id' },
  checklist: { table: 'checklists', route: '/checklists', paramType: 'id' },
  magazine: { table: 'magazines', route: '/magazines', paramType: 'id' },
};

export function JourneyDetailView({
  journey,
  journeyProgress,
  onBack,
  isAdmin,
  onAddContent,
  coursePlayerMode = false,
  onProgressChange,
  onNextModule,
  isLastModule = false,
}: JourneyDetailViewProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<JourneyItem[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [navigatingItemId, setNavigatingItemId] = useState<string | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (journey.id) {
      fetchJourneyItems();
      if (profile) {
        fetchCompletions();
      }
    }
  }, [journey.id, profile]);

  // Auto-expand first uncompleted content item once items + completions are loaded
  useEffect(() => {
    if (items.length > 0 && expandedItemIds.size === 0) {
      const firstUncompleted = items.find(
        (item) => isContentType(item.item_type) && !completions[item.id]
      );
      if (firstUncompleted) {
        setExpandedItemIds(new Set([firstUncompleted.id]));
      }
    }
  }, [items, completions]);

  const fetchJourneyItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journey_items')
        .select('*')
        .eq('journey_id', journey.id)
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Journey items table not yet created.');
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
        .eq('journey_id', journey.id);

      if (error) {
        if (error.code === 'PGRST205') {
          setCompletions({});
          return;
        }
        throw error;
      }

      const completionMap: Record<string, boolean> = {};
      (data || []).forEach((c) => {
        completionMap[c.item_id] = c.completed;
      });
      setCompletions(completionMap);
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  };

  const handleToggleCompletion = async (itemId: string) => {
    if (!profile) return;

    const isCompleted = completions[itemId] || false;
    const newCompletionState = !isCompleted;

    // Optimistic update
    setCompletions((prev) => ({
      ...prev,
      [itemId]: newCompletionState,
    }));

    try {
      if (newCompletionState) {
        // Mark as complete
        const { error } = await supabase
          .from('journey_item_completions')
          .upsert({
            user_id: profile.id,
            journey_id: journey.id,
            item_id: itemId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        if (error) throw error;
        toast.success('Item marked as complete');
      } else {
        // Mark as incomplete
        const { error } = await supabase
          .from('journey_item_completions')
          .delete()
          .eq('user_id', profile.id)
          .eq('journey_id', journey.id)
          .eq('item_id', itemId);
        if (error) throw error;
        toast.success('Item marked as incomplete');
      }

      // Notify parent to refresh sidebar progress
      onProgressChange?.();
    } catch (error) {
      console.error('Error updating completion:', error);
      // Revert on error
      setCompletions((prev) => ({
        ...prev,
        [itemId]: isCompleted,
      }));
      toast.error('Failed to update completion status');
    }
  };

  // "Mark Complete & Continue" — marks current item done, collapses it, opens next uncompleted item
  const handleCompleteAndContinue = async (itemId: string) => {
    if (completions[itemId]) return; // already complete
    await handleToggleCompletion(itemId);

    // Collapse this item
    setExpandedItemIds((prev) => {
      const next = new Set([...prev].filter((id) => id !== itemId));
      // Find and expand the next uncompleted content item
      const currentIdx = items.findIndex((i) => i.id === itemId);
      const nextItem = items.slice(currentIdx + 1).find(
        (i) => isContentType(i.item_type) && !completions[i.id] && i.id !== itemId
      );
      if (nextItem) {
        next.add(nextItem.id);
        // Scroll the next item into view after a tick
        setTimeout(() => {
          document.getElementById(`journey-item-${nextItem.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      return next;
    });
  };

  const handleItemClick = async (item: JourneyItem) => {
    const config = ITEM_ROUTE_CONFIG[item.item_type];
    if (!config) {
      toast.info(`Opening ${item.title}...`);
      return;
    }

    // For ID-based routes, navigate directly
    if (config.paramType === 'id') {
      navigate(`${config.route}/${item.item_id}`);
      return;
    }

    // For slug-based routes, look up the slug first
    setNavigatingItemId(item.id);
    try {
      const { data, error } = await supabase
        .from(config.table)
        .select('slug')
        .eq('id', item.item_id)
        .single();

      if (error || !data?.slug) {
        toast.error(`Could not find ${item.title}`);
        return;
      }

      navigate(`${config.route}/${data.slug}`);
    } catch (error) {
      console.error('Error navigating to item:', error);
      toast.error(`Failed to open ${item.title}`);
    } finally {
      setNavigatingItemId(null);
    }
  };

  const completionPercentage = journeyProgress?.completion_percentage || 0;
  const completedItems = journeyProgress?.completed_items || 0;
  const totalItems = journeyProgress?.total_items || items.length;

  // Compute local completion counts (more responsive than waiting for parent re-fetch)
  const localCompletedCount = Object.values(completions).filter(Boolean).length;
  const allItemsComplete = items.length > 0 && localCompletedCount >= items.length;

  return (
    <div className={coursePlayerMode ? "py-4" : "py-8"}>
      {/* Back Button — only show outside course player */}
      {!coursePlayerMode && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Journeys
        </Button>
      )}

      {/* Journey Header */}
      <div className="mb-8">
        {!coursePlayerMode && (
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{journey.title}</h2>
        )}
        {journey.description && (
          <p className="text-gray-600 mb-4">{journey.description}</p>
        )}

        {/* Progress Bar */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Journey Progress
            </span>
            <span className="text-sm font-semibold text-blue-700">
              {completedItems} of {totalItems} completed • {Math.round(completionPercentage)}%
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Journey Items List */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">
          Loading journey content...
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content Yet</h3>
            <p className="text-gray-600 mb-4">
              This journey doesn't have any content yet.
            </p>
            {isAdmin && onAddContent && (
              <Button onClick={onAddContent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const isCompleted = completions[item.id] || false;
            
            return (
              <Card
                key={item.id}
                id={`journey-item-${item.id}`}
                className={`transition-all duration-200 hover:shadow-md ${
                  expandedItemIds.has(item.id)
                    ? 'ring-2 ring-blue-200 shadow-md'
                    : ''
                } ${
                  isCompleted ? 'bg-green-50/50 border-green-200' : 'bg-white'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Completion Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      {profile ? (
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => handleToggleCompletion(item.id)}
                          className="w-5 h-5"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded border-2 border-gray-300" />
                      )}
                    </div>

                    {/* Item Number & Icon */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-500">
                          {index + 1}.
                        </span>
                        {getItemIcon(item.item_type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className={`font-semibold text-gray-900 mb-1 ${isCompleted ? 'line-through text-gray-600' : ''}`}>
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {getItemTypeLabel(item.item_type)}
                            </Badge>
                            {item.estimated_time && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {item.estimated_time} min
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="text-xs bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Complete
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          <Button
                            variant={expandedItemIds.has(item.id) ? 'secondary' : (isCompleted ? 'outline' : 'default')}
                            size="sm"
                            onClick={() => {
                              setExpandedItemIds(
                                expandedItemIds.has(item.id)
                                  ? new Set([...expandedItemIds].filter(id => id !== item.id))
                                  : new Set([...expandedItemIds, item.id])
                              );
                            }}
                          >
                            {expandedItemIds.has(item.id) ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Close
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                {isActivityType(item.item_type) ? 'Preview' : 'View'}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleItemClick(item)}
                            disabled={navigatingItemId === item.id}
                            title="Open full page"
                            className="px-2 text-gray-500 hover:text-blue-600"
                          >
                            {navigatingItemId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ExternalLink className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline Content Viewer */}
                  {expandedItemIds.has(item.id) && (
                    <div>
                      <JourneyInlineViewer
                        itemType={item.item_type}
                        itemId={item.item_id}
                        title={item.title}
                        onClose={() => setExpandedItemIds(new Set([...expandedItemIds].filter(id => id !== item.id)))}
                      />

                      {/* "Mark Complete & Continue" button — only in course player, only for uncompleted content items */}
                      {coursePlayerMode && !isCompleted && isContentType(item.item_type) && (
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleCompleteAndContinue(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Mark Complete & Continue
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Module Complete Banner — shown in course player when all items are done */}
      {coursePlayerMode && allItemsComplete && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-center">
          <PartyPopper className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-green-900 mb-1">Module Complete!</h3>
          <p className="text-sm text-green-700 mb-4">
            {isLastModule
              ? "You've finished the last module — head back to Course Home to see your achievement."
              : "Great work! Ready to continue to the next module?"
            }
          </p>
          {onNextModule && !isLastModule ? (
            <Button onClick={onNextModule} className="bg-green-600 hover:bg-green-700">
              Continue to Next Module
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : null}
        </div>
      )}

      {/* Admin Actions */}
      {isAdmin && items.length > 0 && onAddContent && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onAddContent}>
            <Plus className="w-4 h-4 mr-2" />
            Add More Content
          </Button>
        </div>
      )}
    </div>
  );
}