import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { 
  Users, 
  FileText, 
  Heart, 
  Globe, 
  Lock, 
  EyeOff,
  Newspaper,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Topic {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface Magazine {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  cover_image_url?: string;
  curator_id: string;
  curator_name?: string;
  curator_avatar?: string;
  blog_count: number;
  subscriber_count: number;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  curation_type: 'auto' | 'curated' | 'hybrid';
  publishing_frequency?: string;
  created_at: string;
  updated_at: string;
  topics?: Topic[];
  is_subscribed?: boolean;
}

interface MagazineCardProps {
  magazine: Magazine;
  onSubscribe?: (magazineId: string) => void;
  onUnsubscribe?: (magazineId: string) => void;
  showActions?: boolean;
}

export default function MagazineCard({ 
  magazine, 
  onSubscribe, 
  onUnsubscribe,
  showActions = true 
}: MagazineCardProps) {
  const handleSubscribeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (magazine.is_subscribed && onUnsubscribe) {
      onUnsubscribe(magazine.id);
    } else if (!magazine.is_subscribed && onSubscribe) {
      onSubscribe(magazine.id);
    }
  };

  const getVisibilityIcon = () => {
    switch (magazine.visibility) {
      case 'public':   return <Globe className="w-3 h-3" />;
      case 'member':   return <Users className="w-3 h-3" />;
      case 'unlisted': return <EyeOff className="w-3 h-3" />;
      case 'private':  return <Lock className="w-3 h-3" />;
    }
  };

  const getVisibilityLabel = () => {
    switch (magazine.visibility) {
      case 'public':   return 'Public';
      case 'member':   return 'Members Only';
      case 'unlisted': return 'Unlisted';
      case 'private':  return 'Private';
    }
  };

  return (
    <Link to={`/magazines/${magazine.id}`}>
      <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-indigo-200 group">
        {/* Cover Image */}
        {magazine.cover_image_url && (
          <div className="w-full h-48 overflow-hidden rounded-t-lg">
            <img
              src={magazine.cover_image_url}
              alt={magazine.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        )}

        <CardHeader className="space-y-2">
          {/* Title and Auto-Curated Badge */}
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 flex-1 group-hover:text-indigo-600 transition-colors">
              {magazine.name}
            </CardTitle>
            {magazine.curation_type === 'auto' && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3" />
                Auto
              </Badge>
            )}
          </div>

          {/* Tagline */}
          {magazine.tagline && (
            <CardDescription className="text-sm line-clamp-2">
              {magazine.tagline}
            </CardDescription>
          )}

          {/* Topics */}
          {magazine.topics && magazine.topics.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {magazine.topics.slice(0, 3).map((topic) => (
                <Badge 
                  key={topic.id} 
                  variant="secondary" 
                  className="text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/topics/${topic.slug}`;
                  }}
                >
                  {topic.name}
                </Badge>
              ))}
              {magazine.topics.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{magazine.topics.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {magazine.description && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {magazine.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{magazine.blog_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{magazine.subscriber_count || 0}</span>
            </div>
            {getVisibilityIcon() && (
              <div className="flex items-center gap-1">
                {getVisibilityIcon()}
                <span className="text-xs">{getVisibilityLabel()}</span>
              </div>
            )}
          </div>

          {/* Update Frequency */}
          {magazine.publishing_frequency && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span>Updates {magazine.publishing_frequency}</span>
            </div>
          )}

          {/* Curator Info */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                {magazine.curator_avatar && (
                  <AvatarImage src={magazine.curator_avatar} />
                )}
                <AvatarFallback className="text-xs">
                  {magazine.curator_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs text-gray-600">
                  {magazine.curator_name || 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(magazine.updated_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Subscribe Button */}
            {showActions && (
              <Button
                size="sm"
                variant={magazine.is_subscribed ? "outline" : "default"}
                onClick={handleSubscribeClick}
                className="shrink-0"
              >
                {magazine.is_subscribed ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}