import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  Users, 
  Share2, 
  TrendingUp,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Github,
  Globe,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { fetchJSON, isNetworkError } from '@/lib/fetch-wrapper';

interface SocialStats {
  total_users: number;
  users_with_any_social_link: number;
  users_sharing_social_links: number;
  platform_counts: {
    linkedin: number;
    twitter: number;
    facebook: number;
    instagram: number;
    github: number;
    website: number;
    calendly: number;
  };
  users_by_platform: {
    [key: string]: Array<{
      id: string;
      name: string;
      link: string;
      sharing: boolean;
    }>;
  };
}

const platformIcons: Record<string, any> = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  github: Github,
  website: Globe,
  calendly: Calendar,
};

const platformColors: Record<string, string> = {
  linkedin: 'text-blue-600',
  twitter: 'text-sky-500',
  facebook: 'text-blue-700',
  instagram: 'text-pink-600',
  github: 'text-gray-800',
  website: 'text-indigo-600',
  calendly: 'text-teal-600',
};

export default function SocialStatsPage() {
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await fetchJSON<{success: boolean; stats: SocialStats; error?: string}>(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/stats/social-links`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (error: any) {
      console.error('Error fetching social stats:', error);
      // Only show toast for non-network errors
      if (!isNetworkError(error)) {
        toast.error('Failed to load social media statistics');
      } else {
        console.warn('Network issue accessing social stats endpoint - edge function may not be deployed');
      }
      // Set empty stats so page still renders
      setStats({
        total_users: 0,
        users_with_any_social_link: 0,
        users_sharing_social_links: 0,
        platform_counts: {
          linkedin: 0,
          twitter: 0,
          facebook: 0,
          instagram: 0,
          github: 0,
          website: 0,
          calendly: 0,
        },
        users_by_platform: {},
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Breadcrumbs items={[
          { label: 'Members', path: '/members' },
          { label: 'Social Stats', path: '/members/social-stats' },
        ]} />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Breadcrumbs items={[
          { label: 'Members', path: '/members' },
          { label: 'Social Stats', path: '/members/social-stats' },
        ]} />
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No statistics available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adoptionRate = stats.total_users > 0 
    ? ((stats.users_with_any_social_link / stats.total_users) * 100).toFixed(1)
    : '0.0';

  const sharingRate = stats.total_users > 0
    ? ((stats.users_sharing_social_links / stats.total_users) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Breadcrumbs items={[
        { label: 'Members', path: '/members' },
        { label: 'Social Stats', path: '/members/social-stats' },
      ]} />

      <div className="mt-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Share2 className="w-8 h-8 text-purple-600" />
            Social Media Statistics
          </h1>
          <p className="text-gray-600 mt-2">
            Overview of social media profile adoption across the platform
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <p className="text-3xl font-bold">{stats.total_users}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Added Social Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <p className="text-3xl font-bold">{stats.users_with_any_social_link}</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {adoptionRate}% of members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Publicly Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <p className="text-3xl font-bold">{stats.users_sharing_social_links}</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {sharingRate}% of members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Keeping Private
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-gray-500" />
                <p className="text-3xl font-bold">
                  {stats.users_with_any_social_link - stats.users_sharing_social_links}
                </p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Added but not sharing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>
              Number of members who have added each platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(stats.platform_counts).map(([platform, count]) => {
                const Icon = platformIcons[platform];
                const colorClass = platformColors[platform];
                const platformUsers = stats.users_by_platform[platform] || [];
                const sharingCount = platformUsers.filter(u => u.sharing).length;
                
                return (
                  <Card key={platform} className="relative overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-6 h-6 ${colorClass}`} />
                        <Badge variant={count > 0 ? 'default' : 'secondary'}>
                          {count} {count === 1 ? 'member' : 'members'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold capitalize mb-1">{platform}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Eye className="w-4 h-4" />
                        <span>{sharingCount} sharing publicly</span>
                      </div>
                      {count > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {platformUsers.slice(0, 5).map(user => (
                              <div key={user.id} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-700">{user.name}</span>
                                {user.sharing ? (
                                  <Eye className="w-3 h-3 text-green-600" />
                                ) : (
                                  <EyeOff className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            ))}
                            {platformUsers.length > 5 && (
                              <p className="text-xs text-gray-500 pt-1">
                                +{platformUsers.length - 5} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.users_with_any_social_link === 0 ? (
              <div className="text-gray-600 py-4">
                <p className="font-medium mb-2">No social links added yet</p>
                <p className="text-sm">
                  Encourage members to add their social media profiles in Edit Profile → Social Links
                </p>
              </div>
            ) : (
              <>
                {adoptionRate === '100.0' ? (
                  <p className="text-green-700">
                    🎉 <strong>Excellent!</strong> All members have added social links!
                  </p>
                ) : parseFloat(adoptionRate) >= 75 ? (
                  <p className="text-green-700">
                    ✅ <strong>Great adoption!</strong> {adoptionRate}% of members have added social links.
                  </p>
                ) : parseFloat(adoptionRate) >= 50 ? (
                  <p className="text-blue-700">
                    📈 <strong>Good progress!</strong> {adoptionRate}% of members have added social links.
                  </p>
                ) : parseFloat(adoptionRate) >= 25 ? (
                  <p className="text-orange-700">
                    📊 <strong>Growing adoption.</strong> {adoptionRate}% of members have added social links.
                  </p>
                ) : (
                  <p className="text-gray-700">
                    💡 <strong>Early days.</strong> Only {adoptionRate}% of members have added social links. Consider promoting the feature!
                  </p>
                )}

                {stats.users_sharing_social_links < stats.users_with_any_social_link && (
                  <p className="text-gray-700">
                    👀 <strong>Privacy Note:</strong>{' '}
                    {stats.users_with_any_social_link - stats.users_sharing_social_links} members have added 
                    links but chosen to keep them private.
                  </p>
                )}

                {Object.entries(stats.platform_counts).length > 0 && (
                  <p className="text-gray-700">
                    🏆 <strong>Most Popular:</strong>{' '}
                    {Object.entries(stats.platform_counts)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .filter(([, count]) => count > 0)
                      .map(([platform, count]) => (
                        <Badge key={platform} variant="secondary" className="ml-1 capitalize">
                          {platform} ({count})
                        </Badge>
                      ))}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}