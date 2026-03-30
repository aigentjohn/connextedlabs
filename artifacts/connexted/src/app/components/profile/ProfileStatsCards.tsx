/**
 * ProfileStatsCards Component
 * 
 * Displays three stats cards: Contributions, Circles, Containers
 * with progress bars and upgrade CTAs based on user class limits.
 * 
 * Update frequency: Tier 2 (engagement pulse) - changes weekly
 * as user participates in the platform.
 * 
 * Self-fetches its own data via useProfileEngagement hook.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { StatsCard } from '@/app/components/profile/StatsCard';
import { ProgressBar } from '@/app/components/profile/ProgressBar';
import {
  TrendingUp,
  Users,
  Shield,
  AlertCircle,
  ArrowUpCircle,
} from 'lucide-react';

interface ProfileStatsCardsProps {
  userId: string;
  userClass: number;
  onScrollToMembership: () => void;
}

interface EngagementData {
  stats: { posts: number; threads: number; documents: number; events: number };
  hostedCirclesCount: number;
  moderatedCirclesCount: number;
  memberCirclesCount: number;
  adminContainersCount: number;
  memberContainersCount: number;
  userClassInfo: any;
}

function useProfileEngagement(userId: string, userClass: number) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        // Fetch activity stats in parallel
        const [postsCount, threadsCount, documentsCount, eventsCount] = await Promise.all([
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
          supabase.from('forum_threads').select('id', { count: 'exact', head: true }).eq('author_id', userId),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('author_id', userId),
          supabase.from('events').select('id', { count: 'exact', head: true }).eq('host_id', userId),
        ]);

        // Fetch circle counts in parallel
        const [memberCircles, hostedCircles, moderatedCircles] = await Promise.all([
          supabase.from('circles').select('id', { count: 'exact', head: true }).contains('member_ids', [userId]),
          supabase.from('circles').select('id', { count: 'exact', head: true }).eq('host_id', userId),
          supabase.from('circles').select('id', { count: 'exact', head: true }).contains('moderators', [userId]),
        ]);

        // Fetch container counts - batched by role instead of 21 sequential queries
        const containerTypes = ['tables', 'elevators', 'meetings', 'pitches', 'builds', 'standups', 'meetups'];
        
        const adminPromises = containerTypes.map(type =>
          supabase.from(type).select('id', { count: 'exact', head: true }).contains('admin_ids', [userId])
        );
        const memberPromises = containerTypes.map(type =>
          supabase.from(type).select('id', { count: 'exact', head: true }).contains('member_ids', [userId])
        );

        const adminResults = await Promise.all(adminPromises);
        const memberResults = await Promise.all(memberPromises);

        const totalAdminContainers = adminResults.reduce((sum, r) => sum + (r.count || 0), 0);
        const totalMemberContainers = memberResults.reduce((sum, r) => sum + (r.count || 0), 0);

        // Fetch user class info
        const { data: userClassData } = await supabase
          .from('user_classes')
          .select('*')
          .eq('class_number', userClass)
          .single();

        const classInfo = userClassData || {
          class_number: userClass,
          display_name: `Class ${userClass}`,
          max_admin_circles: userClass === 10 ? -1 : Math.max(0, userClass - 2),
          max_admin_containers: userClass === 10 ? -1 : userClass * 5,
          max_member_containers: userClass === 10 ? -1 : userClass * 10,
          description: 'User class configuration',
        };

        setData({
          stats: {
            posts: postsCount.count || 0,
            threads: threadsCount.count || 0,
            documents: documentsCount.count || 0,
            events: eventsCount.count || 0,
          },
          hostedCirclesCount: hostedCircles.count || 0,
          moderatedCirclesCount: moderatedCircles.count || 0,
          memberCirclesCount: memberCircles.count || 0,
          adminContainersCount: totalAdminContainers,
          memberContainersCount: totalMemberContainers,
          userClassInfo: classInfo,
        });
      } catch (error) {
        console.error('Error fetching profile engagement data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, userClass]);

  return { data, loading };
}

export function ProfileStatsCards({ userId, userClass, onScrollToMembership }: ProfileStatsCardsProps) {
  const { data, loading } = useProfileEngagement(userId, userClass);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-8 w-8 bg-gray-200 rounded" />
                <div className="h-6 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { stats, hostedCirclesCount, moderatedCirclesCount, memberCirclesCount, adminContainersCount, memberContainersCount, userClassInfo } = data;
  const adminCirclesCount = hostedCirclesCount + moderatedCirclesCount;
  const totalContributions = stats.posts + stats.threads + stats.documents + stats.events;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* My Contributions */}
      <StatsCard
        icon={TrendingUp}
        iconColor="text-indigo-600"
        title="My Contributions"
        value={totalContributions}
        subtitle="Total activity count"
      />

      {/* My Circles with Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-amber-600" />
            {userClassInfo && userClassInfo.max_admin_circles !== -1 &&
             adminCirclesCount >= userClassInfo.max_admin_circles * 0.8 && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                {adminCirclesCount >= userClassInfo.max_admin_circles ? 'At Limit' : 'Near Limit'}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-900">
                  {adminCirclesCount}
                </span>
                <span className="text-xs text-gray-600">/</span>
                <span className="text-sm font-semibold text-amber-700">
                  {userClassInfo?.max_admin_circles === -1 ? '\u221E' : (userClassInfo?.max_admin_circles || 0)}
                </span>
                <span className="text-xs text-gray-600">admin</span>
              </div>

              {userClassInfo && userClassInfo.max_admin_circles !== -1 && (
                <ProgressBar
                  current={adminCirclesCount}
                  max={userClassInfo.max_admin_circles}
                  warningThreshold={0.8}
                  className="mt-1"
                />
              )}
            </div>

            <div className="text-sm font-medium text-gray-700">
              {memberCirclesCount} member circles
            </div>
          </div>

          <div className="text-sm text-gray-600 mt-2">My Circles</div>

          {userClassInfo && userClassInfo.max_admin_circles !== -1 &&
           adminCirclesCount >= userClassInfo.max_admin_circles * 0.8 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={onScrollToMembership}
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Upgrade for More
            </Button>
          )}
        </CardContent>
      </Card>

      {/* My Containers with Progress Bars */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-8 h-8 text-purple-600" />
            {userClassInfo && userClassInfo.max_admin_containers !== -1 &&
             adminContainersCount >= userClassInfo.max_admin_containers * 0.8 && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                {adminContainersCount >= userClassInfo.max_admin_containers ? 'At Limit' : 'Near Limit'}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-purple-900">
                  {adminContainersCount}
                </span>
                <span className="text-xs text-gray-600">/</span>
                <span className="text-sm font-semibold text-purple-700">
                  {userClassInfo?.max_admin_containers === -1 ? '\u221E' : (userClassInfo?.max_admin_containers || 0)}
                </span>
                <span className="text-xs text-gray-600">admin</span>
              </div>

              {userClassInfo && userClassInfo.max_admin_containers !== -1 && (
                <ProgressBar
                  current={adminContainersCount}
                  max={userClassInfo.max_admin_containers}
                  warningThreshold={0.8}
                  className="mt-1"
                />
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-green-900">
                  {memberContainersCount}
                </span>
                <span className="text-xs text-gray-600">/</span>
                <span className="text-sm font-semibold text-green-700">
                  {userClassInfo?.max_member_containers === -1 ? '\u221E' : (userClassInfo?.max_member_containers || 0)}
                </span>
                <span className="text-xs text-gray-600">member</span>
              </div>

              {userClassInfo && userClassInfo.max_member_containers !== -1 && (
                <ProgressBar
                  current={memberContainersCount}
                  max={userClassInfo.max_member_containers}
                  warningThreshold={0.8}
                  className="mt-1"
                />
              )}
            </div>
          </div>

          <div className="text-sm text-gray-600 mt-2">My Containers</div>

          {userClassInfo && (
            (userClassInfo.max_admin_containers !== -1 && adminContainersCount >= userClassInfo.max_admin_containers * 0.8) ||
            (userClassInfo.max_member_containers !== -1 && memberContainersCount >= userClassInfo.max_member_containers * 0.8)
          ) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={onScrollToMembership}
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Upgrade for More
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
