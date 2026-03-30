import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { 
  Heart,
  Briefcase,
  TrendingUp,
  Plus,
  X,
  Hash,
  Users as UsersIcon,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface InterestsTabProps {
  profile: any;
}

interface FollowedTopic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  topic_type: 'audience' | 'purpose' | 'theme';
  follower_count: number;
  content_count: number;
  notification_enabled: boolean;
}

export function InterestsTab({ profile }: InterestsTabProps) {
  const [interests, setInterests] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [stage, setStage] = useState<string>('');
  const [newInterest, setNewInterest] = useState('');
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Followed topics state
  const [followedTopics, setFollowedTopics] = useState<FollowedTopic[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<FollowedTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadFollowedTopics();
  }, [profile]);

  const loadData = () => {
    setInterests(profile.interests || []);
    setRoles(profile.professional_roles || []);
    setStage(profile.career_stage || '');
    setLoading(false);
  };

  const loadFollowedTopics = async () => {
    if (!profile?.id) return;
    
    setTopicsLoading(true);
    try {
      // Fetch followed topics
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/users/${profile.id}/topics/following`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFollowedTopics(data.topics || []);
      }

      // Fetch recommended topics
      const recResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/users/${profile.id}/topics/recommended?limit=3`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (recResponse.ok) {
        const recData = await recResponse.json();
        setRecommendedTopics(recData.topics || []);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleUnfollowTopic = async (topicId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${topicId}/unfollow`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: profile.id }),
        }
      );

      if (response.ok) {
        setFollowedTopics(followedTopics.filter(t => t.id !== topicId));
        toast.success('Unfollowed topic');
        // Refresh recommended topics
        loadFollowedTopics();
      } else {
        toast.error('Failed to unfollow topic');
      }
    } catch (error) {
      console.error('Error unfollowing topic:', error);
      toast.error('Failed to unfollow topic');
    }
  };

  const handleFollowTopic = async (topicId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/${topicId}/follow`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: profile.id }),
        }
      );

      if (response.ok) {
        toast.success('Following topic!');
        loadFollowedTopics();
      } else {
        toast.error('Failed to follow topic');
      }
    } catch (error) {
      console.error('Error following topic:', error);
      toast.error('Failed to follow topic');
    }
  };

  const saveInterests = async (updatedInterests: string[]) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ interests: updatedInterests })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Interests updated');
    } catch (error) {
      console.error('Error updating interests:', error);
      toast.error('Failed to update interests');
    }
  };

  const addInterest = () => {
    if (!newInterest.trim()) return;
    const updated = [...interests, newInterest.trim()];
    setInterests(updated);
    setNewInterest('');
    saveInterests(updated);
  };

  const removeInterest = (index: number) => {
    const updated = interests.filter((_, i) => i !== index);
    setInterests(updated);
    saveInterests(updated);
  };

  const saveRoles = async (updatedRoles: string[]) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ professional_roles: updatedRoles })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Professional roles updated');
    } catch (error) {
      console.error('Error updating roles:', error);
      toast.error('Failed to update roles');
    }
  };

  const addRole = () => {
    if (!newRole.trim()) return;
    const updated = [...roles, newRole.trim()];
    setRoles(updated);
    setNewRole('');
    saveRoles(updated);
  };

  const removeRole = (index: number) => {
    const updated = roles.filter((_, i) => i !== index);
    setRoles(updated);
    saveRoles(updated);
  };

  const saveStage = async (newStage: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ career_stage: newStage })
        .eq('id', profile.id);

      if (error) throw error;
      setStage(newStage);
      toast.success('Career stage updated');
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update career stage');
    }
  };

  const careerStages = [
    { value: 'student', label: 'Student / Early Explorer' },
    { value: 'emerging', label: 'Emerging Professional (0-3 years)' },
    { value: 'established', label: 'Established Professional (3-10 years)' },
    { value: 'senior-leader', label: 'Senior Leader (10+ years)' },
    { value: 'founder', label: 'Founder / Solopreneur' },
    { value: 'coach-consultant', label: 'Coach / Consultant' },
    { value: 'career-changer', label: 'Career Changer' },
    { value: 'retired-advisor', label: 'Retired / Advisor' },
  ];

  const commonInterests = [
    'Leadership Development',
    'Executive Coaching',
    'Team Building',
    'Career Transitions',
    'Personal Branding',
    'Business Strategy',
    'Communication Skills',
    'Emotional Intelligence',
    'Work-Life Balance',
    'Organizational Development',
    'Community Building',
    'Public Speaking',
    'Digital Marketing',
    'Innovation & Design Thinking',
    'DEI & Belonging',
    'Startup Growth',
    'AI & Technology',
  ];

  const commonRoles = [
    'Coach',
    'Consultant',
    'Founder',
    'Manager',
    'Leader',
    'Creator',
    'Educator',
    'Mentor',
    'Facilitator',
    'Entrepreneur',
    'Freelancer',
    'Advisor',
  ];

  if (loading) {
    return <div className="py-8 text-center text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Career Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Career Stage
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Your current career stage or professional phase
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {careerStages.map((stageOption) => (
              <button
                key={stageOption.value}
                onClick={() => saveStage(stageOption.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  stage === stageOption.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="font-medium text-sm">{stageOption.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Professional Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Professional Roles
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            How you identify professionally (select multiple)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Roles */}
          <div className="flex flex-wrap gap-2">
            {roles.map((role, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
              >
                {role}
                <button
                  onClick={() => removeRole(index)}
                  className="ml-2 text-indigo-600 hover:text-indigo-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {roles.length === 0 && (
              <p className="text-sm text-gray-500">No roles selected yet</p>
            )}
          </div>

          {/* Add Custom Role */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRole()}
              placeholder="Add a custom role..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <Button onClick={addRole} size="sm" disabled={!newRole.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Quick Add Roles */}
          <div className="pt-2">
            <Label className="text-xs text-gray-600 mb-2 block">Quick add:</Label>
            <div className="flex flex-wrap gap-2">
              {commonRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    if (!roles.includes(role)) {
                      const updated = [...roles, role];
                      setRoles(updated);
                      saveRoles(updated);
                    }
                  }}
                  disabled={roles.includes(role)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    roles.includes(role)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Areas of Interest
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Topics, industries, or domains you're passionate about
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Interests */}
          <div className="flex flex-wrap gap-2">
            {interests.map((interest, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-800 hover:bg-purple-200"
              >
                {interest}
                <button
                  onClick={() => removeInterest(index)}
                  className="ml-2 text-purple-600 hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {interests.length === 0 && (
              <p className="text-sm text-gray-500">No interests added yet</p>
            )}
          </div>

          {/* Add Custom Interest */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add a custom interest..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <Button onClick={addInterest} size="sm" disabled={!newInterest.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Quick Add Interests */}
          <div className="pt-2">
            <Label className="text-xs text-gray-600 mb-2 block">Quick add:</Label>
            <div className="flex flex-wrap gap-2">
              {commonInterests.map((interest) => (
                <button
                  key={interest}
                  onClick={() => {
                    if (!interests.includes(interest)) {
                      const updated = [...interests, interest];
                      setInterests(updated);
                      saveInterests(updated);
                    }
                  }}
                  disabled={interests.includes(interest)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    interests.includes(interest)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Followed Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Followed Topics
            </div>
            <Link to="/topics">
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-1" />
                Browse All Topics
              </Button>
            </Link>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Topics you're following for content discovery and updates
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {topicsLoading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              Loading topics...
            </div>
          ) : (
            <>
              {/* Followed Topics List */}
              {followedTopics.length > 0 ? (
                <div className="space-y-3">
                  {followedTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-all bg-white"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/topics/${topic.slug}`}
                          className="group flex items-center gap-2 mb-2"
                        >
                          <span className="text-2xl">{topic.icon || '🏷️'}</span>
                          <div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {topic.name}
                            </h4>
                            <Badge
                              variant="secondary"
                              className="text-xs mt-1"
                            >
                              {topic.topic_type}
                            </Badge>
                          </div>
                        </Link>
                        
                        {topic.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {topic.description}
                          </p>
                        )}

                        {/* Popularity Metrics */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <UsersIcon className="w-3.5 h-3.5" />
                            {topic.follower_count} {topic.follower_count === 1 ? 'follower' : 'followers'}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {topic.content_count} {topic.content_count === 1 ? 'item' : 'items'}
                          </span>
                          <Link
                            to={`/topics/${topic.slug}`}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            View content
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Unfollow Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnfollowTopic(topic.id)}
                        className="ml-4 text-gray-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Hash className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
                    You're not following any topics yet
                  </p>
                  <Link to="/topics">
                    <Button variant="outline" size="sm">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Discover Topics
                    </Button>
                  </Link>
                </div>
              )}

              {/* Recommended Topics */}
              {recommendedTopics.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <Label className="text-xs font-semibold text-gray-700 mb-3 block flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Suggested for you:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {recommendedTopics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleFollowTopic(topic.id)}
                        className="group px-4 py-2 text-sm rounded-lg border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 bg-white transition-all flex items-center gap-2"
                      >
                        <span className="text-lg">{topic.icon || '🏷️'}</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900 group-hover:text-indigo-600">
                            {topic.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{topic.follower_count} followers</span>
                            <span>•</span>
                            <span>{topic.content_count} items</span>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}