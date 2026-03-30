import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import StatusEmojiPicker from './StatusEmojiPicker';

interface EditResponseDialogProps {
  customQuestion: string;
  currentResponse: string;
  currentEmoji?: string;
  onClose: () => void;
  onUpdate: (response: string, emoji?: string) => Promise<void>;
}

export default function EditResponseDialog({
  customQuestion,
  currentResponse,
  currentEmoji,
  onClose,
  onUpdate,
}: EditResponseDialogProps) {
  const [response, setResponse] = useState(currentResponse);
  const [emoji, setEmoji] = useState(currentEmoji || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onUpdate(response, emoji);
      onClose();
    } catch (error) {
      // Error is handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Your Response</DialogTitle>
          <DialogDescription>
            Share your latest status or update
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <StatusEmojiPicker value={emoji} onChange={setEmoji} />

          <div className="space-y-2">
            <Label htmlFor="response">
              {customQuestion || "What's your status?"}
            </Label>
            <Textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Share your status or response..."
              rows={4}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Update Response'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}