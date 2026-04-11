import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel, ROLES } from '@/lib/constants/roles';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Star, Search, Plus, ThumbsUp, ExternalLink, Lock } from 'lucide-react';

interface Review {
  id: string;
  circle_ids: string[] | null;
  table_ids: string[] | null;
  author_id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  external_rating: number;
  tags: string[] | null;
  likes_count: number;
  access_level: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

interface Circle {
  id: string;
  name: string;
}

export default function ReviewsPage() {
  const { profile, userPermissions } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>('recent');
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const isPlatformAdmin = hasRoleLevel(profile!.role, ROLES.ADMIN);

      // Fetch circles user is a member of (or all circles for platform admin)
      let circlesQuery = supabase
        .from('circles')
        .select('id, name');
      
      if (!isPlatformAdmin && profile) {
        circlesQuery = circlesQuery.contains('member_ids', [profile.id]);
      }

      const { data: circlesData } = await circlesQuery;
      const userCircleIds = circlesData?.map(c => c.id) || [];

      // Fetch tables user is a member of (or all tables for platform admin)
      let tablesQuery = supabase
        .from('tables')
        .select('id');
      
      if (!isPlatformAdmin && profile) {
        tablesQuery = tablesQuery.contains('member_ids', [profile.id]);
      }

      const { data: tablesData } = await tablesQuery;
      const userTableIds = tablesData?.map(t => t.id) || [];

      // Fetch all reviews with author info
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('endorsements')
        .select(`
          *,
          author:users!author_id(id, name, avatar)
        `)
        .order(
          sortBy === 'recent' ? 'created_at' : sortBy === 'popular' ? 'likes_count' : 'external_rating',
          { ascending: false }
        );

      if (reviewsError) throw reviewsError;

      // Platform admins see ALL reviews, regular users see filtered
      let accessibleReviews = reviewsData || [];
      if (!isPlatformAdmin) {
        accessibleReviews = (reviewsData || []).filter(review => {
          // Check if review is in user's circles
          const hasCircleAccess = review.circle_ids?.some((id: string) => userCircleIds.includes(id));
          // Check if review is in user's tables
          const hasTableAccess = review.table_ids?.some((id: string) => userTableIds.includes(id));
          // Check if user is the author
          const isAuthor = review.author_id === profile?.id;
          return hasCircleAccess || hasTableAccess || isAuthor;
        });
      }

      setReviews(accessibleReviews);

      // Fetch user's likes for these reviews
      const reviewIds = accessibleReviews.map(r => r.id);
      if (reviewIds.length > 0 && profile) {
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

      setCircles(circlesData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
      setLoading(false);
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

  if (!profile) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Reviews' }]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get reviews by the current user
  const myReviews = filteredReviews.filter(review => review.author_id === profile.id);

  const canAccessContent = (accessLevel?: string) => {
    if (!accessLevel || accessLevel === 'public') return true;
    if (accessLevel === 'member') return userPermissions?.permitted_types.includes('reviews') ?? false;
    if (accessLevel === 'premium') return userPermissions?.permitted_types.includes('reviews_premium') ?? false;
    return false;
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Reviews' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Reviews</h1>
          <p className="text-gray-600">Community reviews and recommendations</p>
        </div>
        <Link to="/reviews/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Write Review
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            onClick={() => setSortBy('recent')}
            size="sm"
          >
            Recent
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'default' : 'outline'}
            onClick={() => setSortBy('popular')}
            size="sm"
          >
            Popular
          </Button>
          <Button
            variant={sortBy === 'rating' ? 'default' : 'outline'}
            onClick={() => setSortBy('rating')}
            size="sm"
          >
            Rating
          </Button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-gray-500">
              {searchQuery ? 'No reviews found' : 'No reviews yet'}
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => {
            const author = review.author;
            const reviewCircles = review.circle_ids
              ?.map(id => circles.find(c => c.id === id))
              .filter(Boolean) || [];
            const accessible = canAccessContent(review.access_level);
            const hasUpvoted = likedReviewIds.has(review.id);

            return (
              <Card key={review.id} className={!accessible ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    {/* Author Avatar */}
                    {author && (
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={author.avatar || ''} />
                        <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Link to={`/reviews/${review.id}`}>
                              <h3 className="font-medium text-lg hover:text-indigo-600 transition-colors">
                                {review.title}
                              </h3>
                            </Link>
                            {!accessible && (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex items-center space-x-3 mb-2">
                            {renderStars(review.external_rating)}
                            {author && (
                              <>
                                <span className="text-sm text-gray-500">by {author.name}</span>
                                <span className="text-sm text-gray-400">•</span>
                                <span className="text-sm text-gray-500">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-700 mb-3">
                        {review.description}
                      </p>

                      {/* Link */}
                      {review.link_url && accessible && (
                        <a
                          href={review.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 mb-3"
                        >
                          View Resource <ExternalLink className="w-4 h-4 ml-1" />
                        </a>
                      )}

                      {/* Tags and Circles */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {review.tags?.map((tag, index) => (
                          <Link key={index} to={`/tags/${encodeURIComponent(tag)}`}>
                            <Badge variant="secondary" className="hover:bg-gray-200 cursor-pointer transition-colors">
                              <span className="mr-1">#</span>
                              {tag}
                            </Badge>
                          </Link>
                        ))}
                        {reviewCircles.map((circle) => (
                          <Link key={circle.id} to={`/circles/${circle.id}`}>
                            <Badge variant="outline" className="hover:bg-gray-100">
                              {circle.name}
                            </Badge>
                          </Link>
                        ))}
                        {review.access_level && review.access_level !== 'public' && (
                          <Badge variant="secondary" className="capitalize">
                            {review.access_level}
                          </Badge>
                        )}
                      </div>

                      {/* Actions: View Details and Upvote */}
                      {accessible && (
                        <div className="flex items-center justify-between">
                          <Link to={`/reviews/${review.id}`}>
                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleUpvote(review);
                            }}
                            className={hasUpvoted ? 'bg-indigo-50 border-indigo-300' : ''}
                          >
                            <ThumbsUp className={`w-4 h-4 mr-1 ${hasUpvoted ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                            <span className={hasUpvoted ? 'text-indigo-600' : ''}>
                              {review.likes_count || 0}
                            </span>
                          </Button>
                        </div>
                      )}
                      {!accessible && (
                        <Link to={`/reviews/${review.id}`}>
                          <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}