import { Link, useNavigate } from 'react-router';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Play, Heart, Star, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
}

interface Author {
  id: string;
  name: string;
  avatar: string | null;
}

interface EngagementMetrics {
  likes_count: number;
  avg_rating: number;
  reviews_count: number;
  shares_count: number;
}

interface Episode {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_minutes: number | null;
  thumbnail_url: string | null;
  author_id: string | null;
  tags: string[];
  video_platform: string;
  video_id?: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  is_published: boolean;
  created_at: string;
}

interface EpisodeCardProps {
  episode: Episode;
  author?: Author | null;
  metrics?: EngagementMetrics;
  topics?: Topic[];
  isFavorited?: boolean;
  isOwner?: boolean;
  onToggleFavorite?: (episodeId: string) => void;
  onDelete?: (episodeId: string) => void;
  onTopicClick?: (topicId: string) => void;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'N/A';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function getVideoThumbnail(episode: Episode): string | null {
  if (episode.thumbnail_url) return episode.thumbnail_url;
  if (episode.video_platform === 'youtube' && episode.video_id) {
    return `https://img.youtube.com/vi/${episode.video_id}/maxresdefault.jpg`;
  }
  return null;
}

export function EpisodeCard({
  episode,
  author,
  metrics,
  topics = [],
  isFavorited = false,
  isOwner = false,
  onToggleFavorite,
  onDelete,
  onTopicClick,
}: EpisodeCardProps) {
  const navigate = useNavigate();
  const thumbnail = getVideoThumbnail(episode);
  const m = metrics ?? { likes_count: 0, avg_rating: 0, reviews_count: 0, shares_count: 0 };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <Link to={`/episodes/${episode.id}`} className="block relative aspect-video bg-gray-100">
        {thumbnail ? (
          <img src={thumbnail} alt={episode.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-gray-300" />
          </div>
        )}
        {episode.duration_minutes && (
          <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
            {formatDuration(episode.duration_minutes)}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link to={`/episodes/${episode.id}`}>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-purple-600 transition-colors">
            {episode.title}
          </h3>
        </Link>

        {episode.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{episode.description}</p>
        )}

        {/* Tags */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {episode.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            {episode.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{episode.tags.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Topics */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {topics.slice(0, 2).map((topic) => (
              <Badge
                key={topic.id}
                variant="outline"
                className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: topic.color, color: topic.color }}
                onClick={() => onTopicClick?.(topic.id)}
              >
                {topic.icon && <span className="mr-1">{topic.icon}</span>}
                {topic.name}
              </Badge>
            ))}
            {topics.length > 2 && (
              <Badge variant="outline" className="text-xs">+{topics.length - 2}</Badge>
            )}
          </div>
        )}

        {/* Engagement metrics */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 pb-3 border-b">
          <div className="flex items-center gap-1" title="Likes">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>{m.likes_count}</span>
          </div>
          {m.avg_rating > 0 && (
            <div className="flex items-center gap-1" title="Average rating">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{m.avg_rating.toFixed(1)}</span>
            </div>
          )}
          {m.reviews_count > 0 && (
            <div className="flex items-center gap-1" title="Reviews">
              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>{m.reviews_count}</span>
            </div>
          )}
          {m.shares_count > 0 && (
            <div className="flex items-center gap-1" title="Shares">
              <Share2 className="w-3.5 h-3.5 text-green-500" />
              <span>{m.shares_count}</span>
            </div>
          )}
        </div>

        {/* Author */}
        {author && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden">
              {author.avatar
                ? <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
                : author.name.charAt(0)
              }
            </div>
            <span className="text-xs text-gray-600">{author.name}</span>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/episodes/${episode.id}`)}
              className="flex-1"
            >
              Manage
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleFavorite?.(episode.id)}
              className={cn(isFavorited && 'text-amber-600')}
            >
              <Star className={cn('w-3 h-3', isFavorited && 'fill-amber-400')} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete?.(episode.id)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
