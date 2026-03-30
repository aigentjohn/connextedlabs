// Split candidate: ~410 lines — consider separating ContentAnalytics, MemberAnalytics, and EngagementAnalytics into focused modules.
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfDay, subDays, format } from 'date-fns';

export interface PlatformMetrics {
  totalUsers: number;
  totalCircles: number;
  totalPrograms: number;
  totalPosts: number;
  totalDocuments: number;
  totalConnections: number;
  monthlyActiveUsers: number;
  weeklyActiveUsers: number;
  dailyActiveUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  containerCounts: {
    tables: number;
    elevators: number;
    meetings: number;
    pitches: number;
    builds: number;
    standups: number;
    meetups: number;
    sprints: number;
  };
}

export interface ProgramMetrics {
  totalMembers: number;
  activeMembers: number;
  journeyCount: number;
  completedJourneys: number;
  inProgressJourneys: number;
  notStartedJourneys: number;
  totalContainers: number;
  containerEngagement: {
    type: string;
    count: number;
    members: number;
  }[];
  memberActivity: {
    posts: number;
    comments: number;
    documents: number;
  };
  memberGrowthData: {
    date: string;
    count: number;
  }[];
}

export interface EngagementTrend {
  date: string;
  posts: number;
  comments: number;
  users: number;
}

export interface UserRetentionData {
  cohort: string;
  day7: number;
  day30: number;
  day90: number;
}

/**
 * Get comprehensive platform-level metrics
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  try {
    const now = new Date();
    const monthAgo = subMonths(now, 1);
    const weekAgo = subWeeks(now, 1);
    const dayAgo = subDays(now, 1);
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Fetch all counts in parallel
    const [
      usersResult,
      circlesResult,
      programsResult,
      postsResult,
      documentsResult,
      connectionsResult,
      mauResult,
      wauResult,
      dauResult,
      newUsersThisMonthResult,
      newUsersLastMonthResult,
      tablesResult,
      elevatorsResult,
      meetingsResult,
      pitchesResult,
      buildsResult,
      standupsResult,
      meetupsResult,
      sprintsResult,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('circles').select('id', { count: 'exact', head: true }),
      supabase.from('programs').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('user_connections').select('id', { count: 'exact', head: true }),
      // MAU: users who posted or commented in last 30 days
      supabase.from('posts').select('author_id').gte('created_at', monthAgo.toISOString()),
      // WAU: users who posted or commented in last 7 days
      supabase.from('posts').select('author_id').gte('created_at', weekAgo.toISOString()),
      // DAU: users who posted or commented in last 24 hours
      supabase.from('posts').select('author_id').gte('created_at', dayAgo.toISOString()),
      // New users this month
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart.toISOString()),
      // New users last month
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString()),
      // Container counts
      supabase.from('tables').select('id', { count: 'exact', head: true }),
      supabase.from('elevators').select('id', { count: 'exact', head: true }),
      supabase.from('meetings').select('id', { count: 'exact', head: true }),
      supabase.from('pitches').select('id', { count: 'exact', head: true }),
      supabase.from('builds').select('id', { count: 'exact', head: true }),
      supabase.from('standups').select('id', { count: 'exact', head: true }),
      supabase.from('meetups').select('id', { count: 'exact', head: true }),
      supabase.from('sprints').select('id', { count: 'exact', head: true }),
    ]);

    // Calculate unique active users
    const mauUsers = new Set(mauResult.data?.map((p: any) => p.author_id) || []);
    const wauUsers = new Set(wauResult.data?.map((p: any) => p.author_id) || []);
    const dauUsers = new Set(dauResult.data?.map((p: any) => p.author_id) || []);

    return {
      totalUsers: usersResult.count || 0,
      totalCircles: circlesResult.count || 0,
      totalPrograms: programsResult.count || 0,
      totalPosts: postsResult.count || 0,
      totalDocuments: documentsResult.count || 0,
      totalConnections: connectionsResult.count || 0,
      monthlyActiveUsers: mauUsers.size,
      weeklyActiveUsers: wauUsers.size,
      dailyActiveUsers: dauUsers.size,
      newUsersThisMonth: newUsersThisMonthResult.count || 0,
      newUsersLastMonth: newUsersLastMonthResult.count || 0,
      containerCounts: {
        tables: tablesResult.count || 0,
        elevators: elevatorsResult.count || 0,
        meetings: meetingsResult.count || 0,
        pitches: pitchesResult.count || 0,
        builds: buildsResult.count || 0,
        standups: standupsResult.count || 0,
        meetups: meetupsResult.count || 0,
        sprints: sprintsResult.count || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    throw error;
  }
}

/**
 * Get engagement trend data over the last N days
 */
export async function getEngagementTrend(days: number = 30): Promise<EngagementTrend[]> {
  try {
    const startDate = subDays(new Date(), days);
    
    // Get posts by day
    const { data: posts } = await supabase
      .from('posts')
      .select('created_at, author_id')
      .gte('created_at', startDate.toISOString());

    // Get comments by day
    const { data: comments } = await supabase
      .from('post_comments')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    // Group by date
    const trendMap: Record<string, { posts: number; comments: number; users: Set<string> }> = {};
    
    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - i - 1), 'yyyy-MM-dd');
      trendMap[date] = { posts: 0, comments: 0, users: new Set() };
    }

    // Aggregate posts
    posts?.forEach((post: any) => {
      const date = format(new Date(post.created_at), 'yyyy-MM-dd');
      if (trendMap[date]) {
        trendMap[date].posts++;
        trendMap[date].users.add(post.author_id);
      }
    });

    // Aggregate comments
    comments?.forEach((comment: any) => {
      const date = format(new Date(comment.created_at), 'yyyy-MM-dd');
      if (trendMap[date]) {
        trendMap[date].comments++;
      }
    });

    // Convert to array
    return Object.entries(trendMap).map(([date, data]) => ({
      date,
      posts: data.posts,
      comments: data.comments,
      users: data.users.size,
    }));
  } catch (error) {
    console.error('Error fetching engagement trend:', error);
    return [];
  }
}

