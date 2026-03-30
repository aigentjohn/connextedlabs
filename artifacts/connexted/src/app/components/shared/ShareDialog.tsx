import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTitle: string;
  shareUrl: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  contentTitle,
  shareUrl,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share "{contentTitle}"
          </DialogTitle>
          <DialogDescription>
            Copy this link and paste it into any post, forum thread, or comment.
            It will automatically appear in that circle or program!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copyable URL */}
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button onClick={handleCopy} variant="secondary" size="icon">
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Usage Example */}
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">Example:</p>
            <p className="text-sm text-muted-foreground italic">
              "Check out this helpful resource: {shareUrl}"
            </p>
          </div>

          {/* Benefits */}
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium">✨ When you paste this link:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>The content will appear in that circle's resources</li>
              <li>Others can easily discover it</li>
              <li>No manual linking required!</li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
