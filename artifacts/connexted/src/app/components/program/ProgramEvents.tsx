import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Calendar, Plus, MapPin, Clock, Users, Filter, Video, BookOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isFuture } from 'date-fns';

interface ProgramEventsProps {
  programId: string;
  isAdmin: boolean;
  selectedJourneyId?: string | null;
}

interface Session {
  id: string;
  program_id: string;
  journey_id: string | null;
  name: string;
  description: string;
  start_date: string | null;   // null = proposed / Date TBD
  end_date: string | null;
  duration_minutes: number | null;
  location: string | null;
  virtual_link: string | null;
  session_type: string;
  status: string;
  created_at: string;
  attendance_count?: number;
}

interface Journey {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

export default function ProgramEvents({ programId, isAdmin, selectedJourneyId }: ProgramEventsProps) {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'proposed'>('upcoming');

  // Fetch journeys and sessions
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch journeys for the program
      const { data: journeysData, error: journeysError } = await supabase
        .from('program_journeys')
        .select('id, title, description, order_index')
        .eq('program_id', programId)
        .order('order_index', { ascending: true });

      if (journeysError) throw journeysError;
      setJourneys(journeysData || []);

      // Fetch sessions
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('program_id', programId)
        .order('start_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Get attendance counts for each session
      const sessionsWithAttendance = await Promise.all(
        (data || []).map(async (session) => {
          const { count } = await supabase
            .from('session_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('attended', true);
          
          return { ...session, attendance_count: count || 0 };
        })
      );

      // Apply time filter
      let filteredSessions = sessionsWithAttendance;
      if (filter === 'proposed') {
        // Only sessions with no confirmed date
        filteredSessions = sessionsWithAttendance.filter(s => !s.start_date || s.status === 'proposed');
      } else if (filter === 'upcoming') {
        // Scheduled future sessions + proposed (so members see the full roadmap)
        filteredSessions = sessionsWithAttendance.filter(s =>
          !s.start_date || s.status === 'proposed' || isFuture(new Date(s.start_date)) || s.status === 'scheduled'
        );
      } else if (filter === 'past') {
        filteredSessions = sessionsWithAttendance.filter(s =>
          s.start_date && isPast(new Date(s.start_date)) && s.status !== 'scheduled'
        );
      }

      setSessions(filteredSessions as Session[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [programId, selectedJourneyId, filter]);

  // Group sessions by journey
  const groupSessionsByJourney = () => {
    const grouped: { [key: string]: Session[] } = {};
    const unassignedSessions: Session[] = [];

    sessions.forEach(session => {
      if (session.journey_id) {
        if (!grouped[session.journey_id]) {
          grouped[session.journey_id] = [];
        }
        grouped[session.journey_id].push(session);
      } else {
        unassignedSessions.push(session);
      }
    });

    return { grouped, unassignedSessions };
  };

  const { grouped: groupedSessions, unassignedSessions } = groupSessionsByJourney();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Journey Filter Badge (if active) */}
      {selectedJourneyId && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filtered to selected journey</span>
        </div>
      )}

      {/* Header with Filters and Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'proposed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('proposed')}
              className={filter !== 'proposed' ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : ''}
            >
              Date TBD
            </Button>
            <Button
              variant={filter === 'past' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('past')}
            >
              Past
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
          </div>
        </div>
        {isAdmin && (
          <Link to={`/program-admin/${programId}/sessions`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Session
            </Button>
          </Link>
        )}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 mb-4">No {filter === 'all' ? '' : filter} sessions</p>
            {isAdmin && (
              <Link to={`/program-admin/${programId}/sessions`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add the first session
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Sessions grouped by Journey */}
          {journeys.map(journey => {
            const journeySessions = groupedSessions[journey.id] || [];
            if (journeySessions.length === 0) return null;

            return (
              <div key={journey.id} className="space-y-4">
                {/* Journey Header */}
                <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{journey.title}</h3>
                    {journey.description && (
                      <p className="text-sm text-gray-600">{journey.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {journeySessions.length} {journeySessions.length === 1 ? 'session' : 'sessions'}
                  </Badge>
                </div>

                {/* Journey Sessions */}
                <div className="grid gap-4 md:grid-cols-2">
                  {journeySessions.map((session) => (
                    <SessionCard key={session.id} session={session} programId={programId} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unassigned Sessions */}
          {unassignedSessions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unassigned Sessions</h3>
                  <p className="text-sm text-gray-600">Sessions not linked to a specific journey</p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {unassignedSessions.length} {unassignedSessions.length === 1 ? 'session' : 'sessions'}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {unassignedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} programId={programId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Session Card Component (extracted for reuse)
function SessionCard({ session, programId }: { session: Session; programId: string }) {
  const isProposed = !session.start_date || session.status === 'proposed';
  const startDate = session.start_date ? new Date(session.start_date) : null;
  const endDate = session.end_date ? new Date(session.end_date) : null;
  const isUpcoming = startDate ? isFuture(startDate) : false;

  const sessionTypeLabel: Record<string, string> = {
    meeting: 'Meeting', workshop: 'Workshop', webinar: 'Webinar',
    training: 'Training', social: 'Social', standup: 'Standup',
    class: 'Class', other: 'Other',
  };

  return (
    <Link to={`/programs/${programId}/events/${session.id}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${isProposed ? 'border-dashed border-gray-300' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg text-gray-900 hover:text-indigo-600">
              {session.name}
            </h3>
            <div className="flex gap-1 shrink-0 flex-wrap justify-end">
              {isProposed && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                  Date TBD
                </Badge>
              )}
              {!isProposed && isUpcoming && (
                <Badge variant="default" className="text-xs">Upcoming</Badge>
              )}
              {session.session_type && session.session_type !== 'other' && (
                <Badge variant="secondary" className="text-xs">
                  {sessionTypeLabel[session.session_type] ?? session.session_type}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {session.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {session.description}
            </p>
          )}
          <div className="space-y-2 text-sm text-gray-600">
            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              {startDate ? (
                <span>{format(startDate, 'MMM d, yyyy')}</span>
              ) : (
                <span className="text-amber-600 italic">Date to be announced</span>
              )}
            </div>

            {/* Time — only show when date is set */}
            {startDate && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {format(startDate, 'h:mm a')} EST
                  {endDate && ` – ${format(endDate, 'h:mm a')}`}
                  {!endDate && session.duration_minutes && ` (${session.duration_minutes} min)`}
                </span>
              </div>
            )}

            {session.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="line-clamp-1">{session.location}</span>
              </div>
            )}
            {session.virtual_link && (
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-gray-400" />
                <span className="text-indigo-600">Virtual</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{session.attendance_count || 0} participants</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}