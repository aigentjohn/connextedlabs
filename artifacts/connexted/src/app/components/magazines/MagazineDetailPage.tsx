import { useState,useEffect } from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { BlogCard } from '@/app/components/blogs/BlogCard';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Settings, 
  FileText, 
  Loader2, 
  Plus,
  Globe,
  Users,
  Lock,
  TrendingUp,
  Sparkles,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Topic {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface Blog {
  id: string;
  title: string;
  tagline: string;
  blog_summary: string;
  external_url: string;
  domain: string;
  user_id: string;
  published_date: string;
  reading_time_minutes?: number;
  featured_image_url?: string;
  view_count: number;
  click_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  topics?: Topic[];
}

interface Magazine {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  cover_image_url?: string;
  curator_id: string;
  curator_name: string;
  curator_avatar?: string;
  blog_count: number;
  subscriber_count: number;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  curation_type: 'auto' | 'curated' | 'hybrid';
  publishing_frequency?: string;
  status: string;
  created_at: string;
  updated_at: string;
  topics?: Topic[];
}

export default function MagazineDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [magazine, setMagazine] = useState<Magazine | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [activeTab, setActiveTab] = useState('blogs');

  const isOwner = profile?.id === magazine?.curator_id;

  useEffect(() => {
    if (id) {
      fetchMagazineData();
    }
  }, [id, profile]);

  const fetchMagazineData = async () => {
    try {
      setLoading(true);

      // Fetch magazine
      const { data: magazineData, error: magazineError } = await supabase
        .from('magazines')
        .select('*')
        .eq('id', id)
        .single();

      if (magazineError) throw magazineError;
      setMagazine(magazineData);

      // Fetch curator info
      const { data: curatorData } = await supabase
        .from('users')
        .select('id, name, avatar')
        .eq('id', magazineData.curator_id)
        .single();

      if (curatorData) {
        setMagazine(prev => prev ? {
          ...prev,
          curator_name: curatorData.name,
          curator_avatar: curatorData.avatar
        } : null);
      }

      // Fetch magazine topics
      const { data: magazineTopics } = await supabase
        .from('magazine_topics')
        .select('topic_id, topics(id, name, slug, icon)')
        .eq('magazine_id', id);

      if (magazineTopics) {
        const topics = magazineTopics
          .map((mt: any) => mt.topics)
          .filter(Boolean);
        setMagazine(prev => prev ? { ...prev, topics } : null);
      }

      // Fetch blogs in magazine
      const { data: magazineItems } = await supabase
        .from('magazine_items')
        .select('blog_id, added_at')
        .eq('magazine_id', id)
        .order('added_at', { ascending: false });

      if (magazineItems && magazineItems.length > 0) {
        const blogIds = magazineItems.map((item: any) => item.blog_id);
        
        const { data: blogsData } = await supabase
          .from('blogs')
          .select('*, users(full_name, avatar)')
          .in('id', blogIds);

        if (blogsData) {
          // Fetch topics for each blog
          const blogsWithTopics = await Promise.all(
            blogsData.map(async (blog: any) => {
              const { data: blogTopics } = await supabase
                .from('topic_links')
                .select('topic_id, topics(id, name, slug, icon)')
                .eq('entity_type', 'blog')
                .eq('entity_id', blog.id);

              const topics = blogTopics
                ?.map((tl: any) => tl.topics)
                .filter(Boolean) || [];

              return {
                ...blog,
                author_name: blog.users?.full_name || 'Unknown',
                author_avatar: blog.users?.avatar,
                topics,
              };
            })
          );

          setBlogs(blogsWithTopics);
        }
      }

      // Check if user is subscribed
      if (profile) {
        const { data: subscription } = await supabase
          .from('magazine_subscribers')
          .select('id')
          .eq('magazine_id', id)
          .eq('user_id', profile.id)
          .single();

        setIsSubscribed(!!subscription);
      }

    } catch (error: any) {
      console.error('Error fetching magazine:', error);
      toast.error('Failed to load magazine');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!profile) {
      toast.error('Please log in to subscribe');
      return;
    }

    try {
      setSubscribing(true);

      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('magazine_subscribers')
          .delete()
          .eq('magazine_id', id)
          .eq('user_id', profile.id);

        if (error) throw error;
        
        setIsSubscribed(false);
        setMagazine(prev => prev ? {
          ...prev,
          subscriber_count: Math.max(0, prev.subscriber_count - 1)
        } : null);
        toast.success('Unsubscribed from magazine');
      } else {
        // Subscribe
        const { error } = await supabase
          .from('magazine_subscribers')
          .insert({
            magazine_id: id,
            user_id: profile.id,
          });

        if (error) throw error;
        
        setIsSubscribed(true);
        setMagazine(prev => prev ? {
          ...prev,
          subscriber_count: prev.subscriber_count + 1
        } : null);
        toast.success('Subscribed to magazine');
      }
    } catch (error: any) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Magazine link copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!magazine) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Magazine Not Found</h1>
        <Link to="/magazines">
          <Button>Browse Magazines</Button>
        </Link>
      </div>
    );
  }

  const getVisibilityIcon = () => {
    switch (magazine.visibility) {
      case 'public':   return <Globe className="w-4 h-4" />;
      case 'member':   return <Users className="w-4 h-4" />;
      case 'unlisted': return <EyeOff className="w-4 h-4" />;
      case 'private':  return <Lock className="w-4 h-4" />;
    }
  };

  const getVisibilityLabel = () => {
    switch (magazine.visibility) {
      case 'public':   return 'Public';
      case 'member':   return 'Members Only';
      case 'unlisted': return 'Unlisted';
      case 'private':  return 'Private';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Magazines', href: '/magazines' },
          { label: magazine.name },
        ]}
      />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Link to="/magazines">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Cover Image */}
        {magazine.cover_image_url && (
          <div className="w-full h-64 rounded-lg overflow-hidden">
            <img
              src={magazine.cover_image_url}
              alt={magazine.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title and Actions */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <h1 className="text-4xl font-bold flex-1">{magazine.name}</h1>
              {magazine.curation_type === 'auto' && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Auto-Curated
                </Badge>
              )}
            </div>
            <p className="text-xl text-gray-600">{magazine.tagline}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isSubscribed ? "outline" : "default"}
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Heart className={`w-4 h-4 mr-2 ${isSubscribed ? 'fill-current' : ''}`} />
              )}
              {isSubscribed ? 'Following' : 'Follow'}
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {isOwner && (
              <Link to={`/magazines/${magazine.id}/settings`}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Description */}
        {magazine.description && (
          <p className="text-gray-700 text-lg">{magazine.description}</p>
        )}

        {/* Topics */}
        {magazine.topics && magazine.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {magazine.topics.map((topic) => (
              <Link key={topic.id} to={`/topics/${topic.slug}`}>
                <Badge variant="secondary" className="hover:bg-indigo-100">
                  {topic.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Engagement Actions */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t">
          <LikeButton
            contentType="magazine"
            contentId={magazine.id}
            userId={profile?.id}
            initialLikesCount={0}
            initialIsLiked={false}
          />
          <FavoriteButton
            contentType="magazine"
            contentId={magazine.id}
            userId={profile?.id}
            initialIsFavorited={false}
            initialCollections={[]}
          />
          <ShareInviteButton
            entityType="magazine"
            entityId={magazine.id}
            entityName={magazine.name}
          />
          <RatingWidget
            contentType="magazine"
            contentId={magazine.id}
            userId={profile?.id}
            initialRating={null}
            onRatingChange={(newRating) => {
              // Rating changed
            }}
          />
        </div>

        {/* Stats and Meta */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {magazine.blog_count || 0}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                  <FileText className="w-4 h-4" />
                  Blog Posts
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600">
                  {magazine.subscriber_count || 0}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                  <Heart className="w-4 h-4" />
                  Followers
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-700 flex items-center justify-center gap-2">
                  {getVisibilityIcon()}
                  {getVisibilityLabel()}
                </div>
                <div className="text-sm text-gray-600 mt-1">Visibility</div>
              </div>
              {magazine.publishing_frequency && (
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-700 flex items-center justify-center gap-2 capitalize">
                    <TrendingUp className="w-5 h-5" />
                    {magazine.publishing_frequency}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Updates</div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  {magazine.curator_avatar && (
                    <AvatarImage src={magazine.curator_avatar} />
                  )}
                  <AvatarFallback>
                    {magazine.curator_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">{magazine.curator_name}</div>
                  <div className="text-xs text-gray-500">Curator</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Last updated {formatDistanceToNow(new Date(magazine.updated_at), { addSuffix: true })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="blogs">
            Blogs ({blogs.length})
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="manage">
              Manage
            </TabsTrigger>
          )}
        </TabsList>

        {/* Blogs Tab */}
        <TabsContent value="blogs" className="space-y-6 mt-6">
          {isOwner && (
            <div className="flex justify-end">
              <Link to={`/magazines/${magazine.id}/add-blogs`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Blogs
                </Button>
              </Link>
            </div>
          )}

          {blogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Blogs Yet</h3>
                <p className="text-gray-600 mb-6">
                  {isOwner 
                    ? 'Start building your magazine by adding blog posts'
                    : 'This magazine doesn\'t have any blog posts yet'}
                </p>
                {isOwner && (
                  <Link to={`/magazines/${magazine.id}/add-blogs`}>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Blog
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manage Tab (Owner Only) */}
        {isOwner && (
          <TabsContent value="manage" className="space-y-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4">
                  Magazine management features coming soon...
                </p>
                <div className="space-y-2">
                  <Link to={`/magazines/${magazine.id}/settings`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Magazine Settings
                    </Button>
                  </Link>
                  <Link to={`/magazines/${magazine.id}/add-blogs`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Add/Remove Blogs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}