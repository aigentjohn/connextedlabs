// Split candidate: ~792 lines — consider separating notifyUser, notifyBulk, and notification-type-specific helpers into sub-modules.
import { supabase } from '@/lib/supabase';

// Notification Categories
export type NotificationCategory = 'social' | 'events' | 'circles' | 'programs' | 'system';

// Category mapping for notification types
const NOTIFICATION_CATEGORIES: Record<string, NotificationCategory> = {
  // Social
  'comment': 'social',
  'comment_reply': 'social',
  'mention': 'social',
  'like': 'social',
  'follow': 'social',
  'share': 'social',
  
  // Events
  'event_created': 'events',
  'event_cancelled': 'events',
  'event_rescheduled': 'events',
  'session_reminder': 'events',
  'session_attendance': 'events',
  'rsvp_confirmation': 'events',
  
  // Circles (community-level)
  'circle.member_joined': 'circles',
  'circle.member_left': 'circles',
  'circle.role_changed': 'circles',
  'circle.invitation': 'circles',
  'circle.invite_accepted': 'circles',
  'container.state_changed': 'circles',
  
  // Programs (structured programs, applications, enrollment)
  'application_received': 'programs',
  'application_approved': 'programs',
  'application_rejected': 'programs',
  'application_waitlisted': 'programs',
  'enrollment_complete': 'programs',
  'program.member_joined': 'programs',
  'program.member_left': 'programs',
  'program.role_changed': 'programs',
  'membership.invited': 'programs',
  'admin.invite_accepted': 'programs',
  
  // System
  'welcome': 'system',
  'announcement': 'system',
  'engagement_at_risk': 'system',
  'content_flagged': 'system',
  'content_approved': 'system',
  'content_rejected': 'system',
};

/**
 * Get the category for a notification type
 */
export function getNotificationCategory(type: string): NotificationCategory {
  return NOTIFICATION_CATEGORIES[type] || 'system';
}

/**
 * Check if user has enabled notifications for a specific category
 */
async function checkUserPreference(userId: string, category: NotificationCategory): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('enabled')
      .eq('user_id', userId)
      .eq('category', category)
      .maybeSingle();

    if (error) {
      // If table doesn't exist or error, default to enabled
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return true;
      }
      console.error('Error checking notification preference:', error);
      return true; // Default to enabled on error
    }

    // If no preference set, default to enabled
    return data?.enabled !== false;
  } catch (error) {
    console.error('Error checking notification preference:', error);
    return true; // Default to enabled
  }
}

/**
 * Create a notification (with preference checking)
 */
