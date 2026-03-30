import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Users, UserCheck, UserX, Clock, GraduationCap, Archive, Ban, Search, MoreVertical, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Membership {
  id: string;
  user_id: string;
  status: 'invited' | 'pending' | 'active' | 'paused' | 'alumni' | 'archived' | 'blocked';
  invited_by?: string;
  invited_at?: string;
  requested_at?: string;
  approved_at?: string;
  joined_at?: string;
  cohort?: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
    avatar?: string;
  };
}

interface Props {
  containerType: string;
  containerId: string;
  containerName: string;
}

const STATUS_CONFIG = {
  invited: { icon: Mail, label: 'Invited', color: 'bg-blue-100 text-blue-800' },
  pending: { icon: Clock, label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  active: { icon: UserCheck, label: 'Active', color: 'bg-green-100 text-green-800' },
  paused: { icon: Clock, label: 'Paused', color: 'bg-gray-100 text-gray-800' },
  alumni: { icon: GraduationCap, label: 'Alumni', color: 'bg-purple-100 text-purple-800' },
  archived: { icon: Archive, label: 'Archived', color: 'bg-gray-100 text-gray-600' },
  blocked: { icon: Ban, label: 'Blocked', color: 'bg-red-100 text-red-800' },
};

export function MembershipStatusManager({ containerType, containerId, containerName }: Props) {
  
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'pause' | 'alumni' | 'block' | 'remove' | null;
    reason: string;
  }>({ open: false, action: null, reason: '' });

  useEffect(() => {
    loadMemberships();
  }, [containerType, containerId]);

  const loadMemberships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('container_memberships')
        .select(`
          *,
          users:user_id (
            id,
            full_name,
            email,
            avatar
          )
        `)
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMemberships(data || []);
    } catch (err: any) {
      console.error('Error loading memberships:', err);
      toast.error('Failed to load memberships');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (membershipId: string, newStatus: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add status-specific fields
      if (newStatus === 'active') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
        updateData.joined_at = updateData.joined_at || new Date().toISOString();
      } else if (newStatus === 'paused') {
        // paused_at removed - status field is sufficient
        updateData.pause_reason = reason || null;
      } else if (newStatus === 'alumni') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'blocked') {
        updateData.blocked_at = new Date().toISOString();
        updateData.blocked_reason = reason || null;
      } else if (newStatus === 'archived') {
        updateData.archived_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('container_memberships')
        .update(updateData)
        .eq('id', membershipId);

      if (error) throw error;

      // Send notification to user
      const membership = memberships.find(m => m.id === membershipId);
      if (membership) {
        await supabase.from('notifications').insert({
          user_id: membership.user_id,
          type: 'membership.status_changed',
          title: `Your membership status changed`,
          message: `Your status in ${containerName} is now: ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`,
          link: `/${containerType}s/${containerId}`,
          created_by: user.id,
        });
      }

      toast.success('Membership status updated');
      await loadMemberships();
      setActionDialog({ open: false, action: null, reason: '' });
      setSelectedMembership(null);
    } catch (err: any) {
      console.error('Error updating membership:', err);
      toast.error('Failed to update membership status');
    }
  };

  const handleApprove = (membership: Membership) => {
    setSelectedMembership(membership);
    handleStatusChange(membership.id, 'active');
  };

  const handleReject = (membership: Membership) => {
    setSelectedMembership(membership);
    setActionDialog({ open: true, action: 'reject', reason: '' });
  };

  const handleRemove = (membership: Membership) => {
    setSelectedMembership(membership);
    setActionDialog({ open: true, action: 'remove', reason: '' });
  };

  const executeAction = async () => {
    if (!selectedMembership) return;

    if (actionDialog.action === 'remove') {
      try {
        const { error } = await supabase
          .from('container_memberships')
          .delete()
          .eq('id', selectedMembership.id);

        if (error) throw error;

        toast.success('Member removed');
        await loadMemberships();
        setActionDialog({ open: false, action: null, reason: '' });
        setSelectedMembership(null);
      } catch (err: any) {
        console.error('Error removing member:', err);
        toast.error('Failed to remove member');
      }
    } else if (actionDialog.action === 'reject') {
      await handleStatusChange(selectedMembership.id, 'archived', actionDialog.reason);
    } else if (actionDialog.action) {
      await handleStatusChange(selectedMembership.id, actionDialog.action, actionDialog.reason);
    }
  };

  const filteredMemberships = memberships.filter(m => {
    const matchesSearch = m.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.users?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = memberships.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-500">Loading memberships...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Membership Management
          </CardTitle>
          <CardDescription>
            Manage member status and access for {containerName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = statusCounts[status] || 0;
              const Icon = config.icon;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    statusFilter === status
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">{config.label}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Members List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMemberships.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No members found
              </div>
            ) : (
              filteredMemberships.map((membership) => {
                const statusConfig = STATUS_CONFIG[membership.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={membership.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {membership.users?.full_name?.[0] || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {membership.users?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {membership.users?.email}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>

                    {/* Cohort */}
                    {membership.cohort && (
                      <Badge variant="outline" className="text-xs">
                        {membership.cohort}
                      </Badge>
                    )}

                    {/* Quick Actions */}
                    {membership.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(membership)}
                          className="h-8"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(membership)}
                          className="h-8"
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {membership.status === 'invited' && (
                      <Badge variant="outline" className="text-xs">
                        Awaiting response
                      </Badge>
                    )}

                    {membership.status === 'active' && (
                      <Select
                        onValueChange={(value) => {
                          setSelectedMembership(membership);
                          setActionDialog({ open: true, action: value as any, reason: '' });
                        }}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pause">Pause</SelectItem>
                          <SelectItem value="alumni">Mark Alumni</SelectItem>
                          <SelectItem value="block">Block</SelectItem>
                          <SelectItem value="remove">Remove</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {actionDialog.action === 'remove' ? 'Remove Member' : 'Status Change'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'remove'
                ? 'This will permanently remove the member from this container.'
                : `Change status to: ${actionDialog.action ? STATUS_CONFIG[actionDialog.action as keyof typeof STATUS_CONFIG]?.label : ''}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedMembership && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedMembership.users?.full_name}</div>
                <div className="text-sm text-gray-600">{selectedMembership.users?.email}</div>
              </div>
            )}

            {(actionDialog.action === 'reject' || actionDialog.action === 'block' || actionDialog.action === 'pause') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason {actionDialog.action === 'reject' ? '(optional)' : '(required)'}
                </label>
                <Textarea
                  value={actionDialog.reason}
                  onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                  placeholder="Enter reason..."
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={executeAction}
                variant={actionDialog.action === 'remove' || actionDialog.action === 'block' ? 'destructive' : 'default'}
                className="flex-1"
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ open: false, action: null, reason: '' })}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}