/**
 * Get program-specific metrics
 */
export async function getProgramMetrics(programId: string): Promise<ProgramMetrics> {
  try {
    // Get program memberships
    const { data: memberships } = await supabase
      .from('program_memberships')
      .select('user_id, created_at')
      .eq('program_id', programId);

    const totalMembers = memberships?.length || 0;

    // Get journeys for this program
    const { data: journeys } = await supabase
      .from('program_journeys')
      .select('id, status')
      .eq('program_id', programId);

    const journeyCount = journeys?.length || 0;
    const completedJourneys = journeys?.filter(j => j.status === 'completed').length || 0;
    const inProgressJourneys = journeys?.filter(j => j.status === 'in-progress').length || 0;
    const notStartedJourneys = journeys?.filter(j => j.status === 'not-started').length || 0;

    // Get all containers linked to this program
    const containerTypes = ['tables', 'elevators', 'meetings', 'pitches', 'builds', 'standups', 'meetups', 'sprints'];
    const containerEngagement: { type: string; count: number; members: number }[] = [];
    let totalContainers = 0;

    for (const type of containerTypes) {
      const { data: containers } = await supabase
        .from(type)
        .select('id, member_ids')
        .eq('program_id', programId);

      if (containers && containers.length > 0) {
        const count = containers.length;
        const allMembers = new Set<string>();
        containers.forEach(c => {
          (c.member_ids || []).forEach((id: string) => allMembers.add(id));
        });

        containerEngagement.push({
          type,
          count,
          members: allMembers.size,
        });
        totalContainers += count;
      }
    }

    // Get member activity (posts, comments, documents)
    const { data: programCircle } = await supabase
      .from('programs')
      .select('circle_id')
      .eq('id', programId)
      .single();

    let memberActivity = { posts: 0, comments: 0, documents: 0 };

    if (programCircle?.circle_id) {
      const [postsResult, commentsResult, documentsResult] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('circle_id', programCircle.circle_id),
        supabase.from('post_comments').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('circle_id', programCircle.circle_id),
      ]);

      memberActivity = {
        posts: postsResult.count || 0,
        comments: commentsResult.count || 0,
        documents: documentsResult.count || 0,
      };
    }

    // Calculate member growth over time
    const memberGrowthData: { date: string; count: number }[] = [];
    if (memberships) {
      const grouped: Record<string, number> = {};
      
      memberships.forEach((m: any) => {
        const date = format(new Date(m.created_at), 'yyyy-MM-dd');
        grouped[date] = (grouped[date] || 0) + 1;
      });

      // Convert to cumulative
      let cumulative = 0;
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, count]) => {
          cumulative += count;
          memberGrowthData.push({ date, count: cumulative });
        });
    }

    // Calculate active members (posted/commented in last 30 days)
    const monthAgo = subMonths(new Date(), 1);
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('author_id')
      .eq('circle_id', programCircle?.circle_id || '')
      .gte('created_at', monthAgo.toISOString());

    const activeMembers = new Set(recentPosts?.map((p: any) => p.author_id) || []).size;

    return {
      totalMembers,
      activeMembers,
      journeyCount,
      completedJourneys,
      inProgressJourneys,
      notStartedJourneys,
      totalContainers,
      containerEngagement,
      memberActivity,
      memberGrowthData,
    };
  } catch (error) {
    console.error('Error fetching program metrics:', error);
    throw error;
  }
}

/**
 * Get user growth data for the last N months
 */
export async function getUserGrowthData(months: number = 12): Promise<{ month: string; users: number }[]> {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (!users || users.length === 0) return [];

    const grouped: Record<string, number> = {};
    
    users.forEach((user: any) => {
      const month = format(new Date(user.created_at), 'MMM yyyy');
      grouped[month] = (grouped[month] || 0) + 1;
    });

    // Get last N months
    const result: { month: string; users: number }[] = [];
    let cumulative = 0;
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const month = format(date, 'MMM yyyy');
      const count = grouped[month] || 0;
      cumulative += count;
      result.push({ month, users: cumulative });
    }

    return result;
  } catch (error) {
    console.error('Error fetching user growth data:', error);
    return [];
  }
}

/**
 * Get container usage breakdown
 */
export async function getContainerUsageBreakdown(): Promise<{ name: string; value: number }[]> {
  try {
    const containerTypes = [
      { key: 'tables', name: 'Tables' },
      { key: 'elevators', name: 'Elevators' },
      { key: 'meetings', name: 'Meetings' },
      { key: 'pitches', name: 'Pitches' },
      { key: 'builds', name: 'Builds' },
      { key: 'standups', name: 'Standups' },
      { key: 'meetups', name: 'Meetups' },
      { key: 'sprints', name: 'Sprints' },
    ];

    const results = await Promise.all(
      containerTypes.map(async (type) => {
        const { count } = await supabase
          .from(type.key)
          .select('id', { count: 'exact', head: true });
        return { name: type.name, value: count || 0 };
      })
    );

    return results.filter(r => r.value > 0);
  } catch (error) {
    console.error('Error fetching container usage:', error);
    return [];
  }
}
