/**
 * EXAMPLE: How to use the Universal Engagement System
 * 
 * This example shows how to integrate likes, favorites, ratings, and shares
 * into any content detail page (document, prompt, library, etc.)
 */

import React, { useState, useEffect } from 'react';
import { ContentEngagement } from './ContentEngagement';
import { SharedInDisplay } from './SharedInDisplay';
import { ReviewsList } from './ReviewsList';
import { supabase } from '@/lib/supabase';

interface EngagementExampleProps {
  contentType: 'prompt' | 'document' | 'library' | 'endorsement';
  contentId: string;
  contentSlug: string;
  contentTitle: string;
}

export function EngagementExample({
  contentType,
  contentId,
  contentSlug,
  contentTitle,
}: EngagementExampleProps) {
  const [engagement, setEngagement] = useState({
    likesCount: 0,
    favoritesCount: 0,
    sharesCount: 0,
    avgRating: 0,
    ratingsCount: 0,
    viewsCount: 0,
    userHasLiked: false,
    userHasFavorited: false,
    userRating: undefined as number | undefined,
  });

  const [shareLocations, setShareLocations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch engagement data
  useEffect(() => {
    fetchEngagementData();
  }, [contentType, contentId]);

  const fetchEngagementData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch content with engagement stats
      const { data: content } = await supabase
        .from(`${contentType}s`)
        .select('likes_count, favorites_count, shares_count, avg_rating, ratings_count, views_count')
        .eq('id', contentId)
        .single();

      // Check if user has liked
      const { data: userLike } = await supabase
        .from('content_likes')
        .select('id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('user_id', user?.id)
        .maybeSingle();

      // Check if user has favorited
      const { data: userFavorite } = await supabase
        .from('content_favorites')
        .select('id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('user_id', user?.id)
        .maybeSingle();

      // Check user's rating
      const { data: userRating } = await supabase
        .from('content_ratings')
        .select('rating')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('user_id', user?.id)
        .maybeSingle();

      // Fetch share locations
      const { data: shares } = await supabase
        .rpc('get_content_share_locations', {
          p_content_type: contentType,
          p_content_id: contentId,
        });

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('content_ratings')
        .select(`
          id,
          rating,
          review_text,
          was_helpful,
          created_at,
          user_id,
          users:user_id (
            name,
            avatar_url
          )
        `)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(10);

      setEngagement({
        likesCount: content?.likes_count || 0,
        favoritesCount: content?.favorites_count || 0,
        sharesCount: content?.shares_count || 0,
        avgRating: content?.avg_rating || 0,
        ratingsCount: content?.ratings_count || 0,
        viewsCount: content?.views_count || 0,
        userHasLiked: !!userLike,
        userHasFavorited: !!userFavorite,
        userRating: userRating?.rating,
      });

      setShareLocations(shares || []);
      
      setReviews(reviewsData?.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.users?.name || 'Anonymous',
        userAvatar: r.users?.avatar_url,
        rating: r.rating,
        reviewText: r.review_text,
        wasHelpful: r.was_helpful,
        createdAt: r.created_at,
      })) || []);

    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle like
  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (engagement.userHasLiked) {
        // Unlike
        await supabase
          .from('content_likes')
          .delete()
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .eq('user_id', user.id);

        setEngagement(prev => ({
          ...prev,
          likesCount: prev.likesCount - 1,
          userHasLiked: false,
        }));
      } else {
        // Like
        await supabase
          .from('content_likes')
          .insert({
            content_type: contentType,
            content_id: contentId,
            user_id: user.id,
          });

        setEngagement(prev => ({
          ...prev,
          likesCount: prev.likesCount + 1,
          userHasLiked: true,
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle favorite
  const handleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (engagement.userHasFavorited) {
        // Unfavorite
        await supabase
          .from('content_favorites')
          .delete()
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .eq('user_id', user.id);

        setEngagement(prev => ({
          ...prev,
          favoritesCount: prev.favoritesCount - 1,
          userHasFavorited: false,
        }));
      } else {
        // Favorite
        await supabase
          .from('content_favorites')
          .insert({
            content_type: contentType,
            content_id: contentId,
            user_id: user.id,
          });

        setEngagement(prev => ({
          ...prev,
          favoritesCount: prev.favoritesCount + 1,
          userHasFavorited: true,
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Handle rating
  const handleRate = async (rating: number, reviewText?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from('content_ratings')
        .upsert({
          content_type: contentType,
          content_id: contentId,
          user_id: user.id,
          rating,
          review_text: reviewText,
          was_helpful: true,
        });

      // Refresh data
      fetchEngagementData();
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading engagement data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main engagement component */}
      <ContentEngagement
        contentType={contentType}
        contentId={contentId}
        contentSlug={contentSlug}
        contentTitle={contentTitle}
        likesCount={engagement.likesCount}
        favoritesCount={engagement.favoritesCount}
        sharesCount={engagement.sharesCount}
        avgRating={engagement.avgRating}
        ratingsCount={engagement.ratingsCount}
        viewsCount={engagement.viewsCount}
        userHasLiked={engagement.userHasLiked}
        userHasFavorited={engagement.userHasFavorited}
        userRating={engagement.userRating}
        onLike={handleLike}
        onFavorite={handleFavorite}
        onRate={handleRate}
      />

      {/* Shared in display */}
      {shareLocations.length > 0 && (
        <SharedInDisplay
          contentType={contentType}
          contentId={contentId}
          shareLocations={shareLocations}
        />
      )}

      {/* Reviews list */}
      {engagement.ratingsCount > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Reviews ({engagement.ratingsCount})
          </h3>
          <ReviewsList reviews={reviews} />
        </div>
      )}
    </div>
  );
}