async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  options?: {
    linkUrl?: string;
    linkType?: string;
    linkId?: string;
    actorId?: string;
    metadata?: any;
  }
): Promise<boolean> {
  try {
    // Check user preferences
    const category = getNotificationCategory(type);
    const isEnabled = await checkUserPreference(userId, category);
    
    if (!isEnabled) {
      console.log(`Notification skipped (user disabled '${category}' notifications): ${type}`);
      return false;
    }

    // Create the notification
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: options?.actorId,
        type,
        title,
        message,
        link_url: options?.linkUrl,
        link_type: options?.linkType,
        link_id: options?.linkId,
        metadata: options?.metadata,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// =============================================================================
// SOCIAL NOTIFICATIONS
// =============================================================================

/**
 * Notify when someone comments on your post
 */
export async function notifyPostComment(
  postAuthorId: string,
  commentAuthorId: string,
  commentAuthorName: string,
  postId: string,
  postTitle: string,
  commentPreview: string
): Promise<void> {
  if (postAuthorId === commentAuthorId) return; // Don't notify self

  await createNotification(
    postAuthorId,
    'comment',
    `${commentAuthorName} commented on your post`,
    `"${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? '...' : ''}"`,
    {
      linkUrl: `/feed?post=${postId}`,
      linkType: 'post',
      linkId: postId,
      actorId: commentAuthorId,
    }
  );
}

/**
 * Notify when someone replies to your comment
 */
export async function notifyCommentReply(
  originalCommentAuthorId: string,
  replyAuthorId: string,
  replyAuthorName: string,
  postId: string,
  replyPreview: string
): Promise<void> {
  if (originalCommentAuthorId === replyAuthorId) return;

  await createNotification(
    originalCommentAuthorId,
    'comment_reply',
    `${replyAuthorName} replied to your comment`,
    `"${replyPreview.substring(0, 100)}${replyPreview.length > 100 ? '...' : ''}"`,
    {
      linkUrl: `/feed?post=${postId}`,
      linkType: 'post',
      linkId: postId,
      actorId: replyAuthorId,
    }
  );
}

/**
 * Notify when someone mentions you
 */
export async function notifyMention(
  mentionedUserId: string,
  mentionerUserId: string,
  mentionerName: string,
  contentType: 'post' | 'comment' | 'document',
  contentId: string,
  contentPreview: string,
  linkUrl: string
): Promise<void> {
  if (mentionedUserId === mentionerUserId) return;

  await createNotification(
    mentionedUserId,
    'mention',
    `${mentionerName} mentioned you`,
    `"${contentPreview.substring(0, 100)}${contentPreview.length > 100 ? '...' : ''}"`,
    {
      linkUrl,
      linkType: contentType,
      linkId: contentId,
      actorId: mentionerUserId,
    }
  );
}

/**
 * Notify when someone likes your content
 */
export async function notifyLike(
  contentAuthorId: string,
  likerUserId: string,
  likerName: string,
  contentType: 'post' | 'comment' | 'document',
  contentId: string,
  contentTitle: string,
  linkUrl: string
): Promise<void> {
  if (contentAuthorId === likerUserId) return;

  await createNotification(
    contentAuthorId,
    'like',
    `${likerName} liked your ${contentType}`,
    contentTitle.substring(0, 150),
    {
      linkUrl,
      linkType: contentType,
      linkId: contentId,
      actorId: likerUserId,
    }
  );
}

/**
 * Notify when someone follows you
 */
export async function notifyNewFollower(
  followedUserId: string,
  followerUserId: string,
  followerName: string
): Promise<void> {
  await createNotification(
    followedUserId,
    'follow',
    'New follower',
    `${followerName} started following you`,
    {
      linkUrl: `/users/${followerUserId}`,
      linkType: 'user',
      linkId: followerUserId,
      actorId: followerUserId,
    }
  );
}

// =============================================================================
// EVENT NOTIFICATIONS
// =============================================================================

/**
 * Notify circle members when a new event is created
 */
export async function notifyEventCreated(
  circleId: string,
  eventId: string,
  eventTitle: string,
  eventDate: string,
  creatorId: string
): Promise<void> {
  try {
    // Get all active circle members (excluding creator)
    const { data: members } = await supabase
      .from('container_memberships')
      .select('user_id')
      .eq('container_type', 'circle')
      .eq('container_id', circleId)
      .eq('status', 'active')
      .neq('user_id', creatorId);

    if (!members || members.length === 0) return;

    const formattedDate = new Date(eventDate).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Create notifications for all members
    for (const member of members) {
      await createNotification(
        member.user_id,
        'event_created',
        `New event: ${eventTitle}`,
        `Scheduled for ${formattedDate}`,
        {
          linkUrl: `/events?id=${eventId}`,
          linkType: 'event',
          linkId: eventId,
          actorId: creatorId,
        }
      );
    }
  } catch (error) {
    console.error('Error notifying event created:', error);
  }
}

/**
 * Notify RSVPed users when an event is cancelled
 */
export async function notifyEventCancelled(
  eventId: string,
  eventTitle: string,
  reason?: string
): Promise<void> {
  try {
    // Get all users who RSVPed to this event
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'attending');

    if (!rsvps || rsvps.length === 0) return;

    const message = reason 
      ? `${eventTitle} has been cancelled. Reason: ${reason}`
      : `${eventTitle} has been cancelled.`;

    for (const rsvp of rsvps) {
      await createNotification(
        rsvp.user_id,
        'event_cancelled',
        'Event Cancelled',
        message,
        {
          linkUrl: '/events',
          linkType: 'event',
          linkId: eventId,
        }
      );
    }
  } catch (error) {
    console.error('Error notifying event cancelled:', error);
  }
}

/**
 * Notify RSVPed users when an event is rescheduled
 */
export async function notifyEventRescheduled(
  eventId: string,
  eventTitle: string,
  newDate: string
): Promise<void> {
  try {
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'attending');

    if (!rsvps || rsvps.length === 0) return;

    const formattedDate = new Date(newDate).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const rsvp of rsvps) {
      await createNotification(
        rsvp.user_id,
        'event_rescheduled',
        'Event Rescheduled',
        `${eventTitle} has been rescheduled to ${formattedDate}`,
        {
          linkUrl: `/events?id=${eventId}`,
          linkType: 'event',
          linkId: eventId,
        }
      );
    }
  } catch (error) {
    console.error('Error notifying event rescheduled:', error);
  }
}

/**
 * Notify event host when someone RSVPs
 */
