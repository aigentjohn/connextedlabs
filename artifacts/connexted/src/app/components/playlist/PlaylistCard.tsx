import { Link } from 'react-router';
import { Card, CardContent, CardFooter, CardHeader } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { 
  PlayCircle, 
  Users, 
  Globe, 
  Lock, 
  Heart, 
  MessageSquare, 
  Share2, 
  Star,
  ListVideo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  topic_type: 'audience' | 'purpose' | 'theme';
}

interface PlaylistCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tags?: string[];
  topics?: Topic[];
  memberCount?: number;
  visibility?: 'public' | 'member' | 'unlisted' | 'private';
  creator?: { id: string; name: string } | null;
  likes_count?: number;
  avg_rating?: number;
  reviews_count?: number;
  shares_count?: number;
  episodeCount?: number;
  className?: string;
}

export function PlaylistCard({
  id,
  name,
  slug,
  description,
  tags = [],
  topics = [],
  memberCount = 0,
  visibility = 'public',
  creator,
  likes_count = 0,
  avg_rating = 0,
  reviews_count = 0,
  shares_count = 0,
  episodeCount = 0,
  className
}: PlaylistCardProps) {
  
  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'private':
        return <Lock className="w-3 h-3" />;
      case 'member':
        return <Users className="w-3 h-3" />;
      default:
        return <Globe className="w-3 h-3" />;
    }
  };

  return (
    <Card className={cn("h-full flex flex-col hover:shadow-md transition-shadow", className)}>
      <Link to={`/playlists/${slug}`} className="flex-1">
        <div className="aspect-video bg-gray-100 relative rounded-t-lg overflow-hidden group">
          {/* Placeholder for playlist thumbnail */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
            <ListVideo className="w-12 h-12 text-indigo-300" />
          </div>
          
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge variant="secondary" className="bg-white/90 hover:bg-white text-xs gap-1">
              {getVisibilityIcon()}
              <span className="capitalize">{visibility.replace('-', ' ')}</span>
            </Badge>
          </div>
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
          </div>

          <div className="absolute bottom-2 right-2">
             <Badge className="bg-black/70 hover:bg-black/80 text-white border-0">
               {episodeCount} episodes
             </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
              {name}
            </h3>
            {creator && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                by {creator.name}
              </p>
            )}
          </div>

          {description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {topics.slice(0, 2).map((topic) => (
              <Badge key={topic.id} variant="outline" className="text-xs">
                {topic.name}
              </Badge>
            ))}
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                #{tag}
              </Badge>
            ))}
            {(topics.length + tags.length) > 4 && (
              <span className="text-xs text-gray-400 self-center">
                +{topics.length + tags.length - 4}
              </span>
            )}
          </div>
        </CardContent>
      </Link>

      <CardFooter className="p-4 pt-0 text-xs text-gray-500 flex items-center justify-between border-t border-gray-100 mt-auto">
        <div className="flex items-center gap-4 py-3">
          <div className="flex items-center gap-1" title={`${likes_count} likes`}>
            <Heart className="w-3.5 h-3.5" />
            <span>{likes_count}</span>
          </div>
          <div className="flex items-center gap-1" title={`${reviews_count} reviews`}>
            <Star className="w-3.5 h-3.5 text-yellow-500" />
            <span>{avg_rating > 0 ? avg_rating.toFixed(1) : '-'}</span>
          </div>
          <div className="flex items-center gap-1" title={`${memberCount} members`}>
            <Users className="w-3.5 h-3.5" />
            <span>{memberCount}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}