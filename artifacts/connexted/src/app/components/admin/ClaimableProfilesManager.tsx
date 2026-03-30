// Split candidate: ~568 lines — consider extracting ProfilesTable, InviteDialog, and ClaimStatusBadge into sub-components.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import ClaimableProfileEmailTemplate from '@/app/components/admin/ClaimableProfileEmailTemplate';
import { 
  Upload, 
  Search, 
  Filter, 
  MoreVertical,
  Mail,
  Ban,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  XCircle,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  ArrowLeft,
  Download
} from 'lucide-react';

interface ClaimableProfile {
  id: string;
  email: string;
  full_name: string;
  default_tier: string;
  default_circles: string[];
  metadata: any;
  claim_status: 'unclaimed' | 'claimed' | 'rejected' | 'withdrawn';
  first_viewed_at: string | null;
  claimed_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  invitation_sent_at: string | null;
  invitation_sent_count: number;
  batch_id: string | null;
  invitation_expires_at: string | null;
  created_at: string;
}

interface ConversionStats {
  total: number;
  unclaimed: number;
  viewed: number;
  claimed: number;
  rejected: number;
  withdrawn: number;
  conversionRate: number;
  viewRate: number;
}

export default function ClaimableProfilesManager() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ClaimableProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ClaimableProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [selectedProfileForEmail, setSelectedProfileForEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<ConversionStats>({
    total: 0,
    unclaimed: 0,
    viewed: 0,
    claimed: 0,
    rejected: 0,
    withdrawn: 0,
    conversionRate: 0,
    viewRate: 0,
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
    calculateStats();
  }, [profiles, searchTerm, statusFilter, batchFilter]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('claimable_profiles')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProfiles(data || []);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      toast.error('Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = [...profiles];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.batch_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'viewed') {
        filtered = filtered.filter(p => p.first_viewed_at && p.claim_status === 'unclaimed');
      } else {
        filtered = filtered.filter(p => p.claim_status === statusFilter);
      }
    }

    // Batch filter
    if (batchFilter !== 'all') {
      filtered = filtered.filter(p => p.batch_id === batchFilter);
    }

    setFilteredProfiles(filtered);
  };

  const calculateStats = () => {
    const total = profiles.length;
    const unclaimed = profiles.filter(p => p.claim_status === 'unclaimed').length;
    const viewed = profiles.filter(p => p.first_viewed_at && p.claim_status === 'unclaimed').length;
    const claimed = profiles.filter(p => p.claim_status === 'claimed').length;
    const rejected = profiles.filter(p => p.claim_status === 'rejected').length;
    const withdrawn = profiles.filter(p => p.claim_status === 'withdrawn').length;

    const conversionRate = total > 0 ? (claimed / total) * 100 : 0;
    const viewRate = total > 0 ? ((viewed + claimed) / total) * 100 : 0;

    setStats({
      total,
      unclaimed,
      viewed,
      claimed,
      rejected,
      withdrawn,
      conversionRate,
      viewRate,
    });
  };

  const handleResendInvitation = async (profile: ClaimableProfile) => {
    setSelectedProfileForEmail(profile.id);
  };

  const handleWithdraw = async (profileId: string) => {
    if (!confirm('Withdraw this invitation? The user will no longer be able to claim this profile.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('claimable_profiles')
        .update({
          claim_status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (error) throw error;

      toast.success('Invitation withdrawn');
      fetchProfiles();
    } catch (err: any) {
      console.error('Error withdrawing invitation:', err);
      toast.error('Failed to withdraw invitation');
    }
  };

  const handleSoftDelete = async (profileId: string) => {
    if (!confirm('Soft delete this profile? It will be hidden but can be restored later.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('claimable_profiles')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          deletion_type: 'admin_soft',
        })
        .eq('id', profileId);

      if (error) throw error;

      toast.success('Profile soft deleted');
      fetchProfiles();
    } catch (err: any) {
      console.error('Error soft deleting profile:', err);
      toast.error('Failed to delete profile');
    }
  };

  const handleHardDelete = async (profileId: string) => {
    if (!confirm('⚠️ PERMANENTLY DELETE this profile? This action cannot be undone!')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('claimable_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      toast.success('Profile permanently deleted');
      fetchProfiles();
    } catch (err: any) {
      console.error('Error hard deleting profile:', err);
      toast.error('Failed to delete profile');
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Status', 'Tier', 'Batch', 'Created', 'Viewed', 'Claimed'];
    const rows = filteredProfiles.map(p => [
      p.email,
      p.full_name,
      p.claim_status,
      p.default_tier,
      p.batch_id || '',
      new Date(p.created_at).toLocaleDateString(),
      p.first_viewed_at ? new Date(p.first_viewed_at).toLocaleDateString() : '',
      p.claimed_at ? new Date(p.claimed_at).toLocaleDateString() : '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claimable_profiles_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Export complete');
  };

  const getStatusBadge = (profile: ClaimableProfile) => {
    if (profile.claim_status === 'claimed') {
      return <Badge className="bg-green-100 text-green-700">✓ Claimed</Badge>;
    }
    if (profile.claim_status === 'rejected') {
      return <Badge className="bg-red-100 text-red-700">✗ Rejected</Badge>;
    }
    if (profile.claim_status === 'withdrawn') {
      return <Badge className="bg-gray-100 text-gray-700">⊗ Withdrawn</Badge>;
    }
    if (profile.first_viewed_at) {
      return <Badge className="bg-blue-100 text-blue-700">👁 Viewing</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700">📧 Pending</Badge>;
  };

  const uniqueBatches = Array.from(new Set(profiles.map(p => p.batch_id).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Claimable Profiles' }
        ]}
      />
      
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/platform-admin')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Claimable Profiles</h1>
            <p className="text-gray-600 mt-1">Manage batch member onboarding and track conversions</p>
          </div>
          <Button onClick={() => navigate('/platform-admin/claimable-profiles/import')}>
            <Upload className="w-4 h-4 mr-2" />
            Import Profiles
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profiles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Claimed</p>
                <p className="text-2xl font-bold text-green-600">{stats.claimed}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.conversionRate.toFixed(1)}% conversion
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viewing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.viewed}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.viewRate.toFixed(1)}% opened
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.unclaimed - stats.viewed}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Not yet opened
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by email, name, or batch ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unclaimed">Unclaimed</SelectItem>
                <SelectItem value="viewed">Viewing</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>

            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {uniqueBatches.map(batch => (
                  <SelectItem key={batch} value={batch!}>{batch}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Profiles ({filteredProfiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No profiles found. Import some profiles to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Tier</th>
                    <th className="px-4 py-3 text-left font-semibold">Batch</th>
                    <th className="px-4 py-3 text-left font-semibold">Created</th>
                    <th className="px-4 py-3 text-left font-semibold">Activity</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {getStatusBadge(profile)}
                      </td>
                      <td className="px-4 py-3">{profile.email}</td>
                      <td className="px-4 py-3">{profile.full_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">
                          {profile.default_tier}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {profile.batch_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {profile.claimed_at && (
                          <div className="text-green-600">
                            Claimed {new Date(profile.claimed_at).toLocaleDateString()}
                          </div>
                        )}
                        {!profile.claimed_at && profile.first_viewed_at && (
                          <div className="text-blue-600">
                            Viewed {new Date(profile.first_viewed_at).toLocaleDateString()}
                          </div>
                        )}
                        {!profile.first_viewed_at && profile.invitation_sent_at && (
                          <div className="text-gray-600">
                            Sent {new Date(profile.invitation_sent_at).toLocaleDateString()}
                          </div>
                        )}
                        {!profile.invitation_sent_at && (
                          <div className="text-gray-400">Not sent</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleResendInvitation(profile)}>
                              <Mail className="w-4 h-4 mr-2" />
                              Send/Resend Email
                            </DropdownMenuItem>
                            {profile.claim_status === 'unclaimed' && (
                              <DropdownMenuItem onClick={() => handleWithdraw(profile.id)}>
                                <Ban className="w-4 h-4 mr-2" />
                                Withdraw Invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleSoftDelete(profile.id)}
                              className="text-orange-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Soft Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleHardDelete(profile.id)}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Hard Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Template Dialog */}
      <Dialog open={!!selectedProfileForEmail} onOpenChange={(open) => !open && setSelectedProfileForEmail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Invitation Email</DialogTitle>
          </DialogHeader>
          <ClaimableProfileEmailTemplate 
            profileId={selectedProfileForEmail || undefined}
            onClose={() => setSelectedProfileForEmail(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}