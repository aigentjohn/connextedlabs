import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Search, Users, Target, Sparkles, TrendingUp, UserPlus, FileText, ChevronRight } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  topic_type: 'audience' | 'purpose' | 'theme';
  community_id?: string | null;
  is_featured: boolean;
  follower_count: number;
  content_count: number;
}

interface GroupedTopics {
  audience: Topic[];
  purpose: Topic[];
  theme: Topic[];
}

export default function TopicsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [topics, setTopics] = useState<GroupedTopics>({ audience: [], purpose: [], theme: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'featured' | 'audience' | 'purpose' | 'theme'>('featured');
  const { profile } = useAuth();

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/grouped`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response not OK:', response.status, errorText);
        throw new Error(`Failed to fetch topics: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Topics API response:', data);
      
      if (data.success) {
        setTopics(data.grouped);
      } else {
        throw new Error(data.error || 'Unknown error fetching topics');
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load topics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter topics based on search
  const getFilteredTopics = (topicList: Topic[]) => {
    if (!searchQuery) return topicList;
    return topicList.filter(topic =>
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const allTopics = [...topics.audience, ...topics.purpose, ...topics.theme];
  const featuredTopics = allTopics.filter(t => t.is_featured);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audience': return <Users className="w-4 h-4" />;
      case 'purpose': return <Target className="w-4 h-4" />;
      case 'theme': return <Sparkles className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'audience': return 'WHO';
      case 'purpose': return 'WHY';
      case 'theme': return 'THEME';
      default: return type;
    }
  };

  const renderTopicCard = (topic: Topic) => (
    <Link
      key={topic.id}
      to={`/topics/${topic.slug}`}
      className="group block"
    >
      <Card className="h-full transition-all hover:shadow-md hover:border-blue-300">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl rounded-lg border-2"
              style={{ 
                backgroundColor: topic.color ? `${topic.color}15` : '#EEF2FF',
                borderColor: topic.color || '#3B82F6'
              }}
            >
              {topic.icon || '🏷️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                  {topic.name}
                </h3>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </div>
              {topic.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {topic.description}
                </p>
              )}
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline"
                  className="text-xs"
                  style={{ 
                    borderColor: topic.color || '#3B82F6',
                    color: topic.color || '#3B82F6'
                  }}
                >
                  {getTypeLabel(topic.topic_type)}
                </Badge>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    {topic.follower_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {topic.content_count}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading topics...</p>
        </div>
      </div>
    );
  }

  // Show error state with details
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Topics', path: '/topics' },
          ]}
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900">Unable to Load Topics</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                {error}
              </p>
              <div className="pt-4">
                <Button onClick={fetchTopics}>
                  Try Again
                </Button>
              </div>
              <div className="pt-4 text-sm text-gray-500">
                <p>This might mean:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>The topics table hasn't been seeded with data yet</li>
                  <li>The Supabase Edge Function isn't running</li>
                  <li>There's a database migration that needs to be run</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show empty state if no topics
  if (allTopics.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Topics', path: '/topics' },
          ]}
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">📋</div>
              <h2 className="text-2xl font-bold text-gray-900">No Topics Yet</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                The topics system is set up, but no topics have been created yet.
              </p>
              <div className="pt-4 text-sm text-gray-500">
                <p>To seed topics, run this SQL in your Supabase SQL editor:</p>
                <code className="block mt-2 p-4 bg-gray-100 rounded text-left">
                  SELECT * FROM topics;
                </code>
                <p className="mt-2">If the table is empty, you may need to run the seed migration.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Topics', path: '/topics' },
        ]}
      />

      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Topics</h1>
          <p className="text-gray-600 mt-2">
            Discover content organized by <strong>WHO</strong> it's for and <strong>WHY</strong> they need it
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics organized by tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="featured" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Featured
          </TabsTrigger>
          <TabsTrigger value="audience" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            WHO ({topics.audience.length})
          </TabsTrigger>
          <TabsTrigger value="purpose" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            WHY ({topics.purpose.length})
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Themes ({topics.theme.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Featured Topics</h2>
            <p className="text-sm text-gray-600 mb-6">
              Most popular topics on the platform
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTopics(featuredTopics).map(topic => renderTopicCard(topic))}
          </div>
          {getFilteredTopics(featuredTopics).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No featured topics found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audience" className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              WHO Topics (Audience & Identity)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Content organized by audience type and professional identity
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTopics(topics.audience).map(topic => renderTopicCard(topic))}
          </div>
          {getFilteredTopics(topics.audience).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No audience topics found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purpose" className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              WHY Topics (Goals & Purpose)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Content organized by goals, motivations, and intended outcomes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTopics(topics.purpose).map(topic => renderTopicCard(topic))}
          </div>
          {getFilteredTopics(topics.purpose).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No purpose topics found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="theme" className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              Theme Topics (Industry & Trends)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Content organized by industry sectors and cross-cutting themes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTopics(topics.theme).map(topic => renderTopicCard(topic))}
          </div>
          {getFilteredTopics(topics.theme).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No theme topics found
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}