// Split candidate: ~472 lines — consider extracting AuditSummaryCards, DataConsistencyTable, and AuditFixButton into sub-components.
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { 
  Users, 
  Circle, 
  FileText, 
  Building2, 
  Sparkles, 
  UserPlus,
  Database,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface AuditStats {
  users: {
    total: number;
    byRole: { role: string; count: number }[];
    withContent: number;
    empty: number;
    testAccounts: number;
  };
  circles: {
    total: number;
    withMembers: number;
    empty: number;
  };
  content: {
    posts: number;
    moments: number;
    companies: number;
    playlists: number;
    orphanedPosts: number;
  };
  memberships: {
    total: number;
    byTier: { tier: string; count: number }[];
  };
  demoAccounts: number;
  claimableProfiles: number;
}

export default function DataAuditDashboard() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testAccountsList, setTestAccountsList] = useState<any[]>([]);
  const [emptyUsersList, setEmptyUsersList] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [
        usersResult,
        circlesResult,
        postsResult,
        momentsResult,
        companiesResult,
        membershipsResult,
        demoAccountsResult,
        claimableProfilesResult,
        playlistsResult
      ] = await Promise.all([
        supabase.from('users').select('id, email, name, role'),
        supabase.from('circles').select('id, name'),
        supabase.from('posts').select('id, author_id'),
        supabase.from('moments').select('id, user_id'),
        supabase.from('companies').select('id, user_id'),
        supabase.from('circle_memberships').select('id, user_id, tier'),
        supabase.from('demo_accounts').select('id'),
        supabase.from('claimable_profiles').select('id'),
        supabase.from('playlists').select('id')
      ]);

      const users = usersResult.data || [];
      const circles = circlesResult.data || [];
      const posts = postsResult.data || [];
      const moments = momentsResult.data || [];
      const companies = companiesResult.data || [];
      const memberships = membershipsResult.data || [];
      const playlists = playlistsResult.data || [];

      // Analyze users
      const roleCount: { [key: string]: number } = {};
      users.forEach(u => {
        roleCount[u.role || 'member'] = (roleCount[u.role || 'member'] || 0) + 1;
      });

      // Find test accounts (common test patterns)
      const testPatterns = ['test', 'temp', 'demo', 'fake', 'example', 'seed'];
      const testAccounts = users.filter(u => 
        testPatterns.some(pattern => 
          u.email?.toLowerCase().includes(pattern) || 
          u.name?.toLowerCase().includes(pattern)
        )
      );

      // Find users with content
      const userIdsWithContent = new Set([
        ...posts.map(p => p.author_id),
        ...moments.map(m => m.user_id),
        ...companies.map(c => c.user_id)
      ]);

      const usersWithContent = users.filter(u => userIdsWithContent.has(u.id));
      const emptyUsers = users.filter(u => !userIdsWithContent.has(u.id) && u.role !== 'platform_admin');

      // Analyze circles
      const circleMemberCounts = new Map<string, number>();
      memberships.forEach(m => {
        // We'd need circle_id in memberships to do this properly
        // For now, just count total memberships
      });

      // Count memberships by tier
      const tierCount: { [key: string]: number } = {};
      memberships.forEach(m => {
        tierCount[m.tier || 'free'] = (tierCount[m.tier || 'free'] || 0) + 1;
      });

      // Find orphaned posts (posts without valid author)
      const userIds = new Set(users.map(u => u.id));
      const orphanedPosts = posts.filter(p => !userIds.has(p.author_id));

      // Compile stats
      const auditStats: AuditStats = {
        users: {
          total: users.length,
          byRole: Object.entries(roleCount).map(([role, count]) => ({ role, count })),
          withContent: usersWithContent.length,
          empty: emptyUsers.length,
          testAccounts: testAccounts.length,
        },
        circles: {
          total: circles.length,
          withMembers: 0, // Would need to join with memberships
          empty: 0,
        },
        content: {
          posts: posts.length,
          moments: moments.length,
          companies: companies.length,
          playlists: playlists.length,
          orphanedPosts: orphanedPosts.length,
        },
        memberships: {
          total: memberships.length,
          byTier: Object.entries(tierCount).map(([tier, count]) => ({ tier, count })),
        },
        demoAccounts: demoAccountsResult.data?.length || 0,
        claimableProfiles: claimableProfilesResult.data?.length || 0,
      };

      setStats(auditStats);
      setTestAccountsList(testAccounts);
      setEmptyUsersList(emptyUsers);
    } catch (error: any) {
      console.error('Error fetching audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading audit data...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-red-500">Failed to load audit data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Database Audit' }
        ]}
      />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Database Audit</h2>
          <p className="text-sm text-gray-600 mt-1">
            Current state of your database before cleanup
          </p>
        </div>
        <Button onClick={fetchAuditData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold">{stats.users.total}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">With content:</span>
                <span className="font-semibold">{stats.users.withContent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Empty:</span>
                <span className="font-semibold text-orange-600">{stats.users.empty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Test accounts:</span>
                <span className="font-semibold text-red-600">{stats.users.testAccounts}</span>
              </div>
            </div>
            {stats.users.testAccounts > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2 text-xs"
                onClick={() => setShowDetails(showDetails === 'test' ? null : 'test')}
              >
                {showDetails === 'test' ? 'Hide' : 'Show'} Test Accounts
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Circles Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Circles</p>
                <p className="text-3xl font-bold">{stats.circles.total}</p>
              </div>
              <Circle className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Memberships:</span>
                <span className="font-semibold">{stats.memberships.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Content Items</p>
                <p className="text-3xl font-bold">
                  {stats.content.posts + stats.content.moments + stats.content.playlists}
                </p>
              </div>
              <FileText className="w-10 h-10 text-green-500 opacity-50" />
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Posts:</span>
                <span className="font-semibold">{stats.content.posts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Moments:</span>
                <span className="font-semibold">{stats.content.moments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Companies:</span>
                <span className="font-semibold">{stats.content.companies}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Playlists:</span>
                <span className="font-semibold">{stats.content.playlists}</span>
              </div>
              {stats.content.orphanedPosts > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Orphaned:</span>
                  <span className="font-semibold">{stats.content.orphanedPosts}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Data Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Config</p>
                <p className="text-3xl font-bold">
                  {stats.demoAccounts + stats.claimableProfiles}
                </p>
              </div>
              <Database className="w-10 h-10 text-cyan-500 opacity-50" />
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Demo accounts:</span>
                <span className="font-semibold">{stats.demoAccounts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Claimable profiles:</span>
                <span className="font-semibold">{stats.claimableProfiles}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.users.byRole.map(({ role, count }) => (
              <div key={role} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 capitalize">{role}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Membership Tiers */}
      {stats.memberships.byTier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Memberships by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.memberships.byTier.map(({ tier, count }) => (
                <div key={tier} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 capitalize">{tier}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Accounts List */}
      {showDetails === 'test' && testAccountsList.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Test Accounts Detected</CardTitle>
            <CardDescription>
              These accounts match common test patterns and can likely be deleted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testAccountsList.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">{user.name || 'No name'}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-red-200 text-red-700 rounded">
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty Users List */}
      {showDetails === 'empty' && emptyUsersList.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700">Empty User Accounts</CardTitle>
            <CardDescription>
              These users have no content and might be candidates for deletion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {emptyUsersList.slice(0, 20).map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium">{user.name || 'No name'}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-orange-200 text-orange-700 rounded">
                    {user.role}
                  </span>
                </div>
              ))}
              {emptyUsersList.length > 20 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  ... and {emptyUsersList.length - 20} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {stats.users.empty > 0 && (
          <Button 
            variant="outline"
            onClick={() => setShowDetails(showDetails === 'empty' ? null : 'empty')}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            {showDetails === 'empty' ? 'Hide' : 'Show'} {stats.users.empty} Empty Users
          </Button>
        )}
      </div>

      {/* Warnings */}
      {(stats.content.orphanedPosts > 0 || stats.users.testAccounts > 10) && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-900">Cleanup Recommended</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {stats.content.orphanedPosts > 0 && (
                    <li>• {stats.content.orphanedPosts} orphaned posts should be removed</li>
                  )}
                  {stats.users.testAccounts > 10 && (
                    <li>• {stats.users.testAccounts} test accounts detected</li>
                  )}
                  {stats.users.empty > 20 && (
                    <li>• {stats.users.empty} empty user accounts taking up space</li>
                  )}
                </ul>
                <p className="text-sm text-yellow-700 pt-2">
                  Use the Cleanup Manager to safely remove this data before creating production demos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}