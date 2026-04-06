import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEngagementExtension } from '@/hooks/useEngagementExtension';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

interface PrivateCommentDialogProps {
  containerType: 'document' | 'review' | 'pitch' | 'build' | 'circle' | 'table' | 'library' | 'event' | 'meetup' | 'elevator' | 'standup' | 'program' | 'playlist' | 'magazine' | 'episode' | 'checklist' | 'book' | 'deck';
  containerId: string;
  containerTitle: string;
  recipientId: string;
  recipientName: string;
  /** Optional explicit URL for the notification link — use when the route uses a slug rather than a UUID. */
  containerPath?: string;
  trigger?: React.ReactNode;
  onCommentSent?: () => void;
}

export default function PrivateCommentDialog({
  containerType,
  containerId,
  containerTitle,
  recipientId,
  recipientName,
  containerPath,
  trigger,
  onCommentSent,
}: PrivateCommentDialogProps) {
  const { profile } = useAuth();
  const { extendOnEngagement } = useEngagementExtension();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile || !content.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (profile.id === recipientId) {
      toast.error('You cannot send a private comment to yourself');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare comment data with container-specific field
      const commentData: any = {
        author_id: profile.id,
        recipient_id: recipientId,
        content: content.trim(),
        is_read: false,
      };

      // Set the appropriate container field
      const containerField = `${containerType}_id`;
      commentData[containerField] = containerId;

      // Insert the comment
      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

      if (error) throw error;

      // Trigger engagement extension (+3 days for comments)
      await extendOnEngagement(
        containerType,
        containerId,
        'comment',
        data.id,
        {
          showToast: false,
          userId: profile.id,
        }
      );

      // Create notification for recipient
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'comment',
        title: `New private comment from ${profile.name}`,
        message: `${profile.name} sent you a private comment on "${containerTitle}"`,
        link_url: containerPath ?? getContainerUrl(containerType, containerId),
        link_type: containerType,
        link_id: containerId,
        actor_id: profile.id,
      });

      toast.success('Private comment sent!');
      setContent('');
      setOpen(false);
      onCommentSent?.();
    } catch (error) {
      console.error('Error sending private comment:', error);
      toast.error('Failed to send comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getContainerUrl = (type: string, id: string): string => {
    const urlMap: Record<string, string> = {
      document: `/documents/${id}`,
      review: `/reviews/${id}`,
      pitch: `/pitches/${id}`,
      build: `/builds/${id}`,
      circle: `/circles/${id}`,
      table: `/tables/${id}`,
      library: `/libraries/${id}`,
      event: `/events/${id}`,
      meetup: `/meetups/${id}`,
      elevator: `/elevators/${id}`,
      standup: `/standups/${id}`,
      program: `/programs/${id}`,
      playlist: `/playlists/${id}`,
      magazine: `/magazines/${id}`,
      episode: `/episodes/${id}`,
      checklist: `/checklists/${id}`,
      book: `/books/${id}`,
      deck: `/decks/${id}`,
    };
    return urlMap[type] || '/';
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Private Comment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Send Private Comment</DialogTitle>
            <DialogDescription>
              Send a private message to <strong>{recipientName}</strong> about "{containerTitle}".
              Only you and {recipientName} will see this comment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Your Comment</Label>
              <Textarea
                id="comment"
                placeholder="Share your thoughts, ask a question, or provide feedback..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                maxLength={1000}
                required
              />
              <p className="text-xs text-gray-500">
                {content.length}/1000 characters
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 This is a <strong>private one-way message</strong>. {recipientName} can read your comment but cannot reply directly through this feature.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !content.trim()}>
              {submitting ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Comment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}