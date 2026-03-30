import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RatingWidgetProps {
  contentType: string;
  contentId: string;
  userId?: string;
  initialRating?: number;
  initialReview?: string;
  avgRating?: number;
  ratingsCount?: number;
  onRatingSubmit?: (rating: number, review: string) => void;
  compact?: boolean;
}

export function RatingWidget({
  contentType,
  contentId,
  userId,
  initialRating = 0,
  initialReview = '',
  avgRating = 0,
  ratingsCount = 0,
  onRatingSubmit,
  compact = false
}: RatingWidgetProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(initialReview);
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitRating = async () => {
    if (!userId || !rating) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('content_ratings')
        .upsert({
          content_type: contentType,
          content_id: contentId,
          user_id: userId,
          rating,
          review_text: reviewText || null,
          was_helpful: wasHelpful,
          would_recommend: wouldRecommend,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      onRatingSubmit?.(rating, reviewText);
      setShowDialog(false);
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StarDisplay = ({ filled, size = 20 }: { filled: boolean; size?: number }) => (
    <Star
      size={size}
      className={`transition-all ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
    />
  );

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarDisplay key={star} filled={star <= Math.round(avgRating)} size={16} />
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {avgRating.toFixed(1)} ({ratingsCount})
        </span>
        {userId && (
          <button
            onClick={() => setShowDialog(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Rate
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Display Average Rating */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarDisplay key={star} filled={star <= Math.round(avgRating)} />
            ))}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{avgRating.toFixed(1)}</span>
            {' '}({ratingsCount} {ratingsCount === 1 ? 'rating' : 'ratings'})
          </div>
        </div>

        {userId && (
          <button
            onClick={() => setShowDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {initialRating > 0 ? 'Update Rating' : 'Write an Endorsement'}
          </button>
        )}
      </div>

      {/* Rating Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Rate & Review</h3>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={`transition-all ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1]}
                  </span>
                )}
              </div>
            </div>

            {/* Review Text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review (Optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Additional Questions */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Was this helpful?
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWasHelpful(true)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      wasHelpful === true
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setWasHelpful(false)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      wasHelpful === false
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Would you recommend this?
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWouldRecommend(true)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      wouldRecommend === true
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setWouldRecommend(false)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      wouldRecommend === false
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={!rating || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
