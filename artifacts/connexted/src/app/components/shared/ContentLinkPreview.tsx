import { Card, CardContent } from '@/app/components/ui/card';
import { FileText, MessageSquare, Library, Star, Eye, ThumbsUp, Package } from 'lucide-react';
import { Link } from 'react-router';

interface ContentPreviewData {
  type: 'prompt' | 'document' | 'library' | 'endorsement' | 'course' | 'event' | 'build' | 'pitch';
  id: string;
  slug: string;
  title: string;
  description?: string;
  avgRating?: number;
  ratingsCount?: number;
  likesCount?: number;
  viewsCount?: number;
}

interface ContentLinkPreviewProps {
  url: string;
  content?: ContentPreviewData;
  loading?: boolean;
}

const contentTypeIcons = {
  prompt: MessageSquare,
  document: FileText,
  library: Library,
  endorsement: Star,
  course: Package,
  event: Package,
  build: Package,
  pitch: Package,
};

const contentTypeLabels = {
  prompt: 'AI Prompt',
  document: 'Document',
  library: 'Library',
  endorsement: 'Endorsement',
  course: 'Course',
  event: 'Event',
  build: 'Build',
  pitch: 'Pitch',
};

export function ContentLinkPreview({ url, content, loading }: ContentLinkPreviewProps) {
  // If still loading or no content found, show plain link
  if (loading) {
    return (
      <div className="animate-pulse p-4 border rounded-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-muted rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {url}
      </a>
    );
  }

  const Icon = contentTypeIcons[content.type] || FileText;
  const typeLabel = contentTypeLabels[content.type] || content.type;
  const contentUrl = `/${content.type}s/${content.slug}`;

  return (
    <Link
      to={contentUrl}
      className="block p-4 border rounded-lg hover:bg-accent transition-colors group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="font-medium uppercase tracking-wide">{typeLabel}</span>
            {content.avgRating !== undefined && content.avgRating > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {content.avgRating.toFixed(1)}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h4 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
            {content.title}
          </h4>

          {/* Description */}
          {content.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {content.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {content.likesCount !== undefined && content.likesCount > 0 && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {content.likesCount}
              </span>
            )}
            {content.ratingsCount !== undefined && content.ratingsCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {content.ratingsCount} {content.ratingsCount === 1 ? 'review' : 'reviews'}
              </span>
            )}
            {content.viewsCount !== undefined && content.viewsCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {content.viewsCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}