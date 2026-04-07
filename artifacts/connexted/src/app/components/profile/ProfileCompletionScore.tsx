import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface ProfileCompletionScoreProps {
  profile: any;
  onSectionClick?: (section: string) => void;
}

interface CompletionItem {
  id: string;
  label: string;
  isComplete: boolean;
  weight: number;
  action?: string;
}

export function ProfileCompletionScore({ profile, onSectionClick }: ProfileCompletionScoreProps) {
  const completionItems: CompletionItem[] = useMemo(() => {
    return [
      // Basic Info (40 points)
      {
        id: 'name',
        label: 'Add your name',
        isComplete: !!profile?.name,
        weight: 5,
        action: 'basics',
      },
      {
        id: 'bio',
        label: 'Write a bio',
        isComplete: !!profile?.bio && profile.bio.length > 20,
        weight: 10,
        action: 'about',
      },
      {
        id: 'location',
        label: 'Add your location',
        isComplete: !!profile?.location,
        weight: 5,
        action: 'contact',
      },
      {
        id: 'avatar',
        label: 'Upload a profile photo',
        isComplete: !!profile?.avatar_url,
        weight: 10,
        action: 'basics',
      },
      {
        id: 'headline',
        label: 'Add a professional headline',
        isComplete: !!profile?.headline,
        weight: 10,
        action: 'about',
      },

      // Professional Identity (30 points)
      {
        id: 'career_stage',
        label: 'Select your career stage',
        isComplete: !!profile?.career_stage,
        weight: 5,
        action: 'interests',
      },
      {
        id: 'roles',
        label: 'Add professional roles',
        isComplete: profile?.professional_roles?.length > 0,
        weight: 10,
        action: 'interests',
      },
      {
        id: 'skills',
        label: 'List your skills',
        isComplete: profile?.skills?.length > 0 || profile?.skill_tags?.length > 0,
        weight: 10,
        action: 'skills',
      },
      {
        id: 'looking_for',
        label: 'Share what you\'re looking for',
        isComplete: profile?.looking_for?.length > 0,
        weight: 5,
        action: 'interests',
      },

      // Interests & Community (15 points)
      {
        id: 'interests',
        label: 'Add areas of interest',
        isComplete: profile?.interests?.length > 0,
        weight: 10,
        action: 'interests',
      },
      {
        id: 'topics',
        label: 'Watch topics',
        isComplete: false, // Would need to check topic_followers table
        weight: 5,
        action: 'interests',
      },

      // Social & Contact (15 points)
      {
        id: 'social_links',
        label: 'Add social links',
        isComplete: profile?.social_links && Object.values(profile.social_links).some(v => v),
        weight: 10,
        action: 'social',
      },
      {
        id: 'share_social',
        label: 'Enable social link sharing',
        isComplete: profile?.privacy_settings?.share_social_links === true,
        weight: 5,
        action: 'social',
      },
    ];
  }, [profile]);

  const totalWeight = completionItems.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = completionItems
    .filter(item => item.isComplete)
    .reduce((sum, item) => sum + item.weight, 0);
  const completionScore = Math.round((completedWeight / totalWeight) * 100);

  const incompleteItems = completionItems.filter(item => !item.isComplete);
  const topSuggestions = incompleteItems
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Exceptional! Your profile is complete 🎉';
    if (score >= 80) return 'Great job! Just a few tweaks left';
    if (score >= 60) return 'Good progress! Keep building';
    if (score >= 40) return 'Getting there! Add more details';
    return 'Let\'s get started! Complete your profile';
  };

  if (completionScore === 100) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">Profile Complete!</h4>
              <p className="text-sm text-green-700">Your profile is fully optimized 🎉</p>
            </div>
            <Badge className="bg-green-600 text-white">100%</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Profile Strength
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`text-lg font-bold px-3 py-1 ${getScoreBadgeColor(completionScore)}`}
          >
            {completionScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${getScoreColor(completionScore)}`}>
              {getScoreMessage(completionScore)}
            </span>
          </div>
          <Progress value={completionScore} className="h-3" />
          <p className="text-xs text-gray-500 mt-2">
            {incompleteItems.length} item{incompleteItems.length !== 1 ? 's' : ''} remaining
          </p>
        </div>

        {/* Top Suggestions */}
        {topSuggestions.length > 0 && (
          <div className="pt-3 border-t border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-semibold text-gray-900">Quick Wins</h4>
            </div>
            <div className="space-y-2">
              {topSuggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionClick?.(item.action || '')}
                  className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <Circle className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 group-hover:text-indigo-900">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      +{item.weight}%
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Items Toggle */}
        {incompleteItems.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            onClick={() => onSectionClick?.('all')}
          >
            View all {incompleteItems.length} suggestions
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
