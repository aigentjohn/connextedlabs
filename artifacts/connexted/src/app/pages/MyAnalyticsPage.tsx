import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Eye, Users, TrendingUp, FileText, Mic, Hammer, Calendar, BarChart3, Activity } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router';

interface TopContent {
  content_type: string;
  content_id: string;
  title: string;
  view_count: number;
  unique_viewer_count: number;
  last_viewed_at: string;
}

const CONTENT_TYPE_ICONS = {
  document: FileText,
  pitch: Mic,
  build: Hammer,
  portfolio: BarChart3,
  post: Activity,
  review: Eye,
};

const CONTENT_TYPE_COLORS = {
  document: 'text-blue-600 bg-blue-50',
  pitch: 'text-purple-600 bg-purple-50',
  build: 'text-orange-600 bg-orange-50',
  portfolio: 'text-green-600 bg-green-50',
  post: 'text-pink-600 bg-pink-50',
  review: 'text-indigo-600 bg-indigo-50',
};

const CONTENT_TYPE_LABELS = {
  document: 'Document',
  pitch: 'Pitch',
  build: 'Build',
  portfolio: 'Portfolio',
  post: 'Post',
  review: 'Review',
};

export default function MyAnalyticsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topContent, setTopContent] = useState<TopContent[]>([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalContent: 0,
    uniqueViewers: 0,
    viewsThisWeek: 0,
  });

  useEffect(() => {
    if (profile) {
      loadAnalytics();
    }
  }, [profile]);

  const loadAnalytics = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Get top performing content
      const { data: topData, error: topError } = await supabase.rpc(
        'get_user_most_viewed_content',
        {
          p_user_id: profile.id,
          p_limit: 20,
        }
      );

      if (topError) throw topError;

      setTopContent(topData || []);

      // Calculate aggregate stats
      const totalViews = topData?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0;
      const uniqueViewersSet = new Set<number>();
      topData?.forEach((item) => {
        if (item.unique_viewer_count) {
          uniqueViewersSet.add(item.unique_viewer_count);
        }
      });

      setStats({
        totalViews,
        totalContent: topData?.length || 0,
        uniqueViewers: Array.from(uniqueViewersSet).reduce((a, b) => a + b, 0),
        viewsThisWeek: 0, // This would need more complex calculation
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getContentUrl = (contentType: string, contentId: string): string => {
    const routes: Record<string, string> = {
      document: `/documents/${contentId}`,
      pitch: `/pitches/${contentId}`,
      build: `/builds/${contentId}`,
      portfolio: `/portfolio/${contentId}`,
      post: `/posts/${contentId}`,
      review: `/reviews/${contentId}`,
    };
    return routes[contentType] || '#';
  };

  if (!profile) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Analytics' }]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Analytics</h1>
          <p className="text-gray-600 mt-1">
            Track performance and engagement across your content
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Content Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalContent}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Viewers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueViewers}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Views/Item</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalContent > 0
                    ? Math.round(stats.totalViews / stats.totalContent)
                    : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Your most viewed content ranked by total views</CardDescription>
        </CardHeader>
        <CardContent>
          {topContent.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics yet</h3>
              <p className="text-gray-600 mb-6">
                Create and share content to start tracking performance
              </p>
              <Button asChild>
                <Link to="/documents/new">Create Your First Document</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {topContent.map((item, index) => {
                const Icon = CONTENT_TYPE_ICONS[item.content_type as keyof typeof CONTENT_TYPE_ICONS] || FileText;
                const colorClass = CONTENT_TYPE_COLORS[item.content_type as keyof typeof CONTENT_TYPE_COLORS] || 'text-gray-600 bg-gray-50';
                const label = CONTENT_TYPE_LABELS[item.content_type as keyof typeof CONTENT_TYPE_LABELS] || 'Content';

                return (
                  <Link
                    key={item.content_id}
                    to={getContentUrl(item.content_type, item.content_id)}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                      {/* Rank */}
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0
                              ? 'bg-yellow-500 text-white'
                              : index === 1
                              ? 'bg-gray-300 text-gray-700'
                              : index === 2
                              ? 'bg-orange-300 text-orange-900'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                      </div>

                      {/* Icon & Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1.5 rounded ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          Last viewed {formatDistanceToNow(new Date(item.last_viewed_at), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-gray-900 font-semibold">
                            <Eye className="w-4 h-4 text-gray-400" />
                            {item.view_count.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">views</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-gray-900 font-semibold">
                            <Users className="w-4 h-4 text-gray-400" />
                            {item.unique_viewer_count || 0}
                          </div>
                          <div className="text-xs text-gray-500">viewers</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance by Content Type */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Content Type</CardTitle>
          <CardDescription>How your different content types are performing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(
              topContent.reduce((acc, item) => {
                if (!acc[item.content_type]) {
                  acc[item.content_type] = { count: 0, views: 0, viewers: 0 };
                }
                acc[item.content_type].count++;
                acc[item.content_type].views += item.view_count || 0;
                acc[item.content_type].viewers += item.unique_viewer_count || 0;
                return acc;
              }, {} as Record<string, { count: number; views: number; viewers: number }>)
            ).map(([type, data]) => {
              const Icon = CONTENT_TYPE_ICONS[type as keyof typeof CONTENT_TYPE_ICONS] || FileText;
              const colorClass = CONTENT_TYPE_COLORS[type as keyof typeof CONTENT_TYPE_COLORS] || 'text-gray-600 bg-gray-50';
              const label = CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] || 'Content';

              return (
                <div
                  key={type}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{label}</h4>
                      <p className="text-xs text-gray-500">{data.count} items</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Views</span>
                      <span className="font-semibold text-gray-900">{data.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unique Viewers</span>
                      <span className="font-semibold text-gray-900">{data.viewers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Views/Item</span>
                      <span className="font-semibold text-gray-900">
                        {data.count > 0 ? Math.round(data.views / data.count) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
