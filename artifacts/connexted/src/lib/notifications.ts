/**
 * Notification utilities
 * 
 * Simple notification count tracking without read/unread tracking.
 * Members check their /profile page to see current status and action items.
 */

import { supabase } from './supabase';
import { logError } from '@/lib/error-handler';

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
      logError('Error fetching notification count:', error, { component: 'notifications' });
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    logError('Error getting notification count:', error, { component: 'notifications' });
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
    logError('Error clearing notification flag:', error, { component: 'notifications' });
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
      logError('Error checking notification flag:', error, { component: 'notifications' });
      return false;
    }

    return data?.has_new_notifications || false;
  } catch (error) {
    logError('Error checking notification flag:', error, { component: 'notifications' });
    return false;
  }
}
