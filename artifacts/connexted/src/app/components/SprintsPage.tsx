import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { CalendarClock, Plus, AlertCircle, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Search } from 'lucide-react';
import { Input } from '@/app/components/ui/input';

interface Sprint {
  id: string;
  name: string;
  description: string;
  slug: string;
  start_date: string;
  end_date: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  cover_image: string | null;
  tags: string[];
  created_by: string;
  admin_ids: string[];
  member_ids: string[];
  created_at: string;
  is_favorited?: boolean; // Changed from favorites array
  like_count?: number;
  is_liked?: boolean;
}

export default function SprintsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-members' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchSprints();
  }, []);

  const fetchSprints = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        // Check if sprints table doesn't exist yet or missing slug column
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703') {
          setError('SETUP_REQUIRED');
          return;
        }
        throw error;
      }
      
      const sprintsData = data || [];
      
      // Fetch favorites and likes in parallel
      const ids = sprintsData.map(s => s.id);
      const [favoritesRes, likesRes] = await Promise.all([
        supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'sprint'),
        ids.length > 0
          ? supabase
              .from('content_likes')
              .select('content_id, user_id')
              .eq('content_type', 'sprint')
              .in('content_id', ids)
          : Promise.resolve({ data: [] }),
      ]);
      
      const favoritedIds = new Set(favoritesRes.data?.map(f => f.content_id) || []);

      const likeCountsMap: Record<string, number> = {};
      const likedByMeSet = new Set<string>();
      (likesRes.data || []).forEach((like: { content_id: string; user_id: string }) => {
        likeCountsMap[like.content_id] = (likeCountsMap[like.content_id] || 0) + 1;
        if (like.user_id === profile.id) likedByMeSet.add(like.content_id);
      });
      
      // Add is_favorited flag to each sprint
      const sprintsWithFavorites = sprintsData.map(sprint => ({
        ...sprint,
        slug: sprint.slug || sprint.id, // Use id as fallback if slug doesn't exist
        is_favorited: favoritedIds.has(sprint.id),
        like_count: likeCountsMap[sprint.id] || 0,
        is_liked: likedByMeSet.has(sprint.id),
      }));
      
      setSprints(sprintsWithFavorites);
      
      // Fetch creator profiles
      const creatorIds = sprintsData
        .map(s => s.created_by)
        .filter(Boolean);
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, name')
          .in('id', creatorIds);
        
        if (profiles) {
          const creatorsMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
          setCreators(creatorsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
      toast.error('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteUpdate = (sprintId: string, isFavorited: boolean) => {
    setSprints(sprints.map(sprint =>
      sprint.id === sprintId ? { ...sprint, is_favorited: isFavorited } : sprint
    ));
  };

  const handleLikeUpdate = (sprintId: string, isLiked: boolean, newCount: number) => {
    setSprints(prev => prev.map(s =>
      s.id === sprintId ? { ...s, is_liked: isLiked, like_count: newCount } : s
    ));
  };
  
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // If sprints table doesn't exist, redirect to setup
  if (error === 'SETUP_REQUIRED') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-12">
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-8 h-8 text-blue-600" />
              <CardTitle>Sprints System Setup Required</CardTitle>
            </div>
            <CardDescription>
              The Sprints & Checklists system needs to be initialized before you can use it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Click the button below to set up the database tables required for Sprints and Checklists.
            </p>
            <Button onClick={() => navigate('/checklists/setup')}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Go to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading sprints...</div>
      </div>
    );
  }

  const isAdmin = profile.role === 'super';
  
  // Filter sprints based on visibility and access
  const accessibleSprints = sprints.filter(sprint => {
    if (isAdmin) return true;
    if (sprint.visibility === 'public') return true;
    if (sprint.visibility === 'member' && sprint.member_ids.includes(profile.id)) return true;
    if (sprint.visibility === 'unlisted') return true;
    if (sprint.visibility === 'private' && sprint.member_ids.includes(profile.id)) return true;
    return false;
  });

  const filteredSprints = accessibleSprints.filter(sprint => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      sprint.name.toLowerCase().includes(query) ||
      sprint.description?.toLowerCase().includes(query) ||
      (sprint.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
    );
    const matchesMine = !showMineOnly || (
      sprint.created_by === profile.id ||
      sprint.member_ids.includes(profile.id) ||
      sprint.admin_ids.includes(profile.id)
    );
    return matchesSearch && matchesMine;
  });

  const displayedSprints = [...filteredSprints].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-members') return (b.member_ids?.length || 0) - (a.member_ids?.length || 0);
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Sprints' }]}
        icon={CalendarClock}
        iconBg="bg-cyan-100"
        iconColor="text-cyan-600"
        title="Sprints"
        description="Time-boxed collaborative challenges with checklists"
        actions={
          isAdmin ? (
            <Button onClick={() => navigate('/sprints/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Sprint
            </Button>
          ) : undefined
        }
      />

      {/* Search & Controls */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search sprints by name or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showMineOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMineOnly(!showMineOnly)}
              className="shrink-0"
            >
              Mine
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Sort:</span>
            <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
            <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
            <Button variant={sortBy === 'most-members' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-members')}>Most Members</Button>
            <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
          </div>
        </CardContent>
      </Card>

      {displayedSprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchQuery || showMineOnly ? 'No sprints found matching your filters.' : 'No sprints available yet.'}
            </p>
            {isAdmin && !searchQuery && !showMineOnly && (
              <Button onClick={() => navigate('/sprints/new')} className="mt-4">
                Create Your First Sprint
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedSprints.map((sprint) => (
            <ContainerCard
              key={sprint.id}
              id={sprint.id}
              type="sprints"
              name={sprint.name}
              description={sprint.description}
              link={`/sprints/${sprint.slug}`}
              visibility={sprint.visibility}
              memberCount={sprint.member_ids.length}
              createdBy={creators[sprint.created_by]}
              tags={sprint.tags}
              isFavorited={sprint.is_favorited}
              onFavoriteUpdate={handleFavoriteUpdate}
              isAdmin={sprint.admin_ids.includes(profile.id)}
              isMember={sprint.member_ids.includes(profile.id)}
              currentUserId={profile.id}
              likeCount={sprint.like_count}
              isLiked={sprint.is_liked}
              onLikeUpdate={handleLikeUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}