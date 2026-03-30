import { Badge } from '@/app/components/ui/badge';
import { Flame, TrendingUp, Users, Award } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface EngagementStatsProps {
  engagementScore?: number;
  engagementExtendsCount?: number;
  totalDaysExtended?: number;
  variant?: 'inline' | 'card' | 'badge';
  className?: string;
}

/**
 * Display engagement statistics for containers
 * Shows how much community engagement has extended content survival
 */
export function EngagementStats({
  engagementScore = 0,
  engagementExtendsCount = 0,
  totalDaysExtended = 0,
  variant = 'inline',
  className = ''
}: EngagementStatsProps) {
  // Don't show if no engagement
  if (engagementScore === 0 && engagementExtendsCount === 0) {
    return null;
  }

  const getEngagementLevel = () => {
    if (engagementExtendsCount >= 100) return { label: 'Legendary', color: 'text-purple-600', icon: Award };
    if (engagementExtendsCount >= 50) return { label: 'Viral', color: 'text-red-600', icon: Flame };
    if (engagementExtendsCount >= 20) return { label: 'Hot', color: 'text-orange-600', icon: TrendingUp };
    if (engagementExtendsCount >= 10) return { label: 'Popular', color: 'text-yellow-600', icon: Users };
    return { label: 'Rising', color: 'text-green-600', icon: TrendingUp };
  };

  const level = getEngagementLevel();
  const Icon = level.icon;

  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`flex items-center gap-1 ${className}`}>
              <Icon className={`w-3 h-3 ${level.color}`} />
              <span className={level.color}>{engagementExtendsCount}x</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{level.label} Content</p>
            <p className="text-sm">Extended {engagementExtendsCount} times</p>
            <p className="text-sm">+{totalDaysExtended} days survival</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Icon className={`w-5 h-5 ${level.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-gray-900">{level.label} Content</h4>
              <Badge variant="outline" className="bg-white">
                <Flame className="w-3 h-3 mr-1 text-orange-500" />
                {engagementScore} pts
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Community engagement has extended this content <strong>{engagementExtendsCount} times</strong>,
              adding <strong>{totalDaysExtended} days</strong> to its survival.
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>🔥 {engagementExtendsCount} extensions</span>
              <span>⏰ +{totalDaysExtended}d lifetime</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm">
              <Icon className={`w-4 h-4 ${level.color}`} />
              <span className={`font-medium ${level.color}`}>{level.label}</span>
              <Badge variant="outline" className="ml-1">
                {engagementExtendsCount}x
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">Extended {engagementExtendsCount} times by community</p>
            <p className="text-sm">+{totalDaysExtended} days survival</p>
            <p className="text-sm">{engagementScore} engagement points</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/**
 * Show impact of user's engagement on content survival
 */
export function UserEngagementImpact({
  contentExtendedCount = 0,
  totalDaysGiven = 0,
  className = ''
}: {
  contentExtendedCount: number;
  totalDaysGiven: number;
  className?: string;
}) {
  if (contentExtendedCount === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Award className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">Your Impact</h4>
          <p className="text-sm text-gray-600">
            Your engagement has kept <strong>{contentExtendedCount} pieces</strong> of valuable content alive,
            adding <strong>{totalDaysGiven} days</strong> of survival time.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="bg-white">
              💫 {contentExtendedCount} items preserved
            </Badge>
            <Badge variant="outline" className="bg-white">
              ⏰ +{totalDaysGiven} days given
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
