import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Video, X } from 'lucide-react';
import { useProgramContext } from '@/hooks/useProgramContext';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ProgramContextBanner } from '@/app/components/shared/ProgramContextBanner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { programContext, clearContext } = useProgramContext();
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
  const [timezone, setTimezone] = useState('UTC');
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [externalLink, setExternalLink] = useState('');
  const [externalPlatform, setExternalPlatform] = useState<'zoom' | 'teams' | 'meet' | 'other' | ''>('');
  const [maxAttendees, setMaxAttendees] = useState('');

  const [loading, setLoading] = useState(false);

  // ✅ useEffect MUST come before any early returns (Rules of Hooks)
  useEffect(() => {
    const fetchSponsors = async () => {
      const { data, error } = await supabase.from('sponsors').select('*');
      if (error) {
        console.error('Error fetching sponsors:', error);
      } else {
        setSponsors(data || []);
      }
    };
    fetchSponsors();
  }, []);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
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
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const slug = generateSlug(name) + '-' + Date.now();

      // Get the current community ID from profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('community_id')
        .eq('id', profile.id)
        .single();

      if (userError || !userData?.community_id) {
        throw new Error('No community associated with your account');
      }

      // Build start / end datetime
      const startDateTime = eventTime
        ? new Date(`${eventDate}T${eventTime}:00`)
        : new Date(`${eventDate}T00:00:00`);

      const endDateTime =
        durationMinutes && eventTime
          ? new Date(startDateTime.getTime() + parseInt(durationMinutes) * 60000)
          : null;

      // 1. Create the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          community_id: userData.community_id,
          title: name.trim(),
          description: description.trim() || null,
          event_type: 'meeting',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime?.toISOString() || null,
          location: location.trim() || null,
          is_virtual: isVirtual,
          external_link: externalLink.trim() || null,
          external_platform: externalPlatform || null,
          host_id: profile.id,
          attendee_ids: [profile.id],
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
          tags,
        })
        .select('id')
        .single();

      if (eventError) throw eventError;

      // 2. Create the meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          slug,
          visibility,
          cover_image: coverImage.trim() || null,
          tags,
          created_by: profile.id,
          admin_ids: [profile.id],
          member_ids: [profile.id],
          guest_ids: [],
          community_id: userData.community_id,
          event_id: eventData.id,
          sponsor_id: sponsorId === 'none' ? null : sponsorId,
        })
        .select('id, slug')
        .single();

      if (meetingError) throw meetingError;

      // 3. Add creator as a member
      const { error: memberError } = await supabase
        .from('meeting_members')
        .insert({
          meeting_id: meetingData.id,
          user_id: profile.id,
          rsvp_status: 'attending',
          intro: null,
        });

      if (memberError) console.warn('Could not add creator as member:', memberError);

      toast.success('Meeting created!');
      navigate(`/meetings/${meetingData.slug}`);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      if (error.code === '23505') {
        toast.error('A meeting with this name already exists — try a different name');
      } else {
        toast.error(error.message || 'Failed to create meeting');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Meetings', path: '/meetings' },
        { label: 'Create Meeting' },
      ]} />

      <ProgramContextBanner context={programContext} onClear={clearContext} />

      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/meetings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Meetings
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Video className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Create Meeting</h1>
        </div>
        <p className="text-gray-600">
          Create a scheduled gathering combining networking, event details, and shared documents
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
          <CardDescription>
            Provide information about your meeting to help people decide if they want to join
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Meeting Name *</Label>
              <Input
                id="name"
                name="meeting-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 Planning Session, Weekly Team Standup, Product Demo"
                autoComplete="off"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="meeting-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this meeting is about, the agenda, and what members can expect..."
                autoComplete="off"
                rows={4}
              />
              <p className="text-sm text-gray-500">
                Help potential attendees understand if this meeting is relevant to them
              </p>
            </div>

            {/* Event Date & Time Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Event Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Date */}
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>

                {/* Event Time */}
                <div className="space-y-2">
                  <Label htmlFor="eventTime">Event Time</Label>
                  <Input
                    id="eventTime"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                  />
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Conference Room A, 123 Main St, Building 2"
                  autoComplete="off"
                />
                <p className="text-sm text-gray-500">Physical location (if applicable)</p>
              </div>

              {/* Virtual toggle */}
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="isVirtual"
                  checked={isVirtual}
                  onChange={(e) => setIsVirtual(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isVirtual">This is a virtual event</Label>
              </div>

              {/* Meeting Link */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="meetingLink">Video Conference Link</Label>
                <Input
                  id="meetingLink"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                  autoComplete="off"
                />
                <p className="text-sm text-gray-500">
                  Zoom, Google Meet, Teams, or other video conference link
                </p>
              </div>

              {/* External Platform */}
              {externalLink && (
                <div className="space-y-2 mt-4">
                  <Label htmlFor="externalPlatform">Platform</Label>
                  <Select value={externalPlatform} onValueChange={(v: any) => setExternalPlatform(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="meet">Google Meet</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Max Attendees */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="maxAttendees">Max Attendees (optional)</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  min="1"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  placeholder="Leave blank for unlimited"
                />
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-2 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                name="meeting-cover-image"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                autoComplete="off"
              />
              <p className="text-sm text-gray-500">Optional: URL of an image for your meeting</p>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — Anyone can view and join</SelectItem>
                  <SelectItem value="member">Members Only — Only logged-in members can view</SelectItem>
                  <SelectItem value="unlisted">Unlisted — Only with direct link</SelectItem>
                  <SelectItem value="private">Private — Invite only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tags (press Enter)"
                />
                <Button type="button" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="pl-2 pr-1">
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

            {/* Sponsor */}
            <div className="space-y-2">
              <Label htmlFor="sponsorId">Sponsor</Label>
              <Select
                value={sponsorId || 'none'}
                onValueChange={(value) => setSponsorId(value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a sponsor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sponsor</SelectItem>
                  {sponsors.map((sponsor) => (
                    <SelectItem key={sponsor.id} value={sponsor.id}>
                      {sponsor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Meeting'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/meetings')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
