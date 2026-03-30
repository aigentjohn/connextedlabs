import React, { useState } from 'react';
import { 
  ThumbsUp, 
  Bookmark, 
  Star, 
  Share2, 
  Eye 
} from 'lucide-react';
import { Button } from '../ui/button';
import { ShareDialog } from './ShareDialog';
import { RatingDialog } from './RatingDialog';

export interface ContentEngagementProps {
  contentType: 'prompt' | 'document' | 'library' | 'endorsement' | 'course' | 'event' | 'build' | 'pitch' | 'program';
  contentId: string;
  contentSlug: string;
  contentTitle: string;
  
  // Aggregate stats
  likesCount?: number;
  favoritesCount?: number;
  sharesCount?: number;
  avgRating?: number;
  ratingsCount?: number;
  viewsCount?: number;
  usesCount?: number;
  
  // User's engagement status
  userHasLiked?: boolean;
  userHasFavorited?: boolean;
  userRating?: number;
  
  // Callbacks
  onLike?: () => void;
  onFavorite?: () => void;
  onRate?: (rating: number, reviewText?: string) => void;
  
  // Display options
  compact?: boolean;
  showActions?: boolean;
}

export function ContentEngagement({
  contentType,
  contentId,
  contentSlug,
  contentTitle,
  likesCount = 0,
  favoritesCount = 0,
  sharesCount = 0,
  avgRating,
  ratingsCount = 0,
  viewsCount = 0,
  usesCount,
  userHasLiked = false,
  userHasFavorited = false,
  userRating,
  onLike,
  onFavorite,
  onRate,
  compact = false,
  showActions = true,
}: ContentEngagementProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

  const shareUrl = `${window.location.origin}/${contentType}s/${contentSlug}`;

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <ThumbsUp className="w-4 h-4" />
          <span>{likesCount}</span>
        </div>
        {avgRating !== undefined && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{avgRating.toFixed(1)}</span>
            {ratingsCount > 0 && <span className="text-xs">({ratingsCount})</span>}
          </div>
        )}
        {viewsCount > 0 && (
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{viewsCount}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregate Stats */}
      <div className="flex items-center gap-6 text-sm">
        {/* Likes */}
        <div className="flex items-center gap-2">
          <ThumbsUp className={`w-4 h-4 ${userHasLiked ? 'fill-blue-500 text-blue-500' : 'text-muted-foreground'}`} />
          <span className="font-medium">{likesCount}</span>
          <span className="text-muted-foreground">likes</span>
        </div>
        
        {/* Favorites */}
        <div className="flex items-center gap-2">
          <Bookmark className={`w-4 h-4 ${userHasFavorited ? 'fill-blue-500 text-blue-500' : 'text-muted-foreground'}`} />
          <span className="font-medium">{favoritesCount}</span>
          <span className="text-muted-foreground">saved</span>
        </div>
        
        {/* Shares */}
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{sharesCount}</span>
          <span className="text-muted-foreground">shares</span>
        </div>
        
        {/* Rating */}
        {(avgRating !== undefined || ratingsCount > 0) && (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{avgRating?.toFixed(1) || 'N/A'}</span>
            <span className="text-muted-foreground">
              ({ratingsCount} {ratingsCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
        
        {/* Views */}
        {viewsCount > 0 && (
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{viewsCount} views</span>
          </div>
        )}
        
        {/* Uses (for prompts, documents) */}
        {usesCount !== undefined && usesCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{usesCount} uses</span>
          </div>
        )}
      </div>
      
      {/* User Actions */}
      {showActions && (
        <div className="flex gap-2">
          {/* Like Button */}
          {onLike && (
            <Button
              variant={userHasLiked ? "default" : "outline"}
              size="sm"
              onClick={onLike}
            >
              <ThumbsUp className={`w-4 h-4 mr-2 ${userHasLiked ? 'fill-white' : ''}`} />
              {userHasLiked ? 'Liked' : 'Like'}
            </Button>
          )}
          
          {/* Favorite Button */}
          {onFavorite && (
            <Button
              variant={userHasFavorited ? "secondary" : "outline"}
              size="sm"
              onClick={onFavorite}
            >
              <Bookmark className={`w-4 h-4 mr-2 ${userHasFavorited ? 'fill-current' : ''}`} />
              {userHasFavorited ? 'Saved' : 'Save'}
            </Button>
          )}
          
          {/* Share Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          
          {/* Rate Button */}
          {onRate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRatingDialogOpen(true)}
            >
              <Star className={`w-4 h-4 mr-2 ${userRating ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              {userRating ? `Rated ${userRating}★` : 'Write Review'}
            </Button>
          )}
        </div>
      )}
      
      {/* Dialogs */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contentTitle={contentTitle}
        shareUrl={shareUrl}
      />
      
      {onRate && (
        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          contentTitle={contentTitle}
          contentType={contentType}
          existingRating={userRating}
          onSubmit={(rating, reviewText, wasHelpful) => {
            onRate(rating, reviewText);
            setRatingDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
