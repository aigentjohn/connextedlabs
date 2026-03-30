import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Star, Plus, Search } from 'lucide-react';

interface Review {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  external_rating: number;
  tags: string[] | null;
  pitch_ids?: string[];
  created_at: string;
}

interface AddReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pitchId: string;
  onReviewAdded: () => void;
}

export default function AddReviewDialog({
  open,
  onOpenChange,
  pitchId,
  onReviewAdded,
}: AddReviewDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingReviews, setExistingReviews] = useState<Review[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New review form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (open) {
      fetchExistingReviews();
    }
  }, [open]);

  const fetchExistingReviews = async () => {
    try {
      // Fetch all reviews, then filter out ones already associated with this pitch
      const { data, error } = await supabase
        .from('endorsements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }

      // Filter out reviews already linked to this pitch via pitch_ids
      const available = (data || []).filter(review => {
        const pitchIds = review.pitch_ids || [];
        return !pitchIds.includes(pitchId);
      });

      setExistingReviews(available);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    setLoading(true);

    try {
      // Create new review with this pitch in its pitch_ids
      const { data: newReview, error: reviewError } = await supabase
        .from('endorsements')
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            link_url: linkUrl.trim() || null,
            external_rating: rating,
            author_id: profile.id,
            tags: [],
            pitch_ids: [pitchId],
          },
        ])
        .select()
        .single();

      if (reviewError) {
        console.error('Error creating review:', reviewError);
        toast.error(`Failed to create review: ${reviewError.message}`);
        return;
      }

      console.log('Review created and linked to pitch:', newReview.id);
      toast.success('Review created and added to pitch');
      onReviewAdded();
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setRating(5);
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error(`Failed to create review: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExisting = async (reviewId: string) => {
    if (!profile) return;

    try {
      // Get current pitch_ids for this review
      const { data: review, error: fetchError } = await supabase
        .from('endorsements')
        .select('pitch_ids')
        .eq('id', reviewId)
        .single();

      if (fetchError) {
        console.error('Error fetching review:', fetchError);
        toast.error(`Failed to fetch review: ${fetchError.message}`);
        return;
      }

      const currentPitchIds = (review?.pitch_ids as string[]) || [];
      if (currentPitchIds.includes(pitchId)) {
        toast.info('Review is already linked to this pitch');
        return;
      }

      // Add this pitch to the review's pitch_ids array
      const { error: updateError } = await supabase
        .from('endorsements')
        .update({ pitch_ids: [...currentPitchIds, pitchId] })
        .eq('id', reviewId);

      if (updateError) {
        console.error('Error linking review to pitch:', updateError);
        toast.error(`Failed to add review: ${updateError.message}`);
        return;
      }

      toast.success('Review added to pitch');
      onReviewAdded();
      fetchExistingReviews(); // Refresh list
    } catch (error) {
      console.error('Error adding review:', error);
      toast.error(`Failed to add review: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const filteredReviews = existingReviews.filter(
    review =>
      review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= count
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Review to Pitch</DialogTitle>
          <DialogDescription>
            Create a new review or add an existing one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="existing">Add Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <form onSubmit={handleCreateAndAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Review title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Rating *</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 cursor-pointer transition-colors ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What are your thoughts?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkUrl">Link URL (optional)</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : 'Create & Add to Pitch'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search reviews..."
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No available reviews found</p>
                </div>
              ) : (
                filteredReviews.map(review => (
                  <div
                    key={review.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <h4 className="font-medium truncate">{review.title}</h4>
                      <div className="my-1">{renderStars(review.external_rating)}</div>
                      <p className="text-sm text-gray-600 line-clamp-2">{review.description}</p>
                      {review.tags && review.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          {review.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAddExisting(review.id)}>
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}