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
import { UserPlus } from 'lucide-react';

interface JoinElevatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elevatorName: string;
  elevatorDescription?: string;
  onJoin: (intro: string) => Promise<void>;
}

export default function JoinElevatorDialog({
  open,
  onOpenChange,
  elevatorName,
  elevatorDescription,
  onJoin,
}: JoinElevatorDialogProps) {
  const [intro, setIntro] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!intro.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onJoin(intro);
      setIntro(''); // Reset form
      onOpenChange(false);
    } catch (error) {
      console.error('Error joining elevator:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Join {elevatorName}
          </DialogTitle>
          <DialogDescription>
            {elevatorDescription || 'Introduce yourself to this elevator community'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="intro">
              Your Introduction <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="intro"
              placeholder="Tell this elevator community about yourself, what you're looking for, or how you can help others..."
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This intro is unique to this elevator and helps members connect with you.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!intro.trim() || isSubmitting}
          >
            {isSubmitting ? 'Joining...' : 'Join Elevator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
