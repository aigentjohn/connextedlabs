import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Heart, MessageCircle, MessageSquare, Share2, Image as ImageIcon, Link as LinkIcon, Filter, TrendingUp, Clock, ArrowUp, ChevronDown, X, Plus, Send, Lock, Pin, Trash2 } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { notifyLike, notifyPostComment } from '@/lib/notificationHelpers';

type SortOption = 'newest' | 'oldest' | 'most-liked' | 'most-comments';

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

export default function FeedPage({ standupId }: { standupId?: string }) {
  const { profile } = useAuth();
  const { circleId } = useParams();
  
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [standups, setStandups] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for post creation
  const [isCreating, setIsCreating] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [newPostLinkUrl, setNewPostLinkUrl] = useState('');
  const [showMediaOptions, setShowMediaOptions] = useState(false);

  // State for filters
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [postsData, circlesData, tablesData, standupsData, usersData] = await Promise.all([
        supabase.from('posts').select('*'),
        supabase.from('circles').select('*'),
        supabase.from('tables').select('*'),
        supabase.from('standups').select('*'),
        supabase.from('users').select('*'),
      ]);

      const posts = postsData.data || [];

      // Fetch likes for all posts from content_likes table
      const postIds = posts.map(p => p.id);
      let likesMap: Record<string, string[]> = {};
      if (postIds.length > 0) {
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', 'post')
          .in('content_id', postIds);

        if (likesData) {
          likesData.forEach(like => {
            if (!likesMap[like.content_id]) likesMap[like.content_id] = [];
            likesMap[like.content_id].push(like.user_id);
          });
        }
      }

      // Enrich posts with likes data
      const enrichedPosts = posts.map(post => ({
        ...post,
        _likes: likesMap[post.id] || [],
        _likes_count: (likesMap[post.id] || []).length,
      }));

      setAllPosts(enrichedPosts);
      setCircles(circlesData.data || []);
      setTables(tablesData.data || []);
      setStandups(standupsData.data || []);
      setAllUsers(usersData.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching feed data:', error);
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading feed...</p>
      </div>
    );
  }

  const isPlatformAdmin = profile.role === 'super';

  // Get user's subscribed circles (or all circles for platform admin)
  const userCircles = isPlatformAdmin 
    ? circles 
    : circles.filter((c) => c.member_ids?.includes(profile.id));
  const userCircleIds = userCircles.map((c) => c.id);

  // Get ALL container IDs user is a member of (or all for platform admin)
  const userTables = isPlatformAdmin
    ? tables
    : tables.filter((t) => t.member_ids?.includes(profile.id));
  
  const userStandups = isPlatformAdmin
    ? standups
    : standups.filter(s => s.member_ids?.includes(profile.id));
  
  // Aggregate all container IDs the user has access to
  const userContainerIds = [
    ...userCircleIds,
    ...userTables.map(t => t.id),
    ...userStandups.map(s => s.id),
  ];

  // Determine if this is a circle-specific feed or all feed
  const isCircleFeed = !!circleId;
  const feedCircle = isCircleFeed ? circles.find(c => c.id === circleId) : null;

  // Get the standup if we're showing a standup feed
  const standup = standupId ? standups.find(s => s.id === standupId) : null;

  // Filter posts based on navigation context:
  // - Circle-First (/circles/:circleId/feed): Show only posts tagged with that circle
  // - Activity-First (/feed): Show posts from ALL subscribed containers (circles, tables, standups)
  // - Standup (/standups/:slug): Show only posts from that standup
  // Platform admins see ALL posts
  // 
  // NOTE: Posts table only has circle_ids and table_ids columns
  // All non-circle containers (tables, elevators, standups, meetings, meetups) use table_ids
  let filteredPosts = allPosts.filter((post) => {
    // If this is a standup feed, only show posts from this standup
    if (standupId && standup) {
      return standup.post_ids?.includes(post.id);
    }

    // Platform admins see ALL posts (unless in a specific circle/standup view)
    if (isPlatformAdmin && !isCircleFeed && selectedCircleIds.length === 0) {
      return true;
    }

    // Must be from containers user is member of
    // Check both circle_ids and table_ids (table_ids includes all non-circle containers)
    const isInUserContainers = 
      (post.circle_ids && post.circle_ids.some((containerId) => userContainerIds.includes(containerId))) ||
      (post.table_ids && post.table_ids.some((containerId) => userContainerIds.includes(containerId)));
    
    if (!isInUserContainers) return false;

    // If circle-specific feed, filter by that circle
    if (isCircleFeed) {
      return post.circle_ids.includes(circleId);
    }

    // If All Feed with circle filters applied
    if (selectedCircleIds.length > 0) {
      return post.circle_ids.some((circleId) => selectedCircleIds.includes(circleId));
    }

    return true;
  });

  // Sort posts
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'most-liked':
        return (b._likes_count || 0) - (a._likes_count || 0);
      case 'most-comments':
        return (b._comments_count || 0) - (a._comments_count || 0);
      default:
        return 0;
    }
  });

  // Check if user can access content
  const canAccess = (post: any): boolean => {
    if (!post.access_level || post.access_level === 'public') return true;
    if (post.access_level === 'member') return profile.membership_tier !== 'free';
    return true;
  };

  const getCircleNames = (circleIds: string[]): string[] => {
    return circleIds
      .map((id) => circles.find((c) => c.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  const getCircleDetails = (circleIds: string[]): { id: string; name: string }[] => {
    return circleIds
      .map((id) => {
        const circle = circles.find((c) => c.id === id);
        return circle ? { id: circle.id, name: circle.name } : null;
      })
      .filter((circle): circle is { id: string; name: string } => !!circle);
  };

  // Helper to get container details (circles, tables, standups, etc.)
  const getContainerDetails = (containerIds: string[]): { id: string; name: string; type: string }[] => {
    return containerIds
      .map((id) => {
        // Check circles
        const circle = circles.find((c) => c.id === id);
        if (circle) return { id: circle.id, name: circle.name, type: 'circle' };

        // Check tables
        const table = tables.find((t) => t.id === id);
        if (table) return { id: table.id, name: table.name, type: 'table' };

        // Check standups
        const standup = standups.find((s) => s.id === id);
        if (standup) return { id: standup.id, name: standup.name, type: 'standup' };

        return null;
      })
      .filter((container): container is { id: string; name: string; type: string } => !!container);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }

    const targetCircleIds = isCircleFeed ? [circleId!] : selectedCircleIds.length > 0 ? selectedCircleIds : userCircleIds;

    // posts_belongs_to_one_feed constraint requires EXACTLY ONE feed array column
    // to be non-null. All others must be explicitly set to null because the DB
    // defaults them to {} (empty array), which counts as non-null.
    const ALL_FEED_FIELDS = [
      'circle_ids', 'table_ids', 'elevator_ids', 'standup_ids', 'meeting_ids',
      'build_ids', 'pitch_ids', 'meetup_ids', 'playlist_ids', 'program_ids',
      'blog_ids', 'magazine_ids',
      'moments_id', 'company_news_id', 'program_id', 'program_journey_id',
    ];

    const { error } = await supabase.from('posts').insert({
      author_id: profile.id,
      content: newPostContent,
      access_level: 'public',
      pinned: false,
      image_url: newPostImageUrl || null,
      link_url: newPostLinkUrl || null,
      // Null every feed column, then set circle_ids
      ...Object.fromEntries(ALL_FEED_FIELDS.map(f => [f, null])),
      circle_ids: targetCircleIds,
    });

    if (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
      return;
    }

    setNewPostContent('');
    setNewPostImageUrl('');
    setNewPostLinkUrl('');
    setIsCreating(false);
    toast.success('Post created successfully!');
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      supabase.from('posts').delete().eq('id', postId);
      toast.success('Post deleted successfully');
    }
  };

  const handleToggleLike = async (postId: string) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const currentLikes = post._likes || [];
    const isLiking = !currentLikes.includes(profile.id);

    try {
      if (isLiking) {
        await supabase.from('content_likes').insert({
          content_type: 'post',
          content_id: postId,
          user_id: profile.id,
        });
      } else {
        await supabase.from('content_likes').delete()
          .eq('content_type', 'post')
          .eq('content_id', postId)
          .eq('user_id', profile.id);
      }

      // Update local state
      setAllPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const newLikes = isLiking
          ? [...currentLikes, profile.id]
          : currentLikes.filter((id: string) => id !== profile.id);
        return { ...p, _likes: newLikes, _likes_count: newLikes.length };
      }));

      // Notify the post author when someone likes (not when unliking)
      if (isLiking && post.author_id !== profile.id) {
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
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleToggleCircleFilter = (circleId: string) => {
    setSelectedCircleIds(prev =>
      prev.includes(circleId)
        ? prev.filter(id => id !== circleId)
        : [...prev, circleId]
    );
  };

  const clearFilters = () => {
    setSelectedCircleIds([]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isCircleFeed ? `${feedCircle?.name} Feed` : 'All Feed'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isCircleFeed 
              ? `Posts from ${feedCircle?.name}`
              : `All posts from your circles`
            } ({sortedPosts.length})
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {isCreating ? 'Cancel' : 'Create Post'}
        </Button>
      </div>

      {/* Create Post Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Share Something</h3>
            <p className="text-sm text-gray-500">
              Write a quick message, share a longer thought, or add an image or link
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            
            {/* Optional media buttons */}
            {!showMediaOptions && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMediaOptions(true)}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMediaOptions(true)}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>
            )}

            {/* Optional media inputs */}
            {showMediaOptions && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Optional Attachments</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMediaOptions(false);
                      setNewPostImageUrl('');
                      setNewPostLinkUrl('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-url" className="text-sm">Image URL</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="image-url"
                      value={newPostImageUrl}
                      onChange={(e) => setNewPostImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-url" className="text-sm">Link URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="link-url"
                      value={newPostLinkUrl}
                      onChange={(e) => setNewPostLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-500">
                Posting to: {isCircleFeed 
                  ? feedCircle?.name 
                  : selectedCircleIds.length > 0 
                    ? getCircleNames(selectedCircleIds).join(', ')
                    : 'All your circles'
                }
              </div>
              <Button onClick={handleCreatePost}>
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Sort - Only show for All Feed */}
      {!isCircleFeed && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter by Circle
                {selectedCircleIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCircleIds.length}
                  </Badge>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Sort by:</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="most-liked">Most Liked</SelectItem>
                    <SelectItem value="most-comments">Most Comments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Circle Filter Checkboxes */}
            {showFilters && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Select Circles to Display</Label>
                  {selectedCircleIds.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {userCircles.map((circle) => (
                    <div key={circle.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`circle-${circle.id}`}
                        checked={selectedCircleIds.includes(circle.id)}
                        onCheckedChange={() => handleToggleCircleFilter(circle.id)}
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
                {selectedCircleIds.length > 0 && (
                  <div className="text-sm text-gray-600 pt-2">
                    Showing posts from {selectedCircleIds.length} circle{selectedCircleIds.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      {sortedPosts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {selectedCircleIds.length > 0
                ? 'No posts found for selected circles'
                : 'No posts yet. Join some circles or create your first post!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPosts
            .filter((post) => allUsers.find(u => u.id === post.author_id) !== undefined)
            .map((post) => {
            const author = allUsers.find(u => u.id === post.author_id);
            // Get all container IDs from all container types
            const allContainerIds = [
              ...(post.circle_ids || []),
              ...(post.table_ids || []),
              ...(post.elevator_ids || []),
              ...(post.standup_ids || []),
              ...(post.meeting_ids || []),
            ];
            const containerDetails = getContainerDetails(allContainerIds);
            const accessible = canAccess(post);
            const isOwnPost = post.author_id === profile.id;

            return (
              <Card key={post.id} className={!accessible ? 'opacity-75' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        <AvatarImage src={author?.avatar} />
                        <AvatarFallback>{author?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{author?.name}</p>
                          {post.pinned && <Pin className="w-4 h-4 text-indigo-600" />}
                          {!accessible && <Lock className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          <span>
                            {safeFormatDate(post.created_at)}
                          </span>
                          <span>•</span>
                          <div className="flex gap-1 flex-wrap">
                            {containerDetails.map((container, index) => (
                              <Badge key={`${post.id}-container-${container.id}-${index}`} variant="secondary" className="text-xs">
                                {container.name}
                                {container.type !== 'circle' && (
                                  <span className="ml-1 text-gray-400">({container.type})</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.access_level && post.access_level !== 'public' && (
                        <Badge variant={accessible ? 'default' : 'outline'} className="capitalize">
                          {post.access_level}
                        </Badge>
                      )}
                      {isOwnPost && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {accessible ? (
                    <>
                      <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="mt-4 rounded-lg w-full"
                        />
                      )}
                      {post.link_url && (
                        <a
                          href={post.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 block text-indigo-600 hover:underline"
                        >
                          {post.link_url}
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3 py-6 px-4 bg-gray-50 rounded-lg">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Members Only — upgrade to view this content
                        </p>
                        <Button variant="link" size="sm" className="px-0 h-auto mt-1">
                          Upgrade now
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>

                {accessible && (
                  <CardFooter className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleToggleLike(post.id)}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          (post._likes || []).includes(profile.id) ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                      <span>{post._likes_count || post._likes?.length || 0}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post._comments_count || 0}</span>
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}