import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Users, UserCog, Shield, TrendingUp, MessageSquare, FileText, Hash, RefreshCw, Table, ArrowUpCircle, Calendar, Presentation, Settings, Award, Newspaper, Eye, Video, Hammer, Clipboard, Coffee, Star, Layers, CheckSquare, CalendarClock, Building2, Crown, Database, Link2, Mail, UserPlus, Package, Share2, DollarSign, BarChart3, Store, Tag as TagIcon, Zap, UserCircle, Sparkles, Play, HelpCircle, Bell, Info, Trash2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import MyCircleLinksCard from '@/app/components/admin/MyCircleLinksCard';

export default function AdminDashboardTabbed() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('getting-started');
  const [stats, setStats] = useState({
    users: 0,
    circles: 0,
    posts: 0,
    documents: 0,
  });
  const [myAdminCircles, setMyAdminCircles] = useState<any[]>([]);
  const [myAdminTables, setMyAdminTables] = useState<any[]>([]);
  const [myAdminElevators, setMyAdminElevators] = useState<any[]>([]);
  const [myAdminMeetings, setMyAdminMeetings] = useState<any[]>([]);
  const [myAdminPitches, setMyAdminPitches] = useState<any[]>([]);
  const [myAdminStandups, setMyAdminStandups] = useState<any[]>([]);
  const [myAdminBuilds, setMyAdminBuilds] = useState<any[]>([]);
  const [myAdminMeetups, setMyAdminMeetups] = useState<any[]>([]);
  const [myAdminChecklists, setMyAdminChecklists] = useState<any[]>([]);
  const [myAdminSprints, setMyAdminSprints] = useState<any[]>([]);

  useEffect(() => {
    if (profile && profile.role === 'super') {
      fetchAdminData();
    }
  }, [profile]);

  const fetchAdminData = async () => {
    if (!profile) return;

    try {
      // Fetch platform stats
      const [usersCount, circlesCount, postsCount, documentsCount] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('circles').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersCount.count || 0,
        circles: circlesCount.count || 0,
        posts: postsCount.count || 0,
        documents: documentsCount.count || 0,
      });

      // Fetch all admin containers (same as original)
      const { data: circlesData } = await supabase
        .from('circles')
        .select('id, name, member_ids, admin_ids');

      const filteredCircles = profile.role === 'super' 
        ? circlesData || []
        : (circlesData || []).filter((c: any) => c.admin_ids?.includes(profile.id));

      setMyAdminCircles(filteredCircles);

      // Fetch other containers
      const { data: tablesData } = await supabase
        .from('tables')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredTables = profile.role === 'super'
        ? tablesData || []
        : (tablesData || []).filter((t: any) => t.admin_ids?.includes(profile.id));

      setMyAdminTables(filteredTables);

      const { data: elevatorsData } = await supabase
        .from('elevators')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredElevators = profile.role === 'super'
        ? elevatorsData || []
        : (elevatorsData || []).filter((e: any) => e.admin_ids?.includes(profile.id));

      setMyAdminElevators(filteredElevators);

      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredMeetings = profile.role === 'super'
        ? meetingsData || []
        : (meetingsData || []).filter((m: any) => m.admin_ids?.includes(profile.id));

      setMyAdminMeetings(filteredMeetings);

      const { data: pitchesData } = await supabase
        .from('pitches')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredPitches = profile.role === 'super'
        ? pitchesData || []
        : (pitchesData || []).filter((p: any) => p.admin_ids?.includes(profile.id));

      setMyAdminPitches(filteredPitches);

      const { data: standupsData } = await supabase
        .from('standups')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredStandups = profile.role === 'super'
        ? standupsData || []
        : (standupsData || []).filter((s: any) => s.admin_ids?.includes(profile.id));

      setMyAdminStandups(filteredStandups);

      const { data: buildsData } = await supabase
        .from('builds')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredBuilds = profile.role === 'super'
        ? buildsData || []
        : (buildsData || []).filter((b: any) => b.admin_ids?.includes(profile.id));

      setMyAdminBuilds(filteredBuilds);

      const { data: meetupsData } = await supabase
        .from('meetups')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredMeetups = profile.role === 'super'
        ? meetupsData || []
        : (meetupsData || []).filter((m: any) => m.admin_ids?.includes(profile.id));

      setMyAdminMeetups(filteredMeetups);

      try {
        const { data: checklistsData } = await supabase
          .from('checklists')
          .select('id, name, created_by, is_template, category');

        const filteredChecklists = profile.role === 'super'
          ? checklistsData || []
          : (checklistsData || []).filter((c: any) => c.created_by === profile.id);

        setMyAdminChecklists(filteredChecklists);
      } catch (error: any) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          setMyAdminChecklists([]);
        }
      }

      try {
        const { data: sprintsData } = await supabase
          .from('sprints')
          .select('id, name, slug, member_ids, admin_ids');

        const filteredSprints = profile.role === 'super'
          ? sprintsData || []
          : (sprintsData || []).filter((s: any) => s.admin_ids?.includes(profile.id));

        setMyAdminSprints(filteredSprints);
      } catch (error: any) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          setMyAdminSprints([]);
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load platform dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading platform dashboard...</div>
      </div>
    );
  }

  const statsData = [
    {
      name: 'Total Users',
      value: stats.users,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      name: 'Total Circles',
      value: stats.circles,
      icon: UserCog,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      name: 'Total Posts',
      value: stats.posts,
      icon: MessageSquare,
      color: 'text-green-600 bg-green-50',
    },
    {
      name: 'Total Documents',
      value: stats.documents,
      icon: FileText,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  // Tab configuration with workflow guidance
  const tabConfig = [
    { id: 'getting-started', label: 'Getting Started', icon: Sparkles, color: 'text-green-600' },
    { id: 'users', label: 'Users & Permissions', icon: Users, color: 'text-blue-600' },
    { id: 'growth', label: 'Growth & Acquisition', icon: TrendingUp, color: 'text-purple-600' },
    { id: 'content', label: 'Content & Engagement', icon: MessageSquare, color: 'text-orange-600' },
    { id: 'programs', label: 'Programs & Circles', icon: Award, color: 'text-red-600' },
    { id: 'containers', label: 'Containers', icon: Layers, color: 'text-yellow-600' },
    { id: 'commercial', label: 'Commercial', icon: DollarSign, color: 'text-emerald-600' },
    { id: 'database', label: 'Database', icon: Database, color: 'text-gray-600' },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Platform Dashboard' }]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Platform Dashboard</h1>
          <p className="text-gray-600">Organized by workflow and purpose</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/circles/new">
            <Button>
              <Users className="w-4 h-4 mr-2" />
              Create Circle
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}</div>

      {/* Tabbed Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="inline sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* TAB 1: GETTING STARTED */}
        <TabsContent value="getting-started" className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">First-time setup workflow</h3>
                <p className="text-sm text-green-700 mt-1">
                  Platform Settings → Seed Data Config → Data Seeder → Demo Accounts
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/settings">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-indigo-600" />
                    Platform Settings
                  </CardTitle>
                  <CardDescription>
                    Configure platform name, branding, and logo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Essential</Badge>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/templates">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-purple-600" />
                    Template Library
                  </CardTitle>
                  <CardDescription>
                    Browse and import pre-built program templates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Jumpstart your platform</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/platform-admin/seed-data">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                    Seed Data Config
                  </CardTitle>
                  <CardDescription>
                    Review demo personas before seeding.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">5 personas + 3 circles</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-blue-50/30">
              <Link to="/platform-admin/data-seeder">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Play className="w-5 h-5 mr-2 text-blue-600" />
                    Data Seeder
                  </CardTitle>
                  <CardDescription>
                    Auto-populate database with demo data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">⚡ Automated seeding</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-cyan-200 bg-cyan-50/30">
              <Link to="/platform-admin/demo-accounts">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCircle className="w-5 h-5 mr-2 text-cyan-600" />
                    Demo Accounts
                  </CardTitle>
                  <CardDescription>
                    Configure demo experiences for login page.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">5 interactive demos</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/claimable-profiles">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />
                    Claimable Profiles
                  </CardTitle>
                  <CardDescription>
                    Pre-configured profiles for group onboarding.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Fast group setup</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/documentation">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Documentation Manager
                  </CardTitle>
                  <CardDescription>
                    Manage platform documentation and guides.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Help resources</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/links">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Link2 className="w-5 h-5 mr-2 text-teal-600" />
                    Link Library
                  </CardTitle>
                  <CardDescription>
                    Manage platform links and resources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Centralized link management</p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: USERS & PERMISSIONS */}
        <TabsContent value="users" className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">User management workflow</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Manage Users → User Classes → Container Config → Badges & Notifications
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/users">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCog className="w-5 h-5 mr-2 text-blue-600" />
                    Manage Users
                  </CardTitle>
                  <CardDescription>
                    View user accounts, roles, and permissions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.users} users</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/user-classes">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-indigo-600" />
                    User Class Management
                  </CardTitle>
                  <CardDescription>
                    Configure container capacity limits per tier.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">10 user tiers</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/container-configuration">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-purple-600" />
                    Container Configuration
                  </CardTitle>
                  <CardDescription>
                    Control navigation visibility by user class.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Header visibility</p>
                </CardContent>
              </Link>
            </Card>



            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/notifications">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-indigo-600" />
                    Notification Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure notification types and delivery.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Email & in-app settings</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/notifications/manage">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-purple-600" />
                    Notification Management
                  </CardTitle>
                  <CardDescription>
                    View, analyze, and send platform notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Admin dashboard for notifications</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/container-memberships">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-600" />
                    Container Memberships
                  </CardTitle>
                  <CardDescription>
                    Track who belongs to which containers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Membership overview</p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: GROWTH & ACQUISITION */}
        <TabsContent value="growth" className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900">Member acquisition workflow</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Shareable Links → Prospects → Applications → Invitations → Analytics
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/platform-admin/shareable-links">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Link2 className="w-5 h-5 mr-2 text-green-600" />
                    Shareable Links
                  </CardTitle>
                  <CardDescription>
                    Generate landing pages for programs/circles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">✓ Public landing pages</p>
                  <p className="text-sm text-gray-600">✓ Application forms</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/platform-admin/analytics">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Funnel Analytics
                  </CardTitle>
                  <CardDescription>
                    Track visits, applications, conversions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">✓ Conversion tracking</p>
                  <p className="text-sm text-gray-600">✓ Referral sources</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/platform-admin/applications">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                    Application Management
                  </CardTitle>
                  <CardDescription>
                    Review and approve membership applications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">✓ Bulk approve/reject</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/platform-admin/prospects">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Prospect Management
                  </CardTitle>
                  <CardDescription>
                    Import and manage prospect contact lists.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">✓ CSV import/export</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/program-admin/waitlist">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clipboard className="w-5 h-5 mr-2 text-purple-600" />
                    Waitlist Management
                  </CardTitle>
                  <CardDescription>
                    Manage waitlists for programs at capacity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">✓ Priority ordering</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/platform-admin/invitations">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-indigo-600" />
                    Invitation System
                  </CardTitle>
                  <CardDescription>
                    Send and track platform invitations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">✓ Resend & cancel</p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: CONTENT & ENGAGEMENT */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Content moderation workflow</h3>
                <p className="text-sm text-orange-700 mt-1">
                  View and moderate all user-generated content across the platform
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/tags">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TagIcon className="w-5 h-5 mr-2 text-teal-600" />
                    Tag Management
                  </CardTitle>
                  <CardDescription>
                    View and manage all platform tags.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Platform-wide taxonomy</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/events">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Events Management
                  </CardTitle>
                  <CardDescription>
                    View and moderate all events.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">All platform events</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/feed">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                    Feed Management
                  </CardTitle>
                  <CardDescription>
                    View and moderate all posts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.posts} posts</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/forums">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
                    Forums Management
                  </CardTitle>
                  <CardDescription>
                    View and moderate all forum threads.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Discussion moderation</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/documents">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-orange-600" />
                    Documents Management
                  </CardTitle>
                  <CardDescription>
                    View and moderate all documents.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.documents} docs</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/reviews">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-600" />
                    Reviews Management
                  </CardTitle>
                  <CardDescription>
                    View and moderate all reviews and ratings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Ratings moderation</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/announcements">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Newspaper className="w-5 h-5 mr-2 text-indigo-600" />
                    Announcements
                  </CardTitle>
                  <CardDescription>
                    Create platform-wide announcements.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Broadcast messages</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/topic-interests">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Hash className="w-5 h-5 mr-2 text-pink-600" />
                    Topic Interests
                  </CardTitle>
                  <CardDescription>
                    Manage topic interest categories.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">User interests</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-200 bg-purple-50/30">
              <Link to="/platform-admin/seed-topics-tags">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                    Topics & Tags Seeder
                  </CardTitle>
                  <CardDescription>
                    Seed WHO/WHY topics and WHAT/HOW tags for membership structure.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Revolutionary WHO/WHY vs WHAT/HOW framework</p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: PROGRAMS & CIRCLES */}
        <TabsContent value="programs" className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Programs & Circles Management</h3>
                <p className="text-sm text-red-700 mt-1">
                  Create, edit, and manage programs and circles. Use templates to get started quickly.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Programs Management - Featured */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-300 bg-blue-50/50">
              <Link to="/platform-admin/programs">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-blue-600" />
                    Programs Management
                  </CardTitle>
                  <CardDescription>
                    Create, edit, and delete programs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="default" className="bg-blue-600">Primary</Badge>
                </CardContent>
              </Link>
            </Card>

            {/* Circles Management - Featured */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-300 bg-purple-50/50">
              <Link to="/platform-admin/circles">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-600" />
                    Circles Management
                  </CardTitle>
                  <CardDescription>
                    Create, edit, and delete circles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="default" className="bg-purple-600">Primary</Badge>
                </CardContent>
              </Link>
            </Card>

            {/* Courses Management - Featured */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-teal-300 bg-teal-50/50">
              <Link to="/platform-admin/courses">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Presentation className="w-5 h-5 mr-2 text-teal-600" />
                    Courses Management
                  </CardTitle>
                  <CardDescription>
                    Create, edit, and delete courses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="default" className="bg-teal-600">Primary</Badge>
                </CardContent>
              </Link>
            </Card>

            {/* Program Backup & Restore */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/program-backup-restore">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2 text-blue-600" />
                    Program Backup & Restore
                  </CardTitle>
                  <CardDescription>
                    Export programs as JSON or import to duplicate.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Full backup/restore</p>
                </CardContent>
              </Link>
            </Card>

            {/* Templates Manager */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/templates">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-purple-600" />
                    Templates Manager
                  </CardTitle>
                  <CardDescription>
                    Manage program and circle templates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Template library</p>
                </CardContent>
              </Link>
            </Card>

            {/* Container Templates */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/template-library">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-indigo-600" />
                    Container Templates
                  </CardTitle>
                  <CardDescription>
                    JSON schema templates for containers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Generate container JSON</p>
                </CardContent>
              </Link>
            </Card>

            {/* Full Templates Library */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/templates-library">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-purple-600" />
                    Templates Library
                  </CardTitle>
                  <CardDescription>
                    Browse program &amp; course templates with content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Pre-built templates with full content</p>
                </CardContent>
              </Link>
            </Card>

            {/* Shareable Links */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/shareable-links">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Link2 className="w-5 h-5 mr-2 text-green-600" />
                    Shareable Links
                  </CardTitle>
                  <CardDescription>
                    Generate program landing pages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Marketing links</p>
                </CardContent>
              </Link>
            </Card>

            {/* Offerings Manager */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/offerings">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-amber-600" />
                    Offerings Manager
                  </CardTitle>
                  <CardDescription>
                    Manage program offerings and enrollment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Program catalog</p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 6: CONTAINERS */}
        <TabsContent value="containers" className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Container types overview</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Manage all container instances across your platform
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer border-red-200 bg-red-50"
              onClick={() => navigate('/platform-admin/batch-delete')}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                  Batch Container Delete
                </CardTitle>
                <CardDescription>
                  Delete multiple containers at once by type.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600 font-semibold">⚠️ Use with caution</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/checklists">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="w-5 h-5 mr-2 text-teal-600" />
                    Checklists Management
                  </CardTitle>
                  <CardDescription>
                    Manage all platform-wide checklists.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Task lists & templates</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/sprints">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarClock className="w-5 h-5 mr-2 text-indigo-600" />
                    Sprints Management
                  </CardTitle>
                  <CardDescription>
                    Manage all sprint containers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Time-boxed projects</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/builds">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Hammer className="w-5 h-5 mr-2 text-orange-600" />
                    Builds Management
                  </CardTitle>
                  <CardDescription>
                    Manage all build containers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Project collections</p>
                </CardContent>
              </Link>
            </Card>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            See "Containers You Administer" sections below for Tables, Elevators, Meetings, Pitches, Standups, Meetups, Builds, Checklists, and Sprints.
          </p>
        </TabsContent>

        {/* TAB 7: COMMERCIAL & MONETIZATION */}
        <TabsContent value="commercial" className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-900">Monetization workflow</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Membership Tiers → Sponsor Tiers → Payment Validation → Market Config
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/sponsors">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-yellow-600" />
                    Sponsor Management
                  </CardTitle>
                  <CardDescription>
                    Manage sponsor organizations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Sponsor directory</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/sponsor-tiers">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-amber-600" />
                    Sponsor Tier Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure Bronze, Silver, Gold, Platinum.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Tier permissions</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/membership-tiers">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Membership Tier Permissions
                  </CardTitle>
                  <CardDescription>
                    Configure Free, Member, Premium access.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Market access levels</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/payment">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-emerald-600" />
                    Payment & Invoice Validation
                  </CardTitle>
                  <CardDescription>
                    Verify payment status for access control.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Billing verification</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/subscription-packages">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                    Subscription Packages
                  </CardTitle>
                  <CardDescription>
                    Manage subscription offerings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Pricing plans</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/markets">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="w-5 h-5 mr-2 text-purple-600" />
                    Market Management
                  </CardTitle>
                  <CardDescription>
                    Configure Markets feature.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Marketplace settings</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to="/platform-admin/companies">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-orange-600" />
                    Companies Management
                  </CardTitle>
                  <CardDescription>
                    Manage all company profiles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Company directory</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-emerald-200 bg-emerald-50/30">
              <Link to="/platform-admin/ticket-templates">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ticket className="w-5 h-5 mr-2 text-emerald-600" />
                    Ticket Templates
                  </CardTitle>
                  <CardDescription>
                    Define ticket products for courses & programs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Access System</Badge>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-emerald-200 bg-emerald-50/30">
              <Link to="/platform-admin/ticket-inventory">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ticket className="w-5 h-5 mr-2 text-emerald-600" />
                    Ticket Inventory
                  </CardTitle>
                  <CardDescription>
                    Issue & manage ticket assignments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Fulfillment</Badge>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
              <Link to="/platform-admin/kit-commerce">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-green-600" />
                    Kit Commerce Setup
                  </CardTitle>
                  <CardDescription>
                    Webhook URLs, pipeline audit &amp; purchase log.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Kit Integration</Badge>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 8: DATABASE & MAINTENANCE */}
        <TabsContent value="database" className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">⚠️ Production launch workflow</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Data Audit → Data Cleanup → Seed Data Config → Data Seeder → Verify
                </p>
              </div>
            </div>
          </div>

          {/* Analysis & Monitoring */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Analysis & Monitoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/platform-admin/analytics">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                      Platform Analytics
                    </CardTitle>
                    <CardDescription>
                      View platform-wide metrics and trends.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Usage analytics</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-amber-200 bg-amber-50/30">
                <Link to="/platform-admin/data-audit">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="w-5 h-5 mr-2 text-amber-600" />
                      Data Audit
                    </CardTitle>
                    <CardDescription>
                      View database health and identify test data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Health check</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/platform-admin/content-moderation">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="w-5 h-5 mr-2 text-orange-600" />
                      Content Moderation
                    </CardTitle>
                    <CardDescription>
                      Review flagged/problematic content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Moderation queue</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/platform-admin/flagged-content">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-red-600" />
                      Flagged Content
                    </CardTitle>
                    <CardDescription>
                      View user-reported content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">User reports</p>
                  </CardContent>
                </Link>
              </Card>
            </div>
          </div>

          {/* Data Operations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Data Operations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-200 bg-red-50/30"
                onClick={() => navigate('/platform-admin/data-cleanup-utility')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                    Data Cleanup Utility
                  </CardTitle>
                  <CardDescription>
                    Delete all test data - with SQL fix instructions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-600 font-semibold">⚠️ Complete cleanup tool</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-200 bg-red-50/30">
                <Link to="/platform-admin/data-cleanup">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="w-5 h-5 mr-2 text-red-600" />
                      Data Cleanup
                    </CardTitle>
                    <CardDescription>
                      Safely delete test accounts and orphaned data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-600 font-semibold">⚠️ Permanent deletion</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/platform-admin/account-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="w-5 h-5 mr-2 text-purple-600" />
                      Account Management
                    </CardTitle>
                    <CardDescription>
                      Export/import accounts as JSON.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Backup & restore</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/platform-admin/deleted-documents">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-gray-600" />
                      Deleted Documents
                    </CardTitle>
                    <CardDescription>
                      View soft-deleted documents.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Recovery available</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-orange-200 bg-orange-50/30">
                <Link to="/platform-admin/batch-delete">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trash2 className="w-5 h-5 mr-2 text-orange-600" />
                      Batch Container Delete
                    </CardTitle>
                    <CardDescription>
                      Delete multiple containers at once.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-orange-600 font-semibold">⚠️ Bulk operations</p>
                  </CardContent>
                </Link>
              </Card>
            </div>
          </div>

          {/* Demo & Seed Data */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Demo & Seed Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
                <Link to="/platform-admin/seed-data">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                      Seed Data Config
                    </CardTitle>
                    <CardDescription>
                      Review demo personas before seeding.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">5 personas + 3 circles</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-blue-50/30">
                <Link to="/platform-admin/data-seeder">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Play className="w-5 h-5 mr-2 text-blue-600" />
                      Data Seeder
                    </CardTitle>
                    <CardDescription>
                      Auto-populate database with demo data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">⚡ 6-phase automation</p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-cyan-200 bg-cyan-50/30">
                <Link to="/platform-admin/demo-accounts">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <UserCircle className="w-5 h-5 mr-2 text-cyan-600" />
                      Demo Accounts
                    </CardTitle>
                    <CardDescription>
                      Manage demo accounts for login page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">5 interactive demos</p>
                  </CardContent>
                </Link>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* My Circle Links - Quick Access (Always visible below tabs) */}
      <MyCircleLinksCard />

      {/* My Administered Containers (Dynamic sections - same as original) */}
      {myAdminCircles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Circles You Administer</CardTitle>
            <CardDescription>Circles where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminCircles.map((circle) => (
                <div key={circle.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                      {circle.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium">{circle.name}</h3>
                      <p className="text-sm text-gray-600">{circle.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/admin/circles/${circle.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Link to={`/circles/${circle.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      {myAdminTables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tables You Administer</CardTitle>
            <CardDescription>Resource libraries where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminTables.map((table) => (
                <div key={table.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <Table className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{table.name}</h3>
                      <p className="text-sm text-gray-600">{table.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/tables/${table.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/tables/${table.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Elevators */}
      {myAdminElevators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Elevators You Administer</CardTitle>
            <CardDescription>Networking hubs where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminElevators.map((elevator) => (
                <div key={elevator.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <ArrowUpCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{elevator.name}</h3>
                      <p className="text-sm text-gray-600">{elevator.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/elevators/${elevator.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/elevators/${elevator.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meetings */}
      {myAdminMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meetings You Administer</CardTitle>
            <CardDescription>Event containers where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{meeting.name}</h3>
                      <p className="text-sm text-gray-600">{meeting.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/meetings/${meeting.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/meetings/${meeting.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pitches */}
      {myAdminPitches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pitches You Administer</CardTitle>
            <CardDescription>Showcase containers where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminPitches.map((pitch) => (
                <div key={pitch.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                      <Presentation className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{pitch.name}</h3>
                      <p className="text-sm text-gray-600">{pitch.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/pitches/${pitch.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/pitches/${pitch.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standups */}
      {myAdminStandups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Standups You Administer</CardTitle>
            <CardDescription>Regular check-ins where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminStandups.map((standup) => (
                <div key={standup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{standup.name}</h3>
                      <p className="text-sm text-gray-600">{standup.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/standups/${standup.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/standups/${standup.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Builds */}
      {myAdminBuilds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Builds You Administer</CardTitle>
            <CardDescription>Project collections where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminBuilds.map((build) => (
                <div key={build.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Hammer className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{build.name}</h3>
                      <p className="text-sm text-gray-600">{build.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/builds/${build.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/builds/${build.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meetups */}
      {myAdminMeetups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meetups You Administer</CardTitle>
            <CardDescription>Community gatherings where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminMeetups.map((meetup) => (
                <div key={meetup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                      <Coffee className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{meetup.name}</h3>
                      <p className="text-sm text-gray-600">{meetup.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/meetups/${meetup.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/meetups/${meetup.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklists */}
      {myAdminChecklists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Checklists You Manage</CardTitle>
            <CardDescription>Platform-wide checklists you've created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminChecklists.map((checklist) => (
                <div key={checklist.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <CheckSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{checklist.name}</h3>
                      <p className="text-sm text-gray-600">
                        {checklist.is_template ? 'Template' : 'Active'} • {checklist.category || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/platform-admin/checklists`}>
                      <Button variant="outline" size="sm">Manage</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprints */}
      {myAdminSprints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sprints You Administer</CardTitle>
            <CardDescription>Time-boxed projects where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAdminSprints.map((sprint) => (
                <div key={sprint.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <CalendarClock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{sprint.name}</h3>
                      <p className="text-sm text-gray-600">{sprint.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/sprints/${sprint.slug}/settings`}>
                      <Button variant="outline" size="sm">Settings</Button>
                    </Link>
                    <Link to={`/sprints/${sprint.slug}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
