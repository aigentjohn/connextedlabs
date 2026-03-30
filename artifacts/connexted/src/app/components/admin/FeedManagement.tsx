import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { MessageSquare, Search, Trash2, Download, Heart, Pin, User } from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  author_id: string;
  content: string;
  circle_ids: string[];
  table_ids: string[];
  access_level: string;
  pinned: boolean;
  reactions: string[];
  comments: any[];
  image_url: string | null;
  link_url: string | null;
  created_at: string;
}

export default function FeedManagement() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        setPosts(postsData || []);
        
        // Fetch circles for display
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name')
          .eq('community_id', profile.community_id);
        setCircles(circlesData || []);
        
        // Fetch users for author info
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email, avatar')
          .eq('community_id', profile.community_id);
        setUsers(usersData || []);
        
      } catch (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to load posts');
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
  
  const pinnedPosts = posts.filter(p => p.pinned);
  const recentPosts = posts.filter(p => !p.pinned);
  
  const filteredPosts = (activeTab === 'pinned' ? pinnedPosts : activeTab === 'recent' ? recentPosts : posts)
    .filter(post =>
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        throw error;
      }

      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error(`Failed to delete post: ${error.message || 'Unknown error'}`);
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(posts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `posts-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Posts exported successfully!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Feed Management' }
        ]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading posts...</p>
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

  const totalReactions = posts.reduce((sum, p) => sum + (p.reactions?.length || 0), 0);
  const avgReactions = posts.length > 0 ? Math.round(totalReactions / posts.length) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'Feed Management' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Feed Management</h1>
          <p className="text-gray-600">Manage all posts across the platform</p>
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pinned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{pinnedPosts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Reactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgReactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {posts.reduce((sum, p) => sum + (p.reactions?.length || 0) + (p.comments?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="pinned">
            Pinned ({pinnedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent ({recentPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No posts found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map(post => {
                const author = users.find(u => u.id === post.author_id);
                
                return (
                  <Card key={post.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {author && (
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={author.avatar} />
                                <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{getAuthorName(post.author_id)}</h3>
                                {post.pinned && <Pin className="w-4 h-4 text-indigo-600" />}
                              </div>
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          
                          <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                          
                          {post.image_url && (
                            <img src={post.image_url} alt="Post" className="rounded-lg max-h-64 mb-3" />
                          )}
                          
                          {post.link_url && (
                            <a 
                              href={post.link_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline text-sm mb-3 block"
                            >
                              {post.link_url}
                            </a>
                          )}
                          
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                            <Badge variant="outline">
                              Circles: {getCircleNames(post.circle_ids || [])}
                            </Badge>
                            <Badge variant="outline">
                              <Heart className="w-3 h-3 mr-1" />
                              {post.reactions?.length || 0} reactions
                            </Badge>
                            <Badge variant="outline">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {post.comments?.length || 0} comments
                            </Badge>
                            {post.access_level !== 'public' && (
                              <Badge variant="secondary" className="capitalize">
                                {post.access_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this post? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
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