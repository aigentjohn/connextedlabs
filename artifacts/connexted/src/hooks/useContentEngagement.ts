/**
 * useContentEngagement
 *
 * Canonical Era-3 hook for likes and favorites on any content type.
 * Reads from content_likes and content_favorites; writes back to the same.
 *
 * Drop-in usage — no pre-fetching needed in the parent:
 *
 *   const eng = useContentEngagement('episode', episode.id);
 *   // eng.isLiked, eng.toggleLike, eng.isFavorited, eng.toggleFavorite, ...
 *
 * Works for: document, book, deck, episode, blog, review, course, build,
 *            pitch, program, circle, meeting, playlist, magazine, and any
 *            other type added to the FULL_TYPE_LIST in apply-constraint-migrations.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export interface ContentEngagementState {
  /** True if the current user has liked this item */
  isLiked: boolean;
  /** Running count of likes fetched from DB */
  likesCount: number;
  /** True while the like toggle is being written */
  likeLoading: boolean;
  /** Toggle like on / off for the current user */
  toggleLike: () => Promise<void>;

  /** True if the current user has favorited this item */
  isFavorited: boolean;
  /** Toggle favorite on / off for the current user */
  toggleFavorite: () => Promise<void>;
  /** True while the favorite toggle is being written */
  favoriteLoading: boolean;

  /** True during the initial fetch of like/favorite state */
  initialLoading: boolean;

  /** False when no user is logged in — disable buttons when false */
  canEngage: boolean;
}

/**
 * Options to seed the hook with known values so it skips the initial fetch.
 * Providing these is optional — the hook fetches from the DB if omitted.
 */
export interface ContentEngagementOptions {
  initialIsLiked?: boolean;
  initialLikesCount?: number;
  initialIsFavorited?: boolean;
  /** Skip the initial DB fetch entirely (use when parent already loaded state) */
  skipInitialFetch?: boolean;
}

