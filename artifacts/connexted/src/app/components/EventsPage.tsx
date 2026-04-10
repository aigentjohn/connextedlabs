import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Search, Lock, ExternalLink, List, CalendarDays, User, Download, Plus } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import CreateEventDialog from '@/app/components/calendar/CreateEventDialog';
import { RSVPActions } from '@/app/components/calendar/RSVPActions';
import { CalendarStatus } from '@/app/components/calendar/StatusBadge';
import { EventAttendeesDialog } from '@/app/components/calendar/EventAttendeesDialog';
import { downloadICS, UnifiedCalendarItem, getUserEventStatus } from '@/lib/calendarHelpers';
import { toast } from 'sonner';

// Extract EventCard as a separate component to fix React Hooks violation
interface EventCardProps {
  event: any;
  users: any[];
  circles: any[];
  profile: any;
  canAccessContent: (accessLevel?: string) => boolean;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

function EventCard({ event, users, circles, profile, canAccessContent, setRefreshKey }: EventCardProps) {
  const [reminderPreference, setReminderPreference] = useState('none');
  const [showAttendees, setShowAttendees] = useState(false);
  const isHost = profile.id === event.host_id;
  const now = new Date();
  const host = users.find(u => u.id === event.host_id);
  const eventCircles = event.circle_ids
    ?.map((id: string) => circles.find(c => c.id === id))
    .filter(Boolean) || [];
  const accessible = canAccessContent(event.access_level);
  const isPast = new Date(event.start_time) < now;
  
  // Get user status for this event
  const userStatus = getUserEventStatus(event, profile.id, isPast);

  return (
    <Card key={event.id} className={!accessible ? 'opacity-60' : isPast ? 'opacity-80' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          {/* Date Badge */}
          <div className="flex-shrink-0 text-center bg-indigo-100 rounded-lg p-3 w-16">
            <div className="text-2xl font-bold text-indigo-600">
              {new Date(event.start_time).getDate()}
            </div>
            <div className="text-xs text-indigo-600 uppercase">
              {new Date(event.start_time).toLocaleString('default', { month: 'short' })}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-medium text-lg">{event.title}</h3>
              {!accessible && <Lock className="w-4 h-4 text-gray-400" />}
              {isPast && <Badge variant="outline">Past</Badge>}
              {event.signups_closed && <Badge variant="outline" className="bg-gray-100">Closed</Badge>}
            </div>

            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
              {event.description}
            </p>

            {/* Event Details */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {new Date(event.start_time).toLocaleString()}
              </div>
              {event.location && (
                <>
                  <span>•</span>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {event.location}
                  </div>
                </>
              )}
              {host && (
                <>
                  <span>•</span>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {host.name}
                  </div>
                </>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {eventCircles.map((circle: any) => (
                <Link key={circle.id} to={`/circles/${circle.id}`}>
                  <Badge variant="outline" className="hover:bg-gray-100">
                    {circle.name}
                  </Badge>
                </Link>
              ))}
              {event.access_level && event.access_level !== 'public' && (
                <Badge variant="secondary" className="capitalize">
                  {event.access_level}
                </Badge>
              )}
              {event.tags && event.tags.length > 0 && event.tags.map((tag: string) => (
                <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="text-xs bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
                    <span className="mr-1">#</span>
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>

            {/* RSVP Actions */}
            {accessible && (
              <div className="space-y-3 pt-3 border-t">
                <RSVPActions
                  itemId={event.id}
                  itemType="event"
                  currentStatus={userStatus}
                  onRSVPChange={() => setRefreshKey(prev => prev + 1)}
                  onManageAttendees={isHost ? () => setShowAttendees(true) : undefined}
                  registrationUrl={event.registration_url}
                  agendaUrl={event.agenda_url}
                  signupsClosed={event.signups_closed}
                />
              </div>
            )}

            {/* Attendees Dialog (host only) */}
            {isHost && showAttendees && (
              <EventAttendeesDialog
                eventId={event.id}
                eventTitle={event.title}
                open={showAttendees}
                onClose={() => setShowAttendees(false)}
              />
            )}

            {/* Calendar Download - separate section */}
            {accessible && !isPast && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Add to Calendar</p>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700">Request Reminder</Label>
                    <RadioGroup value={reminderPreference} onValueChange={setReminderPreference}>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="none" id={`none-${event.id}`} />
                          <Label htmlFor={`none-${event.id}`} className="font-normal cursor-pointer">
                            None
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1hour" id={`1hour-${event.id}`} />
                          <Label htmlFor={`1hour-${event.id}`} className="font-normal cursor-pointer">
                            1 hour before
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1day" id={`1day-${event.id}`} />
                          <Label htmlFor={`1day-${event.id}`} className="font-normal cursor-pointer">
                            1 day before
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      // Convert event to UnifiedCalendarItem format
                      const calendarItem: UnifiedCalendarItem = {
                        id: event.id,
                        type: 'event',
                        source: 'platform',
                        title: event.title,
                        description: event.description,
                        start_date: event.start_time,
                        end_date: event.end_time,
                        location: event.location,
                        virtual_link: event.external_link,
                        is_virtual: !!event.external_link,
                        event_type: event.event_type,
                        circle_ids: event.circle_ids,
                        host_id: event.host_id,
                        attendee_ids: event.attendee_ids,
                        max_attendees: event.max_attendees,
                        registration_url: event.registration_url,
                        agenda_url: event.agenda_url,
                        signups_closed: event.signups_closed,
                        userStatus: userStatus,
                        created_at: event.created_at
                      };
                      downloadICS(calendarItem, reminderPreference);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download .ics
                  </Button>
                  {event.external_link && !event.registration_url && (
                    <a href={event.external_link} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Join Meeting
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Extract EventFilters as a separate component
interface EventFiltersProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  sortBy: 'soonest' | 'most-liked';
  setSortBy: React.Dispatch<React.SetStateAction<'soonest' | 'most-liked'>>;
}

function EventFilters({ searchQuery, setSearchQuery, sortBy, setSortBy }: EventFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">Sort:</span>
        <Button variant={sortBy === 'soonest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('soonest')}>Soonest</Button>
        <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
      </div>
    </div>
  );
}

// Extract EventCalendarToggle as a separate component
interface EventCalendarToggleProps {
  events: any[];
  circles: any[];
  users: any[];
  profile: any;
  canAccessContent: (accessLevel?: string) => boolean;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  sortBy: 'soonest' | 'most-liked';
  likeCountsMap: Record<string, number>;
}

function EventCalendarToggle({ events, circles, users, profile, canAccessContent, setRefreshKey, sortBy, likeCountsMap }: EventCalendarToggleProps) {
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_time) >= now);
  const pastEvents = events.filter(e => new Date(e.start_time) < now);
  const myEvents = events.filter(e => e.host_id === profile.id);

  // Sort events
  const sortUpcoming = (evts: typeof events) => {
    if (sortBy === 'most-liked') return [...evts].sort((a, b) => (likeCountsMap[b.id] || 0) - (likeCountsMap[a.id] || 0));
    return [...evts].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };
  
  const sortPast = (evts: typeof events) => {
    if (sortBy === 'most-liked') return [...evts].sort((a, b) => (likeCountsMap[b.id] || 0) - (likeCountsMap[a.id] || 0));
    return [...evts].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  };

  // Group events by month for calendar view
  const groupEventsByMonth = (events: typeof events) => {
    const groups: { [key: string]: typeof events } = {};
    events.forEach(event => {
      const date = new Date(event.start_time);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });
    return groups;
  };

  const upcomingByMonth = groupEventsByMonth(sortUpcoming(upcomingEvents));

  return (
    <Tabs defaultValue="calendar" className="w-full">
      <TabsList>
        <TabsTrigger value="calendar">
          <CalendarDays className="w-4 h-4 mr-1" />
          Calendar View
        </TabsTrigger>
        <TabsTrigger value="list">
          <List className="w-4 h-4 mr-1" />
          List View
          <Badge variant="secondary" className="ml-2">{upcomingEvents.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="my-events">
          <User className="w-4 h-4 mr-1" />
          My Events
          <Badge variant="secondary" className="ml-2">{myEvents.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="past">
          Past Events
          <Badge variant="secondary" className="ml-2">{pastEvents.length}</Badge>
        </TabsTrigger>
      </TabsList>

      {/* Calendar View Tab */}
      <TabsContent value="calendar" className="space-y-6 mt-6">
        {Object.keys(upcomingByMonth).length === 0 ? (
          <Card>
            <CardContent className="py-6 text-gray-500">
              No upcoming events
            </CardContent>
          </Card>
        ) : (
          Object.entries(upcomingByMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([monthKey, monthEvents]) => {
              const [year, month] = monthKey.split('-');
              const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { 
                month: 'long', 
                year: 'numeric' 
              });

              return (
                <div key={monthKey}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    {monthName}
                  </h2>
                  <div className="space-y-3">
                    {monthEvents.map(event => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        users={users} 
                        circles={circles} 
                        profile={profile} 
                        canAccessContent={canAccessContent} 
                        setRefreshKey={setRefreshKey} 
                      />
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </TabsContent>

      {/* List View Tab */}
      <TabsContent value="list" className="space-y-4 mt-6">
        {sortUpcoming(upcomingEvents).length === 0 ? (
          <Card>
            <CardContent className="py-6 text-gray-500">
              No upcoming events
            </CardContent>
          </Card>
        ) : (
          sortUpcoming(upcomingEvents).map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              users={users} 
              circles={circles} 
              profile={profile} 
              canAccessContent={canAccessContent} 
              setRefreshKey={setRefreshKey} 
            />
          ))
        )}
      </TabsContent>

      {/* My Events Tab */}
      <TabsContent value="my-events" className="space-y-4 mt-6">
        {myEvents.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-gray-500">
              You haven't created any events yet
            </CardContent>
          </Card>
        ) : (
          sortUpcoming(myEvents).map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              users={users} 
              circles={circles} 
              profile={profile} 
              canAccessContent={canAccessContent} 
              setRefreshKey={setRefreshKey} 
            />
          ))
        )}
      </TabsContent>

      {/* Past Events Tab */}
      <TabsContent value="past" className="space-y-4 mt-6">
        {sortPast(pastEvents).length === 0 ? (
          <Card>
            <CardContent className="py-6 text-gray-500">
              No past events
            </CardContent>
          </Card>
        ) : (
          sortPast(pastEvents).map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              users={users} 
              circles={circles} 
              profile={profile} 
              canAccessContent={canAccessContent} 
              setRefreshKey={setRefreshKey} 
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

export default function EventsPage({ meetupId }: { meetupId?: string }) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'soonest' | 'most-liked'>('soonest');
  const [likeCountsMap, setLikeCountsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile, refreshKey]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Platform admins see ALL events, regular users filtered by circles
      const isPlatformAdmin = profile?.role === 'admin' || profile?.role === 'super';

      // Fetch circles (for displaying circle names)
      const { data: circlesData } = await supabase
        .from('circles')
        .select('*')
        .eq('community_id', profile?.community_id);

      // Get user's circle IDs (if not platform admin)
      let userCircleIds: string[] = [];
      if (!isPlatformAdmin && circlesData) {
        userCircleIds = circlesData
          .filter(c => c.member_ids?.includes(profile?.id))
          .map(c => c.id);
      }

      // Fetch events accessible to user (public or in their circles)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('community_id', profile?.community_id)
        .order('start_time');

      if (eventsError) throw eventsError;

      // Filter events based on access
      const accessibleEvents = (eventsData || []).filter(event => {
        // If meetup context, filter by meetup
        if (meetupId) {
          // TODO: Add meetup filtering logic when meetups are migrated
          return false;
        }

        // Exclude ticketed (external RSVP) events — those appear on TicketedEventsPage
        if (event.rsvp_type === 'external') {
          return false;
        }
        
        // Platform admins see ALL events
        if (isPlatformAdmin) {
          return true;
        }
        
        // Show events with no circle_ids (platform-wide) or events in user's circles
        if (!event.circle_ids || event.circle_ids.length === 0) {
          return true;
        }
        
        return event.circle_ids.some((circleId: string) => userCircleIds.includes(circleId));
      });

      // Fetch users for host information
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('community_id', profile?.community_id);

      setEvents(accessibleEvents);
      setCircles(circlesData || []);
      setUsers(usersData || []);
      setLoading(false);

      // Fetch likes for all events
      if (accessibleEvents.length > 0) {
        const ids = accessibleEvents.map((e: any) => e.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'event')
          .in('content_id', ids);

        const counts: Record<string, number> = {};
        (likesData || []).forEach((like: { content_id: string }) => {
          counts[like.content_id] = (counts[like.content_id] || 0) + 1;
        });
        setLikeCountsMap(counts);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: 'Open Events' }]}
          icon={Calendar}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          title="Open Events"
          description="Loading events..."
        />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  const getEventLocation = (event: any) => {
    if (event.location) return event.location;
    if (event.external_link) return 'Virtual';
    return 'TBA';
  };

  const getEventCircles = (event: any) => {
    return event.circle_ids
      .map((id: string) => circles.find((c: any) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'General';
  };

  const handleAttendEvent = async (eventId: string, event: any) => {
    // Add logic to handle attending an event
  };

  // Filter events based on search
  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if user can access content
  const canAccessContent = (accessLevel?: string) => {
    if (!accessLevel || accessLevel === 'public') return true;
    if (accessLevel === 'member' && profile.membership_tier !== 'free') return true;
    if (accessLevel === 'premium' && profile.membership_tier === 'premium') return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Open Events' }]}
        icon={Calendar}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title="Open Events"
        description="Community events and gatherings"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        }
      />

      {/* Event Filters */}
      <EventFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Event Calendar Toggle */}
      <EventCalendarToggle
        events={filteredEvents}
        circles={circles}
        users={users}
        profile={profile}
        canAccessContent={canAccessContent}
        setRefreshKey={setRefreshKey}
        sortBy={sortBy}
        likeCountsMap={likeCountsMap}
      />

      {/* Create Event Dialog */}
      {showCreateDialog && (
        <CreateEventDialog 
          isOpen={showCreateDialog} 
          onClose={() => {
            setShowCreateDialog(false);
            setRefreshKey(prev => prev + 1); // Trigger re-render
          }} 
        />
      )}
    </div>
  );
}