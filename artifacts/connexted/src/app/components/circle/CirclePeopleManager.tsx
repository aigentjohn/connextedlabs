import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Users, UserPlus, UserCheck, UserX, Search,
  Mail, Clock, Check, X, Shield, Send,
  ChevronDown, ChevronUp, Eye, Loader2, MailPlus
} from 'lucide-react';
import { notifyMemberJoined, notifyRoleChanged } from '@/lib/notificationHelpers';

// =====================================================
// TYPES
// =====================================================

interface Circle {
  id: string;
  name: string;
  description: string;
  member_ids: string[];
  admin_ids: string[];
  access_type: 'open' | 'request' | 'invite';
}

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface MembershipRecord {
  id: string;
  user_id: string;
  container_type: string;
  container_id: string;
  status: 'pending' | 'active' | 'rejected' | 'invited' | 'accepted' | 'expired';
  applied_at?: string;
  application_text?: string;
  application_data?: {
    why_join?: string;
    goals?: string;
    additional_info?: string;
    referral_source?: string;
  };
  invited_by?: string;
  request_message?: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
  inviter?: Profile;
}

interface CirclePeopleManagerProps {
  circle: Circle;
  setCircle: (circle: Circle) => void;
  currentUserId: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function CirclePeopleManager({ circle, setCircle, currentUserId }: CirclePeopleManagerProps) {
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState<Profile[]>([]);
  const [applications, setApplications] = useState<MembershipRecord[]>([]);
  const [invitations, setInvitations] = useState<MembershipRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Counts for tab badges
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const invitedCount = invitations.filter(i => i.status === 'invited').length;

  useEffect(() => {
    loadAllData();
  }, [circle.id, circle.member_ids]);

  async function loadAllData() {
    setLoading(true);
    try {
      await Promise.all([
        loadMembers(),
        loadApplications(),
        loadInvitations(),
      ]);
    } catch (error) {
      console.error('Error loading people data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    if (circle.member_ids.length === 0) {
      setMembers([]);
      return;
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, avatar')
      .in('id', circle.member_ids);

    if (error) {
      console.error('Error loading members:', error);
      return;
    }
    setMembers(data || []);
  }

  async function loadApplications() {
    const { data, error } = await supabase
      .from('container_memberships')
      .select(`
        *,
        user:users!container_memberships_user_id_fkey(id, name, email, avatar)
      `)
      .eq('container_type', 'circle')
      .eq('container_id', circle.id)
      .in('status', ['pending', 'rejected', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading applications:', error);
      return;
    }
    setApplications(data || []);
  }

  async function loadInvitations() {
    const { data, error } = await supabase
      .from('container_memberships')
      .select(`
        *,
        user:users!container_memberships_user_id_fkey(id, name, email, avatar),
        inviter:users!container_memberships_invited_by_fkey(id, name, email)
      `)
      .eq('container_type', 'circle')
      .eq('container_id', circle.id)
      .in('status', ['invited', 'accepted', 'expired'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invitations:', error);
      return;
    }
    setInvitations(data || []);
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Members</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {circle.member_ids.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <span>Applications</span>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Invitations</span>
            {invitedCount > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {invitedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <MembersPanel
            circle={circle}
            setCircle={setCircle}
            members={members}
            setMembers={setMembers}
            currentUserId={currentUserId}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <ApplicationsPanel
            circle={circle}
            setCircle={setCircle}
            applications={applications}
            onRefresh={loadAllData}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          <InvitationsPanel
            circle={circle}
            setCircle={setCircle}
            invitations={invitations}
            currentUserId={currentUserId}
            onRefresh={loadAllData}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// MEMBERS PANEL
// =====================================================

function MembersPanel({
  circle,
  setCircle,
  members,
  setMembers,
  currentUserId,
  loading,
}: {
  circle: Circle;
  setCircle: (c: Circle) => void;
  members: Profile[];
  setMembers: (m: Profile[]) => void;
  currentUserId: string;
  loading: boolean;
}) {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async () => {
    const email = searchEmail.trim().toLowerCase();
    if (!email) return;

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email, avatar')
        .eq('email', email)
        .maybeSingle();

      if (userError || !user) {
        toast.error('User not found with that email');
        return;
      }

      if (circle.member_ids.includes(user.id)) {
        toast.error('User is already a member');
        return;
      }

      const updatedMemberIds = [...circle.member_ids, user.id];
      const { error } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle({ ...circle, member_ids: updatedMemberIds });
      setMembers([...members, user]);
      setSearchEmail('');
      toast.success(`Added ${user.name} to the group`);

      await notifyMemberJoined('circle', circle.id, circle.name, user.id, user.name, circle.admin_ids);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (circle.admin_ids.includes(userId)) {
      toast.error('Cannot remove an admin. Remove admin status first.');
      return;
    }

    try {
      const updatedMemberIds = circle.member_ids.filter((id) => id !== userId);
      const { error } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle({ ...circle, member_ids: updatedMemberIds });
      setMembers(members.filter((m) => m.id !== userId));
      toast.success('Member removed from group');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    const isCurrentlyAdmin = circle.admin_ids.includes(userId);

    if (isCurrentlyAdmin && circle.admin_ids.length === 1) {
      toast.error('Group must have at least one admin');
      return;
    }

    try {
      const updatedAdminIds = isCurrentlyAdmin
        ? circle.admin_ids.filter((id) => id !== userId)
        : [...circle.admin_ids, userId];

      const { error } = await supabase
        .from('circles')
        .update({ admin_ids: updatedAdminIds })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle({ ...circle, admin_ids: updatedAdminIds });
      toast.success(isCurrentlyAdmin ? 'Admin status removed' : 'Admin status granted');

      const newRole = isCurrentlyAdmin ? 'member' : 'admin';
      await notifyRoleChanged(circle.id, userId, newRole, circle.name, 'circle');
    } catch (error) {
      console.error('Error toggling admin:', error);
      toast.error('Failed to update admin status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Member */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Member Directly</CardTitle>
          <CardDescription>Add a platform user to this group by email address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
            />
            <Button onClick={handleAddMember}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
          <CardDescription>Current group members and their roles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No members found</div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const isAdmin = circle.admin_ids.includes(member.id);
                const isCurrentUser = member.id === currentUserId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{member.name}</p>
                          {isAdmin && (
                            <Badge variant="default" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>

                    {!isCurrentUser && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAdmin(member.id)}
                          title={isAdmin ? 'Remove admin' : 'Make admin'}
                        >
                          <Shield className={`w-4 h-4 ${isAdmin ? 'text-indigo-600' : 'text-gray-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// APPLICATIONS PANEL
// =====================================================

function ApplicationsPanel({
  circle,
  setCircle,
  applications,
  onRefresh,
  loading,
}: {
  circle: Circle;
  setCircle: (c: Circle) => void;
  applications: MembershipRecord[];
  onRefresh: () => void;
  loading: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<MembershipRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pending = applications.filter((a) => a.status === 'pending');
  const decided = applications.filter((a) => a.status !== 'pending');

  const handleApprove = async (application: MembershipRecord) => {
    if (!application.user) return;
    setProcessingId(application.id);

    try {
      // 1. Update container_memberships status to 'active'
      const { error: membershipError } = await supabase
        .from('container_memberships')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (membershipError) throw membershipError;

      // 2. Add user to circles.member_ids[]
      if (!circle.member_ids.includes(application.user_id)) {
        const updatedMemberIds = [...circle.member_ids, application.user_id];
        const { error: circleError } = await supabase
          .from('circles')
          .update({ member_ids: updatedMemberIds })
          .eq('id', circle.id);

        if (circleError) throw circleError;
        setCircle({ ...circle, member_ids: updatedMemberIds });
      }

      // 3. Upsert into participants table with state 'enrolled'
      await supabase
        .from('participants')
        .upsert(
          {
            circle_id: circle.id,
            user_id: application.user_id,
            current_state: 'enrolled',
            state_changed_at: new Date().toISOString(),
            state_change_reason: 'Application approved',
            state_change_auto: false,
            state_history: [
              {
                from_state: 'applied',
                to_state: 'enrolled',
                changed_at: new Date().toISOString(),
                reason: 'Application approved by admin',
                auto: false,
              },
            ],
            last_activity_at: new Date().toISOString(),
            total_sessions_expected: 0,
            total_sessions_attended: 0,
            attendance_rate: 0,
            consecutive_absences: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'circle_id,user_id', ignoreDuplicates: false }
        )
        .select();

      // 4. Notify the applicant
      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'membership.approved',
        title: 'Application Approved!',
        message: `Your application to join ${circle.name} has been approved. You're now a member!`,
        link: `/circles/${circle.id}`,
        created_at: new Date().toISOString(),
      });

      toast.success(`Approved ${application.user?.name}'s application`);
      onRefresh();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);

    try {
      const { error } = await supabase
        .from('container_memberships')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rejectTarget.id);

      if (error) throw error;

      // Notify the applicant
      await supabase.from('notifications').insert({
        user_id: rejectTarget.user_id,
        type: 'membership.rejected',
        title: 'Application Update',
        message: `Your application to join ${circle.name} was not accepted at this time.${rejectReason ? ` Reason: ${rejectReason}` : ''}`,
        link: `/circles/${circle.id}/landing`,
        created_at: new Date().toISOString(),
      });

      toast.success('Application rejected');
      setRejectDialogOpen(false);
      setRejectTarget(null);
      setRejectReason('');
      onRefresh();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (application: MembershipRecord) => {
    setRejectTarget(application);
    setRejectDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Applications
            {pending.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {pending.length} awaiting review
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            People who have applied to join this group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No pending applications</p>
              <p className="text-sm mt-1">
                {circle.access_type === 'open'
                  ? 'This is an open group — people join directly.'
                  : 'Applications will appear here when people request to join.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  expanded={expandedId === app.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === app.id ? null : app.id)
                  }
                  onApprove={() => handleApprove(app)}
                  onReject={() => openRejectDialog(app)}
                  processing={processingId === app.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Decisions */}
      {decided.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Decisions</CardTitle>
            <CardDescription>Previously reviewed applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decided.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={app.user?.avatar || undefined} />
                      <AvatarFallback>
                        {app.user?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {app.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {app.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.status} />
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(app.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Reject {rejectTarget?.user?.name}'s application to join{' '}
              {circle.name}. You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Textarea
                placeholder="Reason for rejection (optional — will be shared with the applicant)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectTarget(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingId === rejectTarget?.id}
              >
                {processingId === rejectTarget?.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Reject Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// APPLICATION CARD (expandable)
// =====================================================

function ApplicationCard({
  application,
  expanded,
  onToggleExpand,
  onApprove,
  onReject,
  processing,
}: {
  application: MembershipRecord;
  expanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  processing: boolean;
}) {
  const appData = application.application_data;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={application.user?.avatar || undefined} />
            <AvatarFallback>
              {application.user?.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {application.user?.name || 'Unknown User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {application.user?.email}
            </p>
          </div>
          <div className="hidden sm:block text-xs text-gray-400">
            Applied{' '}
            {formatDistanceToNow(
              new Date(application.applied_at || application.created_at),
              { addSuffix: true }
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleExpand}
            title="View application details"
          >
            <Eye className="w-4 h-4 mr-1" />
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={onApprove}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Approve
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={processing}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      </div>

      {/* Expanded application details */}
      {expanded && (
        <div className="border-t bg-gray-50 p-4 space-y-3">
          {appData?.why_join && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Why they want to join
              </p>
              <p className="text-sm text-gray-700">{appData.why_join}</p>
            </div>
          )}
          {appData?.goals && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Goals
              </p>
              <p className="text-sm text-gray-700">{appData.goals}</p>
            </div>
          )}
          {appData?.additional_info && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Additional Info
              </p>
              <p className="text-sm text-gray-700">{appData.additional_info}</p>
            </div>
          )}
          {appData?.referral_source && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Referral Source
              </p>
              <p className="text-sm text-gray-700">{appData.referral_source}</p>
            </div>
          )}
          {application.request_message && !appData && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Message
              </p>
              <p className="text-sm text-gray-700">{application.request_message}</p>
            </div>
          )}
          {!appData && !application.request_message && !application.application_text && (
            <p className="text-sm text-gray-400 italic">No application details provided.</p>
          )}
          {application.application_text && !appData && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Application
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {application.application_text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// INVITATIONS PANEL
// =====================================================

function InvitationsPanel({
  circle,
  setCircle,
  invitations,
  currentUserId,
  onRefresh,
  loading,
}: {
  circle: Circle;
  setCircle: (c: Circle) => void;
  invitations: MembershipRecord[];
  currentUserId: string;
  onRefresh: () => void;
  loading: boolean;
}) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setSending(true);
    try {
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', email)
        .maybeSingle();

      if (userError || !user) {
        toast.error('No platform user found with that email. They must register first.');
        return;
      }

      // Check if already a member
      if (circle.member_ids.includes(user.id)) {
        toast.error(`${user.name} is already a member of this group`);
        return;
      }

      // Check for existing pending invitation
      const { data: existing } = await supabase
        .from('container_memberships')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('container_type', 'circle')
        .eq('container_id', circle.id)
        .in('status', ['invited', 'pending'])
        .maybeSingle();

      if (existing) {
        toast.error(
          existing.status === 'invited'
            ? `${user.name} already has a pending invitation`
            : `${user.name} already has a pending application`
        );
        return;
      }

      // Create invitation
      const { error: insertError } = await supabase
        .from('container_memberships')
        .insert({
          user_id: user.id,
          container_type: 'circle',
          container_id: circle.id,
          status: 'invited',
          invited_by: currentUserId,
          request_message: inviteMessage || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Send notification to invited user
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'membership.invited',
        title: `You're invited to join ${circle.name}`,
        message: inviteMessage
          ? `You've been invited to join ${circle.name}. Message: "${inviteMessage}"`
          : `You've been invited to join ${circle.name}. Check it out!`,
        link: `/circles/${circle.id}/landing`,
        created_by: currentUserId,
        created_at: new Date().toISOString(),
      });

      toast.success(`Invitation sent to ${user.name}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteMessage('');
      onRefresh();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvitation = async (invitation: MembershipRecord) => {
    try {
      const { error } = await supabase
        .from('container_memberships')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (error) throw error;

      toast.success('Invitation revoked');
      onRefresh();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast.error('Failed to revoke invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const pendingInvites = invitations.filter((i) => i.status === 'invited');
  const resolvedInvites = invitations.filter((i) => i.status !== 'invited');

  return (
    <div className="space-y-6">
      {/* Send Invitation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Send Invitation</CardTitle>
              <CardDescription>
                Invite a platform user to join this group
              </CardDescription>
            </div>
            <Button onClick={() => setInviteDialogOpen(true)}>
              <MailPlus className="w-4 h-4 mr-2" />
              Invite Someone
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            Pending Invitations
            {pendingInvites.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {pendingInvites.length} outstanding
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={inv.user?.avatar || undefined} />
                      <AvatarFallback>
                        {inv.user?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {inv.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Invited{' '}
                        {formatDistanceToNow(new Date(inv.created_at), {
                          addSuffix: true,
                        })}
                        {inv.inviter && (
                          <> by {inv.inviter.name}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status="invited" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(inv)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Revoke invitation"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Invitations */}
      {resolvedInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={inv.user?.avatar || undefined} />
                      <AvatarFallback>
                        {inv.user?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {inv.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {inv.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={inv.status} />
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(inv.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {circle.name}</DialogTitle>
            <DialogDescription>
              Send an invitation to a platform user to join this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendInvite();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Personal Message (optional)
              </label>
              <Textarea
                placeholder="Hey! I'd love for you to join our group..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setInviteDialogOpen(false);
                  setInviteEmail('');
                  setInviteMessage('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSendInvite} disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case 'active':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <X className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    case 'invited':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Mail className="w-3 h-3 mr-1" />
          Invited
        </Badge>
      );
    case 'accepted':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <UserCheck className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
          <Clock className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
