import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  AlertCircle, 
  Crown, 
  Mail,
  Calendar 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export type CalendarStatus = 
  | 'needs_rsvp'      // No RSVP yet, action needed
  | 'attending'       // RSVP'd yes
  | 'maybe'           // RSVP'd maybe
  | 'not_attending'   // RSVP'd no
  | 'attended'        // Past session, attended
  | 'missed'          // Past session, RSVP'd yes but didn't attend
  | 'hosting'         // User is hosting
  | 'invited'         // Invited but no response
  | 'past_no_rsvp';   // Past event, never RSVP'd

interface StatusBadgeProps {
  status: CalendarStatus;
  rsvpDate?: string;
  attendanceDate?: string;
}

const statusConfig = {
  needs_rsvp: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: AlertCircle,
    label: 'NEEDS RSVP - Action Required',
    urgent: true
  },
  attending: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    label: 'ATTENDING'
  },
  maybe: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: HelpCircle,
    label: 'MAYBE'
  },
  not_attending: {
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
    label: 'NOT ATTENDING'
  },
  attended: {
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: CheckCircle,
    label: 'ATTENDED'
  },
  missed: {
    color: 'bg-gray-800 text-white border-gray-900',
    icon: AlertCircle,
    label: 'MISSED',
    urgent: true
  },
  hosting: {
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Crown,
    label: 'HOSTING'
  },
  invited: {
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: Mail,
    label: 'INVITED'
  },
  past_no_rsvp: {
    color: 'bg-gray-200 text-gray-600 border-gray-400',
    icon: Calendar,
    label: 'Past Event'
  }
};

export function StatusBadge({ status, rsvpDate, attendanceDate }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getMetadata = () => {
    if (status === 'attending' || status === 'maybe' || status === 'not_attending') {
      return rsvpDate ? `RSVP'd ${formatDate(rsvpDate)}` : undefined;
    }
    if (status === 'attended') {
      return attendanceDate ? `Attended ${formatDate(attendanceDate)}` : 'Confirmed attendance';
    }
    return undefined;
  };

  const metadata = getMetadata();

  return (
    <div className={cn(
      'flex items-center justify-between p-3 border-b-2 rounded-t-lg',
      config.color,
      config.urgent && 'animate-pulse'
    )}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="font-semibold text-sm">{config.label}</span>
      </div>
      {metadata && (
        <span className="text-xs opacity-75">{metadata}</span>
      )}
    </div>
  );
}
