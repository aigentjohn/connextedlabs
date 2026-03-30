import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Slider } from '@/app/components/ui/slider';
import { X, Hash, Target, Star, Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';

interface CircleTopic {
  tag: string;
  is_primary: boolean;
  added_by: string;
  added_at: string;
}

interface CircleAudience {
  tag: string;
  added_by: string;
  added_at: string;
}

interface CircleMatchingSettings {
  include_in_recommendations: boolean;
  minimum_match_score: number;
}

interface TopicPoolEntry {
  tag: string;
  is_official: boolean;
  official_name: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  user_count: number;
  circle_count: number;
}

interface AudiencePoolEntry {
  tag: string;
  is_official: boolean;
  official_name: string | null;
  description: string | null;
  category: string | null;
  user_count: number;
  circle_count: number;
}

interface CircleTopicsAudienceTabProps {
  circleId: string;
  userId: string;
}

export default function CircleTopicsAudienceTab({ circleId, userId }: CircleTopicsAudienceTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Basic circle info
  const [category, setCategory] = useState('');
  const [tagline, setTagline] = useState('');
  
  // Circle data
  const [topics, setTopics] = useState<CircleTopic[]>([]);
  const [audience, setAudience] = useState<CircleAudience[]>([]);
  const [matchingSettings, setMatchingSettings] = useState<CircleMatchingSettings>({
    include_in_recommendations: true,
    minimum_match_score: 0,
  });
  
  // Pool data
  const [topicPool, setTopicPool] = useState<TopicPoolEntry[]>([]);
  const [audiencePool, setAudiencePool] = useState<AudiencePoolEntry[]>([]);
  
  // Input states
  const [topicInput, setTopicInput] = useState('');
  const [audienceInput, setAudienceInput] = useState('');
  const [topicSuggestions, setTopicSuggestions] = useState<TopicPoolEntry[]>([]);
  const [audienceSuggestions, setAudienceSuggestions] = useState<AudiencePoolEntry[]>([]);

  useEffect(() => {
    loadData();
  }, [circleId]);

  useEffect(() => {
    // Filter topic suggestions
    if (topicInput.trim()) {
      const query = topicInput.toLowerCase();
      const filtered = topicPool
        .filter(t => 
          !topics.some(ct => ct.tag === t.tag) &&
          (t.tag.toLowerCase().includes(query) || 
           t.official_name?.toLowerCase().includes(query))
        )
        .sort((a, b) => {
          // Official topics first
          if (a.is_official && !b.is_official) return -1;
          if (!a.is_official && b.is_official) return 1;
          // Then by usage
          const aUsage = a.user_count + a.circle_count;
          const bUsage = b.user_count + b.circle_count;
          return bUsage - aUsage;
        })
        .slice(0, 10);
      setTopicSuggestions(filtered);
    } else {
      setTopicSuggestions([]);
    }
  }, [topicInput, topicPool, topics]);

  useEffect(() => {
    // Filter audience suggestions
    if (audienceInput.trim()) {
      const query = audienceInput.toLowerCase();
      const filtered = audiencePool
        .filter(a => 
          !audience.some(ca => ca.tag === a.tag) &&
          (a.tag.toLowerCase().includes(query) || 
           a.official_name?.toLowerCase().includes(query))
        )
        .sort((a, b) => {
          // Official tags first
          if (a.is_official && !b.is_official) return -1;
          if (!a.is_official && b.is_official) return 1;
          // Then by usage
          const aUsage = a.user_count + a.circle_count;
          const bUsage = b.user_count + b.circle_count;
          return bUsage - aUsage;
        })
        .slice(0, 10);
      setAudienceSuggestions(filtered);
    } else {
      setAudienceSuggestions([]);
    }
  }, [audienceInput, audiencePool, audience]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch circle data
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select('category, tagline, topics_data, audience_data, matching_settings')
        .eq('id', circleId)
        .single();

      if (circleError) throw circleError;

      setCategory(circleData.category || '');
      setTagline(circleData.tagline || '');
      setTopics((circleData.topics_data as CircleTopic[]) || []);
      setAudience((circleData.audience_data as CircleAudience[]) || []);
      setMatchingSettings((circleData.matching_settings as CircleMatchingSettings) || {
        include_in_recommendations: true,
        minimum_match_score: 0,
      });

      // Fetch pools
      const [topicsRes, audienceRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/all`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/audience/all`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        })
      ]);

      const topicsData = await topicsRes.json();
      const audienceData = await audienceRes.json();

      if (topicsData.success) {
        setTopicPool(topicsData.topics || []);
      }

      if (audienceData.success) {
        setAudiencePool(audienceData.audience || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addTopic = (tag: string, isPrimary: boolean = false) => {
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '-');
    
    if (!normalizedTag) {
      toast.error('Please enter a topic');
      return;
    }

    if (topics.some(t => t.tag === normalizedTag)) {
      toast.error('Topic already added');
      return;
    }

    const newTopic: CircleTopic = {
      tag: normalizedTag,
      is_primary: isPrimary,
      added_by: userId,
      added_at: new Date().toISOString(),
    };

    setTopics([...topics, newTopic]);
    setTopicInput('');
    setTopicSuggestions([]);
  };

  const removeTopic = (tag: string) => {
    setTopics(topics.filter(t => t.tag !== tag));
  };

  const toggleTopicPrimary = (tag: string) => {
    setTopics(topics.map(t => 
      t.tag === tag ? { ...t, is_primary: !t.is_primary } : t
    ));
  };

  const addAudience = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '-');
    
    if (!normalizedTag) {
      toast.error('Please enter an audience tag');
      return;
    }

    if (audience.some(a => a.tag === normalizedTag)) {
      toast.error('Audience tag already added');
      return;
    }

    const newAudience: CircleAudience = {
      tag: normalizedTag,
      added_by: userId,
      added_at: new Date().toISOString(),
    };

    setAudience([...audience, newAudience]);
    setAudienceInput('');
    setAudienceSuggestions([]);
  };

  const removeAudience = (tag: string) => {
    setAudience(audience.filter(a => a.tag !== tag));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('circles')
        .update({
          category: category.trim() || null,
          tagline: tagline.trim() || null,
          topics_data: topics,
          audience_data: audience,
          matching_settings: matchingSettings,
        })
        .eq('id', circleId);

      if (error) throw error;

      toast.success('Topics and audience settings saved');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getTopicDisplay = (tag: string) => {
    const poolEntry = topicPool.find(t => t.tag === tag);
    return poolEntry?.official_name || tag;
  };

  const getTopicIcon = (tag: string) => {
    const poolEntry = topicPool.find(t => t.tag === tag);
    return poolEntry?.icon || null;
  };

  const isTopicOfficial = (tag: string) => {
    return topicPool.find(t => t.tag === tag)?.is_official || false;
  };

  const getAudienceDisplay = (tag: string) => {
    const poolEntry = audiencePool.find(a => a.tag === tag);
    return poolEntry?.official_name || tag;
  };

  const isAudienceOfficial = (tag: string) => {
    return audiencePool.find(a => a.tag === tag)?.is_official || false;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading topics and audience...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Info Section - Category & Tagline */}
      <Card className="border-2 border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Circle Identity
          </CardTitle>
          <CardDescription>
            Set the primary category and tagline that will appear on circle cards. This helps members quickly understand what your circle is about.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Technology, Business, Health & Wellness, Creative Arts"
              className="mt-1"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              Main topic/focus area. This appears as a prominent badge on the circle card.
            </p>
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., Learn, build, and ship together"
              className="mt-1"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              Short, compelling description (shown under circle name on cards)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Topics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Circle Topics
          </CardTitle>
          <CardDescription>
            Define what this circle focuses on. Members with matching interests will see this circle in recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Topics */}
          {topics.length > 0 && (
            <div>
              <Label className="mb-2 block">Current Topics</Label>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => {
                  const icon = getTopicIcon(topic.tag);
                  const display = getTopicDisplay(topic.tag);
                  const isOfficial = isTopicOfficial(topic.tag);
                  
                  return (
                    <Badge
                      key={topic.tag}
                      variant={topic.is_primary ? "default" : "secondary"}
                      className="gap-1 pr-1 cursor-pointer hover:opacity-80"
                      onClick={() => toggleTopicPrimary(topic.tag)}
                    >
                      {icon && <span>{icon}</span>}
                      {display}
                      {isOfficial && <Star className="w-3 h-3 ml-1 fill-current" />}
                      {topic.is_primary && <span className="text-xs ml-1">(Primary)</span>}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTopic(topic.tag);
                        }}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <Info className="w-3 h-3 inline mr-1" />
                Click a topic to toggle as primary. Limit to 1-3 primary topics for best results.
              </p>
            </div>
          )}

          {/* Add Topic */}
          <div>
            <Label htmlFor="topic-input">Add Topic</Label>
            <div className="relative mt-1">
              <Input
                id="topic-input"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && topicInput.trim()) {
                    addTopic(topicInput);
                  }
                }}
                placeholder="Start typing... (e.g., AI, climate-tech, fundraising)"
              />
              
              {/* Suggestions Dropdown */}
              {topicSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {topicSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.tag}
                      onClick={() => addTopic(suggestion.tag)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      {suggestion.icon && <span>{suggestion.icon}</span>}
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {suggestion.official_name || suggestion.tag}
                          {suggestion.is_official && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        {suggestion.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {suggestion.user_count + suggestion.circle_count} uses
                      </div>
                    </button>
                  ))}
                  
                  {/* Option to create new */}
                  {topicInput.trim() && !topicSuggestions.some(s => s.tag === topicInput.toLowerCase().replace(/\s+/g, '-')) && (
                    <button
                      onClick={() => addTopic(topicInput)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-t flex items-center gap-2 text-indigo-600"
                    >
                      <Hash className="w-4 h-4" />
                      Create new topic: "{topicInput}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Official topics appear first. You can create new topics freely.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audience Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Target Audience
          </CardTitle>
          <CardDescription>
            Define who this circle is for. Members with matching roles will see better recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Audience */}
          {audience.length > 0 && (
            <div>
              <Label className="mb-2 block">Current Audience Tags</Label>
              <div className="flex flex-wrap gap-2">
                {audience.map((aud) => {
                  const display = getAudienceDisplay(aud.tag);
                  const isOfficial = isAudienceOfficial(aud.tag);
                  
                  return (
                    <Badge
                      key={aud.tag}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {display}
                      {isOfficial && <Star className="w-3 h-3 ml-1 fill-current text-yellow-500" />}
                      <button
                        onClick={() => removeAudience(aud.tag)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Audience */}
          <div>
            <Label htmlFor="audience-input">Add Audience Tag</Label>
            <div className="relative mt-1">
              <Input
                id="audience-input"
                value={audienceInput}
                onChange={(e) => setAudienceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && audienceInput.trim()) {
                    addAudience(audienceInput);
                  }
                }}
                placeholder="Start typing... (e.g., founders, pre-seed, technical)"
              />
              
              {/* Suggestions Dropdown */}
              {audienceSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {audienceSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.tag}
                      onClick={() => addAudience(suggestion.tag)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {suggestion.official_name || suggestion.tag}
                          {suggestion.is_official && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        {suggestion.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {suggestion.user_count + suggestion.circle_count} uses
                      </div>
                    </button>
                  ))}
                  
                  {/* Option to create new */}
                  {audienceInput.trim() && !audienceSuggestions.some(s => s.tag === audienceInput.toLowerCase().replace(/\s+/g, '-')) && (
                    <button
                      onClick={() => addAudience(audienceInput)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-t flex items-center gap-2 text-purple-600"
                    >
                      <Target className="w-4 h-4" />
                      Create new audience tag: "{audienceInput}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Official audience tags appear first. You can create new tags freely.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Matching Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-green-600" />
            Recommendation Settings
          </CardTitle>
          <CardDescription>
            Control how this circle appears in member recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include in Recommendations</Label>
              <p className="text-sm text-gray-500">
                Show this circle to members with matching interests
              </p>
            </div>
            <Switch
              checked={matchingSettings.include_in_recommendations}
              onCheckedChange={(checked) => 
                setMatchingSettings({ ...matchingSettings, include_in_recommendations: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Minimum Match Score</Label>
              <span className="text-sm font-medium text-gray-700">
                {matchingSettings.minimum_match_score}%
              </span>
            </div>
            <Slider
              value={[matchingSettings.minimum_match_score]}
              onValueChange={(value) => 
                setMatchingSettings({ ...matchingSettings, minimum_match_score: value[0] })
              }
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Only show this circle to members with at least this match score (0 = show to all)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Topics & Audience'}
        </Button>
      </div>
    </div>
  );
}