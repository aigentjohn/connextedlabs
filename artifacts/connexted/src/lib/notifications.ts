/**
 * Notification utilities
 * 
 * Simple notification count tracking without read/unread tracking.
 * Members check their /profile page to see current status and action items.
 */

import { supabase } from './supabase';

/**
 * Get count of programs/circles with updates for a user
 * This provides a simple count for the notification badge
 */
export async function getNotificationCount(userId: string): Promise<number> {
  try {
    // Count distinct programs and circles where user has unread notifications
    const { data, error } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching notification count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error getting notification count:', error);
    return 0;
  }
}

/**
 * Clear the notification flag for a user
 * Called when they visit their profile page
 */
export async function clearNotificationFlag(userId: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ has_new_notifications: false })
      .eq('id', userId);
  } catch (error) {
    console.error('Error clearing notification flag:', error);
  }
}

/**
 * Check if user has new notifications
 */
export async function hasNewNotifications(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('has_new_notifications')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking notification flag:', error);
      return false;
    }

    return data?.has_new_notifications || false;
  } catch (error) {
    console.error('Error checking notification flag:', error);
    return false;
  }
}
