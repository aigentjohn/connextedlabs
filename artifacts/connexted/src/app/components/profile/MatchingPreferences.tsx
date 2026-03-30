import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Settings, Sparkles, Eye, EyeOff, Check, X } from 'lucide-react';
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

interface MatchingPreferencesProps {
  userId: string;
}

export default function MatchingPreferences({ userId }: MatchingPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enableRecommendations, setEnableRecommendations] = useState(true);
  const [interests, setInterests] = useState<UserInterest[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading preferences:', error);
        toast.error('Topic/interest matching is not available yet');
        setLoading(false);
        return;
      }

      // Safely access data if columns exist
      if ('interests_data' in data) {
        setInterests((data?.interests_data as UserInterest[]) || []);
      }
      if ('roles_data' in data) {
        setRoles((data?.roles_data as UserRole[]) || []);
      }
      if ('enable_recommendations' in data) {
        setEnableRecommendations(data?.enable_recommendations !== false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          enable_recommendations: enableRecommendations,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Preferences saved');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeInterests = interests.filter(i => i.include_in_matching);
  const activeRoles = roles.filter(r => r.include_in_matching);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          Matching Preferences
        </CardTitle>
        <CardDescription>
          Control how your profile is used for circle recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Circle Recommendations</Label>
            <p className="text-sm text-gray-500">
              Get personalized recommendations on your homepage
            </p>
          </div>
          <Switch
            checked={enableRecommendations}
            onCheckedChange={setEnableRecommendations}
          />
        </div>

        {enableRecommendations && (
          <>
            {/* Active Interests */}
            <div>
              <Label className="mb-2 block">Interests Used for Matching</Label>
              {activeInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeInterests.map((interest) => (
                    <Badge key={interest.tag} variant="secondary" className="gap-1">
                      <Check className="w-3 h-3" />
                      {interest.tag}
                      {interest.is_primary && <span className="text-xs ml-1">(Primary)</span>}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border border-dashed">
                  <X className="w-4 h-4 inline mr-1" />
                  No interests enabled for matching
                </div>
              )}
              {interests.length > activeInterests.length && (
                <p className="text-xs text-gray-500 mt-2">
                  {interests.length - activeInterests.length} interest(s) excluded from matching
                </p>
              )}
            </div>

            {/* Active Roles */}
            <div>
              <Label className="mb-2 block">Roles Used for Matching</Label>
              {activeRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeRoles.map((role) => (
                    <Badge key={role.tag} variant="outline" className="gap-1">
                      <Check className="w-3 h-3" />
                      {role.tag}
                      {role.is_primary && <span className="text-xs ml-1">(Primary)</span>}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border border-dashed">
                  <X className="w-4 h-4 inline mr-1" />
                  No roles enabled for matching
                </div>
              )}
              {roles.length > activeRoles.length && (
                <p className="text-xs text-gray-500 mt-2">
                  {roles.length - activeRoles.length} role(s) excluded from matching
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-indigo-900 mb-1">Matching Status</h4>
                  <p className="text-sm text-indigo-700">
                    {activeInterests.length > 0 || activeRoles.length > 0 ? (
                      <>
                        You'll receive recommendations based on{' '}
                        {activeInterests.length > 0 && (
                          <strong>{activeInterests.length} interest{activeInterests.length !== 1 ? 's' : ''}</strong>
                        )}
                        {activeInterests.length > 0 && activeRoles.length > 0 && ' and '}
                        {activeRoles.length > 0 && (
                          <strong>{activeRoles.length} role{activeRoles.length !== 1 ? 's' : ''}</strong>
                        )}
                        .
                      </>
                    ) : (
                      'Add interests and roles in your profile to get recommendations'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {!enableRecommendations && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <EyeOff className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Recommendations Disabled</h4>
                <p className="text-sm text-gray-600">
                  You won't receive circle recommendations on your homepage. You can still browse and join circles manually.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}