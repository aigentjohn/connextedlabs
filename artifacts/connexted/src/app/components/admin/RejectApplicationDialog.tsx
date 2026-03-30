import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { X } from 'lucide-react';

interface Application {
  id: string;
  name: string;
  email: string;
}

interface RejectApplicationDialogProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string, notes?: string) => void;
}

const REJECTION_REASONS = [
  'Does not meet minimum qualifications',
  'Program is at full capacity',
  'Application incomplete or unclear',
  'Not the right fit for this cohort',
  'Preferred other candidates',
  'Other (specify in notes)'
];

export function RejectApplicationDialog({
  application,
  isOpen,
  onClose,
  onConfirm
}: RejectApplicationDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  const handleConfirm = () => {
    onConfirm(selectedReason || undefined, notes || undefined);
    setSelectedReason('');
    setNotes('');
    setSendEmail(false);
  };

  const handleCancel = () => {
    setSelectedReason('');
    setNotes('');
    setSendEmail(false);
    onClose();
  };

  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <X className="w-5 h-5" />
            Reject Application
          </DialogTitle>
          <DialogDescription>
            You're about to reject the application from <strong>{application.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Applicant Info */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-gray-700">
              <div className="font-semibold mb-1">{application.name}</div>
              <div className="text-gray-600">{application.email}</div>
            </div>
          </div>

          {/* Rejection Reason */}
          <div>
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Rejection
            </label>
            <select
              id="rejection-reason"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a reason...</option>
              {REJECTION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label htmlFor="rejection-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Internal)
            </label>
            <textarea
              id="rejection-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal notes about this rejection..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              These notes are for internal use only and won't be shared with the applicant
            </p>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2 text-sm">⚠️ Please note:</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• This action can be reversed if needed</li>
              <li>• Application will be moved to "Rejected" status</li>
              <li>• In-app notification will be sent to the applicant</li>
              <li>• Review history will be logged</li>
              <li>• Applicant can reapply in future cohorts</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleConfirm}
              variant="destructive"
              className="flex-1"
              disabled={!selectedReason}
            >
              <X className="w-4 h-4 mr-2" />
              Confirm Rejection
            </Button>
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}