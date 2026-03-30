import React, { useState } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTitle: string;
  contentType: string;
  existingRating?: number;
  existingReviewText?: string;
  existingWasHelpful?: boolean;
  onSubmit: (rating: number, reviewText?: string, wasHelpful?: boolean) => void;
}

export function RatingDialog({
  open,
  onOpenChange,
  contentTitle,
  contentType,
  existingRating,
  existingReviewText,
  existingWasHelpful,
  onSubmit,
}: RatingDialogProps) {
  const [rating, setRating] = useState(existingRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(existingReviewText || '');
  const [wasHelpful, setWasHelpful] = useState(existingWasHelpful ?? false);

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    onSubmit(rating, reviewText || undefined, wasHelpful);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to existing values or defaults
    setRating(existingRating || 0);
    setReviewText(existingReviewText || '');
    setWasHelpful(existingWasHelpful ?? false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingRating ? 'Update Your Review' : 'Rate & Review'}
          </DialogTitle>
          <DialogDescription>
            Share your experience with "{contentTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>How would you rate this {contentType}?</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review-text">
              Write your review (optional)
            </Label>
            <Textarea
              id="review-text"
              placeholder="Share your thoughts about this content..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Help others by sharing what you found useful or what could be improved.
            </p>
          </div>

          {/* Was Helpful Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="was-helpful"
              checked={wasHelpful}
              onCheckedChange={(checked) => setWasHelpful(checked === true)}
            />
            <label
              htmlFor="was-helpful"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              This {contentType} was helpful to me
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0}>
            {existingRating ? 'Update Review' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
