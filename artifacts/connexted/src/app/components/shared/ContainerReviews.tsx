// Split candidate: ~565 lines — consider extracting ReviewCard, WriteReviewForm, and ReviewStarRatingInput into sub-components.
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Star, ThumbsUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Link } from 'react-router';

// Utility to generate the internal URL path for a container
export function getContainerPath(containerType: string, idOrSlug: string): string {
  const pathMap: Record<string, string> = {
    circle: `/circles/${idOrSlug}`,
    table: `/tables/${idOrSlug}`,
    build: `/builds/${idOrSlug}`,
    pitch: `/pitches/${idOrSlug}`,
    elevator: `/elevators/${idOrSlug}`,
    meeting: `/meetings/${idOrSlug}`,
    library: `/libraries/${idOrSlug}`,
    event: `/events/${idOrSlug}`,
    standup: `/standups/${idOrSlug}`,
    meetup: `/meetups/${idOrSlug}`,
    document: `/documents/${idOrSlug}`,
    course: `/courses/${idOrSlug}`,
    program: `/programs/${idOrSlug}`,
  };
  return pathMap[containerType] || '/';
}

// Display label for container types
export function getContainerTypeLabel(containerType: string): string {
  const labels: Record<string, string> = {
    circle: 'Circle',
    table: 'Table',
    build: 'Build',
    pitch: 'Pitch',
    elevator: 'Elevator',
    meeting: 'Meeting',
    library: 'Library',
    event: 'Event',
    standup: 'Standup',
    meetup: 'Meetup',
    document: 'Document',
    course: 'Course',
    program: 'Program',
  };
  return labels[containerType] || containerType;
}

interface ContainerReviewsProps {
  containerId: string;
  containerType: 'circle' | 'table' | 'elevator' | 'meeting' | 'pitch' | 'build' | 'standup' | 'meetup' | 'library' | 'event' | 'document' | 'course' | 'program';
  containerName: string;
  containerSlug?: string;
  isAdmin: boolean;
}

interface Review {
  id: string;
  circle_ids: string[];
  table_ids: string[];
  elevator_ids: string[];
  meeting_ids: string[];
  pitch_ids: string[];
  build_ids: string[];
  standup_ids: string[];
  meetup_ids: string[];
  author_id: string;
  title: string;
  description: string;
  link_url: string;
  external_rating: number;
  tags: string[];
  likes_count: number;
  created_at: string;
  has_response?: boolean;
  author?: {
    name: string;
    avatar: string | null;
  };
  response?: {
    id: string;
    response_text: string;
    created_at: string;
    responder: {
      name: string;
      avatar: string | null;
      role: string;
    };
  };
}

