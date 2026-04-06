import { useState,useEffect,useCallback,useRef } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { ExternalLink, Eye, MousePointerClick, Calendar, Clock, User, Edit, Trash2, Tag, Settings, Maximize2, Minimize2, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';

interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
}

interface Blog {
  id: string;
  user_id: string;
  title: string;
  tagline: string;
  blog_summary: string;
  external_url: string;
  domain: string | null;
  published_date: string | null;
  reading_time_minutes: number | null;
  featured_image_url: string | null;
  view_count: number;
  click_count: number;
  status: string;
  created_at: string;
  tags?: string[];
  author?: {
    id: string;
    name: string;
    avatar: string | null;
    tagline: string | null;
  };
  topics?: Topic[];
}

// ──────── Blog embed URL utilities ────────

/** Domains known to block iframe embedding via X-Frame-Options / CSP */
const KNOWN_BLOCKED_DOMAINS = [
  'medium.com',
  'towardsdatascience.com',
  'betterprogramming.pub',
  'levelup.gitconnected.com',
  'javascript.plainenglish.io',
];

/**
 * Returns an embeddable URL if the blog platform supports it,
 * or the raw URL to attempt for platforms we can't be sure about.
 * Returns `null` only for domains we know will always block.
 */
const getBlogEmbedUrl = (url: string): { embedUrl: string | null; knownBlocked: boolean } => {
  if (!url) return { embedUrl: null, knownBlocked: false };
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace('www.', '');

    // Known blocked domains – don't even attempt
    if (KNOWN_BLOCKED_DOMAINS.some(d => host === d || host.endsWith('.' + d))) {
      return { embedUrl: null, knownBlocked: true };
    }

    // Substack – public posts are embeddable as-is
    if (host.includes('substack.com')) {
      return { embedUrl: url, knownBlocked: false };
    }

    // Dev.to – their articles are embeddable
    if (host === 'dev.to') {
      return { embedUrl: url, knownBlocked: false };
    }

    // Hashnode
    if (host.includes('hashnode.dev') || host.includes('hashnode.com')) {
      return { embedUrl: url, knownBlocked: false };
    }

    // Notion – published pages only
    if (host.includes('notion.so')) {
      return { embedUrl: null, knownBlocked: true };
    }
    if (host.includes('notion.site')) {
      return { embedUrl: url, knownBlocked: false };
    }

    // Ghost blogs, WordPress, personal domains – attempt iframe
    return { embedUrl: url, knownBlocked: false };
  } catch {
    return { embedUrl: null, knownBlocked: false };
  }
};

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInline, setShowInline] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (id) {
      fetchBlog();
    }
  }, [id]);

  const fetchBlog = async () => {
    try {
      setLoading(true);

      // Fetch blog
      const { data: blogData, error: blogError } = await supabase
        .from('blogs')
        .select(`
          *,
          author:users!blogs_user_id_fkey(id, name, avatar, tagline)
        `)
        .eq('id', id)
        .single();

      if (blogError) throw blogError;

      // Note: Blogs use TAGS for discovery, not topics
      // Topics are for containers (playlists, magazines)

      setBlog(blogData);

      // Increment view count
      await supabase
        .from('blogs')
        .update({ view_count: (blogData.view_count || 0) + 1 })
        .eq('id', id);

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
      // Track click
      await supabase
        .from('blog_clicks')
        .insert({
          blog_id: blog.id,
          user_id: profile?.id || null,
          source: 'blog_detail',
        });

      // Open in new tab
      window.open(blog.external_url, '_blank');
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still open the link even if tracking fails
      window.open(blog.external_url, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!blog || !confirm('Are you sure you want to delete this blog?')) return;

    try {
      const { error } = await supabase
        .from('blogs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', blog.id);

      if (error) throw error;

      toast.success('Blog deleted');
      navigate('/my-blogs');
    } catch (error: any) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Blog not found</h2>
          <Button onClick={() => navigate('/blogs')}>Browse Blogs</Button>
        </div>
      </div>
    );
  }

  const isOwner = profile?.id === blog.user_id;

  const { embedUrl, knownBlocked } = getBlogEmbedUrl(blog.external_url);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Blogs', href: '/blogs' },
            { label: blog.title },
          ]}
        />

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{blog.title}</h1>
          <p className="text-lg text-muted-foreground font-medium">{blog.tagline}</p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {blog.author && (
              <Link to={`/users/${blog.author.id}`} className="flex items-center gap-2 hover:text-primary">
                {blog.author.avatar ? (
                  <img src={blog.author.avatar} alt={blog.author.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                    {blog.author.name.charAt(0)}
                  </div>
                )}
                <span className="font-medium">{blog.author.name}</span>
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
                  <Tag className="w-3 h-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Owner actions */}
          <div className="flex items-center gap-2">
            <ShareInviteButton
              entityType="blog"
              entityId={blog.id}
              entityName={blog.title}
            />
            {isOwner && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/blogs/${blog.id}/settings`}>
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/blogs/${blog.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Inline Reader ── */}
        {embedUrl && !knownBlocked && showInline && !iframeError ? (
          <div className="space-y-2">
            {/* Reader toolbar */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Reading inline from {blog.domain || 'external site'}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(!expanded)}
                  title={expanded ? 'Collapse reader' : 'Expand reader'}
                >
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleClickThrough} title="Open in new tab">
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowInline(false)}
                  title="Close inline reader"
                  className="text-muted-foreground"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Iframe */}
            <div
              className="relative rounded-lg border border-border overflow-hidden bg-white transition-all duration-300"
              style={{ height: expanded ? '85vh' : '70vh' }}
            >
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <span className="text-sm text-muted-foreground">Loading article...</span>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                title={blog.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => setIframeLoading(false)}
                onError={() => {
                  setIframeLoading(false);
                  setIframeError(true);
                }}
              />
            </div>
          </div>
        ) : (
          /* ── Fallback: can't embed or user closed inline reader ── */
          <Card className="border-dashed">
            <CardContent className="py-8">
              <div className="flex flex-col items-center text-center space-y-3">
                {knownBlocked ? (
                  <>
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                    <div>
                      <p className="font-medium">
                        {blog.domain || 'This site'} doesn't allow inline embedding
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Platforms like Medium block iframe embedding for security reasons.
                        You can read the full article in a new tab.
                      </p>
                    </div>
                  </>
                ) : iframeError ? (
                  <>
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                    <div>
                      <p className="font-medium">Couldn't load the article inline</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The site may block embedding. You can read it in a new tab instead.
                      </p>
                    </div>
                  </>
                ) : !showInline ? (
                  <>
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Inline reader closed</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Read the full article below</p>
                  </>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button onClick={handleClickThrough} size="lg">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Full Article
                  </Button>
                  {!showInline && embedUrl && !knownBlocked && !iframeError && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowInline(true);
                        setIframeLoading(true);
                        setIframeError(false);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Read Inline
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Featured Image */}
        {blog.featured_image_url && (
          <div className="w-full rounded-lg overflow-hidden">
            <img
              src={blog.featured_image_url}
              alt={blog.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>About This Article</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {blog.blog_summary}
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{blog.view_count}</div>
                  <div className="text-sm text-muted-foreground">Views</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{blog.click_count}</div>
                  <div className="text-sm text-muted-foreground">Click-throughs</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}