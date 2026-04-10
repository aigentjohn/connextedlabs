import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Users, MapPin, Mail, RefreshCw, ExternalLink, User } from 'lucide-react';
import { getCheckedInAttendees, CheckedInAttendee } from '@/lib/rsvpHelpers';
import { Link } from 'react-router';

interface EventAttendeesLiveProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
}

function AttendeeCard({ attendee }: { attendee: CheckedInAttendee }) {
  const isGuest = !attendee.user_id;
  const name = isGuest ? (attendee.guest_name || 'Guest') : (attendee.user?.name || 'Unknown');
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const shared = attendee.shared_fields || [];

  const email = isGuest
    ? attendee.guest_email
    : shared.includes('email') ? attendee.user?.email : null;
  const tagline = !isGuest && shared.includes('tagline') ? attendee.user?.tagline : null;
  const location = !isGuest && shared.includes('location') ? attendee.user?.location : null;
  const bio = !isGuest && shared.includes('bio') ? attendee.user?.bio : null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
      {/* Avatar — links to profile if platform member */}
      {!isGuest ? (
        <Link to={`/members/${attendee.user_id}`} className="flex-shrink-0">
          <Avatar className="w-12 h-12 ring-2 ring-white hover:ring-indigo-200 transition-all">
            <AvatarImage src={attendee.user?.avatar || undefined} />
            <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
        </Link>
      ) : (
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarFallback className="text-sm font-medium bg-gray-100">{initials}</AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {!isGuest ? (
            <Link
              to={`/members/${attendee.user_id}`}
              className="font-semibold text-sm hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              {name}
              <ExternalLink className="w-3 h-3 opacity-50" />
            </Link>
          ) : (
            <span className="font-semibold text-sm">{name}</span>
          )}
          {isGuest && (
            <Badge variant="outline" className="text-xs py-0">Guest</Badge>
          )}
        </div>

        {tagline && (
          <p className="text-xs text-gray-600 mt-0.5">{tagline}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              <Mail className="w-3 h-3" />
              {email}
            </a>
          )}
          {location && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              {location}
            </span>
          )}
        </div>

        {bio && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{bio}</p>
        )}
      </div>
    </div>
  );
}

export function EventAttendeesLive({ eventId, eventTitle, open, onClose }: EventAttendeesLiveProps) {
  const [attendees, setAttendees] = useState<CheckedInAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getCheckedInAttendees(eventId)
      .then(setAttendees)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
  }, [open, eventId]);

  const filtered = attendees.filter(a => {
    const name = a.user?.name || a.guest_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const memberCount = attendees.filter(a => !!a.user_id).length;
  const guestCount = attendees.filter(a => !a.user_id).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Who's Here
          </DialogTitle>
          <p className="text-sm text-gray-500 truncate">{eventTitle}</p>
        </DialogHeader>

        {/* Stats + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-gray-700">
              <User className="w-4 h-4 text-indigo-500" />
              <strong>{memberCount}</strong> members
            </span>
            {guestCount > 0 && (
              <span className="text-gray-500">{guestCount} guests</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 px-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search attendees..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm"
        />

        {/* Attendee list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && attendees.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {search ? 'No attendees match your search' : 'No one has checked in yet'}
            </p>
          ) : (
            filtered.map(a => <AttendeeCard key={a.id} attendee={a} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
