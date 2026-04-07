import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Ticket, Calendar, MapPin, Clock, Search, ExternalLink, Plus, User } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import CreateEventDialog from '@/app/components/calendar/CreateEventDialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

function TicketedEventCard({ event, users, circles }: { event: any; users: any[]; circles: any[] }) {
  const host = users.find(u => u.id === event.host_id);
  const eventCircles = event.circle_ids
    ?.map((id: string) => circles.find((c: any) => c.id === id))
    .filter(Boolean) || [];
  const isPast = new Date(event.start_time) < new Date();

  return (
    <Card className={isPast ? 'opacity-70' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 text-center bg-amber-100 rounded-lg p-3 w-16">
            <div className="text-2xl font-bold text-amber-600">
              {new Date(event.start_time).getDate()}
            </div>
            <div className="text-xs text-amber-500 uppercase">
              {new Date(event.start_time).toLocaleString('default', { month: 'short' })}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <Link
                  to={`/events/${event.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  {event.title}
                </Link>
                {isPast && (
                  <Badge variant="outline" className="ml-2 text-gray-500">Past</Badge>
                )}
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex-shrink-0">
                <Ticket className="w-3 h-3 mr-1" />
                Ticketed
              </Badge>
            </div>

            {event.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.location}
                </span>
              )}
              {host && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {host.name}
                </span>
              )}
            </div>

            {eventCircles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {eventCircles.map((circle: any) => (
                  <Badge key={circle.id} variant="outline" className="text-xs">
                    {circle.name}
                  </Badge>
                ))}
              </div>
            )}

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {event.tags.map((tag: string) => (
                  <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-gray-200">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {event.external_rsvp_url && !isPast && (
              <div className="mt-3">
                <a
                  href={event.external_rsvp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="gap-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Register / Get Tickets
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TicketedEventsPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile, refreshKey]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const isPlatformAdmin = profile?.role === 'admin' || profile?.role === 'super';

      const { data: circlesData } = await supabase
        .from('circles')
        .select('*')
        .eq('community_id', profile?.community_id);

      let userCircleIds: string[] = [];
      if (!isPlatformAdmin && circlesData) {
        userCircleIds = circlesData
          .filter(c => c.member_ids?.includes(profile?.id))
          .map(c => c.id);
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('community_id', profile?.community_id)
        .eq('rsvp_type', 'external')
        .order('start_time');

      if (eventsError) throw eventsError;

      const accessibleEvents = (eventsData || []).filter(event => {
        if (isPlatformAdmin) return true;
        if (!event.circle_ids || event.circle_ids.length === 0) return true;
        return event.circle_ids.some((circleId: string) => userCircleIds.includes(circleId));
      });

      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('community_id', profile?.community_id);

      setEvents(accessibleEvents);
      setCircles(circlesData || []);
      setUsers(usersData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ticketed events:', error);
      toast.error('Failed to load ticketed events');
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: 'Ticketed Events' }]}
          icon={Ticket}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="Ticketed Events"
          description="Loading events..."
        />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const upcomingEvents = filteredEvents.filter(e => new Date(e.start_time) >= now);
  const pastEvents = filteredEvents.filter(e => new Date(e.start_time) < now);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Ticketed Events' }]}
        icon={Ticket}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        title="Ticketed Events"
        description="Events with external registration and ticketing"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search ticketed events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming</h2>
          {upcomingEvents.map(event => (
            <TicketedEventCard key={event.id} event={event} users={users} circles={circles} />
          ))}
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 text-gray-500">Past Events</h2>
          {pastEvents.map(event => (
            <TicketedEventCard key={event.id} event={event} users={users} circles={circles} />
          ))}
        </div>
      )}

      {filteredEvents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Ticketed Events</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? 'No ticketed events match your search.'
                : 'No events with external registration yet. Create one to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showCreateDialog && (
        <CreateEventDialog
          isOpen={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
