import { useState,useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Checkbox } from '@/app/components/ui/checkbox';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import {
  Zap,
  Calendar,
  Users,
  CheckSquare,
  Settings,
  Plus,
  Trash,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface Sprint {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  admin_ids: string[];
  member_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  slug: string;
}

interface Checklist {
  id: string;
  name: string;
  description: string;
  category: string;
  is_template: boolean;
  items?: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  is_complete: boolean;
  assignment: string;
  notes: string;
  priority: number;
}

interface SprintChecklist {
  id: string;
  sprint_id: string;
  checklist_id: string;
  added_at: string;
  display_order: number;
  checklist: Checklist;
}

export default function SprintDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [sprintChecklists, setSprintChecklists] = useState<SprintChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChecklistDialog, setShowAddChecklistDialog] = useState(false);
  const [availableChecklists, setAvailableChecklists] = useState<Checklist[]>([]);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [addingChecklists, setAddingChecklists] = useState(false);

  useEffect(() => {
    if (slug && profile) {
      fetchSprint();
    }
  }, [slug, profile]);

  useEffect(() => {
    if (showAddChecklistDialog) {
      fetchAvailableChecklists();
      setSelectedChecklistIds(new Set());
      setSearchQuery('');
    }
  }, [showAddChecklistDialog]);

  const fetchSprint = async () => {
    if (!slug) return;

    setLoading(true);
    try {
      // Try to fetch sprint by slug first, then fall back to id if slug doesn't exist
      let sprintData;
      let sprintError;
      
      // First, try by slug
      const slugResult = await supabase
        .from('sprints')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (slugResult.error && slugResult.error.code === '42703') {
        // Slug column doesn't exist, try by id
        const idResult = await supabase
          .from('sprints')
          .select('*')
          .eq('id', slug)
          .single();
        
        sprintData = idResult.data;
        sprintError = idResult.error;
      } else {
        sprintData = slugResult.data;
        sprintError = slugResult.error;
      }

      if (sprintError) throw sprintError;
      if (!sprintData) {
        toast.error('Sprint not found');
        navigate('/sprints');
        return;
      }
      
      setSprint(sprintData);

      // Fetch sprint checklists using the sprint id
      const { data: sprintChecklistsData, error: scError } = await supabase
        .from('sprint_checklists')
        .select('*, checklist:checklists(*)')
        .eq('sprint_id', sprintData.id)
        .order('display_order');

      if (scError) throw scError;

      // Fetch all checklist items for these checklists
      const checklistIds = sprintChecklistsData.map((sc: any) => sc.checklist.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('priority');

      if (itemsError) throw itemsError;

      // Combine checklists with their items
      const checklistsWithItems = sprintChecklistsData.map((sc: any) => ({
        ...sc,
        checklist: {
          ...sc.checklist,
          items: itemsData.filter((item) => item.checklist_id === sc.checklist.id),
        },
      }));

      setSprintChecklists(checklistsWithItems);
    } catch (error) {
      console.error('Error fetching sprint:', error);
      toast.error('Failed to load sprint');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveChecklist = async (sprintChecklistId: string, checklistName: string) => {
    if (
      !confirm(
        `Remove "${checklistName}" from this sprint? The list and its items will remain in the system.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sprint_checklists')
        .delete()
        .eq('id', sprintChecklistId);

      if (error) throw error;

      toast.success('List removed from sprint');
      fetchSprint();
    } catch (error) {
      console.error('Error removing checklist:', error);
      toast.error('Failed to remove list');
    }
  };

  const getSprintStatus = (sprint: Sprint): 'upcoming' | 'active' | 'completed' => {
    const now = new Date();
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);

    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'active';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCompletionPercentage = (items: ChecklistItem[] = []) => {
    if (items.length === 0) return 0;
    const completed = items.filter((item) => item.is_complete).length;
    return Math.round((completed / items.length) * 100);
  };

  const getTotalStats = () => {
    const allItems = sprintChecklists.flatMap((sc) => sc.checklist.items || []);
    const completedItems = allItems.filter((item) => item.is_complete).length;
    return {
      totalItems: allItems.length,
      completedItems,
      percentage:
        allItems.length > 0 ? Math.round((completedItems / allItems.length) * 100) : 0,
    };
  };

  const fetchAvailableChecklists = async () => {
    try {
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('checklists')
        .select('*')
        .order('name');

      if (checklistsError) throw checklistsError;

      setAvailableChecklists(checklistsData);
    } catch (error) {
      console.error('Error fetching available checklists:', error);
      toast.error('Failed to load available lists');
    }
  };

  const handleAddChecklist = async () => {
    if (addingChecklists) return;
    setAddingChecklists(true);

    try {
      const checklistIds = Array.from(selectedChecklistIds);
      const { data: sprintChecklistsData, error: scError } = await supabase
        .from('sprint_checklists')
        .insert(
          checklistIds.map((checklistId, index) => ({
            sprint_id: sprint?.id,
            checklist_id: checklistId,
            added_at: new Date().toISOString(),
            display_order: index + 1,
          }))
        )
        .select('*, checklist:checklists(*)');

      if (scError) throw scError;

      // Fetch all checklist items for these checklists
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('priority');

      if (itemsError) throw itemsError;

      // Combine checklists with their items
      const checklistsWithItems = sprintChecklistsData.map((sc: any) => ({
        ...sc,
        checklist: {
          ...sc.checklist,
          items: itemsData.filter((item) => item.checklist_id === sc.checklist.id),
        },
      }));

      setSprintChecklists(checklistsWithItems);
      toast.success('Lists added to sprint');
      setShowAddChecklistDialog(false);
    } catch (error) {
      console.error('Error adding checklists:', error);
      toast.error('Failed to add lists');
    } finally {
      setAddingChecklists(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 mt-4">Loading sprint...</p>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-12">
        <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sprint not found</h3>
        <Button asChild>
          <Link to="/sprints">Back to Sprints</Link>
        </Button>
      </div>
    );
  }

  const status = getSprintStatus(sprint);
  const isAdmin = profile && (
    sprint.admin_ids?.includes(profile.id) ||
    sprint.created_by === profile.id ||
    profile.role === 'super'
  );
  const isMember = profile && sprint.member_ids.includes(profile.id);

  // Gate: non-members cannot view private/member-only sprints
  if (profile && !canViewContainer(profile, sprint, 'sprints')) {
    return <Navigate to="/sprints" replace />;
  }

  const daysRemaining = getDaysRemaining(sprint.end_date);
  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sprints', path: '/sprints' },
          { label: sprint.name },
        ]}
      />

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-indigo-600" />
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900">{sprint.name}</h1>
                <Badge
                  variant={
                    status === 'active'
                      ? 'default'
                      : status === 'upcoming'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {status}
                </Badge>
                {isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    Admin
                  </Badge>
                )}
                {isMember && !isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    Member
                  </Badge>
                )}
              </div>
              {sprint.description && <p className="text-gray-600">{sprint.description}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            {sprint.created_by && sprint.created_by !== profile.id && (
              <PrivateCommentDialog
                containerType="sprint"
                containerId={sprint.id}
                containerTitle={sprint.name}
                recipientId={sprint.created_by}
                recipientName="the creator"
              />
            )}
            {isAdmin && (
              <Link to={`/sprints/${sprint.slug}/settings`}>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
            </span>
          </div>
          {status === 'active' && daysRemaining > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>
              {sprint.member_ids.length} member{sprint.member_ids.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Overall Progress */}
        {stats.totalItems > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Overall Progress: {stats.completedItems} / {stats.totalItems} tasks completed
              </span>
              <span className="font-semibold">{stats.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  status === 'active'
                    ? 'bg-indigo-600'
                    : status === 'completed'
                    ? 'bg-green-600'
                    : 'bg-gray-400'
                }`}
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Checklists */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Lists ({sprintChecklists.length})
          </h2>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowAddChecklistDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add List
            </Button>
          )}
        </div>

        {sprintChecklists.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lists yet</h3>
            <p className="text-gray-600 mb-4">Add lists to track progress in this sprint</p>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowAddChecklistDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add List
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sprintChecklists.map((sc) => {
              const checklist = sc.checklist;
              const items = checklist.items || [];
              const completedItems = items.filter((item) => item.is_complete).length;
              const percentage = getCompletionPercentage(items);

              return (
                <div
                  key={sc.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Link
                      to={`/checklists/${checklist.id}`}
                      className="flex-1 group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                          {checklist.name}
                        </h3>
                        {checklist.category && (
                          <Badge variant="secondary" className="text-xs">
                            {checklist.category}
                          </Badge>
                        )}
                      </div>
                      {checklist.description && (
                        <p className="text-sm text-gray-600 ml-7">{checklist.description}</p>
                      )}
                    </Link>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChecklist(sc.id, checklist.name)}
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  {/* Progress */}
                  {items.length > 0 && (
                    <div className="ml-7 space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                          {completedItems} / {items.length} completed
                        </span>
                        <span className="font-semibold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Sample items preview */}
                      <div className="mt-3 space-y-1">
                        {items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            {item.is_complete ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span
                              className={`flex-1 ${
                                item.is_complete ? 'line-through text-gray-500' : 'text-gray-700'
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                        {items.length > 3 && (
                          <Link
                            to={`/checklists/${checklist.id}`}
                            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mt-2"
                          >
                            <span>View all {items.length} items</span>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {items.length === 0 && (
                    <p className="text-sm text-gray-500 ml-7">No items in this list</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Checklist Dialog */}
      <Dialog open={showAddChecklistDialog} onOpenChange={setShowAddChecklistDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Lists to Sprint</DialogTitle>
            <DialogDescription>
              Select lists to add to this sprint. You can add multiple lists at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              {availableChecklists
                .filter((checklist) =>
                  checklist.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((checklist) => (
                  <div key={checklist.id} className="flex items-center gap-2">
                    <Checkbox
                      id={checklist.id}
                      checked={selectedChecklistIds.has(checklist.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedChecklistIds);
                        if (checked) {
                          newSet.add(checklist.id);
                        } else {
                          newSet.delete(checklist.id);
                        }
                        setSelectedChecklistIds(newSet);
                      }}
                    />
                    <label
                      htmlFor={checklist.id}
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      {checklist.name}
                    </label>
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddChecklistDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddChecklist}
              disabled={addingChecklists}
            >
              {addingChecklists ? 'Adding...' : 'Add Lists'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}