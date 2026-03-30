import { useState } from 'react';
import { Link } from 'react-router';
import { GitFork, Calendar, Heart, Star, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

interface Fork {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  forksCount: number;
  likesCount: number;
  avgRating?: number;
  ratingsCount?: number;
  createdAt: string;
}

interface ForkTreeProps {
  contentType: 'prompt' | 'build';
  contentId: string;
  forks: Fork[];
  variant?: 'default' | 'compact';
  sortBy?: 'recent' | 'popular' | 'forks';
  maxDisplay?: number;
  showStats?: boolean;
  className?: string;
}

export function ForkTree({
  contentType,
  contentId,
  forks,
  variant = 'default',
  sortBy = 'recent',
  maxDisplay,
  showStats = true,
  className = ''
}: ForkTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayCount, setDisplayCount] = useState(maxDisplay || forks.length);

  if (forks.length === 0) {
    return null;
  }

  // Sort forks
  const sortedForks = [...forks].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.likesCount - a.likesCount;
      case 'forks':
        return b.forksCount - a.forksCount;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const displayedForks = sortedForks.slice(0, displayCount);
  const hasMore = forks.length > displayCount;

  // Compact variant - just count
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <GitFork className="w-4 h-4" />
        <span className="font-medium">{forks.length}</span>
        <span>fork{forks.length !== 1 ? 's' : ''}</span>
      </div>
    );
  }

  // Full fork tree display
  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <GitFork className="w-5 h-5 text-gray-700" />
          <h3 className="font-bold text-gray-900">
            Forks ({forks.length})
          </h3>
          {sortBy === 'popular' && (
            <TrendingUp className="w-4 h-4 text-blue-600" />
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Fork List */}
      {isExpanded && (
        <div className="divide-y">
          {displayedForks.map(fork => (
            <a
              key={fork.id}
              href={`/${contentType}s/${fork.id}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start gap-4">
                {/* Fork Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 hover:text-blue-600 truncate">
                    {fork.title}
                  </h4>
                  
                  {fork.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {fork.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      by{' '}
                      <Link
                        to={`/users/${fork.creatorId}`}
                        className="font-medium text-gray-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {fork.creatorName}
                      </Link>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(fork.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                {showStats && (
                  <div className="flex flex-col items-end gap-1 text-xs text-gray-600">
                    {fork.forksCount > 0 && (
                      <div className="flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        <span className="font-medium">{fork.forksCount}</span>
                      </div>
                    )}
                    {fork.likesCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span className="font-medium">{fork.likesCount}</span>
                      </div>
                    )}
                    {fork.avgRating && fork.ratingsCount && fork.ratingsCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {fork.avgRating.toFixed(1)} ({fork.ratingsCount})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </a>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="p-3 text-center bg-gray-50">
              <button
                onClick={() => setDisplayCount(prev => prev + (maxDisplay || 10))}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Show more ({forks.length - displayCount} remaining)
              </button>
            </div>
          )}

          {/* Empty State */}
          {forks.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <GitFork className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No forks yet</p>
              <p className="text-xs mt-1">Be the first to fork this {contentType}!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}