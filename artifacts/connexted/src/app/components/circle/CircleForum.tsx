import { MessageSquare, Plus, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { notifyThreadReply } from '@/lib/notificationHelpers';

interface ForumThread {
  id: string;
  circle_ids: string[];
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface Reply {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface CircleForumProps {
  circleId: string;
  isAdmin: boolean;
}

export default function CircleForum({ circleId, isAdmin }: CircleForumProps) {
  const { profile } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [replies, setReplies] = useState<{ [threadId: string]: Reply[] }>({});
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newThread, setNewThread] = useState({ title: '', body: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [replyInputs, setReplyInputs] = useState<{ [threadId: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
  }, [circleId]);

  const fetchThreads = async () => {
    try {
      // Fetch threads for this circle
      const { data: threadsData, error: threadsError } = await supabase
        .from('forum_threads')
        .select(`
          id,
          circle_ids,
          author_id,
          title,
          body,
          pinned,
          locked,
          created_at,
          author:users!forum_threads_author_id_fkey(id, name, avatar)
        `)
        .contains('circle_ids', [circleId])
        .order('created_at', { ascending: false });

      if (threadsError) throw threadsError;

      setThreads(threadsData || []);

      // Fetch replies for all threads
      if (threadsData && threadsData.length > 0) {
        const threadIds = threadsData.map(t => t.id);
        const { data: repliesData, error: repliesError } = await supabase
          .from('replies')
          .select(`
            id,
            thread_id,
            author_id,
            content,
            created_at,
            author:users!replies_author_id_fkey(id, name, avatar)
          `)
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        // Group replies by thread_id
        const repliesMap: { [threadId: string]: Reply[] } = {};
        repliesData?.forEach(reply => {
          if (!repliesMap[reply.thread_id]) {
            repliesMap[reply.thread_id] = [];
          }
          repliesMap[reply.thread_id].push(reply);
        });
        setReplies(repliesMap);
      }
    } catch (error) {
      console.error('Error fetching forum threads:', error);
      toast.error('Failed to load forum threads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async () => {
    if (!newThread.title || !newThread.body || !profile) return;

    try {
      const { data, error } = await supabase
        .from('forum_threads')
        .insert({
          circle_ids: [circleId],
          author_id: profile.id,
          title: newThread.title,
          body: newThread.body,
          pinned: false,
          locked: false,
        })
        .select(`
          id,
          circle_ids,
          author_id,
          title,
          body,
          pinned,
          locked,
          created_at,
          author:users!forum_threads_author_id_fkey(id, name, avatar)
        `)
        .single();

      if (error) throw error;

      setThreads([data, ...threads]);
      toast.success('Thread created!');
      setNewThread({ title: '', body: '' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to create thread');
    }
  };

  const handleAddReply = async (threadId: string) => {
    const content = replyInputs[threadId]?.trim();
    if (!content || !profile) return;

    try {
      const { data, error } = await supabase
        .from('replies')
        .insert({
          thread_id: threadId,
          author_id: profile.id,
          content,
        })
        .select(`
          id,
          thread_id,
          author_id,
          content,
          created_at,
          author:users!replies_author_id_fkey(id, name, avatar)
        `)
        .single();

      if (error) throw error;

      setReplies({
        ...replies,
        [threadId]: [...(replies[threadId] || []), data],
      });
      setReplyInputs({ ...replyInputs, [threadId]: '' });
      toast.success('Reply added!');
      notifyThreadReply(threadId, profile.id, content);
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      setThreads(threads.filter(t => t.id !== threadId));
      setSelectedThread(null);
      toast.success('Thread deleted');
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error('Failed to delete thread');
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading forum...</div>
      </div>
    );
  }

  const activeThread = selectedThread ? threads.find((t) => t.id === selectedThread) : null;
  const threadReplies = activeThread ? replies[activeThread.id] || [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Threads List */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Discussions</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Discussion</DialogTitle>
                    <DialogDescription>
                      Start a new discussion in this circle.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="thread-title">Title *</Label>
                      <Input
                        id="thread-title"
                        value={newThread.title}
                        onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                        placeholder="Discussion topic"
                      />
                    </div>
                    <div>
                      <Label htmlFor="thread-body">Description *</Label>
                      <Textarea
                        id="thread-body"
                        value={newThread.body}
                        onChange={(e) => setNewThread({ ...newThread, body: e.target.value })}
                        placeholder="What would you like to discuss?"
                        rows={5}
                      />
                    </div>
                    <Button onClick={handleCreateThread} className="w-full">
                      Create Discussion
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {threads.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">No discussions yet</p>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => {
                  const threadReplyCount = replies[thread.id]?.length || 0;
                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedThread === thread.id
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'hover:bg-gray-50 border-transparent'
                      } border`}
                    >
                      <h4 className="font-medium text-sm line-clamp-1 mb-1">{thread.title}</h4>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{thread.author?.name || 'Unknown'}</span>
                        <span className="mx-2">•</span>
                        <MessageSquare className="w-3 h-3 mr-1" />
                        <span>{threadReplyCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Thread Detail */}
      <div className="lg:col-span-2">
        {!activeThread ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Select a discussion to view
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{activeThread.title}</CardTitle>
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <Avatar className="w-6 h-6 mr-2">
                      <AvatarImage src={activeThread.author?.avatar || undefined} />
                      <AvatarFallback>
                        {activeThread.author?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{activeThread.author?.name}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(activeThread.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {(isAdmin || activeThread.author_id === profile.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteThread(activeThread.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">{activeThread.body}</p>

              {/* Replies */}
              {threadReplies.length > 0 && (
                <div className="space-y-4 mb-6 pb-6 border-b">
                  <h3 className="font-medium">Replies ({threadReplies.length})</h3>
                  {threadReplies.map((reply) => (
                    <div key={reply.id} className="flex space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={reply.author?.avatar || undefined} />
                        <AvatarFallback>{reply.author?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{reply.author?.name}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Reply */}
              <div className="flex space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile.avatar || undefined} />
                  <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Write a reply..."
                    value={replyInputs[activeThread.id] || ''}
                    onChange={(e) =>
                      setReplyInputs({ ...replyInputs, [activeThread.id]: e.target.value })
                    }
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddReply(activeThread.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddReply(activeThread.id)}
                    disabled={!replyInputs[activeThread.id]?.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}