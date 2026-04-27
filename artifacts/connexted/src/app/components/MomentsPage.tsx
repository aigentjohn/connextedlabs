import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Sparkles,
  Lock,
  Globe,
  Edit2,
  Trash2,
  MessageSquare,
  Heart,
  Send,
  Settings,
  Clock,
  Briefcase,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface MomentsData {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  allow_comments: boolean;
  allow_reactions: boolean;
  visibility_window: string;
  created_at: string;
  updated_at: string;
}

interface MomentsPost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  reactions: any;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { id: string; name: string; avatar: string | null } | null;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
}

export default function MomentsPage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [moments, setMoments] = useState<MomentsData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<MomentsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [timeWindow, setTimeWindow] = useState<string>('all');
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [openCommentPosts, setOpenCommentPosts] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  const isOwner = currentUser?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchMomentsData();
    }
  }, [userId]);

  const fetchMomentsData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, avatar, bio')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUser(userData);

      // Fetch moments container
      const { data: momentsData, error: momentsError } = await supabase
        .from('moments')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (momentsError) {
        // If no moments container exists, this shouldn't happen due to auto-creation
        // but handle gracefully
        console.error('Error fetching moments:', momentsError);
        toast.error('Moments container not found');
        return;
      }

      setMoments(momentsData);

      // Check if user can view this moments feed
      if (!momentsData.is_public && currentUser?.id !== userId) {
        toast.error('This moments feed is private');
        navigate('/');
        return;
      }

      // Fetch posts
      await fetchPosts(momentsData.id);
    } catch (error) {
      console.error('Error fetching moments data:', error);
      toast.error('Failed to load moments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (momentsId: string) => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('moments_id', momentsId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || !moments || !currentUser) return;

    setIsPosting(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          content: postContent.trim(),
          author_id: currentUser.id,
          moments_id: moments.id,
          access_level: moments.is_public ? 'public' : 'member',
        })
        .select()
        .single();

      if (error) throw error;

      setPosts([data, ...posts]);
      setPostContent('');
      toast.success('Posted to moments!');
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleStartEdit = (post: MomentsPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, content: editContent.trim(), updated_at: new Date().toISOString() }
          : p
      ));
      setEditingPostId(null);
      setEditContent('');
      toast.success('Post updated');
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast.error(error.message || 'Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error(error.message || 'Failed to delete post');
    }
  };

  const handleReaction = async (postId: string) => {
    if (!currentUser) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const reactions = post.reactions || {};
      const currentReactions = reactions[currentUser.id] || [];
      
      let newReactions;
      if (currentReactions.includes('❤️')) {
        // Remove reaction
        newReactions = currentReactions.filter((r: string) => r !== '❤️');
      } else {
        // Add reaction
        newReactions = [...currentReactions, '❤️'];
      }

      const updatedReactions = {
        ...reactions,
        [currentUser.id]: newReactions,
      };

      const { error } = await supabase
        .from('posts')
        .update({ reactions: updatedReactions })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(p => 
        p.id === postId ? { ...p, reactions: updatedReactions } : p
      ));
    } catch (error) {
      console.error('Error updating reaction:', error);
      toast.error('Failed to update reaction');
    }
  };

  const fetchPostComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, post_id, author_id, content, created_at, author:users!comments_author_id_fkey(id, name, avatar)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (!error) {
      setCommentsByPost(prev => ({ ...prev, [postId]: (data as any) || [] }));
    }
  };

  const toggleComments = (postId: string) => {
    setOpenCommentPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        if (!commentsByPost[postId]) {
          fetchPostComments(postId);
        }
      }
      return next;
    });
  };

  const handleSubmitComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text || !currentUser) return;
    setSubmittingComment(postId);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, author_id: currentUser.id, content: text })
        .select('id, post_id, author_id, content, created_at, author:users!comments_author_id_fkey(id, name, avatar)')
        .single();
      if (error) throw error;
      setCommentsByPost(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as any] }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(null);
    }
  };

  const getReactionCount = (post: MomentsPost) => {
    if (!post.reactions) return 0;
    return Object.values(post.reactions).reduce((total: number, reactions: any) => {
      return total + (Array.isArray(reactions) ? reactions.length : 0);
    }, 0);
  };

  const hasUserReacted = (post: MomentsPost) => {
    if (!currentUser || !post.reactions) return false;
    const userReactions = post.reactions[currentUser.id];
    return Array.isArray(userReactions) && userReactions.includes('❤️');
  };

  // Filter posts by visibility window (owner's setting)
  const getFilteredPosts = () => {
    if (!moments) return posts;
    
    // Owner can see all posts regardless of visibility window
    if (isOwner) return posts;
    
    // For visitors, apply the visibility window setting
    const visibilityWindow = moments.visibility_window || 'all';
    if (visibilityWindow === 'all') return posts;
    
    const now = new Date();
    let cutoffDate: Date | null = null;

    switch (visibilityWindow) {
      case '3':
        cutoffDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '30':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return posts;
    }

    return posts.filter(post => new Date(post.created_at) >= cutoffDate!);
  };

  const filteredPosts = getFilteredPosts();
  
  // Get visibility window label for display
  const getVisibilityLabel = () => {
    if (!moments || isOwner) return null;
    const window = moments.visibility_window || 'all';
    switch (window) {
      case '3': return 'Last 3 days';
      case '30': return 'Last 30 days';
      case '90': return 'Last 90 days';
      default: return null;
    }
  };
  
  const visibilityLabel = getVisibilityLabel();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading moments...</div>
      </div>
    );
  }

  if (!moments || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Moments not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Members', path: '/members' },
        { label: user.name, path: `/users/${user.id}` },
        { label: 'Moments' }
      ]} />

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="text-xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  <h1 className="text-3xl font-bold">{moments.name}</h1>
                </div>
                {isOwner && (
                  <Link to={`/moments/${userId}/settings`}>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Badge variant={moments.is_public ? 'default' : 'secondary'} className="gap-1">
                  {moments.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {moments.is_public ? 'Public' : 'Private'}
                </Badge>
                <span className="text-sm text-gray-600">{posts.length} moments shared</span>
                <Link to={`/portfolio/${userId}`}>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-gray-100">
                    <Briefcase className="w-3 h-3" />
                    View Portfolio
                  </Badge>
                </Link>
              </div>

              {moments.description && (
                <p className="text-gray-700">{moments.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Post (Owner Only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Share a Moment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="What are you working on? Share your progress, ideas, or updates..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleCreatePost}
                disabled={isPosting || !postContent.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Post Moment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {/* Time Window Filter */}
        {posts.length > 0 && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {timeWindow === 'all' ? 'All Moments' : `Recent Moments`}
            </h2>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <Select value={timeWindow} onValueChange={setTimeWindow}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3days">Last 3 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-semibold mb-2">
                {posts.length === 0 ? 'No moments yet' : 'No moments in this time period'}
              </p>
              <p className="text-sm">
                {posts.length === 0 
                  ? (isOwner 
                      ? 'Start sharing your work-in-progress and updates!' 
                      : `${user.name} hasn't shared any moments yet.`)
                  : timeWindow !== 'all' && 'Try selecting a different time period'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => {
            const isEditing = editingPostId === post.id;
            const reactionCount = getReactionCount(post);
            const userReacted = hasUserReacted(post);

            return (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Link to={`/users/${user.id}`} className="font-semibold hover:text-indigo-600">
                            {user.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            {post.updated_at !== post.created_at && ' (edited)'}
                          </p>
                        </div>

                        {isOwner && !isEditing && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(post)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdatePost(post.id)}>
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingPostId(null);
                                setEditContent('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-800 whitespace-pre-wrap mb-3">
                            {post.content}
                          </p>

                          {/* Reactions + Comments footer */}
                          {(moments.allow_reactions || moments.allow_comments) && (
                            <div className="flex items-center gap-4 pt-2 border-t">
                              {moments.allow_reactions && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(post.id)}
                                  className={userReacted ? 'text-red-600' : 'text-gray-600'}
                                >
                                  <Heart className={`w-4 h-4 mr-1 ${userReacted ? 'fill-current' : ''}`} />
                                  {reactionCount > 0 && reactionCount}
                                </Button>
                              )}
                              {moments.allow_comments && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleComments(post.id)}
                                  className="text-gray-600"
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  {(commentsByPost[post.id]?.length ?? 0) > 0 && `${commentsByPost[post.id].length} `}
                                  {openCommentPosts.has(post.id) ? 'Hide' : 'Comment'}
                                </Button>
                              )}
                            </div>
                          )}
                          {/* Comments panel */}
                          {moments.allow_comments && openCommentPosts.has(post.id) && (
                            <div className="mt-3 space-y-3 border-t pt-3">
                              {(commentsByPost[post.id] || []).length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-2">No comments yet.</p>
                              )}
                              {(commentsByPost[post.id] || []).map(comment => (
                                <div key={comment.id} className="flex items-start gap-2">
                                  <Avatar className="w-7 h-7">
                                    <AvatarImage src={comment.author?.avatar || undefined} />
                                    <AvatarFallback className="text-xs">{comment.author?.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold">{comment.author?.name}</span>
                                      <span className="text-xs text-gray-400">
                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-800">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                              {currentUser && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7">
                                    <AvatarImage src={(currentUser as any).avatar || undefined} />
                                    <AvatarFallback className="text-xs">{(currentUser as any).name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 flex gap-2">
                                    <Input
                                      value={commentInputs[post.id] || ''}
                                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      placeholder="Write a comment..."
                                      className="h-8 text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleSubmitComment(post.id);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-8"
                                      disabled={!commentInputs[post.id]?.trim() || submittingComment === post.id}
                                      onClick={() => handleSubmitComment(post.id)}
                                    >
                                      <Send className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}