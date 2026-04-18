import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import {
  ExternalLink, Eye, MousePointerClick, Calendar, Clock, Tag,
  FileText, AlertCircle, Loader2, Maximize2, Minimize2,
  Newspaper, Save, Trash2, Globe, Lock, Users, MessageSquare,
  Heart, Share2, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// ── Embed utilities ──────────────────────────────────────────────────────────

const KNOWN_BLOCKED_DOMAINS = [
  'medium.com', 'towardsdatascience.com', 'betterprogramming.pub',
  'levelup.gitconnected.com', 'javascript.plainenglish.io',
];

const getBlogEmbedUrl = (url: string): { embedUrl: string | null; knownBlocked: boolean } => {
  if (!url) return { embedUrl: null, knownBlocked: false };
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace('www.', '');
    if (KNOWN_BLOCKED_DOMAINS.some(d => host === d || host.endsWith('.' + d)))
      return { embedUrl: null, knownBlocked: true };
    if (host.includes('substack.com')) return { embedUrl: url, knownBlocked: false };
    if (host === 'dev.to') return { embedUrl: url, knownBlocked: false };
    if (host.includes('hashnode.dev') || host.includes('hashnode.com')) return { embedUrl: url, knownBlocked: false };
    if (host.includes('notion.so')) return { embedUrl: null, knownBlocked: true };
    if (host.includes('notion.site')) return { embedUrl: url, knownBlocked: false };
    return { embedUrl: url, knownBlocked: false };
  } catch {
    return { embedUrl: null, knownBlocked: false };
  }
};

