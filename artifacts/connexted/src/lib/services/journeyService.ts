/**
 * Unified Journey Service
 * 
 * Handles journey operations for BOTH programs and courses
 * Uses the same database tables and logic for maximum code reuse
 */

import { supabase } from '@/lib/supabase';

export type ContainerType = 'program' | 'course';

export type ItemType = 
  | 'document' 
  | 'book' 
  | 'deck' 
  | 'shelf' 
  | 'playlist'
  | 'table'
  | 'elevator'
  | 'pitch'
  | 'build'
  | 'standup'
  | 'meetup'
  | 'sprint'
  | 'event'
  | 'discussion'
  | 'resource'
  | 'container';

export interface Journey {
  id: string;
  program_id?: string;
  course_id?: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface JourneyItem {
  id: string;
  journey_id: string;
  item_type: ItemType;
  item_id: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  estimated_duration_minutes?: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface JourneyProgress {
  id: string;
  user_id: string;
  journey_id: string;
  program_id?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completion_percentage: number;
  started_at?: string;
  completed_at?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JourneyItemCompletion {
  id: string;
  user_id: string;
  journey_id: string;
  item_type: ItemType;
  item_id: string;
  completed: boolean;
  completed_at?: string;
  score?: number;
  time_spent_minutes?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Unified Journey Service Class
 */
export class JourneyService {
  /**
   * Get all journeys for a program or course
   */
  static async getJourneys(
    containerType: ContainerType,
    containerId: string
  ): Promise<Journey[]> {
    const field = containerType === 'program' ? 'program_id' : 'course_id';
    
    const { data, error } = await supabase
      .from('program_journeys')
      .select('*')
      .eq(field, containerId)
      .order('order_index');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single journey by ID
   */
  static async getJourney(journeyId: string): Promise<Journey | null> {
    const { data, error } = await supabase
      .from('program_journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all items in a journey
   */
  static async getJourneyItems(journeyId: string, publishedOnly = true): Promise<JourneyItem[]> {
    let query = supabase
      .from('journey_items')
      .select('*')
      .eq('journey_id', journeyId)
      .order('order_index');

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single journey item
   */
  static async getJourneyItem(itemId: string): Promise<JourneyItem | null> {
    const { data, error } = await supabase
      .from('journey_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user's progress for a specific journey
   */
  static async getUserJourneyProgress(
    userId: string,
    journeyId: string
  ): Promise<JourneyProgress | null> {
    const { data, error } = await supabase
      .from('journey_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('journey_id', journeyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found, which is ok
    return data;
  }

  /**
   * Get user's progress for all journeys in a program/course
   */
  static async getUserProgress(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<JourneyProgress[]> {
    // First get all journeys for this container
    const journeys = await this.getJourneys(containerType, containerId);
    const journeyIds = journeys.map(j => j.id);

    if (journeyIds.length === 0) return [];

    const { data, error } = await supabase
      .from('journey_progress')
      .select('*')
      .eq('user_id', userId)
      .in('journey_id', journeyIds);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's item completions for a journey
   */
  static async getItemCompletions(
    userId: string,
    journeyId: string
  ): Promise<JourneyItemCompletion[]> {
    const { data, error } = await supabase
      .from('journey_item_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('journey_id', journeyId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark an item as complete/incomplete
   */
  static async toggleItemCompletion(
    userId: string,
    journeyId: string,
    itemId: string,
    itemType: ItemType,
    completed: boolean
  ): Promise<JourneyItemCompletion> {
    const { data, error } = await supabase
      .from('journey_item_completions')
      .upsert({
        user_id: userId,
        journey_id: journeyId,
        item_id: itemId,
        item_type: itemType,
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,item_id,journey_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get journey with items and user progress (complete view)
   */
  static async getJourneyWithProgress(
    journeyId: string,
    userId: string
  ): Promise<{
    journey: Journey;
    items: JourneyItem[];
    progress: JourneyProgress | null;
    completions: JourneyItemCompletion[];
  }> {
    const [journey, items, progress, completions] = await Promise.all([
      this.getJourney(journeyId),
      this.getJourneyItems(journeyId),
      this.getUserJourneyProgress(userId, journeyId),
      this.getItemCompletions(userId, journeyId)
    ]);

    if (!journey) {
      throw new Error(`Journey ${journeyId} not found`);
    }

    return {
      journey,
      items,
      progress,
      completions
    };
  }

  /**
   * Get all journeys with progress for a container
   */
  static async getJourneysWithProgress(
    containerType: ContainerType,
    containerId: string,
    userId: string
  ): Promise<Array<{
    journey: Journey;
    progress: JourneyProgress | null;
    totalItems: number;
    completedItems: number;
  }>> {
    const journeys = await this.getJourneys(containerType, containerId);
    const progressList = await this.getUserProgress(userId, containerType, containerId);

    // Create a map of journey progress
    const progressMap = new Map(
      progressList.map(p => [p.journey_id, p])
    );

    // Get item counts for each journey
    const journeysWithProgress = await Promise.all(
      journeys.map(async (journey) => {
        const items = await this.getJourneyItems(journey.id);
        const completions = await this.getItemCompletions(userId, journey.id);
        
        return {
          journey,
          progress: progressMap.get(journey.id) || null,
          totalItems: items.length,
          completedItems: completions.filter(c => c.completed).length
        };
      })
    );

    return journeysWithProgress;
  }

  /**
   * Calculate overall completion percentage for a program/course
   */
  static async getOverallProgress(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<{
    totalJourneys: number;
    completedJourneys: number;
    totalItems: number;
    completedItems: number;
    overallPercentage: number;
  }> {
    const journeysWithProgress = await this.getJourneysWithProgress(
      containerType,
      containerId,
      userId
    );

    const totalJourneys = journeysWithProgress.length;
    const completedJourneys = journeysWithProgress.filter(
      j => j.progress?.status === 'completed'
    ).length;

    const totalItems = journeysWithProgress.reduce(
      (sum, j) => sum + j.totalItems,
      0
    );
    const completedItems = journeysWithProgress.reduce(
      (sum, j) => sum + j.completedItems,
      0
    );

    const overallPercentage = totalItems > 0 
      ? Math.round((completedItems / totalItems) * 100)
      : 0;

    return {
      totalJourneys,
      completedJourneys,
      totalItems,
      completedItems,
      overallPercentage
    };
  }
}

// Export singleton instance
export const journeyService = JourneyService;
