import { useState } from 'react';
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
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { AlertTriangle, Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface ReportContentDialogProps {
  contentType: string;
  contentId: string;
  contentTitle?: string;
  onReportSubmitted?: () => void;
  trigger?: React.ReactNode;
}

const REPORT_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Offensive, explicit, or disturbing content' },
  { value: 'spam', label: 'Spam', description: 'Unwanted promotional or repetitive content' },
  { value: 'harassment', label: 'Harassment or Bullying', description: 'Targeting or attacking individuals' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'copyright_violation', label: 'Copyright Violation', description: 'Unauthorized use of copyrighted material' },
  { value: 'other', label: 'Other', description: 'Other concern not listed above' },
];

export default function ReportContentDialog({
  contentType,
  contentId,
  contentTitle,
  onReportSubmitted,
  trigger,
}: ReportContentDialogProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!profile || !reason) return;

    try {
      setSubmitting(true);

      // Create the flag
      const { error: flagError } = await supabase
        .from('content_flags')
        .insert({
          content_type: contentType,
          content_id: contentId,
          reporter_id: profile.id,
          reason,
          details: details.trim() || null,
          status: 'pending',
        });

      if (flagError) throw flagError;

      // Get all platform admins to notify
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      // Create notifications for all admins
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'content_flagged',
          title: 'Content Flagged for Review',
          message: `A ${contentType} has been flagged for ${reason.replace('_', ' ')}.`,
          link: `/admin/flagged-content`,
          created_at: new Date().toISOString(),
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }

      toast.success('Report submitted', {
        description: 'Thank you for helping keep our community safe. Admins have been notified.',
      });

      // Reset form and close
      setReason('');
      setDetails('');
      setOpen(false);
      
      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-600" />
            Report {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </DialogTitle>
          <DialogDescription>
            Help us maintain a safe and respectful community. Your report will be reviewed by our moderation team.
            {contentTitle && (
              <div className="mt-2 text-sm font-medium text-foreground">
                Reporting: "{contentTitle}"
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">What's the issue?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <div
                  key={r.value}
                  className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={r.value} id={r.value} className="mt-0.5" />
                  <label
                    htmlFor={r.value}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{r.label}</div>
                    <div className="text-sm text-muted-foreground">{r.description}</div>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide any additional context that might help our moderation team..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Specific details help us address the issue more effectively.
            </p>
          </div>

          {/* Warning Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <p className="font-medium mb-1">Important</p>
              <p>
                False reports or abuse of the reporting system may result in action against your account.
                Reports are reviewed by humans and kept confidential.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Flag className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}