export default function ContainerReviews({ containerId, containerType, containerName, containerSlug, isAdmin }: ContainerReviewsProps) {
  const { profile } = useAuth();
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({
    description: '',
    rating: 5,
    tags: '',
  });

  // Generate the internal link for this container
  const containerInternalPath = getContainerPath(containerType, containerSlug || containerId);
  const containerTypeLabel = getContainerTypeLabel(containerType);
  const containerIdField = `${containerType}_ids`;

  useEffect(() => {
    if (!profile) return;

    const fetchReviews = async () => {
      try {
        setLoading(true);

        // Fetch reviews for this container with author info and responses
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('endorsements')
          .select(`
            *,
            author:users!reviews_author_id_fkey(name, avatar)
          `)
          .contains(containerIdField, [containerId])
          .order(sortBy === 'popular' ? 'likes_count' : 'created_at', { ascending: false });

        if (reviewsError) throw reviewsError;

        // Fetch responses for reviews that have them
        const reviewsWithResponses = reviewsData || [];
        const allReviewIds = reviewsWithResponses.map(r => r.id);
        const responseReviewIds = reviewsWithResponses
          .filter(r => r.has_response)
          .map(r => r.id);

        // Fetch user's likes for these reviews
        if (allReviewIds.length > 0) {
          const { data: likesData } = await supabase
            .from('content_likes')
            .select('content_id')
            .eq('content_type', 'endorsement')
            .eq('user_id', profile.id)
            .in('content_id', allReviewIds);

          if (likesData) {
            setLikedReviewIds(new Set(likesData.map(l => l.content_id)));
          }
        }

        if (responseReviewIds.length > 0) {
          const { data: responsesData, error: responsesError } = await supabase
            .from('review_responses')
            .select(`
              id,
              review_id,
              response_text,
              created_at,
              responder:users!review_responses_responder_id_fkey(name, avatar, role)
            `)
            .in('review_id', responseReviewIds);

          if (!responsesError && responsesData) {
            // Map responses to reviews
            reviewsWithResponses.forEach(review => {
              const response = responsesData.find(r => r.review_id === review.id);
              if (response) {
                review.response = response;
              }
            });
          }
        }

        setReviews(reviewsWithResponses);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [profile, containerId, containerIdField, sortBy]);

  const handleCreateReview = async () => {
    if (!newReview.description || !profile) return;

    try {
      const insertData: any = {
        author_id: profile.id,
        title: containerName,
        description: newReview.description,
        link_url: containerInternalPath,
        external_rating: newReview.rating,
        category: containerType,
        tags: newReview.tags.split(',').map((t) => t.trim()).filter(Boolean),
        circle_ids: [],
        table_ids: [],
        elevator_ids: [],
        meeting_ids: [],
        pitch_ids: [],
        build_ids: [],
        standup_ids: [],
        meetup_ids: [],
      };

      // Set the appropriate container ID array
      insertData[containerIdField] = [containerId];

      const { data, error } = await supabase
        .from('endorsements')
        .insert(insertData)
        .select(`
          *,
          author:users!reviews_author_id_fkey(name, avatar)
        `)
        .single();

      if (error) throw error;

      setReviews([data, ...reviews]);
      toast.success('Review added!');
      setNewReview({ description: '', rating: 5, tags: '' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error('Failed to create review');
    }
  };

  const handleToggleUpvote = async (review: Review) => {
    if (!profile) return;

    const isCurrentlyLiked = likedReviewIds.has(review.id);

    try {
      if (isCurrentlyLiked) {
        // Unlike: delete from content_likes
        await supabase
          .from('content_likes')
          .delete()
          .eq('content_type', 'endorsement')
          .eq('content_id', review.id)
          .eq('user_id', profile.id);

        // Update local state
        const newLiked = new Set(likedReviewIds);
        newLiked.delete(review.id);
        setLikedReviewIds(newLiked);
        setReviews(reviews.map(r => r.id === review.id ? { ...r, likes_count: Math.max(0, (r.likes_count || 0) - 1) } : r));
      } else {
        // Like: insert into content_likes
        await supabase
          .from('content_likes')
          .insert({
            content_type: 'endorsement',
            content_id: review.id,
            user_id: profile.id,
          });

        // Update local state
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

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('endorsements')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.filter(r => r.id !== reviewId));
      toast.success('Review deleted');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  if (!profile) return null;

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={(value: 'recent' | 'popular') => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review {containerName}</DialogTitle>
              <DialogDescription>Share your experience with this {containerTypeLabel.toLowerCase()}.</DialogDescription>
            </DialogHeader>

            {/* Container being reviewed */}
            <div className="bg-gray-50 border rounded-lg p-3 flex items-center gap-3">
              <Badge variant="outline" className="capitalize">{containerTypeLabel}</Badge>
              <span className="font-medium text-gray-900">{containerName}</span>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Rating *</Label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: value })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          value <= newReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {newReview.rating} {newReview.rating === 1 ? 'star' : 'stars'}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="review-description">Your Review *</Label>
                <Textarea
                  id="review-description"
                  value={newReview.description}
                  onChange={(e) => setNewReview({ ...newReview, description: e.target.value })}
                  placeholder={`What did you think of this ${containerTypeLabel.toLowerCase()}? Share your experience...`}
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="review-tags">Tags (comma-separated)</Label>
                <Input
                  id="review-tags"
                  value={newReview.tags}
                  onChange={(e) => setNewReview({ ...newReview, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <Button onClick={handleCreateReview} disabled={!newReview.description.trim()} className="w-full">
                Submit Review
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No reviews yet. Be the first to review this {containerTypeLabel.toLowerCase()}!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isUpvoted = likedReviewIds.has(review.id);
            const canDelete = isAdmin || review.author_id === profile.id;
            // Determine if link is internal (starts with /) or external
            const isInternalLink = review.link_url?.startsWith('/');

            return (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Avatar>
                        <AvatarImage src={review.author?.avatar || undefined} />
                        <AvatarFallback>{review.author?.name.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link to={`/reviews/${review.id}`}>
                            <CardTitle className="text-lg hover:text-indigo-600 transition-colors">{review.title}</CardTitle>
                          </Link>
                          {(review as any).category && (
                            <Badge variant="outline" className="capitalize text-xs">
                              {getContainerTypeLabel((review as any).category)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 mb-2">
                          {renderStars(review.external_rating)}
                          <span className="text-sm text-gray-600">
                            by {review.author?.name || 'Unknown'}
                          </span>
                          <span className="text-sm text-gray-400">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{review.description}</p>

                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {review.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Admin Response */}
                  {review.response && (
                    <div className="mb-4 p-4 bg-blue-50 border-l-4 border-l-blue-500 rounded-r">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Admin Response
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(review.response.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={review.response.responder.avatar || undefined} />
                          <AvatarFallback>
                            {review.response.responder.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {review.response.responder.name}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">
                            {review.response.response_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {review.link_url && (
                      isInternalLink ? (
                        <Link
                          to={review.link_url}
                          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View {getContainerTypeLabel((review as any).category || containerType)}
                        </Link>
                      ) : (
                        <a
                          href={review.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Resource
                        </a>
                      )
                    )}
                    {!review.link_url && <div />}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleUpvote(review)}
                      className={isUpvoted ? 'text-indigo-600' : ''}
                    >
                      <ThumbsUp className={`w-4 h-4 mr-1 ${isUpvoted ? 'fill-current' : ''}`} />
                      {review.likes_count || 0}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}