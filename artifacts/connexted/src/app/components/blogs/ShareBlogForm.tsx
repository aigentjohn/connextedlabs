import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Link } from 'react-router';

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
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear URL error when user edits
    if (name === 'external_url') {
      setUrlError('');
    }
  };

  const validateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const extractDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'published') => {
    e.preventDefault();
    
    if (!profile) {
      toast.error('You must be logged in to share a blog');
      return;
    }

    // Validation
    if (!validateUrl(formData.external_url)) {
      setUrlError('Please enter a valid URL (including http:// or https://)');
      return;
    }

    if (formData.tagline.length < 10 || formData.tagline.length > 150) {
      toast.error('Tagline must be between 10 and 150 characters');
      return;
    }

    const summaryWordCount = formData.blog_summary.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (formData.blog_summary.length < 100) {
      toast.error('Blog summary must be at least 100 characters');
      return;
    }
    if (summaryWordCount > 500) {
      toast.error('Blog summary must be 500 words or fewer');
      return;
    }

    if (selectedTopicIds.length === 0) {
      toast.error('Please select at least one topic');
      return;
    }

    setLoading(true);

    try {
      // Extract domain from URL
      const domain = extractDomain(formData.external_url);

      // Create blog
      const blogPayload = {
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
        status,
      };

      const { data: blog, error: blogError } = await supabase
        .from('blogs')
        .insert(blogPayload)
        .select()
        .single();

      if (blogError) {
        if (blogError.code === '23505') {
          setUrlError('This blog URL has already been shared');
          throw new Error('Duplicate blog URL');
        }
        throw blogError;
      }

      // Link topics
      if (selectedTopicIds.length > 0) {
        const topicLinks = selectedTopicIds.map(topicId => ({
          topic_id: topicId,
          entity_type: 'blog',
          entity_id: blog.id,
          added_by: profile.id,
        }));

        const { error: topicError } = await supabase
          .from('topic_links')
          .insert(topicLinks);

        if (topicError) throw topicError;
      }

      toast.success(status === 'published' ? 'Blog published!' : 'Blog saved as draft');
      navigate('/my-blogs');

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
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Share Your Blog Post</CardTitle>
        <CardDescription>
          Share an external blog post (Medium, Substack, personal blog, etc.) with the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => handleSubmit(e, 'published')} className="space-y-6">
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
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The URL where your blog is published (Medium, Substack, your personal blog, etc.)
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
            <p className="text-xs text-muted-foreground">
              The full title of your blog post
            </p>
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
              <span>One-line pitch that appears in blog cards</span>
              <span className={charCount < 10 || charCount > 150 ? 'text-red-500' : ''}>
                {charCount}/150 chars {charCount < 10 && '(min 10)'}
              </span>
            </div>
          </div>

          {/* Blog Summary */}
          <div className="space-y-2">
            <Label htmlFor="blog_summary">
              Blog Summary <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="blog_summary"
              name="blog_summary"
              placeholder="Write a summary that explains what readers will learn and why they should click. This appears in magazines and search results to attract readers."
              value={formData.blog_summary}
              onChange={handleChange}
              required
              rows={8}
              maxLength={2000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Compelling hook that appears in magazines to attract readers</span>
              <span className={summaryCharCount < 100 || wordCount > 500 ? 'text-red-500' : ''}>
                {summaryCharCount}/100 chars min{summaryCharCount >= 100 ? ' ✓' : ''} · ~{wordCount} words{wordCount > 500 ? ' (max 500)' : ''}
              </span>
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <Label>
              Topics <span className="text-red-500">*</span>
            </Label>
            <TopicSelector
              value={selectedTopicIds}
              onChange={setSelectedTopicIds}
              maxTopics={5}
            />
          </div>

          {/* Optional Fields */}
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
            <Label htmlFor="featured_image_url">Featured Image URL (optional)</Label>
            <Input
              id="featured_image_url"
              name="featured_image_url"
              type="url"
              placeholder="https://..."
              value={formData.featured_image_url}
              onChange={handleChange}
            />
          </div>

          {/* Info Alert */}
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
              onClick={() => navigate('/my-blogs')}
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
      </CardContent>
    </Card>
  );
}