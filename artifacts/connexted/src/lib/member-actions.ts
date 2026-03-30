/**
 * Member Actions Utility
 * 
 * Converts admin-managed states into member-facing action items.
 * States are invisible to members - they only see what they need to DO next.
 */

import { MemberState } from './participant-states';

export interface MemberAction {
  priority: 'urgent' | 'normal' | 'low' | 'info';
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  icon: 'alert' | 'clock' | 'check' | 'calendar' | 'users' | 'star' | 'info';
  category: 'action_required' | 'pending' | 'active' | 'upcoming' | 'completed';
}

/**
 * Maps a member state to a member-facing action item
 */
export function stateToMemberAction(
  state: MemberState,
  containerType: 'program' | 'circle',
  containerName: string,
  containerSlug: string,
  nextSessionDate?: Date
): MemberAction {
  const stateId = state.id;

  // Program-specific actions
  if (containerType === 'program') {
    switch (stateId) {
      case 'applied':
        return {
          priority: 'normal',
          title: `Application submitted for ${containerName}`,
          description: 'Your application is under review. We\'ll notify you when there\'s an update.',
          icon: 'clock',
          category: 'pending'
        };

      case 'approved':
        return {
          priority: 'urgent',
          title: `You've been approved for ${containerName}!`,
          description: 'Complete your enrollment to secure your spot.',
          actionLabel: 'Complete Enrollment',
          actionUrl: `/programs/${containerSlug}/enroll`,
          icon: 'alert',
          category: 'action_required'
        };

      case 'waitlisted':
        return {
          priority: 'low',
          title: `You're on the waitlist for ${containerName}`,
          description: 'We\'ll notify you if a spot opens up. You\'ll be among the first to know!',
          icon: 'clock',
          category: 'pending'
        };

      case 'rejected':
        return {
          priority: 'info',
          title: `Application update for ${containerName}`,
          description: 'Unfortunately, we\'re unable to accept your application at this time. We encourage you to apply again in the future.',
          icon: 'info',
          category: 'completed'
        };

      case 'enrolled':
        return {
          priority: 'urgent',
          title: `RSVP for ${containerName}`,
          description: nextSessionDate 
            ? `Your first session is coming up on ${nextSessionDate.toLocaleDateString()}. Please RSVP!`
            : 'RSVP for your first session to confirm your attendance.',
          actionLabel: 'RSVP Now',
          actionUrl: `/programs/${containerSlug}`,
          icon: 'calendar',
          category: 'action_required'
        };

      case 'rsvpd':
        return {
          priority: 'normal',
          title: `You're all set for ${containerName}!`,
          description: nextSessionDate
            ? `See you at the session on ${nextSessionDate.toLocaleDateString()}.`
            : 'See you at the session!',
          actionLabel: 'View Details',
          actionUrl: `/programs/${containerSlug}`,
          icon: 'check',
          category: 'upcoming'
        };

      case 'attended':
        return {
          priority: 'normal',
          title: `Great job attending ${containerName}!`,
          description: 'Keep up the momentum. Check out upcoming sessions and engage with your cohort.',
          actionLabel: 'View Program',
          actionUrl: `/programs/${containerSlug}`,
          icon: 'star',
          category: 'active'
        };

      case 'active':
        return {
          priority: 'normal',
          title: `You're active in ${containerName}`,
          description: 'Continue participating, attending sessions, and engaging with your cohort.',
          actionLabel: 'Go to Program',
          actionUrl: `/programs/${containerSlug}`,
          icon: 'users',
          category: 'active'
        };

      case 'at_risk':
        return {
          priority: 'urgent',
          title: `We miss you in ${containerName}!`,
          description: 'You\'ve been less active recently. Catch up on sessions or reach out if you need support.',
          actionLabel: 'Get Back On Track',
          actionUrl: `/programs/${containerSlug}`,
          icon: 'alert',
          category: 'action_required'
        };

      case 'completed':
        return {
          priority: 'info',
          title: `Congratulations! You completed ${containerName}`,
          description: 'Well done! Check out other programs or stay connected with your cohort.',
          actionLabel: 'Explore More',
          actionUrl: '/programs',
          icon: 'star',
          category: 'completed'
        };

      case 'dropped':
        return {
          priority: 'info',
          title: `You've left ${containerName}`,
          description: 'We\'re sorry to see you go. You\'re always welcome to rejoin in the future.',
          icon: 'info',
          category: 'completed'
        };

      default:
        return {
          priority: 'normal',
          title: containerName,
          description: 'You\'re participating in this program.',
          actionLabel: 'View Program',
          actionUrl: `/programs/${containerSlug}`,
          icon: 'users',
          category: 'active'
        };
    }
  }

  // Circle-specific actions
  if (containerType === 'circle') {
    switch (stateId) {
      case 'requested':
        return {
          priority: 'normal',
          title: `Request to join ${containerName}`,
          description: 'Your request is under review. We\'ll notify you when there\'s an update.',
          icon: 'clock',
          category: 'pending'
        };

      case 'approved':
        return {
          priority: 'urgent',
          title: `You've been approved to join ${containerName}!`,
          description: 'Welcome! Start exploring and introduce yourself.',
          actionLabel: 'Visit Circle',
          actionUrl: `/circles/${containerSlug}`,
          icon: 'alert',
          category: 'action_required'
        };

      case 'invited':
        return {
          priority: 'urgent',
          title: `You've been invited to ${containerName}`,
          description: 'Accept your invitation to join this circle.',
          actionLabel: 'Accept Invitation',
          actionUrl: `/circles/${containerSlug}/accept`,
          icon: 'alert',
          category: 'action_required'
        };

      case 'new_member':
        return {
          priority: 'normal',
          title: `Welcome to ${containerName}!`,
          description: 'Introduce yourself and start participating in discussions.',
          actionLabel: 'Visit Circle',
          actionUrl: `/circles/${containerSlug}`,
          icon: 'users',
          category: 'active'
        };

      case 'active':
        return {
          priority: 'normal',
          title: `You're active in ${containerName}`,
          description: 'Keep engaging with posts, events, and other members.',
          actionLabel: 'Go to Circle',
          actionUrl: `/circles/${containerSlug}`,
          icon: 'users',
          category: 'active'
        };

      case 'engaged':
        return {
          priority: 'normal',
          title: `You're highly engaged in ${containerName}!`,
          description: 'Great work! You\'re making meaningful contributions.',
          actionLabel: 'Continue',
          actionUrl: `/circles/${containerSlug}`,
          icon: 'star',
          category: 'active'
        };

      case 'inactive':
        return {
          priority: 'urgent',
          title: `We miss you in ${containerName}!`,
          description: 'It\'s been a while. Catch up on what\'s new!',
          actionLabel: 'Return to Circle',
          actionUrl: `/circles/${containerSlug}`,
          icon: 'alert',
          category: 'action_required'
        };

      case 'left':
        return {
          priority: 'info',
          title: `You've left ${containerName}`,
          description: 'You\'re always welcome to rejoin if you change your mind.',
          icon: 'info',
          category: 'completed'
        };

      default:
        return {
          priority: 'normal',
          title: containerName,
          description: 'You\'re a member of this circle.',
          actionLabel: 'View Circle',
          actionUrl: `/circles/${containerSlug}`,
          icon: 'users',
          category: 'active'
        };
    }
  }

  // Fallback
  return {
    priority: 'normal',
    title: containerName,
    description: 'You\'re participating in this container.',
    icon: 'users',
    category: 'active'
  };
}

/**
 * Get priority sorting value
 */
export function getActionPriority(action: MemberAction): number {
  switch (action.priority) {
    case 'urgent': return 1;
    case 'normal': return 2;
    case 'low': return 3;
    case 'info': return 4;
    default: return 5;
  }
}

/**
 * Get category sorting value
 */
export function getCategoryPriority(category: MemberAction['category']): number {
  switch (category) {
    case 'action_required': return 1;
    case 'upcoming': return 2;
    case 'active': return 3;
    case 'pending': return 4;
    case 'completed': return 5;
    default: return 6;
  }
}

/**
 * Sort actions by priority and category
 */
export function sortMemberActions(actions: MemberAction[]): MemberAction[] {
  return [...actions].sort((a, b) => {
    const categoryDiff = getCategoryPriority(a.category) - getCategoryPriority(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    return getActionPriority(a) - getActionPriority(b);
  });
}
