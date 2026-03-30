/**
 * WaitlistManager
 *
 * Manages the APPLICATION-based waitlist — people who submitted a program
 * application and were placed on hold due to capacity.
 *
 * This is distinct from the TICKET waitlist (KV-backed, TicketInventoryAdmin)
 * which captures passive landing-page interest before any application is made.
 *
 * Promotion here → application status set to 'approved'
 *                + access_ticket + program_members created via enrollmentBridge
 *                + optional inventory ticket issued via ApproveApplicationDialog
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Mail, User, Calendar, Info } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard-utils';
import { enrollInProgram } from '@/services/enrollmentBridge';
import { ApproveApplicationDialog } from './ApproveApplicationDialog';

interface WaitlistApplication {
  id: string;
  full_name: string;
  email: string;
  user_id?: string;
  score?: number;
  created_at: string;
  program_name?: string;
}

interface WaitlistManagerProps {
  programId: string;
  onPromote?: (applicationId: string) => void;
}

export function WaitlistManager({ programId, onPromote }: WaitlistManagerProps) {
  const [applications, setApplications] = useState<WaitlistApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [applicationToPromote, setApplicationToPromote] = useState<WaitlistApplication | null>(null);

  useEffect(() => {
    loadWaitlist();
  }, [programId]);

  const loadWaitlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('program_applications')
        .select('id, name, email, user_id, score, created_at, programs(name)')
        .eq('program_id', programId)
        .eq('status', 'waitlisted')
        .order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted: WaitlistApplication[] = (data || []).map(app => ({
        id: app.id,
        full_name: (app as any).name || '',
        email: app.email,
        user_id: app.user_id || undefined,
        score: app.score,
        created_at: app.created_at,
        program_name: (app as any).programs?.name,
      }));

      setApplications(formatted);
    } catch (error: any) {
      console.error('Error loading waitlist:', error);
      toast.error('Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...applications];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setApplications(next);
  };

  const moveDown = (index: number) => {
    if (index === applications.length - 1) return;
    const next = [...applications];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setApplications(next);
  };

  const openPromoteDialog = (app: WaitlistApplication) => {
    setApplicationToPromote(app);
    setApproveDialogOpen(true);
  };

  /**
   * Called when the ApproveApplicationDialog confirms.
   * The dialog itself already issued the inventory ticket (if selected).
   * Here we:
   *  1. Mark the application as approved
   *  2. Call enrollmentBridge to create access_ticket + program_members
   *  3. Refresh the list
   */
  const handlePromoteConfirm = async (notes?: string, ticketItemId?: string) => {
    const app = applicationToPromote;
    if (!app) return;

    try {
      // 1. Update application status
      const { error: updateError } = await supabase
        .from('program_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', app.id);

      if (updateError) throw updateError;

      // 2. Grant program access via enrollmentBridge (creates access_ticket + program_members)
      if (app.user_id) {
        try {
          await enrollInProgram({
            userId: app.user_id,
            programId,
            acquisitionSource: 'invitation',
            acquisitionContext: {
              application_id: app.id,
              promoted_from_waitlist: true,
              ticket_issued_separately: !!ticketItemId,
              notes,
            },
            // If a paid inventory ticket was issued, record as paid; otherwise free grant
            ticketType: ticketItemId ? 'paid' : 'free',
          });
          console.log(`Access ticket + program membership created for promoted waitlist user ${app.user_id}`);
        } catch (enrollErr) {
          console.error('enrollmentBridge failed during waitlist promotion (non-fatal):', enrollErr);
          // Fallback: push to member_ids array
          try {
            const { data: programData } = await supabase
              .from('programs')
              .select('member_ids')
              .eq('id', programId)
              .single();

            const currentIds = programData?.member_ids || [];
            if (!currentIds.includes(app.user_id)) {
              await supabase
                .from('programs')
                .update({ member_ids: [...currentIds, app.user_id] })
                .eq('id', programId);
            }
          } catch (fbErr) {
            console.error('Fallback member_ids push also failed:', fbErr);
          }
        }

        // 3. Notify the user
        await supabase.from('notifications').insert({
          user_id: app.user_id,
          type: 'application_approved',
          title: 'Great news — you\'re in! 🎉',
          message: `Your waitlisted application for ${app.program_name || 'the program'} has been approved. You now have access.`,
          action_url: `/programs`,
        });
      }

      toast.success(`${app.full_name} promoted from waitlist — access granted!`);
      setApproveDialogOpen(false);
      setApplicationToPromote(null);
      loadWaitlist();
      onPromote?.(app.id);
    } catch (error: any) {
      console.error('Error promoting from waitlist:', error);
      toast.error(`Failed to promote: ${error.message}`);
    }
  };

  const handleCopyEmails = () => {
    const emails = applications.slice(0, 10).map(app => app.email).join(', ');
    copyToClipboard(emails);
    toast.success('Copied top 10 email addresses');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading waitlist...</div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No applications on waitlist</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Shape needed by ApproveApplicationDialog
  const dialogApplication = applicationToPromote
    ? {
        id: applicationToPromote.id,
        name: applicationToPromote.full_name,
        email: applicationToPromote.email,
        user_id: applicationToPromote.user_id,
      }
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Application Waitlist</CardTitle>
              <CardDescription>
                {applications.length} applicant{applications.length !== 1 ? 's' : ''} waiting for a spot
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyEmails}>
              <Mail className="w-4 h-4 mr-2" />
              Copy Top 10 Emails
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Context note */}
          <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              These applicants submitted a program application and were waitlisted due to capacity.
              Promoting them marks their application as approved, creates an access ticket, and grants
              program membership. This is separate from the ticket-based waitlist in Ticket Inventory,
              which captures landing-page interest before any application.
            </span>
          </div>

          <div className="space-y-2">
            {applications.map((app, index) => (
              <div
                key={app.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Priority Number */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>

                {/* Applicant Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{app.full_name}</div>
                  <div className="text-sm text-muted-foreground truncate">{app.email}</div>
                  {!app.user_id && (
                    <div className="text-xs text-amber-600 mt-0.5">No platform account — ticket issuance will be skipped on promote</div>
                  )}
                </div>

                {/* Score */}
                {app.score != null && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    Score: {app.score}
                  </Badge>
                )}

                {/* Applied Date */}
                <div className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                  {new Date(app.created_at).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveDown(index)}
                    disabled={index === applications.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => openPromoteDialog(app)}
                  >
                    Promote
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ApproveApplicationDialog
        application={dialogApplication}
        isOpen={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setApplicationToPromote(null);
        }}
        onConfirm={handlePromoteConfirm}
      />
    </>
  );
}
