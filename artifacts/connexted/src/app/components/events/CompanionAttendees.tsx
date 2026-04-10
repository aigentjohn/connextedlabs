import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  CheckCircle, HelpCircle, XCircle, CheckCircle2,
  UserPlus, RefreshCw, Mail, MapPin, Clock, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import {
  getEventRSVPs, getCheckedInAttendees, checkInToEvent, addGuestToEvent,
  EventRSVP, CheckedInAttendee,
} from '@/lib/rsvpHelpers';
import { toast } from 'sonner';

interface EventAttendee extends EventRSVP {
  user?: { id: string; name: string; avatar?: string; email?: string };
}

interface CompanionAttendeesProps {
  eventId: string;
  isHost: boolean;
}

const SHARE_OPTIONS = [
  { key: 'email',    label: 'Email',    desc: 'Let others email you' },
  { key: 'tagline',  label: 'Headline', desc: 'Your role or tagline' },
  { key: 'location', label: 'Location', desc: 'Your city or region' },
  { key: 'bio',      label: 'Bio',      desc: 'Your short bio' },
];

// ── Check-in panel ──────────────────────────────────────────────────────────

function CheckInPanel({ eventId, onCheckedIn }: { eventId: string; onCheckedIn: () => void }) {
  const { profile } = useAuth();
  const [sharedFields, setSharedFields] = useState<string[]>(['email', 'tagline']);
  const [loading, setLoading] = useState(false);

  if (!profile) return null;

  const available = SHARE_OPTIONS.filter(o => {
    if (o.key === 'email') return !!profile.email;
    if (o.key === 'tagline') return !!profile.tagline;
    if (o.key === 'location') return !!profile.location;
    if (o.key === 'bio') return !!profile.bio;
    return false;
  });

  const toggle = (key: string) =>
    setSharedFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);

  const handleCheckIn = async () => {
    setLoading(true);
    const result = await checkInToEvent(eventId, profile.id, sharedFields);
    setLoading(false);
    if (result) {
      toast.success('Checked in!');
      onCheckedIn();
    }
  };

  const initials = profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4 py-2">
      {/* Profile preview */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={profile.avatar || undefined} />
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{profile.name}</p>
          {profile.tagline && <p className="text-xs text-gray-500">{profile.tagline}</p>}
        </div>
      </div>

      {/* Consent */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Share with other attendees:</p>
        <p className="text-xs text-gray-500">Name and photo are always visible.</p>
        {available.map(opt => (
          <div key={opt.key} className="flex items-start gap-2.5">
            <Checkbox
              id={`ci-${opt.key}`}
              checked={sharedFields.includes(opt.key)}
              onCheckedChange={() => toggle(opt.key)}
              className="mt-0.5"
            />
            <Label htmlFor={`ci-${opt.key}`} className="cursor-pointer leading-tight">
              <span className="font-medium text-sm">{opt.label}</span>
              <span className="block text-xs text-gray-500">{opt.desc}</span>
            </Label>
          </div>
        ))}
      </div>

      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        size="sm"
        onClick={handleCheckIn}
        disabled={loading}
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        {loading ? 'Checking in...' : 'Check In'}
      </Button>
    </div>
  );
}

// ── Who's Here ──────────────────────────────────────────────────────────────