export function useContentEngagement(
  contentType: string,
  contentId: string,
  options: ContentEngagementOptions = {}
): ContentEngagementState {
  const { profile } = useAuth();
  const userId = profile?.id;

  const {
    initialIsLiked,
    initialLikesCount = 0,
    initialIsFavorited,
    skipInitialFetch = false,
  } = options;

  // We only skip the fetch when the caller explicitly provides initial values.
  const hasInitialValues =
    initialIsLiked !== undefined && initialIsFavorited !== undefined;

  const [isLiked, setIsLiked] = useState(initialIsLiked ?? false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [likeLoading, setLikeLoading] = useState(false);

  const [isFavorited, setIsFavorited] = useState(initialIsFavorited ?? false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(
    !skipInitialFetch && !hasInitialValues && !!userId && !!contentId
  );

  // Track the last contentId/type we fetched for so we re-fetch on navigation.
  const fetchedFor = useRef<string>('');

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    const key = `${contentType}:${contentId}:${userId}`;

    // Already have values, or no user, or same item already loaded
    if (!userId || !contentId || !contentType) return;
    if (skipInitialFetch || hasInitialValues) return;
    if (fetchedFor.current === key) return;

    fetchedFor.current = key;
    setInitialLoading(true);

    let cancelled = false;

    Promise.all([
      // Like status + count
      supabase
        .from('content_likes')
        .select('id, user_id')
        .eq('content_type', contentType)
        .eq('content_id', contentId),

      // Favorite status
      supabase
        .from('content_favorites')
        .select('id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('user_id', userId)
        .maybeSingle(),
    ])
      .then(([likesRes, favRes]) => {
        if (cancelled) return;

        if (likesRes.data) {
          const rows = likesRes.data;
          setLikesCount(rows.length);
          setIsLiked(rows.some(r => r.user_id === userId));
        }

        setIsFavorited(!!favRes.data);
      })
      .catch(err => {
        console.error('[useContentEngagement] initial fetch error:', err);
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contentType, contentId, userId, skipInitialFetch, hasInitialValues]);

  // ── toggleLike ────────────────────────────────────────────────────────────
  const toggleLike = useCallback(async () => {
    if (!userId) {
      toast.error('Sign in to like content');
      return;
    }
    if (likeLoading) return;

    // Optimistic
    const nextLiked = !isLiked;
    const nextCount = nextLiked
      ? likesCount + 1
      : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setLikeLoading(true);

    try {
      if (nextLiked) {
        const { error } = await supabase
          .from('content_likes')
          .insert({ content_type: contentType, content_id: contentId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .eq('user_id', userId);
        if (error) throw error;
      }
    } catch (err: unknown) {
      // Roll back optimistic update
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useContentEngagement] toggleLike error:', msg);
      toast.error('Failed to update like');
    } finally {
      setLikeLoading(false);
    }
  }, [userId, likeLoading, isLiked, likesCount, contentType, contentId]);

  // ── toggleFavorite ────────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async () => {
    if (!userId) {
      toast.error('Sign in to save content');
      return;
    }
    if (favoriteLoading) return;

    const nextFav = !isFavorited;
    setIsFavorited(nextFav);
    setFavoriteLoading(true);

    try {
      if (nextFav) {
        const { error } = await supabase
          .from('content_favorites')
          .insert({ content_type: contentType, content_id: contentId, user_id: userId });
        if (error) throw error;
        toast.success('Saved to favorites');
      } else {
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .eq('user_id', userId);
        if (error) throw error;
        toast.success('Removed from favorites');
      }
    } catch (err: unknown) {
      setIsFavorited(!nextFav);
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useContentEngagement] toggleFavorite error:', msg);
      toast.error('Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  }, [userId, favoriteLoading, isFavorited, contentType, contentId]);

  return {
    isLiked,
    likesCount,
    likeLoading,
    toggleLike,
    isFavorited,
    toggleFavorite,
    favoriteLoading,
    initialLoading,
    canEngage: !!userId,
  };
}

// ── Convenience batch hook ────────────────────────────────────────────────────
/**
 * Fetches like + favorite state for a LIST of items of the same content type.
 * Returns maps keyed by content_id. Useful for list pages (BooksPage, DecksPage…)
 *
 * Example:
 *   const { likedIds, favoritedIds } = useContentEngagementBatch('book', bookIds);
 */
export function useContentEngagementBatch(
  contentType: string,
  contentIds: string[]
): {
  likedIds: Set<string>;
  favoritedIds: Set<string>;
  /** total like count per id */
  likesCountMap: Record<string, number>;
  loading: boolean;
  refetch: () => void;
} {
  const { profile } = useAuth();
  const userId = profile?.id;

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!userId || contentIds.length === 0) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase
        .from('content_likes')
        .select('content_id, user_id')
        .eq('content_type', contentType)
        .in('content_id', contentIds),

      supabase
        .from('content_favorites')
        .select('content_id')
        .eq('content_type', contentType)
        .eq('user_id', userId)
        .in('content_id', contentIds),
    ])
      .then(([likesRes, favsRes]) => {
        if (cancelled) return;

        // Build count map and user's liked set
        const countMap: Record<string, number> = {};
        const liked = new Set<string>();
        for (const row of likesRes.data ?? []) {
          countMap[row.content_id] = (countMap[row.content_id] ?? 0) + 1;
          if (row.user_id === userId) liked.add(row.content_id);
        }
        setLikesCountMap(countMap);
        setLikedIds(liked);

        const faved = new Set<string>(
          (favsRes.data ?? []).map(r => r.content_id)
        );
        setFavoritedIds(faved);
      })
      .catch(err => {
        console.error('[useContentEngagementBatch] fetch error:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentIds.join(','), userId, tick]);

  return { likedIds, favoritedIds, likesCountMap, loading, refetch };
}