import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { CheckSquare, Plus, Search, Filter, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';

interface Checklist {
  id: string;
  name: string;
  description: string;
  category: string;
  is_template: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: ChecklistItem[];
  creator?: {
    id: string;
    name: string;
    avatar: string;
  };
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

export default function ChecklistsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showTemplatesOnly, setShowTemplatesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [likeCountsMap, setLikeCountsMap] = useState<Record<string, number>>({});
  const [likedByMeSet, setLikedByMeSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      fetchChecklists();
    }
  }, [profile]);

  const fetchChecklists = async () => {
    setLoading(true);
    try {
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('checklists')
        .select(`
          *,
          creator:created_by(id, name, avatar)
        `)
        .order('created_at', { ascending: false });

      if (checklistsError) {
        if (checklistsError.code === 'PGRST205' || checklistsError.message?.includes('Could not find the table')) {
          navigate('/checklists/setup');
          return;
        }
        throw checklistsError;
      }

      const checklistsWithCreator = checklistsData.map((checklist) => ({
        ...checklist,
        creator: Array.isArray(checklist.creator) ? checklist.creator[0] : checklist.creator
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .order('priority');

      if (itemsError) throw itemsError;

      const checklistsWithItems = checklistsWithCreator.map((checklist) => ({
        ...checklist,
        items: itemsData.filter((item) => item.checklist_id === checklist.id),
      }));

      setChecklists(checklistsWithItems);

      // Fetch likes
      if (checklistsWithItems.length > 0 && profile) {
        const ids = checklistsWithItems.map(c => c.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', 'checklist')
          .in('content_id', ids);

        const counts: Record<string, number> = {};
        const likedMe = new Set<string>();
        (likesData || []).forEach((like: { content_id: string; user_id: string }) => {
          counts[like.content_id] = (counts[like.content_id] || 0) + 1;
          if (like.user_id === profile.id) likedMe.add(like.content_id);
        });
        setLikeCountsMap(counts);
        setLikedByMeSet(likedMe);
      }
    } catch (error) {
      console.error('Error fetching checklists:', error);
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredChecklists = () => {
    return checklists.filter((checklist) => {
      const matchesSearch =
        checklist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checklist.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || checklist.category === filterCategory;
      
      const matchesTemplateFilter = !showTemplatesOnly || checklist.is_template;

      return matchesSearch && matchesCategory && matchesTemplateFilter;
    });
  };

  const filteredChecklists = getFilteredChecklists();
  
  const sortedChecklists = [...filteredChecklists].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (likeCountsMap[b.id] || 0) - (likeCountsMap[a.id] || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const categories = Array.from(new Set(checklists.map((c) => c.category).filter(Boolean)));

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('onboard')) return '🚀';
    if (lower.includes('sprint')) return '⚡';
    if (lower.includes('project')) return '📋';
    if (lower.includes('goal')) return '🎯';
    if (lower.includes('review')) return '👀';
    if (lower.includes('launch')) return '🎉';
    if (lower.includes('setup')) return '⚙️';
    if (lower.includes('meeting')) return '📅';
    return '✓';
  };

  const getCompletionPercentage = (items: ChecklistItem[] = []) => {
    if (items.length === 0) return 0;
    const completed = items.filter((item) => item.is_complete).length;
    return Math.round((completed / items.length) * 100);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 mt-4">Loading checklists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Lists' }]}
        icon={CheckSquare}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title="Lists"
        description="Create and manage lists for your sprints"
        actions={
          <Button asChild>
            <Link to="/checklists/new">
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant={showTemplatesOnly ? 'default' : 'outline'}
            onClick={() => setShowTemplatesOnly(!showTemplatesOnly)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Templates Only
          </Button>
        </div>

        {/* Category Pills - matching DocumentsPage style */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterCategory('all')}
            size="sm"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={filterCategory === category ? 'default' : 'outline'}
              onClick={() => setFilterCategory(category)}
              size="sm"
              className="capitalize"
            >
              {getCategoryIcon(category)} {category}
            </Button>
          ))}
        </div>
        {/* Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Sort:</span>
          <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
          <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
          <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Lists</div>
          <div className="text-2xl font-bold text-gray-900">{checklists.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Templates</div>
          <div className="text-2xl font-bold text-indigo-600">
            {checklists.filter((c) => c.is_template).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Active Lists</div>
          <div className="text-2xl font-bold text-green-600">
            {checklists.filter((c) => !c.is_template).length}
          </div>
        </div>
      </div>

      {/* Checklists Grid */}
      {sortedChecklists.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterCategory !== 'all' || showTemplatesOnly
              ? 'No lists found'
              : 'No lists yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterCategory !== 'all' || showTemplatesOnly
              ? 'Try adjusting your filters'
              : 'Create your first list to get started'}
          </p>
          {!searchQuery && filterCategory === 'all' && !showTemplatesOnly && (
            <Button asChild>
              <Link to="/checklists/new">
                <Plus className="w-4 h-4 mr-2" />
                Create List
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedChecklists.map((checklist) => {
            const completion = getCompletionPercentage(checklist.items);
            const totalItems = checklist.items?.length || 0;
            const completedItems = checklist.items?.filter((item) => item.is_complete).length || 0;

            return (
              <Link
                key={checklist.id}
                to={`/checklists/${checklist.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                      {checklist.name}
                    </h3>
                  </div>
                  {checklist.is_template && (
                    <Badge variant="outline" className="text-xs">
                      Template
                    </Badge>
                  )}
                </div>

                {checklist.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {checklist.description}
                  </p>
                )}

                <div className="space-y-2">
                  {checklist.category && (
                    <Badge variant="secondary" className="text-xs">
                      {checklist.category}
                    </Badge>
                  )}

                  {/* Creator Info */}
                  {checklist.creator && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={checklist.creator.avatar} alt={checklist.creator.name} />
                        <AvatarFallback className="text-[8px]">{checklist.creator.name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <span>{checklist.creator.name}</span>
                    </div>
                  )}

                  {/* Like count */}
                  {(likeCountsMap[checklist.id] || 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                      <span>{likeCountsMap[checklist.id]} {likeCountsMap[checklist.id] === 1 ? 'like' : 'likes'}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  {totalItems > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          {completedItems} / {totalItems} completed
                        </span>
                        <span>{completion}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {totalItems === 0 && (
                    <p className="text-xs text-gray-500">No items yet</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}