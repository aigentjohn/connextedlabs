import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Star,
  ArrowLeft,
  Eye,
  Shield,
  UserPlus,
  UserX,
  Trash2,
  Search,
  Calendar,
  CheckSquare,
  AlertCircle,
  Link as LinkIcon,
  FileJson,
  Hash,
  Sparkles
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { isValidUUID } from '@/lib/uuid-utils';
import { notifyMemberJoined, notifyRoleChanged } from '@/lib/notificationHelpers';
import { ExportImportManager } from '@/app/components/ExportImportManager';
import CircleTopicsAudienceTab from '@/app/components/circle/CircleTopicsAudienceTab';
import CirclePeopleManager from '@/app/components/circle/CirclePeopleManager';

interface Circle {
  id: string;
  name: string;
  description: string;
  member_ids: string[];
  admin_ids: string[];
  guest_access: {
    feed: boolean;
    members: boolean;
    documents: boolean;
    forum: boolean;
    checklists: boolean;
    reviews: boolean;
    calendar: boolean;
  };
  enabled_features?: {
    feed: boolean;
    forums: boolean;
    documents: boolean;
    reviews: boolean;
    events: boolean;
    checklists: boolean;
  };
  feature_settings?: {
    feed?: {
      post_approval_required: boolean;
      posting_permissions: 'all' | 'admins_only' | 'moderators_and_admins';
      allow_comments: boolean;
      allow_reactions: boolean;
    };
    forums?: {
      thread_approval_required: boolean;
      thread_creation_permissions: 'all' | 'admins_only' | 'moderators_and_admins';
      allow_replies: boolean;
      allow_anonymous_posts: boolean;
    };
    documents?: {
      upload_approval_required: boolean;
      upload_permissions: 'all' | 'admins_only' | 'moderators_and_admins';
      max_file_size_mb: number;
      allowed_file_types: string[];
    };
    reviews?: {
      approval_required: boolean;
      submission_permissions: 'all' | 'admins_only' | 'members_only';
      allow_anonymous_reviews: boolean;
      rating_scale: 5 | 10;
    };
    events?: {
      creation_approval_required: boolean;
      creation_permissions: 'all' | 'admins_only' | 'moderators_and_admins';
      rsvp_enabled: boolean;
      rsvp_limit_enabled: boolean;
    };
  };
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export default function CircleSettingsPage() {
  const { circleId } = useParams<{ circleId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Validate ID before fetching
    if (!circleId || !isValidUUID(circleId)) {
      setLoading(false);
      toast.error('Invalid circle ID');
      navigate('/circles');
      return;
    }
    
    const fetchCircle = async () => {
      try {
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .eq('id', circleId)
          .single();
        
        if (error) throw error;
        setCircle(data);
      } catch (error) {
        console.error('Error fetching circle:', error);
        toast.error('Failed to load circle');
        navigate('/circles');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCircle();
  }, [circleId, navigate]);
  
  if (!profile) {
    return <div className="text-center py-12">Please log in</div>;
  }
  
  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }
  
  if (!circle) {
    return <div className="text-center py-12">Circle not found</div>;
  }
  
  const isAdmin = profile.role === 'super' || circle.admin_ids.includes(profile.id);
  
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access to this circle</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/circles/${circleId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Circle
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Circles', href: '/circles' },
          { label: circle.name, href: `/circles/${circleId}` },
          { label: 'Settings', href: `/circles/${circleId}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Circle Settings</h1>
        <p className="text-gray-600">Manage {circle.name}</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="topics">
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Topics</span>
          </TabsTrigger>
          <TabsTrigger value="guestAccess">
            <Eye className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Guest</span>
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Moderate</span>
          </TabsTrigger>
          <TabsTrigger value="feed">
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Feed</span>
          </TabsTrigger>
          <TabsTrigger value="forums">
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Forums</span>
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Star className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Reviews</span>
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="export-import">
            <FileJson className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export/Import</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-6">
          <CirclePeopleManager circle={circle} setCircle={setCircle} currentUserId={profile.id} />
        </TabsContent>

        <TabsContent value="topics" className="space-y-4 mt-6">
          <CircleTopicsAudienceTab circleId={circle.id} userId={profile.id} />
        </TabsContent>

        <TabsContent value="guestAccess" className="space-y-4 mt-6">
          <GuestAccessTab circle={circle} setCircle={setCircle} />
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4 mt-6">
          <ModerationTab circleId={circle.id} circleName={circle.name} />
        </TabsContent>

        <TabsContent value="feed" className="space-y-4 mt-6">
          <FeedSettingsTab circle={circle} setCircle={setCircle} />
        </TabsContent>

        <TabsContent value="forums" className="space-y-4 mt-6">
          <ForumsSettingsTab circle={circle} setCircle={setCircle} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-6">
          <DocumentsSettingsTab circle={circle} setCircle={setCircle} />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4 mt-6">
          <ReviewsSettingsTab circle={circle} setCircle={setCircle} />
        </TabsContent>

        <TabsContent value="events" className="space-y-4 mt-6">
          <EventsSettingsTab circle={circle} setCircle={setCircle} />
        </TabsContent>

        <TabsContent value="export-import" className="space-y-4 mt-6">
          <ExportImportManager 
            entityType="circle"
            entityId={circle.id}
            entityName={circle.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Members Tab Component
function MembersTab({ circle, setCircle, currentUserId }: { circle: Circle; setCircle: (circle: Circle) => void; currentUserId: string }) {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (circle.member_ids.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', circle.member_ids);

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [circle.member_ids]);

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async () => {
    const email = searchEmail.trim().toLowerCase();
    if (!email) return;

    try {
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', email)
        .maybeSingle();

      if (userError || !user) {
        toast.error('User not found with that email');
        return;
      }

      if (circle.member_ids.includes(user.id)) {
        toast.error('User is already a member');
        return;
      }

      const updatedMemberIds = [...circle.member_ids, user.id];
      const { error } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle({ ...circle, member_ids: updatedMemberIds });
      setMembers([...members, user]);
      setSearchEmail('');
      toast.success(`Added ${user.name} to the circle`);
      
      // Notify the new member that they were added
      await notifyMemberJoined('circle', circle.id, circle.name, user.id, user.name, circle.admin_ids);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (circle.admin_ids.includes(userId)) {
      toast.error('Cannot remove an admin. Remove admin status first.');
      return;
    }

    try {
      const updatedMemberIds = circle.member_ids.filter(id => id !== userId);
      const { error } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle({ ...circle, member_ids: updatedMemberIds });
      setMembers(members.filter(m => m.id !== userId));
      toast.success('Member removed from circle');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    const isCurrentlyAdmin = circle.admin_ids.includes(userId);

    if (isCurrentlyAdmin) {
      if (circle.admin_ids.length === 1) {
        toast.error('Circle must have at least one admin');
        return;
      }
    }

    try {
      const updatedAdminIds = isCurrentlyAdmin
        ? circle.admin_ids.filter(id => id !== userId)
        : [...circle.admin_ids, userId];

      const { error } = await supabase
        .from('circles')
        .update({ admin_ids: updatedAdminIds })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle({ ...circle, admin_ids: updatedAdminIds });
      toast.success(isCurrentlyAdmin ? 'Admin status removed' : 'Admin status granted');
      
      // Notify the user about their role change
      const newRole = isCurrentlyAdmin ? 'member' : 'admin';
      await notifyRoleChanged(circle.id, userId, newRole, circle.name, 'circle');
    } catch (error) {
      console.error('Error toggling admin:', error);
      toast.error('Failed to update admin status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Member */}
      <Card>
        <CardHeader>
          <CardTitle>Add Member</CardTitle>
          <CardDescription>Add a user to this circle by email address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
            />
            <Button onClick={handleAddMember}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member List */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>Manage circle members and their roles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-4 text-gray-600">Loading members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-4 text-gray-600">No members found</div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const isAdmin = circle.admin_ids.includes(member.id);
                const isCurrentUser = member.id === currentUserId;

                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {isAdmin && (
                            <Badge variant="secondary">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {isCurrentUser && <Badge variant="outline">You</Badge>}
                        </div>
                        <span className="text-sm text-gray-600">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isCurrentUser && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleAdmin(member.id)}
                          >
                            {isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={isAdmin}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Guest Access Tab Component
function GuestAccessTab({ circle, setCircle }: { circle: Circle; setCircle: (circle: Circle) => void }) {
  const defaultAccess = {
    feed: false,
    members: false,
    documents: false,
    forum: false,
    checklists: false,
    reviews: false,
    calendar: false,
  };

  const [guestAccess, setGuestAccess] = useState(circle.guest_access || defaultAccess);

  const handleToggleAccess = async (key: string) => {
    const updated = { ...guestAccess, [key]: !guestAccess[key] };

    try {
      const { error } = await supabase
        .from('circles')
        .update({ guest_access: updated })
        .eq('id', circle.id);

      if (error) throw error;

      setGuestAccess(updated);
      setCircle({ ...circle, guest_access: updated });
      toast.success(`Guest access to ${key} ${!guestAccess[key] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating guest access:', error);
      toast.error('Failed to update guest access');
    }
  };

  const handleBulkUpdate = async (enabled: boolean) => {
    const allAccess = {
      feed: enabled,
      members: enabled,
      documents: enabled,
      forum: enabled,
      checklists: enabled,
      reviews: enabled,
      calendar: enabled,
    };

    try {
      const { error } = await supabase
        .from('circles')
        .update({ guest_access: allAccess })
        .eq('id', circle.id);

      if (error) throw error;

      setGuestAccess(allAccess);
      setCircle({ ...circle, guest_access: allAccess });
      toast.success(`All guest access ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating guest access:', error);
      toast.error('Failed to update guest access');
    }
  };

  const accessItems = [
    { key: 'feed', label: 'Feed', icon: MessageSquare, description: 'Allow guests to view posts and updates' },
    { key: 'members', label: 'Members', icon: Users, description: 'Allow guests to see the member directory' },
    { key: 'documents', label: 'Documents', icon: FileText, description: 'Allow guests to access documents' },
    { key: 'forum', label: 'Forum', icon: MessageSquare, description: 'Allow guests to read forum discussions' },
    { key: 'checklists', label: 'Lists', icon: CheckSquare, description: 'Allow guests to view lists' },
    { key: 'reviews', label: 'Reviews', icon: Star, description: 'Allow guests to read reviews' },
    { key: 'calendar', label: 'Calendar/Events', icon: Calendar, description: 'Allow guests to see events' },
  ];

  return (
    <div className="space-y-6">
      {/* Info Alert about Members vs Guests */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Members vs Guests</h4>
              <p className="text-sm text-blue-800">
                <strong>Members</strong> are teammates who have joined this circle. They can contribute content by default (unless restricted in feature settings).
              </p>
              <p className="text-sm text-blue-800">
                <strong>Guests</strong> are visitors who haven't joined. These settings control what guests can <strong>view</strong>, not what members can do.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guest Visibility Settings</CardTitle>
          <CardDescription>
            Configure which content tabs are visible to non-members (guests) when they view this circle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accessItems.map(item => {
            const Icon = item.icon;
            const isEnabled = guestAccess[item.key];
            
            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="w-5 h-5 text-gray-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900">{item.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border overflow-hidden">
                    <Button
                      size="sm"
                      variant={isEnabled ? 'default' : 'ghost'}
                      className="rounded-none border-0 px-4"
                      onClick={() => !isEnabled && handleToggleAccess(item.key)}
                    >
                      Enable
                    </Button>
                    <Button
                      size="sm"
                      variant={!isEnabled ? 'destructive' : 'ghost'}
                      className="rounded-none border-0 px-4"
                      onClick={() => isEnabled && handleToggleAccess(item.key)}
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => handleBulkUpdate(true)}>
            Enable All
          </Button>
          <Button variant="outline" onClick={() => handleBulkUpdate(false)}>
            Disable All
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Moderation Tab Component
function ModerationTab({ circleId, circleName }: { circleId: string; circleName: string }) {
  const [activeView, setActiveView] = useState<'posts' | 'documents' | 'reviews'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [activeView, circleId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (activeView === 'posts') {
        const { data, error } = await supabase
          .from('posts')
          .select('*, users(name, email)')
          .contains('circle_ids', [circleId])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } else if (activeView === 'documents') {
        const { data, error } = await supabase
          .from('documents')
          .select('*, users(name, email)')
          .contains('circle_ids', [circleId])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } else if (activeView === 'reviews') {
        const { data, error } = await supabase
          .from('endorsements')
          .select('*, users(name, email)')
          .contains('circle_ids', [circleId])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReviews(data || []);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contentId: string, contentType: 'posts' | 'documents' | 'reviews') => {
    if (!confirm(`Are you sure you want to delete this ${contentType.slice(0, -1)}?`)) {
      return;
    }

    try {
      if (contentType === 'documents') {
        // Soft delete for documents
        const { error } = await supabase
          .from('documents')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', contentId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(contentType)
          .delete()
          .eq('id', contentId);

        if (error) throw error;
      }

      toast.success(`${contentType.slice(0, -1)} deleted successfully`);
      fetchContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>Manage content posted within {circleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeView === 'posts' ? 'default' : 'outline'}
              onClick={() => setActiveView('posts')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Posts
            </Button>
            <Button
              variant={activeView === 'documents' ? 'default' : 'outline'}
              onClick={() => setActiveView('documents')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <Button
              variant={activeView === 'reviews' ? 'default' : 'outline'}
              onClick={() => setActiveView('reviews')}
            >
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : (
            <div className="space-y-3">
              {activeView === 'posts' && posts.length === 0 && (
                <div className="text-center py-8 text-gray-500">No posts in this circle</div>
              )}
              {activeView === 'posts' && posts.map((post) => (
                <div key={post.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{post.users?.name || 'Unknown'}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{post.content}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(post.id, 'posts')}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {activeView === 'documents' && documents.length === 0 && (
                <div className="text-center py-8 text-gray-500">No documents in this circle</div>
              )}
              {activeView === 'documents' && documents.map((doc) => (
                <div key={doc.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{doc.title}</span>
                        <span className="text-sm text-gray-500">
                          by {doc.users?.name || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{doc.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(doc.id, 'documents')}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {activeView === 'reviews' && reviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">No reviews in this circle</div>
              )}
              {activeView === 'reviews' && reviews.map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{review.users?.name || 'Unknown'}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700">{review.content}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(review.id, 'reviews')}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Feed Settings Tab Component
function FeedSettingsTab({ circle, setCircle }: { circle: Circle; setCircle: (circle: Circle) => void }) {
  const [feedSettings, setFeedSettings] = useState(circle.feature_settings?.feed || {
    post_approval_required: false,
    posting_permissions: 'all' as 'all' | 'admins_only' | 'moderators_and_admins',
    allow_comments: true,
    allow_reactions: true,
  });

  const handleSaveFeedSettings = async () => {
    const updatedCircle = {
      ...circle,
      feature_settings: {
        ...circle.feature_settings,
        feed: feedSettings,
      },
    };

    try {
      const { error } = await supabase
        .from('circles')
        .update({ feature_settings: updatedCircle.feature_settings })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle(updatedCircle);
      toast.success('Feed settings updated successfully');
    } catch (error) {
      console.error('Error updating feed settings:', error);
      toast.error('Failed to update feed settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert about Default Member Permissions */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">Default: Members Can Post Freely</h4>
              <p className="text-sm text-green-800">
                By default, <strong>all circle members (teammates)</strong> can create posts, comment, and react in the feed.
              </p>
              <p className="text-sm text-green-800">
                Enable the restrictions below only if you need tighter control over who can contribute.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed Contribution Settings</CardTitle>
          <CardDescription>Control member posting permissions (optional restrictions)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Posting Permissions */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Who Can Create Posts</Label>
            <p className="text-sm text-gray-600">
              Restrict who can create posts (default: all members can post)
            </p>
            <select
              value={feedSettings.posting_permissions}
              onChange={(e) => setFeedSettings({ ...feedSettings, posting_permissions: e.target.value as 'all' | 'admins_only' | 'moderators_and_admins' })}
              className="w-full border rounded-lg px-3 py-2 mt-2"
            >
              <option value="all">All Members (Default - Recommended)</option>
              <option value="moderators_and_admins">Moderators and Admins Only</option>
              <option value="admins_only">Admins Only</option>
            </select>
          </div>

          {/* Post Approval */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">Require Admin Approval for Posts</Label>
              <p className="text-sm text-gray-600 mt-1">
                New posts must be approved before appearing (not recommended for most teams)
              </p>
            </div>
            <input
              type="checkbox"
              checked={feedSettings.post_approval_required}
              onChange={(e) => setFeedSettings({ ...feedSettings, post_approval_required: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          {/* Allow Comments */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">Allow Comments</Label>
              <p className="text-sm text-gray-600 mt-1">
                Members can comment on posts (recommended: keep enabled)
              </p>
            </div>
            <input
              type="checkbox"
              checked={feedSettings.allow_comments}
              onChange={(e) => setFeedSettings({ ...feedSettings, allow_comments: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          {/* Allow Reactions */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">Allow Reactions</Label>
              <p className="text-sm text-gray-600 mt-1">
                Members can react to posts with emojis (recommended: keep enabled)
              </p>
            </div>
            <input
              type="checkbox"
              checked={feedSettings.allow_reactions}
              onChange={(e) => setFeedSettings({ ...feedSettings, allow_reactions: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          <Button
            size="default"
            variant="default"
            onClick={handleSaveFeedSettings}
            className="w-full"
          >
            Save Feed Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Forums Settings Tab Component
function ForumsSettingsTab({ circle, setCircle }: { circle: Circle; setCircle: (circle: Circle) => void }) {
  const [forumsSettings, setForumsSettings] = useState(circle.feature_settings?.forums || {
    thread_approval_required: false,
    thread_creation_permissions: 'all' as 'all' | 'admins_only' | 'moderators_and_admins',
    allow_replies: true,
    allow_anonymous_posts: false,
  });

  const handleSaveForumsSettings = async () => {
    const updatedCircle = {
      ...circle,
      feature_settings: {
        ...circle.feature_settings,
        forums: forumsSettings,
      },
    };

    try {
      const { error } = await supabase
        .from('circles')
        .update({ feature_settings: updatedCircle.feature_settings })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle(updatedCircle);
      toast.success('Forums settings updated successfully');
    } catch (error) {
      console.error('Error updating forums settings:', error);
      toast.error('Failed to update forums settings');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Forum Settings</CardTitle>
          <CardDescription>Configure forum settings for this circle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="checkbox"
              checked={forumsSettings.thread_approval_required}
              onChange={(e) => setForumsSettings({ ...forumsSettings, thread_approval_required: e.target.checked })}
            />
            <span className="text-sm">Thread Approval Required</span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="checkbox"
              checked={forumsSettings.allow_replies}
              onChange={(e) => setForumsSettings({ ...forumsSettings, allow_replies: e.target.checked })}
            />
            <span className="text-sm">Allow Replies</span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="checkbox"
              checked={forumsSettings.allow_anonymous_posts}
              onChange={(e) => setForumsSettings({ ...forumsSettings, allow_anonymous_posts: e.target.checked })}
            />
            <span className="text-sm">Allow Anonymous Posts</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">Thread Creation Permissions:</span>
            <select
              value={forumsSettings.thread_creation_permissions}
              onChange={(e) => setForumsSettings({ ...forumsSettings, thread_creation_permissions: e.target.value as 'all' | 'admins_only' | 'moderators_and_admins' })}
              className="border rounded px-2 py-1"
            >
              <option value="all">All Members</option>
              <option value="admins_only">Admins Only</option>
              <option value="moderators_and_admins">Moderators and Admins</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="default"
            onClick={handleSaveForumsSettings}
          >
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Documents Settings Tab Component
function DocumentsSettingsTab({ circle, setCircle }: { circle: Circle; setCircle: (circle: Circle) => void }) {
  const [documentsSettings, setDocumentsSettings] = useState(circle.feature_settings?.documents || {
    upload_approval_required: false,
    upload_permissions: 'all' as 'all' | 'admins_only' | 'moderators_and_admins',
    max_file_size_mb: 100,
    allowed_file_types: ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'png'],
  });

  const handleSaveDocumentsSettings = async () => {
    const updatedCircle = {
      ...circle,
      feature_settings: {
        ...circle.feature_settings,
        documents: documentsSettings,
      },
    };

    try {
      const { error } = await supabase
        .from('circles')
        .update({ feature_settings: updatedCircle.feature_settings })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle(updatedCircle);
      toast.success('Documents settings updated successfully');
    } catch (error) {
      console.error('Error updating documents settings:', error);
      toast.error('Failed to update documents settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert about Platform-wide Documents */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Documents Feature Works Platform-Wide
              </h4>
              <p className="text-sm text-blue-800">
                Documents exist as a <strong>platform-wide feature</strong>. Users create documents at <code className="bg-blue-100 px-1 py-0.5 rounded">/documents/new</code> with URL links (Google Drive, PDFs, etc.).
              </p>
              <p className="text-sm text-blue-800">
                When creating a document, circle members (teammates) can <strong>share it with this circle</strong> by adding the circle to the document's <code className="bg-blue-100 px-1 py-0.5 rounded">circle_ids</code> array.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Permissions Info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">Default: Members Can Share Freely</h4>
              <p className="text-sm text-green-800">
                By default, <strong>all circle members (teammates)</strong> can share documents with this circle.
              </p>
              <p className="text-sm text-green-800">
                Enable the restrictions below only if you need tighter control.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Sharing Settings</CardTitle>
          <CardDescription>Control member document sharing (optional restrictions)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sharing Permissions */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Who Can Share Documents</Label>
            <p className="text-sm text-gray-600">
              Restrict who can share platform documents with this circle (default: all members)
            </p>
            <select
              value={documentsSettings.upload_permissions}
              onChange={(e) => setDocumentsSettings({ ...documentsSettings, upload_permissions: e.target.value as 'all' | 'admins_only' | 'moderators_and_admins' })}
              className="w-full border rounded-lg px-3 py-2 mt-2"
            >
              <option value="all">All Members (Default - Recommended)</option>
              <option value="moderators_and_admins">Moderators and Admins Only</option>
              <option value="admins_only">Admins Only</option>
            </select>
          </div>

          {/* Document Sharing Approval */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">Require Admin Approval for Sharing</Label>
              <p className="text-sm text-gray-600 mt-1">
                Documents must be approved before appearing in circle (not recommended for most teams)
              </p>
            </div>
            <input
              type="checkbox"
              checked={documentsSettings.upload_approval_required}
              onChange={(e) => setDocumentsSettings({ ...documentsSettings, upload_approval_required: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          <Button
            size="default"
            variant="default"
            onClick={handleSaveDocumentsSettings}
            className="w-full"
          >
            Save Document Settings
          </Button>
        </CardContent>
      </Card>

      {/* Explanation Card */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">How Documents Work in Circles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="space-y-2">
            <p><strong>Platform-wide documents:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Created at <code className="bg-white px-1.5 py-0.5 rounded text-xs">/documents/new</code></li>
              <li>Store URL links (Google Drive, PDFs, etc.)</li>
              <li>Can be personal or shared with circles/tables</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p><strong>Sharing with this circle:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Users add this circle's ID to <code className="bg-white px-1.5 py-0.5 rounded text-xs">circle_ids</code> array when creating/editing document</li>
              <li>Document appears in circle's Documents tab (if guest access enabled)</li>
              <li>Members can view if they have access to circle</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p><strong>These settings control:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Whether sharing documents to this circle requires admin approval</li>
              <li>Who has permission to share existing documents to this circle</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reviews Settings Tab Component
function ReviewsSettingsTab({ circle, setCircle }: { circle: Circle; setCircle: (circle: Circle) => void }) {
  const [reviewsSettings, setReviewsSettings] = useState(circle.feature_settings?.reviews || {
    approval_required: false,
    submission_permissions: 'all' as 'all' | 'admins_only' | 'members_only',
    allow_anonymous_reviews: false,
    rating_scale: 5 as 5 | 10,
  });

  const handleSaveReviewsSettings = async () => {
    const updatedCircle = {
      ...circle,
      feature_settings: {
        ...circle.feature_settings,
        reviews: reviewsSettings,
      },
    };

    try {
      const { error } = await supabase
        .from('circles')
        .update({ feature_settings: updatedCircle.feature_settings })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle(updatedCircle);
      toast.success('Reviews settings updated successfully');
    } catch (error) {
      console.error('Error updating reviews settings:', error);
      toast.error('Failed to update reviews settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert about Platform-wide Reviews */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Reviews Feature Works Platform-Wide
              </h4>
              <p className="text-sm text-blue-800">
                Reviews exist as a <strong>platform-wide feature</strong>. Users create reviews at <code className="bg-blue-100 px-1 py-0.5 rounded">/reviews/new</code> for products, tools, or resources.
              </p>
              <p className="text-sm text-blue-800">
                Circle members (teammates) can <strong>share reviews with this circle</strong> by adding the circle to the review's <code className="bg-blue-100 px-1 py-0.5 rounded">circle_ids</code> array.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Permissions Info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">Default: Members Can Share Freely</h4>
              <p className="text-sm text-green-800">
                By default, <strong>all circle members (teammates)</strong> can share reviews with this circle.
              </p>
              <p className="text-sm text-green-800">
                Enable the restrictions below only if you need tighter control.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Sharing Settings</CardTitle>
          <CardDescription>Control member review sharing (optional restrictions)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submission Permissions */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Who Can Share Reviews</Label>
            <p className="text-sm text-gray-600">
              Restrict who can share platform reviews with this circle (default: all members)
            </p>
            <select
              value={reviewsSettings.submission_permissions}
              onChange={(e) => setReviewsSettings({ ...reviewsSettings, submission_permissions: e.target.value as 'all' | 'admins_only' | 'members_only' })}
              className="w-full border rounded-lg px-3 py-2 mt-2"
            >
              <option value="all">All Members (Default - Recommended)</option>
              <option value="members_only">Members Only</option>
              <option value="admins_only">Admins Only</option>
            </select>
          </div>

          {/* Review Approval */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">Require Admin Approval for Sharing</Label>
              <p className="text-sm text-gray-600 mt-1">
                Reviews must be approved before appearing in circle (not recommended for most teams)
              </p>
            </div>
            <input
              type="checkbox"
              checked={reviewsSettings.approval_required}
              onChange={(e) => setReviewsSettings({ ...reviewsSettings, approval_required: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          {/* Allow Anonymous Reviews */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">Allow Anonymous Reviews</Label>
              <p className="text-sm text-gray-600 mt-1">
                Members can share reviews anonymously (recommended for honest feedback)
              </p>
            </div>
            <input
              type="checkbox"
              checked={reviewsSettings.allow_anonymous_reviews}
              onChange={(e) => setReviewsSettings({ ...reviewsSettings, allow_anonymous_reviews: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          {/* Rating Scale */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Rating Scale</Label>
            <p className="text-sm text-gray-600">
              Preferred rating scale for reviews in this circle
            </p>
            <select
              value={reviewsSettings.rating_scale}
              onChange={(e) => setReviewsSettings({ ...reviewsSettings, rating_scale: parseInt(e.target.value) as 5 | 10 })}
              className="w-full border rounded-lg px-3 py-2 mt-2"
            >
              <option value="5">5 Stars</option>
              <option value="10">10 Stars</option>
            </select>
          </div>

          <Button
            size="default"
            variant="default"
            onClick={handleSaveReviewsSettings}
            className="w-full"
          >
            Save Review Settings
          </Button>
        </CardContent>
      </Card>

      {/* Explanation Card */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">How Reviews Work in Circles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="space-y-2">
            <p><strong>Platform-wide reviews:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Created at <code className="bg-white px-1.5 py-0.5 rounded text-xs">/reviews/new</code></li>
              <li>Review products, tools, resources, or experiences</li>
              <li>Can be personal or shared with circles/tables</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p><strong>Sharing with this circle:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Users add this circle's ID to <code className="bg-white px-1.5 py-0.5 rounded text-xs">circle_ids</code> array when creating/editing review</li>
              <li>Review appears in circle's Reviews tab (if guest access enabled)</li>
              <li>Members can view and upvote if they have access to circle</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Events Settings Tab Component
function EventsSettingsTab({ circle, setCircle }: { circle: Circle; setCircle: (circle: Circle) => void }) {
  const [eventsSettings, setEventsSettings] = useState(circle.feature_settings?.events || {
    creation_approval_required: false,
    creation_permissions: 'all' as 'all' | 'admins_only' | 'moderators_and_admins',
    rsvp_enabled: true,
    rsvp_limit_enabled: false,
  });

  const handleSaveEventsSettings = async () => {
    const updatedCircle = {
      ...circle,
      feature_settings: {
        ...circle.feature_settings,
        events: eventsSettings,
      },
    };

    try {
      const { error } = await supabase
        .from('circles')
        .update({ feature_settings: updatedCircle.feature_settings })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle(updatedCircle);
      toast.success('Events settings updated successfully');
    } catch (error) {
      console.error('Error updating events settings:', error);
      toast.error('Failed to update events settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert about Platform-wide Events */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Events Feature Works Platform-Wide
              </h4>
              <p className="text-sm text-blue-800">
                Events exist as a <strong>platform-wide feature</strong>. Users create events at <code className="bg-blue-100 px-1 py-0.5 rounded">/events/new</code> for meetups, workshops, or gatherings.
              </p>
              <p className="text-sm text-blue-800">
                Circle members (teammates) can <strong>associate events with this circle</strong> by adding the circle to the event's <code className="bg-blue-100 px-1 py-0.5 rounded">circle_ids</code> array.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Permissions Info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">Default: Members Can Associate Freely</h4>
              <p className="text-sm text-green-800">
                By default, <strong>all circle members (teammates)</strong> can associate events with this circle.
              </p>
              <p className="text-sm text-green-800">
                Enable the restrictions below only if you need tighter control.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Association Settings</CardTitle>
          <CardDescription>Control member event associations (optional restrictions)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Creation Permissions */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Who Can Associate Events</Label>
            <p className="text-sm text-gray-600">
              Restrict who can associate platform events with this circle (default: all members)
            </p>
            <select
              value={eventsSettings.creation_permissions}
              onChange={(e) => setEventsSettings({ ...eventsSettings, creation_permissions: e.target.value as 'all' | 'admins_only' | 'moderators_and_admins' })}
              className="w-full border rounded-lg px-3 py-2 mt-2"
            >
              <option value="all">All Members (Default - Recommended)</option>
              <option value="moderators_and_admins">Moderators and Admins Only</option>
              <option value="admins_only">Admins Only</option>
            </select>
          </div>

          {/* Event Association Approval */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">Require Admin Approval for Association</Label>
              <p className="text-sm text-gray-600 mt-1">
                Events must be approved before appearing in circle (not recommended for most teams)
              </p>
            </div>
            <input
              type="checkbox"
              checked={eventsSettings.creation_approval_required}
              onChange={(e) => setEventsSettings({ ...eventsSettings, creation_approval_required: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          {/* RSVP Enabled */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">RSVP Enabled</Label>
              <p className="text-sm text-gray-600 mt-1">
                Members can RSVP to events (recommended: keep enabled)
              </p>
            </div>
            <input
              type="checkbox"
              checked={eventsSettings.rsvp_enabled}
              onChange={(e) => setEventsSettings({ ...eventsSettings, rsvp_enabled: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          {/* RSVP Limit */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-base font-medium">RSVP Limit Enabled</Label>
              <p className="text-sm text-gray-600 mt-1">
                Events can have attendance limits for RSVPs
              </p>
            </div>
            <input
              type="checkbox"
              checked={eventsSettings.rsvp_limit_enabled}
              onChange={(e) => setEventsSettings({ ...eventsSettings, rsvp_limit_enabled: e.target.checked })}
              className="w-4 h-4 mt-1"
            />
          </div>

          <Button
            size="default"
            variant="default"
            onClick={handleSaveEventsSettings}
            className="w-full"
          >
            Save Event Settings
          </Button>
        </CardContent>
      </Card>

      {/* Explanation Card */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">How Events Work in Circles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="space-y-2">
            <p><strong>Platform-wide events:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Created at <code className="bg-white px-1.5 py-0.5 rounded text-xs">/events/new</code></li>
              <li>Include date, time, location, and description</li>
              <li>Can be platform-wide or associated with circles/tables</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p><strong>Associating with this circle:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Users add this circle's ID to <code className="bg-white px-1.5 py-0.5 rounded text-xs">circle_ids</code> array when creating/editing event</li>
              <li>Event appears in circle's Events/Calendar tab (if guest access enabled)</li>
              <li>Members can RSVP if they have access to circle</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}