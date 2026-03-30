import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Button } from '@/app/components/ui/button';
import { X, Star, Sparkles, Target, Info, Check } from 'lucide-react';
import { toast } from 'sonner';

interface UserInterest {
  tag: string;
  is_primary: boolean;
  added_at: string;
  include_in_matching: boolean;
}

interface UserRole {
  tag: string;
  is_primary: boolean;
  added_at: string;
  include_in_matching: boolean;
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

interface InterestsRolesSectionProps {
  userId: string;
  onSave?: () => void;
}

export default function InterestsRolesSection({ userId, onSave }: InterestsRolesSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User data
  const [interests, setInterests] = useState<UserInterest[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [enableRecommendations, setEnableRecommendations] = useState(true);
  
  // Pool data
  const [topicPool, setTopicPool] = useState<TopicPoolEntry[]>([]);
  const [audiencePool, setAudiencePool] = useState<AudiencePoolEntry[]>([]);
  
  // Input states
  const [interestInput, setInterestInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [interestSuggestions, setInterestSuggestions] = useState<TopicPoolEntry[]>([]);
  const [roleSuggestions, setRoleSuggestions] = useState<AudiencePoolEntry[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;

      try {
        setLoading(true);

      // Fetch user data - check if columns exist first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        // Columns might not exist, disable the feature gracefully
        toast.error('Topic/interest matching is not available yet');
        setLoading(false);
        return;
      }

      // Safely access interests/roles data if columns exist
      if ('interests_data' in userData) {
        setInterests((userData?.interests_data as UserInterest[]) || []);
      }
      if ('roles_data' in userData) {
        setRoles((userData?.roles_data as UserRole[]) || []);
      }
      if ('enable_recommendations' in userData) {
        setEnableRecommendations(userData?.enable_recommendations !== false);
      }

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
        toast.error('Failed to load interests and roles');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  useEffect(() => {
    // Filter interest suggestions
    if (interestInput.trim()) {
      const query = interestInput.toLowerCase();
      const filtered = topicPool
        .filter(t => 
          !interests.some(i => i.tag === t.tag) &&
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
      setInterestSuggestions(filtered);
    } else {
      setInterestSuggestions([]);
    }
  }, [interestInput, topicPool, interests]);

  useEffect(() => {
    // Filter role suggestions
    if (roleInput.trim()) {
      const query = roleInput.toLowerCase();
      const filtered = audiencePool
        .filter(a => 
          !roles.some(r => r.tag === a.tag) &&
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
      setRoleSuggestions(filtered);
    } else {
      setRoleSuggestions([]);
    }
  }, [roleInput, audiencePool, roles]);

  const addInterest = (tag: string, isPrimary: boolean = false) => {
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '-');
    
    if (!normalizedTag) {
      toast.error('Please enter an interest');
      return;
    }

    if (interests.some(i => i.tag === normalizedTag)) {
      toast.error('Interest already added');
      return;
    }

    const newInterest: UserInterest = {
      tag: normalizedTag,
      is_primary: isPrimary,
      added_at: new Date().toISOString(),
      include_in_matching: true,
    };

    setInterests([...interests, newInterest]);
    setInterestInput('');
    setInterestSuggestions([]);
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter(i => i.tag !== tag));
  };

  const toggleInterestPrimary = (tag: string) => {
    setInterests(interests.map(i => 
      i.tag === tag ? { ...i, is_primary: !i.is_primary } : i
    ));
  };

  const toggleInterestMatching = (tag: string) => {
    setInterests(interests.map(i => 
      i.tag === tag ? { ...i, include_in_matching: !i.include_in_matching } : i
    ));
  };

  const addRole = (tag: string, isPrimary: boolean = false) => {
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '-');
    
    if (!normalizedTag) {
      toast.error('Please enter a role');
      return;
    }

    if (roles.some(r => r.tag === normalizedTag)) {
      toast.error('Role already added');
      return;
    }

    const newRole: UserRole = {
      tag: normalizedTag,
      is_primary: isPrimary,
      added_at: new Date().toISOString(),
      include_in_matching: true,
    };

    setRoles([...roles, newRole]);
    setRoleInput('');
    setRoleSuggestions([]);
  };

  const removeRole = (tag: string) => {
    setRoles(roles.filter(r => r.tag !== tag));
  };

  const toggleRolePrimary = (tag: string) => {
    setRoles(roles.map(r => 
      r.tag === tag ? { ...r, is_primary: !r.is_primary } : r
    ));
  };

  const toggleRoleMatching = (tag: string) => {
    setRoles(roles.map(r => 
      r.tag === tag ? { ...r, include_in_matching: !r.include_in_matching } : r
    ));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Build update object only with fields that exist
      const updateData: any = {};
      
      // Check if columns exist before trying to update them
      const { data: testData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .single();
      
      if (testData) {
        if ('interests_data' in testData) {
          updateData.interests_data = interests;
        }
        if ('roles_data' in testData) {
          updateData.roles_data = roles;
        }
        if ('enable_recommendations' in testData) {
          updateData.enable_recommendations = enableRecommendations;
        }
      }

      // Only update if we have fields to update
      if (Object.keys(updateData).length === 0) {
        toast.error('Topic/interest matching columns not available in database');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast.success('Interests and roles saved');
      onSave?.();
    } catch (error: any) {
      console.error('Error saving:', error);
      if (error.code === '42703') {
        // Column doesn't exist error
        toast.error('Topic/interest matching is not available yet - database columns missing');
      } else {
        toast.error('Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const getInterestDisplay = (tag: string) => {
    const poolEntry = topicPool.find(t => t.tag === tag);
    return poolEntry?.official_name || tag;
  };

  const getInterestIcon = (tag: string) => {
    const poolEntry = topicPool.find(t => t.tag === tag);
    return poolEntry?.icon || null;
  };

  const isInterestOfficial = (tag: string) => {
    return topicPool.find(t => t.tag === tag)?.is_official || false;
  };

  const getRoleDisplay = (tag: string) => {
    const poolEntry = audiencePool.find(a => a.tag === tag);
    return poolEntry?.official_name || tag;
  };

  const isRoleOfficial = (tag: string) => {
    return audiencePool.find(a => a.tag === tag)?.is_official || false;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading interests and roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Interests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            My Interests
          </CardTitle>
          <CardDescription>
            Share what you're interested in to get personalized circle recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Interests */}
          {interests.length > 0 && (
            <div>
              <Label className="mb-2 block">Current Interests</Label>
              <div className="space-y-2">
                {interests.map((interest) => {
                  const icon = getInterestIcon(interest.tag);
                  const display = getInterestDisplay(interest.tag);
                  const isOfficial = isInterestOfficial(interest.tag);
                  
                  return (
                    <div key={interest.tag} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Badge
                        variant={interest.is_primary ? "default" : "secondary"}
                        className="gap-1 cursor-pointer hover:opacity-80"
                        onClick={() => toggleInterestPrimary(interest.tag)}
                      >
                        {icon && <span>{icon}</span>}
                        {display}
                        {isOfficial && <Star className="w-3 h-3 ml-1 fill-current" />}
                        {interest.is_primary && <span className="text-xs ml-1">(Primary)</span>}
                      </Badge>
                      
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => toggleInterestMatching(interest.tag)}
                          className={`text-xs px-2 py-1 rounded ${
                            interest.include_in_matching 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {interest.include_in_matching ? (
                            <><Check className="w-3 h-3 inline mr-1" />Match</>
                          ) : (
                            'Skip'
                          )}
                        </button>
                        <button
                          onClick={() => removeInterest(interest.tag)}
                          className="hover:bg-red-100 rounded-full p-1"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <Info className="w-3 h-3 inline mr-1" />
                Click interest to toggle as primary. Toggle "Match" to include/exclude from recommendations.
              </p>
            </div>
          )}

          {/* Add Interest */}
          <div>
            <Label htmlFor="interest-input">Add Interest</Label>
            <div className="relative mt-1">
              <Input
                id="interest-input"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && interestInput.trim()) {
                    addInterest(interestInput);
                  }
                }}
                placeholder="Start typing... (e.g., AI, climate-tech, fundraising)"
              />
              
              {/* Suggestions Dropdown */}
              {interestSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {interestSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.tag}
                      onClick={() => addInterest(suggestion.tag)}
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
                  {interestInput.trim() && !interestSuggestions.some(s => s.tag === interestInput.toLowerCase().replace(/\s+/g, '-')) && (
                    <button
                      onClick={() => addInterest(interestInput)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-t flex items-center gap-2 text-indigo-600"
                    >
                      <Sparkles className="w-4 h-4" />
                      Create new interest: "{interestInput}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Official interests appear first. You can create new interests freely.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Roles Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            My Roles & Stage
          </CardTitle>
          <CardDescription>
            Define your role and stage to find circles that match your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Roles */}
          {roles.length > 0 && (
            <div>
              <Label className="mb-2 block">Current Roles</Label>
              <div className="space-y-2">
                {roles.map((role) => {
                  const display = getRoleDisplay(role.tag);
                  const isOfficial = isRoleOfficial(role.tag);
                  
                  return (
                    <div key={role.tag} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Badge
                        variant={role.is_primary ? "default" : "secondary"}
                        className="gap-1 cursor-pointer hover:opacity-80"
                        onClick={() => toggleRolePrimary(role.tag)}
                      >
                        {display}
                        {isOfficial && <Star className="w-3 h-3 ml-1 fill-current text-yellow-500" />}
                        {role.is_primary && <span className="text-xs ml-1">(Primary)</span>}
                      </Badge>
                      
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => toggleRoleMatching(role.tag)}
                          className={`text-xs px-2 py-1 rounded ${
                            role.include_in_matching 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {role.include_in_matching ? (
                            <><Check className="w-3 h-3 inline mr-1" />Match</>
                          ) : (
                            'Skip'
                          )}
                        </button>
                        <button
                          onClick={() => removeRole(role.tag)}
                          className="hover:bg-red-100 rounded-full p-1"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <Info className="w-3 h-3 inline mr-1" />
                Click role to toggle as primary. Toggle "Match" to include/exclude from recommendations.
              </p>
            </div>
          )}

          {/* Add Role */}
          <div>
            <Label htmlFor="role-input">Add Role</Label>
            <div className="relative mt-1">
              <Input
                id="role-input"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && roleInput.trim()) {
                    addRole(roleInput);
                  }
                }}
                placeholder="Start typing... (e.g., founder, investor, pre-seed)"
              />
              
              {/* Suggestions Dropdown */}
              {roleSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {roleSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.tag}
                      onClick={() => addRole(suggestion.tag)}
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
                  {roleInput.trim() && !roleSuggestions.some(s => s.tag === roleInput.toLowerCase().replace(/\s+/g, '-')) && (
                    <button
                      onClick={() => addRole(roleInput)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-t flex items-center gap-2 text-purple-600"
                    >
                      <Target className="w-4 h-4" />
                      Create new role: "{roleInput}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Official roles appear first. You can create new roles freely.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendation Settings</CardTitle>
          <CardDescription>
            Control how your interests and roles are used for recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Circle Recommendations</Label>
              <p className="text-sm text-gray-500">
                Get personalized circle recommendations based on your interests and roles
              </p>
            </div>
            <Switch
              checked={enableRecommendations}
              onCheckedChange={setEnableRecommendations}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Interests & Roles'}
        </Button>
      </div>
    </div>
  );
}