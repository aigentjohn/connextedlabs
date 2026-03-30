// Split candidate: ~418 lines — consider extracting ForumThreadList, ForumReplyComposer, and ForumEmptyState into sub-components.
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
  circle_ids?: string[];
  program_ids?: string[];
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

interface ProgramForumProps {
  circleId?: string;
  programId: string;
  isAdmin?: boolean;
}

export function ProgramForum({ circleId, programId, isAdmin = false }: ProgramForumProps) {
  const { profile } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [replies, setReplies] = useState<{ [threadId: string]: Reply[] }>({});
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newThread, setNewThread] = useState({ title: '', body: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [replyInputs, setReplyInputs] = useState<{ [threadId: string]: string }>({});
  const [loading, setLoading] = useState(true);

  // Determine which container type to use
  const useCircleForum = !!circleId;
  const containerId = useCircleForum ? circleId : programId;
  const containerField = useCircleForum ? 'circle_ids' : 'program_ids';

  useEffect(() => {
    fetchThreads();
  }, [containerId]);

  const fetchThreads = async () => {
    try {
      // Fetch threads for this container (program or circle)
      const { data: threadsData, error: threadsError } = await supabase
        .from('forum_threads')
        .select(`
          id,
          circle_ids,
          program_ids,
          author_id,
          title,
          body,
          pinned,
          locked,
          created_at,
          author:users!forum_threads_author_id_fkey(id, name, avatar)
        `)
        .contains(containerField, [containerId])
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
      const threadData: any = {
        author_id: profile.id,
        title: newThread.title,
        body: newThread.body,
        pinned: false,
        locked: false,
      };

      // Set the appropriate container field
      if (useCircleForum) {
        threadData.circle_ids = [circleId];
      } else {
        threadData.program_ids = [programId];
      }

      const { data, error } = await supabase
        .from('forum_threads')
        .insert(threadData)
        .select(`
          id,
          circle_ids,
          program_ids,
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
      setNewThread({ title: '', body: '' });
      setIsDialogOpen(false);
      toast.success('Thread created successfully');
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

      // Update replies state
      setReplies(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), data],
      }));

      // Clear input
      setReplyInputs(prev => ({ ...prev, [threadId]: '' }));

      // Notify thread author
      const thread = threads.find(t => t.id === threadId);
      if (thread && thread.author_id !== profile.id) {
        await notifyThreadReply(thread.author_id, profile.id, threadId, thread.title);
      }

      toast.success('Reply added');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Are you sure you want to delete this thread?')) return;

    try {
      const { error } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      setThreads(threads.filter(t => t.id !== threadId));
      if (selectedThread === threadId) {
        setSelectedThread(null);
      }
      toast.success('Thread deleted');
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error('Failed to delete thread');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Loading forum...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Thread Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Forum Discussions
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Thread
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Thread</DialogTitle>
              <DialogDescription>Start a new discussion topic</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Thread title..."
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="body">Description</Label>
                <Textarea
                  id="body"
                  placeholder="What would you like to discuss?"
                  value={newThread.body}
                  onChange={(e) => setNewThread({ ...newThread, body: e.target.value })}
                  rows={5}
                />
              </div>
              <Button onClick={handleCreateThread} className="w-full">
                Create Thread
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Thread List */}
      {threads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No discussions yet</p>
            <p className="text-sm mt-1">Be the first to start a conversation!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <Card key={thread.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base mb-2">{thread.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={thread.author?.avatar || undefined} />
                        <AvatarFallback>{thread.author?.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span>{thread.author?.name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                      {thread.pinned && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">Pinned</span>
                        </>
                      )}
                    </div>
                  </div>
                  {(isAdmin || thread.author_id === profile?.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteThread(thread.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{thread.body}</p>

                {/* Replies */}
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Replies ({replies[thread.id]?.length || 0})
                  </h4>
                  
                  {replies[thread.id]?.map((reply) => (
                    <div key={reply.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={reply.author?.avatar || undefined} />
                        <AvatarFallback>{reply.author?.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{reply.author?.name || 'Unknown'}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Reply Input */}
                  {!thread.locked && (
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Write a reply..."
                        value={replyInputs[thread.id] || ''}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddReply(thread.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddReply(thread.id)}
                        disabled={!replyInputs[thread.id]?.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {thread.locked && (
                    <p className="text-sm text-gray-500 italic">This thread is locked</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}