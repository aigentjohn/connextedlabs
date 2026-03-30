import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { 
  MessageSquare, 
  Search, 
  Lock, 
  Pin, 
  TrendingUp, 
  User, 
  Plus, 
  Trash2,
  Tag,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/app/components/shared/PageHeader';

export default function ForumsPage({ meetupId }: { meetupId?: string }) {
  const { profile } = useAuth();
  const { circleId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-replies' | 'most-liked'>('newest');
  
  const [threads, setThreads] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create thread dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [newThreadTags, setNewThreadTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile, circleId, meetupId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const isPlatformAdmin = profile?.role === 'admin' || profile?.role === 'super';

      // Fetch user's circles (or all circles for platform admin)
      let circlesQuery = supabase
        .from('circles')
        .select('*')
        .eq('community_id', profile?.community_id);

      if (!isPlatformAdmin && profile) {
        circlesQuery = circlesQuery.contains('member_ids', [profile.id]);
      }

      const { data: circlesData } = await circlesQuery;

      const userCircles = circlesData || [];
      const userCircleIds = userCircles.map(c => c.id);

      // Fetch threads
      let threadsQuery = supabase
        .from('forum_threads')
        .select('*, author:users!forum_threads_author_id_fkey(id, name, avatar), replies(*)');

      // Filter by circle if specified
      if (circleId) {
        threadsQuery = threadsQuery.contains('circle_ids', [circleId]);
      }

      const { data: threadsData } = await threadsQuery.order('created_at', { ascending: false });

      // Platform admins see ALL threads, regular users see filtered
      let accessibleThreads = threadsData || [];
      if (!isPlatformAdmin) {
        accessibleThreads = (threadsData || []).filter(thread => {
          if (!thread.circle_ids || thread.circle_ids.length === 0) return true;
          return thread.circle_ids.some((cId: string) => userCircleIds.includes(cId));
        });
      }

      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('community_id', profile?.community_id);

      setThreads(accessibleThreads);
      setCircles(userCircles);
      setUsers(usersData || []);

      // Fetch likes for all threads
      if (accessibleThreads.length > 0 && profile) {
        const ids = accessibleThreads.map((t: any) => t.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', 'forum_thread')
          .in('content_id', ids);

        const counts: Record<string, number> = {};
        (likesData || []).forEach((like: { content_id: string }) => {
          counts[like.content_id] = (counts[like.content_id] || 0) + 1;
        });
        // Store on threads
        setThreads(accessibleThreads.map((t: any) => ({
          ...t,
          like_count: counts[t.id] || 0,
        })));
      }
    } catch (error) {
      console.error('Error fetching forum data:', error);
      toast.error('Failed to load forums');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading forums...</p>
      </div>
    );
  }

  const isCircleForum = !!circleId;
  const forumCircle = isCircleForum ? circles.find(c => c.id === circleId) : null;
  const userCircleIds = circles.map(c => c.id);

  // Get selected tag from URL
  const selectedTag = searchParams.get('tag');

  // Filter threads based on search and tag
  const filteredThreads = threads.filter((thread) => {
    const matchesSearch = thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || (thread.tags && thread.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  // Get my threads
  const myThreads = filteredThreads.filter(thread => thread.author_id === profile.id);

  // Get unanswered threads
  const unansweredThreads = filteredThreads.filter(thread => !thread.replies || thread.replies.length === 0);

  // Get popular threads (sorted by reply count)
  const popularThreads = [...filteredThreads].sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));

  // Get all unique tags with counts
  const getAllTags = () => {
    const tagCounts: Record<string, number> = {};
    threads.forEach(thread => {
      if (thread.tags) {
        thread.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  };

  const allTags = getAllTags();
  const existingTags = allTags.map(t => t.tag);

  // Normalize tag (lowercase, hyphenated)
  const normalizeTag = (tag: string): string => {
    return tag.toLowerCase().trim().replace(/\s+/g, '-');
  };

  // Check if user can moderate
  const canModerateThread = (thread: any): boolean => {
    if (profile.role === 'super') return true;
    
    return thread.circle_ids?.some((cId: string) => {
      const circle = circles.find(c => c.id === cId);
      if (!circle) return false;
      return circle.host_ids?.includes(profile.id) || circle.moderator_ids?.includes(profile.id);
    });
  };

  const handleAddTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (normalized && !newThreadTags.includes(normalized)) {
      if (newThreadTags.length < 5) {
        setNewThreadTags([...newThreadTags, normalized]);
        setTagInput('');
      } else {
        toast.error('Maximum 5 tags allowed');
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewThreadTags(newThreadTags.filter(t => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!newThreadBody.trim()) {
      toast.error('Please enter a description');
      return;
    }

    const targetCircleIds = isCircleForum 
      ? [circleId!] 
      : selectedCircleIds.length > 0 
        ? selectedCircleIds 
        : userCircleIds;

    if (targetCircleIds.length === 0) {
      toast.error('Please select at least one circle');
      return;
    }

    try {
      const { error } = await supabase
        .from('forum_threads')
        .insert({
          circle_ids: targetCircleIds,
          author_id: profile.id,
          title: newThreadTitle,
          body: newThreadBody,
          tags: newThreadTags.length > 0 ? newThreadTags : null,
          pinned: false,
          locked: false,
          access_level: 'public',
        });

      if (error) throw error;

      setNewThreadTitle('');
      setNewThreadBody('');
      setNewThreadTags([]);
      setTagInput('');
      setSelectedCircleIds([]);
      setShowCreateDialog(false);
      toast.success('Thread created successfully!');
      
      await fetchData();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to create thread');
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (window.confirm('Are you sure you want to delete this thread?')) {
      try {
        const { error } = await supabase
          .from('forum_threads')
          .delete()
          .eq('id', threadId);

        if (error) throw error;

        toast.success('Thread deleted');
        await fetchData();
      } catch (error) {
        console.error('Error deleting thread:', error);
        toast.error('Failed to delete thread');
      }
    }
  };

  const handleToggleCircleSelection = (cId: string) => {
    setSelectedCircleIds(prev =>
      prev.includes(cId)
        ? prev.filter(id => id !== cId)
        : [...prev, cId]
    );
  };

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchParams({ tag });
  };

  const handleClearTagFilter = () => {
    setSearchParams({});
  };

  const renderThreadCard = (thread: any) => {
    const author = thread.author || users.find((u: any) => u.id === thread.author_id);
    const threadCircles = (thread.circle_ids || [])
      .map((id: string) => circles.find(c => c.id === id))
      .filter(Boolean);
    const canModerate = canModerateThread(thread);
    const isAuthor = thread.author_id === profile.id;

    return (
      <Link to={`/forums/${thread.id}`} key={thread.id}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              {author && (
                <Avatar className="w-10 h-10">
                  <AvatarImage src={author.avatar} />
                  <AvatarFallback>{author.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  {thread.pinned && (
                    <Pin className="w-4 h-4 text-indigo-600 fill-current" />
                  )}
                  <h3 className="font-medium text-lg">{thread.title}</h3>
                  {thread.locked && (
                    <Lock className="w-4 h-4 text-orange-500" />
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {thread.body}
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Thread tags */}
                  {thread.tags && thread.tags.map((tag: string) => (
                    <Badge 
                      key={tag}
                      variant="default"
                      className="cursor-pointer hover:bg-indigo-700"
                      onClick={(e) => handleTagClick(tag, e)}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  
                  {/* Circle badges */}
                  {threadCircles.map((circle: any) => (
                    <Badge key={circle.id} variant="outline" className="hover:bg-gray-100">
                      {circle.name}
                    </Badge>
                  ))}
                  
                  {/* Access level badge */}
                  {thread.access_level && thread.access_level !== 'public' && (
                    <Badge variant="secondary" className="capitalize">
                      {thread.access_level}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600 space-x-4">
                    {author && <span>by {author.name}</span>}
                    <span>•</span>
                    <div className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      <span>{thread.replies?.length || 0} replies</span>
                    </div>
                    <span>•</span>
                    <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Moderation buttons */}
                  {(isAuthor || canModerate) && (
                    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteThread(thread.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const sortThreads = (threads: any[]) => {
    return [...threads].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'most-replies') return (b.replies?.length || 0) - (a.replies?.length || 0);
      if (sortBy === 'most-liked') return (b.like_count || 0) - (a.like_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Forums' }]}
        icon={MessageSquare}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title={isCircleForum ? `${forumCircle?.name} Forum` : 'All Forums'}
        description={isCircleForum 
          ? `Discussion threads in ${forumCircle?.name}`
          : 'Discussion threads from all your circles'
        }
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Thread
            </Button>
          </div>
        }
      />

      {/* Tag filter indicator */}
      {selectedTag && (
        <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <Tag className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-900">
            Filtered by tag: <span className="font-bold">{selectedTag}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearTagFilter}
            className="ml-auto text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
          >
            <X className="w-4 h-4 mr-1" />
            Clear filter
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search forums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">Sort:</span>
        <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
        <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
        <Button variant={sortBy === 'most-replies' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-replies')}>Most Replies</Button>
        <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Threads
            <Badge variant="secondary" className="ml-2">{filteredThreads.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="my-threads">
            <User className="w-4 h-4 mr-1" />
            My Threads
            <Badge variant="secondary" className="ml-2">{myThreads.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="popular">
            <TrendingUp className="w-4 h-4 mr-1" />
            Popular
          </TabsTrigger>
          <TabsTrigger value="unanswered">
            Unanswered
            <Badge variant="secondary" className="ml-2">{unansweredThreads.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tagged-threads">
            <Tag className="w-4 h-4 mr-1" />
            Tagged Threads
          </TabsTrigger>
        </TabsList>

        {/* All Threads Tab */}
        <TabsContent value="all" className="space-y-4 mt-6">
          {sortThreads(filteredThreads).length === 0 ? (
            <Card>
              <CardContent className="py-6 text-gray-500">
                {searchQuery ? 'No threads found' : 'No forum threads yet'}
              </CardContent>
            </Card>
          ) : (
            sortThreads(filteredThreads).map(renderThreadCard)
          )}
        </TabsContent>

        {/* My Threads Tab */}
        <TabsContent value="my-threads" className="space-y-4 mt-6">
          {myThreads.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-gray-500">
                You haven't created any threads yet
              </CardContent>
            </Card>
          ) : (
            sortThreads(myThreads).map(renderThreadCard)
          )}
        </TabsContent>

        {/* Popular Tab */}
        <TabsContent value="popular" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <TrendingUp className="w-4 h-4" />
            <span>Sorted by number of replies</span>
          </div>
          {popularThreads.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-gray-500">
                No threads yet
              </CardContent>
            </Card>
          ) : (
            popularThreads.map(renderThreadCard)
          )}
        </TabsContent>

        {/* Unanswered Tab */}
        <TabsContent value="unanswered" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <MessageSquare className="w-4 h-4" />
            <span>Threads waiting for their first reply</span>
          </div>
          {unansweredThreads.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-gray-500">
                All threads have been answered!
              </CardContent>
            </Card>
          ) : (
            sortThreads(unansweredThreads).map(renderThreadCard)
          )}
        </TabsContent>

        {/* Tagged Threads Tab */}
        <TabsContent value="tagged-threads" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Tag className="w-4 h-4" />
            <span>Browse threads by tag</span>
          </div>
          
          {allTags.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-gray-500">
                No tags yet. Add tags when creating threads to organize discussions!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTags.map(({ tag, count }) => (
                <Card 
                  key={tag} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSearchParams({ tag })}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-medium text-lg">{tag}</h3>
                      </div>
                      <Badge variant="secondary">{count} thread{count !== 1 ? 's' : ''}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Thread Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Thread</DialogTitle>
            <DialogDescription>
              {isCircleForum 
                ? `Start a new discussion in ${forumCircle?.name}`
                : 'Start a new discussion in your circles'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Thread Title</Label>
              <Input
                id="title"
                placeholder="Enter a descriptive title..."
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                placeholder="Describe your question or topic..."
                value={newThreadBody}
                onChange={(e) => setNewThreadBody(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            {/* Tags input */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional, max 5)</Label>
              <div className="space-y-2">
                <Input
                  id="tags"
                  placeholder="Type a tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  list="tag-suggestions"
                />
                <datalist id="tag-suggestions">
                  {existingTags.map(tag => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
                
                {/* Display added tags */}
                {newThreadTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newThreadTags.map(tag => (
                      <Badge key={tag} variant="default" className="pl-2 pr-1 py-1">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:bg-indigo-700 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  Tags help organize threads and make them easier to find. {newThreadTags.length}/5 tags added.
                </p>
              </div>
            </div>

            {/* Circle selection - only show for Activity-First (all forums) */}
            {!isCircleForum && (
              <div className="space-y-2">
                <Label>Post to Circles</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                  {circles.map((circle) => (
                    <div key={circle.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`circle-${circle.id}`}
                        checked={selectedCircleIds.includes(circle.id)}
                        onCheckedChange={() => handleToggleCircleSelection(circle.id)}
                      />
                      <Label
                        htmlFor={`circle-${circle.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {circle.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {selectedCircleIds.length > 0 
                    ? `Selected ${selectedCircleIds.length} circle${selectedCircleIds.length !== 1 ? 's' : ''}`
                    : 'Select circles or leave empty to post to all your circles'
                  }
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateThread}>
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}