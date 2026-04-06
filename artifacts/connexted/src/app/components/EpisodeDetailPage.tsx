import { useState,useEffect } from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import { VideoPlayer } from '@/app/components/coaching/VideoPlayer';
import {
  Video,
  Eye,
  Clock,
  User,
  Tag,
  Edit,
  Trash2,
  PlayCircle,
  Target,
  Users,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [userLike, setUserLike] = useState<any>(null);
  const [userFavorite, setUserFavorite] = useState<any>(null);
  const [userRating, setUserRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && id) {
      fetchEpisodeData();
    }
  }, [profile, id]);

  const fetchEpisodeData = async () => {
    try {
      // Check if id is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      // Fetch episode by id or slug
      let query = supabase
        .from('episodes')
        .select('*');
      
      if (isUUID) {
        query = query.eq('id', id).single();
      } else {
        // For slugs, get the first match (in case of duplicates)
        query = query.eq('slug', id).limit(1);
      }
      
      const { data: episodeData, error: episodeError } = await query;

      if (episodeError) throw episodeError;
      
      // Handle array response for slug queries
      const episode = isUUID ? episodeData : (Array.isArray(episodeData) ? episodeData[0] : episodeData);
      
      if (!episode) {
        throw new Error('Episode not found');
      }
      
      setEpisode(episode);

      // Use the actual episode ID (not the slug parameter) for subsequent queries
      const episodeId = episode.id;

      // Fetch author
      if (episode.author_id) {
        const { data: authorData } = await supabase
          .from('users')
          .select('id, name, avatar')
          .eq('id', episode.author_id)
          .single();
        
        if (authorData) setAuthor(authorData);
      }

      // Fetch playlists that include this episode
      const { data: playlistsData } = await supabase
        .from('playlists')
        .select('id, name, slug')
        .contains('episode_ids', [episodeId]);
      
      if (playlistsData) setPlaylists(playlistsData);

      // Fetch topics associated with this episode via topic_links
      const { data: topicLinksData } = await supabase
        .from('topic_links')
        .select('topics(*)')
        .eq('entity_type', 'episode')
        .eq('entity_id', episodeId);
      
      if (topicLinksData) {
        const topicsArray = topicLinksData
          .map((link: any) => link.topics)
          .filter((topic: any) => topic !== null);
        setTopics(topicsArray);
      }

      // Fetch ratings for this episode
      const { data: ratingsData } = await supabase
        .from('content_ratings')
        .select(`
          *,
          users(id, name, avatar)
        `)
        .eq('content_type', 'episode')
        .eq('content_id', episodeId)
        .order('created_at', { ascending: false });
      
      if (ratingsData) setRatings(ratingsData);

      // Fetch user's like status for this episode
      if (profile) {
        const { data: likeData } = await supabase
          .from('content_likes')
          .select('id')
          .eq('content_type', 'episode')
          .eq('content_id', episodeId)
          .eq('user_id', profile.id)
          .maybeSingle();
        
        setUserLike(likeData);
      }

      // Fetch user's favorite status for this episode
      if (profile) {
        const { data: favoriteData } = await supabase
          .from('content_favorites')
          .select('*')
          .eq('content_type', 'episode')
          .eq('content_id', episodeId)
          .eq('user_id', profile.id)
          .maybeSingle();
        
        setUserFavorite(favoriteData);
      }

      // Fetch user's rating for this episode
      if (profile) {
        const { data: ratingData } = await supabase
          .from('content_ratings')
          .select('*')
          .eq('content_type', 'episode')
          .eq('content_id', episodeId)
          .eq('user_id', profile.id)
          .maybeSingle();
        
        setUserRating(ratingData);
      }

    } catch (error) {
      console.error('Error fetching episode:', error);
      toast.error('Failed to load episode');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this episode?')) return;

    try {
      const { error } = await supabase
        .from('episodes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Episode deleted successfully');
      navigate('/episodes');
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast.error('Failed to delete episode');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getVideoProvider = (url: string, platform: string | null) => {
    if (platform && ['youtube', 'vimeo', 'loom', 'wistia'].includes(platform.toLowerCase())) {
      return platform.toLowerCase() as 'youtube' | 'vimeo' | 'loom' | 'wistia';
    }
    if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo')) return 'vimeo';
    if (url.includes('loom')) return 'loom';
    if (url.includes('wistia')) return 'wistia';
    return 'direct';
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading episode...</p>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Episode not found</p>
        <Button asChild className="mt-4">
          <Link to="/episodes">Back to Episodes</Link>
        </Button>
      </div>
    );
  }

  const isAuthor = episode.author_id === profile.id;
  const videoProvider = getVideoProvider(episode.video_url, episode.video_platform);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs 
        items={[
          { label: 'Episodes', href: '/episodes' },
          { label: episode.title }
        ]} 
      />

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{episode.title}</h1>
            {author && (
              <Link
                to={`/users/${author.id}`}
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 mb-4"
              >
                <User className="w-4 h-4" />
                <span>{author.name}</span>
              </Link>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(episode.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {episode.views || 0} views
              </span>
              {episode.category && (
                <Badge variant="secondary">{episode.category}</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          {isAuthor && (
            <div className="flex gap-2">
              <Link to={`/episodes/${id}/settings`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Tags */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {episode.tags.map((tag: string) => (
              <Link
                key={tag}
                to={`/browse?tag=${encodeURIComponent(tag)}`}
                className="inline-block"
              >
                <Badge variant="outline" className="gap-1 hover:bg-gray-100 cursor-pointer transition-colors">
                  <Tag className="w-3 h-3" />
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Engagement Actions */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t">
          <LikeButton
            contentType="episode"
            contentId={episode.id}
            userId={profile?.id}
            initialLikesCount={episode.likes_count || 0}
            initialIsLiked={!!userLike}
            onLikeChange={() => fetchEpisodeData()}
          />
          <FavoriteButton
            contentType="episode"
            contentId={episode.id}
            userId={profile?.id}
            initialIsFavorited={!!userFavorite}
            initialCollections={userFavorite?.collections || []}
            onFavoriteChange={() => fetchEpisodeData()}
          />
          <ShareInviteButton
            entityType="episode"
            entityId={episode.id}
            entityName={episode.title}
          />
        </div>
      </div>

      {/* Video Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Video
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {episode.video_url ? (
            <VideoPlayer
              videoId={episode.id}
              videoUrl={episode.video_url}
              videoProvider={videoProvider}
              title={episode.title}
              durationMinutes={episode.duration_minutes || undefined}
              userId={profile.id}
              embedCode={episode.embed_code}
            />
          ) : (
            <div className="p-6 text-center text-gray-600">No video URL available</div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {episode.description && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{episode.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Playlists */}
      {playlists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Appears in Playlists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  to={`/playlists/${playlist.slug || playlist.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <PlayCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-medium text-gray-900">{playlist.name}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topics Section */}
      {topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* WHO */}
              {topics.filter((t: any) => t.category === 'WHO').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Audience</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topics
                      .filter((t: any) => t.category === 'WHO')
                      .map((topic: any) => (
                        <Link
                          key={topic.id}
                          to={`/browse?topic=${topic.slug}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                        >
                          {topic.name}
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {/* WHY */}
              {topics.filter((t: any) => t.category === 'WHY').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Purpose</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topics
                      .filter((t: any) => t.category === 'WHY')
                      .map((topic: any) => (
                        <Link
                          key={topic.id}
                          to={`/browse?topic=${topic.slug}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100 transition-colors"
                        >
                          {topic.name}
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {/* Theme */}
              {topics.filter((t: any) => t.category === 'Theme').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-gray-700">Themes</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topics
                      .filter((t: any) => t.category === 'Theme')
                      .map((topic: any) => (
                        <Link
                          key={topic.id}
                          to={`/browse?topic=${topic.slug}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm hover:bg-amber-100 transition-colors"
                        >
                          {topic.name}
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ratings & Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews & Ratings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rating Widget */}
          <RatingWidget
            contentType="episode"
            contentId={episode.id}
            userId={profile?.id}
            initialRating={userRating?.rating || 0}
            initialReview={userRating?.review_text || ''}
            avgRating={episode.avg_rating || 0}
            ratingsCount={episode.ratings_count || 0}
            onRatingSubmit={() => fetchEpisodeData()}
          />

          {/* Individual Ratings */}
          {ratings.length > 0 && (
            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                All Reviews ({ratings.length})
              </h4>
              <div className="space-y-4">
                {ratings.map((rating: any) => (
                  <div key={rating.id} className="border-b pb-4 last:border-0">
                    {/* Rating Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {rating.users?.avatar && (
                          <img
                            src={rating.users.avatar}
                            alt={rating.users.name}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {rating.users?.name || 'Anonymous'}
                          </p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-sm ${
                                  star <= rating.rating
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Review Text */}
                    {rating.review_text && (
                      <p className="text-gray-700 mb-3">{rating.review_text}</p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {rating.was_helpful && (
                        <Badge variant="secondary" className="text-xs">
                          ✓ Helpful
                        </Badge>
                      )}
                      {rating.would_recommend && (
                        <Badge variant="secondary" className="text-xs">
                          👍 Recommends
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ratings.length === 0 && !userRating && (
            <div className="text-center py-8 text-gray-500">
              <p>No reviews yet. Be the first to review this episode!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}