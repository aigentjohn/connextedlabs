// Split candidate: ~426 lines — consider extracting LinkCard, LinkCreateForm, and LinkAnalyticsRow into sub-components.
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Link2, Plus, Edit, Trash2, Eye, ExternalLink, FileText, Sparkles, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface LinkItem {
  id: string;
  link_type: 'ai_prompt' | 'external_url' | 'hosted_content';
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  view_count: number;
  click_count: number;
  created_at: string;
  external_url?: string;
  prompt_text?: string;
  content_id?: string;
}

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content_type: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  view_count: number;
  published_at: string;
  created_at: string;
}

export default function AdminLinkLibrary() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedLink, setSelectedLink] = useState<LinkItem | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'link' | 'content', id: string } | null>(null);

  useEffect(() => {
    if (profile && (profile.role === 'super' || profile.role === 'admin')) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch links
      const { data: linksData, error: linksError } = await supabase
        .from('link_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;
      setLinks(linksData || []);

      // Fetch content
      const { data: contentData, error: contentError } = await supabase
        .from('content_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (contentError) throw contentError;
      setContent(contentData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load link library');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'link') {
        const { error } = await supabase
          .from('link_library')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast.success('Link deleted successfully');
        setLinks(links.filter(l => l.id !== deleteTarget.id));
      } else {
        const { error } = await supabase
          .from('content_library')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast.success('Content deleted successfully');
        setContent(content.filter(c => c.id !== deleteTarget.id));
      }
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete item');
    } finally {
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const getLinkTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_prompt':
        return <Sparkles className="size-4" />;
      case 'external_url':
        return <ExternalLink className="size-4" />;
      case 'hosted_content':
        return <FileText className="size-4" />;
      default:
        return <Link2 className="size-4" />;
    }
  };

  const getLinkTypeBadge = (type: string) => {
    const badges = {
      ai_prompt: { label: 'AI Prompt', variant: 'default' as const },
      external_url: { label: 'External URL', variant: 'secondary' as const },
      hosted_content: { label: 'Hosted Content', variant: 'outline' as const },
    };
    const badge = badges[type as keyof typeof badges] || { label: type, variant: 'outline' as const };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  if (!profile || (profile.role !== 'super' && profile.role !== 'admin')) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Access denied. Platform admin privileges required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Link Library' },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Link Library</h1>
          <p className="text-muted-foreground">
            Manage AI prompts, external resources, and hosted content
          </p>
        </div>
        <Button onClick={() => navigate('/platform-admin/links/create')}>
          <Plus className="mr-2 size-4" />
          Create Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <Link2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{links.length}</div>
            <p className="text-xs text-muted-foreground">All link types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Prompts</CardTitle>
            <Sparkles className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {links.filter(l => l.link_type === 'ai_prompt').length}
            </div>
            <p className="text-xs text-muted-foreground">Shareable prompts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hosted Content</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{content.length}</div>
            <p className="text-xs text-muted-foreground">Markdown content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {links.reduce((sum, l) => sum + (l.view_count || 0), 0) +
               content.reduce((sum, c) => sum + (c.view_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Combined analytics</p>
          </CardContent>
        </Card>
      </div>

      {/* Links List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Link Library</CardTitle>
          <CardDescription>AI prompts, external URLs, and hosted content references</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : links.length === 0 ? (
            <div className="py-8 text-center">
              <Link2 className="mx-auto mb-4 size-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No links yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first link to get started
              </p>
              <Button onClick={() => navigate('/platform-admin/links/create')}>
                <Plus className="mr-2 size-4" />
                Create Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {getLinkTypeIcon(link.link_type)}
                      <h3 className="font-semibold">{link.title}</h3>
                      {getLinkTypeBadge(link.link_type)}
                      <Badge variant="outline">{link.visibility}</Badge>
                    </div>
                    {link.description && (
                      <p className="mb-2 text-sm text-muted-foreground">{link.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{link.view_count} views</span>
                      <span>{link.click_count} clicks</span>
                      {link.category && <span>Category: {link.category}</span>}
                      {link.tags && link.tags.length > 0 && (
                        <span>Tags: {link.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/links/${link.id}`)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/platform-admin/links/${link.id}/edit`)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget({ type: 'link', id: link.id });
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hosted Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Hosted Content</CardTitle>
          <CardDescription>Markdown content with generated URLs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : content.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No hosted content yet. Create a link with hosted content type.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {content.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="size-4" />
                      <h3 className="font-semibold">{item.title}</h3>
                      <Badge>{item.content_type}</Badge>
                      <Badge variant="outline">{item.visibility}</Badge>
                      {item.published_at ? (
                        <Badge variant="secondary">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="mb-2 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{item.view_count} views</span>
                      {item.category && <span>Category: {item.category}</span>}
                      <span>Slug: /{item.slug}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/content/${item.slug}`)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/platform-admin/content/${item.id}/edit`)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget({ type: 'content', id: item.id });
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{' '}
              {deleteTarget?.type === 'link' ? 'link' : 'content'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}