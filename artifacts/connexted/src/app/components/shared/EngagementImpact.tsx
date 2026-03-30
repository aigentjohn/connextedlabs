import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { TrendingUp, Users, Clock, Award, Flame } from 'lucide-react';
import { useEngagementExtension } from '@/hooks/useEngagementExtension';

interface EngagementImpactProps {
  containerType: string;
  containerId: string;
  engagementScore?: number;
  engagementExtendsCount?: number;
  maxEngagementExtensions?: number;
  totalDaysExtended?: number;
  className?: string;
  variant?: 'full' | 'compact' | 'badge';
}

/**
 * Shows the engagement impact on content survival
 * Displays how community interaction has extended this content's lifespan
 */
export function EngagementImpact({
  containerType,
  containerId,
  engagementScore = 0,
  engagementExtendsCount = 0,
  maxEngagementExtensions = 180,
  totalDaysExtended,
  className = '',
  variant = 'full'
}: EngagementImpactProps) {
  const { getEngagementStats } = useEngagementExtension();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [containerType, containerId]);

  const loadStats = async () => {
    setLoading(true);
    const data = await getEngagementStats(containerType, containerId);
    setStats(data);
    setLoading(false);
  };

  const extensionsProgress = (engagementExtendsCount / maxEngagementExtensions) * 100;
  const daysExtended = totalDaysExtended || stats?.total_days_extended || 0;
  const uniqueEngagers = stats?.unique_engagers || 0;

  // Badge variant - minimal display
  if (variant === 'badge') {
    if (engagementExtendsCount === 0) return null;
    
    return (
      <Badge variant="secondary" className={className}>
        <Flame className="w-3 h-3 mr-1" />
        Extended {engagementExtendsCount}x
      </Badge>
    );
  }

  // Compact variant - single line
  if (variant === 'compact') {
    if (engagementExtendsCount === 0) return null;

    return (
      <div className={`flex items-center gap-3 text-sm ${className}`}>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="font-medium">{engagementScore}</span>
          <span className="text-muted-foreground">engagement</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="font-medium">+{daysExtended.toFixed(0)}d</span>
          <span className="text-muted-foreground">extended</span>
        </div>

        {uniqueEngagers > 0 && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="font-medium">{uniqueEngagers}</span>
            <span className="text-muted-foreground">people</span>
          </div>
        )}
      </div>
    );
  }

  // Full variant - detailed card
  if (loading || engagementExtendsCount === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          Community Impact
        </CardTitle>
        <CardDescription>
          This content has been extended {engagementExtendsCount} times through community engagement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Engagement Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-medium">Engagement Score</span>
          </div>
          <Badge variant="secondary" className="text-lg">
            {engagementScore}
          </Badge>
        </div>

        {/* Days Extended */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Days Extended</span>
          </div>
          <span className="text-lg font-bold text-blue-600">
            +{daysExtended.toFixed(1)} days
          </span>
        </div>

        {/* Unique Engagers */}
        {uniqueEngagers > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Community Members</span>
            </div>
            <span className="text-lg font-semibold">
              {uniqueEngagers}
            </span>
          </div>
        )}

        {/* Progress to Max */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Extensions Progress</span>
            <span className="font-medium">
              {engagementExtendsCount} / {maxEngagementExtensions}
            </span>
          </div>
          <Progress value={extensionsProgress} className="h-2" />
          {extensionsProgress >= 80 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Award className="w-3 h-3" />
              Nearly at maximum community extensions!
            </p>
          )}
        </div>

        {/* Breakdown by Type */}
        {stats?.breakdown_by_type && Object.keys(stats.breakdown_by_type).length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Engagement Breakdown</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.breakdown_by_type).map(([type, data]: [string, any]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="capitalize">
                    {getEngagementIcon(type)} {type}s
                  </span>
                  <Badge variant="outline" size="sm">
                    {data.count} (+{data.days.toFixed(0)}d)
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          {engagementExtendsCount >= 100 && (
            <Badge variant="default" className="bg-purple-600">
              <Award className="w-3 h-3 mr-1" />
              Viral
            </Badge>
          )}
          {engagementExtendsCount >= 10 && engagementExtendsCount < 100 && (
            <Badge variant="default" className="bg-blue-600">
              <Flame className="w-3 h-3 mr-1" />
              Hot
            </Badge>
          )}
          {uniqueEngagers >= 20 && (
            <Badge variant="default" className="bg-green-600">
              <Users className="w-3 h-3 mr-1" />
              Community Favorite
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Small inline indicator that shows content has been extended by engagement
 */
export function EngagementIndicator({
  engagementExtendsCount = 0,
  daysExtended = 0,
  className = ''
}: {
  engagementExtendsCount?: number;
  daysExtended?: number;
  className?: string;
}) {
  if (engagementExtendsCount === 0) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 ${className}`}>
      <Flame className="w-3.5 h-3.5 text-orange-600" />
      <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
        +{daysExtended.toFixed(0)}d from community
      </span>
    </div>
  );
}

/**
 * Leaderboard showing most extended content
 */
interface LeaderboardEntry {
  container_type: string;
  container_id: string;
  total_extensions: number;
  total_days_extended: number;
  unique_engagers: number;
  last_extended_at: string;
}

export function MostExtendedLeaderboard({
  containerType,
  limit = 10,
  className = ''
}: {
  containerType?: string;
  limit?: number;
  className?: string;
}) {
  const { getMostExtended } = useEngagementExtension();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [containerType, limit]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await getMostExtended(containerType, limit);
    setLeaderboard(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>🏆 Most Extended Content</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          Most Extended {containerType ? containerType.charAt(0).toUpperCase() + containerType.slice(1) + 's' : 'Content'}
        </CardTitle>
        <CardDescription>
          Content that the community has kept alive the longest
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.container_id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-primary">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && (index + 1)}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {entry.container_type.charAt(0).toUpperCase() + entry.container_type.slice(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.unique_engagers} community members
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  +{entry.total_days_extended.toFixed(0)}d
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.total_extensions} extensions
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get icon for engagement type
function getEngagementIcon(type: string): string {
  const icons: Record<string, string> = {
    like: '👍',
    upvote: '⬆️',
    comment: '💬',
    review: '⭐',
    share: '🔗',
    bookmark: '📌',
    award: '🏆'
  };
  return icons[type] || '✨';
}

export default EngagementImpact;
