import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, PlayCircle, Filter, X, Tag, Users } from 'lucide-react';
import { toast } from 'sonner';
import ContainerCard from '@/app/components/shared/ContainerCard';
import { PlaylistCard } from '@/app/components/playlist/PlaylistCard';
import { CONTAINER_TYPES } from '@/lib/container-types';
import { fetchAndEnrichLifecycle } from '@/lib/lifecycle-helpers';
import { PageHeader } from '@/app/components/shared/PageHeader';

interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  topic_type: 'audience' | 'purpose' | 'theme';
}

export default function PlaylistsPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [playlistTopics, setPlaylistTopics] = useState<Record<string, Topic[]>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [engagementMetrics, setEngagementMetrics] = useState<Record<string, {
    likes_count: number;
    avg_rating: number;
    reviews_count: number;
    shares_count: number;
  }>>({});
  const [episodeCounts, setEpisodeCounts] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [showMineOnly, setShowMineOnly] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchPlaylists();
      loadTopics();
    }
  }, [profile]);

  const loadTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAvailableTopics(data || []);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      // Fetch playlists data
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const playlistsData = data || [];

      // Extract all unique tags
      const allTags = new Set<string>();
      playlistsData.forEach((playlist: any) => {
        playlist.tags?.forEach((tag: string) => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags).sort());

      // Load topic links for all playlists
      if (playlistsData.length > 0) {
        const playlistIds = playlistsData.map((p: any) => p.id);
        const { data: topicLinksData } = await supabase
          .from('topic_links')
          .select('entity_id, topic_id, topics(*)')
          .eq('entity_type', 'playlist')
          .in('entity_id', playlistIds);

        if (topicLinksData) {
          const topicsMap: Record<string, Topic[]> = {};
          topicLinksData.forEach((link: any) => {
            if (!topicsMap[link.entity_id]) {
              topicsMap[link.entity_id] = [];
            }
            if (link.topics) {
              topicsMap[link.entity_id].push(link.topics);
            }
          });
          setPlaylistTopics(topicsMap);
        }
      }
      
      // Fetch favorites for current user
      const { data: favoritesData } = await supabase
        .from('content_favorites')
        .select('content_id')
        .eq('user_id', profile.id)
        .eq('content_type', 'playlist');
      
      const favoritedIds = new Set(favoritesData?.map(f => f.content_id) || []);
      
      // Fetch lifecycle states for all playlists
      const enrichedPlaylists = await fetchAndEnrichLifecycle('playlists', playlistsData);
      
      setPlaylists(enrichedPlaylists.map((playlist: any) => ({
        ...playlist,
        is_favorited: favoritedIds.has(playlist.id)
      })));
      
      // Fetch creator profiles
      const creatorIds = playlistsData
        .map((p: any) => p.author_id)
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

      // Fetch engagement metrics for all playlists
      if (playlistsData.length > 0) {
        const playlistIds = playlistsData.map((p: any) => p.id);
        
        // Fetch likes count
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'playlist')
          .in('content_id', playlistIds);

        // Fetch ratings
        const { data: ratingsData } = await supabase
          .from('content_ratings')
          .select('content_id, rating, review')
          .eq('content_type', 'playlist')
          .in('content_id', playlistIds);

        // Fetch shares count
        const { data: sharesData } = await supabase
          .from('content_shares')
          .select('content_id')
          .eq('content_type', 'playlist')
          .in('content_id', playlistIds);

        // Calculate metrics per playlist
        const metricsMap: Record<string, {
          likes_count: number;
          avg_rating: number;
          reviews_count: number;
          shares_count: number;
        }> = {};

        // Initialize all playlists with zero metrics
        playlistIds.forEach((id: string) => {
          metricsMap[id] = {
            likes_count: 0,
            avg_rating: 0,
            reviews_count: 0,
            shares_count: 0,
          };
        });

        // Count likes
        if (likesData) {
          likesData.forEach((like: any) => {
            if (metricsMap[like.content_id]) {
              metricsMap[like.content_id].likes_count++;
            }
          });
        }

        // Calculate ratings and review counts
        if (ratingsData) {
          const ratingsByPlaylist: Record<string, number[]> = {};
          ratingsData.forEach((rating: any) => {
            if (!ratingsByPlaylist[rating.content_id]) {
              ratingsByPlaylist[rating.content_id] = [];
            }
            if (rating.rating) {
              ratingsByPlaylist[rating.content_id].push(rating.rating);
            }
            if (rating.review) {
              metricsMap[rating.content_id].reviews_count++;
            }
          });

          // Calculate average ratings
          Object.entries(ratingsByPlaylist).forEach(([playlistId, ratings]) => {
            if (ratings.length > 0) {
              const sum = ratings.reduce((acc: number, r: number) => acc + r, 0);
              metricsMap[playlistId].avg_rating = sum / ratings.length;
            }
          });
        }

        // Count shares
        if (sharesData) {
          sharesData.forEach((share: any) => {
            if (metricsMap[share.content_id]) {
              metricsMap[share.content_id].shares_count++;
            }
          });
        }

        setEngagementMetrics(metricsMap);

        // Calculate episode counts from array columns
        const episodeMap: Record<string, number> = {};
        playlistsData.forEach((p: any) => {
          const episodeIds = (p.episode_ids && p.episode_ids.length > 0) 
            ? p.episode_ids 
            : (p.video_ids || []);
          episodeMap[p.id] = episodeIds.length;
        });
        setEpisodeCounts(episodeMap);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading playlists...</p>
      </div>
    );
  }

  const filteredPlaylists = playlists.filter((playlist) => {
    let matches = true;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = matches && (
        playlist.name.toLowerCase().includes(query) ||
        playlist.description?.toLowerCase().includes(query) ||
        playlist.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Tag filter (AND logic - must have ALL selected tags)
    if (selectedTags.length > 0) {
      const playlistTags = playlist.tags || [];
      matches = matches && selectedTags.every((tag: string) => playlistTags.includes(tag));
    }

    // Topic filter (OR logic - matches ANY selected topic)
    if (selectedTopics.length > 0) {
      const playlistTopicIds = playlistTopics[playlist.id]?.map((t: Topic) => t.id) || [];
      matches = matches && selectedTopics.some((topicId: string) => playlistTopicIds.includes(topicId));
    }

    // Mine filter
    const matchesMine = !showMineOnly || (
      playlist.author_id === profile.id ||
      (playlist.member_ids || []).includes(profile.id)
    );

    return matches && matchesMine;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(t => t !== topicId)
        : [...prev, topicId]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedTopics([]);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedTopics.length > 0 || searchQuery;

  const sortedPlaylists = [...filteredPlaylists].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (engagementMetrics[b.id]?.likes_count || 0) - (engagementMetrics[a.id]?.likes_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleJoinPlaylist = async (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    try {
      const updatedMemberIds = [...(playlist.member_ids || []), profile.id];
      
      const { error } = await supabase
        .from('playlists')
        .update({ member_ids: updatedMemberIds })
        .eq('id', playlistId);

      if (error) throw error;

      // Update local state
      setPlaylists(playlists.map(p => 
        p.id === playlistId 
          ? { ...p, member_ids: updatedMemberIds }
          : p
      ));

      toast.success(`You've joined ${playlist.name}!`);
    } catch (error) {
      console.error('Error joining playlist:', error);
      toast.error('Failed to join playlist');
    }
  };

  const handleLeavePlaylist = async (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    try {
      const updatedMemberIds = (playlist.member_ids || []).filter((id: string) => id !== profile.id);
      
      const { error } = await supabase
        .from('playlists')
        .update({ member_ids: updatedMemberIds })
        .eq('id', playlistId);

      if (error) throw error;

      // Update local state
      setPlaylists(playlists.map(p => 
        p.id === playlistId 
          ? { ...p, member_ids: updatedMemberIds }
          : p
      ));

      toast.success(`You've left ${playlist.name}`);
    } catch (error) {
      console.error('Error leaving playlist:', error);
      toast.error('Failed to leave playlist');
    }
  };

  const isMember = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.member_ids?.includes(profile.id);
  };

  const handleFavoriteUpdate = (playlistId: string, isFavorited: boolean) => {
    setPlaylists(playlists.map(playlist =>
      playlist.id === playlistId ? { ...playlist, is_favorited: isFavorited } : playlist
    ));
  };

  const config = CONTAINER_TYPES.playlists;
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Playlists' }]}
        icon={config.icon}
        iconBg={config.color}
        iconColor={config.iconColor}
        title="Discover Playlists"
        description="Curated collections of episodes for structured learning"
        actions={
          profile ? (
            <Button asChild>
              <Link to="/playlists/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Playlist
              </Link>
            </Button>
          ) : undefined
        }
      />
      
      {/* Search */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search playlists by name, topic, or keyword..."
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
            <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          <p className="text-gray-600">Filters</p>
        </div>
        <Button
          className="text-gray-600 hover:text-gray-900"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
        </Button>
      </div>
      {showFilters && (
        <div className="space-y-4">
          <div className="flex items-center">
            <Tag className="w-4 h-4 mr-2" />
            <p className="text-gray-600">Tags</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                className={`${
                  selectedTags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            <p className="text-gray-600">Topics</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTopics.map((topic) => (
              <Badge
                key={topic.id}
                className={`${
                  selectedTopics.includes(topic.id) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
                onClick={() => toggleTopic(topic.id)}
              >
                {topic.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Playlists Grid */}
      {sortedPlaylists.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'No playlists found matching your search' : 'No playlists available yet'}
              </p>
              {profile && !searchQuery && (
                <Button asChild>
                  <Link to="/playlists/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Playlist
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlaylists.map((playlist) => {
            const isUserMember = isMember(playlist.id);
            const creator = playlist.author_id ? creators[playlist.author_id] : null;
            const metrics = engagementMetrics[playlist.id] || {
              likes_count: 0,
              avg_rating: 0,
              reviews_count: 0,
              shares_count: 0,
            };
            const episodeCount = episodeCounts[playlist.id] || 0;
            const topics = playlistTopics[playlist.id] || [];
            
            return (
              <PlaylistCard
                key={playlist.id}
                id={playlist.id}
                name={playlist.name}
                slug={playlist.slug}
                description={playlist.description}
                tags={playlist.tags}
                topics={topics}
                memberCount={playlist.member_ids?.length || 0}
                visibility={playlist.visibility}
                creator={creator}
                likes_count={metrics.likes_count}
                avg_rating={metrics.avg_rating}
                reviews_count={metrics.reviews_count}
                shares_count={metrics.shares_count}
                episodeCount={episodeCount}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}