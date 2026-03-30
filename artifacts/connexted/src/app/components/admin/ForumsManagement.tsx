import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { MessageSquare, Search, Trash2, Download, Pin, Lock, Tag } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { format } from 'date-fns';

interface Thread {
  id: string;
  title: string;
  body: string;
  author_id: string;
  circle_ids: string[];
  tags: string[];
  pinned: boolean;
  locked: boolean;
  access_level: string;
  replies: any[];
  created_at: string;
  reply_count: number;
}

export default function ForumsManagement() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all threads
        const { data: threadsData, error: threadsError } = await supabase
          .from('forum_threads')
          .select('*')
          .order('created_at', { ascending: false });

        if (threadsError) throw threadsError;
        setThreads(threadsData || []);
        
        // Fetch circles for display
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name')
          .eq('community_id', profile.community_id);
        setCircles(circlesData || []);
        
        // Fetch users for author info
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('community_id', profile.community_id);
        setUsers(usersData || []);
        
      } catch (error) {
        console.error('Error fetching threads:', error);
        toast.error('Failed to load threads');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const pinnedThreads = threads.filter(t => t.pinned);
  const lockedThreads = threads.filter(t => t.locked);
  const unansweredThreads = threads.filter(t => !t.replies || t.replies.length === 0);
  
  const filteredThreads = (activeTab === 'pinned' ? pinnedThreads : 
                          activeTab === 'locked' ? lockedThreads :
                          activeTab === 'unanswered' ? unansweredThreads : threads)
    .filter(thread =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleDeleteThread = async (threadId: string, threadTitle: string) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      setThreads(threads.filter(t => t.id !== threadId));
      toast.success(`Thread "${threadTitle}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error('Failed to delete thread');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(threads, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `forum-threads-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Threads exported successfully!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Forums Management' }
        ]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading threads...</p>
        </div>
      </div>
    );
  }

  const getAuthorName = (authorId: string) => {
    const author = users.find(u => u.id === authorId);
    return author ? author.name : 'Unknown';
  };

  const getCircleNames = (circleIds: string[]) => {
    return circleIds
      .map(id => circles.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Platform-wide';
  };

  const totalReplies = threads.reduce((sum, t) => sum + (t.reply_count || 0), 0);
  const avgReplies = threads.length > 0 ? Math.round(totalReplies / threads.length) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Forums Management' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Forums Management</h1>
          <p className="text-gray-600">Manage all forum threads across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Threads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{threads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unanswered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unansweredThreads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Replies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgReplies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pinned/Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pinnedThreads.length} / {lockedThreads.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search threads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({threads.length})
          </TabsTrigger>
          <TabsTrigger value="pinned">
            Pinned ({pinnedThreads.length})
          </TabsTrigger>
          <TabsTrigger value="locked">
            Locked ({lockedThreads.length})
          </TabsTrigger>
          <TabsTrigger value="unanswered">
            Unanswered ({unansweredThreads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredThreads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No threads found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredThreads.map(thread => {
                return (
                  <Card key={thread.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{thread.title}</h3>
                            {thread.pinned && <Pin className="w-4 h-4 text-indigo-600" />}
                            {thread.locked && <Lock className="w-4 h-4 text-orange-600" />}
                          </div>
                          
                          <p className="text-gray-700 mb-3 line-clamp-2">{thread.body}</p>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                            <div>Author: {getAuthorName(thread.author_id)}</div>
                            <div>Circles: {getCircleNames(thread.circle_ids || [])}</div>
                            <div>
                              <MessageSquare className="w-4 h-4 inline mr-1" />
                              {thread.replies?.length || 0} replies
                            </div>
                            <div>{format(new Date(thread.created_at), 'PPp')}</div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {thread.tags?.map(tag => (
                              <Badge key={tag} variant="outline" className="bg-blue-50">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {thread.access_level !== 'public' && (
                              <Badge variant="secondary" className="capitalize">
                                {thread.access_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Link to={`/forums/${thread.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Thread?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{thread.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteThread(thread.id, thread.title)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}