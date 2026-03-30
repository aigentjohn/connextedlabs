import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { Badge } from '@/app/components/ui/badge';
import { FavoriteButton } from '@/app/components/shared/FavoriteButton';
import { Lock } from 'lucide-react';
import { Check } from 'lucide-react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { filterByVisibility } from '@/lib/visibility-access';

interface Standup {
  id: string;
  name: string;
  description: string;
  slug: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  tags: string[];
  member_ids: string[];
  admin_ids: string[];
  created_by: string;
  is_favorited?: boolean; // Changed from favorites array
  created_at: string;
  like_count?: number;
  is_liked?: boolean;
}

export default function StandupsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuth();
  const [standups, setStandups] = useState<Standup[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-members' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchStandups();
    }
  }, [profile]);

  const fetchStandups = async () => {
    try {
      const { data, error } = await supabase
        .from('standups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const standupsData = data || [];
      
      // Fetch favorites and likes in parallel
      const ids = standupsData.map(s => s.id);
      const [favoritesRes, likesRes] = await Promise.all([
        supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'standup'),
        ids.length > 0
          ? supabase
              .from('content_likes')
              .select('content_id, user_id')
              .eq('content_type', 'standup')
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
      
      setStandups(standupsData.map(standup => ({
        ...standup,
        is_favorited: favoritedIds.has(standup.id),
        like_count: likeCountsMap[standup.id] || 0,
        is_liked: likedByMeSet.has(standup.id),
      })));
      
      // Fetch creator profiles
      const creatorIds = standupsData
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
      console.error('Error fetching standups:', error);
      toast.error('Failed to load standups');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading standups...</p>
      </div>
    );
  }

  const filteredStandups = filterByVisibility(standups, profile, 'standups').filter((standup) => {
    const query = searchQuery.toLowerCase();
    const standupTags = standup.tags || [];
    const matchesSearch = (
      standup.name.toLowerCase().includes(query) ||
      standup.description?.toLowerCase().includes(query) ||
      standupTags.some((tag: string) => tag.toLowerCase().includes(query))
    );
    const matchesMine = !showMineOnly || (
      standup.created_by === profile.id ||
      (standup.member_ids || []).includes(profile.id) ||
      (standup.admin_ids || []).includes(profile.id)
    );
    return matchesSearch && matchesMine;
  });

  const displayedStandups = [...filteredStandups].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-members') return (b.member_ids?.length || 0) - (a.member_ids?.length || 0);
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleJoinStandup = async (standupId: string) => {
    const standup = standups.find(s => s.id === standupId);
    if (!standup) return;

    try {
      const updatedMemberIds = [...(standup.member_ids || []), profile.id];
      
      const { error } = await supabase
        .from('standups')
        .update({ member_ids: updatedMemberIds })
        .eq('id', standupId);

      if (error) throw error;

      // Update local state
      setStandups(standups.map(s => 
        s.id === standupId 
          ? { ...s, member_ids: updatedMemberIds }
          : s
      ));
      toast.success(`You've joined ${standup.name}!`);
    } catch (error) {
      console.error('Error joining standup:', error);
      toast.error('Failed to join standup');
    }
  };

  const handleLeaveStandup = async (standupId: string) => {
    const standup = standups.find(s => s.id === standupId);
    if (!standup) return;

    try {
      const updatedMemberIds = (standup.member_ids || []).filter((id: string) => id !== profile.id);
      
      const { error } = await supabase
        .from('standups')
        .update({ member_ids: updatedMemberIds })
        .eq('id', standupId);

      if (error) throw error;

      // Update local state
      setStandups(standups.map(s => 
        s.id === standupId 
          ? { ...s, member_ids: updatedMemberIds }
          : s
      ));
      toast.success(`You've left ${standup.name}`);
    } catch (error) {
      console.error('Error leaving standup:', error);
      toast.error('Failed to leave standup');
    }
  };

  const handleFavoriteUpdate = (standupId: string, isFavorited: boolean) => {
    setStandups(standups.map(standup =>
      standup.id === standupId ? { ...standup, is_favorited: isFavorited } : standup
    ));
  };

  const handleLikeUpdate = (standupId: string, isLiked: boolean, newCount: number) => {
    setStandups(prev => prev.map(s =>
      s.id === standupId ? { ...s, is_liked: isLiked, like_count: newCount } : s
    ));
  };

  const isMember = (standupId: string) => {
    const standup = standups.find(s => s.id === standupId);
    return standup?.member_ids?.includes(profile.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Standups' }]}
        icon={MessageSquare}
        iconBg="bg-yellow-100"
        iconColor="text-yellow-600"
        title="Standups"
        description="Share what you're working on with your team"
        actions={
          <Link to="/standups/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Standup
            </Button>
          </Link>
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
                placeholder="Search standups by name or keyword..."
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

      {/* Standups Grid */}
      {displayedStandups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedStandups.map((standup) => {
            const isUserMember = isMember(standup.id);
            const creator = standup.created_by ? creators[standup.created_by] : null;
            
            return (
              <ContainerCard
                key={standup.id}
                id={standup.id}
                type="standups"
                name={standup.name}
                description={standup.description}
                link={`/standups/${standup.slug}`}
                visibility={standup.visibility}
                memberCount={standup.member_ids?.length || 0}
                createdBy={creator}
                tags={standup.tags}
                isFavorited={standup.is_favorited}
                isMember={isUserMember}
                currentUserId={profile.id}
                likeCount={standup.like_count}
                isLiked={standup.is_liked}
                onLikeUpdate={handleLikeUpdate}
                onJoin={() => handleJoinStandup(standup.id)}
                onLeave={() => handleLeaveStandup(standup.id)}
                onFavoriteUpdate={handleFavoriteUpdate}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-6">
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                {searchQuery || showMineOnly ? 'No standups found matching your filters.' : 'No standups yet.'}
              </p>
              {!searchQuery && !showMineOnly && (
                <Link to="/standups/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create the First Standup
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}