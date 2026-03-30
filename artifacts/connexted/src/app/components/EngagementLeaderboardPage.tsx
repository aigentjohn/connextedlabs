// Split candidate: ~478 lines — consider extracting LeaderboardTable, LeaderboardFilters, and UserRankCard into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  TrendingUp, 
  Flame, 
  Award, 
  Users, 
  Target,
  Hammer,
  Lightbulb,
  Calendar,
  Sparkles,
  Trophy,
  Crown,
  Medal
} from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { EngagementStats, UserEngagementImpact } from '@/app/components/shared/EngagementStats';

interface ContentItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  engagement_score: number;
  engagement_extends_count: number;
  total_days_extended: number;
  created_at: string;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface UserImpact {
  user_id: string;
  name: string;
  avatar?: string;
  content_extended_count: number;
  total_days_given: number;
  total_engagements: number;
}

export default function EngagementLeaderboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hotContent, setHotContent] = useState<ContentItem[]>([]);
  const [topContributors, setTopContributors] = useState<UserImpact[]>([]);
  const [userStats, setUserStats] = useState({
    content_extended_count: 0,
    total_days_given: 0,
    total_engagements: 0,
    rank: 0
  });

  useEffect(() => {
    if (profile) {
      fetchLeaderboardData();
    }
  }, [profile]);

  const fetchLeaderboardData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch hot content across all container types
      const containerTypes = ['builds', 'pitches', 'tables', 'elevators', 'libraries', 'events'];
      const allContent: ContentItem[] = [];

      for (const type of containerTypes) {
        const { data, error } = await supabase
          .from(type)
          .select(`
            id,
            name,
            slug,
            description,
            engagement_score,
            engagement_extends_count,
            total_days_extended,
            created_at,
            created_by
          `)
          .gt('engagement_extends_count', 0)
          .order('engagement_score', { ascending: false })
          .limit(20);

        if (data && !error) {
          // Fetch creators
          const creatorIds = [...new Set(data.map(item => item.created_by))];
          const { data: creators } = await supabase
            .from('users')
            .select('id, name, avatar')
            .in('id', creatorIds);

          const creatorsMap = new Map(creators?.map(c => [c.id, c]) || []);

          const items = data.map(item => ({
            ...item,
            type,
            creator: creatorsMap.get(item.created_by)
          }));

          allContent.push(...items);
        }
      }

      // Sort by engagement score and take top 50
      const sortedContent = allContent
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, 50);

      setHotContent(sortedContent);

      // Fetch top contributors from engagement_extensions
      const { data: contributorsData } = await supabase
        .from('engagement_extensions')
        .select(`
          user_id,
          days_extended,
          engagement_type
        `);

      if (contributorsData) {
        // Aggregate by user
        const userMap = new Map<string, { content_extended_count: number; total_days_given: number; total_engagements: number }>();

        contributorsData.forEach(ext => {
          const current = userMap.get(ext.user_id) || { content_extended_count: 0, total_days_given: 0, total_engagements: 0 };
          userMap.set(ext.user_id, {
            content_extended_count: current.content_extended_count + 1,
            total_days_given: current.total_days_given + ext.days_extended,
            total_engagements: current.total_engagements + 1
          });
        });

        // Fetch user details
        const userIds = Array.from(userMap.keys());
        const { data: users } = await supabase
          .from('users')
          .select('id, name, avatar')
          .in('id', userIds);

        const contributors: UserImpact[] = (users || []).map(user => ({
          user_id: user.id,
          name: user.name,
          avatar: user.avatar,
          ...userMap.get(user.id)!
        }));

        // Sort by total days given
        const sortedContributors = contributors
          .sort((a, b) => b.total_days_given - a.total_days_given)
          .slice(0, 50);

        setTopContributors(sortedContributors);

        // Calculate user's stats and rank
        const userContribution = contributors.find(c => c.user_id === profile.id);
        if (userContribution) {
          const rank = sortedContributors.findIndex(c => c.user_id === profile.id) + 1;
          setUserStats({
            ...userContribution,
            rank
          });
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContainerIcon = (type: string) => {
    switch (type) {
      case 'builds': return Hammer;
      case 'pitches': return Lightbulb;
      case 'tables': return Users;
      case 'elevators': return TrendingUp;
      case 'libraries': return Sparkles;
      case 'events': return Calendar;
      default: return Target;
    }
  };

  const getContainerPath = (item: ContentItem) => {
    const paths: Record<string, string> = {
      'builds': '/builds',
      'pitches': '/pitches',
      'tables': '/tables',
      'elevators': '/elevators',
      'libraries': '/libraries',
      'events': '/events'
    };
    return `${paths[item.type]}/${item.slug}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' };
    if (rank === 3) return { icon: Medal, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
    return { icon: Trophy, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Please log in to view the leaderboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Engagement Leaderboard' }]}
        icon={Flame}
        iconBg="bg-gradient-to-br from-orange-500 to-red-500"
        iconColor="text-white"
        title="Engagement Leaderboard"
        description="Community's most valuable content & top contributors"
      />

      {/* User's Impact Card */}
      {userStats.total_days_given > 0 && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <UserEngagementImpact
                contentExtendedCount={userStats.content_extended_count}
                totalDaysGiven={userStats.total_days_given}
                className="flex-1 border-0 bg-transparent p-0"
              />
              {userStats.rank > 0 && (
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 ${getRankBadge(userStats.rank).bg}`}>
                    <span className="text-2xl font-bold">{userStats.rank}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Your Rank</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">
            <Flame className="w-4 h-4 mr-2" />
            Hot Content
          </TabsTrigger>
          <TabsTrigger value="contributors">
            <Award className="w-4 h-4 mr-2" />
            Top Contributors
          </TabsTrigger>
        </TabsList>

        {/* Hot Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Extended Content</CardTitle>
              <CardDescription>
                Content that the community has kept alive through engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : hotContent.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Flame className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p>No engaged content yet</p>
                  <p className="text-sm mt-1">Start liking, commenting, and reviewing to extend content!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hotContent.map((item, index) => {
                    const Icon = getContainerIcon(item.type);
                    const rankBadge = getRankBadge(index + 1);
                    const RankIcon = rankBadge.icon;

                    return (
                      <Link key={`${item.type}-${item.id}`} to={getContainerPath(item)}>
                        <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          {/* Rank */}
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full border ${rankBadge.bg} flex-shrink-0`}>
                            {index < 3 ? (
                              <RankIcon className={`w-6 h-6 ${rankBadge.color}`} />
                            ) : (
                              <span className="text-lg font-bold text-gray-600">{index + 1}</span>
                            )}
                          </div>

                          {/* Content Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                <h3 className="font-semibold text-gray-900 hover:text-blue-600">
                                  {item.name}
                                </h3>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {item.type.slice(0, -1)}
                                </Badge>
                              </div>
                            </div>
                            
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {item.engagement_score} pts
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-green-500" />
                                {item.engagement_extends_count} extensions
                              </span>
                              <span className="flex items-center gap-1">
                                ⏰ +{item.total_days_extended}d
                              </span>
                              {item.creator && (
                                <>
                                  <span>•</span>
                                  <span>by {item.creator.name}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Engagement Badge */}
                          <EngagementStats
                            engagementScore={item.engagement_score}
                            engagementExtendsCount={item.engagement_extends_count}
                            totalDaysExtended={item.total_days_extended}
                            variant="badge"
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Contributors Tab */}
        <TabsContent value="contributors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
              <CardDescription>
                Community members who have extended the most content through engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : topContributors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p>No contributors yet</p>
                  <p className="text-sm mt-1">Be the first to engage and extend content!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topContributors.map((contributor, index) => {
                    const rankBadge = getRankBadge(index + 1);
                    const RankIcon = rankBadge.icon;
                    const isCurrentUser = contributor.user_id === profile.id;

                    return (
                      <div 
                        key={contributor.user_id}
                        className={`flex items-center gap-4 p-4 border rounded-lg ${isCurrentUser ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
                      >
                        {/* Rank */}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full border ${rankBadge.bg} flex-shrink-0`}>
                          {index < 3 ? (
                            <RankIcon className={`w-6 h-6 ${rankBadge.color}`} />
                          ) : (
                            <span className="text-lg font-bold text-gray-600">{index + 1}</span>
                          )}
                        </div>

                        {/* User Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {contributor.avatar ? (
                            <img 
                              src={contributor.avatar} 
                              alt={contributor.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            contributor.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {contributor.name}
                              {isCurrentUser && (
                                <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                              )}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Award className="w-4 h-4 text-blue-500" />
                              {contributor.content_extended_count} items
                            </span>
                            <span className="flex items-center gap-1">
                              ⏰ +{contributor.total_days_given} days
                            </span>
                            <span className="flex items-center gap-1">
                              💫 {contributor.total_engagements} engagements
                            </span>
                          </div>
                        </div>

                        {/* Score Badge */}
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                          {contributor.total_days_given} days
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            How Engagement Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>Content on CONNEXTED LABS has a limited survival time. Your engagement extends that time:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Like/Bookmark:</strong> +2 days</li>
            <li><strong>Comment:</strong> +3 days</li>
            <li><strong>Share:</strong> +5 days</li>
            <li><strong>Review:</strong> +7 days</li>
            <li><strong>Award:</strong> +14 days</li>
          </ul>
          <p className="mt-3 text-purple-700 font-medium">
            Quality engagement keeps valuable content alive and rewards active contributors!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}