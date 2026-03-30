// Split candidate: ~561 lines — consider extracting InvitationTable, BulkInviteForm, and InvitationStatusBadge into sub-components.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Mail,
  Send,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Calendar,
  Users,
  Filter,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  user_id: string;
  container_type: string;
  container_id: string;
  status: 'invited' | 'accepted' | 'rejected' | 'expired';
  invited_by: string;
  invite_message?: string;
  cohort?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  inviter?: {
    id: string;
    full_name: string;
    email: string;
  };
  circle?: {
    id: string;
    name: string;
  };
  program?: {
    id: string;
    name: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  expired: number;
}

export default function InvitationManagement() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvitations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invitations, statusFilter, typeFilter, searchQuery]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);

      // Fetch all invitations with user and inviter data
      const { data: invitationsData, error } = await supabase
        .from('container_memberships')
        .select(`
          *,
          user:users!container_memberships_user_id_fkey(id, full_name, email, avatar_url),
          inviter:users!container_memberships_invited_by_fkey(id, full_name, email)
        `)
        .in('status', ['invited', 'accepted', 'rejected', 'expired'])
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Enrich with container data
      const enrichedInvitations = await Promise.all(
        (invitationsData || []).map(async (inv) => {
          let containerData: any = {};

          if (inv.container_type === 'circle') {
            const { data: circle } = await supabase
              .from('circles')
              .select('id, name')
              .eq('id', inv.container_id)
              .single();
            containerData.circle = circle;
          } else if (inv.container_type === 'program') {
            const { data: program } = await supabase
              .from('market_programs')
              .select('id, name')
              .eq('id', inv.container_id)
              .single();
            containerData.program = program;
          }

          return {
            ...inv,
            ...containerData,
          };
        })
      );

      setInvitations(enrichedInvitations);
      calculateStats(enrichedInvitations);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Invitation[]) => {
    const stats: Stats = {
      total: data.length,
      pending: data.filter((i) => i.status === 'invited').length,
      accepted: data.filter((i) => i.status === 'accepted').length,
      rejected: data.filter((i) => i.status === 'rejected').length,
      expired: data.filter((i) => i.status === 'expired').length,
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...invitations];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.container_type === typeFilter);
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.user?.full_name?.toLowerCase().includes(query) ||
          inv.user?.email?.toLowerCase().includes(query) ||
          inv.circle?.name?.toLowerCase().includes(query) ||
          inv.program?.name?.toLowerCase().includes(query) ||
          inv.inviter?.full_name?.toLowerCase().includes(query)
      );
    }

    setFilteredInvitations(filtered);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('container_memberships')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      // Extend expiration date
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 14);

      const { error } = await supabase
        .from('container_memberships')
        .update({
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (error) throw error;

      // Create notification
      const { error: notifError } = await supabase.from('notifications').insert([
        {
          user_id: invitation.user_id,
          type: 'invitation_reminder',
          title: `Reminder: Invitation to ${
            invitation.circle?.name || invitation.program?.name || 'join'
          }`,
          message: invitation.invite_message || `You've been invited!`,
          action_url: `/home`,
          created_at: new Date().toISOString(),
        },
      ]);

      toast.success('Invitation reminder sent');
      fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'invited':
        return (
          <Badge className="bg-blue-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="text-gray-500">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Invitation Management' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="w-8 h-8 text-blue-600" />
            Invitation Management
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage all platform invitations across circles and programs
          </p>
        </div>
        <Button onClick={fetchInvitations}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Pending</p>
                <p className="text-2xl font-bold text-blue-900">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Accepted</p>
                <p className="text-2xl font-bold text-green-900">{stats.accepted}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
              </div>
              <UserX className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
              </div>
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or container..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="invited">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Container Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="circle">Circles</SelectItem>
                  <SelectItem value="program">Programs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Invitations ({filteredInvitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No invitations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invited User</TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{invitation.user?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{invitation.user?.email}</p>
                        {invitation.cohort && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Cohort: {invitation.cohort}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {invitation.circle?.name || invitation.program?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {invitation.container_type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{invitation.inviter?.full_name || 'System'}</p>
                        <p className="text-xs text-gray-500">{invitation.inviter?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                        {isExpired(invitation.expires_at) && invitation.status === 'invited' && (
                          <Badge variant="outline" className="ml-2 text-xs text-red-600">
                            Expired
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invitation.status === 'invited' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvitation(invitation)}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Resend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelInvitation(invitation.id)}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                        {invitation.status === 'accepted' && invitation.accepted_at && (
                          <span className="text-xs text-gray-500">
                            Accepted {new Date(invitation.accepted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
