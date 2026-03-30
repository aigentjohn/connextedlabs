import { supabase } from '@/utils/supabase/client';
import { 
  NotificationType, 
  NotificationData, 
  getNotificationTitle, 
  getNotificationMessage,
  getNotificationLink 
} from './notificationTypes';

/**
 * Create a notification for a specific user
 */
export async function createNotification<T extends NotificationType>(
  userId: string,
  type: T,
  data: NotificationData[T],
  createdBy?: string
) {
  const title = getNotificationTitle(type, data);
  const message = getNotificationMessage(type, data);
  const link = getNotificationLink(type, data);
  
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    link,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  });
  
  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notifications for multiple users (bulk)
 */
export async function createNotifications<T extends NotificationType>(
  userIds: string[],
  type: T,
  data: NotificationData[T],
  createdBy?: string
) {
  if (userIds.length === 0) return;
  
  const title = getNotificationTitle(type, data);
  const message = getNotificationMessage(type, data);
  const link = getNotificationLink(type, data);
  
  const notifications = userIds.map(userId => ({
    user_id: userId,
    type,
    title,
    message,
    link,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase.from('notifications').insert(notifications);
  
  if (error) {
    console.error('Error creating notifications:', error);
    throw error;
  }
}

/**
 * Notify all members of a container
 */
export async function notifyContainerMembers<T extends NotificationType>(
  containerType: string,
  containerId: string,
  type: T,
  data: NotificationData[T],
  createdBy?: string,
  excludeUsers: string[] = []
) {
  
  // Get all active members
  const { data: members, error: membersError } = await supabase
    .from('container_memberships')
    .select('user_id')
    .eq('container_type', containerType)
    .eq('container_id', containerId)
    .eq('status', 'active');
  
  if (membersError) {
    console.error('Error fetching members:', membersError);
    throw membersError;
  }
  
  if (!members || members.length === 0) return;
  
  // Filter out excluded users
  const userIds = members
    .map(m => m.user_id)
    .filter(id => !excludeUsers.includes(id));
  
  await createNotifications(userIds, type, data, createdBy);
}

/**
 * Notify all admins of a container
 */
export async function notifyContainerAdmins<T extends NotificationType>(
  containerType: string,
  containerId: string,
  type: T,
  data: NotificationData[T],
  createdBy?: string
) {
  
  // Get all container admins
  const { data: admins, error: adminsError } = await supabase
    .from('container_admins')
    .select('user_id')
    .eq('container_type', containerType)
    .eq('container_id', containerId);
  
  if (adminsError) {
    console.error('Error fetching admins:', adminsError);
    throw adminsError;
  }
  
  if (!admins || admins.length === 0) return;
  
  const userIds = admins.map(a => a.user_id);
  await createNotifications(userIds, type, data, createdBy);
}

/**
 * Notify platform admins
 */
export async function notifyPlatformAdmins<T extends NotificationType>(
  type: T,
  data: NotificationData[T],
  createdBy?: string
) {
  
  // Get all platform admins
  const { data: admins, error: adminsError } = await supabase
    .from('users')
    .select('id')
    .eq('is_platform_admin', true);
  
  if (adminsError) {
    console.error('Error fetching platform admins:', adminsError);
    throw adminsError;
  }
  
  if (!admins || admins.length === 0) return;
  
  const userIds = admins.map(a => a.id);
  await createNotifications(userIds, type, data, createdBy);
}

/**
 * Container state change notification
 */
export async function notifyContainerStateChange(
  containerType: string,
  containerId: string,
  containerName: string,
  oldState: string,
  newState: string,
  reason?: string,
  resumeDate?: string,
  changedBy?: string
) {
  await notifyContainerMembers(
    containerType,
    containerId,
    'container.state_changed',
    {
      container_name: containerName,
      container_type: containerType,
      container_id: containerId,
      old_state: oldState,
      new_state: newState,
      reason,
      resume_date: resumeDate,
    },
    changedBy
  );
}

/**
 * Membership invitation notification
 */
export async function notifyMembershipInvitation(
  userId: string,
  containerType: string,
  containerId: string,
  containerName: string,
  invitedByName: string,
  invitedById: string,
  expiresAt: string,
  inviteMessage?: string,
  cohort?: string
) {
  await createNotification(
    userId,
    'membership.invited',
    {
      container_name: containerName,
      container_type: containerType,
      container_id: containerId,
      invited_by_name: invitedByName,
      invited_by_id: invitedById,
      invite_message: inviteMessage,
      expires_at: expiresAt,
      cohort,
    },
    invitedById
  );
}

/**
 * Join request notification (to admins)
 */
export async function notifyJoinRequest(
  memberName: string,
  memberId: string,
  containerType: string,
  containerId: string,
  containerName: string,
  requestMessage?: string
) {
  await notifyContainerAdmins(
    containerType,
    containerId,
    'admin.join_request',
    {
      member_name: memberName,
      member_id: memberId,
      container_name: containerName,
      container_type: containerType,
      container_id: containerId,
      request_message: requestMessage,
    },
    memberId
  );
}

/**
 * Membership approved notification
 */
export async function notifyMembershipApproved(
  userId: string,
  containerType: string,
  containerId: string,
  containerName: string,
  approvedByName: string,
  approvedById: string
) {
  await createNotification(
    userId,
    'membership.approved',
    {
      container_name: containerName,
      container_type: containerType,
      container_id: containerId,
      approved_by_name: approvedByName,
    },
    approvedById
  );
}

/**
 * Membership rejected notification
 */
export async function notifyMembershipRejected(
  userId: string,
  containerType: string,
  containerId: string,
  containerName: string,
  reason?: string,
  rejectedById?: string
) {
  await createNotification(
    userId,
    'membership.rejected',
    {
      container_name: containerName,
      container_type: containerType,
      container_id: containerId,
      reason,
    },
    rejectedById
  );
}
