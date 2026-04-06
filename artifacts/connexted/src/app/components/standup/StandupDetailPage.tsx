import { useState,useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { Users, UserPlus, Check, Settings, MessageSquare, User, Edit, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent } from '@/app/components/ui/card';
import ContainerFeed from '@/app/components/shared/ContainerFeed';
import JoinStandupDialog from '@/app/components/standup/JoinStandupDialog';
import EditResponseDialog from '@/app/components/standup/EditResponseDialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { getParticipantLabel, formatParticipantCount } from '@/utils/terminology';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';

export default function StandupDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [standup, setStandup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberResponses, setMemberResponses] = useState<Record<string, any>>({});
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [creator, setCreator] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showEditResponseDialog, setShowEditResponseDialog] = useState(false);

  useEffect(() => {
    if (profile && slug) {
      fetchStandupData();
    }
  }, [profile, slug]);

  const fetchStandupData = async () => {
    try {
      // Fetch standup
      const { data: standupData, error: standupError } = await supabase
        .from('standups')
        .select('*')
        .eq('slug', slug)
        .single();

      if (standupError) throw standupError;
      setStandup(standupData);

      // Fetch creator
      if (standupData.created_by) {
        const { data: creatorData } = await supabase
          .from('users')
          .select('id, name, avatar, title')
          .eq('id', standupData.created_by)
          .single();
        
        if (creatorData) setCreator(creatorData);
      }

      // Fetch admins
      if (standupData.admin_ids && standupData.admin_ids.length > 0) {
        const { data: adminsData } = await supabase
          .from('users')
          .select('id, name, avatar, title')
          .in('id', standupData.admin_ids);
        
        if (adminsData) setAdmins(adminsData);
      }

      // Fetch member details with their responses
      if (standupData.member_ids && standupData.member_ids.length > 0) {
        const { data: membersData } = await supabase
          .from('users')
          .select('*')
          .in('id', standupData.member_ids);

        setMembers(membersData || []);
        
        // Fetch member responses from standup_responses table
        const { data: responsesData } = await supabase
          .from('standup_responses')
          .select('*')
          .eq('standup_id', standupData.id);
        
        if (responsesData) {
          const responsesMap = responsesData.reduce((acc, response) => {
            acc[response.user_id] = response;
            return acc;
          }, {} as Record<string, any>);
          setMemberResponses(responsesMap);
        }

        // Fetch post counts for each member in this standup
        const { data: postsData } = await supabase
          .from('posts')
          .select('author_id')
          .eq('container_type', 'standup')
          .eq('container_id', standupData.id);

        if (postsData) {
          const counts = postsData.reduce((acc, post) => {
            acc[post.author_id] = (acc[post.author_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          setPostCounts(counts);
        }
      }

    } catch (error) {
      console.error('Error fetching standup data:', error);
      toast.error('Failed to load standup');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading standup...</p>
      </div>
    );
  }

  if (!standup) {
    return <Navigate to="/standups" replace />;
  }

  const isMember = standup.member_ids?.includes(profile.id);
  const isAdmin = profile.role === 'super' || standup.admin_ids?.includes(profile.id);
  const canAccess = canViewContainer(profile, standup, 'standups');

  const handleJoinStandup = async (response: string, emoji?: string) => {
    try {
      // Add to standup_responses table with response
      const { error: responseError } = await supabase
        .from('standup_responses')
        .insert({
          standup_id: standup.id,
          user_id: profile.id,
          response: response,
          emoji: emoji || null,
        });

      if (responseError) throw responseError;

      // Update member_ids array in standups table
      const updatedMemberIds = [...(standup.member_ids || []), profile.id];
      const { error: standupError } = await supabase
        .from('standups')
        .update({ member_ids: updatedMemberIds })
        .eq('id', standup.id);

      if (standupError) throw standupError;

      // Refresh data
      await fetchStandupData();
      toast.success(`You've joined ${standup.name}!`);
    } catch (error) {
      console.error('Error joining standup:', error);
      toast.error('Failed to join standup');
      throw error;
    }
  };

  const handleLeaveStandup = async () => {
    try {
      // Remove from standup_responses table
      const { error: responseError } = await supabase
        .from('standup_responses')
        .delete()
        .eq('standup_id', standup.id)
        .eq('user_id', profile.id);

      if (responseError) throw responseError;

      // Update member_ids array
      const updatedMemberIds = (standup.member_ids || []).filter((id: string) => id !== profile.id);
      const { error: standupError } = await supabase
        .from('standups')
        .update({ member_ids: updatedMemberIds })
        .eq('id', standup.id);

      if (standupError) throw standupError;

      setStandup({ ...standup, member_ids: updatedMemberIds });
      setMembers(members.filter(m => m.id !== profile.id));
      toast.success(`You've left ${standup.name}`);
    } catch (error) {
      console.error('Error leaving standup:', error);
      toast.error('Failed to leave standup');
    }
  };

  const handleUpdateResponse = async (response: string, emoji?: string) => {
    try {
      const updatedAt = new Date().toISOString();
      
      const { error } = await supabase
        .from('standup_responses')
        .update({ response, emoji: emoji || null, updated_at: updatedAt })
        .eq('standup_id', standup.id)
        .eq('user_id', profile.id);

      if (error) throw error;

      // Update local state with updated_at
      setMemberResponses({
        ...memberResponses,
        [profile.id]: { 
          ...memberResponses[profile.id], 
          response, 
          emoji,
          updated_at: updatedAt 
        }
      });

      toast.success('Your response has been updated!');
    } catch (error) {
      console.error('Error updating response:', error);
      toast.error('Failed to update response');
      throw error;
    }
  };

  const handleDeleteResponse = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('standup_responses')
        .delete()
        .eq('standup_id', standup.id)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      const updatedResponses = { ...memberResponses };
      delete updatedResponses[userId];
      setMemberResponses(updatedResponses);

      toast.success('Response deleted');
    } catch (error) {
      console.error('Error deleting response:', error);
      toast.error('Failed to delete response');
    }
  };

  const handleClearScoreboard = async () => {
    if (!confirm('Are you sure you want to clear ALL responses? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('standup_responses')
        .delete()
        .eq('standup_id', standup.id);

      if (error) throw error;

      // Clear local state
      setMemberResponses({});

      toast.success('Scoreboard cleared');
    } catch (error) {
      console.error('Error clearing scoreboard:', error);
      toast.error('Failed to clear scoreboard');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Standups', path: '/standups' },
        { label: standup.name }
      ]} />
      
      {/* Standup Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {standup.cover_image && (
          <img src={standup.cover_image} alt={standup.name} className="w-full h-48 object-cover" />
        )}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{standup.name}</h1>
              <p className="text-gray-600 mb-4">{standup.description}</p>
              
              <div className="flex items-center text-sm text-gray-600 space-x-4">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{formatParticipantCount('container', standup.member_ids?.length || 0)}</span>
                </div>
                <div className="flex items-center">
                  <span className="capitalize">{standup.visibility === 'public' ? 'Public' : 'Members Only'} standup</span>
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
              {standup.tags && standup.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {standup.tags.map((tag: string, index: number) => (
                    <Badge key={`${standup.id}-tag-${index}`} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 md:mt-0 md:ml-6 flex gap-2">
              <ShareInviteButton
                entityType="standup"
                entityId={standup.slug}
                entityName={standup.name}
              />
              {!isMember && canAccess && (
                <Button onClick={() => setShowJoinDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Standup
                </Button>
              )}
              {isMember && !isAdmin && (
                <Button variant="outline" onClick={handleLeaveStandup}>
                  <Check className="w-4 h-4 mr-2" />
                  Joined
                </Button>
              )}
              {standup.created_by && standup.created_by !== profile.id && (
                <PrivateCommentDialog
                  containerType="standup"
                  containerId={standup.id}
                  containerTitle={standup.name}
                  recipientId={standup.created_by}
                  recipientName={creator?.name || 'the creator'}
                />
              )}
              {isAdmin && (
                <Button asChild variant="outline">
                  <Link to={`/standups/${standup.slug}/settings`}>
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
            This standup is only accessible to members. Join to participate.
          </p>
          <Button onClick={() => setShowJoinDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Join Standup
          </Button>
        </div>
      ) : (
        /* Standup Content Tabs - Members and Feed */
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
                {/* Custom Question Display */}
                {standup.custom_question && (
                  <Card className="bg-indigo-50 border-indigo-200">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-indigo-900">
                        📝 {standup.custom_question}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {isMember && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditResponseDialog(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {memberResponses[profile.id]?.response ? 'Edit Your Response' : 'Add Your Response'}
                    </Button>
                  </div>
                )}

                {/* Participation Scorecard */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Participation Scorecard</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Member</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Responded</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Posts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => {
                            const hasResponse = !!memberResponses[member.id]?.response;
                            const postCount = postCounts[member.id] || 0;
                            const isCurrentUser = member.id === profile.id;
                            
                            return (
                              <tr key={member.id} className={`border-b hover:bg-gray-50 ${isCurrentUser ? 'bg-indigo-50' : ''}`}>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                      <span className="text-indigo-600 font-semibold text-sm">
                                        {member.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {member.name}
                                        {isCurrentUser && <span className="text-xs text-indigo-600 ml-2">(You)</span>}
                                      </p>
                                      {member.title && (
                                        <p className="text-xs text-gray-500">{member.title}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {hasResponse ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                                  ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full mx-auto" />
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge variant={postCount > 0 ? 'default' : 'outline'}>
                                    {postCount}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Member Responses */}
                <div className="grid grid-cols-1 gap-4">
                  {members.map((member) => {
                    const memberResponse = memberResponses[member.id];
                    const canDeleteResponse = isAdmin || member.id === profile.id;
                    return (
                      <Card key={member.id}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-600 font-semibold text-lg">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                                    {memberResponse?.emoji && (
                                      <span className="text-2xl" title="Status">{memberResponse.emoji}</span>
                                    )}
                                  </div>
                                  {member.title && (
                                    <p className="text-sm text-gray-500">{member.title}</p>
                                  )}
                                  {standup.admin_ids?.includes(member.id) && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                                {canDeleteResponse && memberResponse?.response && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteResponse(member.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              {memberResponse?.response ? (
                                <div className="mt-2">
                                  <p className="text-gray-700 whitespace-pre-wrap">{memberResponse.response}</p>
                                  {memberResponse.updated_at && (
                                    <p className="text-xs text-gray-400 mt-2">
                                      Updated {new Date(memberResponse.updated_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-400 italic text-sm mt-2">
                                  + Add your response
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {isAdmin && Object.keys(memberResponses).length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearScoreboard}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Clear All Responses
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feed">
            <ContainerFeed 
              containerId={standup.id}
              containerType="standup"
              containerName={standup.name}
              isMember={isMember}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      {showJoinDialog && (
        <JoinStandupDialog
          standupName={standup.name}
          customQuestion={standup.custom_question}
          onClose={() => setShowJoinDialog(false)}
          onJoin={handleJoinStandup}
        />
      )}

      {showEditResponseDialog && (
        <EditResponseDialog
          customQuestion={standup.custom_question}
          currentResponse={memberResponses[profile.id]?.response || ''}
          currentEmoji={memberResponses[profile.id]?.emoji || ''}
          onClose={() => setShowEditResponseDialog(false)}
          onUpdate={handleUpdateResponse}
        />
      )}
    </div>
  );
}