import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  CheckCircle,
  Circle as CircleIcon,
  Download,
  Target,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import MetricCard from '@/app/components/analytics/MetricCard';
import { getProgramMetrics } from '@/lib/analytics';
import type { ProgramMetrics } from '@/lib/analytics';
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
import { supabase } from '@/lib/supabase';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

export default function ProgramAnalyticsDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [program, setProgram] = useState<any>(null);
  const [metrics, setMetrics] = useState<ProgramMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadProgramAndAnalytics();
    }
  }, [slug]);

  const loadProgramAndAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch program details
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (programError) throw programError;
      setProgram(programData);

      // Fetch analytics
      const metricsData = await getProgramMetrics(programData.id);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading program analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!metrics || !program) return;

    const exportData = {
      program: {
        name: program.name,
        slug: program.slug,
      },
      generatedAt: new Date().toISOString(),
      metrics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${program.slug}-analytics-${new Date().toISOString().split('T')[0]}.json`;
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

  if (!metrics || !program) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">No analytics data available</div>
      </div>
    );
  }

  const journeyCompletionRate = metrics.journeyCount > 0
    ? Math.round((metrics.completedJourneys / metrics.journeyCount) * 100)
    : 0;

  const memberEngagementRate = metrics.totalMembers > 0
    ? Math.round((metrics.activeMembers / metrics.totalMembers) * 100)
    : 0;

  const journeyStatusData = [
    { name: 'Completed', value: metrics.completedJourneys, color: '#10b981' },
    { name: 'In Progress', value: metrics.inProgressJourneys, color: '#3b82f6' },
    { name: 'Not Started', value: metrics.notStartedJourneys, color: '#9ca3af' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">{program.name} - Analytics</h1>
          <p className="text-gray-600">Program performance metrics and engagement insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Link to={`/programs/${slug}`}>
            <Button variant="outline">Back to Program</Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="text-xl mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Members"
            value={metrics.totalMembers.toLocaleString()}
            icon={Users}
            iconColor="text-blue-600 bg-blue-50"
            subtitle={`${metrics.activeMembers} active (${memberEngagementRate}%)`}
          />
          
          <MetricCard
            title="Journey Progress"
            value={`${journeyCompletionRate}%`}
            icon={Target}
            iconColor="text-green-600 bg-green-50"
            subtitle={`${metrics.completedJourneys}/${metrics.journeyCount} completed`}
          />
          
          <MetricCard
            title="Total Containers"
            value={metrics.totalContainers.toLocaleString()}
            icon={Layers}
            iconColor="text-purple-600 bg-purple-50"
            subtitle={`${metrics.containerEngagement.length} types active`}
          />
          
          <MetricCard
            title="Member Activity"
            value={metrics.memberActivity.posts.toLocaleString()}
            icon={MessageSquare}
            iconColor="text-orange-600 bg-orange-50"
            subtitle={`${metrics.memberActivity.comments} comments`}
          />
        </div>
      </div>

      {/* Journey Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Status Overview</CardTitle>
          <CardDescription>Progress tracking across all program journeys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 border rounded-lg bg-green-50">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-900">Completed</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{metrics.completedJourneys}</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">In Progress</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{metrics.inProgressJourneys}</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-center mb-2">
                <CircleIcon className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Not Started</span>
              </div>
              <p className="text-3xl font-bold text-gray-600">{metrics.notStartedJourneys}</p>
            </div>
          </div>

          {journeyStatusData.length > 0 && (
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={journeyStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {journeyStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Growth */}
        {metrics.memberGrowthData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Member Growth</CardTitle>
              <CardDescription>Cumulative member enrollment over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.memberGrowthData}>
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
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Members" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Container Engagement */}
        {metrics.containerEngagement.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Container Engagement</CardTitle>
              <CardDescription>Member participation by container type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.containerEngagement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Containers" />
                  <Bar dataKey="members" fill="#10b981" name="Participants" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Container Details */}
      {metrics.containerEngagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Container Details</CardTitle>
            <CardDescription>Detailed breakdown of container usage and participation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.containerEngagement.map((container) => (
                <div key={container.type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium capitalize">{container.type}</h3>
                    <Badge variant="outline">{container.count} containers</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{container.members} unique participants</span>
                    <span>
                      {metrics.totalMembers > 0 
                        ? Math.round((container.members / metrics.totalMembers) * 100)
                        : 0}% member reach
                    </span>
                  </div>
                  <Progress 
                    value={metrics.totalMembers > 0 ? (container.members / metrics.totalMembers) * 100 : 0} 
                    className="mt-2" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>Content creation and engagement statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 border rounded-lg">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold mb-1">{metrics.memberActivity.posts}</p>
              <p className="text-sm text-gray-600">Total Posts</p>
            </div>
            
            <div className="text-center p-6 border rounded-lg">
              <Activity className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-3xl font-bold mb-1">{metrics.memberActivity.comments}</p>
              <p className="text-sm text-gray-600">Total Comments</p>
            </div>
            
            <div className="text-center p-6 border rounded-lg">
              <FileText className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="text-3xl font-bold mb-1">{metrics.memberActivity.documents}</p>
              <p className="text-sm text-gray-600">Total Documents</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Insights</CardTitle>
          <CardDescription>Key takeaways and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {memberEngagementRate < 30 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">
                  <strong>Low Engagement:</strong> Only {memberEngagementRate}% of members are active. Consider sending engagement reminders or creating incentives for participation.
                </p>
              </div>
            )}
            
            {journeyCompletionRate < 30 && metrics.journeyCount > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>Journey Completion:</strong> {journeyCompletionRate}% completion rate. Review journey complexity and provide additional support for members.
                </p>
              </div>
            )}
            
            {metrics.totalContainers === 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>No Containers:</strong> This program doesn't have any active containers. Add containers to enable specific workflows and activities.
                </p>
              </div>
            )}
            
            {memberEngagementRate >= 50 && journeyCompletionRate >= 50 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  <strong>Great Performance:</strong> This program has strong engagement ({memberEngagementRate}%) and completion rates ({journeyCompletionRate}%). Keep up the excellent work!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
