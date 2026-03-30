import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ExtensionResult {
  success: boolean;
  days_extended?: number;
  new_expires_at?: string;
  total_extensions?: number;
  max_extensions?: number;
  total_days_extended?: number;
  engagement_score?: number;
  reason?: string;
}

interface EngagementStats {
  total_extensions: number;
  total_days_extended: number;
  unique_engagers: number;
  breakdown_by_type: Record<string, {
    count: number;
    days: number;
  }>;
}

/**
 * Hook to handle engagement-based content survival
 * Automatically extends content expiration when users engage
 */
export function useEngagementExtension() {
  const [extending, setExtending] = useState(false);

  /**
   * Extend content expiration based on engagement
   * Call this after user likes, comments, reviews, etc.
   */
  const extendOnEngagement = useCallback(async (
    containerType: string,
    containerId: string,
    engagementType: 'like' | 'comment' | 'review' | 'share' | 'bookmark' | 'award' | 'upvote',
    engagementId: string,
    options: {
      showToast?: boolean;
      userId?: string;
    } = {}
  ): Promise<ExtensionResult> => {
    const { showToast = true, userId } = options;

    try {
      setExtending(true);

      // Get user ID if not provided
      let user_id = userId;
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Not authenticated');
        }
        user_id = user.id;
      }

      // Call the extension function
      const { data, error } = await supabase.rpc('extend_on_engagement', {
        p_container_type: containerType,
        p_container_id: containerId,
        p_engagement_type: engagementType,
        p_engagement_id: engagementId,
        p_user_id: user_id
      });

      if (error) throw error;

      const result = data as ExtensionResult;

      // Show toast notification if enabled
      if (showToast && result.success) {
        const days = result.days_extended || 0;
        const emoji = getEngagementEmoji(engagementType);
        
        toast.success(
          `${emoji} Extended by ${days.toFixed(1)} day${days !== 1 ? 's' : ''}!`,
          {
            description: `Your ${engagementType} keeps this content alive longer`,
            duration: 3000,
          }
        );
      } else if (showToast && !result.success) {
        // Silent failure for most cases (prevents spam)
        // Only show error for specific reasons
        if (result.reason === 'max_extensions_reached') {
          toast.info('This content has reached maximum community extensions', {
            description: 'It\'s clearly valuable to the community!',
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error extending on engagement:', error);
      
      if (showToast) {
        toast.error('Failed to extend content');
      }
      
      return {
        success: false,
        reason: 'error'
      };
    } finally {
      setExtending(false);
    }
  }, []);

  /**
   * Get engagement stats for a container
   */
  const getEngagementStats = useCallback(async (
    containerType: string,
    containerId: string
  ): Promise<EngagementStats | null> => {
    try {
      const { data, error } = await supabase.rpc('get_engagement_stats', {
        p_container_type: containerType,
        p_container_id: containerId
      });

      if (error) throw error;

      return data as EngagementStats;
    } catch (error) {
      console.error('Error getting engagement stats:', error);
      return null;
    }
  }, []);

  /**
   * Get leaderboard of most extended content
   */
  const getMostExtended = useCallback(async (
    containerType?: string,
    limit: number = 10
  ) => {
    try {
      const { data, error } = await supabase.rpc('get_most_extended_content', {
        p_container_type: containerType || null,
        p_limit: limit
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting most extended content:', error);
      return [];
    }
  }, []);

  return {
    extending,
    extendOnEngagement,
    getEngagementStats,
    getMostExtended
  };
}

/**
 * Helper to get emoji for engagement type
 */
function getEngagementEmoji(type: string): string {
  const emojis: Record<string, string> = {
    like: '👍',
    upvote: '⬆️',
    comment: '💬',
    review: '⭐',
    share: '🔗',
    bookmark: '📌',
    award: '🏆'
  };
  return emojis[type] || '✨';
}

/**
 * Hook to integrate extension into existing like/reaction system
 * Use this as a wrapper around your existing like functionality
 */
export function useLikeWithExtension() {
  const { extendOnEngagement } = useEngagementExtension();

  const likeWithExtension = useCallback(async (
    containerType: string,
    containerId: string,
    existingLikeFunction: () => Promise<{ id: string } | null>
  ) => {
    // Call your existing like function
    const like = await existingLikeFunction();
    
    if (like) {
      // Extend content expiration (silent, no toast since like already shows feedback)
      await extendOnEngagement(
        containerType,
        containerId,
        'like',
        like.id,
        { showToast: false }
      );
    }

    return like;
  }, [extendOnEngagement]);

  return { likeWithExtension };
}

/**
 * Hook to integrate extension into comment system
 */
export function useCommentWithExtension() {
  const { extendOnEngagement } = useEngagementExtension();

  const commentWithExtension = useCallback(async (
    containerType: string,
    containerId: string,
    existingCommentFunction: () => Promise<{ id: string } | null>
  ) => {
    // Call your existing comment function
    const comment = await existingCommentFunction();
    
    if (comment) {
      // Extend content expiration
      await extendOnEngagement(
        containerType,
        containerId,
        'comment',
        comment.id,
        { showToast: true }
      );
    }

    return comment;
  }, [extendOnEngagement]);

  return { commentWithExtension };
}

/**
 * Hook to integrate extension into review system
 */
export function useReviewWithExtension() {
  const { extendOnEngagement } = useEngagementExtension();

  const reviewWithExtension = useCallback(async (
    containerType: string,
    containerId: string,
    existingReviewFunction: () => Promise<{ id: string } | null>
  ) => {
    // Call your existing review function
    const review = await existingReviewFunction();
    
    if (review) {
      // Extend content expiration (reviews are high-value)
      await extendOnEngagement(
        containerType,
        containerId,
        'review',
        review.id,
        { showToast: true }
      );
    }

    return review;
  }, [extendOnEngagement]);

  return { reviewWithExtension };
}

export default useEngagementExtension;
