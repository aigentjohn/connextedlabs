/**
 * Unified Analytics Service
 * 
 * Provides analytics for BOTH programs and courses
 * Leaders (program admins, course creators) can view participant progress
 */

import { supabase } from '@/lib/supabase';
import type { ContainerType } from './journeyService';
import { logError } from '@/lib/error-handler';

export interface ParticipantAnalytics {
  user_id: string;
  user_name: string;
  user_email: string;
  enrollment_date: string;
  progress_percentage: number;
  total_journeys: number;
  completed_journeys: number;
  total_items: number;
  completed_items: number;
  last_activity_at?: string;
  status: string;
  completed_at?: string;
}

export interface JourneyCompletionStats {
  journey_id: string;
  journey_title: string;
  total_items: number;
  total_participants: number;
  participants_started: number;
  participants_completed: number;
  avg_completion_percentage: number;
  avg_time_spent_minutes?: number;
}

export interface OverallAnalytics {
  total_participants: number;
  active_participants: number;
  completed_participants: number;
  avg_progress_percentage: number;
  total_journeys: number;
  avg_journeys_completed: number;
  total_items: number;
  avg_items_completed: number;
}

/**
 * Unified Analytics Service Class
 */
export class AnalyticsService {
  /**
   * Get analytics for all participants in a program or course
   */
  static async getParticipantAnalytics(
    containerType: ContainerType,
    containerId: string,
    userId?: string
  ): Promise<ParticipantAnalytics[]> {
    const { data, error } = await supabase.rpc('get_participant_analytics', {
      p_container_type: containerType,
      p_container_id: containerId,
      p_user_id: userId || null
    });

    if (error) {
      logError('Error getting participant analytics:', error, { component: 'analyticsService' });
      throw error;
    }

    return data || [];
  }

  /**
   * Get analytics for a specific participant
   */
  static async getSingleParticipantAnalytics(
    containerType: ContainerType,
    containerId: string,
    userId: string
  ): Promise<ParticipantAnalytics | null> {
    const data = await this.getParticipantAnalytics(containerType, containerId, userId);
    return data.length > 0 ? data[0] : null;
  }

  /**
   * Get journey completion statistics
   */
  static async getJourneyCompletionStats(
    containerType: ContainerType,
    containerId: string,
    journeyId?: string
  ): Promise<JourneyCompletionStats[]> {
    const { data, error } = await supabase.rpc('get_journey_completion_stats', {
      p_container_type: containerType,
      p_container_id: containerId,
      p_journey_id: journeyId || null
    });

    if (error) {
      logError('Error getting journey completion stats:', error, { component: 'analyticsService' });
      throw error;
    }

    return data || [];
  }

  /**
   * Get overall analytics summary
   */
  static async getOverallAnalytics(
    containerType: ContainerType,
    containerId: string
  ): Promise<OverallAnalytics> {
    const participants = await this.getParticipantAnalytics(containerType, containerId);

    if (participants.length === 0) {
      return {
        total_participants: 0,
        active_participants: 0,
        completed_participants: 0,
        avg_progress_percentage: 0,
        total_journeys: 0,
        avg_journeys_completed: 0,
        total_items: 0,
        avg_items_completed: 0
      };
    }

    const activeParticipants = participants.filter(
      p => p.status !== 'completed' && p.progress_percentage > 0
    ).length;

    const completedParticipants = participants.filter(
      p => p.completed_at !== null
    ).length;

    const avgProgress = participants.reduce(
      (sum, p) => sum + p.progress_percentage,
      0
    ) / participants.length;

    const avgJourneysCompleted = participants.reduce(
      (sum, p) => sum + p.completed_journeys,
      0
    ) / participants.length;

    const avgItemsCompleted = participants.reduce(
      (sum, p) => sum + p.completed_items,
      0
    ) / participants.length;

    // Get total journeys and items from first participant (should be same for all)
    const firstParticipant = participants[0];

    return {
      total_participants: participants.length,
      active_participants: activeParticipants,
      completed_participants: completedParticipants,
      avg_progress_percentage: Math.round(avgProgress),
      total_journeys: firstParticipant.total_journeys,
      avg_journeys_completed: Math.round(avgJourneysCompleted * 10) / 10,
      total_items: firstParticipant.total_items,
      avg_items_completed: Math.round(avgItemsCompleted)
    };
  }

