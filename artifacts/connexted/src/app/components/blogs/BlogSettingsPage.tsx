import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import Breadcrumbs from '@/app/components/Breadcrumbs';
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
import {
  Save,
  Trash2,
  ArrowLeft,
  Globe,
  Lock,
  Users,
  MessageSquare,
  Heart,
  Share2,
  Link as LinkIcon,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

export default function BlogSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state - Basic Info
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // Visibility & Publishing
  const [visibility, setVisibility] = useState('public');
  const [isPublished, setIsPublished] = useState(true);

  // Social Features
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);

  // Tags & Discovery
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (profile && id) {
      fetchBlog();
    }
  }, [profile, id]);

  const fetchBlog = async () => {
    try {
      const { data: blogData, error: blogError } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

      if (blogError) throw blogError;

      // Check if user is owner or admin
      const isOwner = blogData.creator_id === profile?.id;
      const isAdmin = profile?.role === 'super' || profile?.role === 'admin';

      if (!isOwner && !isAdmin) {
        toast.error('You do not have permission to edit this blog');
        navigate(`/blogs/${id}`);
        return;
      }

      setBlog(blogData);
      setTitle(blogData.title || '');
      setTagline(blogData.tagline || '');
      setSummary(blogData.summary || '');
      setUrl(blogData.url || '');
      setCoverImageUrl(blogData.cover_image_url || '');
      setVisibility(blogData.visibility || 'public');
      setIsPublished(blogData.is_published ?? true);
      setAllowComments(blogData.allow_comments ?? true);
      setAllowReactions(blogData.allow_reactions ?? true);
      setAllowSharing(blogData.allow_sharing ?? true);
      setTags(blogData.tags?.join(', ') || '');
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Failed to load blog');
      navigate('/blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a blog title');
      return;
    }

    if (!url.trim()) {
      toast.error('Please enter a blog URL');
      return;
    }

    setSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('blogs')
        .update({
          title: title.trim(),
          tagline: tagline.trim(),
          summary: summary.trim(),
          url: url.trim(),
          cover_image_url: coverImageUrl.trim() || null,
          visibility,
          is_published: isPublished,
          allow_comments: allowComments,
          allow_reactions: allowReactions,
          allow_sharing: allowSharing,
          tags: tagsArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Blog updated successfully');
      navigate(`/blogs/${id}`);
    } catch (error) {
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
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('blogs')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', blog.id);

      if (error) throw error;

      toast.success('Blog deleted successfully');
      navigate('/blogs');
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Blog not found</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: 'Blogs', href: '/blogs' },
          { label: blog.title, href: `/blogs/${id}` },
          { label: 'Settings' }
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{blog.title}</h1>
          <p className="text-gray-600 mt-1">Edit blog settings and metadata</p>
        </div>
        <Link to={`/blogs/${id}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update blog title, description, and URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Blog Title*</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter blog title"
              />
            </div>

            <div>
              <Label htmlFor="tagline">Tagline*</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A catchy one-liner about this blog"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">{tagline.length}/100 characters</p>
            </div>

            <div>
              <Label htmlFor="summary">Summary*</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A detailed summary of what readers will learn..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{summary.length}/500 characters</p>
            </div>

            <div>
              <Label htmlFor="url">Blog URL*</Label>
              <div className="flex gap-2">
                <LinkIcon className="w-4 h-4 text-gray-400 mt-3" />
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://medium.com/@you/your-blog-post"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="coverImageUrl">Cover Image URL</Label>
              <Input
                id="coverImageUrl"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility & Publishing */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility & Publishing</CardTitle>
            <CardDescription>Control who can see this blog and when</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Public - Anyone can view</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Members Only - Authenticated users</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Private - Only you and admins</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="isPublished" className="text-base font-medium">
                  Published Status
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  {isPublished ? 'This blog is live and visible to others' : 'This blog is hidden as a draft'}
                </p>
              </div>
              <Switch
                id="isPublished"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Features */}
        <Card>
          <CardHeader>
            <CardTitle>Social Features</CardTitle>
            <CardDescription>Control how readers can interact with this blog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <div>
                  <Label htmlFor="allowComments" className="text-base font-medium">
                    Allow Comments
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Let readers comment on this blog
                  </p>
                </div>
              </div>
              <Switch
                id="allowComments"
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-gray-600" />
                <div>
                  <Label htmlFor="allowReactions" className="text-base font-medium">
                    Allow Reactions
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Let readers react with likes and emojis
                  </p>
                </div>
              </div>
              <Switch
                id="allowReactions"
                checked={allowReactions}
                onCheckedChange={setAllowReactions}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-gray-600" />
                <div>
                  <Label htmlFor="allowSharing" className="text-base font-medium">
                    Allow Sharing
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Let readers share this blog on social media
                  </p>
                </div>
              </div>
              <Switch
                id="allowSharing"
                checked={allowSharing}
                onCheckedChange={setAllowSharing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags & Discovery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Tags & Discovery
            </CardTitle>
            <CardDescription>Add tags to help others discover this blog</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="startup, entrepreneurship, funding, growth"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add relevant tags to make this blog discoverable
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting || saving}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Blog
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Blog?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{blog.title}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Blog
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={saving || deleting}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}