// ── Component ────────────────────────────────────────────────────────────────

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Data state ──
  const [blog, setBlog] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [magazines, setMagazines] = useState<any[]>([]);
  const [userLike, setUserLike] = useState<any>(null);
  const [userFavorite, setUserFavorite] = useState<any>(null);
  const [userRating, setUserRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ── Reader state ──
  const [showInline, setShowInline] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // ── Manage tab form state ──
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [summary, setSummary] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [readingTime, setReadingTime] = useState<number | ''>('');
  const [visibility, setVisibility] = useState('public');
  const [isPublished, setIsPublished] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchBlogData();
  }, [id, profile]);

  const fetchBlogData = async () => {
    try {
      setLoading(true);

      // Fetch blog with author
      const { data: blogData, error: blogError } = await supabase
        .from('blogs')
        .select('*, author:users!blogs_user_id_fkey(id, name, avatar, tagline)')
        .eq('id', id)
        .single();

      if (blogError) throw blogError;
      setBlog(blogData);
      setAuthor(blogData.author);

      // Populate manage form state
      setTitle(blogData.title || '');
      setTagline(blogData.tagline || '');
      setSummary(blogData.blog_summary || '');
      setExternalUrl(blogData.external_url || '');
      setCoverImageUrl(blogData.cover_image_url || '');
      setFeaturedImageUrl(blogData.featured_image_url || '');
      setPublishedDate(blogData.published_date ? blogData.published_date.slice(0, 10) : '');
      setReadingTime(blogData.reading_time_minutes || '');
      setVisibility(blogData.visibility || 'public');
      setIsPublished(blogData.is_published ?? true);
      setAllowComments(blogData.allow_comments ?? true);
      setAllowReactions(blogData.allow_reactions ?? true);
      setAllowSharing(blogData.allow_sharing ?? true);
      setTags(blogData.tags || []);

      // Increment view count
      await supabase.from('blogs').update({ view_count: (blogData.view_count || 0) + 1 }).eq('id', id);

      // Fetch topics
      const { data: topicLinksData } = await supabase
        .from('topic_links')
        .select('topics(*)')
        .eq('entity_type', 'blog')
        .eq('entity_id', id);

      if (topicLinksData) {
        const topicsArray = topicLinksData.map((l: any) => l.topics).filter(Boolean);
        setTopics(topicsArray);
        setSelectedTopicIds(topicsArray.map((t: any) => t.id));
      }

      // Fetch magazines this blog appears in
      const { data: magazineItemsData } = await supabase
        .from('magazine_items')
        .select('magazine_id, magazines(id, name, slug, tagline, cover_image_url, curator_id)')
        .eq('blog_id', id);

      if (magazineItemsData) {
        const mags = magazineItemsData.map((mi: any) => mi.magazines).filter(Boolean);
        setMagazines(mags);
      }

      // Engagement state (only if logged in)
      if (profile) {
        const [likeRes, favRes, ratingRes] = await Promise.allSettled([
          supabase.from('content_likes').select('id').eq('content_type', 'blog').eq('content_id', id).eq('user_id', profile.id).maybeSingle(),
          supabase.from('content_favorites').select('*').eq('content_type', 'blog').eq('content_id', id).eq('user_id', profile.id).maybeSingle(),
          supabase.from('content_ratings').select('*').eq('content_type', 'blog').eq('content_id', id).eq('user_id', profile.id).maybeSingle(),
        ]);
        if (likeRes.status === 'fulfilled') setUserLike(likeRes.value.data);
        if (favRes.status === 'fulfilled') setUserFavorite(favRes.value.data);
        if (ratingRes.status === 'fulfilled') setUserRating(ratingRes.value.data);
      }
    } catch (error: any) {
      console.error('Error fetching blog:', error);
      toast.error('Failed to load blog');
    } finally {
      setLoading(false);
    }
  };

  const handleClickThrough = async () => {
    if (!blog) return;
    try {
      await supabase.from('blog_clicks').insert({ blog_id: blog.id, user_id: profile?.id || null, source: 'blog_detail' });
    } catch {}
    window.open(blog.external_url, '_blank');
  };

  const handleSave = async () => {
    if (!blog) return;
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!externalUrl.trim()) { toast.error('Blog URL is required'); return; }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('blogs')
        .update({
          title: title.trim(),
          tagline: tagline.trim(),
          blog_summary: summary.trim(),
          external_url: externalUrl.trim(),
          domain: (() => { try { return new URL(externalUrl).hostname.replace('www.', ''); } catch { return null; } })(),
          cover_image_url: coverImageUrl.trim() || null,
          featured_image_url: featuredImageUrl.trim() || null,
          published_date: publishedDate || null,
          reading_time_minutes: readingTime || null,
          visibility,
          is_published: isPublished,
          allow_comments: allowComments,
          allow_reactions: allowReactions,
          allow_sharing: allowSharing,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', blog.id);

      if (error) throw error;

      // Save topics via topic_links
      await supabase.from('topic_links').delete().eq('entity_type', 'blog').eq('entity_id', blog.id);
      if (selectedTopicIds.length > 0) {
        await supabase.from('topic_links').insert(
          selectedTopicIds.map(topicId => ({ topic_id: topicId, entity_type: 'blog', entity_id: blog.id, added_by: profile?.id }))
        );
      }

      toast.success('Blog updated successfully');
      fetchBlogData();
    } catch (error: any) {
      console.error('Error updating blog:', error);
      toast.error('Failed to update blog');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!blog) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('blogs').update({ deleted_at: new Date().toISOString() }).eq('id', blog.id);
      if (error) throw error;
      toast.success('Blog deleted');
      navigate('/blogs');
    } catch (error: any) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog');
      setDeleting(false);
    }
  };

  // ── Loading / not found ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Blog not found</h2>
        <Button onClick={() => navigate('/blogs')}>Browse Blogs</Button>
      </div>
    );
  }

  const isOwner = profile?.id === blog.user_id;
  const { embedUrl, knownBlocked } = getBlogEmbedUrl(blog.external_url);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        <Breadcrumbs items={[{ label: 'Blogs', href: '/blogs' }, { label: blog.title }]} />

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{blog.title}</h1>
          {blog.tagline && <p className="text-lg text-muted-foreground font-medium">{blog.tagline}</p>}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {author && (
              <Link to={`/users/${author.id}`} className="flex items-center gap-2 hover:text-primary">
                {author.avatar
                  ? <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full" />
                  : <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">{author.name.charAt(0)}</div>}
                <span className="font-medium">{author.name}</span>
              </Link>
            )}
            {blog.published_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDistanceToNow(new Date(blog.published_date), { addSuffix: true })}</span>
              </div>
            )}
            {blog.reading_time_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{blog.reading_time_minutes} min read</span>
              </div>
            )}
            {blog.domain && (
              <div className="flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{blog.domain}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="gap-1">
                  <Tag className="w-3 h-3" />{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="about">
          <TabsList>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
            <TabsTrigger value="in-magazines">
              In Magazines {magazines.length > 0 && `(${magazines.length})`}
            </TabsTrigger>
            {isOwner && <TabsTrigger value="manage"><Settings className="w-3.5 h-3.5 mr-1" />Manage</TabsTrigger>}
          </TabsList>

          {/* ── About tab ─────────────────────────────────────────────── */}
          <TabsContent value="about" className="space-y-6 mt-6">

            {/* Engagement bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
              <LikeButton
                contentType="blog" contentId={blog.id} userId={profile?.id}
                initialLikesCount={blog.likes_count || 0} initialIsLiked={!!userLike}
                onLikeChange={fetchBlogData}
              />
              <FavoriteButton
                contentType="blog" contentId={blog.id} userId={profile?.id}
                initialIsFavorited={!!userFavorite} initialCollections={userFavorite?.collections || []}
                onFavoriteChange={fetchBlogData}
              />
              <ShareInviteButton entityType="blog" entityId={blog.id} entityName={blog.title} />
              <RatingWidget
                contentType="blog" contentId={blog.id} userId={profile?.id}
                initialRating={userRating?.rating || 0} initialReview={userRating?.review_text || ''}
                avgRating={blog.avg_rating || 0} ratingsCount={blog.ratings_count || 0}
                onRatingSubmit={fetchBlogData}
              />
              {!isOwner && blog.user_id && (
                <PrivateCommentDialog
                  containerType="blog" containerId={blog.id} containerTitle={blog.title}
                  recipientId={blog.user_id} recipientName={author?.name || 'the author'}
                />
              )}
              <Button variant="outline" size="sm" onClick={handleClickThrough} className="ml-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                Read on {blog.domain || 'original site'}
              </Button>
            </div>

            {/* Featured Image */}
            {blog.featured_image_url && (
              <div className="w-full rounded-lg overflow-hidden">
                <img src={blog.featured_image_url} alt={blog.title} className="w-full h-auto" />
              </div>
            )}

            {/* Summary */}
            {blog.blog_summary && (
              <Card>
                <CardHeader><CardTitle>About This Article</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{blog.blog_summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Topics */}
            {topics.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Topics</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic: any) => (
                      <Link key={topic.id} to={`/browse?topic=${topic.slug}`}>
                        <Badge variant="secondary" className="hover:bg-indigo-100 cursor-pointer">
                          {topic.icon && <span className="mr-1">{topic.icon}</span>}
                          {topic.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardHeader><CardTitle>Engagement</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{blog.view_count || 0}</div>
                      <div className="text-sm text-muted-foreground">Views</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{blog.click_count || 0}</div>
                      <div className="text-sm text-muted-foreground">Click-throughs</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Read tab ──────────────────────────────────────────────── */}
          <TabsContent value="read" className="mt-6 space-y-4">
            {embedUrl && !knownBlocked && showInline && !iframeError ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Reading inline from {blog.domain || 'external site'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} title={expanded ? 'Collapse' : 'Expand'}>
                      {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleClickThrough} title="Open in new tab">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowInline(false)} className="text-muted-foreground">
                      Close
                    </Button>
                  </div>
                </div>
                <div className="relative rounded-lg border overflow-hidden bg-white transition-all duration-300" style={{ height: expanded ? '85vh' : '70vh' }}>
                  {iframeLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <span className="text-sm text-muted-foreground">Loading article...</span>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef} src={embedUrl} className="w-full h-full" title={blog.title}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    onLoad={() => setIframeLoading(false)}
                    onError={() => { setIframeLoading(false); setIframeError(true); }}
                  />
                </div>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {knownBlocked ? (
                      <>
                        <AlertCircle className="h-10 w-10 text-amber-500" />
                        <div>
                          <p className="font-medium">{blog.domain || 'This site'} doesn't allow inline embedding</p>
                          <p className="text-sm text-muted-foreground mt-1">Platforms like Medium block iframe embedding. Read the full article in a new tab.</p>
                        </div>
                      </>
                    ) : iframeError ? (
                      <>
                        <AlertCircle className="h-10 w-10 text-amber-500" />
                        <div>
                          <p className="font-medium">Couldn't load the article inline</p>
                          <p className="text-sm text-muted-foreground mt-1">The site may block embedding. Read it in a new tab instead.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <FileText className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Inline reader closed</p>
                      </>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button onClick={handleClickThrough} size="lg">
                        <ExternalLink className="h-4 w-4 mr-2" />Read Full Article
                      </Button>
                      {!showInline && embedUrl && !knownBlocked && !iframeError && (
                        <Button variant="outline" onClick={() => { setShowInline(true); setIframeLoading(true); setIframeError(false); }}>
                          <FileText className="h-4 w-4 mr-2" />Read Inline
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── In Magazines tab ──────────────────────────────────────── */}
          <TabsContent value="in-magazines" className="mt-6">
            {magazines.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Newspaper className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">This blog hasn't been added to any magazines yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {magazines.map((mag: any) => (
                  <Link key={mag.id} to={`/magazines/${mag.id}`}>
                    <Card className="hover:shadow-md transition-shadow h-full">
                      <CardContent className="p-4 flex gap-4">
                        {mag.cover_image_url
                          ? <img src={mag.cover_image_url} alt={mag.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                          : <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0"><Newspaper className="w-6 h-6 text-indigo-500" /></div>
                        }
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-indigo-600">{mag.name}</p>
                          {mag.tagline && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mag.tagline}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Manage tab (owner only) ────────────────────────────────── */}
          {isOwner && (
            <TabsContent value="manage" className="mt-6 space-y-6">

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="m-title">Title *</Label>
                    <Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Blog title" />
                  </div>
                  <div>
                    <Label htmlFor="m-tagline">Tagline</Label>
                    <Input id="m-tagline" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="One-line pitch" maxLength={150} />
                    <p className="text-xs text-gray-500 mt-1">{tagline.length}/150</p>
                  </div>
                  <div>
                    <Label htmlFor="m-summary">Blog Summary</Label>
                    <Textarea id="m-summary" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Summary that appears in magazines and search results..." rows={5} />
                  </div>
                  <div>
                    <Label htmlFor="m-url">Blog URL *</Label>
                    <div className="flex gap-2">
                      <Input id="m-url" type="url" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://..." />
                      {externalUrl && (
                        <Button type="button" variant="outline" size="icon" onClick={() => window.open(externalUrl, '_blank')}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="m-date">Published Date</Label>
                      <Input id="m-date" type="date" value={publishedDate} onChange={e => setPublishedDate(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="m-reading">Reading Time (minutes)</Label>
                      <Input id="m-reading" type="number" min="1" value={readingTime} onChange={e => setReadingTime(e.target.value ? parseInt(e.target.value) : '')} placeholder="8" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="m-cover">Cover Image URL</Label>
                    <Input id="m-cover" type="url" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div>
                    <Label htmlFor="m-featured">Featured Image URL</Label>
                    <Input id="m-featured" type="url" value={featuredImageUrl} onChange={e => setFeaturedImageUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </CardContent>
              </Card>

              {/* Topics & Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Topics & Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Topics</Label>
                    <p className="text-sm text-muted-foreground mb-2">Select topics to help your audience discover this blog</p>
                    <TopicSelector value={selectedTopicIds} onChange={setSelectedTopicIds} maxTopics={5} showSuggestions />
                  </div>
                  <div>
                    <Label>Tags</Label>
                    <p className="text-sm text-muted-foreground mb-2">Add tags for additional discoverability</p>
                    <TagSelector value={tags} onChange={setTags} placeholder="Add tags..." title={title} description={summary} maxTags={10} />
                  </div>
                </CardContent>
              </Card>

              {/* Visibility & Publishing */}
              <Card>
                <CardHeader><CardTitle>Visibility & Publishing</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Visibility</Label>
                    <Select value={visibility} onValueChange={setVisibility}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public"><div className="flex items-center gap-2"><Globe className="w-4 h-4" />Public — Anyone can view</div></SelectItem>
                        <SelectItem value="member"><div className="flex items-center gap-2"><Users className="w-4 h-4" />Members Only</div></SelectItem>
                        <SelectItem value="private"><div className="flex items-center gap-2"><Lock className="w-4 h-4" />Private — Only you and admins</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Published Status</p>
                      <p className="text-sm text-gray-500">{isPublished ? 'Live and visible to others' : 'Hidden as a draft'}</p>
                    </div>
                    <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                  </div>
                </CardContent>
              </Card>

              {/* Social Features */}
              <Card>
                <CardHeader><CardTitle>Social Features</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { id: 'comments', icon: MessageSquare, label: 'Allow Comments', desc: 'Let readers comment on this blog', val: allowComments, set: setAllowComments },
                    { id: 'reactions', icon: Heart, label: 'Allow Reactions', desc: 'Let readers like and react', val: allowReactions, set: setAllowReactions },
                    { id: 'sharing', icon: Share2, label: 'Allow Sharing', desc: 'Let readers share this blog', val: allowSharing, set: setAllowSharing },
                  ].map(({ id: fid, icon: Icon, label, desc, val, set }) => (
                    <div key={fid} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-gray-500">{desc}</p>
                        </div>
                      </div>
                      <Switch checked={val} onCheckedChange={set} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting || saving}>
                      <Trash2 className="w-4 h-4 mr-2" />Delete Blog
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Blog?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove "{blog.title}" from the platform. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete Blog</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button onClick={handleSave} disabled={saving || deleting}>
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
