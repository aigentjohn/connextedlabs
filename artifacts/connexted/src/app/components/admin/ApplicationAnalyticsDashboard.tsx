import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Download, TrendingUp, Users, CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  total_applications: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  waitlisted: number;
  approval_rate: number;
  average_score: number;
  pending_notifications: number;
  applications_by_day: {date: string; count: number}[];
  applications_by_source: {source: string; count: number}[];
}

interface ApplicationAnalyticsDashboardProps {
  programId: string;
}

export function ApplicationAnalyticsDashboard({ programId }: ApplicationAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [programId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get all applications for this program
      const { data: applications, error } = await supabase
        .from('program_applications')
        .select('*')
        .eq('program_id', programId);

      if (error) throw error;

      // Calculate statistics
      const total = applications?.length || 0;
      const pending = applications?.filter(a => a.status === 'pending').length || 0;
      const under_review = applications?.filter(a => a.status === 'under_review').length || 0;
      const approved = applications?.filter(a => a.status === 'approved').length || 0;
      const rejected = applications?.filter(a => a.status === 'rejected').length || 0;
      const waitlisted = applications?.filter(a => a.status === 'waitlisted').length || 0;
      
      const decided = approved + rejected;
      const approval_rate = decided > 0 ? Math.round((approved / decided) * 100) : 0;
      
      const scored = applications?.filter(a => a.score != null) || [];
      const average_score = scored.length > 0
        ? Math.round(scored.reduce((sum, a) => sum + (a.score || 0), 0) / scored.length)
        : 0;

      const pending_notifications = applications?.filter(
        a => ['approved', 'rejected', 'waitlisted'].includes(a.status) && !a.notified
      ).length || 0;

      // Applications by day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentApps = applications?.filter(a => 
        new Date(a.created_at) >= thirtyDaysAgo
      ) || [];

      const appsByDay = recentApps.reduce((acc: any, app) => {
        const date = new Date(app.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const applications_by_day = Object.entries(appsByDay)
        .map(([date, count]) => ({ date, count: count as number }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Applications by source
      const appsBySource = applications?.reduce((acc: any, app) => {
        const source = app.source || 'direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}) || {};

      const applications_by_source = Object.entries(appsBySource)
        .map(([source, count]) => ({ source, count: count as number }))
        .sort((a, b) => b.count - a.count);

      setAnalytics({
        total_applications: total,
        pending,
        under_review,
        approved,
        rejected,
        waitlisted,
        approval_rate,
        average_score,
        pending_notifications,
        applications_by_day,
        applications_by_source
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const { data, error } = await supabase
        .from('program_applications')
        .select('*')
        .eq('program_id', programId);

      if (error) throw error;

      const headers = [
        'Name', 'Email', 'Phone', 'Status', 'Score', 'Flagged',
        'Reviewed By', 'Reviewed At', 'Notified', 'Applied Date', 'Source'
      ];

      const rows = (data || []).map(app => [
        app.full_name,
        app.email,
        app.phone || '',
        app.status,
        app.score || '',
        app.flagged ? 'Yes' : 'No',
        app.reviewed_by || '',
        app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : '',
        app.notified ? 'Yes' : 'No',
        new Date(app.created_at).toLocaleDateString(),
        app.source || 'direct'
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `application-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error: any) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Application Analytics</h2>
          <p className="text-muted-foreground">Overview of application metrics and trends</p>
        </div>
        <Button onClick={handleExportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-3xl">{analytics.total_applications}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>All time</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approval Rate</CardDescription>
            <CardTitle className="text-3xl">{analytics.approval_rate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-600">{analytics.approved} approved</span>
              <XCircle className="w-4 h-4 text-red-600 ml-2" />
              <span className="text-red-600">{analytics.rejected} rejected</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className="text-3xl">{analytics.average_score}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Out of 100</span>
            </div>
          </CardContent>
        </Card>

        <Card className={analytics.pending_notifications > 0 ? 'border-orange-300 bg-orange-50' : ''}>
          <CardHeader className="pb-3">
            <CardDescription>Pending Notifications</CardDescription>
            <CardTitle className="text-3xl">{analytics.pending_notifications}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Mail className="w-4 h-4" />
              <span>Need to notify</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>Current application status distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Pending Review', count: analytics.pending, color: 'bg-yellow-500', icon: Clock },
              { label: 'Under Review', count: analytics.under_review, color: 'bg-blue-500', icon: Users },
              { label: 'Approved', count: analytics.approved, color: 'bg-green-500', icon: CheckCircle },
              { label: 'Rejected', count: analytics.rejected, color: 'bg-red-500', icon: XCircle },
              { label: 'Waitlisted', count: analytics.waitlisted, color: 'bg-purple-500', icon: Clock }
            ].map(({ label, count, color, icon: Icon }) => {
              const percentage = analytics.total_applications > 0
                ? Math.round((count / analytics.total_applications) * 100)
                : 0;

              return (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Applications by Source */}
      {analytics.applications_by_source.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applications by Source</CardTitle>
            <CardDescription>Where applicants are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.applications_by_source.map(({ source, count }) => {
                const percentage = Math.round((count / analytics.total_applications) * 100);
                return (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{source}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{count} applications</span>
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Over Time */}
      {analytics.applications_by_day.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applications Over Time</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-1">
              {analytics.applications_by_day.map(({ date, count }) => {
                const maxCount = Math.max(...analytics.applications_by_day.map(d => d.count));
                const height = (count / maxCount) * 100;
                
                return (
                  <div
                    key={date}
                    className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                  >
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
