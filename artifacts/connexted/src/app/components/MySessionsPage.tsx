import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { Calendar, MapPin, Video, Clock, CheckCircle, XCircle, HelpCircle, Users } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Session {
  id: string;
  name: string;
  description: string;
  session_type: string;
  start_date: string | null;
  end_date?: string;
  duration_minutes?: number;
  location: string;
  virtual_link: string;
  status: string;
  max_capacity: number;
  program_id?: string | null;
  circle_id?: string | null;
  program?: { name: string; slug: string };
  circle?: { name: string; slug: string };
}

interface SessionRSVP {
  session_id: string;
  rsvp_status: 'yes' | 'no' | 'maybe';
  rsvp_at: string;
  attended: boolean;
  attended_at: string;
}

export default function MySessionsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [proposedSessions, setProposedSessions] = useState<Session[]>([]);
  const [rsvpData, setRsvpData] = useState<Record<string, SessionRSVP>>({});
  const [submittingRsvp, setSubmittingRsvp] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchMySchedule();
    }
  }, [profile]);

  const fetchMySchedule = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const now = new Date().toISOString();

      const [{ data: programs }, { data: circles }] = await Promise.all([
        supabase.from('programs').select('id').contains('member_ids', [profile.id]),
        supabase.from('circles').select('id').contains('member_ids', [profile.id]),
      ]);

      const programIds = programs?.map(p => p.id) || [];
      const circleIds = circles?.map(c => c.id) || [];

      const allUpcoming: Session[] = [];
      const allPast: Session[] = [];
      const allProposed: Session[] = [];

      const upcomingFilter = { gte: now, statuses: ['scheduled', 'in_progress'] };

      // Program sessions
      if (programIds.length > 0) {
        const [upcoming, past, proposed] = await Promise.all([
          supabase
            .from('sessions')
            .select('*, program:programs(name, slug)')
            .in('program_id', programIds)
            .gte('start_date', upcomingFilter.gte)
            .in('status', upcomingFilter.statuses)
            .order('start_date', { ascending: true }),
          supabase
            .from('sessions')
            .select('*, program:programs(name, slug)')
            .in('program_id', programIds)
            .lt('start_date', now)
            .in('status', ['completed', 'cancelled'])
            .order('start_date', { ascending: false })
            .limit(20),
          supabase
            .from('sessions')
            .select('*, program:programs(name, slug)')
            .in('program_id', programIds)
            .eq('status', 'proposed')
            .order('created_at', { ascending: false }),
        ]);
        allUpcoming.push(...(upcoming.data || []));
        allPast.push(...(past.data || []));
        allProposed.push(...(proposed.data || []));
      }

      // Circle sessions
      if (circleIds.length > 0) {
        const [upcoming, past, proposed] = await Promise.all([
          supabase
            .from('sessions')
            .select('*, circle:circles(name, slug)')
            .in('circle_id', circleIds)
            .gte('start_date', upcomingFilter.gte)
            .in('status', upcomingFilter.statuses)
            .order('start_date', { ascending: true }),
          supabase
            .from('sessions')
            .select('*, circle:circles(name, slug)')
            .in('circle_id', circleIds)
            .lt('start_date', now)
            .in('status', ['completed', 'cancelled'])
            .order('start_date', { ascending: false })
            .limit(20),
          supabase
            .from('sessions')
            .select('*, circle:circles(name, slug)')
            .in('circle_id', circleIds)
            .eq('status', 'proposed')
            .order('created_at', { ascending: false }),
        ]);
        allUpcoming.push(...(upcoming.data || []));
        allPast.push(...(past.data || []));
        allProposed.push(...(proposed.data || []));
      }

      // Sort merged upcoming list by start_date
      allUpcoming.sort((a, b) =>
        new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime()
      );

      setUpcomingSessions(allUpcoming);
      setPastSessions(allPast);
      setProposedSessions(allProposed);

      // Fetch RSVP data for all sessions
      const allIds = [...allUpcoming, ...allPast, ...allProposed].map(s => s.id);
      if (allIds.length > 0) {
        const { data: rsvpRecords } = await supabase
          .from('session_attendance')
          .select('*')
          .in('session_id', allIds)
          .eq('user_id', profile.id);

        const rsvpMap: Record<string, SessionRSVP> = {};
        rsvpRecords?.forEach(r => { rsvpMap[r.session_id] = r; });
        setRsvpData(rsvpMap);
      }
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load your schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (sessionId: string, status: 'yes' | 'no' | 'maybe') => {
    if (!profile) return;

    try {
      setSubmittingRsvp(sessionId);

      const existingRsvp = rsvpData[sessionId];

      if (existingRsvp) {
        const { error } = await supabase
          .from('session_attendance')
          .update({ rsvp_status: status, rsvp_at: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('user_id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('session_attendance')
          .insert({
            session_id: sessionId,
            user_id: profile.id,
            rsvp_status: status,
            rsvp_at: new Date().toISOString(),
            expected: status === 'yes',
            attended: false,
          });
        if (error) throw error;
      }

      toast.success(`RSVP updated to: ${status === 'yes' ? 'Attending' : status === 'no' ? 'Not Attending' : 'Maybe'}`);
      fetchMySchedule();
    } catch (error: any) {
      console.error('Error submitting RSVP:', error);
      toast.error('Failed to submit RSVP');
    } finally {
      setSubmittingRsvp(null);
    }
  };

  const getRSVPIcon = (status: string | undefined) => {
    if (status === 'yes') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'no') return <XCircle className="w-4 h-4 text-red-600" />;
    if (status === 'maybe') return <HelpCircle className="w-4 h-4 text-yellow-600" />;
    return null;
  };

  const renderSessionCard = (session: Session, isPast: boolean = false) => {
    const rsvp = rsvpData[session.id];
    const isSubmitting = submittingRsvp === session.id;
    const isProposed = !session.start_date || session.status === 'proposed';
    const entityName = session.program?.name || session.circle?.name || 'Unknown';
    const entityPath = session.program
      ? `/programs/${session.program.slug}`
      : session.circle
      ? `/circles/${session.circle.slug}`
      : null;

    return (
      <Card key={session.id} className={isPast ? 'opacity-75' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">{session.name}</CardTitle>
                {session.session_type && (
                  <Badge variant="outline" className="text-xs">
                    {session.session_type}
                  </Badge>
                )}
                {isProposed && (
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">
                    Date TBD
                  </Badge>
                )}
                {rsvp?.rsvp_status && (
                  <div className="flex items-center gap-1">
                    {getRSVPIcon(rsvp.rsvp_status)}
                  </div>
                )}
              </div>
              <CardDescription>
                {entityPath ? (
                  <Link to={entityPath} className="hover:underline">{entityName}</Link>
                ) : entityName}
              </CardDescription>
            </div>
            {!isPast && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={rsvp?.rsvp_status === 'yes' ? 'default' : 'outline'}
                  onClick={() => handleRSVP(session.id, 'yes')}
                  disabled={isSubmitting}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={rsvp?.rsvp_status === 'maybe' ? 'default' : 'outline'}
                  onClick={() => handleRSVP(session.id, 'maybe')}
                  disabled={isSubmitting}
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Maybe
                </Button>
                <Button
                  size="sm"
                  variant={rsvp?.rsvp_status === 'no' ? 'destructive' : 'outline'}
                  onClick={() => handleRSVP(session.id, 'no')}
                  disabled={isSubmitting}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  No
                </Button>
              </div>
            )}
            {isPast && rsvp?.attended && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Attended
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {isProposed
                  ? 'Date TBD'
                  : `${new Date(session.start_date!).toLocaleDateString()} at ${new Date(session.start_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                }
              </span>
              {!isProposed && (session.duration_minutes != null || session.end_date) && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {session.duration_minutes != null
                    ? `${session.duration_minutes} min`
                    : session.end_date
                    ? `${Math.round((new Date(session.end_date).getTime() - new Date(session.start_date!).getTime()) / 60000)} min`
                    : null}
                </span>
              )}
            </div>

            {session.description && (
              <p className="text-sm text-gray-600 mt-2">{session.description}</p>
            )}

            {(session.location || session.virtual_link) && (
              <div className="flex items-center gap-4 text-sm mt-2">
                {session.location && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {session.location}
                  </span>
                )}
                {session.virtual_link && (
                  <a
                    href={session.virtual_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Video className="w-4 h-4" />
                    Join Virtual Meeting
                  </a>
                )}
              </div>
            )}

            {session.max_capacity && !isPast && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                <Users className="w-4 h-4" />
                Max capacity: {session.max_capacity} attendees
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">Loading your sessions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', path: '/' },
          { label: 'My Sessions', path: '/my-sessions' },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sessions</h1>
        <p className="text-gray-600">
          View and RSVP for your sessions across programs and circles
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingSessions.length})
          </TabsTrigger>
          {proposedSessions.length > 0 && (
            <TabsTrigger value="tbd">
              Date TBD ({proposedSessions.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="past">
            Past ({pastSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No upcoming sessions</h3>
                <p className="text-gray-600 mb-4">
                  You don't have any scheduled sessions at the moment
                </p>
                <Link to="/my-programs">
                  <Button>View My Programs</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            upcomingSessions.map(session => renderSessionCard(session, false))
          )}
        </TabsContent>

        <TabsContent value="tbd" className="space-y-4">
          {proposedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No unscheduled sessions</p>
              </CardContent>
            </Card>
          ) : (
            proposedSessions.map(session => renderSessionCard(session, false))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No past sessions to show</p>
              </CardContent>
            </Card>
          ) : (
            pastSessions.map(session => renderSessionCard(session, true))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
