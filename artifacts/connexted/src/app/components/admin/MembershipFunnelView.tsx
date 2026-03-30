/**
 * MEMBERSHIP FUNNEL VIEW
 * 
 * Visual funnel + data table showing participants at each stage.
 * Admins use arrow buttons to manually advance/reject participants.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  MemberState,
  Participant,
  FunnelSummary,
  MEMBER_STATES,
  EXIT_REASONS,
  ExitReason,
  getFunnelSummary,
  getParticipantsByState,
  getAllowedActions,
  approveApplication,
  enrollMember,
  markCompleted,
  removeMember,
  rejectApplication,
  bulkTransitionState,
  addParticipantTag,
  removeParticipantTag,
} from '@/lib/funnel-system';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card } from '@/app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

interface MembershipFunnelViewProps {
  entityType: 'program' | 'circle';
  entityId: string;
  entityName: string;
}

export function MembershipFunnelView({
  entityType,
  entityId,
  entityName,
}: MembershipFunnelViewProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FunnelSummary[]>([]);
  const [selectedState, setSelectedState] = useState<MemberState>('applied');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  
  // Modal states
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [exitReason, setExitReason] = useState<ExitReason>('removed_by_admin');
  const [exitNotes, setExitNotes] = useState('');

  // Load funnel summary
  useEffect(() => {
    loadFunnelSummary();
  }, [entityType, entityId]);

  // Load participants when state changes
  useEffect(() => {
    if (selectedState) {
      loadParticipants(selectedState);
    }
  }, [selectedState, entityType, entityId]);

  async function loadFunnelSummary() {
    try {
      const data = await getFunnelSummary(entityType, entityId);
      setSummary(data);
    } catch (error) {
      console.error('Error loading funnel summary:', error);
      toast.error('Failed to load funnel data');
    }
  }

  async function loadParticipants(state: MemberState) {
    try {
      setLoading(true);
      const data = await getParticipantsByState(entityType, entityId, state);
      setParticipants(data);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast.error('Failed to load participants');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(participant: Participant) {
    if (!user) return;
    
    try {
      await approveApplication(participant.id, user.id);
      toast.success(`Approved ${participant.user?.first_name || 'participant'}`);
      await loadFunnelSummary();
      await loadParticipants(selectedState);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve application');
    }
  }

  async function handleEnroll(participant: Participant) {
    if (!user) return;
    
    try {
      await enrollMember(participant.id, user.id);
      toast.success(`Enrolled ${participant.user?.first_name || 'participant'}`);
      await loadFunnelSummary();
      await loadParticipants(selectedState);
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll member');
    }
  }

  async function handleMarkCompleted(participant: Participant) {
    if (!user) return;
    
    try {
      await markCompleted(participant.id, user.id);
      toast.success(`Marked ${participant.user?.first_name || 'participant'} as completed`);
      await loadFunnelSummary();
      await loadParticipants(selectedState);
    } catch (error) {
      console.error('Error marking completed:', error);
      toast.error('Failed to mark as completed');
    }
  }

  async function handleReject(participant: Participant) {
    if (!user) return;
    
    try {
      await rejectApplication(participant.id, user.id, 'Application rejected');
      toast.success('Application rejected');
      await loadFunnelSummary();
      await loadParticipants(selectedState);
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject application');
    }
  }

  function openRemoveDialog(participant: Participant) {
    setParticipantToRemove(participant);
    setExitReason('removed_by_admin');
    setExitNotes('');
    setRemoveDialogOpen(true);
  }

  async function confirmRemove() {
    if (!user || !participantToRemove) return;
    
    try {
      await removeMember(participantToRemove.id, user.id, exitReason, exitNotes);
      toast.success(`Removed ${participantToRemove.user?.first_name || 'participant'}`);
      setRemoveDialogOpen(false);
      setParticipantToRemove(null);
      await loadFunnelSummary();
      await loadParticipants(selectedState);
    } catch (error) {
      console.error('Error removing:', error);
      toast.error('Failed to remove member');
    }
  }

  async function handleBulkApprove() {
    if (!user || selectedParticipantIds.length === 0) return;
    
    try {
      await bulkTransitionState(selectedParticipantIds, 'approved', user.id, 'Bulk approved');
      toast.success(`Approved ${selectedParticipantIds.length} applications`);
      setSelectedParticipantIds([]);
      await loadFunnelSummary();
      await loadParticipants(selectedState);
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Failed to approve applications');
    }
  }

  async function handleBulkReject() {
    if (!user || selectedParticipantIds.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to reject ${selectedParticipantIds.length} applications?`
    );
    if (!confirmed) return;
    
    try {
      await bulkTransitionState(
        selectedParticipantIds,
        'not_completed',
        user.id,
        'Bulk rejected',
        'removed_by_admin'
      );
      toast.success(`Rejected ${selectedParticipantIds.length} applications`);
      setSelectedParticipantIds([]);
      await loadFunnelSummary();
      await loadParticipants(selectedState);
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      toast.error('Failed to reject applications');
    }
  }

  function toggleSelectAll() {
    if (selectedParticipantIds.length === participants.length) {
      setSelectedParticipantIds([]);
    } else {
      setSelectedParticipantIds(participants.map((p) => p.id));
    }
  }

  function toggleSelectParticipant(id: string) {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  }

  // Get count for each state
  const getStateCount = (state: MemberState) => {
    const item = summary.find((s) => s.current_state === state);
    return item?.count || 0;
  };

  // Render action buttons for a participant
  function renderActionButtons(participant: Participant) {
    const actions = getAllowedActions(participant.current_state);
    
    return (
      <div className="flex gap-2">
        {actions.up && (
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              if (actions.up?.action === 'approve') handleApprove(participant);
              else if (actions.up?.action === 'enroll') handleEnroll(participant);
              else if (actions.up?.action === 'mark_completed') handleMarkCompleted(participant);
            }}
          >
            {actions.up.label}
          </Button>
        )}
        {actions.down && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (actions.down?.action === 'reject') handleReject(participant);
              else if (actions.down?.action === 'remove') openRemoveDialog(participant);
              else if (actions.down?.action === 'cancel_invite') openRemoveDialog(participant);
            }}
          >
            {actions.down.label}
          </Button>
        )}
      </div>
    );
  }

  // Render state-specific columns
  function renderStateSpecificColumns(participant: Participant) {
    switch (selectedState) {
      case 'applied':
        return (
          <>
            <TableCell>
              {participant.applied_at
                ? new Date(participant.applied_at).toLocaleDateString()
                : 'N/A'}
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {participant.user?.email}
              </div>
            </TableCell>
            <TableCell>
              {participant.payment_data?.method || 'Not specified'}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {participant.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </>
        );
      
      case 'approved':
        return (
          <>
            <TableCell>
              {participant.approved_at
                ? new Date(participant.approved_at).toLocaleDateString()
                : 'N/A'}
            </TableCell>
            <TableCell>
              <Badge variant={participant.payment_status === 'paid' ? 'default' : 'secondary'}>
                {participant.payment_status}
              </Badge>
            </TableCell>
            <TableCell>{participant.payment_amount ? `$${participant.payment_amount}` : '-'}</TableCell>
            <TableCell>
              <div className="text-sm">{participant.user?.email}</div>
            </TableCell>
          </>
        );
      
      case 'enrolled':
        return (
          <>
            <TableCell>
              {participant.enrolled_at
                ? new Date(participant.enrolled_at).toLocaleDateString()
                : 'N/A'}
            </TableCell>
            <TableCell>
              {participant.last_activity_at
                ? `${Math.floor((Date.now() - new Date(participant.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))}d ago`
                : 'Never'}
            </TableCell>
            <TableCell>
              {participant.sessions_attended}/{participant.sessions_expected}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      participant.attendance_rate >= 80
                        ? 'bg-green-500'
                        : participant.attendance_rate >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${participant.attendance_rate}%` }}
                  />
                </div>
                <span className="text-sm">{Math.round(participant.attendance_rate)}%</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={participant.payment_status === 'paid' ? 'default' : 'destructive'}>
                {participant.payment_status}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {participant.consecutive_absences >= 3 && (
                  <Badge variant="destructive" className="text-xs">
                    🚨 {participant.consecutive_absences} absences
                  </Badge>
                )}
                {participant.attendance_rate < 50 && participant.sessions_expected > 3 && (
                  <Badge variant="destructive" className="text-xs">
                    ⚠️ Low attendance
                  </Badge>
                )}
                {participant.payment_status === 'overdue' && (
                  <Badge variant="destructive" className="text-xs">
                    💰 Payment overdue
                  </Badge>
                )}
              </div>
            </TableCell>
          </>
        );
      
      case 'not_completed':
        return (
          <>
            <TableCell>
              {participant.exited_at
                ? new Date(participant.exited_at).toLocaleDateString()
                : 'N/A'}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {participant.exit_reason ? EXIT_REASONS[participant.exit_reason] : 'Unknown'}
              </Badge>
            </TableCell>
            <TableCell className="max-w-xs truncate">{participant.exit_notes || '-'}</TableCell>
            <TableCell>
              {participant.sessions_attended}/{participant.sessions_expected}
            </TableCell>
          </>
        );
      
      default:
        return null;
    }
  }

  // Get column headers for selected state
  function getColumnHeaders(): string[] {
    switch (selectedState) {
      case 'applied':
        return ['Applied', 'Contact', 'Payment Info', 'Tags'];
      case 'approved':
        return ['Approved', 'Payment Status', 'Amount', 'Contact'];
      case 'enrolled':
        return ['Enrolled', 'Last Active', 'Attendance', 'Rate', 'Payment', 'Flags'];
      case 'not_completed':
        return ['Exited', 'Reason', 'Notes', 'Final Attendance'];
      default:
        return [];
    }
  }

  return (
    <div className="space-y-6">
      {/* Funnel Overview */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Membership Funnel: {entityName}</h2>
        
        <div className="grid grid-cols-6 gap-4">
          {/* Entry States */}
          {(['invited', 'applied', 'approved'] as MemberState[]).map((state) => {
            const stateInfo = MEMBER_STATES[state];
            const count = getStateCount(state);
            const Icon = Icons[stateInfo.icon as keyof typeof Icons] as any;
            
            return (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedState === state
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5" />
                  <Badge>{count}</Badge>
                </div>
                <div className="text-sm font-medium">{stateInfo.label}</div>
              </button>
            );
          })}
          
          {/* Active State */}
          {(['enrolled'] as MemberState[]).map((state) => {
            const stateInfo = MEMBER_STATES[state];
            const count = getStateCount(state);
            const Icon = Icons[stateInfo.icon as keyof typeof Icons] as any;
            
            return (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedState === state
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5" />
                  <Badge>{count}</Badge>
                </div>
                <div className="text-sm font-medium">{stateInfo.label}</div>
              </button>
            );
          })}
          
          {/* Exit States */}
          {(['completed', 'not_completed'] as MemberState[]).map((state) => {
            const stateInfo = MEMBER_STATES[state];
            const count = getStateCount(state);
            const Icon = Icons[stateInfo.icon as keyof typeof Icons] as any;
            
            return (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedState === state
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5" />
                  <Badge>{count}</Badge>
                </div>
                <div className="text-sm font-medium">{stateInfo.label}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Participants Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {MEMBER_STATES[selectedState].label} ({participants.length})
          </h3>
          
          {/* Bulk Actions */}
          {selectedParticipantIds.length > 0 && (
            <div className="flex gap-2">
              {selectedState === 'applied' && (
                <>
                  <Button onClick={handleBulkApprove} size="sm" variant="default">
                    ↑ Approve {selectedParticipantIds.length} Selected
                  </Button>
                  <Button onClick={handleBulkReject} size="sm" variant="destructive">
                    ↓ Reject {selectedParticipantIds.length} Selected
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No participants in this state
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedParticipantIds.length === participants.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                {getColumnHeaders().map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedParticipantIds.includes(participant.id)}
                      onCheckedChange={() => toggleSelectParticipant(participant.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {participant.user?.first_name} {participant.user?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{participant.user?.email?.split('@')[0]}
                      </div>
                    </div>
                  </TableCell>
                  {renderStateSpecificColumns(participant)}
                  <TableCell>{renderActionButtons(participant)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove {participantToRemove?.user?.first_name} {participantToRemove?.user?.last_name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="exit-reason">Reason</Label>
              <Select value={exitReason} onValueChange={(v) => setExitReason(v as ExitReason)}>
                <SelectTrigger id="exit-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXIT_REASONS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="exit-notes">Notes (optional)</Label>
              <Textarea
                id="exit-notes"
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
                placeholder="Add any additional context..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
