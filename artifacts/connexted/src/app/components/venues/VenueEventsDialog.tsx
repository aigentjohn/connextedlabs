import { useState, useEffect } from 'react';
import { fetchVenueEvents, Venue } from '@/lib/venueHelpers';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { Calendar, Clock, Users, MapPin, Video, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface VenueEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: Venue;
}

export default function VenueEventsDialog({
  open,
  onOpenChange,
  venue
}: VenueEventsDialogProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && venue) {
      loadVenueEvents();
    }
  }, [open, venue]);

  const loadVenueEvents = async () => {
    setLoading(true);
    const data = await fetchVenueEvents(venue.id);
    setEvents(data.events);
    setSessions(data.sessions);
    setLoading(false);
  };

  const upcomingEvents = events.filter(e => isFuture(new Date(e.start_time)) || isToday(new Date(e.start_time)));
  const pastEvents = events.filter(e => isPast(new Date(e.start_time)) && !isToday(new Date(e.start_time)));
  
  const upcomingSessions = sessions.filter(s => isFuture(new Date(s.scheduled_at)) || isToday(new Date(s.scheduled_at)));
  const pastSessions = sessions.filter(s => isPast(new Date(s.scheduled_at)) && !isToday(new Date(s.scheduled_at)));

  const totalUpcoming = upcomingEvents.length + upcomingSessions.length;
  const totalPast = pastEvents.length + pastSessions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {venue.type === 'physical' ? (
              <MapPin className="w-5 h-5 text-blue-600" />
            ) : (
              <Video className="w-5 h-5 text-purple-600" />
            )}
            <DialogTitle>Events at {venue.name}</DialogTitle>
          </div>
          <DialogDescription>
            {venue.type === 'physical' 
              ? venue.city || venue.address || 'Physical location'
              : 'Virtual venue'
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            Loading events...
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming ({totalUpcoming})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({totalPast})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {totalUpcoming === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No upcoming events at this venue</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map(event => (
                      <EventCard key={event.id} item={event} type="event" />
                    ))}
                    {upcomingSessions.map(session => (
                      <EventCard key={session.id} item={session} type="session" />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="past" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {totalPast === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No past events at this venue</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastEvents.map(event => (
                      <EventCard key={event.id} item={event} type="event" isPast />
                    ))}
                    {pastSessions.map(session => (
                      <EventCard key={session.id} item={session} type="session" isPast />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventCard({ 
  item, 
  type, 
  isPast = false 
}: { 
  item: any; 
  type: 'event' | 'session'; 
  isPast?: boolean;
}) {
  const dateTime = type === 'event' ? item.start_time : item.scheduled_at;
  const title = type === 'event' ? item.title : item.title;
  const creator = item.creator;
  const circle = type === 'event' ? item.circle : item.journey;

  return (
    <Card className={isPast ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <Badge variant={type === 'event' ? 'default' : 'secondary'}>
                  {type === 'event' ? 'Event' : 'Session'}
                </Badge>
                {circle && (
                  <span className="text-xs text-gray-500">
                    {type === 'event' ? circle.name : circle.title}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(dateTime), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(dateTime), 'h:mm a')}</span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Creator */}
          {creator && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Avatar className="w-6 h-6">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="text-xs">
                  {creator.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600">
                Created by {creator.name}
              </span>
            </div>
          )}

          {/* Max Attendees */}
          {item.max_attendees && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Users className="w-4 h-4 text-gray-400" />
              <span>Max {item.max_attendees} attendees</span>
            </div>
          )}

          {/* External Registration */}
          {item.registration_url && (
            <a
              href={item.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              External Registration
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}