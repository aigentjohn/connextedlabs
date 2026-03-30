import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { PageHeader } from '@/app/components/shared/PageHeader';

interface Meetup {
  id: string;
  name: string;
  description: string;
  slug: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  cover_image: string | null;
  tags: string[];
  member_ids: string[];
  admin_ids: string[];
  created_by: string;
  is_favorited?: boolean; // Changed from favorites array
  created_at: string;
  like_count?: number;
  is_liked?: boolean;
}

export default function MeetupsPage() {
  const { profile } = useAuth();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-members' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchMeetups();
    }
  }, [profile]);

  const fetchMeetups = async () => {
    try {
      setLoading(true);

      // Fetch all meetups
      const { data: meetupsData, error: meetupsError } = await supabase
        .from('meetups')
        .select('*')
        .eq('community_id', profile?.community_id)
        .order('created_at', { ascending: false });

      if (meetupsError) throw meetupsError;

      // Fetch meetings to count how many belong to each meetup
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, meetup_id')
        .eq('community_id', profile?.community_id);

      if (meetingsError) throw meetingsError;

      // Fetch favorites and likes in parallel
      const ids = (meetupsData || []).map(m => m.id);
      const [favoritesRes, likesRes] = await Promise.all([
        supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'meetup'),
        ids.length > 0
          ? supabase
              .from('content_likes')
              .select('content_id, user_id')
              .eq('content_type', 'meetup')
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

      // Fetch creators
      const creatorIds = (meetupsData || [])
        .map(meetup => meetup.created_by)
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

      setMeetups((meetupsData || []).map(meetup => ({
        ...meetup,
        is_favorited: favoritedIds.has(meetup.id),
        like_count: likeCountsMap[meetup.id] || 0,
        is_liked: likedByMeSet.has(meetup.id),
      })));
      setMeetings(meetingsData || []);
    } catch (error) {
      console.error('Error fetching meetups:', error);
      toast.error('Failed to load meetups');
    } finally {
      setLoading(false);
    }
  };

  const getMeetingCount = (meetupId: string) => {
    return meetings.filter(m => m.meetup_id === meetupId).length;
  };

  const handleFavoriteUpdate = (meetupId: string, isFavorited: boolean) => {
    setMeetups(meetups.map(meetup =>
      meetup.id === meetupId ? { ...meetup, is_favorited: isFavorited } : meetup
    ));
  };

  const handleLikeUpdate = (meetupId: string, isLiked: boolean, newCount: number) => {
    setMeetups(prev => prev.map(m =>
      m.id === meetupId ? { ...m, is_liked: isLiked, like_count: newCount } : m
    ));
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading meetups...</div>
      </div>
    );
  }

  const filteredMeetups = meetups.filter(meetup => {
    const matchesSearch = meetup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meetup.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Show public meetups or meetups user is a member of
    const canView = meetup.visibility === 'public' || 
                    meetup.member_ids.includes(profile.id) ||
                    profile.role === 'super';

    const matchesMine = !showMineOnly || (
      meetup.created_by === profile.id ||
      meetup.member_ids.includes(profile.id) ||
      (meetup.admin_ids || []).includes(profile.id)
    );
    
    return matchesSearch && canView && matchesMine;
  });

  const displayedMeetups = [...filteredMeetups].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-members') return (b.member_ids?.length || 0) - (a.member_ids?.length || 0);
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Meetups' }]}
        icon={Handshake}
        iconBg="bg-teal-100"
        iconColor="text-teal-600"
        title="Meetups"
        description="Recurring event series with multiple meetings"
        actions={
          <Button asChild>
            <Link to="/meetups/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Meetup
            </Link>
          </Button>
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
                placeholder="Search meetups..."
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

      {/* Meetups Grid */}
      {displayedMeetups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {searchQuery || showMineOnly ? 'No meetups found matching your filters' : 'No meetups yet'}
            </p>
            {!searchQuery && !showMineOnly && (
              <Button asChild>
                <Link to="/meetups/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Meetup
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedMeetups.map((meetup) => {
            const isMember = meetup.member_ids.includes(profile.id);
            const meetingCount = getMeetingCount(meetup.id);
            const creator = meetup.created_by ? creators[meetup.created_by] : null;

            return (
              <ContainerCard
                key={meetup.id}
                id={meetup.id}
                type="meetups"
                name={meetup.name}
                description={meetup.description || 'No description'}
                link={`/meetups/${meetup.slug}`}
                visibility={meetup.visibility}
                memberCount={meetup.member_ids.length}
                createdBy={creator}
                tags={meetup.tags}
                isFavorited={meetup.is_favorited}
                isMember={isMember}
                currentUserId={profile.id}
                likeCount={meetup.like_count}
                isLiked={meetup.is_liked}
                onLikeUpdate={handleLikeUpdate}
                onFavoriteUpdate={handleFavoriteUpdate}
                showJoinButton={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}