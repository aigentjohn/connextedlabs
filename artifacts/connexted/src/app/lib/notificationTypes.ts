// Notification types for the platform

export type NotificationType =
  // Social interactions (align with notificationHelpers.ts)
  | 'like'
  | 'comment'
  | 'comment_reply'
  | 'mention'
  | 'follow'
  | 'share'
  | 'thread_reply'
  | 'document_comment'

  // Legacy aliases (preserve backwards compatibility)
  | 'post.created'
  | 'post.liked'
  | 'comment.created'
  | 'connection.request'
  | 'connection.accepted'
  | 'event.reminder'
  | 'system.announcement'

  // Container state changes
  | 'container.state_changed'
  | 'container.paused'
  | 'container.activated'
  | 'container.frozen'
  | 'container.suspended'
  | 'container.archived'
  | 'container.schedule_change'
  
  // NEW: Membership state changes
  | 'membership.invited'
  | 'membership.approved'
  | 'membership.rejected'
  | 'membership.paused'
  | 'membership.resumed'
  | 'membership.promoted_to_alumni'
  | 'membership.blocked'
  
  // NEW: Admin alerts
  | 'admin.join_request'
  | 'admin.invite_accepted'
  | 'admin.invite_expired'
  | 'admin.member_flagged'
  | 'admin.container_reported';

export interface NotificationData {
  // Container state changes
  'container.state_changed': {
    container_name: string;
    container_type: string;
    container_id: string;
    old_state: string;
    new_state: string;
    reason?: string;
    resume_date?: string;
  };
  
  'container.paused': {
    container_name: string;
    container_type: string;
    container_id: string;
    reason?: string;
    resume_date?: string;
    access_level: 'read_only' | 'view_only' | 'none';
  };
  
  'container.activated': {
    container_name: string;
    container_type: string;
    container_id: string;
  };
  
  'container.frozen': {
    container_name: string;
    container_type: string;
    container_id: string;
    reason?: string;
    guest_message?: string;
  };
  
  'container.suspended': {
    container_name: string;
    container_type: string;
    container_id: string;
    public_message?: string;
  };
  
  'container.archived': {
    container_name: string;
    container_type: string;
    container_id: string;
    completion_date?: string;
  };
  
  'container.schedule_change': {
    container_name: string;
    container_type: string;
    container_id: string;
    new_schedule: string;
  };
  
  // Membership state changes
  'membership.invited': {
    container_name: string;
    container_type: string;
    container_id: string;
    invited_by_name: string;
    invited_by_id: string;
    invite_message?: string;
    expires_at: string;
    cohort?: string;
  };
  
  'membership.approved': {
    container_name: string;
    container_type: string;
    container_id: string;
    approved_by_name: string;
  };
  
  'membership.rejected': {
    container_name: string;
    container_type: string;
    container_id: string;
    reason?: string;
  };
  
  'membership.paused': {
    container_name: string;
    container_type: string;
    container_id: string;
    reason: string;
    resume_date?: string;
  };
  
  'membership.resumed': {
    container_name: string;
    container_type: string;
    container_id: string;
  };
  
  'membership.promoted_to_alumni': {
    container_name: string;
    container_type: string;
    container_id: string;
    completion_date?: string;
  };
  
  'membership.blocked': {
    container_name: string;
    container_type: string;
    container_id: string;
    reason?: string;
  };
  
  // Admin alerts
  'admin.join_request': {
    member_name: string;
    member_id: string;
    container_name: string;
    container_type: string;
    container_id: string;
    request_message?: string;
  };
  
  'admin.invite_accepted': {
    member_name: string;
    member_id: string;
    container_name: string;
    container_type: string;
    container_id: string;
  };
  
  'admin.invite_expired': {
    member_name: string;
    member_id: string;
    container_name: string;
    container_type: string;
    container_id: string;
    invited_at: string;
  };
  
  'admin.member_flagged': {
    member_name: string;
    member_id: string;
    container_name: string;
    container_type: string;
    container_id: string;
    reason: string;
  };
  
  'admin.container_reported': {
    reporter_name: string;
    reporter_id: string;
    container_name: string;
    container_type: string;
    container_id: string;
    reason: string;
  };
}

