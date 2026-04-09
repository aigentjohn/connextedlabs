import { supabase } from '@/lib/supabase';
import { CalendarStatus } from '@/app/components/calendar/StatusBadge';
import { logError } from '@/lib/error-handler';

export type EventType = 
  | 'meeting' 
  | 'meetup' 
  | 'workshop' 
  | 'conference' 
  | 'standup'
  | 'sprint'
  | 'deadline'
  | 'office_hours'
  | 'webinar'
  | 'training'
  | 'social'
  | 'other';

export type EventStatus = 'save_the_date' | 'confirmed' | 'completed' | 'cancelled';
export type RSVPType = 'none' | 'internal' | 'external';
export type RSVPStatus = 'going' | 'maybe' | 'not_going' | 'no_response' | 'waitlist';

export interface UnifiedCalendarItem {
  id: string;
  type: 'session' | 'event';
  source: 'program' | 'circle' | 'platform';
  
  // Common fields
  name?: string;
  title?: string;
  description: string;
  start_date: string;
  start_time?: string | null;
  end_date?: string;
  end_time?: string | null;
  duration_minutes?: number;
  location?: string;
  venue_id?: string;
  virtual_link?: string;
  is_virtual?: boolean;
  max_capacity?: number;
  max_attendees?: number;
  
  // Type indicators
  session_type?: string;
  event_type?: EventType;
  
  // Event status and RSVP
  event_status?: EventStatus;
  rsvp_type?: RSVPType;
  rsvp_required?: boolean;
  rsvp_deadline?: string;
  external_rsvp_url?: string;
  external_rsvp_label?: string;
  is_paid_event?: boolean;
  price_info?: string;
  
  // Helper computed properties
  is_save_the_date?: boolean;
  
  // Relationships
  program_id?: string;
  circle_id?: string;
  circle_ids?: string[];
  host_id?: string;
  created_by?: string;
  
  // Related data
  program?: {
    id: string;
    name: string;
    slug: string;
  };
  circle?: {
    id: string;
    name: string;
  };
  
  // Attendance/RSVP data
  attendance?: Array<{
    id: string;
    user_id: string;
    rsvp_status?: 'yes' | 'no' | 'maybe';
    rsvp_at?: string;
    attended?: boolean;
    attended_at?: string;
    expected?: boolean;
  }>;
  attendee_ids?: string[];
  user_rsvp_status?: RSVPStatus;
  rsvp_count?: number;
  
  // Registration & Resources
  registration_url?: string | null;
  agenda_url?: string | null;
  signups_closed?: boolean;
  
  // Status
  status?: string;
  userStatus: CalendarStatus;
  
  // Metadata
  created_at: string;
}

/**
 * Determine user's status for a session
 */
export function getUserSessionStatus(
  session: any,
  userId: string,
  isPast: boolean
): CalendarStatus {
  const attendance = session.attendance?.[0]; // Should be filtered to current user
  const isHost = session.created_by === userId;

  if (isHost) return 'hosting';
  
  // For past sessions
  if (isPast) {
    if (attendance?.attended) return 'attended';
    if (attendance?.expected && !attendance?.attended) return 'missed';
    return 'past_no_rsvp';
  }
  
  // For future sessions - check if rsvp_status exists (migration applied)
  if (attendance?.rsvp_status) {
    if (attendance.rsvp_status === 'yes') return 'attending';
    if (attendance.rsvp_status === 'maybe') return 'maybe';
    if (attendance.rsvp_status === 'no') return 'not_attending';
  }
  
  // Fallback: use expected field if rsvp_status doesn't exist yet
  if (attendance?.expected) return 'attending';
  
  // No attendance record = needs RSVP
  if (!attendance) return 'needs_rsvp';
  
  return 'invited';
}

/**
 * Determine user's status for an event
 */
export function getUserEventStatus(
  event: any,
  userId: string,
  isPast: boolean
): CalendarStatus {
  const isHost = event.host_id === userId;
  const isAttending = event.attendee_ids?.includes(userId);

  if (isHost) return 'hosting';
  if (isPast && isAttending) return 'attended';
  if (isPast && !isAttending) return 'past_no_rsvp';
  if (isAttending) return 'attending';
  
  return 'invited';
}

