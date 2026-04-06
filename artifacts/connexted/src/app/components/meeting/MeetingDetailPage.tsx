import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft, Users, CheckCircle, HelpCircle, XCircle,
  Edit2, Settings, Calendar, MessageSquare, FileText,
  Star, MapPin, Video,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import ShareInviteButton from '@/app/components/shared/ShareInviteButton';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import ContainerFeed from '@/app/components/shared/ContainerFeed';
import ContainerReviews from '@/app/components/shared/ContainerReviews';

interface Meeting {
  id: string;
  name: string;
  description: string;
  slug: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  cover_image: string | null;
  tags: string[];
  member_ids: string[];
  admin_ids: string[];
  created_by: string;
  event_id: string | null;
  sponsor_id: string | null;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  is_virtual: boolean;
  external_link: string | null;
  external_platform: string | null;
  host_id: string;
  attendee_ids: string[];
  max_attendees: number | null;
  tags: string[];
}

interface MeetingMember {
  id: string;
  user_id: string;
  intro: string | null;
  rsvp_status: 'attending' | 'maybe' | 'declined';
  joined_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function MeetingDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState('event');
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<MeetingMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [myMembership, setMyMembership] = useState<MeetingMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingIntro, setEditingIntro] = useState(false);
  const [introText, setIntroText] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'maybe' | 'declined'>('attending');
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  }, [slug]);

  const fetchData = async () => {
    try {
      // Fetch meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (meetingError) throw meetingError;
      
      if (!meetingData) {
        toast.error('Meeting not found');
        navigate('/meetings');
        return;
      }
      
      setMeeting(meetingData);

      // Fetch event if exists
      if (meetingData.event_id) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', meetingData.event_id)
          .single();

        if (!eventError && eventData) {
          setEvent(eventData);
        }
      }

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('meeting_members')
        .select('*')
        .eq('meeting_id', meetingData.id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Find my membership
      const myMember = membersData?.find((m) => m.user_id === profile?.id);
      setMyMembership(myMember || null);
      if (myMember) {
        setIntroText(myMember.intro || '');
        setRsvpStatus(myMember.rsvp_status);
      }

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch sponsor if exists
      if (meetingData.sponsor_id) {
        const { data: sponsorData, error: sponsorError } = await supabase
          .from('sponsors')
          .select('*')
          .eq('id', meetingData.sponsor_id)
          .single();

        if (!sponsorError && sponsorData) {
          setSponsor(sponsorData);
        }
      }
    } catch (error) {
      console.error('Error fetching meeting:', error);
      toast.error('Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    if (!profile || !meeting || !event) return;

    try {
      // Check if already a member
      if (myMembership) {
        toast.info('You have already RSVPed to this meeting');
        setEditingIntro(true);
        return;
      }

      // Add to meeting_members with RSVP
      const { error: memberError } = await supabase
        .from('meeting_members')
        .insert({
          meeting_id: meeting.id,
          user_id: profile.id,
          rsvp_status: 'attending',
          intro: null,
        });

      if (memberError) throw memberError;

      // Add to member_ids array in meetings
      const updatedMemberIds = [...meeting.member_ids, profile.id];
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ member_ids: updatedMemberIds })
        .eq('id', meeting.id);

      if (updateError) throw updateError;

      // Add to attendee_ids in events (since RSVP status is 'attending')
      const updatedAttendeeIds = [...event.attendee_ids, profile.id];
      const { error: eventUpdateError } = await supabase
        .from('events')
        .update({ attendee_ids: updatedAttendeeIds })
        .eq('id', event.id);

      if (eventUpdateError) throw eventUpdateError;

      toast.success(`You've RSVPed to ${meeting.name}!`);
      setEditingIntro(true);
      fetchData();
    } catch (error) {
      console.error('Error RSVPing:', error);
      toast.error('Failed to RSVP');
    }
  };

  const handleUpdateIntro = async () => {
    if (!profile || !meeting || !myMembership || !event) return;

    const previousStatus = myMembership.rsvp_status;
    const newStatus = rsvpStatus;

    try {
      // Update meeting_members
      const { error } = await supabase
        .from('meeting_members')
        .update({ 
          intro: introText.trim() || null,
          rsvp_status: rsvpStatus
        })
        .eq('id', myMembership.id);

      if (error) throw error;

      // Sync with events.attendee_ids based on status change
      if (previousStatus !== 'attending' && newStatus === 'attending') {
        // Add to attendee_ids
        const updatedAttendeeIds = [...event.attendee_ids, profile.id];
        const { error: eventError } = await supabase
          .from('events')
          .update({ attendee_ids: updatedAttendeeIds })
          .eq('id', event.id);
        
        if (eventError) console.error('Error adding to attendees:', eventError);
      } else if (previousStatus === 'attending' && newStatus !== 'attending') {
        // Remove from attendee_ids
        const updatedAttendeeIds = event.attendee_ids.filter(id => id !== profile.id);
        const { error: eventError } = await supabase
          .from('events')
          .update({ attendee_ids: updatedAttendeeIds })
          .eq('id', event.id);
        
        if (eventError) console.error('Error removing from attendees:', eventError);
      }

      toast.success('RSVP updated!');
      setEditingIntro(false);
      fetchData();
    } catch (error) {
      console.error('Error updating intro:', error);
      toast.error('Failed to update RSVP');
    }
  };

  const handleLeave = async () => {
    if (!profile || !meeting || !myMembership || !event) return;

    const wasAttending = myMembership.rsvp_status === 'attending';

    try {
      // Remove from meeting_members
      const { error: memberError } = await supabase
        .from('meeting_members')
        .delete()
        .eq('id', myMembership.id);

      if (memberError) throw memberError;

      // Remove from member_ids array
      const updatedMemberIds = meeting.member_ids.filter((id) => id !== profile.id);
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ member_ids: updatedMemberIds })
        .eq('id', meeting.id);

      if (updateError) throw updateError;

      // If user was attending, remove from events.attendee_ids
      if (wasAttending) {
        const updatedAttendeeIds = event.attendee_ids.filter(id => id !== profile.id);
        const { error: eventError } = await supabase
          .from('events')
          .update({ attendee_ids: updatedAttendeeIds })
          .eq('id', event.id);
        
        if (eventError) console.error('Error removing from attendees:', eventError);
      }

      toast.success(`You've left ${meeting.name}`);
      fetchData();
    } catch (error) {
      console.error('Error leaving:', error);
      toast.error('Failed to leave meeting');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!profile || !meeting) {
    return <Navigate to="/meetings" replace />;
  }

  const isMember = meeting.member_ids.includes(profile.id);
  const isAdmin = profile.role === 'super' || meeting.admin_ids.includes(profile.id);
  const canAccess = canViewContainer(profile, meeting, 'meetings');

  const formatEventDateTime = () => {
    if (!event) return null;
    
    const date = new Date(event.start_time);
    const dateFormatted = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    if (event.end_time) {
      const endDate = new Date(event.end_time);
      const endDateFormatted = endDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
      return `${dateFormatted} to ${endDateFormatted}`;
    }
    return dateFormatted;
  };

  const getUser = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  const getRSVPCounts = () => {
    return {
      attending: members.filter((m) => m.rsvp_status === 'attending').length,
      maybe: members.filter((m) => m.rsvp_status === 'maybe').length,
      declined: members.filter((m) => m.rsvp_status === 'declined').length,
    };
  };

  const rsvpCounts = getRSVPCounts();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Meetings', path: '/meetings' },
        { label: meeting.name }
      ]} />
      
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm">
        <Link to="/meetings">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meetings
        </Link>
      </Button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {meeting.cover_image && (
          <img src={meeting.cover_image} alt={meeting.name} className="w-full h-48 object-cover" />
        )}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{meeting.name}</h1>
              <p className="text-gray-600 mb-4">{meeting.description}</p>
              
              <div className="flex items-center text-sm text-gray-600 space-x-4 mb-4">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{meeting.member_ids.length} RSVPs</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{rsvpCounts.attending} attending</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HelpCircle className="w-4 h-4 text-yellow-600" />
                    <span>{rsvpCounts.maybe} maybe</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-gray-400" />
                    <span>{rsvpCounts.declined} declined</span>
                  </div>
                </div>
              </div>

              {meeting.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {meeting.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {sponsor && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  {sponsor.logo_url && (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="w-6 h-6 rounded object-contain"
                    />
                  )}
                  <span>Sponsored by {sponsor.name}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <ShareInviteButton
                entityType="meeting"
                entityId={meeting.slug}
                entityName={meeting.name}
              />
              {!isMember && canAccess && (
                <Button onClick={handleRSVP}>
                  RSVP
                </Button>
              )}
              {isMember && (
                <>
                  {myMembership && (
                    <Badge 
                      variant={
                        myMembership.rsvp_status === 'attending' ? 'default' : 
                        myMembership.rsvp_status === 'maybe' ? 'secondary' : 
                        'outline'
                      }
                      className="self-start"
                    >
                      {myMembership.rsvp_status === 'attending' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {myMembership.rsvp_status === 'maybe' && <HelpCircle className="w-3 h-3 mr-1" />}
                      {myMembership.rsvp_status === 'declined' && <XCircle className="w-3 h-3 mr-1" />}
                      {myMembership.rsvp_status.charAt(0).toUpperCase() + myMembership.rsvp_status.slice(1)}
                    </Badge>
                  )}
                  {!isAdmin && (
                    <Button variant="outline" onClick={handleLeave}>
                      Leave Meeting
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setEditingIntro(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit RSVP
                  </Button>
                </>
              )}
              {meeting.created_by && meeting.created_by !== profile.id && (
                <PrivateCommentDialog
                  containerType="meeting"
                  containerId={meeting.id}
                  containerTitle={meeting.name}
                  recipientId={meeting.created_by}
                  recipientName={getUser(meeting.created_by)?.name || 'the host'}
                />
              )}
              {isAdmin && (
                <Button asChild variant="outline">
                  <Link to={`/meetings/${meeting.slug}/settings`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Edit Intro Modal */}
          {editingIntro && myMembership && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Update Your RSVP</CardTitle>
                <CardDescription>
                  Let others know if you're attending and what you hope to get from this meeting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rsvp-status">RSVP Status</Label>
                  <Select value={rsvpStatus} onValueChange={(value: any) => setRsvpStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attending">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Attending
                        </div>
                      </SelectItem>
                      <SelectItem value="maybe">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-yellow-600" />
                          Maybe
                        </div>
                      </SelectItem>
                      <SelectItem value="declined">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-gray-400" />
                          Declined
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intro">Your Message (Optional)</Label>
                  <Textarea
                    id="intro"
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    placeholder="Share what you hope to get from this meeting, topics you'd like to discuss, or why you're attending..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUpdateIntro}>
                    Save RSVP
                  </Button>
                  <Button variant="outline" onClick={() => setEditingIntro(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {canAccess && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="event">
              <Calendar className="w-4 h-4 mr-2" />
              Event Details
            </TabsTrigger>
            <TabsTrigger value="feed">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              RSVPs ({meeting.member_ids.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="event">
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
                <CardDescription>
                  Details about when and where this meeting will take place
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {event ? (
                  <>
                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="font-medium">{formatEventDateTime()}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(event.start_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="font-medium">{event.location}</div>
                          <div className="text-sm text-gray-500">
                            {event.is_virtual ? 'Virtual Event' : 'Physical Location'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* External Link (Video Conference) */}
                    {event.external_link && (
                      <div className="flex items-start gap-3">
                        <Video className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <a
                            href={event.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Join {event.external_platform ? event.external_platform.charAt(0).toUpperCase() + event.external_platform.slice(1) : 'Video Conference'}
                          </a>
                          <div className="text-sm text-gray-500">Video conference link</div>
                        </div>
                      </div>
                    )}

                    {/* Attendee Info */}
                    {event.max_attendees && (
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="font-medium">
                            {event.attendee_ids.length} / {event.max_attendees} attendees
                          </div>
                          <div className="text-sm text-gray-500">
                            {event.max_attendees - event.attendee_ids.length} spots remaining
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>Event details have not been set yet</p>
                    {isAdmin && (
                      <Button asChild variant="outline" className="mt-4">
                        <Link to={`/meetings/${meeting.slug}/settings`}>
                          Add Event Details
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feed">
            <ContainerFeed containerId={meeting.id} containerType="meeting" />
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>RSVPs ({meeting.member_ids.length})</CardTitle>
                <CardDescription>
                  See who's attending and their messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>No RSVPs yet</p>
                    </div>
                  ) : (
                    <>
                      {/* Attending */}
                      {members.filter((m) => m.rsvp_status === 'attending').length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <h3 className="font-semibold">Attending ({rsvpCounts.attending})</h3>
                          </div>
                          <div className="space-y-3">
                            {members
                              .filter((m) => m.rsvp_status === 'attending')
                              .map((member) => {
                                const user = getUser(member.user_id);
                                const isCreator = member.user_id === meeting.created_by;
                                const isMemberAdmin = meeting.admin_ids.includes(member.user_id);

                                return (
                                  <div key={member.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                    {user?.avatar ? (
                                      <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">
                                          {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{user?.name || 'Unknown User'}</span>
                                        {isCreator && (
                                          <Badge variant="default" className="text-xs">Host</Badge>
                                        )}
                                        {isMemberAdmin && !isCreator && (
                                          <Badge variant="secondary" className="text-xs">Admin</Badge>
                                        )}
                                      </div>
                                      {member.intro && (
                                        <p className="text-sm text-gray-600 mt-1">{member.intro}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Maybe */}
                      {members.filter((m) => m.rsvp_status === 'maybe').length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <HelpCircle className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-semibold">Maybe ({rsvpCounts.maybe})</h3>
                          </div>
                          <div className="space-y-3">
                            {members
                              .filter((m) => m.rsvp_status === 'maybe')
                              .map((member) => {
                                const user = getUser(member.user_id);
                                return (
                                  <div key={member.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                    {user?.avatar ? (
                                      <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">
                                          {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium">{user?.name || 'Unknown User'}</span>
                                      {member.intro && (
                                        <p className="text-sm text-gray-600 mt-1">{member.intro}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Declined */}
                      {members.filter((m) => m.rsvp_status === 'declined').length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <h3 className="font-semibold text-gray-600">Declined ({rsvpCounts.declined})</h3>
                          </div>
                          <div className="space-y-3">
                            {members
                              .filter((m) => m.rsvp_status === 'declined')
                              .map((member) => {
                                const user = getUser(member.user_id);
                                return (
                                  <div key={member.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg opacity-60">
                                    {user?.avatar ? (
                                      <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">
                                          {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium">{user?.name || 'Unknown User'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Documents feature coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <ContainerReviews containerId={meeting.id} containerType="meeting" containerName={meeting.name} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      )}

      {!canAccess && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Members Only</h2>
          <p className="text-gray-600">This meeting is private. RSVP to view content.</p>
        </div>
      )}
    </div>
  );
}