// Split candidate: ~413 lines — consider extracting rsvpEventHelpers, rsvpMeetupHelpers, and rsvpNotifications into separate modules.
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RSVPStatus, EventType, RSVPType } from './calendarHelpers';
import { notifyEventRSVP } from '@/lib/notificationHelpers';

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: RSVPStatus;
  response_date: string;
  plus_one_count?: number;
  dietary_restrictions?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Smart defaults for RSVP configuration based on event type
 */
export const RSVP_DEFAULTS: Record<EventType, {
  rsvp_type: RSVPType;
  hint: string;
  rsvp_required?: boolean;
  needs_capacity?: boolean;
}> = {
  meeting: {
    rsvp_type: 'none',
    hint: "Meetings typically don't need RSVP"
  },
  meetup: {
    rsvp_type: 'internal',
    hint: "Meetups benefit from knowing attendee count",
    rsvp_required: false
  },
  workshop: {
    rsvp_type: 'internal',
    hint: "Free workshops can use platform RSVP. For paid workshops, use external registration.",
    rsvp_required: true,
    needs_capacity: true
  },
  conference: {
    rsvp_type: 'external',
    hint: "Conferences typically use external registration platforms",
    rsvp_required: true,
    needs_capacity: true
  },
  standup: {
    rsvp_type: 'none',
    hint: "Daily standups don't need RSVP"
  },
  sprint: {
    rsvp_type: 'none',
    hint: "Sprints are work containers, not attendance events"
  },
  deadline: {
    rsvp_type: 'none',
    hint: "Deadlines are calendar markers, not gatherings"
  },
  office_hours: {
    rsvp_type: 'none',
    hint: "Office hours are typically drop-in"
  },
  webinar: {
    rsvp_type: 'internal',
    hint: "Webinars benefit from registration tracking",
    rsvp_required: true
  },
  training: {
    rsvp_type: 'external',
    hint: "Paid training should use external registration",
    rsvp_required: true
  },
  social: {
    rsvp_type: 'internal',
    hint: "Social events are typically free and can use platform RSVP",
    rsvp_required: false
  },
  other: {
    rsvp_type: 'none',
    hint: "Configure RSVP as needed"
  }
};

/**
 * Get or create user's RSVP for an event
 */
export async function getUserRSVP(eventId: string, userId: string): Promise<EventRSVP | null> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user RSVP:', error);
    return null;
  }

  return data;
}

/**
 * Update or create user's RSVP
 */
export async function updateUserRSVP(
  eventId: string,
  userId: string,
  status: RSVPStatus,
  additionalData?: {
    plus_one_count?: number;
    dietary_restrictions?: string;
    comments?: string;
  }
): Promise<EventRSVP | null> {
  const existingRSVP = await getUserRSVP(eventId, userId);

  if (existingRSVP) {
    // Update existing RSVP
    const { data, error } = await supabase
      .from('event_rsvps')
      .update({
        status,
        response_date: new Date().toISOString(),
        ...additionalData
      })
      .eq('id', existingRSVP.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
      return null;
    }

    const statusMessages: Record<RSVPStatus, string> = {
      going: "You're going! 🎉",
      maybe: 'Marked as maybe',
      not_going: 'Marked as not going',
      no_response: 'RSVP cleared',
      waitlist: 'Added to waitlist'
    };
    
    toast.success(statusMessages[status]);
    
    // Send notification to event host (for going/maybe)
    if (status === 'going' || status === 'maybe') {
      await sendRSVPNotification(eventId, userId, status);
    }
    
    return data;
  } else {
    // Create new RSVP
    const { data, error } = await supabase
      .from('event_rsvps')
      .insert({
        event_id: eventId,
        user_id: userId,
        status,
        response_date: new Date().toISOString(),
        ...additionalData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating RSVP:', error);
      toast.error('Failed to create RSVP');
      return null;
    }

    const statusMessages: Record<RSVPStatus, string> = {
      going: "You're going! 🎉",
      maybe: 'Marked as maybe',
      not_going: 'Marked as not going',
      no_response: 'RSVP recorded',
      waitlist: 'Added to waitlist'
    };
    
    toast.success(statusMessages[status]);
    notifyEventRSVP(eventId, userId, status);
    return data;
  }
}

/**
 * Get RSVP counts for an event
 */
export async function getEventRSVPCounts(eventId: string): Promise<{
  going: number;
  maybe: number;
  not_going: number;
  total: number;
}> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching RSVP counts:', error);
    return { going: 0, maybe: 0, not_going: 0, total: 0 };
  }

  const going = data.filter(r => r.status === 'going').length;
  const maybe = data.filter(r => r.status === 'maybe').length;
  const not_going = data.filter(r => r.status === 'not_going').length;

  return {
    going,
    maybe,
    not_going,
    total: going + maybe
  };
}

