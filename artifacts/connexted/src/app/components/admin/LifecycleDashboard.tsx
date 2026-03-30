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
      <div className=\"flex items-center justify-center h-64\">\n        <div className=\"text-gray-600\">Loading lifecycle metrics...</div>\n      </div>\n    );\n  }\n\n  const totalContainers = stats.reduce((sum, s) => sum + s.total, 0);\n  const engagedCount = stats.reduce((sum, s) => sum + (s.byState['engaged'] || 0), 0);\n  const staleCount = stats.reduce((sum, s) => sum + (s.byState['stale'] || 0), 0);\n\n  return (\n    <div className=\"space-y-6\">\n      {/* Header */}\n      <div>\n        <h1 className=\"text-3xl font-bold text-gray-900\">Lifecycle Dashboard</h1>\n        <p className=\"text-gray-600 mt-2\">Monitor engagement and health across all containers</p>\n      </div>\n\n      {/* Overall Stats */}\n      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">\n        <Card>\n          <CardContent className=\"pt-6\">\n            <div className=\"flex items-center justify-between\">\n              <div>\n                <p className=\"text-sm text-gray-600\">Total Containers</p>\n                <p className=\"text-3xl font-bold\">{totalContainers}</p>\n              </div>\n              <Activity className=\"w-8 h-8 text-gray-400\" />\n            </div>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardContent className=\"pt-6\">\n            <div className=\"flex items-center justify-between\">\n              <div>\n                <p className=\"text-sm text-gray-600\">Engaged</p>\n                <p className=\"text-3xl font-bold text-green-600\">{engagedCount}</p>\n              </div>\n              <TrendingUp className=\"w-8 h-8 text-green-400\" />\n            </div>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardContent className=\"pt-6\">\n            <div className=\"flex items-center justify-between\">\n              <div>\n                <p className=\"text-sm text-gray-600\">Stale</p>\n                <p className=\"text-3xl font-bold text-orange-600\">{staleCount}</p>\n              </div>\n              <AlertCircle className=\"w-8 h-8 text-orange-400\" />\n            </div>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardContent className=\"pt-6\">\n            <div className=\"flex items-center justify-between\">\n              <div>\n                <p className=\"text-sm text-gray-600\">Health Rate</p>\n                <p className=\"text-3xl font-bold\">\n                  {totalContainers > 0 ? Math.round((engagedCount / totalContainers) * 100) : 0}%\n                </p>\n              </div>\n              <Users className=\"w-8 h-8 text-blue-400\" />\n            </div>\n          </CardContent>\n        </Card>\n      </div>\n\n      {/* Container Type Breakdown */}\n      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">\n        {stats.map(stat => (\n          <Card key={stat.type}>\n            <CardHeader>\n              <CardTitle className=\"capitalize\">{stat.type}</CardTitle>\n            </CardHeader>\n            <CardContent>\n              <div className=\"space-y-4\">\n                <div className=\"flex justify-between items-center\">\n                  <span className=\"text-sm text-gray-600\">Total</span>\n                  <span className=\"font-bold\">{stat.total}</span>\n                </div>\n                \n                <div className=\"flex justify-between items-center\">\n                  <span className=\"text-sm text-gray-600\">Avg Members</span>\n                  <span className=\"font-bold\">{stat.avgMembers}</span>\n                </div>\n                \n                <div className=\"flex justify-between items-center\">\n                  <span className=\"text-sm text-gray-600\">Avg Posts/Month</span>\n                  <span className=\"font-bold\">{stat.avgActivity}</span>\n                </div>\n\n                <div className=\"pt-2 border-t\">\n                  <p className=\"text-xs text-gray-600 mb-2\">By State</p>\n                  <div className=\"flex flex-wrap gap-2\">\n                    {Object.entries(stat.byState)\n                      .sort(([, a], [, b]) => b - a)\n                      .map(([state, count]) => (\n                        <Badge key={state} className={getStateBadgeColor(state)}>\n                          {getStateEmoji(state)} {state}: {count}\n                        </Badge>\n                      ))}\n                  </div>\n                </div>\n              </div>\n            </CardContent>\n          </Card>\n        ))}\n      </div>\n\n      {/* Detailed Metrics Table */}\n      <Card>\n        <CardHeader>\n          <CardTitle>Detailed Metrics</CardTitle>\n        </CardHeader>\n        <CardContent>\n          <div className=\"overflow-x-auto\">\n            <table className=\"w-full\">\n              <thead>\n                <tr className=\"border-b\">\n                  <th className=\"text-left p-2\">Container Type</th>\n                  <th className=\"text-left p-2\">State</th>\n                  <th className=\"text-right p-2\">Count</th>\n                  <th className=\"text-right p-2\">Avg Members</th>\n                  <th className=\"text-right p-2\">Avg Posts (30d)</th>\n                </tr>\n              </thead>\n              <tbody>\n                {metrics\n                  .sort((a, b) => b.count - a.count)\n                  .map((metric, index) => (\n                    <tr key={index} className=\"border-b hover:bg-gray-50\">\n                      <td className=\"p-2 capitalize\">{metric.entity_type}</td>\n                      <td className=\"p-2\">\n                        <Badge className={getStateBadgeColor(metric.lifecycle_state)}>\n                          {getStateEmoji(metric.lifecycle_state)} {metric.lifecycle_state}\n                        </Badge>\n                      </td>\n                      <td className=\"text-right p-2\">{metric.count}</td>\n                      <td className=\"text-right p-2\">{metric.avg_members}</td>\n                      <td className=\"text-right p-2\">{metric.avg_posts}</td>\n                    </tr>\n                  ))}\n              </tbody>\n            </table>\n          </div>\n        </CardContent>\n      </Card>\n    </div>\n  );\n}
