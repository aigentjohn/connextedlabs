import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { RSVPStatus, RSVPType } from '@/lib/calendarHelpers';
import { updateUserRSVP, trackExternalRSVPClick } from '@/lib/rsvpHelpers';
import { useAuth } from '@/lib/auth-context';
import { ExternalLink } from 'lucide-react';

interface EventRSVPButtonsProps {
  event: {
    id: string;
    rsvp_type?: RSVPType;
    event_status?: string;
    rsvp_deadline?: string;
    external_rsvp_url?: string;
    external_rsvp_label?: string;
    is_paid_event?: boolean;
    price_info?: string;
  };
  userRSVPStatus?: RSVPStatus | null;
  onRSVPUpdate?: () => void;
  compact?: boolean;
}

export default function EventRSVPButtons({ 
  event, 
  userRSVPStatus, 
  onRSVPUpdate,
  compact = false 
}: EventRSVPButtonsProps) {
  const { profile } = useAuth();

  // Can't RSVP to Save the Date
  if (event.event_status === 'save_the_date') {
    return (
      <Badge variant="outline" className="border-dashed border-gray-400 text-gray-600">
        🏷️ Save the Date • Time TBD
      </Badge>
    );
  }

  // No RSVP type - just show view details
  if (!event.rsvp_type || event.rsvp_type === 'none') {
    return null;
  }

  // Check RSVP deadline
  if (event.rsvp_deadline) {
    const deadline = new Date(event.rsvp_deadline);
    if (new Date() > deadline) {
      return (
        <Badge variant="outline" className="border-red-300 text-red-700">
          RSVP Closed
        </Badge>
      );
    }
  }

  // External registration
  if (event.rsvp_type === 'external') {
    const handleExternalClick = async () => {
      if (profile && event.external_rsvp_url) {
        await trackExternalRSVPClick(event.id, profile.id, event.external_rsvp_url);
        window.open(event.external_rsvp_url, '_blank');
      }
    };

    return (
      <div className="space-y-2">
        {event.price_info && (
          <div className="flex items-center gap-2">
            {event.is_paid_event ? (
              <Badge variant="outline" className="border-green-300 text-green-700">
                💵 {event.price_info}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                🆓 {event.price_info}
              </Badge>
            )}
          </div>
        )}
        
        <Button
          onClick={handleExternalClick}
          className="w-full"
          variant={event.is_paid_event ? 'default' : 'outline'}
        >
          {event.is_paid_event ? '🎫' : '📝'} {event.external_rsvp_label || 'Register'}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          🔗 Registration handled externally
        </p>
      </div>
    );
  }

  // Internal RSVP
  if (event.rsvp_type === 'internal') {
    const handleRSVPClick = async (status: RSVPStatus) => {
      if (!profile) return;
      
      await updateUserRSVP(event.id, profile.id, status);
      onRSVPUpdate?.();
    };

    if (compact) {
      // Compact view for calendar cards
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={userRSVPStatus === 'going' ? 'default' : 'outline'}
            onClick={() => handleRSVPClick('going')}
            className="flex-1"
          >
            ✅
          </Button>
          <Button
            size="sm"
            variant={userRSVPStatus === 'maybe' ? 'default' : 'outline'}
            onClick={() => handleRSVPClick('maybe')}
            className="flex-1"
          >
            🤔
          </Button>
          <Button
            size="sm"
            variant={userRSVPStatus === 'not_going' ? 'default' : 'outline'}
            onClick={() => handleRSVPClick('not_going')}
            className="flex-1"
          >
            ❌
          </Button>
        </div>
      );
    }

    // Full view with labels
    return (
      <div className="flex gap-2">
        <Button
          variant={userRSVPStatus === 'going' ? 'default' : 'outline'}
          onClick={() => handleRSVPClick('going')}
          className="flex-1"
        >
          ✅ Going
        </Button>
        <Button
          variant={userRSVPStatus === 'maybe' ? 'default' : 'outline'}
          onClick={() => handleRSVPClick('maybe')}
          className="flex-1"
        >
          🤔 Maybe
        </Button>
        <Button
          variant={userRSVPStatus === 'not_going' ? 'default' : 'outline'}
          onClick={() => handleRSVPClick('not_going')}
          className="flex-1"
        >
          ❌ Can't Go
        </Button>
      </div>
    );
  }

  return null;
}
