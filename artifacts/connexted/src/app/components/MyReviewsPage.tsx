import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Star, ExternalLink, Plus, Trash2, Edit, Tag, ThumbsUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  external_rating: number;
  category: string | null;
  tags: string[] | null;
  likes_count: number;
  created_at: string;
  circle_ids: string[] | null;
  table_ids: string[] | null;
  author_id: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

type FilterType = 'my_reviews' | 'all_reviews' | 'others_reviews';
type SortType = 'recent' | 'popular';

export default function MyReviewsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('my_reviews');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [showAllTime, setShowAllTime] = useState(false);
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      fetchReviews();
    }
  }, [profile, filterType, sortType, showAllTime]);

  const fetchReviews = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const isPlatformAdmin = profile.role === 'super' || profile.role === 'admin';

      // Get user's circle and table memberships
      let userCircleIds: string[] = [];
      let userTableIds: string[] = [];

      if (!isPlatformAdmin) {
        // Fetch circles user is a member of
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id')
          .contains('member_ids', [profile.id]);
        userCircleIds = circlesData?.map(c => c.id) || [];

        // Fetch tables user is a member of
        const { data: tablesData } = await supabase
          .from('tables')
          .select('id')
          .contains('member_ids', [profile.id]);
        userTableIds = tablesData?.map(t => t.id) || [];
      }

      // Build query based on filter type
      let query = supabase
        .from('endorsements')
        .select(`
          *,
          author:users!author_id(id, name, avatar)
        `);

      // Apply filter type
      if (filterType === 'my_reviews') {
        query = query.eq('author_id', profile.id);
      } else if (filterType === 'others_reviews') {
        query = query.neq('author_id', profile.id);
      }
      // 'all_reviews' doesn't add any author filter

      // Apply date filter (default to last 30 days)
      if (!showAllTime) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }

      // Apply sorting
      if (sortType === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else {
        // For popular, we need to handle the array length sorting client-side
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredReviews = data || [];

      // Filter by access (non-admins only see reviews they have access to)
      if (!isPlatformAdmin && filterType !== 'my_reviews') {
        filteredReviews = filteredReviews.filter(review => {
          const hasCircleAccess = review.circle_ids?.some((id: string) => userCircleIds.includes(id));
          const hasTableAccess = review.table_ids?.some((id: string) => userTableIds.includes(id));
          const isAuthor = review.author_id === profile.id;
          return hasCircleAccess || hasTableAccess || isAuthor;
        });
      }

      // Sort by popularity if needed (client-side)
      if (sortType === 'popular') {
        filteredReviews.sort((a, b) => {
          const aLikes = a.likes_count || 0;
          const bLikes = b.likes_count || 0;
          return bLikes - aLikes;
        });
      }

      setReviews(filteredReviews);

      // Fetch user's likes
      const reviewIds = filteredReviews.map(r => r.id);
      if (reviewIds.length > 0) {
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'endorsement')
          .eq('user_id', profile.id)
          .in('content_id', reviewIds);

        if (likesData) {
          setLikedReviewIds(new Set(likesData.map(l => l.content_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('endorsements')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast.success('Review deleted successfully');
      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const handleUpvote = async (review: Review) => {
    if (!profile) return;

    const isLiked = likedReviewIds.has(review.id);

    try {
      if (isLiked) {
        await supabase.from('content_likes').delete()
          .eq('content_type', 'endorsement')
          .eq('content_id', review.id)
          .eq('user_id', profile.id);

        const newLiked = new Set(likedReviewIds);
        newLiked.delete(review.id);
        setLikedReviewIds(newLiked);
        setReviews(reviews.map(r => r.id === review.id ? { ...r, likes_count: Math.max(0, (r.likes_count || 0) - 1) } : r));
      } else {
        await supabase.from('content_likes').insert({
          content_type: 'endorsement',
          content_id: review.id,
          user_id: profile.id,
        });

        const newLiked = new Set(likedReviewIds);
        newLiked.add(review.id);
        setLikedReviewIds(newLiked);
        setReviews(reviews.map(r => r.id === review.id ? { ...r, likes_count: (r.likes_count || 0) + 1 } : r));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  if (!profile) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: 'My Endorsements', path: '/my-reviews' }
          ]}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading reviews...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'My Endorsements', path: '/my-reviews' }
        ]}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Endorsements</h1>
          <p className="text-gray-600 mt-1">
            Manage and view endorsements
          </p>
        </div>
        <Button onClick={() => navigate('/reviews/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          Write Review
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Filter Type */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Show Endorsements</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterType === 'my_reviews' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('my_reviews')}
              >
                My Endorsements
              </Button>
              <Button
                variant={filterType === 'all_reviews' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all_reviews')}
              >
                All Endorsements
              </Button>
              <Button
                variant={filterType === 'others_reviews' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('others_reviews')}
              >
                Others' Endorsements
              </Button>
            </div>
          </div>

          {/* Sort Type */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Sort By</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortType === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortType('recent')}
              >
                Most Recent
              </Button>
              <Button
                variant={sortType === 'popular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortType('popular')}
              >
                Most Popular
              </Button>
            </div>
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox
              id="show-all-time"
              checked={showAllTime}
              onCheckedChange={(checked) => setShowAllTime(checked as boolean)}
            />
            <Label
              htmlFor="show-all-time"
              className="text-sm font-normal text-gray-700 cursor-pointer"
            >
              Show all-time reviews (default: last 30 days)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          {!showAllTime && ' from the last 30 days'}
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <Star className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">No reviews yet</h3>
              <p className="text-gray-600 mt-1">
                Share your experience with tools, books, courses, and services
              </p>
            </div>
            <Button onClick={() => navigate('/reviews/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              Write Your First Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => {
              const isMyReview = review.author_id === profile.id;
              const hasUpvoted = likedReviewIds.has(review.id);

              return (
                <Card key={review.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Author Info (for reviews by others) */}
                        {!isMyReview && review.author && (
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={review.author.avatar || ''} />
                              <AvatarFallback>{review.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <Link
                              to={`/members/${review.author.id}`}
                              className="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                              {review.author.name}
                            </Link>
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">
                            <Link 
                              to={`/reviews/${review.id}`}
                              className="hover:text-indigo-600 transition-colors"
                            >
                              {review.title}
                            </Link>
                          </CardTitle>
                          {review.link_url && (
                            <a
                              href={review.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            {renderStars(review.external_rating)}
                            <span className="ml-1 font-medium">{review.external_rating}/5</span>
                          </div>

                          {review.category && (
                            <Badge variant="secondary" className="capitalize">
                              {review.category}
                            </Badge>
                          )}

                          <span className="text-gray-400">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons - only for own reviews */}
                      {isMyReview && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/reviews/${review.id}`)}
                            className="gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(review.id)}
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {(review.description || (review.tags && review.tags.length > 0)) && (
                    <CardContent className="pt-0">
                      {review.description && (
                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {review.description}
                        </p>
                      )}

                      {review.tags && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center mb-3">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {review.tags.map((tag) => (
                            <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                              <Badge variant="outline" className="text-xs hover:bg-gray-100 cursor-pointer transition-colors">
                                <span className="mr-1">#</span>
                                {tag}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Bottom actions and stats */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {review.circle_ids?.length > 0 && (
                            <span>
                              {review.circle_ids.length} {review.circle_ids.length === 1 ? 'circle' : 'circles'}
                            </span>
                          )}
                          {review.table_ids?.length > 0 && (
                            <span>
                              {review.table_ids.length} {review.table_ids.length === 1 ? 'table' : 'tables'}
                            </span>
                          )}
                        </div>

                        {/* Upvote button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpvote(review)}
                          className={hasUpvoted ? 'bg-indigo-50 border-indigo-300' : ''}
                        >
                          <ThumbsUp className={`w-4 h-4 mr-1 ${hasUpvoted ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                          <span className={hasUpvoted ? 'text-indigo-600' : ''}>
                            {review.likes_count || 0}
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}