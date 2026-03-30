import { useEffect, useState } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { getEventRSVPCounts, getExternalClickCount } from '@/lib/rsvpHelpers';
import { RSVPType } from '@/lib/calendarHelpers';
import { Users, TrendingUp } from 'lucide-react';

interface EventRSVPCountsProps {
  eventId: string;
  rsvpType?: RSVPType;
  maxAttendees?: number;
  compact?: boolean;
}

export default function EventRSVPCounts({ 
  eventId, 
  rsvpType, 
  maxAttendees,
  compact = false 
}: EventRSVPCountsProps) {
  const [counts, setCounts] = useState({ going: 0, maybe: 0, not_going: 0, total: 0 });
  const [externalClicks, setExternalClicks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounts();
  }, [eventId, rsvpType]);

  const loadCounts = async () => {
    setLoading(true);
    
    if (rsvpType === 'internal') {
      const rsvpCounts = await getEventRSVPCounts(eventId);
      setCounts(rsvpCounts);
    } else if (rsvpType === 'external') {
      const clickCount = await getExternalClickCount(eventId);
      setExternalClicks(clickCount);
    }
    
    setLoading(false);
  };

  if (loading) return null;

  // No RSVP type
  if (!rsvpType || rsvpType === 'none') {
    return null;
  }

  // External registration - show click count
  if (rsvpType === 'external') {
    if (externalClicks === 0) return null;
    
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <TrendingUp className="w-4 h-4" />
        <span>{externalClicks} clicked to register</span>
      </div>
    );
  }

  // Internal RSVP - show counts
  if (rsvpType === 'internal') {
    const isNearCapacity = maxAttendees && counts.going >= maxAttendees * 0.9;
    const isAtCapacity = maxAttendees && counts.going >= maxAttendees;

    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">
            {counts.going}
            {maxAttendees && `/${maxAttendees}`}
            {counts.maybe > 0 && (
              <span className="text-gray-500 ml-1">+{counts.maybe} maybe</span>
            )}
          </span>
          {isAtCapacity && (
            <Badge variant="destructive" className="text-xs">Full</Badge>
          )}
          {isNearCapacity && !isAtCapacity && (
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
              Almost Full
            </Badge>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {counts.going} going
            {maxAttendees && ` of ${maxAttendees}`}
          </span>
          {counts.maybe > 0 && (
            <span className="text-sm text-gray-500">• {counts.maybe} maybe</span>
          )}
        </div>

        {isAtCapacity && (
          <Badge variant="destructive" className="text-xs">
            🎫 Event is Full
          </Badge>
        )}
        
        {isNearCapacity && !isAtCapacity && (
          <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
            ⚠️ Almost Full - {maxAttendees! - counts.going} spots left
          </Badge>
        )}
      </div>
    );
  }

  return null;
}
