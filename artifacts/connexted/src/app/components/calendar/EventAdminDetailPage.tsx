import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Calendar, Clock, MapPin, Users, Settings, Layers,
  Video, Save, XCircle, Copy, ExternalLink, Plus,
  UserPlus, Download, CheckCircle2, HelpCircle, X as XIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { getEventRSVPs, addGuestToEvent, type EventRSVP } from '@/lib/rsvpHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventDetail {
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
  signups_closed: boolean;
  agenda_url: string | null;
  is_paid_event: boolean;
  price_info: string | null;
  created_at: string;
}

interface EventCompanion {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  item_count?: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventAdminDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (eventId) fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Event not found</p>
        <Link to="/my-calendar-admin">
          <Button variant="outline">Back to Calendar Admin</Button>
        </Link>
      </div>
    );
  }

  // Guard: only host or platform admin can manage
  const isHost = event.host_id === profile?.id;
  const isPlatformAdmin = profile?.role === 'admin' || profile?.role === 'super';

  if (!isHost && !isPlatformAdmin) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">You don't have permission to manage this event</p>
      </div>
    );
  }

  const isCancelled = event.event_status === 'cancelled';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Calendar Admin', href: '/my-calendar-admin' },
        { label: event.title },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">{event.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy · h:mm a')}
            {isCancelled && <Badge variant="destructive" className="ml-2">Cancelled</Badge>}
          </div>
        </div>
        <Link to="/my-calendar-admin">
          <Button variant="outline" size="sm">← All Events</Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">
            <Settings className="w-4 h-4 mr-1.5" />
            Details
          </TabsTrigger>
          <TabsTrigger value="attendees">
            <Users className="w-4 h-4 mr-1.5" />
            Attendees
            {event.attendee_ids?.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{event.attendee_ids.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="companions">
            <Layers className="w-4 h-4 mr-1.5" />
            Companions
          </TabsTrigger>
          <TabsTrigger value="settings">
            <XCircle className="w-4 h-4 mr-1.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <DetailsTab event={event} onSaved={fetchEvent} />
        </TabsContent>

        {/* Attendees Tab */}
        <TabsContent value="attendees" className="mt-6">
          <AttendeesTab event={event} onRefresh={fetchEvent} />
        </TabsContent>

        {/* Companions Tab */}
        <TabsContent value="companions" className="mt-6">
          <CompanionsTab eventId={event.id} eventTitle={event.title} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <SettingsTab event={event} onRefresh={fetchEvent} onDeleted={() => navigate('/my-calendar-admin')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Details Tab ──────────────────────────────────────────────────────────────

function DetailsTab({ event, onSaved }: { event: EventDetail; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: event.title,
    description: event.description || '',
    event_type: event.event_type || 'other',
    start_time: event.start_time ? event.start_time.slice(0, 16) : '',
    end_time: event.end_time ? event.end_time.slice(0, 16) : '',
    location: event.location || '',
    is_virtual: event.is_virtual || false,
    external_link: event.external_link || '',
    rsvp_type: event.rsvp_type || 'none',
    rsvp_required: event.rsvp_required || false,
    max_attendees: event.max_attendees ? String(event.max_attendees) : '',
    access_level: event.access_level || 'public',
    tags: event.tags?.join(', ') || '',
    agenda_url: event.agenda_url || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.start_time) { toast.error('Start time is required'); return; }

    try {
      setSaving(true);
      const tags = form.tags
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const { error } = await supabase
        .from('events')
        .update({
          title: form.title.trim(),
          description: form.description,
          event_type: form.event_type,
          start_time: form.start_time,
          end_time: form.end_time || null,
          location: form.location || null,
          is_virtual: form.is_virtual,
          external_link: form.external_link || null,
          rsvp_type: form.rsvp_type,
          rsvp_required: form.rsvp_required,
          max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
          access_level: form.access_level,
          tags,
          agenda_url: form.agenda_url || null,
        })
        .eq('id', event.id);

      if (error) throw error;
      toast.success('Event updated');
      onSaved();
    } catch (err) {
      console.error('Error saving event:', err);
      toast.error('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Event Type</Label>
            <Select value={form.event_type} onValueChange={v => set('event_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['meeting','meetup','workshop','conference','social','training','webinar','standup','other'].map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="workshop, networking, startup" />
            <p className="text-xs text-gray-500">Comma-separated</p>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Start *</Label>
              <Input id="start_time" type="datetime-local" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">End</Label>
              <Input id="end_time" type="datetime-local" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agenda_url">Agenda URL</Label>
            <Input id="agenda_url" value={form.agenda_url} onChange={e => set('agenda_url', e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={form.is_virtual} onCheckedChange={v => set('is_virtual', v)} id="is_virtual" />
            <Label htmlFor="is_virtual">Virtual event</Label>
          </div>
          {!form.is_virtual && (
            <div className="space-y-1.5">
              <Label htmlFor="location">Venue / Address</Label>
              <Input id="location" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="external_link">{form.is_virtual ? 'Meeting Link' : 'Event Link'}</Label>
            <Input id="external_link" value={form.external_link} onChange={e => set('external_link', e.target.value)} placeholder="https://zoom.us/..." />
          </div>
        </CardContent>
      </Card>

      {/* RSVP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">RSVP & Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>RSVP Type</Label>
            <Select value={form.rsvp_type} onValueChange={v => set('rsvp_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No RSVP needed</SelectItem>
                <SelectItem value="internal">Internal (platform RSVP)</SelectItem>
                <SelectItem value="external">External (registration link)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.rsvp_type === 'internal' && (
            <>
              <div className="flex items-center gap-3">
                <Switch checked={form.rsvp_required} onCheckedChange={v => set('rsvp_required', v)} id="rsvp_required" />
                <Label htmlFor="rsvp_required">RSVP required</Label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_attendees">Capacity limit</Label>
                <Input id="max_attendees" type="number" value={form.max_attendees} onChange={e => set('max_attendees', e.target.value)} placeholder="Leave blank for unlimited" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={form.access_level} onValueChange={v => set('access_level', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public — anyone can see this event</SelectItem>
              <SelectItem value="member">Members only</SelectItem>
              <SelectItem value="unlisted">Unlisted — accessible by link only</SelectItem>
              <SelectItem value="private">Private — invite only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

// ─── Attendees Tab ────────────────────────────────────────────────────────────

function AttendeesTab({ event, onRefresh }: { event: EventDetail; onRefresh: () => void }) {
  const [rsvps, setRsvps] = useState<EventRSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    loadRsvps();
  }, [event.id]);

  const loadRsvps = async () => {
    try {
      setLoading(true);
      const data = await getEventRSVPs(event.id);
      setRsvps(data);
    } catch (err) {
      console.error('Error loading RSVPs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = async () => {
    if (!guestName.trim()) { toast.error('Guest name is required'); return; }
    if (!profile) return;
    try {
      setAddingGuest(true);
      await addGuestToEvent(event.id, guestName.trim(), guestEmail.trim(), '', profile.id);
      toast.success(`${guestName} added as walk-in guest`);
      setGuestName('');
      setGuestEmail('');
      loadRsvps();
      onRefresh();
    } catch (err) {
      console.error('Error adding guest:', err);
      toast.error('Failed to add guest');
    } finally {
      setAddingGuest(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Status', 'Plus Ones', 'Checked In', 'Check-In Time'],
      ...rsvps.map(r => {
        const name = (r as any).user?.name || r.guest_name || 'Guest';
        const email = (r as any).user?.email || r.guest_email || '';
        return [
          name,
          email,
          r.status,
          String(r.plus_one_count || 0),
          r.checked_in_at ? 'Yes' : 'No',
          r.checked_in_at ? format(new Date(r.checked_in_at), 'h:mm a') : '',
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '-')}-attendees.csv`;
    a.click();
  };

  const going = rsvps.filter(r => r.status === 'going' || r.status === 'attending');
  const maybe = rsvps.filter(r => r.status === 'maybe');
  const notGoing = rsvps.filter(r => r.status === 'not_going');
  const waitlist = rsvps.filter(r => r.status === 'waitlist');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Going', count: going.length, color: 'text-green-600' },
          { label: 'Maybe', count: maybe.length, color: 'text-yellow-600' },
          { label: 'Not Going', count: notGoing.length, color: 'text-gray-500' },
          { label: 'Waitlist', count: waitlist.length, color: 'text-blue-600' },
        ].map(({ label, count, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className={`text-xl font-bold ${color}`}>{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Walk-in Guest */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Walk-in Guest</CardTitle>
          <CardDescription>Add someone who shows up without an RSVP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Name *"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
            />
            <Input
              placeholder="Email (optional)"
              value={guestEmail}
              onChange={e => setGuestEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
            />
            <Button onClick={handleAddGuest} disabled={addingGuest}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RSVP List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            RSVPs ({rsvps.length})
          </CardTitle>
          {rsvps.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
          ) : rsvps.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No RSVPs yet</p>
          ) : (
            <div className="space-y-0 divide-y">
              {rsvps.map(rsvp => {
                const isGuest = !rsvp.user_id;
                const r = rsvp as any;
                const name = isGuest ? (rsvp.guest_name || 'Guest') : (r.user?.name || 'Unknown');
                const email = isGuest ? rsvp.guest_email : r.user?.email;
                const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const checkedIn = !!rsvp.checked_in_at;

                return (
                  <div key={rsvp.id} className="flex items-center gap-3 py-3">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={r.user?.avatar} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{name}</span>
                        {isGuest && <Badge variant="outline" className="text-xs py-0">Guest</Badge>}
                        {checkedIn && (
                          <Badge className="text-xs py-0 bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Checked in
                          </Badge>
                        )}
                      </div>
                      {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${
                        rsvp.status === 'going' || rsvp.status === 'attending' ? 'text-green-600 border-green-200' :
                        rsvp.status === 'maybe' ? 'text-yellow-600 border-yellow-200' :
                        rsvp.status === 'waitlist' ? 'text-blue-600 border-blue-200' :
                        'text-gray-500'
                      }`}
                    >
                      {rsvp.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Companions Tab ───────────────────────────────────────────────────────────

function CompanionsTab({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [companions, setCompanions] = useState<EventCompanion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanions();
  }, [eventId]);

  const loadCompanions = async () => {
    try {
      setLoading(true);
      const { data: companionsData, error } = await supabase
        .from('event_companions')
        .select('id, name, notes, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get item counts per companion
      if (companionsData && companionsData.length > 0) {
        const ids = companionsData.map(c => c.id);
        const { data: items } = await supabase
          .from('event_companion_items')
          .select('companion_id')
          .in('companion_id', ids);

        const counts = (items || []).reduce((acc: Record<string, number>, item) => {
          acc[item.companion_id] = (acc[item.companion_id] || 0) + 1;
          return acc;
        }, {});

        setCompanions(companionsData.map(c => ({ ...c, item_count: counts[c.id] || 0 })));
      } else {
        setCompanions([]);
      }
    } catch (err) {
      console.error('Error loading companions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Event companions bundle logistics — agendas, QR codes, attendee lists, documents — into one place for this event.
        </p>
        <Link to={`/event-companions/new?eventId=${eventId}`}>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Companion
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
      ) : companions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">No companions yet for this event</p>
            <Link to={`/event-companions/new?eventId=${eventId}`}>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Companion
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {companions.map(companion => (
            <Card key={companion.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{companion.name}</p>
                    {companion.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{companion.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {companion.item_count || 0} item{companion.item_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link to={`/event-companions/${companion.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  event,
  onRefresh,
  onDeleted,
}: {
  event: EventDetail;
  onRefresh: () => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const isCancelled = event.event_status === 'cancelled';

  const toggleSignups = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('events')
        .update({ signups_closed: !event.signups_closed })
        .eq('id', event.id);
      if (error) throw error;
      toast.success(event.signups_closed ? 'Signups reopened' : 'Signups closed');
      onRefresh();
    } catch (err) {
      toast.error('Failed to update signups');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
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
      toast.success('Event duplicated — find it in your Calendar Admin');
    } catch (err) {
      toast.error('Failed to duplicate event');
    }
  };

  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ event_status: 'cancelled' })
        .eq('id', event.id);
      if (error) throw error;
      toast.success('Event cancelled');
      onRefresh();
    } catch (err) {
      toast.error('Failed to cancel event');
    }
  };

  const handleRestore = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ event_status: 'confirmed' })
        .eq('id', event.id);
      if (error) throw error;
      toast.success('Event restored');
      onRefresh();
    } catch (err) {
      toast.error('Failed to restore event');
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      {/* Close signups */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Close Signups</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Prevent new RSVPs while keeping the event active
              </p>
            </div>
            <Switch
              checked={event.signups_closed}
              onCheckedChange={toggleSignups}
              disabled={saving || isCancelled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Duplicate */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Duplicate Event</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Create a copy as a Save the Date to update with new details
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="w-4 h-4 mr-1.5" />
              Duplicate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel / Restore */}
      <Card className="border-red-100">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-red-700">
                {isCancelled ? 'Restore Event' : 'Cancel Event'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCancelled
                  ? 'Set the event back to confirmed status'
                  : 'Mark this event as cancelled — attendees will not be automatically notified'}
              </p>
            </div>
            {isCancelled ? (
              <Button variant="outline" size="sm" onClick={handleRestore}>
                Restore
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancel Event
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel "{event.title}"? This marks the event as cancelled but does not delete it or notify attendees.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Event</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                      Cancel Event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
