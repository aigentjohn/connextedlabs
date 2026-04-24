import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, MapPin, Users, Video, ExternalLink, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import CreateEventDialog from '@/app/components/calendar/CreateEventDialog';
import CircleSessionsPanel from '@/app/components/circle/CircleSessionsPanel';
import { toast } from 'sonner';

interface CircleCalendarProps {
  circleId: string;
  isAdmin: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string;
  is_virtual: boolean;
  external_link: string | null;
  external_platform: string | null;
  host_id: string;
  attendee_ids: string[];
  max_attendees: number | null;
  tags: string[];
  host?: {
    name: string;
  };
}

export default function CircleCalendar({ circleId, isAdmin }: CircleCalendarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!profile) return;

    const fetchEvents = async () => {
      try {
        setLoading(true);

        // Fetch events for this circle with host info
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            host:users!events_host_id_fkey(name)
          `)
          .contains('circle_ids', [circleId])
          .order('start_time');

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [profile, circleId]);
  
  if (!profile) return null;

  const handleRSVP = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    try {
      const isAttending = event.attendee_ids.includes(profile.id);
      const updatedAttendees = isAttending
        ? event.attendee_ids.filter(id => id !== profile.id)
        : [...event.attendee_ids, profile.id];

      const { error } = await supabase
        .from('events')
        .update({ attendee_ids: updatedAttendees })
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvents(events.map(e => e.id === eventId ? { ...e, attendee_ids: updatedAttendees } : e));
      toast.success(isAttending ? 'RSVP cancelled' : 'RSVP confirmed!');
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading events...</p>
      </div>
    );
  }

  if (events.length === 0 && !isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No events scheduled for this circle</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Sessions panel — planned/proposed gatherings (supports Date TBD) */}
      <CircleSessionsPanel circleId={circleId} isAdmin={isAdmin} />

      {/* Divider before scheduled events */}
      {events.length > 0 && (
        <div className="flex items-center gap-3 pt-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Events</h3>
        </div>
      )}

      {/* Header */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Circle Event
          </Button>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No events scheduled yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map(event => {
            const isAttending = event.attendee_ids.includes(profile.id);
            const startDate = parseISO(event.start_time);
            const endDate = event.end_time ? parseISO(event.end_time) : null;
            const isFull = event.max_attendees ? event.attendee_ids.length >= event.max_attendees : false;

            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
                      <p className="text-gray-600 text-sm">{event.description}</p>
                    </div>
                    <Badge variant={event.event_type === 'workshop' ? 'default' : 'secondary'}>
                      {event.event_type}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {/* Date & Time */}
                    <div className="flex items-start space-x-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</div>
                        <div className="text-gray-600 flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {endDate ? (
                            `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
                          ) : (
                            format(startDate, 'h:mm a')
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center space-x-2 text-sm">
                      {event.is_virtual ? (
                        <>
                          <Video className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Virtual Event</span>
                          {event.external_platform && (
                            <Badge variant="outline" className="ml-2">
                              {event.external_platform}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">{event.location}</span>
                        </>
                      )}
                    </div>

                    {/* External Link */}
                    {event.external_link && (
                      <a
                        href={event.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Join Event Link</span>
                      </a>
                    )}

                    {/* Tags */}
                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Attendees & RSVP */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>
                          {event.attendee_ids.length} attending
                          {event.max_attendees && ` / ${event.max_attendees}`}
                        </span>
                      </div>

                      <Button
                        variant={isAttending ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => handleRSVP(event.id)}
                        disabled={!isAttending && isFull}
                      >
                        {isAttending ? 'Cancel RSVP' : isFull ? 'Full' : 'RSVP'}
                      </Button>
                    </div>

                    {/* Host */}
                    {event.host && (
                      <div className="text-xs text-gray-500">
                        Hosted by {event.host.name}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Event Dialog */}
      {showCreateDialog && (
        <CreateEventDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          circleId={circleId}
        />
      )}
    </div>
  );
}