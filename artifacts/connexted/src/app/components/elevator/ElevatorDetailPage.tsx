import { useParams, Navigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { Users, UserPlus, Check, Settings, MessageSquare, User, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent } from '@/app/components/ui/card';
import ContainerFeed from '@/app/components/shared/ContainerFeed';
import JoinElevatorDialog from '@/app/components/elevator/JoinElevatorDialog';
import EditIntroDialog from '@/app/components/elevator/EditIntroDialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { getParticipantLabel, formatParticipantCount } from '@/utils/terminology';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';

export default function ElevatorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [elevator, setElevator] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberIntros, setMemberIntros] = useState<Record<string, any>>({});
  const [creator, setCreator] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showEditIntroDialog, setShowEditIntroDialog] = useState(false);

  useEffect(() => {
    if (profile && slug) {
      fetchElevatorData();
    }
  }, [profile, slug]);

  const fetchElevatorData = async () => {
    try {
      // Fetch elevator
      const { data: elevatorData, error: elevatorError } = await supabase
        .from('elevators')
        .select('*')
        .eq('slug', slug)
        .single();

      if (elevatorError) throw elevatorError;
      setElevator(elevatorData);

      // Fetch creator
      if (elevatorData.created_by) {
        const { data: creatorData } = await supabase
          .from('users')
          .select('id, name, avatar, title')
          .eq('id', elevatorData.created_by)
          .single();
        
        if (creatorData) setCreator(creatorData);
      }

      // Fetch admins
      if (elevatorData.admin_ids && elevatorData.admin_ids.length > 0) {
        const { data: adminsData } = await supabase
          .from('users')
          .select('id, name, avatar, title')
          .in('id', elevatorData.admin_ids);
        
        if (adminsData) setAdmins(adminsData);
      }

      // Fetch member details with their intros
      if (elevatorData.member_ids && elevatorData.member_ids.length > 0) {
        const { data: membersData } = await supabase
          .from('users')
          .select('*')
          .in('id', elevatorData.member_ids);

        setMembers(membersData || []);
        
        // Fetch member intros from elevator_members table
        const { data: introsData } = await supabase
          .from('elevator_members')
          .select('*')
          .eq('elevator_id', elevatorData.id);
        
        if (introsData) {
          const introsMap = introsData.reduce((acc, intro) => {
            acc[intro.user_id] = intro;
            return acc;
          }, {} as Record<string, any>);
          setMemberIntros(introsMap);
        }
      }

    } catch (error) {
      console.error('Error fetching elevator data:', error);
      toast.error('Failed to load elevator');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading elevator...</p>
      </div>
    );
  }

  if (!elevator) {
    return <Navigate to="/elevators" replace />;
  }

  const isMember = elevator.member_ids?.includes(profile.id);
  const isAdmin = profile.role === 'super' || elevator.admin_ids?.includes(profile.id);
  const canAccess = canViewContainer(profile, elevator, 'elevators');

  const handleJoinElevator = async (intro: string) => {
    try {
      // Add to elevator_members table with intro
      const { error: memberError } = await supabase
        .from('elevator_members')
        .insert({
          elevator_id: elevator.id,
          user_id: profile.id,
          intro: intro,
        });

      if (memberError) throw memberError;

      // Update member_ids array in elevators table
      const updatedMemberIds = [...(elevator.member_ids || []), profile.id];
      const { error: elevatorError } = await supabase
        .from('elevators')
        .update({ member_ids: updatedMemberIds })
        .eq('id', elevator.id);

      if (elevatorError) throw elevatorError;

      // Refresh data
      await fetchElevatorData();
      toast.success(`You've joined ${elevator.name}!`);
    } catch (error) {
      console.error('Error joining elevator:', error);
      toast.error('Failed to join elevator');
      throw error;
    }
  };

  const handleLeaveElevator = async () => {
    try {
      // Remove from elevator_members table
      const { error: memberError } = await supabase
        .from('elevator_members')
        .delete()
        .eq('elevator_id', elevator.id)
        .eq('user_id', profile.id);

      if (memberError) throw memberError;

      // Update member_ids array
      const updatedMemberIds = (elevator.member_ids || []).filter((id: string) => id !== profile.id);
      const { error: elevatorError } = await supabase
        .from('elevators')
        .update({ member_ids: updatedMemberIds })
        .eq('id', elevator.id);

      if (elevatorError) throw elevatorError;

      setElevator({ ...elevator, member_ids: updatedMemberIds });
      setMembers(members.filter(m => m.id !== profile.id));
      toast.success(`You've left ${elevator.name}`);
    } catch (error) {
      console.error('Error leaving elevator:', error);
      toast.error('Failed to leave elevator');
    }
  };

  const handleUpdateIntro = async (intro: string) => {
    try {
      const { error } = await supabase
        .from('elevator_members')
        .update({ intro, updated_at: new Date().toISOString() })
        .eq('elevator_id', elevator.id)
        .eq('user_id', profile.id);

      if (error) throw error;

      // Update local state
      setMemberIntros({
        ...memberIntros,
        [profile.id]: { ...memberIntros[profile.id], intro }
      });

      toast.success('Your intro has been updated!');
    } catch (error) {
      console.error('Error updating intro:', error);
      toast.error('Failed to update intro');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Elevators', path: '/elevators' },
        { label: elevator.name }
      ]} />
      
      {/* Elevator Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {elevator.cover_image && (
          <img src={elevator.cover_image} alt={elevator.name} className="w-full h-48 object-cover" />
        )}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{elevator.name}</h1>
              <p className="text-gray-600 mb-4">{elevator.description}</p>
              
              <div className="flex items-center text-sm text-gray-600 space-x-4">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{formatParticipantCount('container', elevator.member_ids?.length || 0)}</span>
                </div>
                <div className="flex items-center">
                  <span className="capitalize">{elevator.visibility === 'public' ? 'Public' : 'Members Only'} elevator</span>
                </div>
              </div>

              {/* Creator and Admins */}
              {(creator || admins.length > 0) && (
                <div className="mt-4 space-y-2">
                  {creator && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500">Created by</span>
                      <span className="font-medium text-gray-900">{creator.name}</span>
                      {creator.title && (
                        <span className="text-gray-500">• {creator.title}</span>
                      )}
                    </div>
                  )}
                  {admins.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500">Admins:</span>
                      <span className="font-medium text-gray-900">
                        {admins.map(a => a.name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {elevator.tags && elevator.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {elevator.tags.map((tag: string, index: number) => (
                    <Badge key={`${elevator.id}-tag-${index}`} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 md:mt-0 md:ml-6 flex gap-2">
              <ShareInviteButton
                entityType="elevator"
                entityId={elevator.slug}
                entityName={elevator.name}
              />
              {!isMember && canAccess && (
                <Button onClick={() => setShowJoinDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Elevator
                </Button>
              )}
              {isMember && !isAdmin && (
                <Button variant="outline" onClick={handleLeaveElevator}>
                  <Check className="w-4 h-4 mr-2" />
                  Joined
                </Button>
              )}
              {elevator.created_by && elevator.created_by !== profile.id && (
                <PrivateCommentDialog
                  containerType="elevator"
                  containerId={elevator.id}
                  containerTitle={elevator.name}
                  recipientId={elevator.created_by}
                  recipientName={creator?.name || 'the creator'}
                />
              )}
              {isAdmin && (
                <Button asChild variant="outline">
                  <Link to={`/elevators/${elevator.slug}/settings`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
              {isMember && (
                <Badge variant="default" className="self-start">
                  Member
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access Control - Show message if user can't access */}
      {!canAccess ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Members Only</h2>
          <p className="text-gray-600 mb-6">
            This elevator is only accessible to members. Join to view content.
          </p>
          <Button onClick={() => setShowJoinDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Join Elevator
          </Button>
        </div>
      ) : (
        /* Elevator Content Tabs - Members and Feed */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              {getParticipantLabel('container', true)} ({members.length})
            </TabsTrigger>
            <TabsTrigger value="feed">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            {members.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <Users className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No {getParticipantLabel('container', true, true)} yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {isMember && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditIntroDialog(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Your Intro
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {members.map((member) => {
                    const memberIntro = memberIntros[member.id];
                    return (
                      <Card key={member.id}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-600 font-semibold text-lg">
                                {member.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900">{member.name}</p>
                                {elevator.admin_ids?.includes(member.id) && (
                                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                                )}
                              </div>
                              {member.title && (
                                <p className="text-sm text-gray-600 mb-2">{member.title}</p>
                              )}
                              {memberIntro?.intro && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {memberIntro.intro}
                                  </p>
                                </div>
                              )}
                              {!memberIntro?.intro && member.id === profile.id && (
                                <button
                                  onClick={() => setShowEditIntroDialog(true)}
                                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                                >
                                  + Add your intro
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="feed">
            <ContainerFeed containerType="elevator" containerId={elevator.id} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <JoinElevatorDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        elevatorName={elevator.name}
        elevatorDescription={elevator.description}
        onJoin={handleJoinElevator}
      />

      <EditIntroDialog
        open={showEditIntroDialog}
        onOpenChange={setShowEditIntroDialog}
        elevatorName={elevator.name}
        currentIntro={memberIntros[profile.id]?.intro || ''}
        onUpdate={handleUpdateIntro}
      />
    </div>
  );
}