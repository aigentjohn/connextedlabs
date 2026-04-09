/**
 * Notification Sender Utility
 * 
 * Centralized notification sending that respects user preferences
 */

import { supabase } from './supabase';
import { logError } from '@/lib/error-handler';

interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  linkType?: string;
  linkId?: string;
  actorId?: string;
}

/**
 * Send a notification to a user, respecting their preferences
 * Returns true if notification was sent, false if user has disabled this type
 */
export async function sendNotification({
  userId,
  type,
  title,
  message,
  linkUrl,
  linkType,
  linkId,
  actorId,
}: SendNotificationParams): Promise<boolean> {
  try {
    // Try to check if user wants to receive this notification type
    // If the function doesn't exist (table not created), default to sending
    try {
      const { data: shouldSend, error } = await supabase
        .rpc('should_send_notification', {
          p_user_id: userId,
          p_notification_type: type
        });

      // If function doesn't exist, proceed with sending (default to enabled)
      if (error && (error.code === 'PGRST116' || error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || error.code === '42883')) {
        console.log('User preference checking not available, sending notification by default');
      } else if (shouldSend === false) {
        // User has explicitly disabled this notification type
        console.log(`User ${userId} has disabled ${type} notifications`);
        return false;
      }
    } catch (prefError) {
      // Preference checking failed, but continue to send notification
      console.log('Could not check preferences, sending notification by default');
    }

    // Create the notification
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link_url: linkUrl,
        link_type: linkType,
        link_id: linkId,
        actor_id: actorId,
        is_read: false,
      });

    if (error) {
      logError('Error creating notification:', error, { component: 'notification-sender' });
      return false;
    }

    return true;
  } catch (error) {
    logError('Error sending notification:', error, { component: 'notification-sender' });
    return false;
  }
}

/**
 * Send notifications to multiple users at once
 */
export async function sendBulkNotifications(
  notifications: SendNotificationParams[]
): Promise<number> {
  let sentCount = 0;

  for (const notif of notifications) {
    const sent = await sendNotification(notif);
    if (sent) sentCount++;
  }

  return sentCount;
}

/**
 * Get user's notification preferences
 */
export async function getUserNotificationPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logError('Error fetching preferences:', error, { component: 'notification-sender' });
      return [];
    }

    return data || [];
  } catch (error) {
    logError('Error fetching preferences:', error, { component: 'notification-sender' });
    return [];
  }
}

/**
 * Set user's notification preference for a specific type
 */
export async function setNotificationPreference(
  userId: string,
  notificationType: string,
  enabled: boolean,
  emailEnabled: boolean = false,
  pushEnabled: boolean = false
): Promise<boolean> {
  try {
    // Try to update first
    const { error: updateError } = await supabase
      .from('user_notification_preferences')
      .update({
        enabled,
        email_enabled: emailEnabled,
        push_enabled: pushEnabled,
      })
      .eq('user_id', userId)
      .eq('notification_type', notificationType);

    // If no rows updated, insert
    if (updateError && updateError.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: userId,
          notification_type: notificationType,
          enabled,
          email_enabled: emailEnabled,
          push_enabled: pushEnabled,
        });

      if (insertError) {
        logError('Error inserting preference:', insertError, { component: 'notification-sender' });
        return false;
      }
    } else if (updateError) {
      logError('Error updating preference:', updateError, { component: 'notification-sender' });
      return false;
    }

    return true;
  } catch (error) {
    logError('Error setting preference:', error, { component: 'notification-sender' });
    return false;
  }
}