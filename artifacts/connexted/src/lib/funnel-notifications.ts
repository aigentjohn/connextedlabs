/**
 * FUNNEL NOTIFICATIONS
 * 
 * Creates passive notifications when admin changes member states.
 * User sees updates on home page - no emails or messages sent.
 */

import { supabase } from './supabase';
import { MemberState, MEMBER_STATES } from './funnel-system';
import { sendNotification } from './notification-sender';
import { logError } from '@/lib/error-handler';

interface CreateFunnelNotificationParams {
  userId: string;
  participantId: string;
  newState: MemberState;
  programId?: string;
  circleId?: string;
  programName?: string;
  circleName?: string;
  adminId?: string;
  reason?: string;
}

/**
 * Create notification when participant state changes
 */
export async function createFunnelNotification({
  userId,
  participantId,
  newState,
  programId,
  circleId,
  programName,
  circleName,
  adminId,
  reason,
}: CreateFunnelNotificationParams): Promise<void> {
  const entityType = programId ? 'program' : 'circle';
  const entityName = programName || circleName || 'Unknown';
  const stateInfo = MEMBER_STATES[newState];

  // Build notification message based on state
  const messages: Record<MemberState, string> = {
    invited: `You've been invited to ${entityName}`,
    applied: `Your application to ${entityName} is under review`,
    approved: `Your application to ${entityName} was approved!`,
    enrolled: `You're now enrolled in ${entityName}!`,
    completed: `Congratulations! You've completed ${entityName}`,
    not_completed: `Your participation in ${entityName} has ended`,
  };

  // Send notification respecting user preferences
  await sendNotification({
    userId,
    type: 'membership_status_update',
    title: stateInfo.label,
    message: messages[newState],
    linkUrl: programId ? `/programs/${programId}` : `/circles/${circleId}`,
    linkType: entityType,
    linkId: programId || circleId,
    actorId: adminId,
  });
}

/**
 * Create notification for payment status update
 */
export async function createPaymentNotification(
  userId: string,
  participantId: string,
  paymentStatus: string,
  programId?: string,
  circleId?: string,
  entityName?: string
): Promise<void> {
  const messages: Record<string, string> = {
    pending: `Payment pending for ${entityName}`,
    paid: `Payment received for ${entityName}! Thank you.`,
    overdue: `Payment overdue for ${entityName}. Please update your payment method.`,
    comped: `Payment waived for ${entityName}`,
    refunded: `Payment refunded for ${entityName}`,
  };

  const notification = {
    user_id: userId,
    type: 'payment_update',
    title: 'Payment Update',
    message: messages[paymentStatus] || `Payment status updated for ${entityName}`,
    read: false,
    data: {
      participant_id: participantId,
      payment_status: paymentStatus,
      entity_type: programId ? 'program' : 'circle',
      entity_id: programId || circleId,
      entity_name: entityName,
    },
    action_url: programId ? `/programs/${programId}/payment` : `/circles/${circleId}/payment`,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('notifications').insert(notification);

  if (error) {
    logError('Error creating payment notification:', error, { component: 'funnel-notifications' });
    throw error;
  }
}

/**
 * Create notification for new invitation
 */
export async function createInvitationNotification(
  userId: string,
  participantId: string,
  programId?: string,
  circleId?: string,
  entityName?: string,
  invitedBy?: string,
  message?: string
): Promise<void> {
  const entityType = programId ? 'program' : 'circle';

  const notification = {
    user_id: userId,
    type: 'invitation_received',
    title: `Invitation to ${entityName}`,
    message: message || `You've been invited to join ${entityName}`,
    read: false,
    data: {
      participant_id: participantId,
      entity_type: entityType,
      entity_id: programId || circleId,
      entity_name: entityName,
      invited_by: invitedBy,
    },
    action_url: programId ? `/programs/${programId}` : `/circles/${circleId}`,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('notifications').insert(notification);

  if (error) {
    logError('Error creating invitation notification:', error, { component: 'funnel-notifications' });
    throw error;
  }
}

/**
 * Create notification for application submitted
 */
export async function createApplicationNotification(
  userId: string,
  participantId: string,
  programId?: string,
  circleId?: string,
  entityName?: string
): Promise<void> {
  const notification = {
    user_id: userId,
    type: 'application_submitted',
    title: 'Application Submitted',
    message: `Your application to ${entityName} has been received and is under review`,
    read: false,
    data: {
      participant_id: participantId,
      entity_type: programId ? 'program' : 'circle',
      entity_id: programId || circleId,
      entity_name: entityName,
    },
    action_url: programId ? `/programs/${programId}` : `/circles/${circleId}`,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('notifications').insert(notification);

  if (error) {
    logError('Error creating application notification:', error, { component: 'funnel-notifications' });
    throw error;
  }
}

/**
 * Database trigger function to auto-create notifications on state change
 * This would be called from a Postgres trigger, but we can also call it manually
 */
export async function onParticipantStateChange(
  participantId: string,
  oldState: MemberState,
  newState: MemberState
): Promise<void> {
  // Get participant details
  const { data: participant, error } = await supabase
    .from('participants')
    .select(`
      *,
      program:programs (id, name),
      circle:circles (id, name)
    `)
    .eq('id', participantId)
    .single();

  if (error || !participant) {
    logError('Error fetching participant for notification:', error, { component: 'funnel-notifications' });
    return;
  }

  // Create notification for user
  await createFunnelNotification({
    userId: participant.user_id,
    participantId: participant.id,
    newState,
    programId: participant.program_id,
    circleId: participant.circle_id,
    programName: participant.program?.name,
    circleName: participant.circle?.name,
    adminId: participant.state_changed_by,
    reason: participant.state_change_reason,
  });
}