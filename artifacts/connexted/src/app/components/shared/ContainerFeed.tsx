// Split candidate: ~556 lines — consider extracting FeedPost, FeedCommentThread, and FeedComposer into sub-components.
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { Heart, MessageCircle, Send, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { notifyLike, notifyPostComment } from '@/lib/notificationHelpers';

interface Post {
  id: string;
  circle_ids: string[];
  table_ids?: string[];
  elevator_ids?: string[];
  meeting_ids?: string[];
  build_ids?: string[];
  pitch_ids?: string[];
  meetup_ids?: string[];
  program_ids?: string[];
  author_id: string;
  content: string;
  image_url: string | null;
  pinned: boolean;
  created_at: string;
  metadata?: {
    type?: string;
    item_type?: string;
    item_id?: string;
    item_title?: string;
  };
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

type ContainerType = 'circle' | 'table' | 'elevator' | 'meeting' | 'build' | 'pitch' | 'meetup' | 'program';

interface ContainerFeedProps {
  containerType: ContainerType;
  containerId: string;
  containerName?: string;
  title?: string;
  enablePosting?: boolean;
  isMember?: boolean;
  isAdmin?: boolean;
}

// Helper to get the field name for a container type
const getContainerField = (type: ContainerType): string => {
  switch (type) {
    case 'circle': return 'circle_ids';
    case 'table': return 'table_ids';
    case 'elevator': return 'elevator_ids';
    case 'meeting': return 'meeting_ids';
    case 'build': return 'build_ids';
    case 'pitch': return 'pitch_ids';
    case 'meetup': return 'meetup_ids';
    case 'program': return 'program_ids';
    default: return 'circle_ids';
  }
};

// Helper function to safely format dates
const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'recently';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'recently';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'recently';
  }
};

