import { useState,useEffect } from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ExternalLink, Copy, Eye, TrendingUp, Calendar, Tag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';

interface LinkDetail {
  id: string;
  link_type: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  view_count: number;
  click_count: number;
  created_at: string;
  
  // AI Prompt fields
  prompt_text?: string;
  ai_platforms?: any;
  generated_urls?: any;
  
  // External URL fields
  external_url?: string;
  
  // Hosted content fields
  content_id?: string;
}

export default function LinkDetailPage() {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [link, setLink] = useState<LinkDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

      // Check visibility
      if (data.visibility === 'private' && data.created_by !== profile?.id) {
        toast.error('This link is private');
        navigate('/links');
        return;
      }

      if (data.visibility === 'members' && !profile) {
        toast.error('Sign in to view member-only links');
        navigate('/links');
        return;
      }

      setLink(data);

      // Increment view count
      await supabase.rpc('increment_link_view_count', { link_id: linkId });

    } catch (error: any) {
      console.error('Error fetching link:', error);
      toast.error('Failed to load link');
      navigate('/links');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (link?.prompt_text) {
      navigator.clipboard.writeText(link.prompt_text);
      toast.success('Prompt copied to clipboard');
    }
  };

  const handleOpenAI = async (platform: string, url: string) => {
    // Increment click count
    await supabase.rpc('increment_link_click_count', { link_id: linkId });

    // Open in new tab
    window.open(url, '_blank');
  };

  const handleOpenExternal = async () => {
    if (link?.external_url) {
      // Increment click count
      await supabase.rpc('increment_link_click_count', { link_id: linkId });

      // Open in new tab
      window.open(link.external_url, '_blank');
    }
  };

  const handleViewContent = () => {
    if (link?.content_id) {
      navigate(`/content/${link.content_id}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Link not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/links')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Library
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-4 flex items-start justify-between">
            <div className="flex gap-2">
              <Badge>
                {link.link_type === 'ai_prompt' && 'AI Prompt'}
                {link.link_type === 'external_url' && 'External Resource'}
                {link.link_type === 'hosted_content' && 'Article'}
              </Badge>
              {link.category && <Badge variant="outline">{link.category}</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="size-4" />
                <span>{link.view_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-4" />
                <span>{link.click_count}</span>
              </div>
            </div>
          </div>

          <CardTitle className="text-3xl">{link.title}</CardTitle>
          {link.description && <CardDescription className="text-base">{link.description}</CardDescription>}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* AI Prompt Type */}
          {link.link_type === 'ai_prompt' && link.prompt_text && (
            <>
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Sparkles className="size-5" />
                  Prompt
                </h3>
                <div className="rounded-lg bg-muted p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm">{link.prompt_text}</pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleCopyPrompt}
                >
                  <Copy className="mr-2 size-4" />
                  Copy Prompt
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 font-semibold">Try in AI Platform</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {link.generated_urls?.chatgpt && (
                    <Button
                      onClick={() => handleOpenAI('ChatGPT', link.generated_urls.chatgpt)}
                      className="justify-start"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open in ChatGPT
                    </Button>
                  )}
                  {link.generated_urls?.claude && (
                    <Button
                      onClick={() => handleOpenAI('Claude', link.generated_urls.claude)}
                      className="justify-start"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open in Claude
                    </Button>
                  )}
                  {link.generated_urls?.gemini && (
                    <Button
                      onClick={() => handleOpenAI('Gemini', link.generated_urls.gemini)}
                      className="justify-start"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open in Gemini
                    </Button>
                  )}
                  {link.generated_urls?.perplexity && (
                    <Button
                      onClick={() => handleOpenAI('Perplexity', link.generated_urls.perplexity)}
                      className="justify-start"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open in Perplexity
                    </Button>
                  )}
                  {link.generated_urls?.grok && (
                    <Button
                      onClick={() => handleOpenAI('Grok', link.generated_urls.grok)}
                      className="justify-start"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open in Grok
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* External URL Type */}
          {link.link_type === 'external_url' && link.external_url && (
            <div>
              <h3 className="mb-4 font-semibold">Resource</h3>
              <div className="rounded-lg border p-4">
                <p className="mb-2 truncate text-sm text-muted-foreground">{link.external_url}</p>
                <Button onClick={handleOpenExternal}>
                  <ExternalLink className="mr-2 size-4" />
                  Visit Resource
                </Button>
              </div>
            </div>
          )}

          {/* Hosted Content Type */}
          {link.link_type === 'hosted_content' && link.content_id && (
            <div>
              <h3 className="mb-4 font-semibold">Content</h3>
              <Button onClick={handleViewContent}>
                <ExternalLink className="mr-2 size-4" />
                Read Full Article
              </Button>
            </div>
          )}

          {/* Tags */}
          {link.tags && link.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Tag className="size-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {link.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <span>Added {new Date(link.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
