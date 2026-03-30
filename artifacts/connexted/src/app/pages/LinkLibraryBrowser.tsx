import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router';
import { Link2, Sparkles, ExternalLink, FileText, Search, Filter, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface LinkItem {
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
}

export default function LinkLibraryBrowser() {
  const { profile } = useAuth();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchLinks();
  }, [profile]);

  const fetchLinks = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('link_library')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by visibility based on user auth
      if (!profile) {
        query = query.eq('visibility', 'public');
      } else {
        query = query.in('visibility', ['public', 'members']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      searchQuery === '' ||
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || link.category === categoryFilter;

    const matchesType =
      typeFilter === 'all' || link.link_type === typeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

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
      external_url: { label: 'External', variant: 'secondary' as const },
      hosted_content: { label: 'Article', variant: 'outline' as const },
    };
    const badge = badges[type as keyof typeof badges] || { label: type, variant: 'outline' as const };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Link Library</h1>
        <p className="text-muted-foreground">
          Discover AI prompts, guides, and resources curated by our community
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ai_prompt">AI Prompts</SelectItem>
                <SelectItem value="external_url">External Links</SelectItem>
                <SelectItem value="hosted_content">Articles</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="job_search">Job Search</SelectItem>
                <SelectItem value="entrepreneurship">Entrepreneurship</SelectItem>
                <SelectItem value="innovation">Innovation</SelectItem>
                <SelectItem value="professional_dev">Professional Development</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : filteredLinks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No links found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back soon for new content'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLinks.map((link) => (
            <Card key={link.id} className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getLinkTypeIcon(link.link_type)}
                    {getLinkTypeBadge(link.link_type)}
                  </div>
                  <div className="flex gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3" />
                    <span>{link.view_count}</span>
                  </div>
                </div>
                <CardTitle className="line-clamp-2">{link.title}</CardTitle>
                {link.description && (
                  <CardDescription className="line-clamp-3">{link.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {link.category && (
                    <Badge variant="outline" className="text-xs">
                      {link.category}
                    </Badge>
                  )}
                  {link.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <RouterLink to={`/links/${link.id}`}>
                    <Button className="w-full">
                      View Details
                      <ExternalLink className="ml-2 size-4" />
                    </Button>
                  </RouterLink>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Showing {filteredLinks.length} of {links.length} links
      </div>
    </div>
  );
}
