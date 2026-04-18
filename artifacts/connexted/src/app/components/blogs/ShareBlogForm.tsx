import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { ExternalLink, AlertCircle, Loader2, ArrowLeft, PenTool } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function ShareBlogForm() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    external_url: '',
    title: '',
    tagline: '',
    blog_summary: '',
    published_date: '',
    reading_time_minutes: '',
    featured_image_url: '',
    visibility: 'public' as 'public' | 'member' | 'unlisted' | 'private',
  });

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'external_url') setUrlError('');
  };

  const validateUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
  };

  const extractDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return null; }
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'published') => {
    e.preventDefault();

    if (!profile) { toast.error('You must be logged in to share a blog'); return; }

    if (!validateUrl(formData.external_url)) {
      setUrlError('Please enter a valid URL (including http:// or https://)');
      return;
    }
    if (formData.tagline.length < 10 || formData.tagline.length > 150) {
      toast.error('Tagline must be between 10 and 150 characters');
      return;
    }
    if (formData.blog_summary.length < 100) {
      toast.error('Blog summary must be at least 100 characters');
      return;
    }
    const wordCount = formData.blog_summary.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 500) {
      toast.error('Blog summary must be 500 words or fewer');
      return;
    }
    if (selectedTopicIds.length === 0) {
      toast.error('Please select at least one topic');
      return;
    }

    setLoading(true);
    try {
      const domain = extractDomain(formData.external_url);

      const { data: blog, error: blogError } = await supabase
        .from('blogs')
        .insert({
          user_id: profile.id,
          external_url: formData.external_url,
          domain,
          title: formData.title,
          tagline: formData.tagline,
          blog_summary: formData.blog_summary,
          published_date: formData.published_date || null,
          reading_time_minutes: formData.reading_time_minutes ? parseInt(formData.reading_time_minutes) : null,
          featured_image_url: formData.featured_image_url || null,
          visibility: formData.visibility,
          tags,
          status,
        })
        .select()
        .single();

      if (blogError) {
        if (blogError.code === '23505') {
          setUrlError('This blog URL has already been shared');
          throw new Error('Duplicate blog URL');
        }
        throw blogError;
      }

      if (selectedTopicIds.length > 0) {
        const { error: topicError } = await supabase
          .from('topic_links')
          .insert(selectedTopicIds.map(topicId => ({
            topic_id: topicId,
            entity_type: 'blog',
            entity_id: blog.id,
            added_by: profile.id,
          })));
        if (topicError) throw topicError;
      }

      toast.success(status === 'published' ? 'Blog published!' : 'Blog saved as draft');
      navigate(status === 'published' ? `/blogs/${blog.id}` : '/blogs');
    } catch (error: any) {
      console.error('Error sharing blog:', error);
      if (error.message !== 'Duplicate blog URL') {
        toast.error(error.message || 'Failed to share blog');
      }
    } finally {
      setLoading(false);
    }
  };

  const wordCount = formData.blog_summary.trim().split(/\s+/).filter(w => w.length > 0).length;
  const summaryCharCount = formData.blog_summary.length;
  const charCount = formData.tagline.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Blogs', href: '/blogs' },
        { label: 'Share Article' },
      ]} />

      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/blogs">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blogs
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-pink-100 rounded-lg">
            <PenTool className="w-6 h-6 text-pink-600" />
          </div>
          <h1 className="text-3xl font-bold">Share a Blog Post</h1>
        </div>
        <p className="text-gray-600">
          Share an external blog post (Medium, Substack, personal blog, etc.) with the community
        </p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'published')} className="space-y-6">

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>The URL, title, and one-line pitch for your article</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* External URL */}
            <div className="space-y-2">
              <Label htmlFor="external_url">
                Blog URL <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="external_url"
                  name="external_url"
                  type="url"
                  placeholder="https://medium.com/@you/your-post"
                  value={formData.external_url}
                  onChange={handleChange}
                  required
                  className={urlError ? 'border-red-500' : ''}
                />
                {formData.external_url && validateUrl(formData.external_url) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(formData.external_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {urlError && <p className="text-sm text-red-500">{urlError}</p>}
              <p className="text-xs text-muted-foreground">
                Where your blog is published — Medium, Substack, personal site, etc.
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="How I Built My First SaaS Product in 30 Days"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline">
                Tagline <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tagline"
                name="tagline"
                placeholder="A no-code approach that proved demand before building"
                value={formData.tagline}
                onChange={handleChange}
                required
                maxLength={150}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>One-line pitch shown in blog cards</span>
                <span className={charCount < 10 || charCount > 150 ? 'text-red-500' : ''}>
                  {charCount}/150 {charCount < 10 && '(min 10)'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Blog Summary</CardTitle>
            <CardDescription>
              Write a compelling hook that appears in magazines and search results to attract readers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="blog_summary"
              name="blog_summary"
              placeholder="Write a summary that explains what readers will learn and why they should click through to read the full article..."
              value={formData.blog_summary}
              onChange={handleChange}
              required
              rows={8}
              maxLength={2000}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Min 100 characters · max 500 words</span>
              <span className={summaryCharCount < 100 || wordCount > 500 ? 'text-red-500' : ''}>
                {summaryCharCount} chars{summaryCharCount >= 100 ? ' ✓' : ''} · {wordCount} words{wordCount > 500 ? ' (max 500)' : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Topics & Discovery */}
        <Card>
          <CardHeader>
            <CardTitle>Topics & Discovery</CardTitle>
            <CardDescription>Help the right audience find this article</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Topics <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Select up to 5 topics — your blog will be auto-added to relevant magazines
              </p>
              <TopicSelector
                value={selectedTopicIds}
                onChange={setSelectedTopicIds}
                maxTopics={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <TagSelector
                value={tags}
                onChange={setTags}
                placeholder="Add tags..."
                title={formData.title}
                description={formData.blog_summary}
                maxTags={10}
              />
              <p className="text-xs text-muted-foreground">
                Tags help your blog appear in search and rankings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Publication Details */}
        <Card>
          <CardHeader>
            <CardTitle>Publication Details</CardTitle>
            <CardDescription>Optional metadata shown on the blog card and detail page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="published_date">Published Date</Label>
                <Input
                  id="published_date"
                  name="published_date"
                  type="date"
                  value={formData.published_date}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading_time_minutes">Reading Time (minutes)</Label>
                <Input
                  id="reading_time_minutes"
                  name="reading_time_minutes"
                  type="number"
                  min="1"
                  placeholder="8"
                  value={formData.reading_time_minutes}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured_image_url">Featured Image URL</Label>
              <Input
                id="featured_image_url"
                name="featured_image_url"
                type="url"
                placeholder="https://..."
                value={formData.featured_image_url}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — Anyone can view</SelectItem>
                  <SelectItem value="member">Members Only — Members can view</SelectItem>
                  <SelectItem value="unlisted">Unlisted — Only via shared link</SelectItem>
                  <SelectItem value="private">Private — Only you can view</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Your blog will be auto-added to relevant magazines based on the topics you select.
            Make sure your summary is engaging to attract readers!
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/blogs')}
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedTopicIds.length === 0}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