/**
 * Get all RSVPs for an event (for event creators)
 */
export async function getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select(`
      *,
      user:users(id, name, avatar, email)
    `)
    .eq('event_id', eventId)
    .order('response_date', { ascending: false });

  if (error) {
    console.error('Error fetching event RSVPs:', error);
    toast.error('Failed to load RSVPs');
    return [];
  }

  return data || [];
}

/**
 * Track external registration click
 */
export async function trackExternalRSVPClick(
  eventId: string,
  userId: string,
  externalUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('external_rsvp_clicks')
    .insert({
      event_id: eventId,
      user_id: userId,
      external_url: externalUrl,
      clicked_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error tracking external click:', error);
    // Don't show error to user, this is just analytics
  }
}

/**
 * Get external click count for an event
 */
export async function getExternalClickCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('external_rsvp_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching external click count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if event is at capacity
 */
export async function isEventAtCapacity(eventId: string, maxAttendees?: number): Promise<boolean> {
  if (!maxAttendees) return false;

  const counts = await getEventRSVPCounts(eventId);
  return counts.going >= maxAttendees;
}

/**
 * Validate RSVP configuration
 */
export function validateEventRSVP(formData: {
  rsvp_type: RSVPType;
  is_paid_event: boolean;
  external_rsvp_url?: string;
  event_status?: string;
}): { valid: boolean; error?: string } {
  // Paid events MUST use external registration
  if (formData.rsvp_type === 'internal' && formData.is_paid_event) {
    return {
      valid: false,
      error: "Paid events must use external registration. Connexted Labs does not process payments."
    };
  }

  // External registration needs URL
  if (formData.rsvp_type === 'external' && !formData.external_rsvp_url) {
    return {
      valid: false,
      error: "External registration URL is required"
    };
  }

  // Validate URL format
  if (formData.external_rsvp_url) {
    try {
      new URL(formData.external_rsvp_url);
    } catch {
      return {
        valid: false,
        error: "Invalid URL format"
      };
    }
  }

  // Can't RSVP to Save the Date events
  if (formData.event_status === 'save_the_date' && formData.rsvp_type !== 'none') {
    return {
      valid: false,
      error: "Save the Date events cannot have RSVP enabled. Add event details first."
    };
  }

  return { valid: true };
}

/**
 * Helper to determine if an event needs time/venue (not Save the Date)
 */
export function isFullEvent(eventStatus?: string): boolean {
  return eventStatus !== 'save_the_date';
}

/**
 * Helper to check if RSVP is available for an event
 */
export function canRSVPToEvent(event: {
  rsvp_type?: RSVPType;
  event_status?: string;
  rsvp_deadline?: string;
}): boolean {
  // Can't RSVP to Save the Date
  if (event.event_status === 'save_the_date') return false;
  
  // Can't RSVP if RSVP is disabled
  if (!event.rsvp_type || event.rsvp_type === 'none') return false;
  
  // Can't RSVP if external
  if (event.rsvp_type === 'external') return false;
  
  // Check deadline
  if (event.rsvp_deadline) {
    const deadline = new Date(event.rsvp_deadline);
    if (new Date() > deadline) return false;
  }
  
  return true;
}

/**
 * Send RSVP notification to event host
 */
async function sendRSVPNotification(eventId: string, userId: string, status: RSVPStatus): Promise<void> {
  try {
    // Only notify for going/maybe statuses
    if (status !== 'going' && status !== 'maybe') return;

    // Fetch event details (title and host ID)
    const { data: event } = await supabase
      .from('events')
      .select('title, organizer_id, created_by')
      .eq('id', eventId)
      .single();

    if (!event) return;

    const hostId = event.organizer_id || event.created_by;
    if (!hostId) return;

    // Fetch attendee name
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (!user) return;

    // Send notification
    await notifyEventRSVP(
      eventId,
      event.title,
      hostId,
      userId,
      user.name,
      status as 'going' | 'maybe'
    );
  } catch (error) {
    console.error('Error sending RSVP notification:', error);
  }
}