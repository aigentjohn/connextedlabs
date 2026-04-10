import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { checkInToEvent } from '@/lib/rsvpHelpers';
import { toast } from 'sonner';

interface EventCheckInDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
  onCheckedIn: () => void;
}

const SHAREABLE_FIELDS: { key: string; label: string; description: string }[] = [
  { key: 'email',    label: 'Email address',  description: 'Let other attendees email you' },
  { key: 'tagline',  label: 'Headline',        description: 'Your role or short tagline' },
  { key: 'location', label: 'Location',        description: 'Your city or region' },
  { key: 'bio',      label: 'Bio',             description: 'Your short bio' },
];

export function EventCheckInDialog({
  eventId,
  eventTitle,
  open,
  onClose,
  onCheckedIn,
}: EventCheckInDialogProps) {
  const { profile } = useAuth();
  const [sharedFields, setSharedFields] = useState<string[]>(['email', 'tagline']);
  const [loading, setLoading] = useState(false);

  if (!profile) return null;

  const initials = profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const toggle = (key: string) => {
    setSharedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const handleCheckIn = async () => {
    setLoading(true);
    const result = await checkInToEvent(eventId, profile.id, sharedFields);
    setLoading(false);
    if (result) {
      toast.success('Checked in!');
      onCheckedIn();
      onClose();
    }
  };

  // Filter to fields the user actually has filled in
  const availableFields = SHAREABLE_FIELDS.filter(f => {
    if (f.key === 'email') return !!profile.email;
    if (f.key === 'tagline') return !!profile.tagline;
    if (f.key === 'location') return !!profile.location;
    if (f.key === 'bio') return !!profile.bio;
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Check In
          </DialogTitle>
          <p className="text-sm text-gray-500 truncate">{eventTitle}</p>
        </DialogHeader>

        {/* Profile preview */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile.avatar || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{profile.name}</p>
            {profile.tagline && (
              <p className="text-xs text-gray-500">{profile.tagline}</p>
            )}
          </div>
        </div>

        {/* Contact sharing consent */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Share with other attendees:
          </p>
          <p className="text-xs text-gray-500">
            Your name and photo are always visible to checked-in attendees. Choose what else to share.
          </p>

          {availableFields.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Add more details to your profile to share with attendees.
            </p>
          ) : (
            <div className="space-y-2.5">
              {availableFields.map(field => (
                <div key={field.key} className="flex items-start gap-3">
                  <Checkbox
                    id={`share-${field.key}`}
                    checked={sharedFields.includes(field.key)}
                    onCheckedChange={() => toggle(field.key)}
                    className="mt-0.5"
                  />
                  <Label htmlFor={`share-${field.key}`} className="cursor-pointer leading-tight">
                    <span className="font-medium text-sm">{field.label}</span>
                    <span className="block text-xs text-gray-500">{field.description}</span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCheckIn} disabled={loading} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {loading ? 'Checking in...' : 'Check In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
