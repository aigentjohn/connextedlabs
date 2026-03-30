/**
 * FavoriteButton — Era 3 polymorphic favorite/save button.
 *
 * Self-contained: fetches its own initial state from content_favorites using
 * useContentEngagement. Pass initialIsFavorited only when the parent has
 * already loaded it (to skip the extra round-trip).
 *
 * Minimum usage:
 *   <FavoriteButton contentType="episode" contentId={ep.id} />
 */
import React from 'react';
import { Bookmark } from 'lucide-react';
import { useContentEngagement } from '@/hooks/useContentEngagement';

interface FavoriteButtonProps {
  contentType: string;
  contentId: string;
  /** Seed value — skips initial fetch when provided */
  initialIsFavorited?: boolean;
  /** @deprecated — kept for backwards compat; hook reads from useAuth */
  userId?: string;
  /** @deprecated — collections dialog removed; favorites are simple toggles */
  initialCollections?: string[];
  /** @deprecated */
  showCollectionsDialog?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onFavoriteChange?: (isFavorited: boolean, collections: string[]) => void;
}

export function FavoriteButton({
  contentType,
  contentId,
  initialIsFavorited,
  // kept for API compat
  userId: _userId,
  initialCollections: _initialCollections,
  showCollectionsDialog: _showCollectionsDialog,
  size = 'md',
  onFavoriteChange,
}: FavoriteButtonProps) {
  const { isFavorited, toggleFavorite, favoriteLoading, initialLoading, canEngage } =
    useContentEngagement(contentType, contentId, {
      initialIsFavorited,
      skipInitialFetch: initialIsFavorited !== undefined,
    });

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const handleClick = async () => {
    const prevFav = isFavorited;
    await toggleFavorite();
    onFavoriteChange?.(!prevFav, []);
  };

  return (
    <button
      onClick={handleClick}
      disabled={!canEngage || favoriteLoading || initialLoading}
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1.5 rounded-full
        transition-all duration-200
        ${isFavorited
          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
        ${!canEngage ? 'opacity-50 cursor-not-allowed' : ''}
        ${favoriteLoading || initialLoading ? 'opacity-70 cursor-wait' : canEngage ? 'cursor-pointer' : ''}
      `}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Bookmark
        size={iconSizes[size]}
        className={`transition-transform ${isFavorited ? 'fill-current scale-110' : ''}`}
      />
      <span className="text-sm font-medium">
        {isFavorited ? 'Saved' : 'Save'}
      </span>
    </button>
  );
}