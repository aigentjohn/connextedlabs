import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { FileText, MessageSquare, Calendar, BookOpen, ThumbsUp, Hash, Filter, ArrowLeft, Star } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { format } from 'date-fns';
import { Button } from '@/app/components/ui/button';

interface TaggedContent {
  id: string;
  type: 'post' | 'thread' | 'event' | 'course' | 'document' | 'review';
  title: string;
  description?: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  circle_ids?: string[];
  tags: string[];
}

interface ContentTypeFilter {
  posts: boolean;
  threads: boolean;
  events: boolean;
  courses: boolean;
  documents: boolean;
  reviews: boolean;
}

export default function TagDetailPage() {
  const { tagName } = useParams<{ tagName: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<TaggedContent[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  const [contentTypeFilters, setContentTypeFilters] = useState<ContentTypeFilter>({
    posts: true,
    threads: true,
    events: true,
    courses: true,
    documents: true,
    reviews: true,
  });

  const decodedTag = tagName ? decodeURIComponent(tagName) : '';

  useEffect(() => {
    if (profile && decodedTag) {
      fetchTaggedContent();
      fetchCircles();
      checkFollowStatus();
    }
  }, [profile, decodedTag]);

  const checkFollowStatus = async () => {
    if (!profile || !decodedTag) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/${encodeURIComponent(decodedTag)}/following?userId=${profile.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile || !decodedTag) return;
    setFollowLoading(true);
    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/${encodeURIComponent(decodedTag)}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: profile.id }),
        }
      );

      if (response.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchCircles = async () => {
    const { data } = await supabase.from('circles').select('id, name');
    setCircles(data || []);
  };

  const fetchTaggedContent = async () => {
    try {
      setLoading(true);
      const allContent: TaggedContent[] = [];

      // Fetch content with this tag
      const [
        { data: posts },
        { data: threads },
        { data: events },
        { data: courses },
        { data: documents },
        { data: reviews },
      ] = await Promise.all([
        supabase
          .from('posts')
          .select('id, title, body, created_at, author_id, circle_ids, tags')
          .contains('tags', [decodedTag]),
        supabase
          .from('forum_threads')
          .select('id, title, body, created_at, author_id, circle_ids, tags')
          .contains('tags', [decodedTag]),
        supabase
          .from('events')
          .select('id, title, description, created_at, host_id, circle_ids, tags')
          .contains('tags', [decodedTag]),
        supabase
          .from('courses')
          .select('id, title, description, created_at, created_by, circle_ids, tags')
          .contains('tags', [decodedTag]),
        supabase
          .from('documents')
          .select('id, title, description, created_at, author_id, circle_ids, tags')
          .contains('tags', [decodedTag]),
        supabase
          .from('endorsements')
          .select('id, title, body, created_at, author_id, circle_ids, tags')
          .contains('tags', [decodedTag]),
      ]);

      // Process posts
      posts?.forEach(post => {
        allContent.push({
          id: post.id,
          type: 'post',
          title: post.title,
          description: post.body,
          created_at: post.created_at,
          circle_ids: post.circle_ids,
          tags: post.tags || [],
        });
      });

      // Process threads
      threads?.forEach(thread => {
        allContent.push({
          id: thread.id,
          type: 'thread',
          title: thread.title,
          description: thread.body,
          created_at: thread.created_at,
          circle_ids: thread.circle_ids,
          tags: thread.tags || [],
        });
      });

      // Process events
      events?.forEach(event => {
        allContent.push({
          id: event.id,
          type: 'event',
          title: event.title,
          description: event.description,
          created_at: event.created_at,
          circle_ids: event.circle_ids,
          tags: event.tags || [],
        });
      });

      // Process courses
      courses?.forEach(course => {
        allContent.push({
          id: course.id,
          type: 'course',
          title: course.title,
          description: course.description,
          created_at: course.created_at,
          circle_ids: course.circle_ids,
          tags: course.tags || [],
        });
      });

      // Process documents
      documents?.forEach(doc => {
        allContent.push({
          id: doc.id,
          type: 'document',
          title: doc.title,
          description: doc.description,
          created_at: doc.created_at,
          circle_ids: doc.circle_ids,
          tags: doc.tags || [],
        });
      });

      // Process reviews
      reviews?.forEach(review => {
        allContent.push({
          id: review.id,
          type: 'review',
          title: review.title,
          description: review.body,
          created_at: review.created_at,
          circle_ids: review.circle_ids,
          tags: review.tags || [],
        });
      });

      // Sort by most recent
      allContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setContent(allContent);
    } catch (error) {
      console.error('Error fetching tagged content:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContentType = (type: keyof ContentTypeFilter) => {
    setContentTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="w-4 h-4" />;
      case 'thread': return <MessageSquare className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'review': return <ThumbsUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getContentLink = (item: TaggedContent) => {
    switch (item.type) {
      case 'post': return `/posts/${item.id}`;
      case 'thread': return `/forums/thread/${item.id}`;
      case 'event': return `/events/${item.id}`;
      case 'course': return `/courses/${item.id}`;
      case 'document': return `/documents/${item.id}`;
      case 'review': return `/reviews/${item.id}`;
      default: return '#';
    }
  };

  const filteredContent = content.filter(item => contentTypeFilters[`${item.type}s` as keyof ContentTypeFilter]);

  const contentCounts = {
    posts: content.filter(c => c.type === 'post').length,
    threads: content.filter(c => c.type === 'thread').length,
    events: content.filter(c => c.type === 'event').length,
    courses: content.filter(c => c.type === 'course').length,
    documents: content.filter(c => c.type === 'document').length,
    reviews: content.filter(c => c.type === 'review').length,
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Discovery', path: '/discovery' },
        { label: `#${decodedTag}` }
      ]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/discovery">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discovery
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-6 h-6 text-gray-500" />
              <h1 className="text-3xl">#{decodedTag}</h1>
            </div>
            <p className="text-gray-600">
              {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'} with this tag
            </p>
          </div>
        </div>
        {profile && (
          <Button
            variant={isFollowing ? 'outline' : 'default'}
            onClick={handleFollowToggle}
            disabled={followLoading}
          >
            {isFollowing ? (
              <>
                <Star className="w-4 h-4 mr-2 fill-current" />
                Following
              </>
            ) : (
              <>
                <Star className="w-4 h-4 mr-2" />
                Follow
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-posts"
                  checked={contentTypeFilters.posts}
                  onCheckedChange={() => toggleContentType('posts')}
                />
                <Label htmlFor="filter-posts" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Posts</span>
                    <Badge variant="secondary" className="text-xs">
                      {contentCounts.posts}
                    </Badge>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-threads"
                  checked={contentTypeFilters.threads}
                  onCheckedChange={() => toggleContentType('threads')}
                />
                <Label htmlFor="filter-threads" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Forum Threads</span>
                    <Badge variant="secondary" className="text-xs">
                      {contentCounts.threads}
                    </Badge>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-events"
                  checked={contentTypeFilters.events}
                  onCheckedChange={() => toggleContentType('events')}
                />
                <Label htmlFor="filter-events" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Events</span>
                    <Badge variant="secondary" className="text-xs">
                      {contentCounts.events}
                    </Badge>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-courses"
                  checked={contentTypeFilters.courses}
                  onCheckedChange={() => toggleContentType('courses')}
                />
                <Label htmlFor="filter-courses" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Courses</span>
                    <Badge variant="secondary" className="text-xs">
                      {contentCounts.courses}
                    </Badge>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-documents"
                  checked={contentTypeFilters.documents}
                  onCheckedChange={() => toggleContentType('documents')}
                />
                <Label htmlFor="filter-documents" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Documents</span>
                    <Badge variant="secondary" className="text-xs">
                      {contentCounts.documents}
                    </Badge>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-reviews"
                  checked={contentTypeFilters.reviews}
                  onCheckedChange={() => toggleContentType('reviews')}
                />
                <Label htmlFor="filter-reviews" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Reviews</span>
                    <Badge variant="secondary" className="text-xs">
                      {contentCounts.reviews}
                    </Badge>
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Content with #{decodedTag}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading content...</div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No content found with this tag and selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContent.map((item) => {
                    const itemCircles = circles.filter(c => item.circle_ids?.includes(c.id));
                    
                    return (
                      <Card 
                        key={`${item.type}-${item.id}`}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(getContentLink(item))}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <Badge variant="secondary" className="gap-1">
                                {getContentIcon(item.type)}
                                {item.type}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {item.title}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {item.description.substring(0, 200)}
                                  {item.description.length > 200 ? '...' : ''}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {/* Tags */}
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.slice(0, 5).map(tag => (
                                    <Link 
                                      key={tag} 
                                      to={`/tags/${encodeURIComponent(tag)}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs cursor-pointer hover:bg-gray-100"
                                      >
                                        #{tag}
                                      </Badge>
                                    </Link>
                                  ))}
                                  {item.tags.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{item.tags.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Circles */}
                                {itemCircles.length > 0 && (
                                  <div className="flex gap-1">
                                    {itemCircles.slice(0, 2).map(circle => (
                                      <Badge key={circle.id} className="text-xs">
                                        {circle.name}
                                      </Badge>
                                    ))}
                                    {itemCircles.length > 2 && (
                                      <Badge className="text-xs">
                                        +{itemCircles.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-xs text-gray-500 mt-2">
                                {format(new Date(item.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}