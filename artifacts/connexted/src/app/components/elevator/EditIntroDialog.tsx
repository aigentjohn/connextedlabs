import { useState, useEffect } from 'react';
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
import { Edit } from 'lucide-react';

interface EditIntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elevatorName: string;
  currentIntro: string;
  onUpdate: (intro: string) => Promise<void>;
}

export default function EditIntroDialog({
  open,
  onOpenChange,
  elevatorName,
  currentIntro,
  onUpdate,
}: EditIntroDialogProps) {
  const [intro, setIntro] = useState(currentIntro);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update intro when dialog opens with new currentIntro
  useEffect(() => {
    if (open) {
      setIntro(currentIntro);
    }
  }, [open, currentIntro]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate(intro);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating intro:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Your Intro
          </DialogTitle>
          <DialogDescription>
            Update your introduction for {elevatorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="intro">Your Introduction</Label>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
