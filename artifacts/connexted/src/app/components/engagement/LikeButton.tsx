/**
 * LikeButton — Era 3 polymorphic like button.
 *
 * Self-contained: fetches its own initial state from content_likes using
 * useContentEngagement. Pass initialIsLiked + initialLikesCount only when
 * the parent has already loaded them (to skip the extra round-trip).
 *
 * Minimum usage:
 *   <LikeButton contentType="episode" contentId={ep.id} />
 */
import React from 'react';
import { Heart } from 'lucide-react';
import { useContentEngagement } from '@/hooks/useContentEngagement';

interface LikeButtonProps {
  contentType: string;
  contentId: string;
  /** Seed value — skips initial fetch when provided alongside initialLikesCount */
  initialIsLiked?: boolean;
  initialLikesCount?: number;
  /** @deprecated Pass nothing — the hook reads from useAuth internally */
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  onLikeChange?: (isLiked: boolean, newCount: number) => void;
}

export function LikeButton({
  contentType,
  contentId,
  initialIsLiked,
  initialLikesCount = 0,
  // userId prop is kept for backwards compat but the hook reads from useAuth
  userId: _userId,
  size = 'md',
  showCount = true,
  onLikeChange,
}: LikeButtonProps) {
  const { isLiked, likesCount, likeLoading, toggleLike, initialLoading, canEngage } =
    useContentEngagement(contentType, contentId, {
      initialIsLiked,
      initialLikesCount,
      // Only skip if the parent explicitly provided both seeds
      skipInitialFetch: initialIsLiked !== undefined,
    });

  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-lg gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const handleClick = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;
    await toggleLike();
    // Notify parent after toggle; read negated state as optimistic update
    onLikeChange?.(!prevLiked, !prevLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
  };

  return (
    <button
      onClick={handleClick}
      disabled={!canEngage || likeLoading || initialLoading}
      className={`
        inline-flex items-center ${sizeClasses[size]}
        px-3 py-1.5 rounded-full
        transition-all duration-200
        ${isLiked
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
        ${!canEngage ? 'opacity-50 cursor-not-allowed' : ''}
        ${likeLoading || initialLoading ? 'opacity-70 cursor-wait' : canEngage ? 'cursor-pointer' : ''}
      `}
      title={isLiked ? 'Unlike' : 'Like'}
    >
      <Heart
        size={iconSizes[size]}
        className={`transition-transform ${isLiked ? 'fill-current scale-110' : ''}`}
      />
      {showCount && (
        <span className="font-medium tabular-nums">
          {initialLoading ? '…' : likesCount > 0 ? likesCount.toLocaleString() : '0'}
        </span>
      )}
    </button>
  );
}