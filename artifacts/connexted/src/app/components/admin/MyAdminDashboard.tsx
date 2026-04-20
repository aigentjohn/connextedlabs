import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { useSponsor } from '@/lib/sponsor-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { 
  Shield, 
  Settings, 
  Users, 
  Activity, 
  UserPlus,
  Table,
  Video,
  ArrowUpCircle,
  TrendingUp,
  Link2,
  Calendar,
  Mail,
  Presentation,
  Hammer,
  MessageSquare,
  Coffee,
  Briefcase,
  Crown,
  Database,
  ListMusic
} from 'lucide-react';

export default function MyAdminDashboard() {
  const { profile } = useAuth();
  const { memberships } = useSponsor();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContainers: 0,
    totalMembers: 0,
    recentActivity: 0,
    pendingRequests: 0,
  });
  
  // Containers state
  const [myAdminTables, setMyAdminTables] = useState<any[]>([]);
  const [myAdminElevators, setMyAdminElevators] = useState<any[]>([]);
  const [myAdminMeetings, setMyAdminMeetings] = useState<any[]>([]);
  const [myAdminPitches, setMyAdminPitches] = useState<any[]>([]);
  const [myAdminStandups, setMyAdminStandups] = useState<any[]>([]);
  const [myAdminBuilds, setMyAdminBuilds] = useState<any[]>([]);
  const [myAdminMeetups, setMyAdminMeetups] = useState<any[]>([]);
  const [myAdminSprints, setMyAdminSprints] = useState<any[]>([]);
  const [myAdminPrompts, setMyAdminPrompts] = useState<any[]>([]);
  const [myAdminPlaylists, setMyAdminPlaylists] = useState<any[]>([]);
  const [myAdminEpisodes, setMyAdminEpisodes] = useState<any[]>([]);
  const [myAdminMagazines, setMyAdminMagazines] = useState<any[]>([]);
  const [myAdminChecklists, setMyAdminChecklists] = useState<any[]>([]);
  const [myAdminMoments, setMyAdminMoments] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      fetchMyAdminData();
    }
  }, [profile]);

  const fetchMyAdminData = async () => {
    if (!profile) return;

    try {
      const isPlatformAdmin = profile.role === 'super';
      
      // Fetch tables where user is admin
      const { data: tablesData } = await supabase
        .from('tables')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredTables = isPlatformAdmin
        ? tablesData || []
        : (tablesData || []).filter((t: any) => t.admin_ids?.includes(profile.id));

      setMyAdminTables(filteredTables);

      // Fetch elevators where user is admin
      const { data: elevatorsData } = await supabase
        .from('elevators')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredElevators = isPlatformAdmin
        ? elevatorsData || []
        : (elevatorsData || []).filter((e: any) => e.admin_ids?.includes(profile.id));

      setMyAdminElevators(filteredElevators);

      // Fetch meetings where user is admin
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredMeetings = isPlatformAdmin
        ? meetingsData || []
        : (meetingsData || []).filter((m: any) => m.admin_ids?.includes(profile.id));

      setMyAdminMeetings(filteredMeetings);

      // Fetch pitches where user is admin
      const { data: pitchesData } = await supabase
        .from('pitches')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredPitches = isPlatformAdmin
        ? pitchesData || []
        : (pitchesData || []).filter((p: any) => p.admin_ids?.includes(profile.id));

      setMyAdminPitches(filteredPitches);

      // Fetch standups where user is admin
      const { data: standupsData } = await supabase
        .from('standups')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredStandups = isPlatformAdmin
        ? standupsData || []
        : (standupsData || []).filter((s: any) => s.admin_ids?.includes(profile.id));

      setMyAdminStandups(filteredStandups);

      // Fetch builds where user is admin
      const { data: buildsData } = await supabase
        .from('builds')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredBuilds = isPlatformAdmin
        ? buildsData || []
        : (buildsData || []).filter((b: any) => b.admin_ids?.includes(profile.id));

      setMyAdminBuilds(filteredBuilds);

      // Fetch meetups where user is admin
      const { data: meetupsData } = await supabase
        .from('meetups')
        .select('id, name, slug, member_ids, admin_ids');

      const filteredMeetups = isPlatformAdmin
        ? meetupsData || []
        : (meetupsData || []).filter((m: any) => m.admin_ids?.includes(profile.id));

      setMyAdminMeetups(filteredMeetups);

      // Fetch sprints where user is admin
      let filteredSprints: any[] = [];
      try {
        const { data: sprintsData } = await supabase
          .from('sprints')
          .select('id, name, slug, member_ids, admin_ids');

        filteredSprints = isPlatformAdmin
          ? sprintsData || []
          : (sprintsData || []).filter((s: any) => s.admin_ids?.includes(profile.id));

        setMyAdminSprints(filteredSprints);
      } catch (error: any) {
        console.log('Sprints error caught:', error);
        setMyAdminSprints([]);
        filteredSprints = [];
      }

      // Fetch prompts where user is admin
      let filteredPrompts: any[] = [];
      try {
        const { data: promptsData } = await supabase
          .from('prompts')
          .select('id, name, slug, member_ids, admin_ids');

        filteredPrompts = isPlatformAdmin
          ? promptsData || []
          : (promptsData || []).filter((p: any) => p.admin_ids?.includes(profile.id));

        setMyAdminPrompts(filteredPrompts);
      } catch (error) {
        console.log('Prompts error/missing, skipping...');
        setMyAdminPrompts([]);
      }

      // Fetch playlists where user is admin
      let filteredPlaylists: any[] = [];
      try {
        const { data: playlistsData } = await supabase
          .from('playlists')
          .select('id, name, slug, member_ids, admin_ids');

        filteredPlaylists = isPlatformAdmin
          ? playlistsData || []
          : (playlistsData || []).filter((p: any) => p.admin_ids?.includes(profile.id));

        setMyAdminPlaylists(filteredPlaylists);
      } catch (error) {
        console.log('Playlists error/missing, skipping...');
        setMyAdminPlaylists([]);
      }

      // Fetch episodes where user is admin
      let filteredEpisodes: any[] = [];
      try {
        const { data: episodesData } = await supabase
          .from('episodes')
          .select('id, title, description, member_ids, admin_ids');

        filteredEpisodes = isPlatformAdmin
          ? episodesData || []
          : (episodesData || []).filter((e: any) => e.admin_ids?.includes(profile.id));

        setMyAdminEpisodes(filteredEpisodes);
      } catch (error) {
        console.log('Episodes error/missing, skipping...');
        setMyAdminEpisodes([]);
      }

      // Fetch magazines where user is admin
      let filteredMagazines: any[] = [];
      try {
        const { data: magazinesData } = await supabase
          .from('magazines')
          .select('id, name, member_ids, admin_ids');

        filteredMagazines = isPlatformAdmin
          ? magazinesData || []
          : (magazinesData || []).filter((m: any) => m.admin_ids?.includes(profile.id));

        setMyAdminMagazines(filteredMagazines);
      } catch (error) {
        console.log('Magazines error/missing, skipping...');
        setMyAdminMagazines([]);
      }

      // Fetch checklists where user is admin
      let filteredChecklists: any[] = [];
      try {
        const { data: checklistsData } = await supabase
          .from('checklists')
          .select('id, name, member_ids, admin_ids');

        filteredChecklists = isPlatformAdmin
          ? checklistsData || []
          : (checklistsData || []).filter((c: any) => c.admin_ids?.includes(profile.id));

        setMyAdminChecklists(filteredChecklists);
      } catch (error) {
        console.log('Checklists error/missing, skipping...');
        setMyAdminChecklists([]);
      }

      // Fetch moments where user is owner (moments usually don't have admin_ids)
      let filteredMoments: any[] = [];
      try {
        // Moments are usually owned by a user, so we check user_id
        const { data: momentsData } = await supabase
          .from('moments')
          .select('id, content, user_id');

        filteredMoments = isPlatformAdmin
          ? momentsData || []
          : (momentsData || []).filter((m: any) => m.user_id === profile.id);

        setMyAdminMoments(filteredMoments);
      } catch (error) {
        console.log('Moments error/missing, skipping...');
        setMyAdminMoments([]);
      }

      // Calculate stats
      const allContainers = [
        ...filteredTables,
        ...filteredElevators,
        ...filteredMeetings,
        ...filteredPitches,
        ...filteredStandups,
        ...filteredBuilds,
        ...filteredMeetups,
        ...(filteredSprints || []),
        ...(filteredPlaylists || []),
        ...(filteredEpisodes || []),
        ...(filteredMagazines || []),
        ...(filteredChecklists || []),
        ...(filteredPrompts || []),
      ];

      const totalContainers = allContainers.length + filteredMoments.length;

      // Calculate total unique members across all containers
      const allMemberIds = new Set<string>();
      allContainers.forEach((container: any) => {
        (container.member_ids || []).forEach((id: string) => allMemberIds.add(id));
      });
      
      const totalMembers = allMemberIds.size;

      // Count new membership events across admin containers in the last 30 days
      const allContainerIds = allContainers.map((c: any) => c.id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let recentActivity = 0;
      let pendingRequests = 0;
      if (allContainerIds.length > 0) {
        const { count: activityCount } = await supabase
          .from('membership_states')
          .select('*', { count: 'exact', head: true })
          .in('entity_id', allContainerIds)
          .gte('applied_at', thirtyDaysAgo.toISOString());
        recentActivity = activityCount || 0;

        const { count: pendingCount } = await supabase
          .from('membership_states')
          .select('*', { count: 'exact', head: true })
          .in('entity_id', allContainerIds)
          .eq('state', 'applied');
        pendingRequests = pendingCount || 0;
      }

      setStats({
        totalContainers,
        totalMembers,
        recentActivity,
        pendingRequests,
      });

    } catch (error) {
      console.error('Error fetching my admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has admin access to at least one container
  const hasAdminAccess = () => {
    if (!profile) return false;
    if (profile.role === 'super') return true; // Platform admins always have access

    const totalAdminContainers = 
      myAdminTables.length +
      myAdminElevators.length +
      myAdminMeetings.length +
      myAdminPitches.length +
      myAdminStandups.length +
      myAdminBuilds.length +
      myAdminMeetups.length +
      myAdminSprints.length +
      myAdminPlaylists.length +
      myAdminEpisodes.length +
      myAdminMagazines.length +
      myAdminChecklists.length +
      myAdminPrompts.length +
      myAdminMoments.length;

    return totalAdminContainers > 0;
  };

  // Check if user is a sponsor director or admin
  const isSponsorDirectorOrAdmin = () => {
    if (!profile) return false;
    return memberships.some(m => m.role === 'director' || m.role === 'admin');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!hasAdminAccess()) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">You don't have admin access to any containers</p>
        <p className="text-sm text-gray-500 mt-2">
          Container admins can manage tables, elevators, and other containers they've been given admin access to.
        </p>
      </div>
    );
  }

  const statsData = [
    {
      name: 'Total Containers',
      value: stats.totalContainers,
      icon: Settings,
      color: 'text-blue-600 bg-blue-50',
      description: 'Containers you administer',
    },
    {
      name: 'Total Members',
      value: stats.totalMembers,
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
      description: 'Across all your containers',
    },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'My Admin' }]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">My Admin Dashboard</h1>
          <p className="text-gray-600">Manage your containers</p>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* Admin Role Description */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-900">
            <Shield className="w-5 h-5 mr-2" />
            About the Admin Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            As an <strong>Admin</strong>, you have been granted administrative privileges to manage specific containers within the platform. 
            This role allows you to configure settings, manage members, moderate content, and oversee the day-to-day operations of your assigned containers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-orange-900 mb-2">Your Responsibilities:</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Manage container settings and configuration</li>
                <li>• Add and remove members</li>
                <li>• Moderate content and ensure quality</li>
                <li>• Respond to member requests and issues</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-900 mb-2">Containers You Administer:</h4>
              <div className="grid grid-cols-2 gap-2 text-gray-700">
                {myAdminTables.length > 0 && <div><Badge variant="secondary">{myAdminTables.length} Table{myAdminTables.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminElevators.length > 0 && <div><Badge variant="secondary">{myAdminElevators.length} Elevator{myAdminElevators.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminMeetings.length > 0 && <div><Badge variant="secondary">{myAdminMeetings.length} Meeting{myAdminMeetings.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminPitches.length > 0 && <div><Badge variant="secondary">{myAdminPitches.length} Pitch{myAdminPitches.length !== 1 ? 'es' : ''}</Badge></div>}
                {myAdminBuilds.length > 0 && <div><Badge variant="secondary">{myAdminBuilds.length} Build{myAdminBuilds.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminStandups.length > 0 && <div><Badge variant="secondary">{myAdminStandups.length} Standup{myAdminStandups.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminMeetups.length > 0 && <div><Badge variant="secondary">{myAdminMeetups.length} Meetup{myAdminMeetups.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminSprints.length > 0 && <div><Badge variant="secondary">{myAdminSprints.length} Sprint{myAdminSprints.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminPrompts.length > 0 && <div><Badge variant="secondary">{myAdminPrompts.length} Prompt{myAdminPrompts.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminPlaylists.length > 0 && <div><Badge variant="secondary">{myAdminPlaylists.length} Playlist{myAdminPlaylists.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminEpisodes.length > 0 && <div><Badge variant="secondary">{myAdminEpisodes.length} Episode{myAdminEpisodes.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminMagazines.length > 0 && <div><Badge variant="secondary">{myAdminMagazines.length} Magazine{myAdminMagazines.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminChecklists.length > 0 && <div><Badge variant="secondary">{myAdminChecklists.length} Checklist{myAdminChecklists.length !== 1 ? 's' : ''}</Badge></div>}
                {myAdminMoments.length > 0 && <div><Badge variant="secondary">{myAdminMoments.length} Moment{myAdminMoments.length !== 1 ? 's' : ''}</Badge></div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
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
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tables Section */}
      {myAdminTables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tables You Administer ({myAdminTables.length})</CardTitle>
            <CardDescription>Resource libraries where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAdminTables.map((table) => (
                <div key={table.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <Table className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{table.name}</h3>
                      <p className="text-xs text-gray-600">{table.member_ids.length} members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/tables/${table.slug}/settings`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Settings</Button>
                    </Link>
                    <Link to={`/tables/${table.slug}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Containers Section */}
      {(myAdminElevators.length > 0 || myAdminMeetings.length > 0 || myAdminPitches.length > 0 || 
        myAdminBuilds.length > 0 || myAdminStandups.length > 0 || myAdminMeetups.length > 0 || 
        myAdminSprints.length > 0 || myAdminPrompts.length > 0 || 
        myAdminPlaylists.length > 0 || myAdminEpisodes.length > 0 || myAdminMagazines.length > 0 || 
        myAdminChecklists.length > 0 || myAdminMoments.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Other Containers You Administer</CardTitle>
            <CardDescription>Various container types where you have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Elevators */}
              {myAdminElevators.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <ArrowUpCircle className="w-4 h-4 mr-2 text-green-600" />
                    Elevators ({myAdminElevators.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminElevators.map((elevator) => (
                      <div key={elevator.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{elevator.name}</p>
                          <p className="text-xs text-gray-600">{elevator.member_ids.length} members</p>
                        </div>
                        <Link to={`/elevators/${elevator.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meetings */}
              {myAdminMeetings.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Video className="w-4 h-4 mr-2 text-orange-600" />
                    Meetings ({myAdminMeetings.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminMeetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{meeting.name}</p>
                          <p className="text-xs text-gray-600">{meeting.member_ids.length} members</p>
                        </div>
                        <Link to={`/meetings/${meeting.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pitches */}
              {myAdminPitches.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Presentation className="w-4 h-4 mr-2 text-pink-600" />
                    Pitches ({myAdminPitches.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminPitches.map((pitch) => (
                      <div key={pitch.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{pitch.name}</p>
                          <p className="text-xs text-gray-600">{pitch.member_ids.length} members</p>
                        </div>
                        <Link to={`/pitches/${pitch.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Builds */}
              {myAdminBuilds.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Hammer className="w-4 h-4 mr-2 text-blue-600" />
                    Builds ({myAdminBuilds.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminBuilds.map((build) => (
                      <div key={build.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{build.name}</p>
                          <p className="text-xs text-gray-600">{build.member_ids.length} members</p>
                        </div>
                        <Link to={`/builds/${build.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Standups */}
              {myAdminStandups.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-yellow-600" />
                    Standups ({myAdminStandups.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminStandups.map((standup) => (
                      <div key={standup.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{standup.name}</p>
                          <p className="text-xs text-gray-600">{standup.member_ids.length} members</p>
                        </div>
                        <Link to={`/standups/${standup.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meetups */}
              {myAdminMeetups.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Coffee className="w-4 h-4 mr-2 text-green-600" />
                    Meetups ({myAdminMeetups.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminMeetups.map((meetup) => (
                      <div key={meetup.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{meetup.name}</p>
                          <p className="text-xs text-gray-600">{meetup.member_ids.length} members</p>
                        </div>
                        <Link to={`/meetups/${meetup.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sprints */}
              {myAdminSprints.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
                    Sprints ({myAdminSprints.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminSprints.map((sprint) => (
                      <div key={sprint.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{sprint.name}</p>
                          <p className="text-xs text-gray-600">{sprint.member_ids?.length || 0} members</p>
                        </div>
                        <Link to={`/sprints/${sprint.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompts */}
              {myAdminPrompts.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2 text-indigo-600" />
                    Prompts ({myAdminPrompts.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminPrompts.map((prompt) => (
                      <div key={prompt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{prompt.name}</p>
                          <p className="text-xs text-gray-600">{prompt.member_ids?.length || 0} members</p>
                        </div>
                        <Link to={`/prompts/${prompt.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Playlists */}
              {myAdminPlaylists.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Presentation className="w-4 h-4 mr-2 text-purple-600" />
                    Playlists ({myAdminPlaylists.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminPlaylists.map((playlist) => (
                      <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{playlist.name}</p>
                          <p className="text-xs text-gray-600">{playlist.member_ids?.length || 0} members</p>
                        </div>
                        <Link to={`/playlists/${playlist.slug}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Episodes */}
              {myAdminEpisodes.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Video className="w-4 h-4 mr-2 text-red-600" />
                    Episodes ({myAdminEpisodes.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminEpisodes.map((episode) => (
                      <div key={episode.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{episode.title || episode.name}</p>
                          {/* Episodes usually don't have members, but might have views/likes if tracked */}
                        </div>
                        <Link to={`/episodes/${episode.id}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Magazines */}
              {myAdminMagazines.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Database className="w-4 h-4 mr-2 text-indigo-600" />
                    Magazines ({myAdminMagazines.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminMagazines.map((magazine) => (
                      <div key={magazine.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{magazine.name}</p>
                          <p className="text-xs text-gray-600">{magazine.member_ids?.length || 0} members</p>
                        </div>
                        <Link to={`/magazines/${magazine.id}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklists */}
              {myAdminChecklists.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Hammer className="w-4 h-4 mr-2 text-teal-600" />
                    Checklists ({myAdminChecklists.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myAdminChecklists.map((checklist) => (
                      <div key={checklist.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{checklist.name}</p>
                          <p className="text-xs text-gray-600">{checklist.member_ids?.length || 0} members</p>
                        </div>
                        <Link to={`/checklists/${checklist.id}`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sponsor Resources Section - Hidden for Sponsor Directors and Admins */}
      {!isSponsorDirectorOrAdmin() && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-amber-600" />
              Sponsor Resources
            </CardTitle>
            <CardDescription>
              Browse platform sponsors and explore partnership opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">
                Sponsors can provide resources, funding, and mentorship to your community.
              </p>
              <Link to="/sponsors">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  Browse Sponsors
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}