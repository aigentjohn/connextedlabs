import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Check, X, Flag, Mail, Phone, Calendar, FileText, Users, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Application {
  id: string;
  program_id: string;
  name: string;
  email: string;
  phone?: string;
  answers: any;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  score?: number;
  flagged: boolean;
  internal_notes?: string;
  tags?: string[];
  cohort_id?: string;
  notified?: boolean;
  notification_date?: string;
  created_at: string;
  updated_at?: string;
}

interface ApplicationDetailModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (app: Application) => void;
  onReject: (app: Application) => void;
  onFlagToggle: (app: Application) => void;
  programName: string;
}

export function ApplicationDetailModal({
  application,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onFlagToggle,
  programName
}: ApplicationDetailModalProps) {
  if (!application) return null;

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      waitlisted: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[status] || colors.pending;
  };

  const [cohortName, setCohortName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCohortName = async () => {
      if (application.cohort_id) {
        const { data, error } = await supabase
          .from('cohorts')
          .select('name')
          .eq('id', application.cohort_id)
          .single();

        if (error) {
          toast.error('Failed to fetch cohort name');
        } else {
          setCohortName(data.name);
        }
      }
    };

    fetchCohortName();
  }, [application.cohort_id]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Application Details</span>
            <Badge className={`${getStatusColor(application.status)} border`}>
              {application.status.replace('_', ' ')}
            </Badge>
            {application.flagged && (
              <Badge variant="destructive" className="text-xs">
                <Flag className="w-3 h-3 mr-1" />
                Flagged
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Applicant Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Applicant Information</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600 mb-1">Name</dt>
                <dd className="font-medium text-gray-900">{application.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </dt>
                <dd className="font-medium text-gray-900">
                  <a href={`mailto:${application.email}`} className="text-blue-600 hover:underline">
                    {application.email}
                  </a>
                </dd>
              </div>
              {application.phone && (
                <div>
                  <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone
                  </dt>
                  <dd className="font-medium text-gray-900">{application.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Applied
                </dt>
                <dd className="font-medium text-gray-900">
                  {new Date(application.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Program
                </dt>
                <dd className="font-medium text-gray-900">{programName}</dd>
              </div>
              {application.score !== null && application.score !== undefined && (
                <div>
                  <dt className="text-sm text-gray-600 mb-1">Score</dt>
                  <dd className="font-medium text-gray-900">
                    <Badge variant="secondary">{application.score}/100</Badge>
                  </dd>
                </div>
              )}
              {application.cohort_id && (
                <div>
                  <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Cohort
                  </dt>
                  <dd className="font-medium text-gray-900">{cohortName || 'Loading...'}</dd>
                </div>
              )}
              {application.notification_date && (
                <div>
                  <dt className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Notified
                  </dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(application.notification_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Application Responses */}
          {application.answers && Object.keys(application.answers).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Application Responses</h3>
              <div className="space-y-4">
                {Object.entries(application.answers).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <dt className="text-sm font-medium text-gray-700 mb-2">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Information */}
          {(application.review_notes || application.rejection_reason || application.reviewed_at) && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Review Information</h3>
              <div className="space-y-3">
                {application.reviewed_at && (
                  <div>
                    <dt className="text-sm text-gray-600 mb-1">Reviewed At</dt>
                    <dd className="text-gray-900">
                      {new Date(application.reviewed_at).toLocaleString()}
                    </dd>
                  </div>
                )}
                {application.review_notes && (
                  <div>
                    <dt className="text-sm text-gray-600 mb-1">Review Notes</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">{application.review_notes}</dd>
                  </div>
                )}
                {application.rejection_reason && (
                  <div>
                    <dt className="text-sm text-gray-600 mb-1">Rejection Reason</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">{application.rejection_reason}</dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {application.internal_notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Internal Notes</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{application.internal_notes}</p>
            </div>
          )}

          {/* Tags */}
          {application.tags && application.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {application.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            {application.status === 'pending' && (
              <>
                <Button
                  onClick={() => onApprove(application)}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Application
                </Button>
                <Button
                  onClick={() => onReject(application)}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject Application
                </Button>
              </>
            )}
            <Button
              onClick={() => onFlagToggle(application)}
              variant="ghost"
              className={application.flagged ? 'text-red-600' : ''}
            >
              <Flag className={`w-4 h-4 mr-2 ${application.flagged ? 'fill-current' : ''}`} />
              {application.flagged ? 'Remove Flag' : 'Flag for Review'}
            </Button>
            <Button onClick={onClose} variant="outline" className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}