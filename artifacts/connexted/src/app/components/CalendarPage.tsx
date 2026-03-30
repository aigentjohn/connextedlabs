import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { format, parseISO, isFuture, isPast, isToday } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  Download,
  Info,
  FolderKanban,
  Globe,
  Filter,
  SortAsc
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import { PageHeader } from '@/app/components/shared/PageHeader';
import CreateEventDialog from '@/app/components/calendar/CreateEventDialog';
import { StatusBadge, CalendarStatus } from '@/app/components/calendar/StatusBadge';
import { RSVPActions } from '@/app/components/calendar/RSVPActions';
import EventRSVPButtons from '@/app/components/calendar/EventRSVPButtons';
import EventRSVPCounts from '@/app/components/calendar/EventRSVPCounts';
import SaveTheDateBadge, { 
  getSaveTheDateCardClass, 
  formatEventTime, 
  formatEventLocation 
} from '@/app/components/calendar/SaveTheDateBadge';
import { downloadICS, 
  UnifiedCalendarItem, 
  fetchUnifiedCalendarData
} from '@/lib/calendarHelpers';
import { fetchMyVenues, Venue } from '@/lib/venueHelpers';
import { toast } from 'sonner';

// Helper to get the start date/time for an item (events use start_time, sessions use start_date)
const getItemStartDate = (item: UnifiedCalendarItem): string => {
  return item.type === 'event' ? (item.start_time || item.start_date) : item.start_date;
};

// Helper to get the end date/time for an item (events use end_time, sessions use end_date)
const getItemEndDate = (item: UnifiedCalendarItem): string | undefined => {
  return item.type === 'event' ? (item.end_time || item.end_date) : item.end_date;
};

