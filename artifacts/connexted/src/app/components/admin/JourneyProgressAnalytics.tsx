// Split candidate: ~500 lines — consider extracting CompletionRateChart, LearnerProgressTable, and JourneyFunnelView into sub-components.
import { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle, Clock, Award, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface Program {
  id: string;
  name: string;
  member_ids: string[];
}

interface Journey {
  id: string;
  program_id: string;
  name: string;
  description: string;
  order_index: number;
}

interface JourneyProgressData {
  journey_id: string;
  journey_name: string;
  total_items: number;
  total_attenders: number;
  completed_count: number;
  avg_completion_rate: number;
  attenders_completed: number;
  attenders_in_progress: number;
  attenders_not_started: number;
}

interface AttenderProgress {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  last_activity: string | null;
}

interface JourneyProgressAnalyticsProps {
  programId: string;
  program: Program;
  journeys: Journey[];
}

export default function JourneyProgressAnalytics({ programId, program, journeys }: JourneyProgressAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('all');
  const [journeyProgressData, setJourneyProgressData] = useState<JourneyProgressData[]>([]);
  const [attenderProgress, setAttenderProgress] = useState<AttenderProgress[]>([]);
  const [overallStats, setOverallStats] = useState({
    total_attenders: 0,
    total_journeys: 0,
    avg_completion: 0,
    active_attenders: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [programId, journeys]);

  useEffect(() => {
    if (selectedJourneyId !== 'all') {
      fetchAttenderProgress(selectedJourneyId);
    } else {
      setAttenderProgress([]);
    }
  }, [selectedJourneyId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate overall stats
      const totalAttenders = program.member_ids?.length || 0;
      const totalJourneys = journeys.length;

      setOverallStats({
        total_attenders: totalAttenders,
        total_journeys: totalJourneys,
        avg_completion: 0,
        active_attenders: 0
      });

      // Fetch journey-level progress
      const progressData: JourneyProgressData[] = [];

      for (const journey of journeys) {
        try {
          // Get total items for this journey
          const { data: items, error: itemsError } = await supabase
            .from('journey_items')
            .select('id')
            .eq('journey_id', journey.id)
            .eq('is_published', true);

          if (itemsError && itemsError.code !== 'PGRST205') throw itemsError;

          const totalItems = items?.length || 0;

          // Get completion data for this journey
          const { data: completions, error: completionsError } = await supabase
            .from('journey_item_completions')
            .select('user_id, item_id, completed')
            .eq('journey_id', journey.id)
            .eq('completed', true);

          if (completionsError && completionsError.code !== 'PGRST205') throw completionsError;

          // Calculate stats
          const userCompletions = new Map<string, number>();
          completions?.forEach(completion => {
            const count = userCompletions.get(completion.user_id) || 0;
            userCompletions.set(completion.user_id, count + 1);
          });

          const attendersCompleted = Array.from(userCompletions.values()).filter(count => count === totalItems).length;
          const attendersInProgress = Array.from(userCompletions.values()).filter(count => count > 0 && count < totalItems).length;
          const attendersNotStarted = totalAttenders - attendersCompleted - attendersInProgress;

          const totalCompletedItems = completions?.length || 0;
          const avgCompletionRate = totalItems > 0 && totalAttenders > 0
            ? (totalCompletedItems / (totalItems * totalAttenders)) * 100
            : 0;

          progressData.push({
            journey_id: journey.id,
            journey_name: journey.name,
            total_items: totalItems,
            total_attenders: totalAttenders,
            completed_count: totalCompletedItems,
            avg_completion_rate: avgCompletionRate,
            attenders_completed: attendersCompleted,
            attenders_in_progress: attendersInProgress,
            attenders_not_started: attendersNotStarted
          });
        } catch (error) {
          console.error(`Error fetching data for journey ${journey.id}:`, error);
        }
      }

      setJourneyProgressData(progressData);

      // Calculate overall avg completion
      const overallAvg = progressData.length > 0
        ? progressData.reduce((sum, data) => sum + data.avg_completion_rate, 0) / progressData.length
        : 0;

      const activeCount = progressData.reduce((sum, data) => sum + data.attenders_in_progress + data.attenders_completed, 0);

      setOverallStats(prev => ({
        ...prev,
        avg_completion: overallAvg,
        active_attenders: Math.min(activeCount, totalAttenders)
      }));

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttenderProgress = async (journeyId: string) => {
    try {
      // Get journey items
      const { data: items, error: itemsError } = await supabase
        .from('journey_items')
        .select('id')
        .eq('journey_id', journeyId)
        .eq('is_published', true);

      if (itemsError && itemsError.code !== 'PGRST205') throw itemsError;

      const totalItems = items?.length || 0;

      // Get all completions for this journey
      const { data: completions, error: completionsError } = await supabase
        .from('journey_item_completions')
        .select('user_id, item_id, completed, updated_at')
        .eq('journey_id', journeyId)
        .eq('completed', true);

      if (completionsError && completionsError.code !== 'PGRST205') throw completionsError;

      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', program.member_ids || []);

      if (profilesError) throw profilesError;

      // Calculate progress for each attender
      const progressMap = new Map<string, { completed: number; lastActivity: string | null }>();
      
      completions?.forEach(completion => {
        const current = progressMap.get(completion.user_id) || { completed: 0, lastActivity: null };
        progressMap.set(completion.user_id, {
          completed: current.completed + 1,
          lastActivity: completion.updated_at > (current.lastActivity || '')
            ? completion.updated_at
            : current.lastActivity
        });
      });

      const attenderProgressList: AttenderProgress[] = (profiles || []).map(profile => {
        const progress = progressMap.get(profile.id) || { completed: 0, lastActivity: null };
        return {
          user_id: profile.id,
          user_name: profile.name || 'Unknown',
          user_email: profile.email || '',
          user_avatar: profile.avatar_url,
          total_items: totalItems,
          completed_items: progress.completed,
          completion_percentage: totalItems > 0 ? (progress.completed / totalItems) * 100 : 0,
          last_activity: progress.lastActivity
        };
      });

      // Sort by completion percentage descending
      attenderProgressList.sort((a, b) => b.completion_percentage - a.completion_percentage);

      setAttenderProgress(attenderProgressList);
    } catch (error: any) {
      console.error('Error fetching attender progress:', error);
      toast.error('Failed to load attender progress');
    }
  };

  const exportAnalytics = () => {
    const data = {
      program_name: program.name,
      export_date: new Date().toISOString(),
      overall_stats: overallStats,
      journey_progress: journeyProgressData,
      attender_progress: selectedJourneyId !== 'all' ? attenderProgress : []
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${program.name.replace(/\s+/g, '_')}_analytics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Analytics exported successfully');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Progress & Analytics</CardTitle>
              <CardDescription>
                Track journey completion and attender progress
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportAnalytics}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Attenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallStats.total_attenders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Active Attenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{overallStats.active_attenders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Total Journeys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallStats.total_journeys}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Avg Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallStats.avg_completion.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Journey-Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Journey-Level Progress</CardTitle>
          <CardDescription>
            Completion rates for each journey in the program
          </CardDescription>
        </CardHeader>
        <CardContent>
          {journeys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No journeys to display analytics for</p>
            </div>
          ) : journeyProgressData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No progress data available yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Attenders need to start completing journey items
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {journeyProgressData.map((data, index) => (
                <div key={data.journey_id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">Journey {index + 1}</span>
                        <h4 className="font-medium">{data.journey_name}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{data.total_items} items</span>
                        <span>•</span>
                        <span>{data.completed_count} completions</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {data.avg_completion_rate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">avg completion</div>
                    </div>
                  </div>

                  <Progress value={data.avg_completion_rate} className="mb-3" />

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-bold text-green-700">{data.attenders_completed}</div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-bold text-blue-700">{data.attenders_in_progress}</div>
                      <div className="text-xs text-gray-600">In Progress</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-gray-700">{data.attenders_not_started}</div>
                      <div className="text-xs text-gray-600">Not Started</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attender-Level Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attender Progress</CardTitle>
              <CardDescription>
                Individual progress through journey content
              </CardDescription>
            </div>
            <Select value={selectedJourneyId} onValueChange={setSelectedJourneyId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a journey..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Journeys</SelectItem>
                {journeys.map((journey, index) => (
                  <SelectItem key={journey.id} value={journey.id}>
                    Journey {index + 1}: {journey.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedJourneyId === 'all' ? (
            <div className="text-center py-8 text-gray-500">
              Select a journey to view individual attender progress
            </div>
          ) : attenderProgress.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No attender progress data available for this journey
            </div>
          ) : (
            <div className="space-y-2">
              {attenderProgress.map(attender => (
                <div key={attender.user_id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                  {attender.user_avatar ? (
                    <img
                      src={attender.user_avatar}
                      alt={attender.user_name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{attender.user_name}</div>
                    <div className="text-sm text-gray-600 truncate">{attender.user_email}</div>
                  </div>
                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {attender.completed_items} / {attender.total_items} items
                      </span>
                      <span className="font-medium">
                        {attender.completion_percentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={attender.completion_percentage} />
                  </div>
                  {attender.last_activity && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(attender.last_activity).toLocaleDateString()}
                    </div>
                  )}
                  {attender.completion_percentage === 100 && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
