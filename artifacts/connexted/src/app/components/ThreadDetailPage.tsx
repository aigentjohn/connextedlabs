import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, Trash2, Pin, Lock, Tag, Heart, Star, MessageSquare, Send, Download } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { formatDistanceToNow } from 'date-fns';
import DiscussionSummarizer from '@/app/components/DiscussionSummarizer';
import { notifyThreadReply } from '@/lib/notificationHelpers';
import { ShareInviteIconButton } from '@/app/components/shared/ShareInviteButton';

export default function ThreadDetailPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [thread, setThread] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    if (profile && threadId) {
      fetchData();
    }
  }, [profile, threadId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch thread
      const { data: threadData, error: threadError } = await supabase
        .from('forum_threads')
        .select('*, author:users!forum_threads_author_id_fkey(id, name, avatar)')
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;

      // Fetch replies
      const { data: repliesData } = await supabase
        .from('replies')
        .select('*, author:users!replies_author_id_fkey(id, name, avatar)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      // Fetch circles
      const { data: circlesData } = await supabase
        .from('circles')
        .select('*')
        .eq('community_id', profile?.community_id);

      // Fetch all users for author lookups
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('community_id', profile?.community_id);

      setThread(threadData);
      setReplies(repliesData || []);
      setCircles(circlesData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching thread:', error);
      toast.error('Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  if (!profile || !threadId) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-500">Loading thread...</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">Thread not found</p>
            <Button onClick={() => navigate('/forums')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forums
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const author = thread.author || users.find((u: any) => u.id === thread.author_id);
  const threadCircles = (thread.circle_ids || [])
    .map((id: string) => circles.find(c => c.id === id))
    .filter(Boolean);
  
  const isLiked = (thread.likes || []).includes(profile.id);
  const isFavorited = (thread.favorites || []).includes(profile.id);
  const isAuthor = thread.author_id === profile.id;

  // Check if user can moderate
  const canModerate = profile.role === 'super' || (thread.circle_ids && thread.circle_ids.some((cId: string) => {
    const circle = circles.find(c => c.id === cId);
    if (!circle) return false;
    return circle.host_ids?.includes(profile.id) || circle.moderator_ids?.includes(profile.id);
  }));

  const handleLike = async () => {
    const currentLikes = thread.likes || [];
    const updatedLikes = isLiked
      ? currentLikes.filter((id: string) => id !== profile.id)
      : [...currentLikes, profile.id];
    
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ likes: updatedLikes })
        .eq('id', thread.id);

      if (error) throw error;

      setThread({ ...thread, likes: updatedLikes });
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleToggleFavorite = async () => {
    const currentFavorites = thread.favorites || [];
    const updatedFavorites = isFavorited
      ? currentFavorites.filter((id: string) => id !== profile.id)
      : [...currentFavorites, profile.id];
    
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ favorites: updatedFavorites })
        .eq('id', thread.id);

      if (error) throw error;

      setThread({ ...thread, favorites: updatedFavorites });
      toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const handleAddReply = async () => {
    if (!replyContent.trim()) return;

    try {
      const { error } = await supabase
        .from('replies')
        .insert({
          thread_id: thread.id,
          author_id: profile.id,
          content: replyContent,
          community_id: profile.community_id,
        });

      if (error) throw error;

      toast.success('Reply added');
      setReplyContent('');
      await fetchData();

      // Notify other users about the new reply
      notifyThreadReply(thread.id, profile.id, replyContent);
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        const { error } = await supabase
          .from('replies')
          .delete()
          .eq('id', replyId);

        if (error) throw error;

        toast.success('Reply deleted');
        await fetchData();
      } catch (error) {
        console.error('Error deleting reply:', error);
        toast.error('Failed to delete reply');
      }
    }
  };

  const handleDeleteThread = async () => {
    if (window.confirm('Are you sure you want to delete this entire thread?')) {
      try {
        const { error } = await supabase
          .from('forum_threads')
          .delete()
          .eq('id', thread.id);

        if (error) throw error;

        toast.success('Thread deleted');
        navigate('/forums');
      } catch (error) {
        console.error('Error deleting thread:', error);
        toast.error('Failed to delete thread');
      }
    }
  };

  const handleExportDiscussion = () => {
    // Prepare export data
    const exportData = {
      thread: {
        title: thread.title,
        author: author?.name || 'Unknown',
        created_at: new Date(thread.created_at).toLocaleString(),
        body: thread.body,
        tags: thread.tags || [],
      },
      replies: replies.map((reply) => {
        const replyAuthor = reply.author || users.find((u: any) => u.id === reply.author_id);
        return {
          author: replyAuthor?.name || 'Unknown',
          created_at: new Date(reply.created_at).toLocaleString(),
          content: reply.content,
        };
      }),
      stats: {
        total_replies: replies.length,
        total_likes: (thread.likes || []).length,
      }
    };

    // Create formatted text for easy copy-paste
    const formattedText = `
DISCUSSION THREAD EXPORT
========================

Title: ${thread.title}
Author: ${author?.name || 'Unknown'}
Created: ${new Date(thread.created_at).toLocaleString()}
Tags: ${(thread.tags || []).join(', ') || 'None'}
Replies: ${replies.length}
Likes: ${(thread.likes || []).length}

ORIGINAL POST
=============
${thread.body}

REPLIES (${replies.length})
========

${replies.map((reply, index) => {
  const replyAuthor = reply.author || users.find((u: any) => u.id === reply.author_id);
  return `
[${index + 1}] ${replyAuthor?.name || 'Unknown'} - ${new Date(reply.created_at).toLocaleString()}
${reply.content}
---`;
}).join('\n')}

---
End of Discussion
`.trim();

    // Create both JSON and TXT files
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const textBlob = new Blob([formattedText], { type: 'text/plain' });

    // Download JSON
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `discussion-${thread.id}-${Date.now()}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    // Download TXT
    const textUrl = URL.createObjectURL(textBlob);
    const textLink = document.createElement('a');
    textLink.href = textUrl;
    textLink.download = `discussion-${thread.id}-${Date.now()}.txt`;
    document.body.appendChild(textLink);
    textLink.click();
    document.body.removeChild(textLink);
    URL.revokeObjectURL(textUrl);

    toast.success('Discussion exported! Check your downloads folder.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Forums', href: '/forums' },
          { label: thread.title, href: `/forums/${thread.id}` },
        ]} 
      />

      {/* Thread Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/forums')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forums
            </Button>
            
            <div className="flex items-center gap-1">
              <ShareInviteIconButton
                entityType="thread"
                entityId={thread.id}
                entityName={thread.title}
              />
              {(isAuthor || canModerate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteThread}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Thread
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 mb-4">
            {thread.pinned && (
              <Pin className="w-5 h-5 text-indigo-600 fill-current flex-shrink-0 mt-1" />
            )}
            <h1 className="text-3xl font-bold">{thread.title}</h1>
            {thread.locked && (
              <Lock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Thread tags */}
            {thread.tags && thread.tags.map((tag: string) => (
              <Link key={tag} to={`/forums?tag=${tag}`}>
                <Badge variant="default" className="cursor-pointer hover:bg-indigo-700">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {threadCircles.map((circle: any) => (
              <Link key={circle.id} to={`/circles/${circle.id}`}>
                <Badge variant="outline" className="hover:bg-gray-100">
                  {circle.name}
                </Badge>
              </Link>
            ))}
            {thread.access_level && thread.access_level !== 'public' && (
              <Badge variant="secondary" className="capitalize">
                {thread.access_level}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Original Post */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-start space-x-4">
              {author && (
                <Avatar className="w-12 h-12">
                  <AvatarImage src={author.avatar} />
                  <AvatarFallback>{author.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold">{author?.name}</p>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{thread.body}</p>
              </div>
            </div>

            {/* Like button */}
            <div className="flex items-center gap-4 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="gap-2"
              >
                <Heart 
                  className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
                />
                <span>{(thread.likes || []).length}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                className="gap-2"
              >
                <Star 
                  className={`w-4 h-4 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`} 
                />
                <span className="text-sm">{isFavorited ? 'Favorited' : 'Favorite'}</span>
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4" />
                <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
              </div>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">
              {replies.length === 0 
                ? 'No replies yet' 
                : `${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}`
              }
            </h2>

            {replies.map((reply) => {
              const replyAuthor = reply.author || users.find((u: any) => u.id === reply.author_id);
              const isReplyAuthor = reply.author_id === profile.id;

              if (!replyAuthor) return null;

              return (
                <div key={reply.id} className="flex items-start space-x-4 pb-6 border-b border-gray-100 last:border-0">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={replyAuthor.avatar} />
                    <AvatarFallback>{replyAuthor.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{replyAuthor.name}</p>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {(isReplyAuthor || canModerate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReply(reply.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Reply Form */}
          {thread.locked && !canModerate ? (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <Lock className="w-4 h-4" />
                <p className="text-sm">This thread has been locked. No new replies can be added.</p>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Add a Reply</h3>
              <div className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleAddReply} disabled={!replyContent.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Post Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Discussion Summary */}
      {replies.length > 0 && (
        <DiscussionSummarizer
          threadId={thread.id}
          threadTitle={thread.title}
          threadBody={thread.body}
          threadAuthor={author}
          threadCreatedAt={thread.created_at}
          replies={replies}
        />
      )}

      {/* Export Discussion Card */}
      {(thread || replies.length > 0) && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Export Discussion</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Download this discussion in text and JSON formats for external processing (e.g., Google AI Studio, ChatGPT, etc.)
            </p>
            <Button onClick={handleExportDiscussion} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Discussion Files
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}