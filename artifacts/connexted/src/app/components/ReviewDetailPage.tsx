import { useState, useEffect } from 'react';
import { Textarea } from '@/app/components/ui/textarea';
import { ExternalLink, Star, ThumbsUp, Calendar, Trash2, Flag, MessageSquare, Edit2, X } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ReportContentDialog from '@/app/components/shared/ReportContentDialog';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';

import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';

import { getContainerTypeLabel } from '@/app/components/shared/ContainerReviews';
import { ShareInviteIconButton } from '@/app/components/shared/ShareInviteButton';

interface Review {
  id: string;
  circle_ids: string[];
  table_ids: string[];
  author_id: string;
  title: string;
  description: string;
  link_url: string;
  external_rating: number;
  category: string;
  tags: string[];
  likes_count: number;
  access_level: string;
  created_at: string;
  has_response?: boolean;
  author?: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface Circle {
  id: string;
  name: string;
  host_ids: string[];
  moderator_ids: string[];
  admin_ids: string[];
}

interface ReviewResponse {
  id: string;
  review_id: string;
  responder_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
  responder?: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [response, setResponse] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editReviewForm, setEditReviewForm] = useState({ title: '', description: '', external_rating: 5, tags: '' });

  useEffect(() => {
    if (id && profile) {
      fetchReview();
    }
  }, [id, profile]);