export async function notifyEventRSVP(
  eventId: string,
  eventTitle: string,
  hostId: string,
  attendeeId: string,
  attendeeName: string,
  rsvpStatus: 'going' | 'maybe'
): Promise<void> {
  if (hostId === attendeeId) return; // Don't notify host about their own RSVP

  const statusEmoji = rsvpStatus === 'going' ? '✅' : '🤔';
  const statusText = rsvpStatus === 'going' ? 'will attend' : 'might attend';

  await createNotification(
    hostId,
    'rsvp_confirmation',
    `${statusEmoji} New RSVP for ${eventTitle}`,
    `${attendeeName} ${statusText} your event`,
    {
      linkUrl: `/events?id=${eventId}`,
      linkType: 'event',
      linkId: eventId,
      actorId: attendeeId,
    }
  );
}

/**
 * Create a session reminder notification
 */
export async function createSessionReminderNotification(
  userId: string,
  sessionId: string,
  sessionName: string,
  sessionDate: string,
  programName?: string
): Promise<void> {
  const formattedDate = new Date(sessionDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const programContext = programName ? ` in ${programName}` : '';

  await createNotification(
    userId,
    'session_reminder',
    `📅 Reminder: ${sessionName}`,
    `Don't forget! ${sessionName}${programContext} is scheduled for ${formattedDate}.`,
    {
      linkUrl: '/my-sessions',
      linkType: 'sessions',
      linkId: sessionId,
    }
  );
}

/**
 * Create a session attendance thank you notification
 */
export async function createSessionAttendanceNotification(
  userId: string,
  sessionId: string,
  sessionName: string,
  nextSessionName?: string,
  nextSessionDate?: string
): Promise<void> {
  let message = `Thanks for attending ${sessionName}!`;
  
  if (nextSessionName && nextSessionDate) {
    const formattedDate = new Date(nextSessionDate).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    message += ` Your next session is ${nextSessionName} on ${formattedDate}.`;
  }

  await createNotification(
    userId,
    'session_attendance',
    '✅ Great job!',
    message,
    {
      linkUrl: '/my-sessions',
      linkType: 'sessions',
      linkId: sessionId,
    }
  );
}

// =============================================================================
// CIRCLE/PROGRAM NOTIFICATIONS
// =============================================================================

/**
 * Create a notification for a user based on their application state change
 */
export async function createApplicationNotification(
  userId: string,
  programId: string,
  programName: string,
  programSlug: string,
  newStatus: string,
  actorId?: string
): Promise<void> {
  const templates: Record<string, { type: string; title: string; message: string; linkUrl: string }> = {
    approved: {
      type: 'application_approved',
      title: `🎉 Accepted to ${programName}!`,
      message: `Congratulations! You've been accepted to ${programName}. Complete your enrollment to secure your spot.`,
      linkUrl: `/programs/${programSlug}`,
    },
    rejected: {
      type: 'application_rejected',
      title: `Update on your ${programName} application`,
      message: `Thank you for applying to ${programName}. Unfortunately, we're unable to offer you a spot in the current cohort.`,
      linkUrl: `/programs/${programSlug}`,
    },
    waitlisted: {
      type: 'application_waitlisted',
      title: `You're on the waitlist for ${programName}`,
      message: `Your application to ${programName} has been placed on the waitlist. We'll notify you if a spot opens up.`,
      linkUrl: `/programs/${programSlug}`,
    },
    enrolled: {
      type: 'enrollment_complete',
      title: `Welcome to ${programName}! 🎊`,
      message: `Your enrollment in ${programName} is complete! Get ready for your first session.`,
      linkUrl: '/my-sessions',
    },
  };

  const template = templates[newStatus];
  if (!template) return;

  await createNotification(
    userId,
    template.type,
    template.title,
    template.message,
    {
      linkUrl: template.linkUrl,
      linkType: 'program',
      linkId: programId,
      actorId,
    }
  );

  // Update program_applications with notification tracking
  try {
    await supabase
      .from('program_applications')
      .update({
        notification_sent_at: new Date().toISOString(),
        notification_type: newStatus,
      })
      .eq('user_id', userId)
      .eq('program_id', programId);
  } catch (error) {
    console.error('Error updating program application:', error);
  }
}

/**
 * Notify admins when a new member joins (after approval)
 */
export async function notifyMemberJoined(
  containerType: 'circle' | 'program',
  containerId: string,
  containerName: string,
  newMemberId: string,
  newMemberName: string,
  adminIds: string[]
): Promise<void> {
  for (const adminId of adminIds) {
    await createNotification(
      adminId,
      'member_joined',
      'New member joined',
      `${newMemberName} has joined ${containerName}`,
      {
        linkUrl: `/${containerType}s/${containerId}/members`,
        linkType: containerType,
        linkId: containerId,
        actorId: newMemberId,
      }
    );
  }
}

/**
 * Notify user when their role changes
 */
export async function notifyRoleChanged(
  userId: string,
  containerType: 'circle' | 'program',
  containerId: string,
  containerName: string,
  oldRole: string,
  newRole: string,
  actorId?: string
): Promise<void> {
  const isPromotion = ['member', 'host', 'moderator', 'admin', 'coordinator', 'manager', 'super'].indexOf(newRole) >
    ['member', 'host', 'moderator', 'admin', 'coordinator', 'manager', 'super'].indexOf(oldRole);

  await createNotification(
    userId,
    'role_changed',
    isPromotion ? '🎉 Role Promotion' : 'Role Changed',
    `Your role in ${containerName} has been ${isPromotion ? 'promoted' : 'changed'} from ${oldRole} to ${newRole}`,
    {
      linkUrl: `/${containerType}s/${containerId}`,
      linkType: containerType,
      linkId: containerId,
      actorId,
    }
  );
}

/**
 * Create an engagement at-risk notification
 */
export async function createEngagementAtRiskNotification(
  userId: string,
  programId: string,
  programName: string,
  consecutiveAbsences: number
): Promise<void> {
  await createNotification(
    userId,
    'engagement_at_risk',
    `We miss you in ${programName}`,
    `We noticed you've missed ${consecutiveAbsences} recent sessions. Is everything okay? Let us know if there's anything we can do to support you.`,
    {
      linkUrl: '/my-sessions',
      linkType: 'program',
      linkId: programId,
    }
  );
}

// =============================================================================
// FORUM NOTIFICATIONS
// =============================================================================

/**
 * Notify thread author when someone replies
 */
export async function notifyThreadReply(
  threadAuthorId: string,
  replyAuthorId: string,
  replyAuthorName: string,
  threadId: string,
  threadTitle: string,
  replyPreview: string
): Promise<void> {
  if (threadAuthorId === replyAuthorId) return;

  await createNotification(
    threadAuthorId,
    'comment_reply',
    `New reply in your thread`,
    `${replyAuthorName} replied to "${threadTitle}"`,
    {
      linkUrl: `/forums/${threadId}`,
      linkType: 'thread',
      linkId: threadId,
      actorId: replyAuthorId,
    }
  );
}

// =============================================================================
// DOCUMENT NOTIFICATIONS
// =============================================================================

/**
 * Notify document author when someone comments
 */
export async function notifyDocumentComment(
  documentAuthorId: string,
  commenterUserId: string,
  commenterName: string,
  documentId: string,
  documentTitle: string,
  commentPreview: string
): Promise<void> {
  if (documentAuthorId === commenterUserId) return;

  await createNotification(
    documentAuthorId,
    'comment',
    `New comment on your document`,
    `${commenterName} commented on "${documentTitle}"`,
    {
      linkUrl: `/documents/${documentId}`,
      linkType: 'document',
      linkId: documentId,
      actorId: commenterUserId,
    }
  );
}

/**
 * Notify document author when their content is approved/rejected
 */
export async function notifyContentModeration(
  authorId: string,
  contentType: 'document' | 'post' | 'build',
  contentId: string,
  contentTitle: string,
  approved: boolean,
  moderatorNote?: string
): Promise<void> {
  const type = approved ? 'content_approved' : 'content_rejected';
  const title = approved ? '✅ Content Approved' : '❌ Content Rejected';
  const message = approved
    ? `Your ${contentType} "${contentTitle}" has been approved and is now visible.`
    : `Your ${contentType} "${contentTitle}" was not approved. ${moderatorNote || ''}`;

  await createNotification(
    authorId,
    type,
    title,
    message,
    {
      linkUrl: `/${contentType}s/${contentId}`,
      linkType: contentType,
      linkId: contentId,
    }
  );
}

// =============================================================================
// SYSTEM NOTIFICATIONS
// =============================================================================

/**
 * Send welcome notification to new user
 */
export async function notifyWelcome(userId: string, userName: string): Promise<void> {
  await createNotification(
    userId,
    'welcome',
    `Welcome to CONNEXTED LABS, ${userName}! 🎉`,
    'Discover circles, connect with innovators, and start your journey.',
    {
      linkUrl: '/discovery',
      linkType: 'system',
    }
  );
}

/**
 * Send platform announcement to all users or specific group
 */
export async function notifyAnnouncement(
  userIds: string[],
  title: string,
  message: string,
  linkUrl?: string
): Promise<void> {
  for (const userId of userIds) {
    await createNotification(
      userId,
      'announcement',
      title,
      message,
      {
        linkUrl: linkUrl || '/news',
        linkType: 'system',
      }
    );
  }
}