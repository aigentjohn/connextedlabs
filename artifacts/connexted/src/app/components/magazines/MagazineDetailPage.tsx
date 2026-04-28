import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
import { BlogCard } from '@/app/components/blogs/BlogCard';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import {
  ArrowLeft,
  Heart,
  Settings,
  FileText,
  Loader2,
  Plus,
  Globe,
  Users,
  Lock,
  TrendingUp,
  Sparkles,
  EyeOff,
  Search,
  X,
  Save,
  Trash2,
  MessageSquare,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import ReportContentDialog from '@/app/components/shared/ReportContentDialog';
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
  icon?: string;
  cover_image_url?: string;
  curator_id: string;
  curator_name: string;
  curator_avatar?: string;
  blog_count: number;
  subscriber_count: number;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  curation_type: 'auto' | 'curated' | 'hybrid';
  publishing_frequency?: string;
  is_featured: boolean;
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

  // Blog search / add state (for curated/hybrid magazines, owner only)
  const [showBlogSearch, setShowBlogSearch] = useState(false);
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [blogSearchResults, setBlogSearchResults] = useState<Blog[]>([]);
  const [blogSearchLoading, setBlogSearchLoading] = useState(false);
  const [addedBlogIds, setAddedBlogIds] = useState<Set<string>>(new Set());

  // Manage tab form state
  const [mgmtName, setMgmtName] = useState('');
  const [mgmtTagline, setMgmtTagline] = useState('');
  const [mgmtDescription, setMgmtDescription] = useState('');
  const [mgmtIcon, setMgmtIcon] = useState('');
  const [mgmtCoverImageUrl, setMgmtCoverImageUrl] = useState('');
  const [mgmtSelectedTopicIds, setMgmtSelectedTopicIds] = useState<string[]>([]);
  const [mgmtCurationType, setMgmtCurationType] = useState<'auto' | 'curated' | 'hybrid'>('auto');
  const [mgmtPublishingFrequency, setMgmtPublishingFrequency] = useState('');
  const [mgmtVisibility, setMgmtVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [mgmtSaving, setMgmtSaving] = useState(false);
  const [mgmtArchiving, setMgmtArchiving] = useState(false);

  // Subscribers list
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subscribersLoaded, setSubscribersLoaded] = useState(false);

  const isOwner = profile?.id === magazine?.curator_id;
  const isAdmin = profile?.role === 'super' || profile?.role === 'admin';
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (id) {
      fetchMagazineData();
    }
  }, [id, profile]);

  // Sync manage form state when magazine loads
  useEffect(() => {
    if (magazine) {
      setMgmtName(magazine.name);
      setMgmtTagline(magazine.tagline || '');
      setMgmtDescription(magazine.description || '');
      setMgmtIcon(magazine.icon || '');
      setMgmtCoverImageUrl(magazine.cover_image_url || '');
      setMgmtCurationType(magazine.curation_type || 'auto');
      setMgmtPublishingFrequency(magazine.publishing_frequency || '');
      setMgmtVisibility(magazine.visibility || 'public');
      setMgmtSelectedTopicIds((magazine.topics || []).map((t) => t.id));
    }
  }, [magazine]);

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

      // Fetch curator info
      const { data: curatorData } = await supabase
        .from('users')
        .select('id, name, avatar')
        .eq('id', magazineData.curator_id)
        .single();

      // Fetch magazine topics
      const { data: magazineTopics } = await supabase
        .from('magazine_topics')
        .select('topic_id, topics(id, name, slug, icon)')
        .eq('magazine_id', id);

      const topics = (magazineTopics || [])
        .map((mt: any) => mt.topics)
        .filter(Boolean);

      setMagazine({
        ...magazineData,
        curator_name: curatorData?.name || 'Unknown',
        curator_avatar: curatorData?.avatar,
        topics,
      });

      // Fetch blogs in magazine
      const { data: magazineItems } = await supabase
        .from('magazine_items')
        .select('blog_id, added_at')
        .eq('magazine_id', id)
        .order('added_at', { ascending: false });

      if (magazineItems && magazineItems.length > 0) {
        const blogIds = magazineItems.map((item: any) => item.blog_id);
        setAddedBlogIds(new Set(blogIds));

        const { data: blogsData } = await supabase
          .from('blogs')
          .select('*, users(full_name, avatar)')
          .in('id', blogIds);

        if (blogsData) {
          const blogsWithTopics = await Promise.all(
            blogsData.map(async (blog: any) => {
              const { data: blogTopics } = await supabase
                .from('topic_links')
                .select('topic_id, topics(id, name, slug, icon)')
                .eq('entity_type', 'blog')
                .eq('entity_id', blog.id);

              const blogTopicsList = (blogTopics || [])
                .map((tl: any) => tl.topics)
                .filter(Boolean);

              return {
                ...blog,
                author_name: blog.users?.full_name || 'Unknown',
                author_avatar: blog.users?.avatar,
                topics: blogTopicsList,
              };
            })
          );
          setBlogs(blogsWithTopics);
        }
      }

      // Check subscription
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
        const { error } = await supabase
          .from('magazine_subscribers')
          .delete()
          .eq('magazine_id', id)
          .eq('user_id', profile.id);
        if (error) throw error;
        setIsSubscribed(false);
        setMagazine((prev) =>
          prev ? { ...prev, subscriber_count: Math.max(0, prev.subscriber_count - 1) } : null
        );
        toast.success('Unfollowed magazine');
      } else {
        const { error } = await supabase
          .from('magazine_subscribers')
          .insert({ magazine_id: id, user_id: profile.id });
        if (error) throw error;
        setIsSubscribed(true);
        setMagazine((prev) =>
          prev ? { ...prev, subscriber_count: prev.subscriber_count + 1 } : null
        );
        toast.success('Following magazine');
      }
    } catch (error: any) {
      toast.error('Failed to update subscription');
    } finally {
      setSubscribing(false);
    }
  };

  // Blog search for curating
  const handleBlogSearch = async (query: string) => {
    setBlogSearchQuery(query);
    if (query.length < 2) {
      setBlogSearchResults([]);
      return;
    }
    setBlogSearchLoading(true);
    try {
      const { data } = await supabase
        .from('blogs')
        .select('id, title, tagline, user_id')
        .ilike('title', `%${query}%`)
        .eq('status', 'published')
        .limit(10);
      setBlogSearchResults((data || []).filter((b: any) => !addedBlogIds.has(b.id)));
    } finally {
      setBlogSearchLoading(false);
    }
  };

  const handleAddBlogToMagazine = async (blogId: string) => {
    if (!magazine) return;
    try {
      const { error } = await supabase
        .from('magazine_items')
        .insert({ magazine_id: magazine.id, blog_id: blogId });
      if (error) throw error;
      setAddedBlogIds((prev) => new Set([...prev, blogId]));
      setBlogSearchResults((prev) => prev.filter((b) => b.id !== blogId));
      await fetchMagazineData();
      toast.success('Blog added to magazine');
    } catch (error: any) {
      toast.error('Failed to add blog');
    }
  };

  const handleRemoveBlogFromMagazine = async (blogId: string) => {
    if (!magazine) return;
    try {
      const { error } = await supabase
        .from('magazine_items')
        .delete()
        .eq('magazine_id', magazine.id)
        .eq('blog_id', blogId);
      if (error) throw error;
      setBlogs((prev) => prev.filter((b) => b.id !== blogId));
      setAddedBlogIds((prev) => {
        const next = new Set(prev);
        next.delete(blogId);
        return next;
      });
      toast.success('Blog removed from magazine');
    } catch (error: any) {
      toast.error('Failed to remove blog');
    }
  };

  // Manage tab — save basic info + topics
  const handleSaveBasicInfo = async () => {
    if (!magazine) return;
    if (!mgmtName.trim()) { toast.error('Magazine name is required'); return; }
    if (!mgmtTagline.trim()) { toast.error('Tagline is required'); return; }

    setMgmtSaving(true);
    try {
      const { data, error } = await supabase
        .from('magazines')
        .update({
          name: mgmtName.trim(),
          slug: mgmtName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          tagline: mgmtTagline.trim(),
          description: mgmtDescription.trim(),
          icon: mgmtIcon.trim() || null,
          cover_image_url: mgmtCoverImageUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', magazine.id)
        .select()
        .single();

      if (error) throw error;

      // Save topics to magazine_topics
      await supabase.from('magazine_topics').delete().eq('magazine_id', magazine.id);
      if (mgmtSelectedTopicIds.length > 0) {
        const { error: topicError } = await supabase
          .from('magazine_topics')
          .insert(mgmtSelectedTopicIds.map((topicId) => ({ magazine_id: magazine.id, topic_id: topicId })));
        if (topicError) throw topicError;
      }

      await fetchMagazineData();
      toast.success('Magazine info updated');
    } catch (error: any) {
      toast.error('Failed to save changes');
    } finally {
      setMgmtSaving(false);
    }
  };

  // Manage tab — save curation settings
  const handleSaveCuration = async () => {
    if (!magazine) return;
    setMgmtSaving(true);
    try {
      const { error } = await supabase
        .from('magazines')
        .update({
          curation_type: mgmtCurationType,
          publishing_frequency: mgmtPublishingFrequency || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', magazine.id);
      if (error) throw error;
      setMagazine((prev) =>
        prev ? { ...prev, curation_type: mgmtCurationType, publishing_frequency: mgmtPublishingFrequency } : null
      );
      toast.success('Curation settings saved');
    } catch (error: any) {
      toast.error('Failed to save curation settings');
    } finally {
      setMgmtSaving(false);
    }
  };

  // Manage tab — save visibility
  const handleSaveVisibility = async () => {
    if (!magazine) return;
    setMgmtSaving(true);
    try {
      const { error } = await supabase
        .from('magazines')
        .update({ visibility: mgmtVisibility, updated_at: new Date().toISOString() })
        .eq('id', magazine.id);
      if (error) throw error;
      setMagazine((prev) => prev ? { ...prev, visibility: mgmtVisibility } : null);
      toast.success('Visibility updated');
    } catch (error: any) {
      toast.error('Failed to update visibility');
    } finally {
      setMgmtSaving(false);
    }
  };

  // Manage tab — load subscribers on demand
  const loadSubscribers = async () => {
    if (subscribersLoaded || !magazine) return;
    try {
      const { data, error } = await supabase
        .from('magazine_subscribers')
        .select('user_id, subscribed_at, users(name, email, avatar)')
        .eq('magazine_id', magazine.id)
        .order('subscribed_at', { ascending: false });
      if (error) throw error;
      setSubscribers(data || []);
      setSubscribersLoaded(true);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    }
  };

  // Manage tab — archive magazine
  const handleArchive = async () => {
    if (!magazine) return;
    setMgmtArchiving(true);
    try {
      const { error } = await supabase
        .from('magazines')
        .update({ status: 'archived' })
        .eq('id', magazine.id);
      if (error) throw error;
      toast.success('Magazine archived');
      navigate('/magazines');
    } catch (error: any) {
      toast.error('Failed to archive magazine');
      setMgmtArchiving(false);
    }
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

  const getVisibilityIcon = (v = magazine.visibility) => {
    switch (v) {
      case 'public':   return <Globe className="w-4 h-4" />;
      case 'member':   return <Users className="w-4 h-4" />;
      case 'unlisted': return <EyeOff className="w-4 h-4" />;
      case 'private':  return <Lock className="w-4 h-4" />;
    }
  };

  const getVisibilityLabel = (v = magazine.visibility) => {
    switch (v) {
      case 'public':   return 'Public';
      case 'member':   return 'Members Only';
      case 'unlisted': return 'Unlisted';
      case 'private':  return 'Private';
    }
  };

  const visibilityOptions: Array<{ value: 'public' | 'member' | 'unlisted' | 'private'; label: string; description: string }> = [
    { value: 'public',   label: 'Public',        description: 'Anyone can discover and view this magazine' },
    { value: 'member',   label: 'Members Only',  description: 'Only platform members can view this magazine' },
    { value: 'unlisted', label: 'Unlisted',       description: 'Not listed publicly — only accessible via direct link' },
    { value: 'private',  label: 'Private',        description: 'Only you can view this magazine' },
  ];

  const canCurate = canManage && magazine.curation_type !== 'auto';

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: 'Magazines', href: '/magazines' },
          { label: magazine.name },
        ]}
      />

      {/* Header */}
      <div className="space-y-4">
        <Link to="/magazines">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        {magazine.cover_image_url && (
          <div className="w-full h-64 rounded-lg overflow-hidden">
            <img
              src={magazine.cover_image_url}
              alt={magazine.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <h1 className="text-4xl font-bold flex-1">{magazine.name}</h1>
              {magazine.curation_type === 'auto' && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-4 h-4" />
                  Auto-Curated
                </Badge>
              )}
            </div>
            <p className="text-xl text-gray-600">{magazine.tagline}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={isSubscribed ? 'outline' : 'default'}
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
            <ShareInviteButton
              entityType="magazine"
              entityId={magazine.id}
              entityName={magazine.name}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="blogs">
            Blogs {blogs.length > 0 && `(${blogs.length})`}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="manage">
              <Settings className="w-4 h-4 mr-1.5" />
              Manage
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── About Tab ── */}
        <TabsContent value="about" className="space-y-6 mt-6">
          {/* Engagement Bar */}
          <div className="flex flex-wrap items-center gap-3 py-4 border-b">
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
            <RatingWidget
              contentType="magazine"
              contentId={magazine.id}
              userId={profile?.id}
              initialRating={null}
              onRatingChange={() => {}}
            />
            {!isOwner && magazine.curator_id && (
              <PrivateCommentDialog
                containerType="magazine"
                containerId={magazine.id}
                containerTitle={magazine.name}
                recipientId={magazine.curator_id}
                recipientName={magazine.curator_name || 'the curator'}
              />
            )}
            {!isOwner && (
              <ReportContentDialog
                contentType="magazine"
                contentId={magazine.id}
                contentTitle={magazine.name}
                trigger={
                  <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                    <Flag className="w-4 h-4" />
                  </Button>
                }
              />
            )}
          </div>

          {/* Description */}
          {magazine.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-700 leading-relaxed">{magazine.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Topics */}
          {magazine.topics && magazine.topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {magazine.topics.map((topic) => (
                <Link key={topic.id} to={`/topics/${topic.slug}`}>
                  <Badge variant="secondary" className="hover:bg-indigo-100">
                    {topic.icon && <span className="mr-1">{topic.icon}</span>}
                    {topic.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">{magazine.blog_count || 0}</div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                    <FileText className="w-4 h-4" />
                    Blog Posts
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-600">{magazine.subscriber_count || 0}</div>
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
                    {magazine.curator_avatar && <AvatarImage src={magazine.curator_avatar} />}
                    <AvatarFallback>{magazine.curator_name?.charAt(0) || 'U'}</AvatarFallback>
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
        </TabsContent>

        {/* ── Blogs Tab ── */}
        <TabsContent value="blogs" className="space-y-6 mt-6">
          {/* Curate controls for owner of manual/hybrid magazine */}
          {canCurate && (
            <div className="flex justify-end">
              <Button
                variant={showBlogSearch ? 'outline' : 'default'}
                onClick={() => {
                  setShowBlogSearch(!showBlogSearch);
                  setBlogSearchQuery('');
                  setBlogSearchResults([]);
                }}
              >
                {showBlogSearch ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Blogs
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Blog Search Panel */}
          {canCurate && showBlogSearch && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search & Add Blogs</CardTitle>
                <CardDescription>Search for published blog posts to add to this magazine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by blog title..."
                    value={blogSearchQuery}
                    onChange={(e) => handleBlogSearch(e.target.value)}
                  />
                </div>
                {blogSearchLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}
                {!blogSearchLoading && blogSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {blogSearchResults.map((blog) => (
                      <div
                        key={blog.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-medium text-sm truncate">{blog.title}</p>
                          {blog.tagline && (
                            <p className="text-xs text-gray-500 truncate">{blog.tagline}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddBlogToMagazine(blog.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {!blogSearchLoading && blogSearchQuery.length >= 2 && blogSearchResults.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No matching blogs found (or already added)
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Blog Grid */}
          {blogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Blogs Yet</h3>
                <p className="text-gray-600 mb-4">
                  {canManage
                    ? 'Start building your magazine by adding blog posts'
                    : "This magazine doesn't have any blog posts yet"}
                </p>
                {canCurate && (
                  <Button onClick={() => setShowBlogSearch(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Blog
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <div key={blog.id} className="relative group">
                  <BlogCard blog={blog} />
                  {canCurate && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveBlogFromMagazine(blog.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Manage Tab (owner/admin only) ── */}
        {canManage && (
          <TabsContent value="manage" className="space-y-6 mt-6" onFocus={loadSubscribers}>
            {/* Basic Info + Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Update magazine name, tagline, branding, and topics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mgmt-name">Magazine Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="mgmt-name"
                    value={mgmtName}
                    onChange={(e) => setMgmtName(e.target.value)}
                    placeholder="e.g., Startup Founders Weekly"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mgmt-tagline">Tagline <span className="text-red-500">*</span></Label>
                  <Input
                    id="mgmt-tagline"
                    value={mgmtTagline}
                    onChange={(e) => setMgmtTagline(e.target.value)}
                    placeholder="A short, catchy description"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500">{mgmtTagline.length}/100 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mgmt-description">Description</Label>
                  <Textarea
                    id="mgmt-description"
                    value={mgmtDescription}
                    onChange={(e) => setMgmtDescription(e.target.value)}
                    placeholder="What is this magazine about?"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mgmt-icon">Icon (emoji)</Label>
                    <Input
                      id="mgmt-icon"
                      value={mgmtIcon}
                      onChange={(e) => setMgmtIcon(e.target.value)}
                      placeholder="📰"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mgmt-cover">Cover Image URL</Label>
                    <Input
                      id="mgmt-cover"
                      type="url"
                      value={mgmtCoverImageUrl}
                      onChange={(e) => setMgmtCoverImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Topics</Label>
                  <p className="text-sm text-muted-foreground">
                    Select up to 5 topics to help your target audience discover this magazine
                  </p>
                  <TopicSelector
                    value={mgmtSelectedTopicIds}
                    onChange={setMgmtSelectedTopicIds}
                    maxTopics={5}
                    placeholder="Select topics for this magazine..."
                    showSuggestions={true}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveBasicInfo} disabled={mgmtSaving}>
                    {mgmtSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Curation Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Curation Strategy</CardTitle>
                <CardDescription>Configure how blogs are added to this magazine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Curation Type</Label>
                  <Select value={mgmtCurationType} onValueChange={(v: any) => setMgmtCurationType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div>
                          <div className="font-medium">Auto-Curated</div>
                          <div className="text-sm text-gray-500">Blogs automatically added by topic filters</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="curated">
                        <div>
                          <div className="font-medium">Manual Curation</div>
                          <div className="text-sm text-gray-500">You manually select which blogs to include</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="hybrid">
                        <div>
                          <div className="font-medium">Hybrid</div>
                          <div className="text-sm text-gray-500">Auto-include blogs + manually feature favorites</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Publishing Frequency</Label>
                  <Select value={mgmtPublishingFrequency} onValueChange={setMgmtPublishingFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="continuous">Continuous — always updating</SelectItem>
                      <SelectItem value="daily">Daily — new edition each day</SelectItem>
                      <SelectItem value="weekly">Weekly — new edition each week</SelectItem>
                      <SelectItem value="monthly">Monthly — new edition each month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveCuration} disabled={mgmtSaving}>
                    {mgmtSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Curation
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Visibility */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Visibility
                </CardTitle>
                <CardDescription>Control who can discover and view this magazine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {visibilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMgmtVisibility(option.value)}
                    className={`w-full flex items-center gap-4 p-4 border rounded-lg text-left transition-colors ${
                      mgmtVisibility === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="shrink-0">{getVisibilityIcon(option.value)}</div>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      mgmtVisibility === option.value
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                    }`} />
                  </button>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveVisibility} disabled={mgmtSaving}>
                    {mgmtSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Visibility
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subscribers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Followers ({magazine.subscriber_count || 0})
                </CardTitle>
                <CardDescription>View subscribers to this magazine</CardDescription>
              </CardHeader>
              <CardContent>
                {!subscribersLoaded ? (
                  <Button variant="outline" onClick={loadSubscribers}>
                    Load Followers
                  </Button>
                ) : subscribers.length === 0 ? (
                  <p className="text-gray-500 text-sm">No followers yet</p>
                ) : (
                  <div className="space-y-2">
                    {subscribers.map((sub: any) => (
                      <div key={sub.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{sub.users?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{sub.users?.email}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(sub.subscribed_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-1">Archive this magazine</h4>
                  <p className="text-sm text-gray-700 mb-4">
                    Archiving hides this magazine from public view. All blogs and followers are retained.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={mgmtArchiving}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Archive Magazine
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive "{magazine.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will archive the magazine and hide it from public view.
                          All blogs and followers will remain, but the magazine won't be discoverable.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleArchive}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
