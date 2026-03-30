import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type ContentType = 'document' | 'pitch' | 'build' | 'portfolio' | 'post' | 'review' | 'event';

interface UseViewTrackingOptions {
  enabled?: boolean;
  trackEngagement?: boolean;
}

/**
 * Hook to automatically track views for any content type
 * 
 * @example
 * ```tsx
 * function DocumentPage({ id }) {
 *   useViewTracking('document', id);
 *   // ... rest of component
 * }
 * ```
 */
export function useViewTracking(
  contentType: ContentType,
  contentId: string | undefined,
  options: UseViewTrackingOptions = {}
) {
  const { enabled = true, trackEngagement = true } = options;
  const { profile } = useAuth();
  const viewTracked = useRef(false);
  const startTime = useRef<number>(Date.now());
  const sessionId = useRef<string>(getOrCreateSessionId());

  // Track view on mount (once per page load)
  useEffect(() => {
    if (!enabled || !contentId || viewTracked.current) return;

    trackView();
    viewTracked.current = true;
  }, [contentId, enabled]);

  // Track engagement on unmount
  useEffect(() => {
    if (!enabled || !contentId || !trackEngagement) return;

    return () => {
      trackEngagementMetrics();
    };
  }, [contentId, enabled, trackEngagement]);

  const trackView = async () => {
    if (!contentId) return;

    try {
      await supabase.rpc('track_content_view', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_viewer_id: profile?.id || null
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const trackEngagementMetrics = async () => {
    if (!contentId) return;

    try {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      
      // Calculate scroll percentage
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollPercentage = scrollHeight > clientHeight
        ? Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100)
        : 100;

      // Only track if user spent more than 3 seconds
      if (timeSpent < 3) return;

      await supabase.rpc('track_content_engagement', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_viewer_id: profile?.id || null,
        p_time_spent_seconds: timeSpent,
        p_scroll_percentage: Math.min(scrollPercentage, 100),
        p_session_id: sessionId.current,
        p_referrer: document.referrer || null
      });
    } catch (error) {
      console.error('Failed to track engagement:', error);
    }
  };
}

/**
 * Get or create a session ID for tracking
 */
function getOrCreateSessionId(): string {
  const key = 'view_tracking_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * Hook to fetch analytics for a content item
 * 
 * @example
 * ```tsx
 * const analytics = useContentAnalytics('document', documentId);
 * if (analytics) {
 *   console.log(`${analytics.total_views} views`);
 * }
 * ```
 */
export function useContentAnalytics(
  contentType: ContentType,
  contentId: string | undefined,
  daysAgo: number = 30
) {
  const [analytics, setAnalytics] = React.useState<{
    total_views: number;
    unique_viewers: number;
    avg_time_spent: number;
    avg_scroll_percentage: number;
    views_last_7_days: number;
    views_last_30_days: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!contentId) {
      setLoading(false);
      return;
    }

    loadAnalytics();
  }, [contentType, contentId, daysAgo]);

  const loadAnalytics = async () => {
    if (!contentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_content_analytics', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_days_ago: daysAgo
      });

      if (error) throw error;
      setAnalytics(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, refetch: loadAnalytics };
}

// For direct import in components
import React from 'react';