export default function CalendarPage() {
  const { profile } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [calendarItems, setCalendarItems] = useState<UnifiedCalendarItem[]>([]);
  const [myVenues, setMyVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<CalendarStatus | 'all' | 'today' | 'thisweek'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'circle' | 'platform'>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'source'>('date');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'circle' | 'platform'>('upcoming');
  
  // Counts for filter badges
  const [counts, setCounts] = useState({
    total: 0,
    needsRsvp: 0,
    attending: 0,
    maybe: 0,
    hosting: 0,
    past: 0,
    fromCircles: 0,
    fromPlatform: 0
  });

  useEffect(() => {
    if (profile) {
      fetchCalendarData();
    }
  }, [profile, refreshKey]);

  const fetchCalendarData = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);

      // Get user's circle IDs
      const { data: circlesData } = await supabase
        .from('circles')
        .select('id')
        .contains('member_ids', [profile.id]);
      
      const userCircleIds = (circlesData || []).map(c => c.id);

      // Fetch unified calendar data
      const { items, counts: dataCounts } = await fetchUnifiedCalendarData(profile.id, userCircleIds);
      
      // Fetch user's venues for filtering
      const venues = await fetchMyVenues(profile.id);
      
      setCalendarItems(items);
      setCounts(dataCounts);
      setMyVenues(venues);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVPChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEventCreated = () => {
    setShowCreateDialog(false);
    setRefreshKey(prev => prev + 1);
  };

  // Apply filters and sorting
  const getFilteredItems = () => {
    let filtered = [...calendarItems];

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'today') {
        filtered = filtered.filter(item => isToday(parseISO(getItemStartDate(item))));
      } else if (statusFilter === 'thisweek') {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        filtered = filtered.filter(item => {
          const date = parseISO(getItemStartDate(item));
          return date >= startOfWeek && date <= endOfWeek;
        });
      } else {
        filtered = filtered.filter(item => item.userStatus === statusFilter);
      }
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(item => item.source === sourceFilter);
    }

    // Venue filter
    if (venueFilter !== 'all') {
      filtered = filtered.filter(item => item.venue_id === venueFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(getItemStartDate(a)).getTime() - new Date(getItemStartDate(b)).getTime();
      } else if (sortBy === 'status') {
        return a.userStatus.localeCompare(b.userStatus);
      } else if (sortBy === 'source') {
        return a.source.localeCompare(b.source);
      }
      return 0;
    });

    return filtered;
  };

  const filteredItems = getFilteredItems();

  // Split into upcoming and past
  const upcomingItems = filteredItems.filter(item => {
    const date = getItemEndDate(item) || getItemStartDate(item);
    return isFuture(parseISO(date)) || isToday(parseISO(getItemStartDate(item)));
  });

  const pastItems = filteredItems.filter(item => {
    const date = getItemEndDate(item) || getItemStartDate(item);
    return isPast(parseISO(date)) && !isToday(parseISO(getItemStartDate(item)));
  });

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Calendar</h1>
            <p className="text-gray-600 mt-2">Public events from circles and the platform</p>
          </div>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please log in to view your calendar events.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Calendar</h1>
            <p className="text-gray-600 mt-2">Public events from circles and the platform</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading your calendar...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: 'My Calendar' }]}
        icon={CalendarIcon}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        title="My Calendar"
        description="Public events from circles and the platform"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        }
      />

      {/* Filter by Status */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Status Filters */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('today')}
                >
                  Today
                </Button>
                <Button
                  variant={statusFilter === 'thisweek' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('thisweek')}
                >
                  This Week
                </Button>
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All ({counts.total})</Button>
                <Button
                  variant={statusFilter === 'needs_rsvp' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('needs_rsvp')}
                  className={statusFilter === 'needs_rsvp' ? 'bg-blue-600' : ''}
                >
                  Needs RSVP ({counts.needsRsvp})
                </Button>
                <Button
                  variant={statusFilter === 'attending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('attending')}
                  className={statusFilter === 'attending' ? 'bg-green-600' : ''}
                >
                  Attending ({counts.attending})
                </Button>
                <Button
                  variant={statusFilter === 'maybe' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('maybe')}
                  className={statusFilter === 'maybe' ? 'bg-yellow-600' : ''}
                >
                  Maybe ({counts.maybe})
                </Button>
                <Button
                  variant={statusFilter === 'hosting' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('hosting')}
                  className={statusFilter === 'hosting' ? 'bg-purple-600' : ''}
                >
                  Hosting ({counts.hosting})
                </Button>
              </div>
            </div>

            {/* Venue Filters */}
            {myVenues.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by Venue:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={venueFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVenueFilter('all')}
                  >
                    All
                  </Button>
                  {myVenues.map(venue => (
                    <Button
                      key={venue.id}
                      variant={venueFilter === venue.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setVenueFilter(venue.id)}
                    >
                      {venue.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort */}
            <div className="flex items-center gap-3">
              <SortAsc className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Source and Time */}
      <Tabs 
        defaultValue="upcoming" 
        className="space-y-6" 
        onValueChange={(value) => {
          setActiveTab(value as any);
          // Set source filter when switching to source tabs
          if (value === 'circle' || value === 'platform') {
            setSourceFilter(value);
          } else {
            // Reset source filter when viewing upcoming/past
            setSourceFilter('all');
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingItems.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastItems.length})
          </TabsTrigger>
          <TabsTrigger value="circle">
            My Circles ({counts.fromCircles})
          </TabsTrigger>
          <TabsTrigger value="platform">
            Platform Events ({counts.fromPlatform})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
                <p className="text-gray-600">
                  {statusFilter !== 'all' || sourceFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Check back later for new events and sessions'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {upcomingItems.map(item => (
                <CalendarItemCard 
                  key={item.id} 
                  item={item}
                  onRSVPChange={handleRSVPChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No past events</h3>
                <p className="text-gray-600">Past events will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pastItems.map(item => (
                <CalendarItemCard 
                  key={item.id} 
                  item={item}
                  onRSVPChange={handleRSVPChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="circle" className="space-y-4">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No circle events</h3>
                <p className="text-gray-600">Events from your circles will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map(item => (
                <CalendarItemCard 
                  key={item.id} 
                  item={item}
                  onRSVPChange={handleRSVPChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No platform events</h3>
                <p className="text-gray-600">Platform-wide events will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map(item => (
                <CalendarItemCard 
                  key={item.id} 
                  item={item}
                  onRSVPChange={handleRSVPChange}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Event Dialog */}
      {showCreateDialog && (
        <CreateEventDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}

// Calendar Item Card Component
function CalendarItemCard({ 
  item, 
  onRSVPChange 
}: { 
  item: UnifiedCalendarItem;
  onRSVPChange: () => void;
}) {
  const { profile } = useAuth();
  const isSession = item.type === 'session';
  const attendance = isSession && item.attendance ? item.attendance[0] : null;
  const title = isSession ? item.name : item.title;
  const startDate = parseISO(getItemStartDate(item));
  const [reminderPreference, setReminderPreference] = useState('none');
  const [hostName, setHostName] = useState<string | null>(null);
  
  // Check if this is a Save the Date event
  const isSaveTheDate = !isSession && item.event_status === 'save_the_date';

  // Fetch host/creator name if user is invited
  useEffect(() => {
    const fetchHostName = async () => {
      const hostId = item.host_id || item.created_by;
      if (hostId && item.userStatus === 'needs_rsvp') {
        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('id', hostId)
          .single();
        
        if (data) {
          setHostName(data.name);
        }
      }
    };
    
    fetchHostName();
  }, [item.host_id, item.created_by, item.userStatus]);

  return (
    <Card className={`hover:shadow-lg transition-shadow ${getSaveTheDateCardClass(isSaveTheDate)}`}>
      {/* Status Ribbon */}
      <StatusBadge 
        status={item.userStatus}
        rsvpDate={attendance?.rsvp_at}
        attendanceDate={attendance?.attended_at}
      />
      
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl mb-3">{title}</CardTitle>
            
            {/* Save the Date Badge */}
            {isSaveTheDate && (
              <SaveTheDateBadge isSaveTheDate={isSaveTheDate} className="mb-3" />
            )}
            
            {/* Invited By Info */}
            {item.userStatus === 'needs_rsvp' && hostName && (
              <p className="text-sm text-gray-600 mb-2">
                Invited by <span className="font-medium">{hostName}</span>
              </p>
            )}
            
            {/* Source Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {item.source === 'circle' && item.circle && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Users className="w-3 h-3 mr-1" />
                  {item.circle.name}
                </Badge>
              )}
              {item.source === 'platform' && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <Globe className="w-3 h-3 mr-1" />
                  Platform Event
                </Badge>
              )}
              
              {/* Pricing Badge for External Events */}
              {!isSession && item.is_paid_event && item.price_info && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  💵 {item.price_info}
                </Badge>
              )}
              {!isSession && !item.is_paid_event && item.price_info && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  🆓 {item.price_info}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Type Badge */}
          <Badge className="shrink-0">
            {isSession ? item.session_type : item.event_type}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex items-start gap-2 text-sm">
          <CalendarIcon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">
              {format(startDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="text-gray-600 flex items-center mt-1">
              <Clock className="w-3 h-3 mr-1" />
              {isSaveTheDate ? (
                <span className="text-gray-500 italic">Time TBD</span>
              ) : (
                <>
                  {format(startDate, 'h:mm a')}
                  {isSession && item.duration_minutes && ` (${item.duration_minutes} min)`}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Location - only show for non-Save the Date events */}
        {!isSaveTheDate && (
          <div className="flex items-center gap-2 text-sm">
            {item.virtual_link || item.is_virtual ? (
              <>
                <Video className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">Virtual Event</span>
                {item.virtual_link && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-blue-600"
                    asChild
                  >
                    <a href={item.virtual_link} target="_blank" rel="noopener noreferrer">
                      Join Meeting →
                    </a>
                  </Button>
                )}
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{item.location || 'Location TBD'}</span>
              </>
            )}
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* RSVP Counts (for platform events with internal RSVP) */}
        {!isSession && item.rsvp_type === 'internal' && (
          <EventRSVPCounts 
            eventId={item.id}
            rsvpType={item.rsvp_type}
            maxAttendees={item.max_attendees}
            compact
          />
        )}

        {/* External Click Count */}
        {!isSession && item.rsvp_type === 'external' && (
          <EventRSVPCounts 
            eventId={item.id}
            rsvpType={item.rsvp_type}
            compact
          />
        )}

        {/* RSVP Buttons (for platform events) */}
        {!isSession && !isSaveTheDate && (
          <div className="pt-3 border-t">
            <EventRSVPButtons 
              event={item}
              userRSVPStatus={item.user_rsvp_status}
              onRSVPUpdate={onRSVPChange}
            />
          </div>
        )}

        {/* Session RSVP Actions */}
        {isSession && (
          <div className="pt-3 border-t">
            <RSVPActions 
              itemId={item.id}
              itemType={item.type}
              currentStatus={item.userStatus}
              onRSVPChange={onRSVPChange}
              registrationUrl={item.registration_url}
              agendaUrl={item.agenda_url}
              signupsClosed={item.signups_closed}
            />
          </div>
        )}

        {/* Reminder Preference & Export */}
        <div className="pt-2 border-t space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Add to Calendar</p>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Request Reminder</Label>
              <RadioGroup value={reminderPreference} onValueChange={setReminderPreference}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id={`none-${item.id}`} />
                    <Label htmlFor={`none-${item.id}`} className="font-normal cursor-pointer">
                      None
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1hour" id={`1hour-${item.id}`} />
                    <Label htmlFor={`1hour-${item.id}`} className="font-normal cursor-pointer">
                      1 hour before
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1day" id={`1day-${item.id}`} />
                    <Label htmlFor={`1day-${item.id}`} className="font-normal cursor-pointer">
                      1 day before
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadICS(item, reminderPreference)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            {item.source === 'circle' && item.circle && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/circles/${item.circle.id}`}>
                  View Circle
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}