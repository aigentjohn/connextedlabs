import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Reusable hook for managing events associated with any container type
 * Works with any table that has an event_ids UUID[] column
 * 
 * @param tableName - The database table name (e.g., 'meetups', 'sprints', 'builds')
 * @param containerId - The container's UUID
 * @param onUpdate - Optional callback to trigger after successful add/remove
 */
export function useContainerEvents(
  tableName: string,
  containerId: string,
  onUpdate?: () => void
) {
  const [loading, setLoading] = useState(false);

  /**
   * Add an event to the container's event_ids array
   */
  const addEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('add_event_to_container', {
        p_table_name: tableName,
        p_container_id: containerId,
        p_event_id: eventId
      });

      if (error) throw error;

      toast.success('Event added successfully!');
      onUpdate?.();
      return true;
    } catch (error) {
      console.error(`Error adding event to ${tableName}:`, error);
      toast.error('Failed to add event');
      return false;
    } finally {
      setLoading(false);
    }
  }, [tableName, containerId, onUpdate]);

  /**
   * Remove an event from the container's event_ids array
   * Note: This does NOT delete the event, just disassociates it
   */
  const removeEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('remove_event_from_container', {
        p_table_name: tableName,
        p_container_id: containerId,
        p_event_id: eventId
      });

      if (error) throw error;

      toast.success('Event removed');
      onUpdate?.();
      return true;
    } catch (error) {
      console.error(`Error removing event from ${tableName}:`, error);
      toast.error('Failed to remove event');
      return false;
    } finally {
      setLoading(false);
    }
  }, [tableName, containerId, onUpdate]);

  /**
   * Bulk add multiple events to the container
   */
  const bulkAddEvents = useCallback(async (eventIds: string[]) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('bulk_add_events_to_container', {
        p_table_name: tableName,
        p_container_id: containerId,
        p_event_ids: eventIds
      });

      if (error) throw error;

      toast.success(`${eventIds.length} events added!`);
      onUpdate?.();
      return true;
    } catch (error) {
      console.error(`Error bulk adding events to ${tableName}:`, error);
      toast.error('Failed to add events');
      return false;
    } finally {
      setLoading(false);
    }
  }, [tableName, containerId, onUpdate]);

  /**
   * Get event count for the container
   */
  const getEventCount = useCallback(async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_container_event_count', {
        p_table_name: tableName,
        p_container_id: containerId
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error(`Error getting event count for ${tableName}:`, error);
      return 0;
    }
  }, [tableName, containerId]);

  return {
    addEvent,
    removeEvent,
    bulkAddEvents,
    getEventCount,
    loading
  };
}

/**
 * Hook for sprint-specific event management
 * Includes ceremony-specific helpers
 */
export function useSprintEvents(sprintId: string, onUpdate?: () => void) {
  const baseHook = useContainerEvents('sprints', sprintId, onUpdate);

  /**
   * Add a ceremony event to the sprint
   */
  const addCeremony = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase.rpc('add_ceremony_to_sprint', {
        p_sprint_id: sprintId,
        p_event_id: eventId
      });

      if (error) throw error;

      toast.success('Ceremony added to sprint!');
      onUpdate?.();
      return true;
    } catch (error) {
      console.error('Error adding ceremony to sprint:', error);
      toast.error('Failed to add ceremony');
      return false;
    }
  }, [sprintId, onUpdate]);

  /**
   * Remove a ceremony event from the sprint
   */
  const removeCeremony = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase.rpc('remove_ceremony_from_sprint', {
        p_sprint_id: sprintId,
        p_event_id: eventId
      });

      if (error) throw error;

      toast.success('Ceremony removed from sprint');
      onUpdate?.();
      return true;
    } catch (error) {
      console.error('Error removing ceremony from sprint:', error);
      toast.error('Failed to remove ceremony');
      return false;
    }
  }, [sprintId, onUpdate]);

  return {
    ...baseHook,
    addCeremony,
    removeCeremony
  };
}
