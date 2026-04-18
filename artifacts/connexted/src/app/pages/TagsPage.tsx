import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Search, Hash, Lightbulb, Wrench, ChevronRight, TrendingUp, Star } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface TagItem {
  id: string;
  tag: string;
  slug: string;
  type: 'what' | 'how' | 'status';
  description: string | null;
  category: string | null;
  usage_count: number;
}

interface GroupedTags {
  what: TagItem[];
  how: TagItem[];
  status: TagItem[];
}

export default function TagsPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState<GroupedTags>({ what: [], how: [], status: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'popular' | 'what' | 'how'>('popular');
  const [followedTags, setFollowedTags] = useState<Set<string>>(new Set());
  const [togglingTag, setTogglingTag] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (profile) fetchFollowedTags();
  }, [profile?.id]);

  const fetchFollowedTags = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('tag_followers')
      .select('tag')
      .eq('user_id', profile.id);
    setFollowedTags(new Set((data || []).map((r: any) => r.tag.toLowerCase())));
  };

  const toggleFollow = async (e: React.MouseEvent, tagText: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile) { toast.error('Sign in to follow tags'); return; }
    const normalized = tagText.toLowerCase();
    setTogglingTag(normalized);
    try {
      if (followedTags.has(normalized)) {
        await supabase.from('tag_followers').delete()
          .eq('user_id', profile.id).eq('tag', normalized);
        setFollowedTags(prev => { const n = new Set(prev); n.delete(normalized); return n; });
        toast.success(`Unfollowed #${tagText}`);
      } else {
        await supabase.from('tag_followers').insert({ user_id: profile.id, tag: normalized });
        setFollowedTags(prev => new Set([...prev, normalized]));
        toast.success(`Following #${tagText}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update follow');
    } finally {
      setTogglingTag(null);
    }
  };

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions/grouped`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setTags(data.grouped);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load tags';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTags = (tagList: TagItem[]) => {
    if (!searchQuery) return tagList;
    const q = searchQuery.toLowerCase();
    return tagList.filter(
      (t) =>
        t.tag.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  };

  const allTags = [...tags.what, ...tags.how, ...(tags.status || [])];
  const popularTags = [...allTags].sort((a, b) => b.usage_count - a.usage_count).slice(0, 30);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'what':
        return 'WHAT';
      case 'how':
        return 'HOW';
      default:
        return type.toUpperCase();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'what':
        return { border: '#8B5CF6', text: '#8B5CF6', bg: '#8B5CF615' };
      case 'how':
        return { border: '#0EA5E9', text: '#0EA5E9', bg: '#0EA5E915' };
      default:
        return { border: '#6B7280', text: '#6B7280', bg: '#6B728015' };
    }
  };

  const renderTagCard = (tag: TagItem) => {
    const colors = getTypeColor(tag.type);
    const normalized = tag.tag.toLowerCase();
    const isFollowed = followedTags.has(normalized);
    const isToggling = togglingTag === normalized;

    return (
      <div key={tag.id} className="relative group">
        <Link to={`/tags/${encodeURIComponent(tag.tag)}`} className="block">
          <Card className="h-full transition-all hover:shadow-md hover:border-blue-300">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg border-2"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                >
                  <Hash className="w-6 h-6" style={{ color: colors.text }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                      {tag.tag}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {profile && (
                        <button
                          onClick={(e) => toggleFollow(e, tag.tag)}
                          disabled={isToggling}
                          className={`p-1 rounded-full transition-colors ${
                            isFollowed
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                          title={isFollowed ? 'Unfollow tag' : 'Follow tag'}
                        >
                          <Star className={`w-4 h-4 ${isFollowed ? 'fill-current' : ''}`} />
                        </button>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                  {tag.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tag.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs" style={{ borderColor: colors.border, color: colors.text }}>
                      {getTypeLabel(tag.type)}
                    </Badge>
                    {tag.category && (
                      <span className="text-xs text-gray-500 capitalize">{tag.category}</span>
                    )}
                    {tag.usage_count > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {tag.usage_count} uses
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading tags...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumbs items={[{ label: 'Tags', path: '/tags' }]} />
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900">Unable to Load Tags</h2>
              <p className="text-gray-600 max-w-md mx-auto">{error}</p>
              <button
                onClick={fetchTags}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allTags.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumbs items={[{ label: 'Tags', path: '/tags' }]} />
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">🏷️</div>
              <h2 className="text-2xl font-bold text-gray-900">No Tags Yet</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Tags will appear here as content is created and tagged across the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Tags', path: '/tags' }]} />

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Tags</h1>
          <p className="text-gray-600 mt-2">
            Find content by <strong>WHAT</strong> it covers and <strong>HOW</strong> it's delivered
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="popular" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Popular
          </TabsTrigger>
          <TabsTrigger value="what" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            WHAT ({tags.what.length})
          </TabsTrigger>
          <TabsTrigger value="how" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            HOW ({tags.how.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Popular Tags</h2>
            <p className="text-sm text-gray-600 mb-6">
              Most-used tags across the platform
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTags(popularTags).map((tag) => renderTagCard(tag))}
          </div>
          {getFilteredTags(popularTags).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No tags match your search
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="what" className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              WHAT Tags (Subject Matter)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Tags that describe what the content is about
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTags(tags.what).map((tag) => renderTagCard(tag))}
          </div>
          {getFilteredTags(tags.what).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No subject tags found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="how" className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-sky-600" />
              HOW Tags (Format & Method)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Tags that describe the format or delivery method
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTags(tags.how).map((tag) => renderTagCard(tag))}
          </div>
          {getFilteredTags(tags.how).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No format tags found
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
