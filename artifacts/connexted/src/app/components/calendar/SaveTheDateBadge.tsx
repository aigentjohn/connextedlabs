import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveTheDateBadgeProps {
  isSaveTheDate: boolean;
  onAddDetails?: () => void;
  className?: string;
}

export default function SaveTheDateBadge({ 
  isSaveTheDate, 
  onAddDetails,
  className 
}: SaveTheDateBadgeProps) {
  if (!isSaveTheDate) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <Badge 
        variant="outline" 
        className="border-dashed border-gray-400 text-gray-700 bg-gray-50"
      >
        📌 SAVE THE DATE
      </Badge>
      
      <p className="text-sm text-gray-600">
        Time and venue TBD
      </p>

      {onAddDetails && (
        <Button
          onClick={onAddDetails}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Add Event Details
        </Button>
      )}
    </div>
  );
}

/**
 * Get CSS classes for Save the Date event cards
 */
export function getSaveTheDateCardClass(isSaveTheDate: boolean): string {
  if (isSaveTheDate) {
    return 'border-dashed border-gray-300 bg-gray-50';
  }
  return 'border-solid';
}

/**
 * Format event time for display, handling Save the Date
 */
export function formatEventTime(event: {
  event_status?: string;
  start_date: string;
  start_time?: string | null;
  end_time?: string | null;
}): string {
  if (event.event_status === 'save_the_date') {
    return 'Time TBD';
  }

  if (!event.start_time) {
    return 'Time TBD';
  }

  const startTime = event.start_time;
  const endTime = event.end_time;

  // Format times (assumes HH:mm format)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  return formatTime(startTime);
}

/**
 * Format event location for display, handling Save the Date
 */
export function formatEventLocation(event: {
  event_status?: string;
  location?: string | null;
  is_virtual?: boolean;
}): string {
  if (event.event_status === 'save_the_date') {
    return 'Location TBD';
  }

  if (!event.location) {
    return 'Location TBD';
  }

  if (event.is_virtual) {
    return '🖥️ Virtual';
  }

  return `📍 ${event.location}`;
}
