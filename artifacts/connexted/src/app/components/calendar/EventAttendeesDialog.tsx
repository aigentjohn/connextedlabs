import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { CheckCircle, HelpCircle, XCircle, Users, Clock, UserPlus, CheckCircle2 } from 'lucide-react';
import { getEventRSVPs, addGuestToEvent, EventRSVP } from '@/lib/rsvpHelpers';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface EventAttendee extends EventRSVP {
  user?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
}

interface EventAttendeesDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
}

function AttendeeRow({ rsvp }: { rsvp: EventAttendee }) {
  const isGuest = !rsvp.user_id;
  const name = isGuest ? (rsvp.guest_name || 'Guest') : (rsvp.user?.name || 'Unknown');
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const responseDate = new Date(rsvp.response_date).toLocaleDateString();
  const checkedIn = !!rsvp.checked_in_at;

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Avatar className="w-9 h-9 flex-shrink-0">
        <AvatarImage src={rsvp.user?.avatar} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{name}</span>
          {isGuest && <Badge variant="outline" className="text-xs py-0">Guest</Badge>}
          {checkedIn && (
            <Badge className="text-xs py-0 bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Checked in
            </Badge>
          )}
          {rsvp.plus_one_count && rsvp.plus_one_count > 0 && (
            <Badge variant="secondary" className="text-xs">+{rsvp.plus_one_count}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
          <Clock className="w-3 h-3" />
          {checkedIn
            ? `Checked in ${new Date(rsvp.checked_in_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `RSVP'd ${responseDate}`}
        </div>
        {rsvp.comments && (
          <p className="text-xs text-gray-600 mt-1 italic">"{rsvp.comments}"</p>
        )}
        {rsvp.dietary_restrictions && (
          <p className="text-xs text-gray-500 mt-0.5">Dietary: {rsvp.dietary_restrictions}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-gray-500 py-6 text-center">No {label} responses yet</p>
  );
}

function AddGuestForm({ eventId, onAdded }: { eventId: string; onAdded: () => void }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !profile) return;
    setSaving(true);
    const result = await addGuestToEvent(
      eventId,
      { name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined },
      profile.id
    );
    setSaving(false);
    if (result) {
      toast.success(`${name} added`);
      setName(''); setEmail(''); setPhone('');
      setOpen(false);
      onAdded();
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        Add Guest
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-3 mt-2 space-y-2 bg-gray-50">
      <p className="text-sm font-medium">Add walk-in guest</p>
      <div>
        <Label className="text-xs">Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="h-8 text-sm mt-1" />
      </div>
      <div>
        <Label className="text-xs">Email</Label>
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="optional" className="h-8 text-sm mt-1" />
      </div>
      <div>
        <Label className="text-xs">Phone</Label>
        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="optional" className="h-8 text-sm mt-1" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={!name.trim() || saving} className="flex-1">
          {saving ? 'Adding...' : 'Add Guest'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function EventAttendeesDialog({ eventId, eventTitle, open, onClose }: EventAttendeesDialogProps) {
  const [rsvps, setRsvps] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getEventRSVPs(eventId)
      .then(data => setRsvps(data as EventAttendee[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, eventId]);

  const going = rsvps.filter(r => r.status === 'going');
  const maybe = rsvps.filter(r => r.status === 'maybe');
  const notGoing = rsvps.filter(r => r.status === 'not_going');
  const waitlist = rsvps.filter(r => r.status === 'waitlist');
  const checkedInCount = rsvps.filter(r => r.checked_in_at).length;

  const totalAttending = going.reduce((sum, r) => sum + 1 + (r.plus_one_count || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Attendees
          </DialogTitle>
          <p className="text-sm text-gray-500 truncate">{eventTitle}</p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Summary counts */}
            <div className="flex gap-3 py-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700">{going.length}</span>
                <span className="text-gray-500">going</span>
                {totalAttending > going.length && (
                  <span className="text-gray-400 text-xs">(+{totalAttending - going.length} guests)</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <HelpCircle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-700">{maybe.length}</span>
                <span className="text-gray-500">maybe</span>
              </div>
              {notGoing.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-600">{notGoing.length}</span>
                  <span className="text-gray-500">no</span>
                </div>
              )}
              {checkedInCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm ml-auto">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700">{checkedInCount}</span>
                  <span className="text-gray-500">checked in</span>
                </div>
              )}
            </div>

            <Tabs defaultValue="going" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="flex-shrink-0">
                <TabsTrigger value="going">
                  Going <Badge variant="secondary" className="ml-1.5">{going.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="maybe">
                  Maybe <Badge variant="secondary" className="ml-1.5">{maybe.length}</Badge>
                </TabsTrigger>
                {notGoing.length > 0 && (
                  <TabsTrigger value="not_going">
                    No <Badge variant="secondary" className="ml-1.5">{notGoing.length}</Badge>
                  </TabsTrigger>
                )}
                {waitlist.length > 0 && (
                  <TabsTrigger value="waitlist">
                    Waitlist <Badge variant="secondary" className="ml-1.5">{waitlist.length}</Badge>
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-2">
                <TabsContent value="going" className="mt-0">
                  {going.length === 0 ? <EmptyState label="going" /> : going.map(r => <AttendeeRow key={r.id} rsvp={r} />)}
                  <AddGuestForm eventId={eventId} onAdded={load} />
                </TabsContent>
                <TabsContent value="maybe" className="mt-0">
                  {maybe.length === 0 ? <EmptyState label="maybe" /> : maybe.map(r => <AttendeeRow key={r.id} rsvp={r} />)}
                </TabsContent>
                <TabsContent value="not_going" className="mt-0">
                  {notGoing.map(r => <AttendeeRow key={r.id} rsvp={r} />)}
                </TabsContent>
                <TabsContent value="waitlist" className="mt-0">
                  {waitlist.map(r => <AttendeeRow key={r.id} rsvp={r} />)}
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