/**
 * Fetch all calendar data for a user
 */
export async function fetchUnifiedCalendarData(userId: string, userCircleIds: string[]) {
  try {
    // 1. Fetch Platform Events
    const { data: platformEvents, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true });

    if (eventsError) {
      logError('Error fetching events:', eventsError, { component: 'calendarHelpers' });
    }

    // Filter events to those accessible to user
    const userEvents = (platformEvents || [])
      .filter((e: any) => {
        // Show if no circle restriction (platform-wide)
        if (!e.circle_ids || e.circle_ids.length === 0) return true;
        // Show if event is in user's circles
        return e.circle_ids.some((cId: string) => userCircleIds.includes(cId));
      })
      .map((e: any) => {
        const isPast = new Date(e.end_time || e.start_time) < new Date();
        
        // Determine source: circle event vs platform-wide event
        const hasCircles = e.circle_ids && e.circle_ids.length > 0;
        
        return {
          ...e,
          type: 'event' as const,
          source: hasCircles ? 'circle' as const : 'platform' as const,
          userStatus: getUserEventStatus(e, userId, isPast)
        };
      });

    // Separate circle events from platform events for counts
    const circleEvents = userEvents.filter(e => e.source === 'circle');
    const platformOnlyEvents = userEvents.filter(e => e.source === 'platform');

    // All items are just events now (no program sessions)
    const allItems: UnifiedCalendarItem[] = [...userEvents];

    return {
      items: allItems,
      counts: {
        total: allItems.length,
        needsRsvp: allItems.filter(i => i.userStatus === 'needs_rsvp' || i.userStatus === 'invited').length,
        attending: allItems.filter(i => i.userStatus === 'attending').length,
        maybe: allItems.filter(i => i.userStatus === 'maybe').length,
        hosting: allItems.filter(i => i.userStatus === 'hosting').length,
        past: allItems.filter(i => ['attended', 'missed', 'past_no_rsvp'].includes(i.userStatus)).length,
        fromCircles: circleEvents.length,
        fromPlatform: platformOnlyEvents.length
      }
    };
  } catch (error) {
    logError('Error fetching unified calendar data:', error, { component: 'calendarHelpers' });
    throw error;
  }
}

/**
 * Generate .ics file for calendar download
 */
export function generateICS(item: UnifiedCalendarItem, reminderPreference: string = 'none') {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string) => {
    return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const title = item.type === 'session' ? item.name : item.title;
  const endDate = item.end_date || (
    item.duration_minutes 
      ? new Date(new Date(item.start_date).getTime() + item.duration_minutes * 60000).toISOString()
      : item.start_date
  );

  // Build reminder lines based on user preference
  const reminderLines = [];
  if (reminderPreference === '1hour') {
    reminderLines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Event reminder',
      'TRIGGER:-PT1H',
      'END:VALARM'
    );
  } else if (reminderPreference === '1day') {
    reminderLines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Event reminder',
      'TRIGGER:-PT24H',
      'END:VALARM'
    );
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CONNEXTED LABS//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${item.id}@community-platform.com`,
    `DTSTART:${formatDate(item.start_date)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeText(title || '')}`,
    `DESCRIPTION:${escapeText(item.description || '')}`,
    item.location ? `LOCATION:${escapeText(item.location)}` : '',
    item.virtual_link ? `URL:${item.virtual_link}` : '',
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`,
    `CREATED:${formatDate(item.created_at)}`,
    `LAST-MODIFIED:${formatDate(item.created_at)}`,
    ...reminderLines,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n');

  return icsContent;
}

/**
 * Download .ics file
 */
export function downloadICS(item: UnifiedCalendarItem, reminderPreference: string = 'none') {
  const icsContent = generateICS(item, reminderPreference);
  const title = item.type === 'session' ? item.name : item.title;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${(title || 'event').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}