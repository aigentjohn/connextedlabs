// Split candidate: ~515 lines — consider extracting PaymentTable, PaymentFilters, and RefundDialog into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  Search,
  Download,
  ArrowLeft,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Crown,
  Star,
  CreditCard,
  Calendar,
  Filter
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface UserPaymentStatus {
  id: string;
  name: string;
  email: string;
  membership_tier: 'free' | 'member' | 'premium';
  created_at: string;
  subscriptionCount: number;
  paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
  lastPaymentDate: string | null;
  nextBillingDate: string | null;
  totalPaid: number;
}

export default function PaymentManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserPaymentStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserPaymentStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue' | 'cancelled'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'member' | 'premium'>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidUsers: 0,
    unpaidUsers: 0,
    overdueUsers: 0,
    freeUsers: 0,
    memberUsers: 0,
    premiumUsers: 0,
  });

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchPaymentData();
    }
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, statusFilter, tierFilter]);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      // Fetch all users with their profiles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, membership_tier, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // For each user, fetch their subscription count
      const usersWithPaymentStatus = await Promise.all(
        (usersData || []).map(async (user) => {
          // Get subscription count across all container types
          const [circles, tables, elevators, meetings, pitches, builds, standups, meetups] = await Promise.all([
            supabase.from('circles').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
            supabase.from('tables').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
            supabase.from('elevators').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
            supabase.from('meetings').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
            supabase.from('pitches').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
            supabase.from('builds').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
            supabase.from('standups').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
            supabase.from('meetups').select('id', { count: 'exact' }).contains('member_ids', [user.id]),
          ]);

          const subscriptionCount = 
            (circles.count || 0) +
            (tables.count || 0) +
            (elevators.count || 0) +
            (meetings.count || 0) +
            (pitches.count || 0) +
            (builds.count || 0) +
            (standups.count || 0) +
            (meetups.count || 0);

          // Calculate payment status based on tier and mock payment logic
          const tier = user.membership_tier || 'free';
          const createdDate = new Date(user.created_at);
          const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          let paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'cancelled' = 'paid';
          let lastPaymentDate: string | null = null;
          let nextBillingDate: string | null = null;
          let totalPaid = 0;

          if (tier === 'free') {
            paymentStatus = 'paid'; // Free users are always "paid"
          } else {
            // Mock payment logic based on creation date
            const monthsSinceCreated = Math.floor(daysSinceCreated / 30);
            
            if (tier === 'member') {
              totalPaid = monthsSinceCreated * 9.99;
              lastPaymentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
              nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
              
              // Randomly assign some as overdue for demo
              if (user.id.endsWith('a') || user.id.endsWith('b')) {
                paymentStatus = 'overdue';
                nextBillingDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
              } else if (user.id.endsWith('c')) {
                paymentStatus = 'unpaid';
              } else {
                paymentStatus = 'paid';
              }
            } else if (tier === 'premium') {
              totalPaid = monthsSinceCreated * 29.99;
              lastPaymentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
              nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
              paymentStatus = 'paid';
            }
          }

          return {
            ...user,
            subscriptionCount,
            paymentStatus,
            lastPaymentDate,
            nextBillingDate,
            totalPaid,
          };
        })
      );

      setUsers(usersWithPaymentStatus);

      // Calculate stats
      const paidCount = usersWithPaymentStatus.filter(u => u.paymentStatus === 'paid').length;
      const unpaidCount = usersWithPaymentStatus.filter(u => u.paymentStatus === 'unpaid').length;
      const overdueCount = usersWithPaymentStatus.filter(u => u.paymentStatus === 'overdue').length;
      const freeCount = usersWithPaymentStatus.filter(u => u.membership_tier === 'free').length;
      const memberCount = usersWithPaymentStatus.filter(u => u.membership_tier === 'member').length;
      const premiumCount = usersWithPaymentStatus.filter(u => u.membership_tier === 'premium').length;
      const totalRev = usersWithPaymentStatus.reduce((sum, u) => sum + u.totalPaid, 0);

      setStats({
        totalRevenue: totalRev,
        paidUsers: paidCount,
        unpaidUsers: unpaidCount,
        overdueUsers: overdueCount,
        freeUsers: freeCount,
        memberUsers: memberCount,
        premiumUsers: premiumCount,
      });
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.paymentStatus === statusFilter);
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(u => u.membership_tier === tierFilter);
    }

    setFilteredUsers(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Tier', 'Status', 'Subscriptions', 'Total Paid', 'Last Payment', 'Next Billing'];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.membership_tier,
      u.paymentStatus,
      u.subscriptionCount.toString(),
      `$${u.totalPaid.toFixed(2)}`,
      u.lastPaymentDate ? new Date(u.lastPaymentDate).toLocaleDateString() : 'N/A',
      u.nextBillingDate ? new Date(u.nextBillingDate).toLocaleDateString() : 'N/A',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'unpaid':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Unpaid</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'premium':
        return <Badge className="bg-yellow-600"><Crown className="w-3 h-3 mr-1" />Premium</Badge>;
      case 'member':
        return <Badge className="bg-indigo-600"><Star className="w-3 h-3 mr-1" />Member</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Access denied. Platform admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Payments & Invoices', path: '/platform-admin/payments' }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Payment & Invoice Management</h1>
        <p className="text-gray-600">Monitor user payments, billing status, and subscription access</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Paid Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.paidUsers}</div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Active subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.overdueUsers}</div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.unpaidUsers}</div>
              <XCircle className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Require payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Free</span>
                <Badge variant="outline">{stats.freeUsers}</Badge>
              </div>
              <div className="text-2xl font-bold">{((stats.freeUsers / users.length) * 100 || 0).toFixed(1)}%</div>
            </div>
            <div className="p-4 border rounded-lg bg-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4 text-indigo-600" />
                  Member
                </span>
                <Badge className="bg-indigo-600">{stats.memberUsers}</Badge>
              </div>
              <div className="text-2xl font-bold">{((stats.memberUsers / users.length) * 100 || 0).toFixed(1)}%</div>
            </div>
            <div className="p-4 border rounded-lg bg-yellow-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  Premium
                </span>
                <Badge className="bg-yellow-600">{stats.premiumUsers}</Badge>
              </div>
              <div className="text-2xl font-bold">{((stats.premiumUsers / users.length) * 100 || 0).toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>User Payments & Access Validation</CardTitle>
              <CardDescription>
                Verify payment status to determine subscription access eligibility
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              >
                <option value="all">All Tiers</option>
                <option value="free">Free</option>
                <option value="member">Member</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          {/* User List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                    user.paymentStatus === 'overdue' ? 'border-red-300 bg-red-50' : 
                    user.paymentStatus === 'unpaid' ? 'border-yellow-300 bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        {getTierBadge(user.membership_tier)}
                        {getStatusBadge(user.paymentStatus)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Subscriptions:</span>
                          <span className="ml-1 font-medium">{user.subscriptionCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Paid:</span>
                          <span className="ml-1 font-medium">${user.totalPaid.toFixed(2)}</span>
                        </div>
                        {user.lastPaymentDate && (
                          <div>
                            <span className="text-gray-500">Last Payment:</span>
                            <span className="ml-1 font-medium">
                              {new Date(user.lastPaymentDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {user.nextBillingDate && (
                          <div>
                            <span className="text-gray-500">Next Billing:</span>
                            <span className="ml-1 font-medium">
                              {new Date(user.nextBillingDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/users/${user.id}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                      {user.paymentStatus === 'overdue' && (
                        <Button variant="destructive" size="sm">
                          Send Reminder
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}