  const fetchReview = async () => {
    if (!id || !profile) return;

    try {
      setLoading(true);

      // Fetch review with author info
      const { data: reviewData, error: reviewError } = await supabase
        .from('endorsements')
        .select(`
          id,
          circle_ids,
          table_ids,
          author_id,
          title,
          description,
          link_url,
          external_rating,
          category,
          tags,
          likes_count,
          access_level,
          created_at,
          has_response,
          author:users!reviews_author_id_fkey(id, name, avatar)
        `)
        .eq('id', id)
        .single();

      if (reviewError) throw reviewError;

      if (!reviewData) {
        toast.error('Review not found');
        navigate('/reviews');
        return;
      }

      setReview(reviewData);

      // Check if user has liked this review
      const { data: likeData } = await supabase
        .from('content_likes')
        .select('id')
        .eq('content_type', 'endorsement')
        .eq('content_id', reviewData.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      setHasLiked(!!likeData);

      // Fetch circles this review belongs to
      if (reviewData.circle_ids && reviewData.circle_ids.length > 0) {
        const { data: circleData, error: circleError } = await supabase
          .from('circles')
          .select('id, name, host_ids, moderator_ids, admin_ids')
          .in('id', reviewData.circle_ids);

        if (!circleError && circleData) {
          setCircles(circleData);
        }
      }

      // Fetch response if exists
      if (reviewData.has_response) {
        const { data: responseData, error: responseError } = await supabase
          .from('review_responses')
          .select(`
            id,
            review_id,
            responder_id,
            response_text,
            created_at,
            updated_at,
            responder:users!review_responses_responder_id_fkey(id, name, avatar, role)
          `)
          .eq('review_id', id)
          .single();

        if (!responseError && responseData) {
          setResponse(responseData);
          setResponseText(responseData.response_text);
        }
      }
    } catch (error) {
      console.error('Error fetching review:', error);
      toast.error('Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUpvote = async () => {
    if (!review || !profile) return;

    try {
      if (hasLiked) {
        await supabase
          .from('content_likes')
          .delete()
          .eq('content_type', 'endorsement')
          .eq('content_id', review.id)
          .eq('user_id', profile.id);

        setReview({ ...review, likes_count: Math.max(0, (review.likes_count || 0) - 1) });
        setHasLiked(false);
        toast.success('Like removed');
      } else {
        await supabase
          .from('content_likes')
          .insert({
            content_type: 'endorsement',
            content_id: review.id,
            user_id: profile.id,
          });

        setReview({ ...review, likes_count: (review.likes_count || 0) + 1 });
        setHasLiked(true);
        toast.success('Review liked!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleDeleteReview = async () => {
    if (!review || !profile) return;

    try {
      // Permanently delete review (reviews don't have soft delete)
      const { error } = await supabase
        .from('endorsements')
        .delete()
        .eq('id', review.id);

      if (error) throw error;

      toast.success('Review deleted');
      navigate('/reviews');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const canDeleteReview = () => {
    if (!review || !profile) return false;

    // Platform admin can delete anything
    if (profile.role === 'super') return true;

    // Author can delete their own
    if (review.author_id === profile.id) return true;

    // Container admin can delete if review is in their container
    const isCircleAdmin = review.circle_ids?.some(circleId => {
      const circle = circles.find(c => c.id === circleId);
      return circle?.host_ids?.includes(profile.id) ||
        circle?.moderator_ids?.includes(profile.id) ||
        circle?.admin_ids?.includes(profile.id);
    });

    return isCircleAdmin;
  };

  const canRespondToReview = () => {
    if (!review || !profile) return false;

    // Platform admin can respond to anything
    if (profile.role === 'super' || profile.role === 'admin') return true;

    // Circle admin/moderator/host can respond if review is in their circle
    const isCircleAdmin = review.circle_ids?.some(circleId => {
      const circle = circles.find(c => c.id === circleId);
      return circle?.host_ids?.includes(profile.id) ||
        circle?.moderator_ids?.includes(profile.id) ||
        circle?.admin_ids?.includes(profile.id);
    });

    return isCircleAdmin;
  };

  const handleSubmitResponse = async () => {
    if (!review || !profile || !responseText.trim()) return;

    try {
      setSubmittingResponse(true);

      if (isEditingResponse && response) {
        // Update existing response
        const { error } = await supabase
          .from('review_responses')
          .update({ response_text: responseText })
          .eq('id', response.id);

        if (error) throw error;

        toast.success('Response updated');
        setIsEditingResponse(false);
        await fetchReview(); // Refresh to get updated response
      } else {
        // Create new response
        const { data, error } = await supabase
          .from('review_responses')
          .insert({
            review_id: review.id,
            responder_id: profile.id,
            response_text: responseText,
          })
          .select(`
            id,
            review_id,
            responder_id,
            response_text,
            created_at,
            updated_at,
            responder:users!review_responses_responder_id_fkey(id, name, avatar, role)
          `)
          .single();

        if (error) throw error;

        // Notify the review author about the response
        if (review.author_id && review.author_id !== profile.id) {
          await supabase.from('notifications').insert({
            user_id: review.author_id,
            type: 'review_response',
            title: `${profile.name} responded to your review`,
            message: `${profile.name} posted a response to your review "${review.title}"`,
            link_url: `/reviews/${review.id}`,
            link_type: 'review',
            link_id: review.id,
            actor_id: profile.id,
          });
        }

        toast.success('Response posted');
        setShowResponseForm(false);
        setResponse(data);
        setReview({ ...review, has_response: true });
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleCancelResponse = () => {
    setShowResponseForm(false);
    setIsEditingResponse(false);
    setResponseText(response?.response_text || '');
  };

  const handleStartEdit = () => {
    setIsEditingResponse(true);
    setResponseText(response?.response_text || '');
  };

  const handleOpenLink = () => {
    if (review?.link_url) {
      if (review.link_url.startsWith('/')) {
        // Internal link (container review) - use client-side navigation
        navigate(review.link_url);
      } else {
        // External link (endorsement) - open in new tab
        window.open(review.link_url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const openEditReview = () => {
    if (!review) return;
    setEditReviewForm({
      title: review.title,
      description: review.description,
      external_rating: review.external_rating,
      tags: review.tags?.join(', ') || '',
    });
    setIsEditingReview(true);
  };

  const handleUpdateReview = async () => {
    if (!review || !editReviewForm.title.trim()) return;
    try {
      const { error } = await supabase
        .from('endorsements')
        .update({
          title: editReviewForm.title.trim(),
          description: editReviewForm.description.trim(),
          external_rating: editReviewForm.external_rating,
          tags: editReviewForm.tags ? editReviewForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        })
        .eq('id', review.id);
      if (error) throw error;
      toast.success('Review updated');
      setIsEditingReview(false);
      await fetchReview();
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (!profile) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="text-gray-600">Loading review...</div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p>Review not found</p>
        <Button onClick={() => navigate('/reviews')}>Back to Reviews</Button>
      </div>
    );
  }

  const hasUpvoted = review.upvotes && review.upvotes.includes(profile.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Reviews', path: '/reviews' },
          { label: review.title, path: `/reviews/${review.id}` }
        ]}
      />

      {/* Review Header */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Category & Rating */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {renderStars(review.external_rating)}
            </div>
            <div className="flex items-center gap-2">
              <ShareInviteIconButton
                entityType="review"
                entityId={review.id}
                entityName={review.title}
              />
              {review.author_id === profile.id && !isEditingReview && (
                <Button variant="outline" size="sm" onClick={openEditReview}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              {canDeleteReview() && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this review.
                        {profile.role === 'super' && ' As a platform admin, you have permission to delete any review.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteReview}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Review
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <ReportContentDialog
                contentId={review.id}
                contentType="review"
                contentTitle={review.title}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                }
              />
            </div>
          </div>

          {isEditingReview ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  value={editReviewForm.title}
                  onChange={(e) => setEditReviewForm({ ...editReviewForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Rating</label>
                <div className="flex gap-2 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setEditReviewForm({ ...editReviewForm, external_rating: n })}
                      className={`p-1 ${n <= editReviewForm.external_rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  className="mt-1"
                  value={editReviewForm.description}
                  onChange={(e) => setEditReviewForm({ ...editReviewForm, description: e.target.value })}
                  rows={5}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tags</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  value={editReviewForm.tags}
                  onChange={(e) => setEditReviewForm({ ...editReviewForm, tags: e.target.value })}
                  placeholder="comma-separated tags"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateReview} disabled={!editReviewForm.title.trim()}>Save</Button>
                <Button variant="outline" onClick={() => setIsEditingReview(false)}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <h1 className="text-3xl">{review.title}</h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={review.author?.avatar} />
                    <AvatarFallback>{review.author?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Link to={`/members/${review.author?.id}`} className="hover:underline">
                    {review.author?.name}
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  {review.likes_count || 0} {review.likes_count === 1 ? 'like' : 'likes'}
                </div>
              </div>

              {/* Review Content */}
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">
                  {review.description}
                </p>
              </div>
            </>
          )}

          {/* Circles */}
          {circles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Shared in:</h3>
              <div className="flex flex-wrap gap-2">
                {circles.map((circle) => (
                  <Link key={circle.id} to={`/circles/${circle.id}`}>
                    <Badge variant="outline" className="hover:bg-gray-100">
                      {circle.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {review.tags.map((tag) => (
                  <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="hover:bg-gray-200 cursor-pointer transition-colors">
                      <span className="mr-1">#</span>
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {review.link_url && (
              <Button onClick={handleOpenLink} className="flex-1 gap-2">
                <ExternalLink className="w-4 h-4" />
                {review.link_url.startsWith('/')
                  ? `View ${getContainerTypeLabel(review.category || 'content')}`
                  : 'Visit Link'}
              </Button>
            )}
            <Button
              variant={hasLiked ? 'default' : 'outline'}
              onClick={handleToggleUpvote}
              className="gap-2"
            >
              <ThumbsUp className="w-4 h-4" />
              {hasLiked ? 'Liked' : 'Helpful'}
              {(review.likes_count || 0) > 0 && (
                <span className="ml-1">({review.likes_count})</span>
              )}
            </Button>
            {review.author_id && review.author_id !== profile.id && (
              <PrivateCommentDialog
                containerType="review"
                containerId={review.id}
                containerTitle={review.title}
                recipientId={review.author_id}
                recipientName={review.author?.name || 'the author'}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Response */}
      {response && !isEditingResponse && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Circle Admin Response
                </Badge>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                </span>
              </div>
              {response.responder_id === profile?.id && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEdit}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={response.responder?.avatar} />
                <AvatarFallback>{response.responder?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <Link to={`/members/${response.responder?.id}`} className="font-medium hover:underline">
                  {response.responder?.name}
                </Link>
                {response.responder?.role === 'super' && (
                  <Badge variant="secondary" className="ml-2">Platform Admin</Badge>
                )}
              </div>
            </div>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">
                {response.response_text}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Form */}
      {canRespondToReview() && (!response || isEditingResponse) && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {!showResponseForm && !isEditingResponse && (
              <Button
                variant="outline"
                onClick={() => setShowResponseForm(true)}
                className="w-full gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Respond as {profile?.role === 'super' || profile?.role === 'admin' ? 'Platform Admin' : 'Circle Admin'}
              </Button>
            )}
            
            {(showResponseForm || isEditingResponse) && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar} />
                    <AvatarFallback>{profile?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{profile?.name}</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      {profile?.role === 'super' || profile?.role === 'admin' ? 'Platform Admin' : 'Circle Admin'}
                    </Badge>
                  </div>
                </div>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response to this review..."
                  className="min-h-[120px]"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={submittingResponse || !responseText.trim()}
                  >
                    {isEditingResponse ? 'Update Response' : 'Post Response'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelResponse}
                    disabled={submittingResponse}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}