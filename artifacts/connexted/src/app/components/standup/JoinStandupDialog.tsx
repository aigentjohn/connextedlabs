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

interface JoinStandupDialogProps {
  standupName: string;
  customQuestion: string;
  onClose: () => void;
  onJoin: (response: string, emoji?: string) => Promise<void>;
}

export default function JoinStandupDialog({
  standupName,
  customQuestion,
  onClose,
  onJoin,
}: JoinStandupDialogProps) {
  const [response, setResponse] = useState('');
  const [emoji, setEmoji] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onJoin(response, emoji);
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
          <DialogTitle>Join {standupName}</DialogTitle>
          <DialogDescription>
            Answer the standup question to join and start participating
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
            />
            <p className="text-xs text-gray-500">
              You can update your response anytime after joining
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Joining...' : 'Join Standup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}