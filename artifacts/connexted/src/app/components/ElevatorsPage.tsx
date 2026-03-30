import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { CONTAINER_TYPES } from '@/lib/container-types';
import { fetchAndEnrichLifecycle } from '@/lib/lifecycle-helpers';
import { PageHeader } from '@/app/components/shared/PageHeader';

export default function ElevatorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuth();
  const [elevators, setElevators] = useState<any[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-members' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchElevators();
    }
  }, [profile]);

  const fetchElevators = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('elevators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const elevatorsData = data || [];
      
      // Enrich with lifecycle data
      const enrichedElevators = await fetchAndEnrichLifecycle('elevators', elevatorsData);
      
      // Fetch favorites and likes in parallel
      const ids = elevatorsData.map(e => e.id);
      const [favoritesRes, likesRes] = await Promise.all([
        supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'elevator'),
        ids.length > 0
          ? supabase
              .from('content_likes')
              .select('content_id, user_id')
              .eq('content_type', 'elevator')
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
      
      // Add is_favorited, like_count, is_liked flags to each elevator
      setElevators(enrichedElevators.map(elevator => ({
        ...elevator,
        is_favorited: favoritedIds.has(elevator.id),
        like_count: likeCountsMap[elevator.id] || 0,
        is_liked: likedByMeSet.has(elevator.id),
      })));
      
      // Fetch creator profiles
      const creatorIds = elevatorsData
        .map(e => e.created_by)
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
      console.error('Error fetching elevators:', error);
      toast.error('Failed to load elevators');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading elevators...</p>
      </div>
    );
  }

  const filteredElevators = elevators.filter((elevator) => {
    const query = searchQuery.toLowerCase();
    const elevatorTags = elevator.tags || [];
    const matchesSearch = (
      elevator.name.toLowerCase().includes(query) ||
      elevator.description?.toLowerCase().includes(query) ||
      elevatorTags.some((tag: string) => tag.toLowerCase().includes(query))
    );
    const matchesMine = !showMineOnly || (
      elevator.created_by === profile.id ||
      (elevator.member_ids || []).includes(profile.id) ||
      (elevator.admin_ids || []).includes(profile.id)
    );
    return matchesSearch && matchesMine;
  });

  const displayedElevators = [...filteredElevators].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-members') return (b.member_ids?.length || 0) - (a.member_ids?.length || 0);
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleJoin = async (elevatorId: string) => {
    const elevator = elevators.find(e => e.id === elevatorId);
    if (!elevator) return;

    try {
      const updatedMemberIds = [...(elevator.member_ids || []), profile.id];
      
      const { error } = await supabase
        .from('elevators')
        .update({ member_ids: updatedMemberIds })
        .eq('id', elevatorId);

      if (error) throw error;

      setElevators(elevators.map(e => 
        e.id === elevatorId 
          ? { ...e, member_ids: updatedMemberIds }
          : e
      ));

      toast.success(`You've joined ${elevator.name}!`);
    } catch (error) {
      console.error('Error joining elevator:', error);
      toast.error('Failed to join elevator');
    }
  };

  const handleLeave = async (elevatorId: string) => {
    const elevator = elevators.find(e => e.id === elevatorId);
    if (!elevator) return;

    try {
      const updatedMemberIds = (elevator.member_ids || []).filter((id: string) => id !== profile.id);
      
      const { error } = await supabase
        .from('elevators')
        .update({ member_ids: updatedMemberIds })
        .eq('id', elevatorId);

      if (error) throw error;

      setElevators(elevators.map(e => 
        e.id === elevatorId 
          ? { ...e, member_ids: updatedMemberIds }
          : e
      ));

      toast.success(`You've left ${elevator.name}`);
    } catch (error) {
      console.error('Error leaving elevator:', error);
      toast.error('Failed to leave elevator');
    }
  };

  const handleFavoriteUpdate = (elevatorId: string, isFavorited: boolean) => {
    setElevators(elevators.map(elevator =>
      elevator.id === elevatorId ? { ...elevator, is_favorited: isFavorited } : elevator
    ));
  };

  const handleLikeUpdate = (elevatorId: string, isLiked: boolean, newCount: number) => {
    setElevators(prev => prev.map(e =>
      e.id === elevatorId ? { ...e, is_liked: isLiked, like_count: newCount } : e
    ));
  };

  const isMember = (elevatorId: string) => {
    const elevator = elevators.find(e => e.id === elevatorId);
    return elevator?.member_ids?.includes(profile.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Elevators' }]}
        icon={TrendingUp}
        iconBg="bg-green-100"
        iconColor="text-green-600"
        title="Elevators"
        description="Find and join networking hubs to connect with others"
        actions={
          profile ? (
            <Button asChild>
              <Link to="/elevators/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Elevator
              </Link>
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
                placeholder="Search elevators by name, topic, or keyword..."
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

      {/* Elevators Grid */}
      {displayedElevators.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                {searchQuery || showMineOnly ? 'No elevators found matching your filters' : 'No elevators available yet'}
              </p>
              {profile && !searchQuery && !showMineOnly && (
                <Button asChild>
                  <Link to="/elevators/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Elevator
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedElevators.map((elevator) => {
            const isUserMember = isMember(elevator.id);
            const creator = elevator.created_by ? creators[elevator.created_by] : null;
            
            return (
              <ContainerCard
                key={elevator.id}
                id={elevator.id}
                type="elevators"
                name={elevator.name}
                description={elevator.description}
                link={`/elevators/${elevator.slug}`}
                visibility={elevator.visibility}
                memberCount={elevator.member_ids?.length || 0}
                createdBy={creator}
                tags={elevator.tags}
                isFavorited={elevator.is_favorited}
                lifecycleState={elevator.lifecycle_state}
                isMember={isUserMember}
                currentUserId={profile.id}
                likeCount={elevator.like_count}
                isLiked={elevator.is_liked}
                onLikeUpdate={handleLikeUpdate}
                onJoin={() => handleJoin(elevator.id)}
                onLeave={() => handleLeave(elevator.id)}
                onFavoriteUpdate={handleFavoriteUpdate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}