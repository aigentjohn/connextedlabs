/**
 * RedeemCodeDialog
 * 
 * A reusable "Have a code?" dialog for course and program landing pages.
 * Supports scholarship codes, promo codes, gift cards, etc.
 * 
 * Creates both access_ticket AND legacy enrollment via enrollmentBridge.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Ticket, Loader2, CheckCircle, AlertCircle, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { redeemCodeWithBridge } from '@/services/enrollmentBridge';

interface RedeemCodeDialogProps {
  /** The container type (course, program, etc.) — used for display */
  containerType: 'course' | 'program' | 'circle' | 'event';
  /** The container ID — if set, validates the code matches this container */
  containerId?: string;
  /** Current user ID */
  userId: string;
  /** Called after successful redemption */
  onRedeemed: (result: { ticketId: string; containerType: string; containerId: string }) => void;
  /** Optional custom trigger element */
  trigger?: React.ReactNode;
  /** Optional custom trigger variant */
  variant?: 'link' | 'outline' | 'ghost';
}

export default function RedeemCodeDialog({
  containerType,
  containerId,
  userId,
  onRedeemed,
  trigger,
  variant = 'link',
}: RedeemCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const containerLabel = containerType === 'course' ? 'course'
    : containerType === 'program' ? 'program'
    : containerType === 'circle' ? 'circle'
    : 'event';

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    setRedeeming(true);
    setError(null);

    try {
      const result = await redeemCodeWithBridge({
        code: code.trim(),
        userId,
      });

      // If containerId was specified, verify the code matches
      if (containerId && result.containerId !== containerId) {
        // The code is for a different container — still valid, just redirect differently
        toast.success(`Code redeemed! This gives you access to a different ${result.containerType}.`);
      }

      setSuccess(true);
      toast.success('Code redeemed successfully!');

      // Notify parent
      setTimeout(() => {
        setOpen(false);
        setCode('');
        setSuccess(false);
        onRedeemed(result);
      }, 1500);
    } catch (err: any) {
      console.error('Redemption error:', err);
      setError(err.message || 'Failed to redeem code');
    } finally {
      setRedeeming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !redeeming) {
      handleRedeem();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setCode('');
        setError(null);
        setSuccess(false);
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={variant} size="sm" className="text-sm">
            <Ticket className="w-4 h-4 mr-1" />
            Have a code?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            Redeem Access Code
          </DialogTitle>
          <DialogDescription>
            Enter a scholarship, promo, or gift code to get access to this {containerLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-700">Code Redeemed!</h3>
              <p className="text-sm text-gray-600 mt-1">
                You now have access. Redirecting...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="redeem-code">Access Code</Label>
                <Input
                  id="redeem-code"
                  placeholder="e.g. SCHOLAR2026, GIFT-XYZ789"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={redeeming}
                  className="font-mono text-lg tracking-wider"
                  autoFocus
                />
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <Button
                onClick={handleRedeem}
                disabled={redeeming || !code.trim()}
                className="w-full"
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4 mr-2" />
                    Redeem Code
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p>Accepted code types:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Scholarship</Badge>
                  <Badge variant="outline" className="text-xs">Promo</Badge>
                  <Badge variant="outline" className="text-xs">Gift Card</Badge>
                  <Badge variant="outline" className="text-xs">Partner</Badge>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
