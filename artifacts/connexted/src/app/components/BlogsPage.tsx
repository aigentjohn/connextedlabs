import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, PenTool, Filter, Tag, Users, Heart, X } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { BlogCard } from '@/app/components/blogs/BlogCard';

interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  topic_type?: 'audience' | 'purpose' | 'theme';
}

interface Blog {
  id: string;
  title: string;
  tagline: string;
  blog_summary: string;
  external_url: string;
  domain: string | null;
  published_date: string | null;
  reading_time_minutes: number | null;
  featured_image_url: string | null;
  created_at: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  user_id: string;
  tags: string[] | null;
  user?: {
    name: string;
    avatar: string | null;
  };
  topics?: Topic[];
  likes_count?: number;
  avg_rating?: number;
}

export default function BlogsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'member' | 'unlisted' | 'private'>('all');
  const [filterMyContent, setFilterMyContent] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [blogTopics, setBlogTopics] = useState<Record<string, Topic[]>>({});
  const [engagementMetrics, setEngagementMetrics] = useState<Record<string, { likes_count: number; avg_rating: number }>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Read URL params on mount
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      setSelectedTags([tagParam]);
      setShowFilters(true);
    }
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      setSelectedTopics([topicParam]);
      setShowFilters(true);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
    loadTopics();
  }, []);

  useEffect(() => {
    filterBlogsList();
  }, [blogs, searchQuery, filterVisibility, filterMyContent, selectedTags, selectedTopics, sortBy, engagementMetrics, blogTopics]);

  const loadTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setAvailableTopics(data || []);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const fetchBlogs = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('blogs')
        .select(`
          id, title, tagline, blog_summary, external_url, domain,
          published_date, reading_time_minutes, featured_image_url,
          created_at, visibility, user_id, tags,
          user:users!blogs_user_id_fkey(name, avatar)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setBlogs([]);
          return;
        }
        throw error;
      }

      const blogsData = data || [];
      setBlogs(blogsData);

      // Extract unique tags
      const allTags = new Set<string>();
      blogsData.forEach(b => {
        b.tags?.forEach((tag: string) => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags).sort());

      // Load topic links for all blogs
      if (blogsData.length > 0) {
        const blogIds = blogsData.map(b => b.id);

        const { data: topicLinksData } = await supabase
          .from('topic_links')
          .select('entity_id, topic_id, topics(*)')
          .eq('entity_type', 'blog')
          .in('entity_id', blogIds);

        if (topicLinksData) {
          const topicsMap: Record<string, Topic[]> = {};
          topicLinksData.forEach((link: any) => {
            if (!topicsMap[link.entity_id]) topicsMap[link.entity_id] = [];
            if (link.topics) topicsMap[link.entity_id].push(link.topics);
          });
          setBlogTopics(topicsMap);

          // Enrich blogs with their topics
          setBlogs(prev => prev.map(b => ({ ...b, topics: topicsMap[b.id] || [] })));
        }

        // Load engagement metrics
        const [likesRes, ratingsRes] = await Promise.all([
          supabase
            .from('content_likes')
            .select('content_id')
            .eq('content_type', 'blog')
            .in('content_id', blogIds),
          supabase
            .from('content_ratings')
            .select('content_id, rating')
            .eq('content_type', 'blog')
            .in('content_id', blogIds),
        ]);

        const metricsMap: Record<string, { likes_count: number; avg_rating: number }> = {};
        blogIds.forEach(id => { metricsMap[id] = { likes_count: 0, avg_rating: 0 }; });

        if (likesRes.data) {
          likesRes.data.forEach((like: any) => {
            if (metricsMap[like.content_id]) metricsMap[like.content_id].likes_count++;
          });
        }

        if (ratingsRes.data) {
          const ratingsByBlog: Record<string, number[]> = {};
          ratingsRes.data.forEach((r: any) => {
            if (r.rating) {
              if (!ratingsByBlog[r.content_id]) ratingsByBlog[r.content_id] = [];
              ratingsByBlog[r.content_id].push(r.rating);
            }
          });
          Object.entries(ratingsByBlog).forEach(([blogId, ratings]) => {
            if (ratings.length > 0 && metricsMap[blogId]) {
              metricsMap[blogId].avg_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            }
          });
        }

        setEngagementMetrics(metricsMap);

        // Merge metrics into blog objects so BlogCard can render them
        setBlogs(prev => prev.map(b => ({
          ...b,
          likes_count: metricsMap[b.id]?.likes_count ?? 0,
          avg_rating: metricsMap[b.id]?.avg_rating ?? 0,
        })));
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const filterBlogsList = () => {
    let filtered = [...blogs];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.tagline?.toLowerCase().includes(q) ||
        b.blog_summary?.toLowerCase().includes(q) ||
        b.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(b =>
        selectedTags.every(tag => b.tags?.includes(tag))
      );
    }

    // Topic filter
    if (selectedTopics.length > 0) {
      filtered = filtered.filter(b => {
        const bTopics = blogTopics[b.id] || [];
        return selectedTopics.some(topicId => bTopics.some(t => t.id === topicId));
      });
    }

    // Visibility filter
    if (filterVisibility !== 'all') {
      filtered = filtered.filter(b => b.visibility === filterVisibility);
    }

    // My Blogs filter
    if (filterMyContent && profile) {
      filtered = filtered.filter(b => b.user_id === profile.id);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'most-liked') {
        return (engagementMetrics[b.id]?.likes_count || 0) - (engagementMetrics[a.id]?.likes_count || 0);
      }
      return 0;
    });

    setFilteredBlogs(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId]);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterVisibility('all');
    setFilterMyContent(false);
    setSelectedTags([]);
    setSelectedTopics([]);
  };

  const hasActiveFilters = searchQuery || filterVisibility !== 'all' || filterMyContent || selectedTags.length > 0 || selectedTopics.length > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Blogs', href: '/blogs' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 text-pink-600 p-3 rounded-lg">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Blogs</h1>
            <p className="text-sm text-gray-600">Discover and read curated articles</p>
          </div>
        </div>
        <Button onClick={() => navigate('/blogs/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Share Article
        </Button>
      </div>

      {/* Search + Visibility + Advanced Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="search"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value as any)}
            className="px-4 py-2 border rounded-lg text-sm bg-background"
          >
            <option value="all">All Visibility</option>
            <option value="public">Public</option>
            <option value="member">Members Only</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'border-pink-400 text-pink-600' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {(selectedTags.length > 0 || selectedTopics.length > 0) && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                {selectedTags.length + selectedTopics.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="p-4 space-y-4">
            {/* Tags */}
            {availableTags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Filter by Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.slice(0, 20).map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                      {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                  {availableTags.length > 20 && (
                    <Badge variant="secondary" className="text-xs">
                      +{availableTags.length - 20} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Topics */}
            {availableTopics.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Filter by Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTopics.slice(0, 20).map(topic => (
                    <Badge
                      key={topic.id}
                      variant={selectedTopics.includes(topic.id) ? 'default' : 'outline'}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleTopic(topic.id)}
                      style={{
                        backgroundColor: selectedTopics.includes(topic.id) ? topic.color : undefined,
                        borderColor: topic.color,
                        color: selectedTopics.includes(topic.id) ? '#fff' : topic.color,
                      }}
                    >
                      {topic.icon && <span className="mr-1">{topic.icon}</span>}
                      {topic.name}
                      {selectedTopics.includes(topic.id) && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                  {availableTopics.length > 20 && (
                    <Badge variant="secondary" className="text-xs">
                      +{availableTopics.length - 20} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Second row: My Blogs + Sort + Active chips + Count */}
        <div className="flex items-center gap-3 flex-wrap">
          {profile && (
            <Button
              variant={filterMyContent ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMyContent(!filterMyContent)}
              className={filterMyContent ? 'bg-pink-600 hover:bg-pink-700' : ''}
            >
              <PenTool className="w-3.5 h-3.5 mr-1.5" />
              My Blogs
            </Button>
          )}

          {/* Sort segmented control */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'newest' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortBy('oldest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'oldest' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Oldest
            </button>
            <button
              onClick={() => setSortBy('most-liked')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'most-liked' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Heart className="w-3 h-3 inline mr-1" />
              Most Liked
            </button>
          </div>

          {/* Active tag chips */}
          {selectedTags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1">
              {tag}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleTag(tag)} />
            </Badge>
          ))}

          {/* Active topic chips */}
          {selectedTopics.map(topicId => {
            const topic = availableTopics.find(t => t.id === topicId);
            return topic ? (
              <Badge key={topicId} variant="secondary" className="text-xs gap-1">
                {topic.icon && <span>{topic.icon}</span>}
                {topic.name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleTopic(topicId)} />
              </Badge>
            ) : null;
          })}

          <span className="text-sm text-gray-500 ml-auto">
            {filteredBlogs.length} {filteredBlogs.length === 1 ? 'article' : 'articles'}
          </span>
        </div>
      </div>

      {/* Blogs Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <PenTool className="w-12 h-12 mx-auto text-gray-300 animate-pulse mb-3" />
            <p className="text-gray-600">Loading articles...</p>
          </div>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PenTool className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">
              {hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Be the first to share an article!'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map(blog => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
}
