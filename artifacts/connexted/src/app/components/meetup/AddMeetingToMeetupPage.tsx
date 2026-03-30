import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, X } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function AddMeetingToMeetupPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [meetup, setMeetup] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [sponsorId, setSponsorId] = useState<string>('none');
  const [sponsors, setSponsors] = useState<any[]>([]);
  
  // Event-specific fields
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchMeetup();
      fetchSponsors();
    }
  }, [slug]);

  const fetchMeetup = async () => {
    try {
      const { data, error } = await supabase
        .from('meetups')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setMeetup(data);
      
      // Pre-fill some fields from meetup
      setTags(data.tags || []);
      setCoverImage(data.cover_image || '');
    } catch (error) {
      console.error('Error fetching meetup:', error);
      toast.error('Failed to load meetup');
      navigate('/meetups');
    }
  };

  const fetchSponsors = async () => {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*');

    if (error) {
      console.error('Error fetching sponsors:', error);
    } else {
      setSponsors(data || []);
    }
  };

  if (!profile || !meetup) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const isAdmin = profile.role === 'super' || meetup.admin_ids.includes(profile.id);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have permission to add meetings to this meetup</p>
      </div>
    );
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast.error('Unable to create meeting');
      return;
    }

    if (!name.trim()) {
      toast.error('Meeting name is required');
      return;
    }

    if (!eventDate) {
      toast.error('Event date is required');
      return;
    }

    setLoading(true);

    try {
      const meetingSlug = generateSlug(name);

      const { data: userData } = await supabase
        .from('users')
        .select('community_id')
        .eq('id', profile.id)
        .single();

      if (!userData?.community_id) {
        throw new Error('No community associated with user');
      }

      const meetingData = {
        name: name.trim(),
        description: description.trim(),
        slug: meetingSlug,
        visibility,
        cover_image: coverImage.trim() || null,
        tags,
        created_by: profile.id,
        admin_ids: [profile.id],
        member_ids: [profile.id],
        guest_ids: [],
        community_id: userData.community_id,
        sponsor_id: sponsorId === 'none' ? null : sponsorId,
        meetup_id: meetup.id, // Link to meetup
        // Event fields
        event_date: eventDate,
        event_time: eventTime || null,
        duration_minutes: parseInt(durationMinutes) || 60,
        location: location.trim() || null,
        meeting_link: meetingLink.trim() || null,
        timezone: timezone,
      };

      const { data: newMeeting, error: meetingError } = await supabase
        .from('meetings')
        .insert([meetingData])
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Create event entry for this meeting and link it
      if (eventDate) {
        // Build the event timestamp
        const eventDateTime = eventTime 
          ? `${eventDate}T${eventTime}:00Z`
          : `${eventDate}T00:00:00Z`;
        
        const eventData = {
          community_id: userData.community_id,
          circle_ids: [], // Meetup meetings can be linked to circles later if needed
          title: name.trim(),
          description: description.trim() || null,
          event_type: 'meeting' as const,
          start_time: eventDateTime,
          end_time: null, // Calculate if duration provided
          location: location.trim() || null,
          venue_id: null,
          is_virtual: !!meetingLink.trim(),
          external_link: meetingLink.trim() || null,
          external_platform: meetingLink.trim() ? 'zoom' : null,
          rsvp_type: 'none' as const,
          rsvp_required: false,
          max_attendees: null,
          rsvp_deadline: null,
          external_rsvp_url: null,
          external_rsvp_label: null,
          is_paid_event: false,
          price_info: null,
          host_id: profile.id,
          attendee_ids: [profile.id],
          tags: [],
          agenda_url: null,
          signups_closed: false,
        };

        const { data: createdEvent, error: eventError } = await supabase
          .from('events')
          .insert([eventData])
          .select('id')
          .single();

        if (eventError) {
          console.error('Error creating event:', eventError);
          toast.error('Meeting created but event calendar entry failed');
        } else if (createdEvent) {
          // Link the event to the meeting
          const { error: linkError } = await supabase
            .from('meetings')
            .update({ event_id: createdEvent.id })
            .eq('id', newMeeting.id);
          
          if (linkError) {
            console.error('Error linking event to meeting:', linkError);
          }
        }
      }

      toast.success('Meeting added to meetup successfully!');
      navigate(`/meetups/${slug}`);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      if (error.code === '23505') {
        toast.error('A meeting with this name already exists');
      } else {
        toast.error('Failed to create meeting');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Meetups', path: '/meetups' },
        { label: meetup.name, path: `/meetups/${meetup.slug}` },
        { label: 'Add Meeting' }
      ]} />
      
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to={`/meetups/${slug}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {meetup.name}
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Add Meeting</h1>
        </div>
        <p className="text-gray-600">
          Create a new meeting in the {meetup.name} series
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
          <CardDescription>
            Provide information about this meeting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Meeting Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Week 1: Getting Started"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this meeting cover?"
                rows={4}
              />
            </div>

            {/* Event Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Event Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventTime">Event Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>

            {/* Duration & Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  min="15"
                  step="15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="UTC"
                />
              </div>
            </div>

            {/* Location & Meeting Link */}
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Physical address or venue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink">Video Conference Link (Optional)</Label>
              <Input
                id="meetingLink"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — Anyone can view and RSVP</SelectItem>
                  <SelectItem value="member">Members Only — Only meetup members can RSVP</SelectItem>
                  <SelectItem value="unlisted">Unlisted — Only with direct link</SelectItem>
                  <SelectItem value="private">Private — Invite only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sponsor */}
            {sponsors.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sponsor">Sponsor (Optional)</Label>
                <Select value={sponsorId} onValueChange={setSponsorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sponsor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No sponsor</SelectItem>
                    {sponsors.map((sponsor) => (
                      <SelectItem key={sponsor.id} value={sponsor.id}>
                        {sponsor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cover Image */}
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tags..."
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Add Meeting'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/meetups/${slug}`)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}