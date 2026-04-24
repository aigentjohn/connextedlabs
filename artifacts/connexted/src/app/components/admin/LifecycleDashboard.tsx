/**
 * Lifecycle Dashboard - Admin View
 * Shows engagement metrics across all container types
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Activity, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

interface LifecycleMetrics {
  entity_type: string;
  lifecycle_state: string;
  count: number;
  avg_members: number;
  avg_posts: number;
}

interface ContainerTypeStats {
  type: string;
  total: number;
  byState: Record<string, number>;
  avgMembers: number;
  avgActivity: number;
}

export default function LifecycleDashboard() {
  const [metrics, setMetrics] = useState<LifecycleMetrics[]>([]);
  const [stats, setStats] = useState<ContainerTypeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Fetch aggregated metrics
      const { data, error } = await supabase.rpc('get_lifecycle_metrics');
      
      // If RPC doesn't exist, fall back to direct query
      if (error) {
        const { data: rawData } = await supabase
          .from('entity_lifecycle_states')
          .select('*');
        
        if (rawData) {
          processMetrics(rawData);
        }
      } else if (data) {
        setMetrics(data);
        processStats(data);
      }
    } catch (error) {
      console.error('Error fetching lifecycle metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMetrics = (rawData: any[]) => {
    // Group by entity_type and lifecycle_state
    const grouped: Record<string, Record<string, any[]>> = {};
    
    rawData.forEach(item => {
      if (!grouped[item.entity_type]) {
        grouped[item.entity_type] = {};
      }
      if (!grouped[item.entity_type][item.lifecycle_state]) {
        grouped[item.entity_type][item.lifecycle_state] = [];
      }
      grouped[item.entity_type][item.lifecycle_state].push(item);
    });

    // Calculate aggregates
    const aggregated: LifecycleMetrics[] = [];
    
    Object.entries(grouped).forEach(([entityType, states]) => {
      Object.entries(states).forEach(([state, items]) => {
        const avgMembers = items.reduce((sum, i) => sum + (i.member_count || 0), 0) / items.length;
        const avgPosts = items.reduce((sum, i) => sum + (i.posts_last_30_days || 0), 0) / items.length;
        
        aggregated.push({
          entity_type: entityType,
          lifecycle_state: state,
          count: items.length,
          avg_members: Math.round(avgMembers),
          avg_posts: Math.round(avgPosts),
        });
      });
    });

    setMetrics(aggregated);
    processStats(aggregated);
  };

  const processStats = (metricsData: LifecycleMetrics[]) => {
    const containerTypes = new Set(metricsData.map(m => m.entity_type));
    
    const statsData: ContainerTypeStats[] = [];
    
    containerTypes.forEach(type => {
      const typeMetrics = metricsData.filter(m => m.entity_type === type);
      const total = typeMetrics.reduce((sum, m) => sum + m.count, 0);
      
      const byState: Record<string, number> = {};
      typeMetrics.forEach(m => {
        byState[m.lifecycle_state] = m.count;
      });
      
      const avgMembers = Math.round(
        typeMetrics.reduce((sum, m) => sum + m.avg_members * m.count, 0) / total
      );
      
      const avgActivity = Math.round(
        typeMetrics.reduce((sum, m) => sum + m.avg_posts * m.count, 0) / total
      );
      
      statsData.push({
        type,
        total,
        byState,
        avgMembers,
        avgActivity,
      });
    });

    setStats(statsData.sort((a, b) => b.total - a.total));
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'engaged': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'released': return 'bg-cyan-100 text-cyan-800';
      case 'created': return 'bg-gray-100 text-gray-800';
      case 'idea': return 'bg-purple-100 text-purple-800';
      case 'stale': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateEmoji = (state: string) => {
    switch (state) {
      case 'engaged': return '💚';
      case 'active': return '🟢';
      case 'released': return '🟢';
      case 'created': return '🔵';
      case 'idea': return '🟣';
      case 'stale': return '🟠';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading lifecycle metrics...</div>
      </div>
    );
  }

  const totalContainers = stats.reduce((sum, s) => sum + s.total, 0);
  const engagedCount = stats.reduce((sum, s) => sum + (s.byState['engaged'] || 0), 0);
  const staleCount = stats.reduce((sum, s) => sum + (s.byState['stale'] || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lifecycle Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor engagement and health across all containers</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Containers</p>
                <p className="text-3xl font-bold">{totalContainers}</p>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Engaged</p>
                <p className="text-3xl font-bold text-green-600">{engagedCount}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stale</p>
                <p className="text-3xl font-bold text-orange-600">{staleCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Health Rate</p>
                <p className="text-3xl font-bold">
                  {totalContainers > 0 ? Math.round((engagedCount / totalContainers) * 100) : 0}%
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Container Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(stat => (
          <Card key={stat.type}>
            <CardHeader>
              <CardTitle className="capitalize">{stat.type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-bold">{stat.total}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Members</span>
                  <span className="font-bold">{stat.avgMembers}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Posts/Month</span>
                  <span className="font-bold">{stat.avgActivity}</span>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-600 mb-2">By State</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stat.byState)
                      .sort(([, a], [, b]) => b - a)
                      .map(([state, count]) => (
                        <Badge key={state} className={getStateBadgeColor(state)}>
                          {getStateEmoji(state)} {state}: {count}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Container Type</th>
                  <th className="text-left p-2">State</th>
                  <th className="text-right p-2">Count</th>
                  <th className="text-right p-2">Avg Members</th>
                  <th className="text-right p-2">Avg Posts (30d)</th>
                </tr>
              </thead>
              <tbody>
                {metrics
                  .sort((a, b) => b.count - a.count)
                  .map((metric, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 capitalize">{metric.entity_type}</td>
                      <td className="p-2">
                        <Badge className={getStateBadgeColor(metric.lifecycle_state)}>
                          {getStateEmoji(metric.lifecycle_state)} {metric.lifecycle_state}
                        </Badge>
                      </td>
                      <td className="text-right p-2">{metric.count}</td>
                      <td className="text-right p-2">{metric.avg_members}</td>
                      <td className="text-right p-2">{metric.avg_posts}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
