import { fetchAndEnrichLifecycle } from '@/lib/lifecycle-helpers';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { filterByVisibility } from '@/lib/visibility-access';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { Meeting } from '@/lib/types/meeting';
import { Event } from '@/lib/types/event';
import { Sponsor } from '@/lib/types/sponsor';

export default function MeetingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-members' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [meetingsData, eventsData, sponsorsData] = await Promise.all([
        supabase.from('meetings').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*'),
        supabase.from('sponsors').select('*'),
      ]);

      if (meetingsData.error) throw meetingsData.error;
      if (eventsData.error) throw eventsData.error;
      if (sponsorsData.error) throw sponsorsData.error;

      // Enrich with lifecycle data
      const enrichedMeetings = await fetchAndEnrichLifecycle('meetings', meetingsData.data || []);
      
      // Fetch favorites and likes in parallel
      if (profile?.id) {
        const ids = (meetingsData.data || []).map(m => m.id);
        const [favoritesRes, likesRes] = await Promise.all([
          supabase
            .from('content_favorites')
            .select('content_id')
            .eq('user_id', profile.id)
            .eq('content_type', 'meeting'),
          ids.length > 0
            ? supabase
                .from('content_likes')
                .select('content_id, user_id')
                .eq('content_type', 'meeting')
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
        
        // Add flags to each meeting
        enrichedMeetings.forEach(meeting => {
          meeting.is_favorited = favoritedIds.has(meeting.id);
          meeting.like_count = likeCountsMap[meeting.id] || 0;
          meeting.is_liked = likedByMeSet.has(meeting.id);
        });
      }
      
      setMeetings(enrichedMeetings);
      setEvents(eventsData.data || []);
      setSponsors(sponsorsData.data || []);

      // Fetch creators
      const creatorIds = meetingsData.data
        .map(meeting => meeting.created_by)
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
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteUpdate = (meetingId: string, isFavorited: boolean) => {
    setMeetings(meetings.map(meeting =>
      meeting.id === meetingId ? { ...meeting, is_favorited: isFavorited } : meeting
    ));
  };

  const handleLikeUpdate = (meetingId: string, isLiked: boolean, newCount: number) => {
    setMeetings(prev => prev.map(m =>
      m.id === meetingId ? { ...m, is_liked: isLiked, like_count: newCount } : m
    ));
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const filteredMeetings = filterByVisibility(meetings, profile, 'meetings').filter((meeting) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      meeting.name.toLowerCase().includes(query) ||
      meeting.description.toLowerCase().includes(query) ||
      meeting.tags.some((tag) => tag.toLowerCase().includes(query))
    );
    const matchesMine = !showMineOnly || (
      meeting.created_by === profile.id ||
      (meeting.member_ids || []).includes(profile.id) ||
      (meeting.admin_ids || []).includes(profile.id)
    );
    return matchesSearch && matchesMine;
  });

  const displayedMeetings = [...filteredMeetings].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-members') return (b.member_ids?.length || 0) - (a.member_ids?.length || 0);
    if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getEvent = (eventId: string | null) => {
    if (!eventId) return null;
    return events.find(e => e.id === eventId);
  };

  const formatEventDateTime = (event: Event | null) => {
    if (!event) return null;
    
    const date = new Date(event.start_time);
    const dateFormatted = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const timeFormatted = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    return `${dateFormatted} at ${timeFormatted}`;
  };

  const calculateDuration = (event: Event | null) => {
    if (!event || !event.end_time) return null;
    
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    return durationMinutes;
  };

  const getSponsor = (sponsorId: string | null) => {
    if (!sponsorId) return null;
    return sponsors.find(s => s.id === sponsorId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Meetings' }]}
        icon={Calendar}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        title="Meetings"
        description="Scheduled gatherings combining networking, events, and shared documents"
        actions={
          <Button asChild>
            <Link to="/meetings/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Meeting
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
                placeholder="Search meetings by name, topic, or keyword..."
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

      {/* Meetings Grid */}
      {displayedMeetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || showMineOnly
                ? 'No meetings match your filters'
                : 'Be the first to create a meeting'}
            </p>
            {!searchQuery && !showMineOnly && (
              <Button asChild>
                <Link to="/meetings/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meeting
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedMeetings.map((meeting) => {
            const isUserMember = meeting.member_ids.includes(profile.id);
            const creator = meeting.created_by ? creators[meeting.created_by] : null;
            
            return (
              <ContainerCard
                key={meeting.id}
                id={meeting.id}
                type="meetings"
                name={meeting.name}
                description={meeting.description}
                link={`/meetings/${meeting.slug}`}
                visibility={meeting.visibility}
                memberCount={meeting.member_ids.length}
                createdBy={creator}
                tags={meeting.tags}
                isFavorited={meeting.is_favorited}
                lifecycleState={meeting.lifecycle_state}
                isMember={isUserMember}
                currentUserId={profile.id}
                likeCount={meeting.like_count}
                isLiked={meeting.is_liked}
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