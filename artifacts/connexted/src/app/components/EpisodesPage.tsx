import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Video, Plus, Search, Filter, X, Tag, Users, Heart } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { EpisodeCard } from '@/app/components/episodes/EpisodeCard';

interface Episode {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_minutes: number | null;
  thumbnail_url: string | null;
  author_id: string | null;
  tags: string[];
  category: string;
  video_platform: string;
  visibility: 'public' | 'member' | 'premium' | 'private';
  favorites: string[];
  is_published: boolean;
  created_at: string;
  video_id?: string;
  likes_count?: number;
  avg_rating?: number;
  reviews_count?: number;
  shares_count?: number;
}

interface Author {
  id: string;
  name: string;
  avatar: string | null;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  topic_type: 'audience' | 'purpose' | 'theme';
}

export default function EpisodesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'member' | 'premium' | 'private'>('all');
  const [filterMyContent, setFilterMyContent] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [episodeTopics, setEpisodeTopics] = useState<Record<string, Topic[]>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [engagementMetrics, setEngagementMetrics] = useState<Record<string, {
    likes_count: number;
    avg_rating: number;
    reviews_count: number;
    shares_count: number;
  }>>({});
  const [favoritedEpisodeIds, setFavoritedEpisodeIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');

  // Read URL parameters on mount
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      setSelectedTags([tagParam]);
      setShowFilters(true); // Auto-show filters when filtering by tag
    }
  }, []);

  useEffect(() => {
    loadEpisodes();
    loadTopics();
  }, []);

  useEffect(() => {
    filterEpisodesList();
  }, [episodes, searchQuery, filterVisibility, filterMyContent, selectedTags, selectedTopics, profile, sortBy, engagementMetrics]);

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

  const loadEpisodes = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('episodes')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setEpisodes(data || []);

      // Extract all unique tags
      const allTags = new Set<string>();
      data?.forEach(ep => {
        ep.tags?.forEach((tag: string) => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags).sort());

      // Load topic links for all episodes
      if (data && data.length > 0) {
        const episodeIds = data.map(ep => ep.id);
        const { data: topicLinksData } = await supabase
          .from('topic_links')
          .select('entity_id, topic_id, topics(*)')
          .eq('entity_type', 'episode')
          .in('entity_id', episodeIds);

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
          setEpisodeTopics(topicsMap);
        }
      }

      // Load author data
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map(ep => ep.author_id).filter(Boolean))];
        const { data: authorsData } = await supabase
          .from('users')
          .select('id, name, avatar')
          .in('id', authorIds);

        if (authorsData) {
          const authorsMap: Record<string, Author> = {};
          authorsData.forEach((author) => {
            authorsMap[author.id] = author;
          });
          setAuthors(authorsMap);
        }
      }

      // Load engagement metrics
      if (data && data.length > 0) {
        const episodeIds = data.map(ep => ep.id);
        
        // Fetch likes count
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'episode')
          .in('content_id', episodeIds);

        // Fetch ratings
        const { data: ratingsData } = await supabase
          .from('content_ratings')
          .select('content_id, rating, review')
          .eq('content_type', 'episode')
          .in('content_id', episodeIds);

        // Fetch shares count
        const { data: sharesData } = await supabase
          .from('content_shares')
          .select('content_id')
          .eq('content_type', 'episode')
          .in('content_id', episodeIds);

        // Calculate metrics per episode
        const metricsMap: Record<string, {
          likes_count: number;
          avg_rating: number;
          reviews_count: number;
          shares_count: number;
        }> = {};

        // Initialize all episodes with zero metrics
        episodeIds.forEach(id => {
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
          const ratingsByEpisode: Record<string, number[]> = {};
          ratingsData.forEach((rating: any) => {
            if (!ratingsByEpisode[rating.content_id]) {
              ratingsByEpisode[rating.content_id] = [];
            }
            if (rating.rating) {
              ratingsByEpisode[rating.content_id].push(rating.rating);
            }
            if (rating.review) {
              metricsMap[rating.content_id].reviews_count++;
            }
          });

          // Calculate average ratings
          Object.entries(ratingsByEpisode).forEach(([episodeId, ratings]) => {
            if (ratings.length > 0) {
              const sum = ratings.reduce((acc, r) => acc + r, 0);
              metricsMap[episodeId].avg_rating = sum / ratings.length;
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
      }

      // Fetch user's favorited episodes from content_favorites
      if (profile?.id && data && data.length > 0) {
        const episodeIds = data.map(ep => ep.id);
        const { data: favData } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('content_type', 'episode')
          .eq('user_id', profile.id)
          .in('content_id', episodeIds);

        if (favData) {
          setFavoritedEpisodeIds(new Set(favData.map(f => f.content_id)));
        }
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEpisodesList = () => {
    let filtered = [...episodes];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ep) =>
          ep.title.toLowerCase().includes(query) ||
          ep.description?.toLowerCase().includes(query) ||
          ep.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((ep) =>
        selectedTags.every((tag) => ep.tags?.includes(tag))
      );
    }

    // Topic filter
    if (selectedTopics.length > 0) {
      filtered = filtered.filter((ep) => {
        const epTopics = episodeTopics[ep.id] || [];
        return selectedTopics.some((topicId) =>
          epTopics.some((t) => t.id === topicId)
        );
      });
    }

    // Visibility filter
    if (filterVisibility !== 'all') {
      filtered = filtered.filter((ep) => ep.visibility === filterVisibility);
    }

    // My content filter
    if (filterMyContent && profile) {
      filtered = filtered.filter((ep) => ep.author_id === profile.id);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'most-liked') {
        const aLikes = engagementMetrics[a.id]?.likes_count || 0;
        const bLikes = engagementMetrics[b.id]?.likes_count || 0;
        return bLikes - aLikes;
      }
      return 0;
    });

    setFilteredEpisodes(filtered);
  };

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
    setFilterVisibility('all');
    setFilterMyContent(false);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedTopics.length > 0 || searchQuery || filterVisibility !== 'all' || filterMyContent;

  const toggleFavorite = async (episodeId: string) => {
    if (!profile) return;

    const isFav = favoritedEpisodeIds.has(episodeId);

    // Optimistic update
    setFavoritedEpisodeIds(prev => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });

    try {
      if (isFav) {
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('content_type', 'episode')
          .eq('content_id', episodeId)
          .eq('user_id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_favorites')
          .insert({
            content_type: 'episode',
            content_id: episodeId,
            user_id: profile.id,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert
      setFavoritedEpisodeIds(prev => {
        const next = new Set(prev);
        if (isFav) {
          next.add(episodeId);
        } else {
          next.delete(episodeId);
        }
        return next;
      });
    }
  };

  const deleteEpisode = async (episodeId: string) => {
    if (!confirm('Are you sure you want to delete this episode?')) return;

    const { error } = await supabase
      .from('episodes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', episodeId);

    if (!error) {
      setEpisodes(episodes.filter(ep => ep.id !== episodeId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Video className="w-12 h-12 mx-auto text-gray-400 animate-pulse" />
          <p className="mt-2 text-gray-600">Loading episodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <PageHeader
        breadcrumbs={[{ label: 'Episodes' }]}
        icon={Video}
        iconBg="bg-purple-100"
        iconColor="text-purple-600"
        title="Episodes"
        description="Individual video content"
        actions={
          <Button onClick={() => navigate('/episodes/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Episode
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value as any)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Visibility</option>
            <option value="public">Public</option>
            <option value="member">Member</option>
            <option value="members-only">Members Only</option>
            <option value="private">Private</option>
          </select>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="p-4 space-y-4">
            {/* Tags Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-600" />
                <label className="font-medium text-sm">Filter by Tags</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 12).map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
                {availableTags.length > 12 && (
                  <Badge variant="secondary" className="text-xs">
                    +{availableTags.length - 12} more tags
                  </Badge>
                )}
              </div>
            </div>

            {/* Topics Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-600" />
                <label className="font-medium text-sm">Filter by Topics</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTopics.slice(0, 12).map((topic) => (
                  <Badge
                    key={topic.id}
                    variant={selectedTopics.includes(topic.id) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleTopic(topic.id)}
                    style={{
                      backgroundColor: selectedTopics.includes(topic.id) ? topic.color : undefined,
                      borderColor: topic.color,
                    }}
                  >
                    {topic.icon && <span className="mr-1">{topic.icon}</span>}
                    {topic.name}
                    {selectedTopics.includes(topic.id) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
                {availableTopics.length > 12 && (
                  <Badge variant="secondary" className="text-xs">
                    +{availableTopics.length - 12} more topics
                  </Badge>
                )}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </Card>
        )}

        <div className="flex items-center gap-4">
          <Button
            variant={filterMyContent ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMyContent(!filterMyContent)}
          >
            <Filter className="w-4 h-4 mr-2" />
            My Episodes
          </Button>

          {/* Sort Controls */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'newest' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortBy('oldest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'oldest' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Oldest
            </button>
            <button
              onClick={() => setSortBy('most-liked')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'most-liked' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Heart className="w-3 h-3 inline mr-1" />
              Most Liked
            </button>
          </div>

          {/* Active Filters Display */}
          {selectedTags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Tags:</span>
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {selectedTopics.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Topics:</span>
              {selectedTopics.map((topicId) => {
                const topic = availableTopics.find((t) => t.id === topicId);
                return topic ? (
                  <Badge key={topicId} variant="secondary" className="text-xs">
                    {topic.icon && <span className="mr-1">{topic.icon}</span>}
                    {topic.name}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => toggleTopic(topicId)}
                    />
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <span className="text-sm text-gray-600">
            {filteredEpisodes.length} {filteredEpisodes.length === 1 ? 'episode' : 'episodes'}
          </span>
        </div>
      </div>

      {/* Episodes Grid */}
      {filteredEpisodes.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No episodes found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || filterMyContent
              ? 'Try adjusting your filters'
              : 'Create your first episode to get started'}
          </p>
          {!searchQuery && !filterMyContent && (
            <Button onClick={() => navigate('/episodes/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Episode
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              author={episode.author_id ? authors[episode.author_id] : null}
              metrics={engagementMetrics[episode.id]}
              topics={episodeTopics[episode.id] || []}
              isFavorited={favoritedEpisodeIds.has(episode.id)}
              isOwner={!!(profile && episode.author_id === profile.id)}
              onToggleFavorite={toggleFavorite}
              onDelete={deleteEpisode}
              onTopicClick={toggleTopic}
            />
          ))}
        </div>
      )}
    </div>
  );
}