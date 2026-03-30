import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  Users, 
  UserCog, 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  Layers,
  Activity,
  UserCheck,
  Award,
  BarChart3,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import MetricCard from '@/app/components/analytics/MetricCard';
import { 
  getPlatformMetrics, 
  getEngagementTrend, 
  getUserGrowthData,
  getContainerUsageBreakdown,
} from '@/lib/analytics';
import type { PlatformMetrics, EngagementTrend } from '@/lib/analytics';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

export default function PlatformAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementTrend[]>([]);
  const [userGrowth, setUserGrowth] = useState<{ month: string; users: number }[]>([]);
  const [containerUsage, setContainerUsage] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [metricsData, engagementTrendData, userGrowthData, containerData] = await Promise.all([
        getPlatformMetrics(),
        getEngagementTrend(parseInt(timeRange)),
        getUserGrowthData(12),
        getContainerUsageBreakdown(),
      ]);

      setMetrics(metricsData);
      setEngagementData(engagementTrendData);
      setUserGrowth(userGrowthData);
      setContainerUsage(containerData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!metrics) return;

    const exportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      metrics,
      engagementData,
      userGrowth,
      containerUsage,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Analytics exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">No analytics data available</div>
      </div>
    );
  }

  const userGrowthPercentage = metrics.newUsersLastMonth > 0
    ? Math.round(((metrics.newUsersThisMonth - metrics.newUsersLastMonth) / metrics.newUsersLastMonth) * 100)
    : 0;

  const engagementRate = metrics.totalUsers > 0
    ? Math.round((metrics.monthlyActiveUsers / metrics.totalUsers) * 100)
    : 0;

  const totalContainers = Object.values(metrics.containerCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: 'Platform Dashboard', href: '/platform-admin' },
        { label: 'Analytics' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Platform Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into platform adoption and engagement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="7">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30">Last 30 Days</TabsTrigger>
          <TabsTrigger value="90">Last 90 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Key Metrics */}
      <div>
        <h2 className="text-xl mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers.toLocaleString()}
            icon={Users}
            iconColor="text-blue-600 bg-blue-50"
            trend={{
              value: userGrowthPercentage,
              label: 'vs last month',
            }}
            subtitle={`${metrics.newUsersThisMonth} new this month`}
          />
          
          <MetricCard
            title="Monthly Active Users"
            value={metrics.monthlyActiveUsers.toLocaleString()}
            icon={Activity}
            iconColor="text-green-600 bg-green-50"
            subtitle={`${engagementRate}% engagement rate`}
          />
          
          <MetricCard
            title="Total Programs"
            value={metrics.totalPrograms.toLocaleString()}
            icon={Layers}
            iconColor="text-purple-600 bg-purple-50"
            subtitle={`${totalContainers} containers`}
          />
          
          <MetricCard
            title="Platform Activity"
            value={metrics.totalPosts.toLocaleString()}
            icon={MessageSquare}
            iconColor="text-orange-600 bg-orange-50"
            subtitle={`${metrics.totalDocuments} documents`}
          />
        </div>
      </div>

      {/* Engagement Metrics */}
      <div>
        <h2 className="text-xl mb-4">Engagement Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Daily Active Users"
            value={metrics.dailyActiveUsers.toLocaleString()}
            icon={UserCheck}
            iconColor="text-teal-600 bg-teal-50"
            description="Users active in last 24 hours"
          />
          
          <MetricCard
            title="Weekly Active Users"
            value={metrics.weeklyActiveUsers.toLocaleString()}
            icon={UserCheck}
            iconColor="text-indigo-600 bg-indigo-50"
            description="Users active in last 7 days"
          />
          
          <MetricCard
            title="Total Connections"
            value={metrics.totalConnections.toLocaleString()}
            icon={Award}
            iconColor="text-pink-600 bg-pink-50"
            description="User-to-user connections"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trend</CardTitle>
            <CardDescription>Posts, comments, and active users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="posts" stroke="#3b82f6" strokeWidth={2} name="Posts" />
                <Line type="monotone" dataKey="comments" stroke="#8b5cf6" strokeWidth={2} name="Comments" />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} name="Active Users" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Total users over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="users" fill="#3b82f6" name="Total Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Container Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Container Distribution</CardTitle>
            <CardDescription>Usage breakdown by container type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={containerUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {containerUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Container Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Container Statistics</CardTitle>
            <CardDescription>Total count by container type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.containerCounts).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium capitalize">{type}</span>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to related admin areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/platform-admin/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
            </Link>
            <Link to="/platform-admin/circles">
              <Button variant="outline" className="w-full justify-start">
                <UserCog className="w-4 h-4 mr-2" />
                Manage Circles
              </Button>
            </Link>
            <Link to="/platform-admin/feed">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Content Moderation
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
