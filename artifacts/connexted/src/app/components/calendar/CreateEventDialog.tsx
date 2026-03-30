import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MapPin, Video, Phone, Mail, Info, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { notifyEventCreated } from '@/lib/notificationHelpers';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Switch } from '@/app/components/ui/switch';

type EventType = 'meeting' | 'meetup' | 'workshop' | 'conference' | 'social' | 'training' | 'webinar' | 'standup' | 'other';
type RSVPType = 'none' | 'internal' | 'external';

interface Venue {
  id: string;
  name: string;
  type: 'physical' | 'virtual';
  address?: string;
  city?: string;
  virtual_link?: string;
  capacity?: number;
}

// RSVP defaults by event type
const RSVP_DEFAULTS: Record<EventType, { rsvp_type: RSVPType; rsvp_required?: boolean; hint: string }> = {
  meeting: { rsvp_type: 'none', hint: 'Meetings typically don\'t need RSVP tracking' },
  meetup: { rsvp_type: 'internal', rsvp_required: false, hint: 'Meetups usually use platform RSVP for headcount' },
  workshop: { rsvp_type: 'internal', rsvp_required: true, hint: 'Workshops often limit capacity and need RSVPs' },
  conference: { rsvp_type: 'external', hint: 'Conferences typically use external registration' },
  social: { rsvp_type: 'internal', rsvp_required: false, hint: 'Social events use optional RSVP for planning' },
  training: { rsvp_type: 'internal', rsvp_required: true, hint: 'Training sessions need confirmed attendance' },
  webinar: { rsvp_type: 'external', hint: 'Webinars often use external platforms like Zoom' },
  standup: { rsvp_type: 'none', hint: 'Standups are recurring and don\'t need RSVP' },
  other: { rsvp_type: 'none', hint: 'Choose the RSVP option that fits your event' },
};

// Validation helper
function validateEventRSVP(data: { rsvp_type: RSVPType; is_paid_event: boolean; external_rsvp_url: string; isSaveTheDate: boolean }): { valid: boolean; error?: string } {
  // Save the Date doesn't need RSVP validation
  if (data.isSaveTheDate) {
    return { valid: true };
  }

  // Paid events MUST use external registration
  if (data.is_paid_event && data.rsvp_type !== 'external') {
    return { valid: false, error: 'Paid events must use external registration' };
  }

  // External RSVP requires a URL
  if (data.rsvp_type === 'external' && !data.external_rsvp_url) {
    return { valid: false, error: 'External registration URL is required' };
  }

  return { valid: true };
}

// Fetch user's saved venues
async function fetchUserVenues(userId: string): Promise<Venue[]> {
  const { data } = await supabase
    .from('venues')
    .select('*')
    .eq('created_by', userId)
    .order('name');
  return data || [];
}

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  circleId?: string;
  event?: any; // If provided, we're editing instead of creating
}

