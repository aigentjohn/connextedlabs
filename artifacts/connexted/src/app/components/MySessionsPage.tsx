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
  start_date: string;
  duration_minutes: number;
  location: string;
  virtual_link: string;
  status: string;
  max_capacity: number;
  program_id: string;
  program?: { name: string; slug: string };
}

interface CircleEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  meeting_link: string;
  circle_ids: string[];
  circles?: { name: string }[];
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
  const [upcomingEvents, setUpcomingEvents] = useState<CircleEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<CircleEvent[]>([]);
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

      // Get all programs where user is a member
      const { data: programs } = await supabase
        .from('programs')
        .select('id')
        .contains('member_ids', [profile.id]);

      const programIds = programs?.map(p => p.id) || [];

      // Get all circles where user is a member
      const { data: circles } = await supabase
        .from('circles')
        .select('id')
        .contains('member_ids', [profile.id]);

      const circleIds = circles?.map(c => c.id) || [];

      // Fetch upcoming PROGRAM SESSIONS (attendance-tracked)
      if (programIds.length > 0) {
        const { data: upcomingSessionsData, error: upcomingSessionsError } = await supabase
          .from('sessions')
          .select(`
            *,
            program:programs(name, slug)
          `)
          .in('program_id', programIds)
          .gte('start_date', now)
          .eq('status', 'scheduled')
          .order('start_date', { ascending: true });

        if (upcomingSessionsError) throw upcomingSessionsError;
        setUpcomingSessions(upcomingSessionsData || []);

        // Fetch past PROGRAM SESSIONS
        const { data: pastSessionsData, error: pastSessionsError } = await supabase
          .from('sessions')
          .select(`
            *,
            program:programs(name, slug)
          `)
          .in('program_id', programIds)
          .lt('start_date', now)
          .in('status', ['completed', 'cancelled'])
          .order('start_date', { ascending: false })
          .limit(20);

        if (pastSessionsError) throw pastSessionsError;
        setPastSessions(pastSessionsData || []);

        // Fetch session attendance/RSVP data
        const allSessionIds = [...(upcomingSessionsData || []), ...(pastSessionsData || [])].map(s => s.id);
        if (allSessionIds.length > 0) {
          const { data: rsvpRecords } = await supabase
            .from('session_attendance')
            .select('*')
            .in('session_id', allSessionIds)
            .eq('user_id', profile.id);

          const rsvpMap: Record<string, SessionRSVP> = {};
          rsvpRecords?.forEach(record => {
            rsvpMap[record.session_id] = record;
          });
          setRsvpData(rsvpMap);
        }
      }

      // Fetch upcoming CIRCLE EVENTS (RSVP-based)
      if (circleIds.length > 0) {
        const { data: upcomingEventsData, error: upcomingEventsError } = await supabase
          .from('events')
          .select('*')
          .overlaps('circle_ids', circleIds)
          .gte('start_time', now)
          .order('start_time', { ascending: true });

        if (upcomingEventsError) throw upcomingEventsError;
        setUpcomingEvents(upcomingEventsData || []);

        // Fetch past CIRCLE EVENTS
        const { data: pastEventsData, error: pastEventsError } = await supabase
          .from('events')
          .select('*')
          .overlaps('circle_ids', circleIds)
          .lt('start_time', now)
          .order('start_time', { ascending: false })
          .limit(20);

        if (pastEventsError) throw pastEventsError;
        setPastEvents(pastEventsData || []);
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

      // Check if RSVP already exists
      const existingRsvp = rsvpData[sessionId];

      if (existingRsvp) {
        // Update existing RSVP
        const { error } = await supabase
          .from('session_attendance')
          .update({
            rsvp_status: status,
            rsvp_at: new Date().toISOString()
          })
          .eq('session_id', sessionId)
          .eq('user_id', profile.id);

        if (error) throw error;
      } else {
        // Create new RSVP
        const { error } = await supabase
          .from('session_attendance')
          .insert({
            session_id: sessionId,
            user_id: profile.id,
            rsvp_status: status,
            rsvp_at: new Date().toISOString(),
            expected: status === 'yes',
            attended: false
          });

        if (error) throw error;
      }

      toast.success(`RSVP updated to: ${status === 'yes' ? 'Attending' : status === 'no' ? 'Not Attending' : 'Maybe'}`);
      
      // Refresh data
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
    const sessionDate = new Date(session.start_date);
    const entityName = session.program?.name || 'Unknown';

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
                {rsvp?.rsvp_status && (
                  <div className="flex items-center gap-1">
                    {getRSVPIcon(rsvp.rsvp_status)}
                  </div>
                )}
              </div>
              <CardDescription>
                {entityName}
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
                {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {session.duration_minutes} min
              </span>
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
          { label: 'My Sessions', path: '/my-sessions' }
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sessions</h1>
        <p className="text-gray-600">
          View and RSVP for your upcoming sessions
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingSessions.length})
          </TabsTrigger>
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
                  <Button>
                    View My Programs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            upcomingSessions.map(session => renderSessionCard(session, false))
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