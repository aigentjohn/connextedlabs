/**
 * Unified Progress Tracking Service
 * 
 * Handles progress updates for BOTH programs and courses
 * Uses unified JSONB format for flexible tracking
 */

import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-handler';
import type { ContainerType } from './journeyService';

export interface ProgressData {
  percentage: number;
  completed_journeys?: number;
  total_journeys?: number;
  completed_items?: number;
  total_items?: number;
  journeys_completed?: number; // Programs
  containers_completed?: number; // Programs
  current_journey_id?: string;
  last_journey_id?: string;
  last_activity_at?: string;
  quiz_scores?: Record<string, number>;
  time_spent_minutes?: number;
  peer_reviews_given?: number; // Programs
  peer_reviews_received?: number; // Programs
  [key: string]: any; // Allow custom fields
}

export interface EnrollmentProgress {
  user_id: string;
  container_id: string;
  container_type: ContainerType;
  progress_data: ProgressData;
  enrolled_at: string;
  completed_at?: string;
  status?: string;
}

/**
 * Unified Progress Service Class
 */
export class ProgressService {
  /**
   * Get progress for a user in a program or course
   */
  static async getProgress(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<ProgressData> {
    const { data, error } = await supabase.rpc('get_unified_progress', {
      p_user_id: userId,
      p_container_type: containerType,
      p_container_id: containerId
    });

    if (error) {
      logError('Error getting progress:', error, { component: 'progressService' });
      return { percentage: 0 };
    }

    return data || { percentage: 0 };
  }

  /**
   * Update progress for a user in a program or course
   */
  static async updateProgress(
    userId: string,
    containerType: ContainerType,
    containerId: string,
    updates: Partial<ProgressData>
  ): Promise<ProgressData> {
    const { data, error } = await supabase.rpc('update_unified_progress', {
      p_user_id: userId,
      p_container_type: containerType,
      p_container_id: containerId,
      p_progress_updates: updates
    });

    if (error) {
      logError('Error updating progress:', error, { component: 'progressService' });
      throw error;
    }

    return data || { percentage: 0 };
  }

  /**
   * Calculate and update progress based on journey completions
   */
  static async calculateProgress(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<ProgressData> {
    // Get all journeys for container
    const journeyField = containerType === 'program' ? 'program_id' : 'course_id';
    
    const { data: journeys, error: journeysError } = await supabase
      .from('program_journeys')
      .select('id')
      .eq(journeyField, containerId);

    if (journeysError) throw journeysError;

    const journeyIds = journeys?.map(j => j.id) || [];
    
    if (journeyIds.length === 0) {
      return { percentage: 0, total_journeys: 0, completed_journeys: 0 };
    }

    // Get total items
    const { count: totalItems } = await supabase
      .from('journey_items')
      .select('id', { count: 'exact', head: true })
      .in('journey_id', journeyIds)
      .eq('is_published', true);

    // Get completed items
    const { count: completedItems } = await supabase
      .from('journey_item_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('journey_id', journeyIds)
      .eq('completed', true);

    // Get completed journeys
    const { count: completedJourneys } = await supabase
      .from('journey_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('journey_id', journeyIds)
      .eq('status', 'completed');

    const percentage = totalItems && totalItems > 0 
      ? Math.round((completedItems || 0) / totalItems * 100)
      : 0;

    const progressData: ProgressData = {
      percentage,
      total_journeys: journeys.length,
      completed_journeys: completedJourneys || 0,
      total_items: totalItems || 0,
      completed_items: completedItems || 0,
      last_activity_at: new Date().toISOString()
    };

    // Update the progress
    await this.updateProgress(userId, containerType, containerId, progressData);

    return progressData;
  }

  /**
   * Mark a user as completed in a program or course
   */
  static async markCompleted(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<void> {
    const now = new Date().toISOString();
    
    if (containerType === 'program') {
      const { error } = await supabase
        .from('program_members')
        .update({
          status: 'completed',
          completed_at: now,
          progress: {
            percentage: 100,
            last_activity_at: now
          }
        })
        .eq('user_id', userId)
        .eq('program_id', containerId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('course_enrollments')
        .update({
          completed_at: now,
          progress_percentage: 100,
          progress_data: {
            percentage: 100,
            last_activity_at: now
          }
        })
        .eq('user_id', userId)
        .eq('course_id', containerId);

      if (error) throw error;
    }
  }

  /**
   * Get enrollment with progress
   */
  static async getEnrollmentProgress(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<EnrollmentProgress | null> {
    if (containerType === 'program') {
      const { data, error } = await supabase
        .from('program_members')
        .select('user_id, program_id, progress, enrolled_at, completed_at, status')
        .eq('user_id', userId)
        .eq('program_id', containerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        user_id: data.user_id,
        container_id: data.program_id,
        container_type: 'program',
        progress_data: data.progress || { percentage: 0 },
        enrolled_at: data.enrolled_at,
        completed_at: data.completed_at,
        status: data.status
      };
    } else {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('user_id, course_id, progress_data, progress_percentage, enrolled_at, completed_at')
        .eq('user_id', userId)
        .eq('course_id', containerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        user_id: data.user_id,
        container_id: data.course_id,
        container_type: 'course',
        progress_data: data.progress_data || { 
          percentage: data.progress_percentage || 0 
        },
        enrolled_at: data.enrolled_at,
        completed_at: data.completed_at
      };
    }
  }

  /**
   * Track time spent on content
   */
  static async trackTimeSpent(
    userId: string,
    containerType: ContainerType,
    containerId: string,
    minutes: number
  ): Promise<void> {
    const currentProgress = await this.getProgress(userId, containerType, containerId);
    
    const newTimeSpent = (currentProgress.time_spent_minutes || 0) + minutes;
    
    await this.updateProgress(userId, containerType, containerId, {
      time_spent_minutes: newTimeSpent,
      last_activity_at: new Date().toISOString()
    });
  }

  /**
   * Update last activity timestamp
   */
  static async updateLastActivity(
    userId: string,
    containerType: ContainerType,
    containerId: string,
    journeyId?: string
  ): Promise<void> {
    const updates: Partial<ProgressData> = {
      last_activity_at: new Date().toISOString()
    };

    if (journeyId) {
      updates.last_journey_id = journeyId;
    }

    await this.updateProgress(userId, containerType, containerId, updates);

    // Also update the enrollment table's last_accessed_at
    if (containerType === 'course') {
      await supabase
        .from('course_enrollments')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', containerId);
    }
  }

  /**
   * Get progress summary for display
   */
  static async getProgressSummary(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<{
    percentage: number;
    completedJourneys: number;
    totalJourneys: number;
    completedItems: number;
    totalItems: number;
    lastActivity?: string;
    isCompleted: boolean;
  }> {
    const enrollment = await this.getEnrollmentProgress(userId, containerType, containerId);
    
    if (!enrollment) {
      return {
        percentage: 0,
        completedJourneys: 0,
        totalJourneys: 0,
        completedItems: 0,
        totalItems: 0,
        isCompleted: false
      };
    }

    const progress = enrollment.progress_data;

    return {
      percentage: progress.percentage || 0,
      completedJourneys: progress.completed_journeys || progress.journeys_completed || 0,
      totalJourneys: progress.total_journeys || 0,
      completedItems: progress.completed_items || 0,
      totalItems: progress.total_items || 0,
      lastActivity: progress.last_activity_at,
      isCompleted: enrollment.completed_at !== null && enrollment.completed_at !== undefined
    };
  }
}

// Export singleton instance
export const progressService = ProgressService;