export default function ContainerFeed({ containerType, containerId, containerName, title, enablePosting = true, isMember = true, isAdmin = false }: ContainerFeedProps) {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postLikes, setPostLikes] = useState<{ [postId: string]: string[] }>({});
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [newPost, setNewPost] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [loading, setLoading] = useState(true);

  const containerField = getContainerField(containerType);

  useEffect(() => {
    fetchPosts();
  }, [containerId, containerType]);

  const fetchPosts = async () => {
    try {
      // Validate that containerId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(containerId)) {
        console.warn('Invalid UUID for containerId, skipping post fetch:', containerId);
        setPosts([]);
        setLoading(false);
        return;
      }

      // Fetch posts for this container using the appropriate field
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          circle_ids,
          table_ids,
          elevator_ids,
          meeting_ids,
          build_ids,
          pitch_ids,
          meetup_ids,
          program_ids,
          author_id,
          content,
          image_url,
          pinned,
          created_at,
          author:users!posts_author_id_fkey(id, name, avatar)
        `)
        .contains(containerField, [containerId])
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        throw postsError;
      }

      setPosts(postsData || []);

      // Fetch likes from content_likes table
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        
        const { data: likesData, error: likesError } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', 'post')
          .in('content_id', postIds);

        if (!likesError && likesData) {
          const likesMap: { [postId: string]: string[] } = {};
          likesData.forEach(like => {
            if (!likesMap[like.content_id]) {
              likesMap[like.content_id] = [];
            }
            likesMap[like.content_id].push(like.user_id);
          });
          setPostLikes(likesMap);
        }
      }

      // Fetch comments for all posts
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            post_id,
            author_id,
            content,
            created_at,
            author:users!comments_author_id_fkey(id, name, avatar)
          `)
          .in('post_id', postIds)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;

        // Group comments by post_id
        const commentsMap: { [postId: string]: Comment[] } = {};
        commentsData?.forEach(comment => {
          if (!commentsMap[comment.post_id]) {
            commentsMap[comment.post_id] = [];
          }
          commentsMap[comment.post_id].push(comment);
        });
        setComments(commentsMap);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !profile) return;

    try {
      // Build the container IDs object with all container type columns
      const postData: any = {
        author_id: profile.id,
        content: newPost,
        image_url: newPostImage || null,
        pinned: false,
        circle_ids: [],
        table_ids: [],
        elevator_ids: [],
        meeting_ids: [],
        build_ids: [],
        pitch_ids: [],
        meetup_ids: [],
        program_ids: [],
      };

      // Set the appropriate container field
      postData[containerField] = [containerId];

      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select(`
          id,
          circle_ids,
          table_ids,
          elevator_ids,
          meeting_ids,
          build_ids,
          pitch_ids,
          meetup_ids,
          program_ids,
          author_id,
          content,
          image_url,
          pinned,
          created_at,
          author:users!posts_author_id_fkey(id, name, avatar)
        `)
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      setPosts([data, ...posts]);
      setNewPost('');
      setNewPostImage('');
      toast.success('Post created!');
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error?.message || 'Failed to create post');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!profile) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const likes = postLikes[postId] || [];
    const hasLiked = likes.includes(profile.id);

    try {
      if (hasLiked) {
        // Remove like from content_likes
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('content_type', 'post')
          .eq('content_id', postId)
          .eq('user_id', profile.id);

        if (error) throw error;

        setPostLikes({
          ...postLikes,
          [postId]: likes.filter(id => id !== profile.id),
        });
      } else {
        // Add like to content_likes
        const { error } = await supabase
          .from('content_likes')
          .insert({
            content_type: 'post',
            content_id: postId,
            user_id: profile.id,
          });

        if (error) throw error;

        setPostLikes({
          ...postLikes,
          [postId]: [...likes, profile.id],
        });

        // Notify the post author when someone likes
        if (post.author_id !== profile.id) {
          const contentPreview = post.content.substring(0, 150);
          await notifyLike(
            post.author_id,
            profile.id,
            profile.name,
            'post',
            postId,
            contentPreview,
            `/feed?post=${postId}`
          );
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!profile || !commentInputs[postId]?.trim()) return;

    try {
      // First, get the post to find the author
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: profile.id,
          content: commentInputs[postId],
        })
        .select('id, post_id, author_id, content, created_at, author:users!comments_author_id_fkey(id, name, avatar)')
        .single();

      if (error) throw error;

      setComments({
        ...comments,
        [postId]: [...(comments[postId] || []), data],
      });
      setCommentInputs({ ...commentInputs, [postId]: '' });
      toast.success('Comment added!');
      
      // Notify the post author when someone comments
      if (post.author_id !== profile.id) {
        const postTitle = post.content.substring(0, 50);
        await notifyPostComment(
          post.author_id,
          profile.id,
          profile.name,
          postId,
          postTitle,
          commentInputs[postId]
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Post */}
      {enablePosting && (
        <Card>
          <CardContent className="pt-6">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="mb-3"
              rows={3}
            />
            <Input
              value={newPostImage}
              onChange={(e) => setNewPostImage(e.target.value)}
              placeholder="Image URL (optional)"
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={handleCreatePost} disabled={!newPost.trim()}>
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No posts yet</p>
            <p className="text-sm text-gray-400 mt-2">Be the first to share something!</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => {
          const postComments = comments[post.id] || [];
          const likes = postLikes[post.id] || [];
          const hasLiked = profile && likes.includes(profile.id);

          return (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.author?.avatar || undefined} />
                      <AvatarFallback>
                        {post.author?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{post.author?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{safeFormatDate(post.created_at)}</p>
                    </div>
                  </div>
                  {(isAdmin || post.author_id === profile?.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap mb-4">{post.content}</p>
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="rounded-lg max-w-full mb-4"
                  />
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLikePost(post.id)}
                    className={hasLiked ? 'text-red-500' : ''}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
                    {likes.length}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {postComments.length}
                  </Button>
                </div>

                {/* Comments */}
                {postComments.length > 0 && (
                  <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                    {postComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.author?.avatar || undefined} />
                          <AvatarFallback>
                            {comment.author?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="font-semibold text-sm">{comment.author?.name || 'Unknown'}</p>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{safeFormatDate(comment.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="mt-4 flex gap-2">
                  <Input
                    value={commentInputs[post.id] || ''}
                    onChange={(e) =>
                      setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                    }
                    placeholder="Write a comment..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(post.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddComment(post.id)}
                    disabled={!commentInputs[post.id]?.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}