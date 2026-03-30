// Split candidate: ~488 lines — consider extracting GeneralSettingsTab, MembersSettingsTab, and DangerZoneTab into sub-components.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  FileText, 
  Star,
  Shield,
  UserPlus,
  UserX,
  Trash2,
  Search
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  email: string;
}

// Reusable Members Tab
export function MembersTab({ 
  containerId, 
  containerName,
  containerType,
  memberIds, 
  adminIds, 
  currentUserId,
  onUpdate
}: { 
  containerId: string;
  containerName: string;
  containerType: string;
  memberIds: string[];
  adminIds: string[];
  currentUserId: string;
  onUpdate: (updates: any) => void;
}) {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (memberIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', memberIds);

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
  }, [memberIds]);

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async () => {
    const email = searchEmail.trim().toLowerCase();
    if (!email) return;

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', email)
        .maybeSingle();

      if (userError || !user) {
        toast.error('User not found with that email');
        return;
      }

      if (memberIds.includes(user.id)) {
        toast.error('User is already a member');
        return;
      }

      const updatedMemberIds = [...memberIds, user.id];
      const { error } = await supabase
        .from(containerType)
        .update({ member_ids: updatedMemberIds })
        .eq('id', containerId);

      if (error) throw error;

      onUpdate({ member_ids: updatedMemberIds });
      setMembers([...members, user]);
      setSearchEmail('');
      toast.success(`Added ${user.name} to ${containerName}`);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (adminIds.includes(userId)) {
      toast.error('Cannot remove an admin. Remove admin status first.');
      return;
    }

    try {
      const updatedMemberIds = memberIds.filter(id => id !== userId);
      const { error } = await supabase
        .from(containerType)
        .update({ member_ids: updatedMemberIds })
        .eq('id', containerId);

      if (error) throw error;

      onUpdate({ member_ids: updatedMemberIds });
      setMembers(members.filter(m => m.id !== userId));
      toast.success('Member removed');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    const isCurrentlyAdmin = adminIds.includes(userId);

    if (isCurrentlyAdmin && adminIds.length === 1) {
      toast.error('Must have at least one admin');
      return;
    }

    try {
      const updatedAdminIds = isCurrentlyAdmin
        ? adminIds.filter(id => id !== userId)
        : [...adminIds, userId];

      const { error } = await supabase
        .from(containerType)
        .update({ admin_ids: updatedAdminIds })
        .eq('id', containerId);

      if (error) throw error;

      onUpdate({ admin_ids: updatedAdminIds });
      toast.success(isCurrentlyAdmin ? 'Admin status removed' : 'Admin status granted');
    } catch (error) {
      console.error('Error toggling admin:', error);
      toast.error('Failed to update admin status');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Member</CardTitle>
          <CardDescription>Add a user to this {containerType.slice(0, -1)} by email address</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>Manage members and their roles</CardDescription>
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
                const isAdmin = adminIds.includes(member.id);
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

// Reusable Moderation Tab
export function ModerationTab({ 
  containerIdField, 
  containerId, 
  containerName 
}: { 
  containerIdField: string;
  containerId: string;
  containerName: string;
}) {
  const [activeView, setActiveView] = useState<'posts' | 'documents' | 'reviews'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [activeView, containerId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (activeView === 'posts') {
        const { data, error } = await supabase
          .from('posts')
          .select('*, author:users!posts_author_id_fkey(name, email)')
          .contains(containerIdField, [containerId])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } else if (activeView === 'documents') {
        const { data, error } = await supabase
          .from('documents')
          .select('*, author:users!documents_author_id_fkey(name, email)')
          .contains(containerIdField, [containerId])
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } else if (activeView === 'reviews') {
        const { data, error } = await supabase
          .from('endorsements')
          .select('*, author:users!author_id(name, email)')
          .contains(containerIdField, [containerId])
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
    <Card>
      <CardHeader>
        <CardTitle>Content Moderation</CardTitle>
        <CardDescription>Manage content posted within {containerName}</CardDescription>
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
              <div className="text-center py-8 text-gray-500">No posts in this container</div>
            )}
            {activeView === 'posts' && posts.map((post) => (
              <div key={post.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{post.author?.name || 'Unknown'}</span>
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
              <div className="text-center py-8 text-gray-500">No documents in this container</div>
            )}
            {activeView === 'documents' && documents.map((doc) => (
              <div key={doc.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">{doc.title}</span>
                      <span className="text-sm text-gray-500">
                        by {doc.author?.name || 'Unknown'}
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
              <div className="text-center py-8 text-gray-500">No reviews in this container</div>
            )}
            {activeView === 'reviews' && reviews.map((review) => (
              <div key={review.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{review.author?.name || 'Unknown'}</span>
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
  );
}