function WhoIsHere({ attendees, loading, onRefresh }: {
  attendees: CheckedInAttendee[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = attendees.filter(a => {
    const name = a.user?.name || a.guest_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm flex-1"
        />
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8 w-8 p-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {search ? 'No attendees match your search' : 'No one has checked in yet'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const isGuest = !a.user_id;
            const name = isGuest ? (a.guest_name || 'Guest') : (a.user?.name || 'Unknown');
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const shared = a.shared_fields || [];
            const email = isGuest ? a.guest_email : (shared.includes('email') ? a.user?.email : null);
            const tagline = !isGuest && shared.includes('tagline') ? (a.user as any)?.tagline : null;
            const location = !isGuest && shared.includes('location') ? (a.user as any)?.location : null;

            return (
              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-white">
                {!isGuest ? (
                  <Link to={`/members/${a.user_id}`} className="flex-shrink-0">
                    <Avatar className="w-10 h-10 hover:ring-2 hover:ring-indigo-200 transition-all">
                      <AvatarImage src={a.user?.avatar || undefined} />
                      <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-gray-100">{initials}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!isGuest ? (
                      <Link to={`/members/${a.user_id}`} className="font-medium text-sm hover:text-indigo-600 flex items-center gap-1">
                        {name}
                        <ExternalLink className="w-3 h-3 opacity-40" />
                      </Link>
                    ) : (
                      <span className="font-medium text-sm">{name}</span>
                    )}
                    {isGuest && <Badge variant="outline" className="text-xs py-0">Guest</Badge>}
                  </div>
                  {tagline && <p className="text-xs text-gray-500 mt-0.5">{tagline}</p>}
                  <div className="flex flex-wrap gap-x-3 mt-1">
                    {email && (
                      <a href={`mailto:${email}`} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                        <Mail className="w-3 h-3" />{email}
                      </a>
                    )}
                    {location && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />{location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── RSVP List (host view) ───────────────────────────────────────────────────

function RSVPList({ eventId, onGuestAdded }: { eventId: string; onGuestAdded: () => void }) {
  const { profile } = useAuth();
  const [rsvps, setRsvps] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getEventRSVPs(eventId)
      .then(data => setRsvps(data as EventAttendee[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [eventId]);

  const handleAddGuest = async () => {
    if (!guestName.trim() || !profile) return;
    setSaving(true);
    const result = await addGuestToEvent(
      eventId,
      { name: guestName.trim(), email: guestEmail.trim() || undefined, phone: guestPhone.trim() || undefined },
      profile.id
    );
    setSaving(false);
    if (result) {
      toast.success(`${guestName} added`);
      setGuestName(''); setGuestEmail(''); setGuestPhone('');
      setShowAddGuest(false);
      load();
      onGuestAdded();
    }
  };

  const going = rsvps.filter(r => r.status === 'going');
  const maybe = rsvps.filter(r => r.status === 'maybe');
  const checkedInCount = rsvps.filter(r => r.checked_in_at).length;

  if (loading) return <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <strong className="text-green-700">{going.length}</strong> going
        </span>
        <span className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-yellow-600" />
          <strong className="text-yellow-700">{maybe.length}</strong> maybe
        </span>
        {checkedInCount > 0 && (
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <strong className="text-green-700">{checkedInCount}</strong> checked in
          </span>
        )}
      </div>

      {/* RSVP rows */}
      <div className="space-y-1">
        {rsvps.map(r => {
          const isGuest = !r.user_id;
          const name = isGuest ? (r.guest_name || 'Guest') : (r.user?.name || 'Unknown');
          const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          const statusColor: Record<string, string> = {
            going: 'text-green-700', maybe: 'text-yellow-700',
            not_going: 'text-gray-500', waitlist: 'text-blue-600', attending: 'text-green-700'
          };

          return (
            <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={r.user?.avatar} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{name}</span>
                {isGuest && <Badge variant="outline" className="ml-2 text-xs py-0">Guest</Badge>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.checked_in_at && (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span className={`text-xs capitalize ${statusColor[r.status] || 'text-gray-500'}`}>
                  {r.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add guest */}
      {!showAddGuest ? (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddGuest(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Walk-in Guest
        </Button>
      ) : (
        <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
          <p className="text-sm font-medium">Add walk-in guest</p>
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Full name" className="h-8 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="optional" className="h-8 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="optional" className="h-8 text-sm mt-1" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddGuest} disabled={!guestName.trim() || saving} className="flex-1">
              {saving ? 'Adding...' : 'Add Guest'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddGuest(false)} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function CompanionAttendees({ eventId, isHost }: CompanionAttendeesProps) {
  const { profile } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedInAttendees, setCheckedInAttendees] = useState<CheckedInAttendee[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadLive = () => {
    setLiveLoading(true);
    getCheckedInAttendees(eventId)
      .then(setCheckedInAttendees)
      .finally(() => setLiveLoading(false));
  };

  // Check if current user already checked in
  useEffect(() => {
    if (!profile || !eventId) return;
    import('@/lib/rsvpHelpers').then(({ getUserRSVP }) => {
      getUserRSVP(eventId, profile.id).then(rsvp => {
        if (rsvp?.checked_in_at) setCheckedIn(true);
      });
    });
  }, [eventId, profile]);

  useEffect(() => { loadLive(); }, [eventId, refreshKey]);

  const handleCheckedIn = () => {
    setCheckedIn(true);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-4">
      {/* Check-in prompt for members who haven't checked in */}
      {!checkedIn ? (
        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-800 mb-3">You haven't checked in yet</p>
          <CheckInPanel eventId={eventId} onCheckedIn={handleCheckedIn} />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4" />
          You're checked in
        </div>
      )}

      {/* Tabs: Who's Here (everyone) | All RSVPs (host only) */}
      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">
            Who's Here
            {checkedInAttendees.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">{checkedInAttendees.length}</Badge>
            )}
          </TabsTrigger>
          {isHost && <TabsTrigger value="rsvps">All RSVPs</TabsTrigger>}
        </TabsList>

        <TabsContent value="live" className="mt-3">
          <WhoIsHere
            attendees={checkedInAttendees}
            loading={liveLoading}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        </TabsContent>

        {isHost && (
          <TabsContent value="rsvps" className="mt-3">
            <RSVPList eventId={eventId} onGuestAdded={() => setRefreshKey(k => k + 1)} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