  /**
   * Get completion rate for a specific journey
   */
  static async getJourneyCompletionRate(
    containerType: ContainerType,
    containerId: string,
    journeyId: string
  ): Promise<{
    total: number;
    started: number;
    completed: number;
    completionRate: number;
  }> {
    const stats = await this.getJourneyCompletionStats(containerType, containerId, journeyId);
    
    if (stats.length === 0) {
      return {
        total: 0,
        started: 0,
        completed: 0,
        completionRate: 0
      };
    }

    const stat = stats[0];
    const completionRate = stat.total_participants > 0
      ? (stat.participants_completed / stat.total_participants) * 100
      : 0;

    return {
      total: stat.total_participants,
      started: stat.participants_started,
      completed: stat.participants_completed,
      completionRate: Math.round(completionRate)
    };
  }

  /**
   * Get participants who are falling behind (< 50% progress after 7 days)
   */
  static async getParticipantsAtRisk(
    containerType: ContainerType,
    containerId: string,
    daysEnrolled: number = 7,
    progressThreshold: number = 50
  ): Promise<ParticipantAnalytics[]> {
    const participants = await this.getParticipantAnalytics(containerType, containerId);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysEnrolled);

    return participants.filter(p => {
      const enrolledDate = new Date(p.enrollment_date);
      const isOldEnough = enrolledDate < cutoffDate;
      const isBehind = p.progress_percentage < progressThreshold;
      const notCompleted = !p.completed_at;

      return isOldEnough && isBehind && notCompleted;
    });
  }

  /**
   * Get top performers (> 80% progress)
   */
  static async getTopPerformers(
    containerType: ContainerType,
    containerId: string,
    limit: number = 10
  ): Promise<ParticipantAnalytics[]> {
    const participants = await this.getParticipantAnalytics(containerType, containerId);
    
    return participants
      .filter(p => p.progress_percentage >= 80)
      .sort((a, b) => b.progress_percentage - a.progress_percentage)
      .slice(0, limit);
  }

  /**
   * Get recent activity (participants active in last N days)
   */
  static async getRecentActivity(
    containerType: ContainerType,
    containerId: string,
    days: number = 7
  ): Promise<ParticipantAnalytics[]> {
    const participants = await this.getParticipantAnalytics(containerType, containerId);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return participants.filter(p => {
      if (!p.last_activity_at) return false;
      const lastActivity = new Date(p.last_activity_at);
      return lastActivity >= cutoffDate;
    });
  }

  /**
   * Export analytics to CSV format
   */
  static async exportToCSV(
    containerType: ContainerType,
    containerId: string
  ): Promise<string> {
    const participants = await this.getParticipantAnalytics(containerType, containerId);

    const headers = [
      'Name',
      'Email',
      'Enrolled Date',
      'Progress %',
      'Journeys Completed',
      'Total Journeys',
      'Items Completed',
      'Total Items',
      'Status',
      'Last Activity',
      'Completed Date'
    ];

    const rows = participants.map(p => [
      p.user_name,
      p.user_email,
      p.enrollment_date,
      p.progress_percentage,
      p.completed_journeys,
      p.total_journeys,
      p.completed_items,
      p.total_items,
      p.status,
      p.last_activity_at || '',
      p.completed_at || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Check if current user is a leader (can view analytics)
   */
  static async isLeader(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<boolean> {
    if (containerType === 'program') {
      const { data, error } = await supabase
        .from('programs')
        .select('admin_ids')
        .eq('id', containerId)
        .single();

      if (error || !data) return false;
      return data.admin_ids?.includes(userId) || false;
    } else {
      const { data, error } = await supabase
        .from('courses')
        .select('created_by, instructor_ids')
        .eq('id', containerId)
        .single();

      if (error || !data) return false;
      return (
        data.created_by === userId ||
        data.instructor_ids?.includes(userId) ||
        false
      );
    }
  }

  /**
   * Get analytics dashboard data (all metrics in one call)
   */
  static async getDashboardData(
    containerType: ContainerType,
    containerId: string
  ): Promise<{
    overall: OverallAnalytics;
    participants: ParticipantAnalytics[];
    journeyStats: JourneyCompletionStats[];
    atRisk: ParticipantAnalytics[];
    topPerformers: ParticipantAnalytics[];
    recentActivity: ParticipantAnalytics[];
  }> {
    const [
      overall,
      participants,
      journeyStats,
      atRisk,
      topPerformers,
      recentActivity
    ] = await Promise.all([
      this.getOverallAnalytics(containerType, containerId),
      this.getParticipantAnalytics(containerType, containerId),
      this.getJourneyCompletionStats(containerType, containerId),
      this.getParticipantsAtRisk(containerType, containerId),
      this.getTopPerformers(containerType, containerId),
      this.getRecentActivity(containerType, containerId)
    ]);

    return {
      overall,
      participants,
      journeyStats,
      atRisk,
      topPerformers,
      recentActivity
    };
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService;
