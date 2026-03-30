import { useParams, Navigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  UserPlus, 
  Settings, 
  MessageSquare, 
  FileText, 
  Star, 
  Clock, 
  Plus, 
  MapPin 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import ContainerFeed from '@/app/components/shared/ContainerFeed';
import CircleDocuments from '@/app/components/circle/CircleDocuments';
import ContainerReviews from '@/app/components/shared/ContainerReviews';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { getParticipantLabel, formatParticipantCount } from '@/utils/terminology';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';

interface Meetup {
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
  created_at: string;
}

interface Meeting {
  id: string;
  name: string;
  slug: string;
  description: string;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  meeting_link: string | null;
  member_ids: string[];
  meetup_id: string | null;
}

export default function MeetupDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  }, [slug]);

  const fetchData = async () => {
    try {
      // Fetch meetup
      const { data: meetupData, error: meetupError } = await supabase
        .from('meetups')
        .select('*')
        .eq('slug', slug)
        .single();

      if (meetupError) throw meetupError;
      setMeetup(meetupData);

      // Fetch meetings for this meetup
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('meetup_id', meetupData.id)
        .order('event_date', { ascending: true, nullsFirst: false });

      if (meetingsError) throw meetingsError;
      setMeetings(meetingsData || []);
    } catch (error) {
      console.error('Error fetching meetup:', error);
      toast.error('Failed to load meetup');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!profile || !meetup) return;

    try {
      const updatedMemberIds = [...meetup.member_ids, profile.id];
      const { error } = await supabase
        .from('meetups')
        .update({ member_ids: updatedMemberIds })
        .eq('id', meetup.id);

      if (error) throw error;

      toast.success(`You've joined ${meetup.name}!`);
      fetchData();
    } catch (error) {
      console.error('Error joining meetup:', error);
      toast.error('Failed to join meetup');
    }
  };

  const handleLeave = async () => {
    if (!profile || !meetup) return;

    try {
      const updatedMemberIds = meetup.member_ids.filter(id => id !== profile.id);
      const { error } = await supabase
        .from('meetups')
        .update({ member_ids: updatedMemberIds })
        .eq('id', meetup.id);

      if (error) throw error;

      toast.success(`You've left ${meetup.name}`);
      fetchData();
    } catch (error) {
      console.error('Error leaving meetup:', error);
      toast.error('Failed to leave meetup');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!profile || !meetup) {
    return <Navigate to="/meetups" replace />;
  }

  const isMember = meetup.member_ids.includes(profile.id);
  const isAdmin = profile.role === 'super' || meetup.admin_ids.includes(profile.id);
  const canAccess = canViewContainer(profile, meetup, 'meetups');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Meetups', path: '/meetups' },
        { label: meetup.name }
      ]} />
      
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm">
        <Link to="/meetups">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meetups
        </Link>
      </Button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {meetup.cover_image && (
          <img src={meetup.cover_image} alt={meetup.name} className="w-full h-48 object-cover" />
        )}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{meetup.name}</h1>
              <p className="text-gray-600 mb-4">{meetup.description}</p>
              
              <div className="flex items-center text-sm text-gray-600 space-x-4 mb-4">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{formatParticipantCount('container', meetup.member_ids.length)}</span>
                </div>
              </div>

              {meetup.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {meetup.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <ShareInviteButton
                entityType="meetup"
                entityId={meetup.slug}
                entityName={meetup.name}
              />
              {!isMember && canAccess && (
                <Button onClick={handleJoin}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Meetup
                </Button>
              )}
              {isMember && !isAdmin && (
                <Button variant="outline" onClick={handleLeave}>
                  Leave Meetup
                </Button>
              )}
              {meetup.created_by && meetup.created_by !== profile.id && (
                <PrivateCommentDialog
                  containerType="meetup"
                  containerId={meetup.id}
                  containerTitle={meetup.name}
                  recipientId={meetup.created_by}
                  recipientName="the organizer"
                />
              )}
              {isAdmin && (
                <Button asChild variant="outline">
                  <Link to={`/meetups/${meetup.slug}/settings`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {canAccess && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">
              <Calendar className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="meetings">
              <Calendar className="w-4 h-4 mr-2" />
              Meetings ({meetings.length})
            </TabsTrigger>
            <TabsTrigger value="feed">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feed
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

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>About This Meetup Series</CardTitle>
                <CardDescription>
                  {meetup.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Upcoming Meetings</h3>
                    {meetings.length === 0 ? (
                      <p className="text-gray-500 text-sm">No meetings scheduled yet</p>
                    ) : (
                      <div className="space-y-2">
                        {meetings.slice(0, 3).map(meeting => (
                          <Link
                            key={meeting.id}
                            to={`/meetings/${meeting.slug}`}
                            className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium">{meeting.name}</div>
                                {meeting.event_date && (
                                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {format(parseISO(meeting.event_date), 'MMM d, yyyy')}
                                    {meeting.event_time && ` at ${meeting.event_time}`}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline">{meeting.member_ids.length} RSVPs</Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <Button asChild className="w-full">
                      <Link to={`/meetups/${meetup.slug}/add-meeting`}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Meeting
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meetings</CardTitle>
                    <CardDescription>
                      All meetings in this meetup series
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button asChild size="sm">
                      <Link to={`/meetups/${meetup.slug}/add-meeting`}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Meeting
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {meetings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No meetings scheduled yet</p>
                    {isAdmin && (
                      <Button asChild variant="outline" className="mt-4">
                        <Link to={`/meetups/${meetup.slug}/add-meeting`}>
                          Add First Meeting
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetings.map(meeting => (
                      <Link
                        key={meeting.id}
                        to={`/meetings/${meeting.slug}`}
                        className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{meeting.name}</h3>
                            {meeting.description && (
                              <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              {meeting.event_date && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(meeting.event_date), 'MMM d, yyyy')}
                                  {meeting.event_time && ` at ${meeting.event_time}`}
                                </div>
                              )}
                              {meeting.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {meeting.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {meeting.member_ids.length} RSVPs
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feed">
            <ContainerFeed containerId={meetup.id} containerType="meetup" />
          </TabsContent>

          <TabsContent value="documents">
            <CircleDocuments circleId={meetup.id} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="reviews">
            <ContainerReviews containerId={meetup.id} containerType="meetup" containerName={meetup.name} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      )}

      {!canAccess && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Members Only</h2>
          <p className="text-gray-600">This meetup is private. Join to view content.</p>
        </div>
      )}
    </div>
  );
}