// Helper to generate notification titles
export function getNotificationTitle(type: NotificationType, data: any): string {
  switch (type) {
    // Social interactions
    case 'like':
      return `${data.actor_name} liked your ${data.content_type || 'post'}`;
    case 'comment':
      return `${data.actor_name} commented on your ${data.content_type || 'post'}`;
    case 'comment_reply':
      return `${data.actor_name} replied to your comment`;
    case 'mention':
      return `${data.actor_name} mentioned you`;
    case 'follow':
      return `${data.actor_name} started following you`;
    case 'share':
      return `${data.actor_name} shared your ${data.content_type || 'post'}`;
    case 'thread_reply':
      return `${data.actor_name} replied to "${data.thread_title}"`;
    case 'document_comment':
      return `${data.actor_name} commented on "${data.document_title}"`;

    // Container states
    case 'container.state_changed':
      return `${data.container_name} is now ${data.new_state}`;
    case 'container.paused':
      return `${data.container_name} has been paused`;
    case 'container.activated':
      return `${data.container_name} is now active`;
    case 'container.frozen':
      return `${data.container_name} enrollment is closed`;
    case 'container.suspended':
      return `${data.container_name} has been suspended`;
    case 'container.archived':
      return `${data.container_name} has been archived`;
    case 'container.schedule_change':
      return `${data.container_name} schedule updated`;
    
    // Membership
    case 'membership.invited':
      return `You've been invited to ${data.container_name}`;
    case 'membership.approved':
      return `Welcome to ${data.container_name}!`;
    case 'membership.rejected':
      return `Your request to join ${data.container_name} was declined`;
    case 'membership.paused':
      return `Your membership to ${data.container_name} has been paused`;
    case 'membership.resumed':
      return `Your membership to ${data.container_name} has been resumed`;
    case 'membership.promoted_to_alumni':
      return `Congratulations! You've completed ${data.container_name}`;
    case 'membership.blocked':
      return `Your access to ${data.container_name} has been blocked`;
    
    // Admin alerts
    case 'admin.join_request':
      return `${data.member_name} wants to join ${data.container_name}`;
    case 'admin.invite_accepted':
      return `${data.member_name} accepted your invitation`;
    case 'admin.invite_expired':
      return `Invitation to ${data.member_name} has expired`;
    case 'admin.member_flagged':
      return `${data.member_name} was flagged in ${data.container_name}`;
    case 'admin.container_reported':
      return `${data.container_name} was reported`;
    
    default:
      return 'New notification';
  }
}

// Helper to generate notification messages
export function getNotificationMessage(type: NotificationType, data: any): string {
  switch (type) {
    // Social interactions
    case 'like':
      return data.content_preview ? `"${data.content_preview.substring(0, 80)}..."` : '';
    case 'comment':
      return data.comment_preview || '';
    case 'comment_reply':
      return data.comment_preview || '';
    case 'mention':
      return data.content_preview ? `"${data.content_preview.substring(0, 80)}..."` : '';
    case 'follow':
      return data.actor_tagline || '';
    case 'share':
      return data.content_preview ? `"${data.content_preview.substring(0, 80)}..."` : '';
    case 'thread_reply':
      return data.reply_preview || '';
    case 'document_comment':
      return data.comment_preview || '';

    // Container states
    case 'container.state_changed':
      return data.reason || `The container state changed from ${data.old_state} to ${data.new_state}`;
    case 'container.paused':
      return data.reason || 'This container is paused. You can view content but cannot post.';
    case 'container.activated':
      return 'The container is now active and ready for participation.';
    case 'container.frozen':
      return data.guest_message || data.reason || 'Enrollment is closed. No new members can join.';
    case 'container.suspended':
      return data.public_message || 'This container has been temporarily suspended.';
    case 'container.archived':
      return 'This container has been archived. Content is available for viewing.';
    case 'container.schedule_change':
      return `New schedule: ${data.new_schedule}`;
    
    // Membership
    case 'membership.invited':
      return data.invite_message || `${data.invited_by_name} invited you to join. Invitation expires on ${new Date(data.expires_at).toLocaleDateString()}.`;
    case 'membership.approved':
      return `Your request was approved by ${data.approved_by_name}.`;
    case 'membership.rejected':
      return data.reason || 'Your request to join was not approved at this time.';
    case 'membership.paused':
      return data.reason + (data.resume_date ? ` Resumes on ${new Date(data.resume_date).toLocaleDateString()}.` : '');
    case 'membership.resumed':
      return 'You can now participate fully again.';
    case 'membership.promoted_to_alumni':
      return 'You now have alumni access to this container.';
    case 'membership.blocked':
      return data.reason || 'Your access has been restricted.';
    
    // Admin alerts
    case 'admin.join_request':
      return data.request_message || `${data.member_name} has requested to join.`;
    case 'admin.invite_accepted':
      return `${data.member_name} accepted the invitation to ${data.container_name}.`;
    case 'admin.invite_expired':
      return `The invitation sent to ${data.member_name} on ${new Date(data.invited_at).toLocaleDateString()} has expired.`;
    case 'admin.member_flagged':
      return `Reason: ${data.reason}`;
    case 'admin.container_reported':
      return `${data.reporter_name} reported: ${data.reason}`;
    
    default:
      return '';
  }
}

// Helper to get notification link
export function getNotificationLink(type: NotificationType, data: any): string {
  switch (type) {
    // Social interactions
    case 'like':
    case 'comment':
    case 'comment_reply':
    case 'mention':
    case 'share':
      return data.link_url || (data.content_id ? `/feed?post=${data.content_id}` : '#');
    case 'follow':
      return data.actor_id ? `/users/${data.actor_id}` : '#';
    case 'thread_reply':
      return data.thread_id ? `/forums/thread/${data.thread_id}` : '#';
    case 'document_comment':
      return data.document_id ? `/documents/${data.document_id}` : '#';

    case 'membership.invited':
      return `/${data.container_type}s/${data.container_id}/accept-invite`;
    
    case 'admin.join_request':
      return `/${data.container_type}s/${data.container_id}/members?tab=pending`;
    
    case 'membership.approved':
    case 'membership.resumed':
    case 'container.activated':
    case 'container.paused':
    case 'container.frozen':
    case 'container.archived':
    case 'admin.invite_accepted':
      return `/${data.container_type}s/${data.container_id}`;
    
    case 'admin.member_flagged':
    case 'admin.container_reported':
      return `/platform-admin/moderation`;
    
    default:
      return '#';
  }
}
