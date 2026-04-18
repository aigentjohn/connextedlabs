import { useState, useEffect } from 'react';
import { X, Users, Target, Sparkles, TrendingUp } from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  topic_type: 'audience' | 'purpose' | 'theme';
  community_id?: string | null;
  follower_count: number;
  content_count: number;
}

interface GroupedTopics {
  audience: Topic[];
  purpose: Topic[];
  theme: Topic[];
}

interface TopicSelectorProps {
  value: string[]; // array of topic IDs
  onChange: (topicIds: string[]) => void;
  maxTopics?: number; // default 3
  placeholder?: string;
  showSuggestions?: boolean;
}

export function TopicSelector({ 
  value, 
  onChange, 
  maxTopics = 3,
  placeholder = "Select topics...",
  showSuggestions = true
}: TopicSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allTopics, setAllTopics] = useState<GroupedTopics>({ audience: [], purpose: [], theme: [] });
  const [trendingTopics, setTrendingTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'audience' | 'purpose' | 'theme'>('trending');

  // Fetch all topics on mount
  useEffect(() => {
    fetchTopics();
    if (showSuggestions) {
      fetchTrendingTopics();
    }
  }, [showSuggestions]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/grouped`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllTopics(data.grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingTopics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/trending?limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTrendingTopics(data.topics);
        }
      }
    } catch (error) {
      console.error('Error fetching trending topics:', error);
    }
  };

  // Get selected topics
  const selectedTopics = [
    ...allTopics.audience,
    ...allTopics.purpose,
    ...allTopics.theme,
  ].filter(topic => value.includes(topic.id));

  // Filter topics based on search
  const getFilteredTopics = (topics: Topic[]) => {
    if (!searchQuery) return topics;
    return topics.filter(topic =>
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const toggleTopic = (topicId: string) => {
    if (value.includes(topicId)) {
      onChange(value.filter(id => id !== topicId));
    } else {
      if (maxTopics && value.length >= maxTopics) {
        return; // Don't add if at max
      }
      onChange([...value, topicId]);
    }
  };

  const removeTopic = (topicId: string) => {
    onChange(value.filter(id => id !== topicId));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audience': return <Users className="w-3.5 h-3.5" />;
      case 'purpose': return <Target className="w-3.5 h-3.5" />;
      case 'theme': return <Sparkles className="w-3.5 h-3.5" />;
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

  const renderTopicButton = (topic: Topic, selected: boolean) => (
    <button
      key={topic.id}
      type="button"
      onClick={() => toggleTopic(topic.id)}
      disabled={!selected && maxTopics ? value.length >= maxTopics : false}
      className={`
        group flex items-start gap-2 p-3 rounded-lg border transition-all text-left w-full
        ${selected 
          ? 'bg-blue-50 border-blue-300 shadow-sm' 
          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
        }
        ${(!selected && maxTopics && value.length >= maxTopics) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-2xl bg-white rounded border border-gray-200">
        {topic.icon || '🏷️'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-medium ${selected ? 'text-blue-900' : 'text-gray-900'}`}>
            {topic.name}
          </span>
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ 
              borderColor: topic.color || '#gray',
              color: topic.color || '#gray'
            }}
          >
            {getTypeLabel(topic.topic_type)}
          </Badge>
        </div>
        {topic.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {topic.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {topic.follower_count} followers
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {topic.content_count} items
          </span>
        </div>
      </div>
      {selected && (
        <div className="flex-shrink-0">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Selected Topics */}
      {selectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTopics.map(topic => (
            <Badge
              key={topic.id}
              className="pl-2 pr-1.5 py-1.5 flex items-center gap-2"
              style={{
                backgroundColor: topic.color ? `${topic.color}15` : '#EEF2FF',
                borderColor: topic.color || '#3B82F6',
                color: topic.color || '#3B82F6',
              }}
            >
              <span className="text-base">{topic.icon || '🏷️'}</span>
              <span className="font-medium">{topic.name}</span>
              <button
                type="button"
                onClick={() => removeTopic(topic.id)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Inline topic browser */}
      {(maxTopics ? value.length < maxTopics : true) && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
            {maxTopics && (
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {value.length}/{maxTopics}
              </span>
            )}
          </div>

          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trending" className="flex items-center gap-1 text-xs">
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Trending</span>
            </TabsTrigger>
            <TabsTrigger value="audience" className="flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" />
              <span className="hidden sm:inline">WHO</span>
            </TabsTrigger>
            <TabsTrigger value="purpose" className="flex items-center gap-1 text-xs">
              <Target className="w-3 h-3" />
              <span className="hidden sm:inline">WHY</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-1 text-xs">
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[400px] overflow-y-auto mt-2">
            <TabsContent value="trending" className="mt-0 space-y-2">
              <p className="text-xs text-gray-600 mb-3">Most popular topics on the platform:</p>
              {getFilteredTopics(trendingTopics).map(topic =>
                renderTopicButton(topic, value.includes(topic.id))
              )}
              {getFilteredTopics(trendingTopics).length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">No trending topics found</p>
              )}
            </TabsContent>

            <TabsContent value="audience" className="mt-0 space-y-2">
              <p className="text-xs text-gray-600 mb-3"><strong>WHO</strong> is this content for? (Audience/Identity)</p>
              {getFilteredTopics(allTopics.audience).map(topic =>
                renderTopicButton(topic, value.includes(topic.id))
              )}
              {getFilteredTopics(allTopics.audience).length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">No audience topics found</p>
              )}
            </TabsContent>

            <TabsContent value="purpose" className="mt-0 space-y-2">
              <p className="text-xs text-gray-600 mb-3"><strong>WHY</strong> do they need this? (Goal/Purpose)</p>
              {getFilteredTopics(allTopics.purpose).map(topic =>
                renderTopicButton(topic, value.includes(topic.id))
              )}
              {getFilteredTopics(allTopics.purpose).length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">No purpose topics found</p>
              )}
            </TabsContent>

            <TabsContent value="theme" className="mt-0 space-y-2">
              <p className="text-xs text-gray-600 mb-3">Cross-cutting themes and industry sectors:</p>
              {getFilteredTopics(allTopics.theme).map(topic =>
                renderTopicButton(topic, value.includes(topic.id))
              )}
              {getFilteredTopics(allTopics.theme).length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">No theme topics found</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500">
        Select up to {maxTopics} topics that describe <strong>WHO</strong> this is for and <strong>WHY</strong> they need it.
      </p>
    </div>
  );
}