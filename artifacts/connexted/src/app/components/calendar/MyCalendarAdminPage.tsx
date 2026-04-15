import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Calendar, Clock, MapPin, Users, Plus, Search,
  Eye, Copy, XCircle, Video, Upload, Layers,
  CalendarCheck, Ticket, CalendarDays, Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import CreateEventDialog from '@/app/components/calendar/CreateEventDialog';
import { EventAttendeesDialog } from '@/app/components/calendar/EventAttendeesDialog';
import BulkImportManager, { BulkImportConfig } from '@/app/components/admin/BulkImportManager';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HostedEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  event_status: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  is_virtual: boolean;
  external_link: string | null;
  rsvp_type: string;
  rsvp_required: boolean;
  max_attendees: number | null;
  attendee_ids: string[];
  circle_ids: string[] | null;
  access_level: string;
  tags: string[];
  host_id: string;
  created_at: string;
  signups_closed: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: 'Meeting', meetup: 'Meetup', workshop: 'Workshop',
  conference: 'Conference', social: 'Social', training: 'Training',
  webinar: 'Webinar', standup: 'Standup', other: 'Other',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting: 'bg-blue-100 text-blue-700',
  meetup: 'bg-green-100 text-green-700',
  workshop: 'bg-purple-100 text-purple-700',
  conference: 'bg-orange-100 text-orange-700',
  social: 'bg-pink-100 text-pink-700',
  training: 'bg-yellow-100 text-yellow-700',
  webinar: 'bg-cyan-100 text-cyan-700',
  standup: 'bg-gray-100 text-gray-700',
  other: 'bg-slate-100 text-slate-700',
};

// ─── AI Import Prompt ─────────────────────────────────────────────────────────

