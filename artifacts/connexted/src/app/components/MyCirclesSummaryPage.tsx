import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  Users, 
  Shield, 
  Activity, 
  Calendar,
  MessageSquare,
  MessageCircle,
  FileText,
  Star,
  CheckSquare,
  Globe,
  Lock,
  UserPlus,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface Circle {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  admin_ids: string[];
  member_ids: string[];
  moderator_ids: string[];
  host_ids: string[];
  is_open_circle: boolean;
  created_at: string;
  enabled_features?: {
    feed: boolean;
    forums: boolean;
    documents: boolean;
    reviews: boolean;
    events: boolean;
    checklists: boolean;
  };
}

interface CircleWithRole extends Circle {
  userRole: 'admin' | 'moderator' | 'host' | 'member';
  lastActivityAt?: string;
}

interface CircleStats {
  total: number;
  adminCircles: number;
  activeCircles: number;
  openCircles: number;
}

export default function MyCirclesSummaryPage() {
  const { profile } = useAuth();
  const [circles, setCircles] = useState<CircleWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'active' | 'open'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'members' | 'activity'>('recent');
  const [stats, setStats] = useState<CircleStats>({
    total: 0,
    adminCircles: 0,
    activeCircles: 0,
    openCircles: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchCircles();
    }
  }, [profile]);

  const fetchCircles = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch all circles user is a member of
      const { data: circlesData, error } = await supabase
        .from('circles')
        .select('*')
        .contains('member_ids', [profile.id])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add user role to each circle
      const circlesWithRoles: CircleWithRole[] = (circlesData || []).map(circle => ({
        ...circle,
        userRole: circle.admin_ids?.includes(profile.id)
          ? 'admin'
          : circle.moderator_ids?.includes(profile.id)
          ? 'moderator'
          : circle.host_ids?.includes(profile.id)
          ? 'host'
          : 'member',
      }));

      setCircles(circlesWithRoles);

      // Calculate stats
      const newStats: CircleStats = {
        total: circlesWithRoles.length,
        adminCircles: circlesWithRoles.filter(c => c.userRole === 'admin').length,
        activeCircles: circlesWithRoles.filter(c => !c.is_open_circle).length,
        openCircles: circlesWithRoles.filter(c => c.is_open_circle).length,
      };
      setStats(newStats);

    } catch (error: any) {
      console.error('Error fetching circles:', error);
      toast.error('Failed to load your circles');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCircles = () => {
    let filtered = circles;

    // Apply filter
    switch (filter) {
      case 'admin':
        filtered = filtered.filter(c => c.userRole === 'admin');
        break;
      case 'active':
        filtered = filtered.filter(c => !c.is_open_circle);
        break;
      case 'open':
        filtered = filtered.filter(c => c.is_open_circle);
        break;
    }

    // Apply sort
    switch (sortBy) {
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'members':
        filtered = [...filtered].sort((a, b) => (b.member_ids?.length || 0) - (a.member_ids?.length || 0));
        break;
      case 'recent':
        filtered = [...filtered].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return filtered;
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { variant: 'default' as const, label: 'Admin', className: 'bg-red-600' },
      moderator: { variant: 'default' as const, label: 'Moderator', className: 'bg-blue-600' },
      host: { variant: 'default' as const, label: 'Host', className: 'bg-purple-600' },
      member: { variant: 'secondary' as const, label: 'Member', className: '' },
    };
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getAccessTypeBadge = (accessType: string) => {
    const typeConfig = {
      open: { icon: Globe, label: 'Open', className: 'bg-green-100 text-green-800' },
      request: { icon: UserPlus, label: 'Request to Join', className: 'bg-blue-100 text-blue-800' },
      invite: { icon: Lock, label: 'Invite Only', className: 'bg-gray-100 text-gray-800' },
    };
    const config = typeConfig[accessType as keyof typeof typeConfig] || typeConfig.open;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getEnabledFeatures = (circle: Circle) => {
    // Note: This assumes circles have enabled_features field
    // If not available, we'd need to query container_configurations
    const features = [];
    if (circle.enabled_features?.feed) features.push({ icon: MessageSquare, label: 'Feed' });
    if (circle.enabled_features?.forums) features.push({ icon: MessageCircle, label: 'Forums' });
    if (circle.enabled_features?.documents) features.push({ icon: FileText, label: 'Docs' });
    if (circle.enabled_features?.reviews) features.push({ icon: Star, label: 'Reviews' });
    if (circle.enabled_features?.events) features.push({ icon: Calendar, label: 'Events' });
    if (circle.enabled_features?.checklists) features.push({ icon: CheckSquare, label: 'Lists' });
    
    return features;
  };

  const filteredCircles = getFilteredCircles();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">Loading your circles...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', path: '/' },
          { label: 'My Circles Summary', path: '/my-circles-summary' }
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Circles</h1>
        <p className="text-gray-600">
          All circles you're a member of and your role in each
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="text-sm text-gray-600">Total Circles</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('admin')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-red-600" />
              <div className="text-2xl font-bold text-gray-900">{stats.adminCircles}</div>
            </div>
            <div className="text-sm text-gray-600">Admin Circles</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('active')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-600" />
              <div className="text-2xl font-bold text-gray-900">{stats.activeCircles}</div>
            </div>
            <div className="text-sm text-gray-600">Active Circles</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('open')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-purple-600" />
              <div className="text-2xl font-bold text-gray-900">{stats.openCircles}</div>
            </div>
            <div className="text-sm text-gray-600">Open Circles</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Sort */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All Circles ({stats.total})
              </Button>
              <Button
                variant={filter === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('admin')}
              >
                Admin Only ({stats.adminCircles})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Active ({stats.activeCircles})
              </Button>
              <Button
                variant={filter === 'open' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('open')}
              >
                Open Circle ({stats.openCircles})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Recently Joined</option>
                <option value="name">Name (A-Z)</option>
                <option value="members">Member Count</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circles Grid */}
      {filteredCircles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No circles found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all'
                ? "You're not a member of any circles yet"
                : `No ${filter} circles found`}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View all circles
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCircles.map((circle) => {
            const features = getEnabledFeatures(circle);
            
            return (
              <Card key={circle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{circle.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {getRoleBadge(circle.userRole)}
                        {getAccessTypeBadge(circle.access_type)}
                        {circle.is_open_circle && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-800">
                            Open Circle
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {circle.description || 'No description available'}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Member Count */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{circle.member_ids?.length || 0} members</span>
                    </div>

                    {/* Enabled Features */}
                    {features.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-2">Enabled Activities:</div>
                        <div className="flex flex-wrap gap-2">
                          {features.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Icon className="w-3 h-3 mr-1" />
                                {feature.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="pt-3 border-t flex gap-2">
                      <Link to={`/circles/${circle.id}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full">
                          View Circle
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                      {circle.userRole === 'admin' && (
                        <Link to={`/admin/circles/${circle.id}`}>
                          <Button variant="outline" size="sm">
                            <Shield className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}