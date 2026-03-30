import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Calendar, Clock, MapPin, Video, Users, ExternalLink, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface SingleEventViewProps {
  eventId: string;
  isAdmin: boolean;
}

export default function SingleEventView({ eventId, isAdmin }: SingleEventViewProps) {
  const { profile } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      setEvent(eventData);

      // Fetch host
      if (eventData.host_id) {
        const { data: hostData } = await supabase
          .from('users')
          .select('*')
          .eq('id', eventData.host_id)
          .single();
        
        setHost(hostData);
      }

      // Fetch attendees
      if (eventData.attendee_ids && eventData.attendee_ids.length > 0) {
        const { data: attendeesData } = await supabase
          .from('users')
          .select('*')
          .in('id', eventData.attendee_ids);
        
        setAttendees(attendeesData || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching event:', error);
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    if (!profile || !event) return;

    try {
      const isAttending = event.attendee_ids?.includes(profile.id) || false;
      const updatedAttendees = isAttending
        ? event.attendee_ids.filter((id: string) => id !== profile.id)
        : [...(event.attendee_ids || []), profile.id];

      const { error } = await supabase
        .from('events')
        .update({ attendee_ids: updatedAttendees })
        .eq('id', event.id);

      if (error) throw error;

      setEvent({ ...event, attendee_ids: updatedAttendees });
      toast.success(isAttending ? "You've removed your RSVP" : "You've RSVP'd to this event!");
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-600">Loading event...</p>
      </div>
    );
  }

  if (!event || !profile) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No event scheduled yet.</p>
        {isAdmin && (
          <p className="text-sm text-gray-500 mt-2">
            Contact an admin to schedule the event for this meeting.
          </p>
        )}
      </div>
    );
  }

  const isAttending = event.attendee_ids?.includes(profile.id) || false;
  const isFull = event.max_attendees && (event.attendee_ids?.length || 0) >= event.max_attendees;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
            <p className="text-gray-600">{event.description}</p>
          </div>
          
          <Button
            onClick={handleRSVP}
            variant={isAttending ? 'outline' : 'default'}
            disabled={!isAttending && isFull}
          >
            {isAttending ? (
              <>
                <UserMinus className="w-4 h-4 mr-2" />
                Cancel RSVP
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                {isFull ? 'Event Full' : 'RSVP'}
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{formatDate(event.start_time)}</p>
              <p className="text-sm text-gray-600">
                <Clock className="w-4 h-4 inline mr-1" />
                {formatTime(event.start_time)}
                {event.end_time && ` - ${formatTime(event.end_time)}`}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start space-x-3">
            {event.is_virtual ? (
              <Video className="w-5 h-5 text-gray-400 mt-0.5" />
            ) : (
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {event.is_virtual ? 'Virtual Event' : event.location}
              </p>
              {event.external_link && (
                <a
                  href={event.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center mt-1"
                >
                  {event.external_platform === 'zoom' && 'Join Zoom Meeting'}
                  {event.external_platform === 'teams' && 'Join Teams Meeting'}
                  {event.external_platform === 'meet' && 'Join Google Meet'}
                  {event.external_platform === 'other' && 'Join Meeting'}
                  {!event.external_platform && 'Join Meeting'}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
            </div>
          </div>

          {/* Host */}
          {host && (
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Hosted by</p>
                <p className="font-medium text-gray-900">{host.name}</p>
              </div>
            </div>
          )}

          {/* Attendees */}
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">
                {event.attendee_ids?.length || 0} attending
                {event.max_attendees && ` / ${event.max_attendees} max`}
              </p>
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attendees.slice(0, 10).map(attendee => (
                    <div
                      key={attendee.id}
                      className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1"
                    >
                      {attendee.avatar ? (
                        <img
                          src={attendee.avatar}
                          alt={attendee.name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                          {attendee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-gray-900">{attendee.name}</span>
                    </div>
                  ))}
                  {attendees.length > 10 && (
                    <span className="text-sm text-gray-500 px-3 py-1">
                      +{attendees.length - 10} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}