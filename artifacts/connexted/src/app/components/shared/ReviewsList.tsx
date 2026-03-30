import React from 'react';
import { Star, ThumbsUp, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  reviewText?: string;
  wasHelpful?: boolean;
  createdAt: string;
  helpfulCount?: number;
}

interface ReviewsListProps {
  reviews: Review[];
  loading?: boolean;
  emptyMessage?: string;
}

export function ReviewsList({ 
  reviews, 
  loading,
  emptyMessage = 'No reviews yet. Be the first to review!' 
}: ReviewsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            {/* User Avatar */}
            <div className="flex-shrink-0">
              {review.userAvatar ? (
                <img
                  src={review.userAvatar}
                  alt={review.userName}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {review.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Review Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{review.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                  </p>
                </div>
                
                {/* Star Rating */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Helpful Badge */}
              {review.wasHelpful && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-medium">Helpful</span>
                </div>
              )}

              {/* Review Text */}
              {review.reviewText && (
                <p className="text-sm leading-relaxed mb-3">
                  {review.reviewText}
                </p>
              )}

              {/* Helpful Count */}
              {review.helpfulCount !== undefined && review.helpfulCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ThumbsUp className="w-3 h-3" />
                  <span>
                    {review.helpfulCount} {review.helpfulCount === 1 ? 'person' : 'people'} found this helpful
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