export default function CreateEventDialog({ isOpen, onClose, circleId, event }: CreateEventDialogProps) {
  const { profile } = useAuth();
  const [circles, setCircles] = useState<any[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditMode = !!event;

  // Parse event dates if editing
  const parseDateTime = (isoString?: string) => {
    if (!isoString) return { date: '', time: '' };
    const date = new Date(isoString);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toISOString().split('T')[1]?.substring(0, 5) || '';
    return { date: dateStr, time: timeStr };
  };

  const startDateTime = parseDateTime(event?.start_time);
  const endDateTime = parseDateTime(event?.end_time);

  const [formData, setFormData] = useState({
    // Basic Info
    title: event?.title || '',
    description: event?.description || '',
    eventType: (event?.event_type || 'other') as EventType,
    isSaveTheDate: false, // UI-only state, not saved to DB
    
    // Date & Time
    startDate: startDateTime.date,
    startTime: startDateTime.time,
    endDate: endDateTime.date,
    endTime: endDateTime.time,
    
    // Location
    location: event?.location || '',
    venueId: event?.venue_id || 'manual',
    isVirtual: event?.is_virtual || false,
    externalLink: event?.external_link || '',
    externalPlatform: event?.external_platform || 'none',
    
    // RSVP Configuration
    rsvpType: (event?.rsvp_type || 'none') as RSVPType,
    rsvpRequired: event?.rsvp_required || false,
    maxAttendees: event?.max_attendees?.toString() || '',
    rsvpDeadline: event?.rsvp_deadline ? new Date(event.rsvp_deadline).toISOString().split('T')[0] : '',
    
    // External Registration
    externalRsvpUrl: event?.external_rsvp_url || '',
    externalRsvpLabel: event?.external_rsvp_label || 'Register',
    isPaidEvent: event?.is_paid_event || false,
    priceInfo: event?.price_info || '',
    
    // Other
    selectedCircleId: event?.circle_ids?.[0] || circleId || 'platform-wide',
    tags: event?.tags?.join(', ') || '',
    agendaUrl: event?.agenda_url || '',
    signupsClosed: event?.signups_closed || false,
  });

  useEffect(() => {
    if (profile && isOpen) {
      fetchCircles();
      fetchUserVenues(profile.id).then(setVenues);
    }
  }, [profile, isOpen]);

  useEffect(() => {
    // Update RSVP defaults when event type changes
    const defaults = RSVP_DEFAULTS[formData.eventType];
    if (!isEditMode) {
      setFormData(prev => ({
        ...prev,
        rsvpType: defaults.rsvp_type,
        rsvpRequired: defaults.rsvp_required || false,
      }));
    }
  }, [formData.eventType, isEditMode]);

  const fetchCircles = async () => {
    const { data } = await supabase
      .from('circles')
      .select('*')
      .eq('community_id', profile?.community_id)
      .order('name');
    
    setCircles(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    // Validation based on event status
    if (formData.isSaveTheDate) {
      // Save the Date only needs title and date
      if (!formData.title || !formData.startDate) {
        toast.error('Save the Date requires Event Title and Start Date');
        return;
      }
    } else {
      // Full event needs title, date, and time
      if (!formData.title || !formData.startDate || !formData.startTime) {
        toast.error('Please fill in Event Title, Start Date, and Start Time');
        return;
      }
    }

    // Validate RSVP configuration
    const rsvpValidation = validateEventRSVP({
      rsvp_type: formData.rsvpType,
      is_paid_event: formData.isPaidEvent,
      external_rsvp_url: formData.externalRsvpUrl,
      isSaveTheDate: formData.isSaveTheDate
    });

    if (!rsvpValidation.valid) {
      toast.error(rsvpValidation.error);
      return;
    }

    setLoading(true);

    try {
      // Build timestamps based on event status
      let startDateTime: string;
      let endDateTime: string | undefined;

      if (formData.isSaveTheDate) {
        // Save the Date: just date, no time
        startDateTime = `${formData.startDate}T00:00:00Z`;
      } else {
        // Full event: date + time
        startDateTime = `${formData.startDate}T${formData.startTime}:00Z`;
        if (formData.endDate && formData.endTime) {
          endDateTime = `${formData.endDate}T${formData.endTime}:00Z`;
        }
      }

      // Determine circleIds
      let circleIds: string[] = [];
      if (circleId) {
        circleIds = [circleId];
      } else if (formData.selectedCircleId && formData.selectedCircleId !== 'platform-wide') {
        circleIds = [formData.selectedCircleId];
      }

      const eventData = {
        // Basic Info
        community_id: profile.community_id,
        circle_ids: circleIds,
        title: formData.title,
        description: formData.description || null,
        event_type: formData.eventType,
        
        // Date & Time - use start_time/end_time as TIMESTAMPTZ (not separate date/time fields)
        start_time: startDateTime,
        end_time: endDateTime || null,
        
        // Location (nullable for Save the Date)
        location: formData.location || null,
        venue_id: (formData.venueId && formData.venueId !== 'manual') ? formData.venueId : null,
        is_virtual: formData.isVirtual,
        external_link: formData.externalLink || null,
        external_platform: formData.externalPlatform !== 'none' ? formData.externalPlatform : null,
        
        // RSVP Configuration
        rsvp_type: formData.rsvpType,
        rsvp_required: formData.rsvpType === 'internal' ? formData.rsvpRequired : false,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        rsvp_deadline: formData.rsvpDeadline || null,
        
        // External Registration
        external_rsvp_url: formData.rsvpType === 'external' ? formData.externalRsvpUrl : null,
        external_rsvp_label: formData.rsvpType === 'external' ? formData.externalRsvpLabel : null,
        is_paid_event: formData.isPaidEvent,
        price_info: formData.priceInfo || null,
        
        // Host & Attendees
        host_id: event?.host_id || profile.id,
        attendee_ids: event?.attendee_ids || [profile.id],
        
        // Other
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        agenda_url: formData.agendaUrl || null,
        signups_closed: formData.signupsClosed,
      };

      if (isEditMode) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;
        
        if (formData.isSaveTheDate) {
          toast.success('Save the Date updated!');
        } else {
          toast.success('Event updated successfully!');
        }
      } else {
        // Create new event
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert(eventData)
          .select('id, title, start_time, circle_ids')
          .single();

        if (error) throw error;
        
        if (formData.isSaveTheDate) {
          toast.success('Save the Date created! Add details anytime.');
        } else {
          toast.success('Event created successfully!');
          
          // Notify circle members about the new event
          if (newEvent && newEvent.circle_ids && newEvent.circle_ids.length > 0) {
            for (const circleId of newEvent.circle_ids) {
              await notifyEventCreated(
                circleId,
                newEvent.id,
                newEvent.title,
                newEvent.start_time,
                profile.id
              );
            }
          }
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} event`);
    } finally {
      setLoading(false);
    }
  };

  const rsvpConfig = RSVP_DEFAULTS[formData.eventType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event' : 'Create Event'}</DialogTitle>
          <DialogDescription>
            {formData.isSaveTheDate 
              ? 'Create a Save the Date placeholder. You can add full details later.'
              : 'Create a full event with date, time, and location details.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Status Toggle */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <Label className="text-base font-medium mb-3 block">Event Type</Label>
            <RadioGroup
              value={formData.isSaveTheDate ? 'save_the_date' : 'confirmed'}
              onValueChange={(value) => {
                setFormData({ ...formData, isSaveTheDate: value === 'save_the_date' });
                // Reset RSVP when switching to Save the Date
                if (value === 'save_the_date') {
                  setFormData(prev => ({ ...prev, rsvpType: 'none', isSaveTheDate: true }));
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="save_the_date" id="save_the_date" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="save_the_date" className="cursor-pointer font-medium">
                    📌 Save the Date
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Block the date on calendars. Add time, venue, and RSVP details later.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="confirmed" id="confirmed" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="confirmed" className="cursor-pointer font-medium">
                    📅 Full Event Details
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Create complete event with time, location, and RSVP options.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Q1 Team Offsite"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={formData.isSaveTheDate ? "Details coming soon..." : "What's this event about?"}
              rows={3}
            />
          </div>

          {/* Event Type & Circle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Category</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value as EventType })}
              >
                <SelectTrigger id="eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="social">Social Event</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="standup">Standup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!circleId && (
              <div className="space-y-2">
                <Label htmlFor="circle">Circle (Optional)</Label>
                <Select
                  value={formData.selectedCircleId}
                  onValueChange={(value) => setFormData({ ...formData, selectedCircleId: value })}
                >
                  <SelectTrigger id="circle">
                    <SelectValue placeholder="Platform-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform-wide">Platform-wide</SelectItem>
                    {circles.map(circle => (
                      <SelectItem key={circle.id} value={circle.id}>
                        {circle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Date & Time Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <Label className="text-base font-medium">Date & Time</Label>
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              
              {!formData.isSaveTheDate && (
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    type="time"
                    id="startTime"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required={!formData.isSaveTheDate}
                  />
                </div>
              )}
            </div>

            {formData.isSaveTheDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900">
                  Save the Date mode: Time and location are optional. You can add these details later when they're finalized.
                </p>
              </div>
            )}

            {/* End Date & Time (only for full events) */}
            {!formData.isSaveTheDate && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    type="time"
                    id="endTime"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location Section (optional for Save the Date) */}
          {!formData.isSaveTheDate && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <Label className="text-base font-medium">Location</Label>
              </div>

              {/* Virtual Event Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isVirtual"
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) => setFormData({ ...formData, isVirtual: checked })}
                />
                <Label htmlFor="isVirtual">Virtual Event</Label>
              </div>

              {/* Venue Selector */}
              {venues.length > 0 && (
                <div className="space-y-2">
                  <Select
                    value={formData.venueId}
                    onValueChange={(value) => {
                      const selectedVenue = value !== 'manual' ? venues.find(v => v.id === value) : null;
                      setFormData({ 
                        ...formData, 
                        venueId: value,
                        location: selectedVenue ? (selectedVenue.address || selectedVenue.virtual_link || '') : formData.location,
                        isVirtual: selectedVenue ? selectedVenue.type === 'virtual' : formData.isVirtual
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Enter manually below</SelectItem>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.type === 'physical' ? '📍' : '🖥️'} {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected Venue Preview */}
                  {formData.venueId && formData.venueId !== 'manual' && venues.find(v => v.id === formData.venueId) && (() => {
                    const selectedVenue = venues.find(v => v.id === formData.venueId)!;
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          {selectedVenue.type === 'physical' ? (
                            <MapPin className="w-4 h-4 text-blue-700 mt-0.5" />
                          ) : (
                            <Video className="w-4 h-4 text-blue-700 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-blue-900">{selectedVenue.name}</p>
                            <p className="text-sm text-blue-700">
                              {selectedVenue.type === 'physical' 
                                ? `${selectedVenue.address}${selectedVenue.city ? ', ' + selectedVenue.city : ''}`
                                : selectedVenue.virtual_link
                              }
                            </p>
                            {selectedVenue.capacity && (
                              <p className="text-sm text-blue-700">Capacity: {selectedVenue.capacity}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Manual Location Input */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm text-gray-600">
                  {venues.length > 0 ? 'Or enter location manually' : 'Location'}
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value, venueId: 'manual' })}
                  placeholder={formData.isVirtual ? "Zoom, Google Meet, etc." : "123 Main St, Conference Room A"}
                />
              </div>
            </div>
          )}

          {/* RSVP Configuration (only for confirmed events) */}
          {!formData.isSaveTheDate && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label className="text-base font-medium">🎫 Registration & RSVP</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {rsvpConfig.hint}
                </p>
              </div>

              <RadioGroup
                value={formData.rsvpType}
                onValueChange={(value) => {
                  setFormData({ ...formData, rsvpType: value as RSVPType });
                  // Reset paid status if switching to internal
                  if (value === 'internal') {
                    setFormData(prev => ({ ...prev, isPaidEvent: false }));
                  }
                }}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="none" id="rsvp-none" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="rsvp-none" className="cursor-pointer font-medium">
                      No RSVP needed
                    </Label>
                    <p className="text-sm text-gray-600">
                      No registration tracking. Best for meetings and informal gatherings.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="internal" id="rsvp-internal" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="rsvp-internal" className="cursor-pointer font-medium">
                      RSVP in platform (free events only)
                    </Label>
                    <p className="text-sm text-gray-600">
                      Track RSVPs within the platform. Going/Maybe/Not Going buttons.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="external" id="rsvp-external" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="rsvp-external" className="cursor-pointer font-medium">
                      External registration
                    </Label>
                    <p className="text-sm text-gray-600">
                      Link to external platform (Eventbrite, Luma, etc.). Required for paid events.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Internal RSVP Settings */}
              {formData.rsvpType === 'internal' && (
                <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rsvpRequired"
                      checked={formData.rsvpRequired}
                      onCheckedChange={(checked) => setFormData({ ...formData, rsvpRequired: checked })}
                    />
                    <Label htmlFor="rsvpRequired">Require RSVP (mandatory)</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxAttendees">Max Attendees</Label>
                      <Input
                        id="maxAttendees"
                        type="number"
                        value={formData.maxAttendees}
                        onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                        placeholder="Optional"
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rsvpDeadline">RSVP Deadline</Label>
                      <Input
                        type="date"
                        id="rsvpDeadline"
                        value={formData.rsvpDeadline}
                        onChange={(e) => setFormData({ ...formData, rsvpDeadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900">
                      Free events only. Paid events must use external registration.
                    </p>
                  </div>
                </div>
              )}

              {/* External Registration Settings */}
              {formData.rsvpType === 'external' && (
                <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="externalRsvpUrl">Registration URL *</Label>
                    <Input
                      id="externalRsvpUrl"
                      type="url"
                      value={formData.externalRsvpUrl}
                      onChange={(e) => setFormData({ ...formData, externalRsvpUrl: e.target.value })}
                      placeholder="https://eventbrite.com/your-event"
                      required={formData.rsvpType === 'external'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="externalRsvpLabel">Button Text</Label>
                      <Select
                        value={formData.externalRsvpLabel}
                        onValueChange={(value) => setFormData({ ...formData, externalRsvpLabel: value })}
                      >
                        <SelectTrigger id="externalRsvpLabel">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Register">Register</SelectItem>
                          <SelectItem value="Buy Tickets">Buy Tickets</SelectItem>
                          <SelectItem value="Sign Up">Sign Up</SelectItem>
                          <SelectItem value="Get Tickets">Get Tickets</SelectItem>
                          <SelectItem value="RSVP">RSVP</SelectItem>
                          <SelectItem value="Book Now">Book Now</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priceInfo">Price (for display)</Label>
                      <Input
                        id="priceInfo"
                        value={formData.priceInfo}
                        onChange={(e) => setFormData({ ...formData, priceInfo: e.target.value })}
                        placeholder="$50 or Free"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPaidEvent"
                      checked={formData.isPaidEvent}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPaidEvent: checked })}
                    />
                    <Label htmlFor="isPaidEvent">This is a paid event</Label>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-900">
                      Registration and payment happen on your external platform. Connexted Labs does not process payments.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Options */}
          <div className="border-t pt-4 space-y-4">
            <Label className="text-base font-medium">Additional Options</Label>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="AI, Networking, Workshop"
              />
            </div>

            {/* Agenda URL */}
            <div className="space-y-2">
              <Label htmlFor="agendaUrl">Event Agenda URL</Label>
              <Input
                id="agendaUrl"
                type="url"
                value={formData.agendaUrl}
                onChange={(e) => setFormData({ ...formData, agendaUrl: e.target.value })}
                placeholder="https://docs.google.com/document/..."
              />
            </div>

            {/* Close Signups */}
            {!formData.isSaveTheDate && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="signupsClosed"
                  checked={formData.signupsClosed}
                  onCheckedChange={(checked) => setFormData({ ...formData, signupsClosed: checked })}
                />
                <Label htmlFor="signupsClosed">Close signups/registration</Label>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update Event' : formData.isSaveTheDate ? 'Create Save the Date' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}