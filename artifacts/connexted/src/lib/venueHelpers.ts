import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logError } from '@/lib/error-handler';

export interface Venue {
  id: string;
  name: string;
  type: 'physical' | 'virtual';
  
  // Location
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  virtual_link?: string;
  
  // Capacity and amenities
  capacity?: number;
  amenities?: string[];
  
  // Contact information
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  booking_instructions?: string;
  booking_lead_time?: string;
  
  // Ownership
  created_by: string;
  community_id?: string;
  is_public: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface VenueFormData {
  name: string;
  type: 'physical' | 'virtual';
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  virtual_link?: string;
  capacity?: number;
  amenities?: string[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  booking_instructions?: string;
  booking_lead_time?: string;
  community_id?: string;
  is_public?: boolean;
}

/**
 * Fetch all venues accessible to the current user
 */
export async function fetchUserVenues(userId: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .or(`created_by.eq.${userId},is_public.eq.true`)
    .order('name');

  if (error) {
    logError('Error fetching venues:', error, { component: 'venueHelpers' });
    toast.error('Failed to load venues');
    return [];
  }

  return data || [];
}

/**
 * Fetch user's personal venues only
 */
export async function fetchMyVenues(userId: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('created_by', userId)
    .order('name');

  if (error) {
    logError('Error fetching my venues:', error, { component: 'venueHelpers' });
    toast.error('Failed to load your venues');
    return [];
  }

  return data || [];
}

/**
 * Fetch all public venues (created by other users)
 */
export async function fetchPublicVenues(userId?: string): Promise<Venue[]> {
  let query = supabase
    .from('venues')
    .select(`
      *,
      creator:created_by(id, name, avatar)
    `)
    .eq('is_public', true)
    .order('name');

  // Optionally exclude current user's venues
  if (userId) {
    query = query.neq('created_by', userId);
  }

  const { data, error } = await query;

  if (error) {
    logError('Error fetching public venues:', error, { component: 'venueHelpers' });
    toast.error('Failed to load public venues');
    return [];
  }

  return data || [];
}

/**
 * Fetch a single venue by ID
 */
export async function fetchVenueById(venueId: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();

  if (error) {
    logError('Error fetching venue:', error, { component: 'venueHelpers' });
    return null;
  }

  return data;
}

/**
 * Create a new venue
 */
export async function createVenue(
  venueData: VenueFormData,
  userId: string
): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .insert({
      ...venueData,
      created_by: userId,
      is_public: venueData.is_public || false
    })
    .select()
    .single();

  if (error) {
    logError('Error creating venue:', error, { component: 'venueHelpers' });
    toast.error('Failed to create venue');
    return null;
  }

  toast.success('Venue created successfully');
  return data;
}

/**
 * Update an existing venue
 */
export async function updateVenue(
  venueId: string,
  venueData: Partial<VenueFormData>
): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .update(venueData)
    .eq('id', venueId)
    .select()
    .single();

  if (error) {
    logError('Error updating venue:', error, { component: 'venueHelpers' });
    toast.error('Failed to update venue');
    return null;
  }

  toast.success('Venue updated successfully');
  return data;
}

/**
 * Delete a venue
 */
export async function deleteVenue(venueId: string): Promise<boolean> {
  const { error } = await supabase
    .from('venues')
    .delete()
    .eq('id', venueId);

  if (error) {
    logError('Error deleting venue:', error, { component: 'venueHelpers' });
    toast.error('Failed to delete venue');
    return false;
  }

  toast.success('Venue deleted successfully');
  return true;
}

/**
 * Get venue usage count (how many events/sessions use this venue)
 */
export async function getVenueUsageCount(venueId: string): Promise<number> {
  const { count: eventsCount, error: eventsError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId);

  const { count: sessionsCount, error: sessionsError } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId);

  if (eventsError || sessionsError) {
    logError('Error fetching venue usage:', eventsError || sessionsError, { component: 'venueHelpers' });
    return 0;
  }

  return (eventsCount || 0) + (sessionsCount || 0);
}

/**
 * Fetch all events and sessions at a venue
 */
export async function fetchVenueEvents(venueId: string): Promise<{
  events: any[];
  sessions: any[];
}> {
  // Fetch events at this venue
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venueId)
    .order('start_time', { ascending: true });

  // Fetch sessions at this venue
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('venue_id', venueId)
    .order('start_date', { ascending: true });

  if (eventsError) {
    logError('Error fetching venue events:', eventsError, { component: 'venueHelpers' });
  }

  if (sessionsError) {
    logError('Error fetching venue sessions:', sessionsError, { component: 'venueHelpers' });
  }

  // If both failed, show toast
  if (eventsError && sessionsError) {
    toast.error('Failed to load venue events');
  }

  return {
    events: events || [],
    sessions: sessions || []
  };
}

/**
 * Format venue address for display
 */
export function formatVenueAddress(venue: Venue): string {
  if (venue.type === 'virtual') {
    return 'Virtual Event';
  }

  const parts = [
    venue.address,
    venue.city,
    venue.state,
    venue.zip_code
  ].filter(Boolean);

  return parts.join(', ') || 'Address not specified';
}

/**
 * Get venue display name with location
 */
export function getVenueDisplayName(venue: Venue): string {
  if (venue.type === 'virtual') {
    return `${venue.name} (Virtual)`;
  }
  
  return `${venue.name} - ${venue.city || 'Location'}`;
}