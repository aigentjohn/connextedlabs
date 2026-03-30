// Split candidate: ~444 lines — consider extracting ActionSelector, SelectionSummaryBar, and ConfirmBatchDialog into sub-components.
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'sonner';
import { Check, X, Mail, Copy, Download, AlertCircle, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard-utils';

interface BatchActionsBarProps {
  selectedIds: string[];
  applications: any[];
  cohorts: any[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function BatchActionsBar({
  selectedIds,
  applications,
  cohorts,
  onClearSelection,
  onRefresh
}: BatchActionsBarProps) {
  const [action, setAction] = useState<string>('');
  const [cohortDialogOpen, setCohortDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [processing, setProcessing] = useState(false);

  const selectedApplications = applications.filter(app => selectedIds.includes(app.id));

  const handleBatchApprove = async () => {
    if (cohorts.length === 0) {
      // No cohorts, just approve
      await processBatchAction('approved', 'Applications approved successfully');
    } else {
      // Show cohort selection
      setCohortDialogOpen(true);
    }
  };

  const handleBatchReject = async () => {
    if (!confirm(`Are you sure you want to reject ${selectedIds.length} applications?`)) {
      return;
    }
    await processBatchAction('rejected', 'Applications rejected');
  };

  const handleBatchWaitlist = async () => {
    await processBatchAction('waitlisted', 'Applications moved to waitlist');
  };

  const processBatchAction = async (newStatus: string, successMessage: string) => {
    try {
      setProcessing(true);

      const { error } = await supabase
        .from('program_applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(successMessage);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error('Error processing batch action:', error);
      toast.error('Failed to process action');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveWithCohort = async () => {
    if (!selectedCohort) {
      toast.error('Please select a cohort');
      return;
    }

    try {
      setProcessing(true);

      // Use the assign_applications_to_cohort function
      const { data, error } = await supabase.rpc('assign_applications_to_cohort', {
        p_application_ids: selectedIds,
        p_cohort_id: selectedCohort,
        p_update_status: true
      });

      if (error) throw error;

      if (data && data[0] && !data[0].success) {
        throw new Error(data[0].error_message);
      }

      toast.success(`${selectedIds.length} applications approved and assigned to cohort`);
      setCohortDialogOpen(false);
      setSelectedCohort('');
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error('Error assigning to cohort:', error);
      toast.error(error.message || 'Failed to assign to cohort');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyEmails = () => {
    const emails = selectedApplications.map(app => app.email).join(', ');
    copyToClipboard(emails);
    toast.success(`Copied ${selectedApplications.length} email addresses`);
  };

  const handleCopyBCCList = () => {
    const emails = selectedApplications.map(app => app.email).join('; ');
    copyToClipboard(emails);
    toast.success('Copied as BCC list (semicolon-separated)');
  };

  const handleCopyEmailTemplate = () => {
    // Determine template based on selected applications' status
    const firstApp = selectedApplications[0];
    const program = firstApp.program_name || 'the program';
    
    let template = '';
    if (action === 'approved' || firstApp.status === 'approved') {
      template = `Subject: Congratulations! You've been accepted to ${program}

Hi [Name],

Congratulations! We're thrilled to inform you that you've been accepted to ${program}.

${selectedCohort ? 'Cohort: [Cohort Name]\nStart Date: [Start Date]\n' : ''}
Next Steps:
1. Reply to this email to confirm your attendance
2. [Add any specific instructions]
3. [Add calendar invites, links, etc.]

We're excited to have you join us!

Best regards,
[Your Name]
[Program Name] Team`;
    } else if (action === 'rejected' || firstApp.status === 'rejected') {
      template = `Subject: Update on your application to ${program}

Hi [Name],

Thank you for your interest in ${program}. After careful consideration of all applications, we regret to inform you that we're unable to offer you a spot at this time.

We received an overwhelming number of strong applications, and unfortunately, we have limited spaces available.

We encourage you to apply again in the future, and we wish you all the best in your endeavors.

Best regards,
[Your Name]
[Program Name] Team`;
    } else if (action === 'waitlisted' || firstApp.status === 'waitlisted') {
      template = `Subject: Your application to ${program} - Waitlist Update

Hi [Name],

Thank you for your application to ${program}. While we were impressed with your application, all available spots have been filled. We'd like to place you on our waitlist.

If a spot becomes available, we'll contact you immediately. We typically know about openings within [timeframe].

Thank you for your patience and continued interest.

Best regards,
[Your Name]
[Program Name] Team`;
    }

    setEmailTemplate(template);
    setEmailDialogOpen(true);
  };

  const copyTemplateToClipboard = () => {
    copyToClipboard(emailTemplate);
    toast.success('Email template copied to clipboard');
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Score', 'Applied Date'];
    const rows = selectedApplications.map(app => [
      app.full_name || app.name,
      app.email,
      app.phone || '',
      app.status,
      app.score || '',
      new Date(app.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('CSV exported');
  };

  const handleMarkNotified = async () => {
    try {
      setProcessing(true);

      const { data, error } = await supabase.rpc('mark_applications_notified', {
        p_application_ids: selectedIds,
        p_notification_method: 'email',
        p_notes: 'Bulk notification sent'
      });

      if (error) throw error;

      toast.success(`Marked ${selectedIds.length} applications as notified`);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error('Error marking as notified:', error);
      toast.error('Failed to mark as notified');
    } finally {
      setProcessing(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-10 bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="text-base px-3 py-1">
              {selectedIds.length} selected
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch Actions */}
            <Button
              size="sm"
              variant="default"
              onClick={handleBatchApprove}
              disabled={processing}
            >
              <Check className="w-4 h-4 mr-2" />
              Approve {cohorts.length > 0 && '& Assign'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchWaitlist}
              disabled={processing}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Waitlist
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleBatchReject}
              disabled={processing}
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>

            <div className="border-l border-gray-300 h-6 mx-2" />

            {/* Communication Actions */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyBCCList}
            >
              <Mail className="w-4 h-4 mr-2" />
              Copy BCC List
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyEmailTemplate}
            >
              <Copy className="w-4 h-4 mr-2" />
              Email Template
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkNotified}
              disabled={processing}
            >
              <Check className="w-4 h-4 mr-2" />
              Mark Notified
            </Button>

            <div className="border-l border-gray-300 h-6 mx-2" />

            {/* Export */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Cohort Selection Dialog */}
      <Dialog open={cohortDialogOpen} onOpenChange={setCohortDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Assign to Cohort</DialogTitle>
            <DialogDescription>
              Select a cohort for the {selectedIds.length} selected application(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Cohort</Label>
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a cohort..." />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => {
                    const spotsLeft = cohort.max_participants 
                      ? cohort.max_participants - cohort.current_participants
                      : null;
                    const canFit = spotsLeft === null || spotsLeft >= selectedIds.length;

                    return (
                      <SelectItem 
                        key={cohort.id} 
                        value={cohort.id}
                        disabled={!canFit}
                      >
                        {cohort.name}
                        {spotsLeft !== null && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({spotsLeft} spots left)
                          </span>
                        )}
                        {!canFit && (
                          <span className="text-xs text-destructive ml-2">
                            (Not enough spots)
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCohortDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApproveWithCohort}
                disabled={!selectedCohort || processing}
              >
                Approve & Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Template Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Template</DialogTitle>
            <DialogDescription>
              Copy this template and customize it in your email client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />

            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">
                <strong>{selectedIds.length} recipients</strong> - Remember to replace [placeholders]
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyBCCList}>
                  <Mail className="w-4 h-4 mr-2" />
                  Copy BCC List
                </Button>
                <Button size="sm" onClick={copyTemplateToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Template
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Next steps:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Click "Copy Template" to copy the email text</li>
                <li>Click "Copy BCC List" to copy recipient emails</li>
                <li>Open your email client (Gmail, Outlook, etc.)</li>
                <li>Paste the BCC list in the BCC field</li>
                <li>Paste and customize the template</li>
                <li>Send, then return here and click "Mark Notified"</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}