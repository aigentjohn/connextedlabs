import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Sparkles, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface FormData {
  link_type: 'ai_prompt' | 'external_url' | 'hosted_content';
  title: string;
  description: string;
  category: string;
  tags: string;
  visibility: 'public' | 'members' | 'private';
  
  // AI Prompt fields
  prompt_text?: string;
  platforms?: {
    chatgpt: boolean;
    claude: boolean;
    gemini: boolean;
    perplexity: boolean;
    grok: boolean;
  };
  
  // External URL fields
  external_url?: string;
  
  // Hosted content fields
  content_title?: string;
  content_slug?: string;
  content_type?: string;
  content_markdown?: string;
}

export default function AdminLinkForm() {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    link_type: 'ai_prompt',
    title: '',
    description: '',
    category: '',
    tags: '',
    visibility: 'public',
    platforms: {
      chatgpt: true,
      claude: true,
      gemini: true,
      perplexity: false,
      grok: false,
    },
  });

  const isEditMode = !!linkId;

  useEffect(() => {
    if (linkId) {
      fetchLink();
    }
  }, [linkId]);

  const fetchLink = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('link_library')
        .select('*')
        .eq('id', linkId)
        .single();

      if (error) throw error;

      setFormData({
        link_type: data.link_type,
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        tags: data.tags?.join(', ') || '',
        visibility: data.visibility || 'public',
        prompt_text: data.prompt_text || '',
        platforms: data.ai_platforms || {
          chatgpt: true,
          claude: true,
          gemini: true,
          perplexity: false,
          grok: false,
        },
        external_url: data.external_url || '',
      });
    } catch (error: any) {
      console.error('Error fetching link:', error);
      toast.error('Failed to load link');
    } finally {
      setLoading(false);
    }
  };

  const generateAIPromptURLs = (promptText: string, platforms: any) => {
    const encoded = encodeURIComponent(promptText);
    const urls: any = {};

    if (platforms.chatgpt) {
      urls.chatgpt = `https://chat.openai.com/?q=${encoded}`;
    }
    if (platforms.claude) {
      urls.claude = `https://claude.ai/new?q=${encoded}`;
    }
    if (platforms.gemini) {
      urls.gemini = `https://gemini.google.com/?q=${encoded}`;
    }
    if (platforms.perplexity) {
      urls.perplexity = `https://www.perplexity.ai/?q=${encoded}`;
    }
    if (platforms.grok) {
      urls.grok = `https://x.ai/grok?q=${encoded}`;
    }

    return urls;
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setLoading(true);

      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (formData.link_type === 'ai_prompt') {
        if (!formData.prompt_text?.trim()) {
          toast.error('Prompt text is required for AI prompts');
          return;
        }

        const generatedURLs = generateAIPromptURLs(formData.prompt_text, formData.platforms);

        const linkData = {
          link_type: 'ai_prompt',
          title: formData.title,
          description: formData.description,
          category: formData.category || null,
          tags: tagsArray,
          visibility: formData.visibility,
          prompt_text: formData.prompt_text,
          ai_platforms: formData.platforms,
          generated_urls: generatedURLs,
          created_by: profile?.id,
        };

        if (isEditMode) {
          const { error } = await supabase
            .from('link_library')
            .update(linkData)
            .eq('id', linkId);

          if (error) throw error;
          toast.success('AI prompt link updated successfully');
        } else {
          const { error } = await supabase
            .from('link_library')
            .insert([linkData]);

          if (error) throw error;
          toast.success('AI prompt link created successfully');
        }

        navigate('/platform-admin/links');

      } else if (formData.link_type === 'external_url') {
        if (!formData.external_url?.trim()) {
          toast.error('URL is required for external links');
          return;
        }

        const linkData = {
          link_type: 'external_url',
          title: formData.title,
          description: formData.description,
          category: formData.category || null,
          tags: tagsArray,
          visibility: formData.visibility,
          external_url: formData.external_url,
          created_by: profile?.id,
        };

        if (isEditMode) {
          const { error } = await supabase
            .from('link_library')
            .update(linkData)
            .eq('id', linkId);

          if (error) throw error;
          toast.success('External URL link updated successfully');
        } else {
          const { error } = await supabase
            .from('link_library')
            .insert([linkData]);

          if (error) throw error;
          toast.success('External URL link created successfully');
        }

        navigate('/platform-admin/links');

      } else if (formData.link_type === 'hosted_content') {
        if (!formData.content_markdown?.trim()) {
          toast.error('Content is required for hosted content');
          return;
        }

        // First, create the content in content_library
        const slug = formData.content_slug || generateSlug(formData.content_title || formData.title);

        const contentData = {
          title: formData.content_title || formData.title,
          slug: slug,
          content_markdown: formData.content_markdown,
          content_html: formData.content_markdown, // In production, convert markdown to HTML
          content_type: formData.content_type || 'article',
          description: formData.description,
          category: formData.category || null,
          tags: tagsArray,
          visibility: formData.visibility,
          created_by: profile?.id,
          published_at: new Date().toISOString(),
        };

        const { data: contentRecord, error: contentError } = await supabase
          .from('content_library')
          .insert([contentData])
          .select()
          .single();

        if (contentError) throw contentError;

        // Then create a link reference to it
        const linkData = {
          link_type: 'hosted_content',
          title: formData.title,
          description: formData.description,
          category: formData.category || null,
          tags: tagsArray,
          visibility: formData.visibility,
          content_id: contentRecord.id,
          created_by: profile?.id,
        };

        const { error: linkError } = await supabase
          .from('link_library')
          .insert([linkData]);

        if (linkError) throw linkError;

        toast.success('Hosted content created successfully');
        navigate('/platform-admin/links');
      }

    } catch (error: any) {
      console.error('Error saving link:', error);
      toast.error(error.message || 'Failed to save link');
    } finally {
      setLoading(false);
    }
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
    <div className="container mx-auto max-w-3xl py-8">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Link Library', href: '/platform-admin/links' },
          { label: isEditMode ? 'Edit Link' : 'Create Link' },
        ]}
      />

      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/platform-admin/links')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Links
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Link' : 'Create New Link'}</CardTitle>
          <CardDescription>
            {isEditMode ? 'Update link information' : 'Add a new link to the library'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Link Type Selector (only for create mode) */}
            {!isEditMode && (
              <div className="space-y-2">
                <Label>Link Type</Label>
                <div className="grid gap-4 md:grid-cols-3">
                  <button
                    type="button"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      formData.link_type === 'ai_prompt'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, link_type: 'ai_prompt' })}
                  >
                    <Sparkles className="size-6" />
                    <div className="text-center">
                      <div className="font-semibold">AI Prompt</div>
                      <div className="text-xs text-muted-foreground">Generate shareable URLs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      formData.link_type === 'external_url'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, link_type: 'external_url' })}
                  >
                    <ExternalLink className="size-6" />
                    <div className="text-center">
                      <div className="font-semibold">External URL</div>
                      <div className="text-xs text-muted-foreground">Link to resource</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      formData.link_type === 'hosted_content'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, link_type: 'hosted_content' })}
                  >
                    <FileText className="size-6" />
                    <div className="text-center">
                      <div className="font-semibold">Hosted Content</div>
                      <div className="text-xs text-muted-foreground">Markdown content</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this link"
                rows={3}
              />
            </div>

            {/* AI Prompt Fields */}
            {formData.link_type === 'ai_prompt' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="prompt_text">Prompt Text *</Label>
                  <Textarea
                    id="prompt_text"
                    value={formData.prompt_text || ''}
                    onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                    placeholder="Enter the prompt text..."
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will be URL-encoded and used to generate shareable AI platform links
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>AI Platforms</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="chatgpt"
                        checked={formData.platforms?.chatgpt}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            platforms: { ...formData.platforms!, chatgpt: checked as boolean },
                          })
                        }
                      />
                      <label htmlFor="chatgpt" className="text-sm font-medium">
                        ChatGPT
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="claude"
                        checked={formData.platforms?.claude}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            platforms: { ...formData.platforms!, claude: checked as boolean },
                          })
                        }
                      />
                      <label htmlFor="claude" className="text-sm font-medium">
                        Claude
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gemini"
                        checked={formData.platforms?.gemini}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            platforms: { ...formData.platforms!, gemini: checked as boolean },
                          })
                        }
                      />
                      <label htmlFor="gemini" className="text-sm font-medium">
                        Gemini
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perplexity"
                        checked={formData.platforms?.perplexity}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            platforms: { ...formData.platforms!, perplexity: checked as boolean },
                          })
                        }
                      />
                      <label htmlFor="perplexity" className="text-sm font-medium">
                        Perplexity
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="grok"
                        checked={formData.platforms?.grok}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            platforms: { ...formData.platforms!, grok: checked as boolean },
                          })
                        }
                      />
                      <label htmlFor="grok" className="text-sm font-medium">
                        Grok (X AI)
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* External URL Fields */}
            {formData.link_type === 'external_url' && (
              <div className="space-y-2">
                <Label htmlFor="external_url">URL *</Label>
                <Input
                  id="external_url"
                  type="url"
                  value={formData.external_url || ''}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://example.com/article"
                  required
                />
              </div>
            )}

            {/* Hosted Content Fields */}
            {formData.link_type === 'hosted_content' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="content_type">Content Type</Label>
                  <Select
                    value={formData.content_type || 'article'}
                    onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="case_study">Case Study</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content_markdown">Content (Markdown) *</Label>
                  <Textarea
                    id="content_markdown"
                    value={formData.content_markdown || ''}
                    onChange={(e) => setFormData({ ...formData, content_markdown: e.target.value })}
                    placeholder="# Your Title&#10;&#10;Your content in markdown..."
                    rows={12}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Write your content in Markdown format. A URL will be generated automatically.
                  </p>
                </div>
              </>
            )}

            {/* Categorization */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job_search">Job Search</SelectItem>
                    <SelectItem value="entrepreneurship">Entrepreneurship</SelectItem>
                    <SelectItem value="innovation">Innovation</SelectItem>
                    <SelectItem value="professional_dev">Professional Development</SelectItem>
                    <SelectItem value="productivity">Productivity</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: any) => setFormData({ ...formData, visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="members">Members Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated tags for organization and search
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 size-4" />
                {loading ? 'Saving...' : isEditMode ? 'Update Link' : 'Create Link'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/platform-admin/links')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}