import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserPlus, 
  Users, 
  Zap,
  AlertCircle,
  TrendingUp,
  Calendar,
  ListChecks,
  MapPin,
  Shield,
  Crown,
  Briefcase,
  Bell,
  Activity,
  Image,
  Folder,
  Award,
  ChevronRight,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

interface PendingInvite {
  id: string;
  type: 'circle' | 'container';
  name: string;
  invited_at: string;
  invited_by_name: string;
  circle_id?: string;
  container_id?: string;
  container_type?: string;
}

interface RecentJoin {
  id: string;
  type: 'circle' | 'container';
  name: string;
  joined_at: string;
  circle_id?: string;
  container_id?: string;
  container_type?: string;
}

interface HostedEvent {
  id: string;
  title: string;
  start_date: string; // This is the local property name for display
  end_date: string | null; // This is the local property name for display
  location: string | null;
  is_virtual: boolean;
  event_type: string;
  rsvp_count: number;
  circle_ids: string[];
}

interface UserRoles {
  isPlatformAdmin: boolean;
  isCoordinator: boolean;
  circleAdminCount: number;
  containerAdminCount: number;
  programAdminCount: number;
}

interface ProgramApplication {
  id: string;
  program_id: string;
  application_state: string;
  last_action_prompt: string | null;
  program: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function HomePage() {
  const { user, profile, userPermissions } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [recentJoins, setRecentJoins] = useState<RecentJoin[]>([]);
  const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoles>({
    isPlatformAdmin: false,
    isCoordinator: false,
    circleAdminCount: 0,
    containerAdminCount: 0,
    programAdminCount: 0,
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [programApplications, setProgramApplications] = useState<ProgramApplication[]>([]);

  useEffect(() => {
    if (user) {
      fetchHomeData();
      fetchUserRoles();
      fetchNotificationsCount();
      fetchProgramApplications();
    }
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user || !profile) return;

    try {
      // Check circle admin roles
      const { data: circleAdminData } = await supabase
        .from('circles')
        .select('id')
        .contains('admin_ids', [user.id]);

      // Check container admin roles
      const { data: containerAdminData } = await supabase
        .from('containers')
        .select('id')
        .contains('admin_ids', [user.id]);

      // Check program admin roles
      const { data: programAdminData } = await supabase
        .from('programs')
        .select('id')
        .contains('admin_ids', [user.id]);

      setUserRoles({
        isPlatformAdmin: profile.role === 'super',
        isCoordinator: profile.role === 'coordinator',
        circleAdminCount: circleAdminData?.length || 0,
        containerAdminCount: containerAdminData?.length || 0,
        programAdminCount: programAdminData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const fetchNotificationsCount = async () => {
    if (!user) return;

    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications count:', error);
    }
  };

  const fetchHomeData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch pending circle invites
      const { data: circleInvites } = await supabase
        .from('circle_members')
        .select(`
          id,
          created_at,
          circle:circles(id, name),
          invited_by:profiles!circle_members_invited_by_fkey(full_name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'invited')
        .order('created_at', { ascending: false });

      // Fetch pending container invites
      const { data: containerInvites } = await supabase
        .from('container_members')
        .select(`
          id,
          created_at,
          container:containers(id, name, container_type),
          invited_by:profiles!container_members_invited_by_fkey(full_name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'invited')
        .order('created_at', { ascending: false });

      // Fetch recent circle joins (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentCircleJoins } = await supabase
        .from('circle_members')
        .select(`
          id,
          created_at,
          circle:circles(id, name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Fetch recent container joins (last 7 days)
      const { data: recentContainerJoins } = await supabase
        .from('container_members')
        .select(`
          id,
          created_at,
          container:containers(id, name, container_type)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Fetch hosted events (upcoming only)
      const now = new Date().toISOString();
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('host_id', user.id)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(10);

      // Transform circle invites
      const transformedCircleInvites: PendingInvite[] = (circleInvites || []).map(invite => ({
        id: invite.id,
        type: 'circle',
        name: invite.circle?.name || 'Unknown Circle',
        invited_at: invite.created_at,
        invited_by_name: invite.invited_by?.full_name || 'Someone',
        circle_id: invite.circle?.id
      }));

      // Transform container invites
      const transformedContainerInvites: PendingInvite[] = (containerInvites || []).map(invite => ({
        id: invite.id,
        type: 'container',
        name: invite.container?.name || 'Unknown Container',
        invited_at: invite.created_at,
        invited_by_name: invite.invited_by?.full_name || 'Someone',
        container_id: invite.container?.id,
        container_type: invite.container?.container_type
      }));

      // Transform recent circle joins
      const transformedCircleJoins: RecentJoin[] = (recentCircleJoins || []).map(join => ({
        id: join.id,
        type: 'circle',
        name: join.circle?.name || 'Unknown Circle',
        joined_at: join.created_at,
        circle_id: join.circle?.id
      }));

      // Transform recent container joins
      const transformedContainerJoins: RecentJoin[] = (recentContainerJoins || []).map(join => ({
        id: join.id,
        type: 'container',
        name: join.container?.name || 'Unknown Container',
        joined_at: join.created_at,
        container_id: join.container?.id,
        container_type: join.container?.container_type
      }));

      // Transform hosted events
      const transformedHostedEvents: HostedEvent[] = (events || []).map(event => ({
        id: event.id,
        title: event.title,
        start_date: event.start_time,
        end_date: event.end_time,
        location: event.location,
        is_virtual: event.is_virtual,
        event_type: event.event_type || 'other',
        rsvp_count: event.attendee_ids?.length || 0,
        circle_ids: event.circle_ids || []
      }));

      setPendingInvites([...transformedCircleInvites, ...transformedContainerInvites]);
      setRecentJoins([...transformedCircleJoins, ...transformedContainerJoins]);
      setHostedEvents(transformedHostedEvents);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteResponse = async (inviteId: string, inviteType: 'circle' | 'container', accept: boolean) => {
    setProcessingInvite(inviteId);
    try {
      const table = inviteType === 'circle' ? 'circle_members' : 'container_members';
      
      const { error } = accept
        ? await supabase
            .from(table)
            .update({ status: 'active' })
            .eq('id', inviteId)
        : await supabase
            .from(table)
            .delete()
            .eq('id', inviteId);

      if (error) throw error;

      // Refresh data
      await fetchHomeData();
    } catch (error) {
      console.error('Error responding to invite:', error);
      alert(accept ? 'Failed to accept invite' : 'Failed to decline invite');
    } finally {
      setProcessingInvite(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getContainerLink = (join: RecentJoin) => {
    if (join.type === 'circle') {
      return `/circles/${join.circle_id}`;
    }
    // Map container types to their routes
    const typeRoutes: Record<string, string> = {
      'table': 'tables',
      'elevator': 'elevators',
      'meeting': 'meetings',
      'pitch': 'pitches',
      'build': 'builds',
      'standup': 'standups',
      'meetup': 'meetups',
      'sprint': 'sprints'
    };
    const route = typeRoutes[join.container_type || ''];
    return route ? `/${route}/${join.container_id}` : '#';
  };

  const fetchProgramApplications = async () => {
    if (!user) return;

    try {
      const { data: applications } = await supabase
        .from('program_applications')
        .select(`
          id,
          program_id,
          application_state,
          last_action_prompt,
          program:programs(id, name, slug)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setProgramApplications(applications || []);
    } catch (error) {
      console.error('Error fetching program applications:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading your home page...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.name || user?.email}</h1>
        <p className="text-gray-600 mt-1">Here's what needs your attention</p>
      </div>

      {/* NOTIFICATIONS SECTION - Top Priority */}
      <div className="mb-8">
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <Link
              to="/notifications"
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Bell className="w-8 h-8 text-blue-600" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Notifications</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {unreadNotifications > 0 ? `You have ${unreadNotifications} unread notification${unreadNotifications !== 1 ? 's' : ''}` : 'All caught up! No new notifications'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* USER PROFILE SUMMARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Roles & Permissions Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <CardTitle>Your Roles & Permissions</CardTitle>
            </div>
            <CardDescription>Your access levels across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Platform Roles */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Platform Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {userRoles.isPlatformAdmin && (
                    <Badge variant="default" className="bg-red-600 hover:bg-red-700">
                      <Crown className="w-3 h-3 mr-1" />
                      Super Admin
                    </Badge>
                  )}
                  {userRoles.isCoordinator && (
                    <Badge variant="default" className="bg-orange-600 hover:bg-orange-700">
                      <Briefcase className="w-3 h-3 mr-1" />
                      Coordinator
                    </Badge>
                  )}
                  {!userRoles.isPlatformAdmin && !userRoles.isCoordinator && (
                    <Badge variant="secondary">
                      <UserCircle className="w-3 h-3 mr-1" />
                      Member
                    </Badge>
                  )}
                </div>
              </div>

              {/* Community Management Roles */}
              {(userRoles.programAdminCount > 0 || userRoles.circleAdminCount > 0 || userRoles.containerAdminCount > 0) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Community Management</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {userRoles.programAdminCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
                        <Folder className="w-4 h-4 text-indigo-600" />
                        <div className="flex-1">
                          <div className="text-xs text-gray-600">Program Admin</div>
                          <div className="font-semibold text-indigo-900">{userRoles.programAdminCount}</div>
                        </div>
                      </div>
                    )}
                    {userRoles.circleAdminCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div className="flex-1">
                          <div className="text-xs text-gray-600">Circle Admin</div>
                          <div className="font-semibold text-blue-900">{userRoles.circleAdminCount}</div>
                        </div>
                      </div>
                    )}
                    {userRoles.containerAdminCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <ListChecks className="w-4 h-4 text-green-600" />
                        <div className="flex-1">
                          <div className="text-xs text-gray-600">Container Admin</div>
                          <div className="font-semibold text-green-900">{userRoles.containerAdminCount}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User Class */}
              {userPermissions && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">User Class</h4>
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                    <Award className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="font-semibold text-gray-900">Class {userPermissions.class_number}</div>
                      <div className="text-xs text-gray-600">
                        Access to {userPermissions.visible_containers.length} container types
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links & Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Your personal spaces</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Portfolio */}
            <Link
              to={`/portfolio/${user?.id}`}
              className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-purple-600" />
                <div className="font-medium text-gray-900">Portfolio</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </Link>

            {/* Moments */}
            <Link
              to={`/moments/${user?.id}`}
              className="flex items-center justify-between p-3 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Image className="w-5 h-5 text-pink-600" />
                <div className="font-medium text-gray-900">Moments</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </Link>

            {/* Activity Feed */}
            <Link
              to="/recent-activities"
              className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-green-600" />
                <div className="font-medium text-gray-900">Activity Feed</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </Link>

            {/* Calendar */}
            <Link
              to="/calendar"
              className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-600" />
                <div className="font-medium text-gray-900">Calendar</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading your dashboard...</div>
        </div>
      ) : (
        <>
          {/* ACTION REQUIRED SECTION - Always Visible */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              {(pendingInvites.length > 0 || 
                programApplications.filter(app => 
                  ['approved', 'waitlisted'].includes(app.application_state) || app.last_action_prompt
                ).length > 0 || 
                hostedEvents.filter(e => {
                  const eventDate = new Date(e.start_date);
                  const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return daysUntil <= 7;
                }).length > 0) ? (
                <>
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h2 className="text-2xl font-semibold text-gray-900">Action Required</h2>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-semibold text-gray-900">Action Required</h2>
                </>
              )}
            </div>

            {/* Check if there are any action items */}
            {pendingInvites.length === 0 && 
             programApplications.filter(app => 
               ['approved', 'waitlisted'].includes(app.application_state) || app.last_action_prompt
             ).length === 0 && 
             hostedEvents.filter(e => {
               const eventDate = new Date(e.start_date);
               const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
               return daysUntil <= 7;
             }).length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-lg font-medium text-green-900">No action required</p>
                      <p className="text-sm text-green-700 mt-1">You're all caught up! Check back later for updates.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Program Application Next Steps */}
                {programApplications.filter(app => 
                  ['approved', 'waitlisted'].includes(app.application_state) || app.last_action_prompt
                ).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Your Program Status</h3>
                    <div className="space-y-3">
                      {programApplications
                        .filter(app => ['approved', 'waitlisted'].includes(app.application_state) || app.last_action_prompt)
                        .map(application => {
                          const getStateConfig = (state: string) => {
                            switch (state) {
                              case 'approved':
                                return {
                                  color: 'border-green-500',
                                  bgColor: 'bg-green-50',
                                  textColor: 'text-green-700',
                                  icon: CheckCircle,
                                  iconColor: 'text-green-600',
                                  defaultPrompt: 'Complete your enrollment',
                                  actionUrl: `/programs/${application.program.slug}/enroll`
                                };
                              case 'waitlisted':
                                return {
                                  color: 'border-yellow-500',
                                  bgColor: 'bg-yellow-50',
                                  textColor: 'text-yellow-700',
                                  icon: Clock,
                                  iconColor: 'text-yellow-600',
                                  defaultPrompt: 'You\'re on the waitlist',
                                  actionUrl: `/programs/${application.program.slug}`
                                };
                              case 'enrolled':
                                return {
                                  color: 'border-blue-500',
                                  bgColor: 'bg-blue-50',
                                  textColor: 'text-blue-700',
                                  icon: CheckCircle,
                                  iconColor: 'text-blue-600',
                                  defaultPrompt: 'RSVP for your first session',
                                  actionUrl: `/programs/${application.program.slug}`
                                };
                              default:
                                return {
                                  color: 'border-gray-500',
                                  bgColor: 'bg-gray-50',
                                  textColor: 'text-gray-700',
                                  icon: AlertCircle,
                                  iconColor: 'text-gray-600',
                                  defaultPrompt: 'View program details',
                                  actionUrl: `/programs/${application.program.slug}`
                                };
                            }
                          };

                          const config = getStateConfig(application.application_state);
                          const Icon = config.icon;
                          const actionPrompt = application.last_action_prompt || config.defaultPrompt;

                          return (
                            <Link
                              key={application.id}
                              to={config.actionUrl}
                              className={`bg-white border-l-4 ${config.color} rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow block`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                                    <h4 className="font-semibold text-gray-900">{application.program.name}</h4>
                                  </div>
                                  <div className={`mt-2 p-3 ${config.bgColor} rounded-lg`}>
                                    <p className={`text-sm font-medium ${config.textColor}`}>
                                      🎯 {actionPrompt}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                              </div>
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Pending Invitations</h3>
                    <div className="space-y-3">
                      {pendingInvites.map(invite => (
                        <div
                          key={invite.id}
                          className="bg-white border-l-4 border-blue-500 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {invite.type === 'circle' ? (
                                  <Users className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <ListChecks className="w-5 h-5 text-purple-600" />
                                )}
                                <h4 className="font-semibold text-gray-900">{invite.name}</h4>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {invite.type === 'circle' ? 'Circle' : `${invite.container_type}`} invitation
                              </p>
                              {invite.invited_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Invited {new Date(invite.invited_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleInviteResponse(invite.id, invite.type, true)}
                                disabled={processingInvite === invite.id}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleInviteResponse(invite.id, invite.type, false)}
                                disabled={processingInvite === invite.id}
                                className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Hosted Events (next 7 days) */}
                {hostedEvents.filter(e => {
                  const eventDate = new Date(e.start_date);
                  const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return daysUntil <= 7;
                }).length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Upcoming Events You're Hosting</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hostedEvents.filter(e => {
                        const eventDate = new Date(e.start_date);
                        const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return daysUntil <= 7;
                      }).map(event => {
                        const eventDate = new Date(event.start_date);
                        const isToday = eventDate.toDateString() === new Date().toDateString();
                        const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                        
                        let dateLabel = eventDate.toLocaleDateString();
                        if (isToday) dateLabel = 'Today';
                        else if (isTomorrow) dateLabel = 'Tomorrow';
                        
                        return (
                          <Link
                            key={event.id}
                            to={`/events/${event.id}`}
                            className="bg-white border-l-4 border-orange-500 rounded-lg shadow-sm p-4 hover:shadow-md transition-all"
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                  <h4 className="font-semibold text-gray-900 line-clamp-1">{event.title}</h4>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-medium">
                                  {dateLabel}
                                </span>
                                <span>•</span>
                                <span className="text-xs">{event.event_type}</span>
                              </div>
                              
                              {event.location && !event.is_virtual && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                              
                              {event.is_virtual && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Zap className="w-3 h-3" />
                                  <span>Virtual Event</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                  <UserPlus className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-gray-900">{event.rsvp_count}</span>
                                  <span className="text-sm text-gray-600">RSVP{event.rsvp_count !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RECENTLY JOINED SECTION */}
          {recentJoins.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Recently Joined</h2>
                <span className="text-sm text-gray-500">(Last 7 days)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentJoins.map(item => (
                  <Link
                    key={item.id}
                    to={item.type === 'circle' ? `/circles/${item.circle_id}` : 
                        item.container_type === 'table' ? `/tables/${item.container_id}` :
                        item.container_type === 'elevator' ? `/elevators/${item.container_id}` :
                        item.container_type === 'meeting' ? `/meetings/${item.container_id}` :
                        item.container_type === 'pitch' ? `/pitches/${item.container_id}` :
                        item.container_type === 'build' ? `/builds/${item.container_id}` :
                        item.container_type === 'standup' ? `/standups/${item.container_id}` :
                        item.container_type === 'meetup' ? `/meetups/${item.container_id}` :
                        item.container_type === 'sprint' ? `/sprints/${item.container_id}` :
                        `/`
                    }
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {item.type === 'circle' ? (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <ListChecks className="w-5 h-5 text-purple-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.type === 'circle' ? 'Circle' : item.container_type}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Joined {new Date(item.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ALL UPCOMING HOSTED EVENTS (beyond 7 days) */}
          {hostedEvents.filter(e => {
            const eventDate = new Date(e.start_date);
            const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntil > 7;
          }).length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Your Upcoming Events</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hostedEvents.filter(e => {
                  const eventDate = new Date(e.start_date);
                  const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return daysUntil > 7;
                }).map(event => {
                  const eventDate = new Date(event.start_date);
                  
                  return (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{event.title}</h3>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            {event.event_type}
                          </span>
                          <span>•</span>
                          <span>{eventDate.toLocaleDateString()}</span>
                        </div>
                        
                        {event.location && !event.is_virtual && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        
                        {event.is_virtual && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Zap className="w-3 h-3" />
                            <span>Virtual Event</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1 text-sm">
                            <UserPlus className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-gray-900">{event.rsvp_count}</span>
                            <span className="text-gray-600">RSVP{event.rsvp_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {pendingInvites.length === 0 && recentJoins.length === 0 && hostedEvents.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-600 mb-4">You have no pending actions at this time.</p>
                  <Link
                    to="/discovery"
                    className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Explore the Platform
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}