const AI_IMPORT_PROMPT = `Convert the following event information into a JSON array using this exact format.
Return ONLY valid JSON — no explanation, no markdown, just the array.

FORMAT:
[
  {
    "title": "Event name (required)",
    "description": "Full description",
    "event_type": "meetup",
    "event_status": "confirmed",
    "start_time": "2026-05-01T09:00:00",
    "end_time": "2026-05-01T11:00:00",
    "location": "Venue name or address",
    "is_virtual": false,
    "external_link": "https://zoom.us/...",
    "rsvp_type": "internal",
    "rsvp_required": true,
    "max_attendees": 50,
    "is_paid_event": false,
    "access_level": "public",
    "tags": "workshop,networking"
  }
]

RULES:
- title and start_time are required for every event
- start_time and end_time must be ISO 8601 format: YYYY-MM-DDTHH:MM:SS
- event_type must be one of: meeting, meetup, workshop, conference, social, training, webinar, standup, other
- event_status must be one of: save_the_date, confirmed (default: confirmed)
- rsvp_type must be one of: none, internal, external (default: none)
- access_level must be one of: public, member, unlisted, private (default: public)
- tags are comma-separated in a single string
- is_virtual is true for online-only events
- If you are unsure of a field, omit it
- Always return an array, even for a single event

PASTE YOUR EVENT DETAILS BELOW:
[paste one event or a list of events here]`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyCalendarAdminPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HostedEvent | null>(null);
  const [attendeesEvent, setAttendeesEvent] = useState<{ id: string; title: string } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    if (profile) fetchHostedEvents();
  }, [profile]);

  const fetchHostedEvents = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('host_id', profile.id)
        .order('start_time', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching hosted events:', err);
      toast.error('Failed to load your events');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (event: HostedEvent) => {
    try {
      const { id, created_at, attendee_ids, ...rest } = event;
      const { error } = await supabase.from('events').insert({
        ...rest,
        title: `${event.title} (Copy)`,
        event_status: 'save_the_date',
        attendee_ids: [],
        signups_closed: false,
      });
      if (error) throw error;
      toast.success('Event duplicated — edit it to update the details');
      fetchHostedEvents();
    } catch (err) {
      console.error('Error duplicating event:', err);
      toast.error('Failed to duplicate event');
    }
  };

  const handleCancel = async (eventId: string, eventTitle: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ event_status: 'cancelled' })
        .eq('id', eventId);
      if (error) throw error;
      setEvents(events.map(e => e.id === eventId ? { ...e, event_status: 'cancelled' } : e));
      toast.success(`"${eventTitle}" has been cancelled`);
    } catch (err) {
      console.error('Error cancelling event:', err);
      toast.error('Failed to cancel event');
    }
  };

  const handleBulkImport = async (records: any[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        const tags = record.tags
          ? String(record.tags).split(',').map((t: string) => t.trim()).filter(Boolean)
          : [];

        const { error } = await supabase.from('events').insert({
          title: record.title,
          description: record.description || '',
          event_type: record.event_type || 'other',
          event_status: record.event_status || 'confirmed',
          start_time: record.start_time,
          end_time: record.end_time || null,
          location: record.location || null,
          is_virtual: record.is_virtual || false,
          external_link: record.external_link || null,
          rsvp_type: record.rsvp_type || 'none',
          rsvp_required: record.rsvp_required || false,
          max_attendees: record.max_attendees || null,
          is_paid_event: record.is_paid_event || false,
          access_level: record.access_level || 'public',
          tags,
          host_id: profile!.id,
          attendee_ids: [],
          circle_ids: [],
        });

        if (error) throw error;
        success++;
      } catch (err: any) {
        failed++;
        errors.push(`"${record.title || 'Unknown'}": ${err.message}`);
      }
    }

    if (success > 0) fetchHostedEvents();
    return { success, failed, errors };
  };

  const importConfig: BulkImportConfig = {
    entityName: 'Events',
    entityNameSingular: 'Event',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: false },
      { key: 'event_type', label: 'Event Type', type: 'select', required: false, options: ['meeting','meetup','workshop','conference','social','training','webinar','standup','other'], defaultValue: 'other' },
      { key: 'event_status', label: 'Status', type: 'select', required: false, options: ['save_the_date','confirmed'], defaultValue: 'confirmed' },
      { key: 'start_time', label: 'Start Time', type: 'text', required: true, description: 'ISO format: 2026-05-01T09:00:00' },
      { key: 'end_time', label: 'End Time', type: 'text', required: false },
      { key: 'location', label: 'Location', type: 'text', required: false },
      { key: 'is_virtual', label: 'Virtual Event', type: 'boolean', required: false, defaultValue: false },
      { key: 'external_link', label: 'Meeting/Event URL', type: 'text', required: false },
      { key: 'rsvp_type', label: 'RSVP Type', type: 'select', required: false, options: ['none','internal','external'], defaultValue: 'none' },
      { key: 'max_attendees', label: 'Max Attendees', type: 'number', required: false },
      { key: 'access_level', label: 'Visibility', type: 'select', required: false, options: ['public','member','unlisted','private'], defaultValue: 'public' },
      { key: 'tags', label: 'Tags', type: 'text', required: false, description: 'Comma-separated: workshop,networking' },
    ],
    onImport: handleBulkImport,
    validateRecord: (record) => {
      if (!record.title) return 'Title is required';
      if (!record.start_time) return 'Start time is required';
      const start = new Date(record.start_time);
      if (isNaN(start.getTime())) return `Invalid start_time "${record.start_time}" — use ISO format e.g. 2026-05-01T09:00:00`;
      if (record.end_time) {
        const end = new Date(record.end_time);
        if (isNaN(end.getTime())) return `Invalid end_time "${record.end_time}"`;
        if (end <= start) return 'End time must be after start time';
      }
      return null;
    },
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(AI_IMPORT_PROMPT);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  // ─── Tab Filtering ───────────────────────────────────────────────────────────

  const now = new Date();

  const tabEvents = {
    upcoming: events.filter(e =>
      e.event_status !== 'cancelled' &&
      e.event_status !== 'save_the_date' &&
      new Date(e.start_time) > now
    ),
    past: events.filter(e =>
      e.event_status !== 'cancelled' &&
      new Date(e.end_time || e.start_time) < now
    ),
    drafts: events.filter(e => e.event_status === 'save_the_date'),
    cancelled: events.filter(e => e.event_status === 'cancelled'),
  };

  const filteredEvents = (tabEvents[activeTab as keyof typeof tabEvents] || []).filter(e =>
    !searchQuery ||
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAttendees = events.reduce((sum, e) => sum + (e.attendee_ids?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading your events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Calendar Admin' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Calendar Admin</h1>
          <p className="text-gray-600">Manage the events you host</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(!showImport)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold">{events.length}</div>
            <div className="text-sm text-gray-500">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-green-600">{tabEvents.upcoming.length}</div>
            <div className="text-sm text-gray-500">Upcoming</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-blue-600">{totalAttendees}</div>
            <div className="text-sm text-gray-500">Total RSVPs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-amber-600">{tabEvents.drafts.length}</div>
            <div className="text-sm text-gray-500">Save the Date</div>
          </CardContent>
        </Card>
      </div>

      {/* Import Section */}
      {showImport && (
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              Import Events from JSON
            </CardTitle>
            <CardDescription>
              Use your AI assistant to convert event details into the platform format, then paste the JSON below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Prompt */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Step 1 — Copy this prompt, take it to ChatGPT or Claude, paste your event details at the bottom, then copy the JSON it returns.
              </p>
              <div className="relative">
                <pre className="bg-white border rounded-lg p-4 text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                  {AI_IMPORT_PROMPT}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={copyPrompt}
                >
                  {promptCopied ? '✓ Copied' : 'Copy Prompt'}
                </Button>
              </div>
            </div>

            {/* Import Manager */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Step 2 — Paste the JSON result here and import.
              </p>
              <BulkImportManager config={importConfig} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search your events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {tabEvents.upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{tabEvents.upcoming.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past
            {tabEvents.past.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{tabEvents.past.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Save the Date
            {tabEvents.drafts.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{tabEvents.drafts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled
            {tabEvents.cancelled.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{tabEvents.cancelled.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                {events.length === 0 ? (
                  <>
                    <p className="text-gray-600 mb-4">You haven't hosted any events yet</p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Event
                    </Button>
                  </>
                ) : (
                  <p className="text-gray-500">
                    {searchQuery ? 'No events match your search' : `No ${activeTab} events`}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={() => setEditingEvent(event)}
                  onViewAttendees={() => setAttendeesEvent({ id: event.id, title: event.title })}
                  onDuplicate={() => handleDuplicate(event)}
                  onCancel={() => handleCancel(event.id, event.title)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateEventDialog
          isOpen={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            fetchHostedEvents();
          }}
        />
      )}

      {/* Edit Dialog */}
      {editingEvent && (
        <CreateEventDialog
          isOpen={!!editingEvent}
          event={editingEvent}
          onClose={() => {
            setEditingEvent(null);
            fetchHostedEvents();
          }}
        />
      )}

      {/* Attendees Dialog */}
      {attendeesEvent && (
        <EventAttendeesDialog
          eventId={attendeesEvent.id}
          eventTitle={attendeesEvent.title}
          open={!!attendeesEvent}
          onClose={() => setAttendeesEvent(null)}
        />
      )}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  onEdit,
  onViewAttendees,
  onDuplicate,
  onCancel,
}: {
  event: HostedEvent;
  onEdit: () => void;
  onViewAttendees: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}) {
  const isPast = new Date(event.end_time || event.start_time) < new Date();
  const attendeeCount = event.attendee_ids?.length || 0;
  const capacityPct = event.max_attendees ? Math.round((attendeeCount / event.max_attendees) * 100) : null;
  const isCancelled = event.event_status === 'cancelled';

  return (
    <Card className={isCancelled ? 'opacity-60' : ''}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: event info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{event.title}</h3>
              {event.event_type && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-100 text-gray-700'}`}>
                  {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                </span>
              )}
              {event.event_status === 'save_the_date' && (
                <Badge variant="outline" className="text-xs">Save the Date</Badge>
              )}
              {isCancelled && (
                <Badge variant="destructive" className="text-xs">Cancelled</Badge>
              )}
              {event.circle_ids && event.circle_ids.length > 0 && (
                <Badge variant="outline" className="text-xs">Circle Event</Badge>
              )}
              {event.rsvp_type === 'external' && (
                <Badge className="text-xs bg-amber-500">Ticketed</Badge>
              )}
            </div>

            {event.description && (
              <p className="text-sm text-gray-600 line-clamp-1">{event.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(event.start_time), 'MMM d, yyyy · h:mm a')}
                {event.end_time && ` – ${format(new Date(event.end_time), 'h:mm a')}`}
              </span>
              {event.is_virtual ? (
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" />
                  Virtual
                </span>
              ) : event.location ? (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.location}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {attendeeCount} RSVP{attendeeCount !== 1 ? 's' : ''}
                {event.max_attendees && (
                  <span className="text-gray-400">
                    {' '}/ {event.max_attendees}
                    {capacityPct !== null && capacityPct >= 80 && (
                      <span className={`ml-1 ${capacityPct >= 100 ? 'text-red-500' : 'text-amber-500'}`}>
                        ({capacityPct}% full)
                      </span>
                    )}
                  </span>
                )}
              </span>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.tags.map(tag => (
                  <span key={tag} className="text-xs text-gray-400">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Right: actions */}
          {!isCancelled && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <Link to={`/calendar-admin/${event.id}`}>
                <Button size="sm" className="w-full">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Manage
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Quick Edit
              </Button>
              <Button size="sm" variant="outline" onClick={onViewAttendees}>
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Attendees
              </Button>
              <Link to={`/event-companions`}>
                <Button size="sm" variant="outline" className="w-full">
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  Companions
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={onDuplicate}>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Duplicate
              </Button>
              {!isPast && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel "{event.title}"? Attendees will not be automatically notified.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Event</AlertDialogCancel>
                      <AlertDialogAction onClick={onCancel} className="bg-red-600 hover:bg-red-700">
                        Cancel Event
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
