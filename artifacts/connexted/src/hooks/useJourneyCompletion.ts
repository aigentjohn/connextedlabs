import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface CompletionStatus {
  itemId: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: 'user' | 'admin' | null;
}

interface UseJourneyCompletionReturn {
  completions: Record<string, boolean>;
  isLoading: boolean;
  toggleCompletion: (itemId: string, journeyId: string, itemType: string) => Promise<void>;
  refreshCompletions: () => Promise<void>;
}

/**
 * Hook for managing journey item completions
 * Provides consistent completion tracking across Journey and Library views
 */
export function useJourneyCompletion(
  programId: string | null,
  journeyId?: string | null
): UseJourneyCompletionReturn {
  const { profile } = useAuth();
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch completions for user
  const fetchCompletions = useCallback(async () => {
    if (!profile || !programId) {
      setCompletions({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let query = supabase
        .from('journey_item_completions')
        .select('item_id, completed')
        .eq('user_id', profile.id);

      // If journeyId is provided, filter by journey
      if (journeyId) {
        query = query.eq('journey_id', journeyId);
      } else {
        // Otherwise, get completions for all journeys in the program
        const { data: journeyData } = await supabase
          .from('program_journeys')
          .select('id')
          .eq('program_id', programId);

        if (journeyData && journeyData.length > 0) {
          const journeyIds = journeyData.map(j => j.id);
          query = query.in('journey_id', journeyIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const completionMap: Record<string, boolean> = {};
      (data || []).forEach((completion) => {
        completionMap[completion.item_id] = completion.completed;
      });

      setCompletions(completionMap);
    } catch (error) {
      console.error('Error fetching completions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile, programId, journeyId]);

  // Toggle completion status
  const toggleCompletion = async (
    itemId: string,
    journeyId: string,
    itemType: string
  ) => {
    if (!profile) {
      toast.error('You must be logged in to mark items complete');
      return;
    }

    const currentStatus = completions[itemId] || false;
    const newStatus = !currentStatus;

    // Optimistic update
    setCompletions(prev => ({
      ...prev,
      [itemId]: newStatus,
    }));

    try {
      const { error } = await supabase
        .from('journey_item_completions')
        .upsert({
          user_id: profile.id,
          journey_id: journeyId,
          item_id: itemId,
          item_type: itemType,
          completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
          completed_by: 'user',
        }, {
          onConflict: 'user_id,item_id,journey_id',
        });

      if (error) throw error;

      toast.success(newStatus ? 'Marked as complete' : 'Marked as incomplete');

      // Refresh to get updated progress calculations from database
      await fetchCompletions();
    } catch (error) {
      console.error('Error toggling completion:', error);
      
      // Revert optimistic update on error
      setCompletions(prev => ({
        ...prev,
        [itemId]: currentStatus,
      }));
      
      toast.error('Failed to update completion status');
    }
  };

  // Fetch completions on mount and when dependencies change
  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  return {
    completions,
    isLoading,
    toggleCompletion,
    refreshCompletions: fetchCompletions,
  };
}

/**
 * Hook for fetching journey progress for a specific user and program
 */
export function useJourneyProgress(programId: string | null) {
  const { profile } = useAuth();
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!profile || !programId) {
      setProgress({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('journey_progress')
        .select('*')
        .eq('user_id', profile.id)
        .eq('program_id', programId);

      if (error) throw error;

      const progressMap: Record<string, any> = {};
      (data || []).forEach((p) => {
        progressMap[p.journey_id] = p;
      });

      setProgress(progressMap);
    } catch (error) {
      console.error('Error fetching journey progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile, programId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    isLoading,
    refreshProgress: fetchProgress,
  };
}

/**
 * Hook for admin to mark items complete for other users
 */
export function useAdminCompletion(programId: string | null) {
  const { profile } = useAuth();

  const markCompleteForUser = async (
    userId: string,
    itemId: string,
    journeyId: string,
    itemType: string,
    completed: boolean,
    adminNote?: string
  ) => {
    if (!profile) {
      toast.error('You must be logged in');
      return;
    }

    try {
      const { error } = await supabase
        .from('journey_item_completions')
        .upsert({
          user_id: userId,
          journey_id: journeyId,
          item_id: itemId,
          item_type: itemType,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: 'admin',
          admin_note: adminNote || null,
        }, {
          onConflict: 'user_id,item_id,journey_id',
        });

      if (error) throw error;

      toast.success(`Marked as ${completed ? 'complete' : 'incomplete'} for user`);
    } catch (error) {
      console.error('Error marking completion for user:', error);
      toast.error('Failed to update completion status');
    }
  };

  const getAllUserProgress = async (journeyId: string) => {
    if (!profile || !programId) return [];

    try {
      const { data, error } = await supabase
        .from('journey_progress')
        .select(`
          *,
          user:users(id, name, avatar, email)
        `)
        .eq('journey_id', journeyId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all user progress:', error);
      return [];
    }
  };

  return {
    markCompleteForUser,
    getAllUserProgress,
  };
}
