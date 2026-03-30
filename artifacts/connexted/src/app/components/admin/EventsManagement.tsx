import { notifyEventCancelled } from '@/lib/notificationHelpers';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Search, Trash2, Download, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import CreateEventDialog from '@/app/components/calendar/CreateEventDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  external_link: string | null;
  host_id: string;
  attendee_ids: string[];
  circle_ids: string[] | null;
  container_id: string | null;
  container_type: string | null;
  access_level: string;
  tags: string[];
  created_at: string;
}

export default function EventsManagement() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('start_time', { ascending: false });

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);
        
        // Fetch circles for display
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name')
          .eq('community_id', profile.community_id);
        setCircles(circlesData || []);
        
        // Fetch users for host/attendee info
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('community_id', profile.community_id);
        setUsers(usersData || []);
        
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);
  
  const exportToJSON = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `events-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    try {
      // Send cancellation notifications before deleting
      await notifyEventCancelled(eventId, eventTitle, 'This event has been deleted by an administrator.');
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      setEvents(events.filter(e => e.id !== eventId));
      toast.success(`Deleted event: ${eventTitle}`);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const getHostName = (hostId: string) => {
    const host = users.find(u => u.id === hostId);
    return host ? host.name : 'Unknown';
  };

  const getCircleNames = (circleIds: string[] | null) => {
    if (!circleIds || circleIds.length === 0) return 'No circles';
    return circleIds.map(id => {
      const circle = circles.find(c => c.id === id);
      return circle ? circle.name : id;
    }).join(', ');
  };
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_time) > new Date());
  const pastEvents = events.filter(e => new Date(e.end_time || e.start_time) < new Date());
  const ongoingEvents = events.filter(e => {
    const now = new Date();
    return new Date(e.start_time) <= now && (!e.end_time || new Date(e.end_time) >= now);
  });

  // Calculate average attendees
  const avgAttendees = events.length > 0 
    ? Math.round(events.reduce((acc, e) => acc + (e.attendee_ids?.length || 0), 0) / events.length)
    : 0;

  // Filter events based on active tab and search query
  let filteredEvents = events;
  
  if (activeTab === 'upcoming') {
    filteredEvents = upcomingEvents;
  } else if (activeTab === 'past') {
    filteredEvents = pastEvents;
  }
  
  if (searchQuery) {
    filteredEvents = filteredEvents.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Events Management' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Events Management</h1>
          <p className="text-gray-600">Manage all events across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{upcomingEvents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Past</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{pastEvents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAttendees}</div>
          </CardContent>
        </Card>
      </div>

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({events.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No events found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map(event => {
                const isPast = new Date(event.start_time) < now;
                
                return (
                  <Card key={event.id} className={isPast ? 'opacity-75' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold">{event.title}</h3>
                            {isPast && <Badge variant="secondary">Past</Badge>}
                          </div>
                          
                          <p className="text-gray-700 mb-3">{event.description}</p>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              {format(new Date(event.start_time), 'PPp')}
                            </div>
                            {event.location && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                {event.location}
                              </div>
                            )}
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              {event.attendee_ids?.length || 0} attendees
                            </div>
                            <div>Host: {getHostName(event.host_id)}</div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {getCircleNames(event.circle_ids)}
                            </Badge>
                            {event.container_type && (
                              <Badge variant="outline" className="capitalize">
                                {event.container_type}
                              </Badge>
                            )}
                            {event.tags?.map(tag => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Link to="/calendar">
                            <Button variant="outline" size="sm" title="View in Calendar">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditingEvent(event)}
                            title="Edit event"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" title="Delete event">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{event.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteEvent(event.id, event.title)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <CreateEventDialog
          isOpen={!!editingEvent}
          event={editingEvent}
          onClose={() => {
            setEditingEvent(null);
            // Refresh events after editing
            if (profile) {
              supabase
                .from('events')
                .select('*')
                .order('start_time', { ascending: false })
                .then(({ data }) => {
                  if (data) setEvents(data);
                });
            }
          }}
        />
      )}
    </div>
  );
}