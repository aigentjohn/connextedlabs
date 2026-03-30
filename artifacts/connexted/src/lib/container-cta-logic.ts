/**
 * Container CTA (Call-to-Action) Logic
 * 
 * Determines what button/action to show on container cards based on:
 * - User role (guest, member, admin)
 * - Container operational state (hidden, active, paused, etc.)
 * - Container access type (open, request, invite)
 * - User membership state (invited, applied, approved, enrolled, etc.)
 * - Container visibility (public, members-only, private)
 */

export type OperationalState = 
  | 'hidden' 
  | 'active' 
  | 'paused' 
  | 'frozen' 
  | 'suspended' 
  | 'archived';

export type LifecycleState = 
  | 'idea' 
  | 'created' 
  | 'released' 
  | 'active' 
  | 'engaged' 
  | 'stale';

export type MembershipState = 
  | 'invited' 
  | 'applied' 
  | 'approved' 
  | 'enrolled' 
  | 'completed' 
  | 'not_completed'
  | null;

export type AccessType = 'open' | 'request' | 'invite' | null;

export type Visibility = 'public' | 'members-only' | 'private';

export interface ContainerStateContext {
  operationalState?: OperationalState;
  lifecycleState?: LifecycleState;
  membershipState?: MembershipState;
  accessType?: AccessType;
  visibility?: Visibility;
  isAdmin: boolean;
  isGuest: boolean;
  hasplatformMembership?: boolean;
}

export interface CTA {
  type: 'primary' | 'secondary' | 'warning' | 'danger' | 'info' | null;
  label: string;
  action?: 'join' | 'request' | 'accept' | 'decline' | 'withdraw' | 'leave' | 'open' | 'manage' | 'notify' | 'waitlist';
  disabled?: boolean;
  message?: string; // Additional context message
}

/**
 * Get the primary CTA for a container card
 */
export function getContainerCTA(context: ContainerStateContext): CTA {
  const {
    operationalState = 'active',
    membershipState,
    accessType,
    visibility = 'public',
    isAdmin,
    isGuest,
    hasplatformMembership = true
  } = context;

  // 1. Admins always get admin CTAs
  if (isAdmin) {
    return getAdminCTA(operationalState);
  }

  // 2. Check if container is visible
  if (operationalState === 'hidden' && !isAdmin) {
    return { type: null, label: '' }; // Not visible
  }

  // 3. Check visibility settings
  if (visibility === 'private' && !membershipState && !isAdmin) {
    return { type: null, label: '' }; // Not visible
  }

  if (visibility === 'members-only' && !hasplatformMembership && !isGuest) {
    return {
      type: 'secondary',
      label: 'Become a Member',
      action: undefined,
      message: 'Platform membership required'
    };
  }

  // 4. Handle membership states
  if (membershipState) {
    return getMembershipStateCTA(membershipState, operationalState);
  }

  // 5. Handle non-members based on operational state and access type
  return getNonMemberCTA(operationalState, accessType, isGuest);
}

/**
 * Get CTA for admin users
 */
function getAdminCTA(operationalState: OperationalState): CTA {
  switch (operationalState) {
    case 'hidden':
      return {
        type: 'warning',
        label: 'Manage',
        action: 'manage',
        message: 'Hidden (Prep Mode)'
      };
    case 'paused':
      return {
        type: 'secondary',
        label: 'Manage',
        action: 'manage',
        message: 'Paused'
      };
    case 'frozen':
      return {
        type: 'secondary',
        label: 'Manage',
        action: 'manage',
        message: 'Enrollment Closed'
      };
    case 'suspended':
      return {
        type: 'danger',
        label: 'Manage',
        action: 'manage',
        message: 'Suspended'
      };
    case 'archived':
      return {
        type: 'info',
        label: 'View Archive',
        action: 'open',
        message: 'Archived'
      };
    default:
      return {
        type: 'primary',
        label: 'Manage',
        action: 'manage'
      };
  }
}

/**
 * Get CTA based on user's membership state
 */
function getMembershipStateCTA(
  membershipState: MembershipState,
  operationalState: OperationalState
): CTA {
  switch (membershipState) {
    case 'invited':
      if (operationalState === 'suspended') {
        return {
          type: 'info',
          label: 'Temporarily Unavailable',
          disabled: true,
          message: 'Cannot accept invitation while suspended'
        };
      }
      if (operationalState === 'archived') {
        return {
          type: 'info',
          label: 'Invitation Expired',
          disabled: true,
          message: 'Container has been archived'
        };
      }
      return {
        type: 'primary',
        label: 'Accept Invitation',
        action: 'accept',
        message: "You're invited!"
      };

    case 'applied':
      return {
        type: 'info',
        label: 'Application Pending',
        action: 'withdraw',
        message: 'Waiting for admin review'
      };

    case 'approved':
      if (operationalState === 'suspended') {
        return {
          type: 'info',
          label: 'Temporarily Unavailable',
          disabled: true
        };
      }
      return {
        type: 'primary',
        label: 'Complete Enrollment',
        action: 'accept',
        message: "You're approved!"
      };

    case 'enrolled':
      if (operationalState === 'suspended') {
        return {
          type: 'danger',
          label: 'Suspended',
          disabled: true,
          message: 'Access temporarily restricted'
        };
      }
      if (operationalState === 'archived') {
        return {
          type: 'secondary',
          label: 'View Archive',
          action: 'open',
          message: 'Completed'
        };
      }
      if (operationalState === 'paused') {
        return {
          type: 'secondary',
          label: 'View',
          action: 'open',
          message: 'On Break (Read-only)'
        };
      }
      return {
        type: 'primary',
        label: 'Open',
        action: 'open'
      };

    case 'completed':
    case 'not_completed':
      if (operationalState === 'archived') {
        return {
          type: 'secondary',
          label: 'View Archive',
          action: 'open',
          message: 'Alumni'
        };
      }
      return {
        type: 'info',
        label: 'Completed',
        action: 'open',
        message: 'You completed this container'
      };

    default:
      return { type: null, label: '' };
  }
}

/**
 * Get CTA for non-members based on operational state and access type
 */
function getNonMemberCTA(
  operationalState: OperationalState,
  accessType: AccessType,
  isGuest: boolean
): CTA {
  switch (operationalState) {
    case 'active':
      return getActiveNonMemberCTA(accessType, isGuest);

    case 'paused':
      return {
        type: 'secondary',
        label: 'Notify Me',
        action: 'notify',
        message: 'On Break'
      };

    case 'frozen':
      return {
        type: 'secondary',
        label: 'Join Waitlist',
        action: 'waitlist',
        message: 'Enrollment Closed'
      };

    case 'suspended':
      return {
        type: 'info',
        label: 'Temporarily Unavailable',
        disabled: true
      };

    case 'archived':
      return {
        type: 'secondary',
        label: 'View Archive',
        action: 'open',
        message: 'Completed'
      };

    default:
      return { type: null, label: '' };
  }
}

/**
 * Get CTA for active containers with non-members
 */
function getActiveNonMemberCTA(accessType: AccessType, isGuest: boolean): CTA {
  switch (accessType) {
    case 'open':
      return {
        type: 'primary',
        label: isGuest ? 'Join Circle' : 'Join',
        action: 'join',
        message: isGuest ? 'Login to join' : undefined
      };

    case 'request':
      return {
        type: 'primary',
        label: 'Request to Join',
        action: 'request',
        message: isGuest ? 'Login to request' : undefined
      };

    case 'invite':
      return {
        type: 'info',
        label: 'Invite Only',
        disabled: true,
        message: 'Must be invited by admin'
      };

    default:
      return {
        type: 'secondary',
        label: 'View',
        action: 'open'
      };
  }
}

/**
 * Get secondary action (e.g., "Leave" button for members)
 */
export function getSecondaryAction(context: ContainerStateContext): CTA | null {
  const { membershipState, operationalState, isAdmin } = context;

  // Members can leave (except when completed or archived)
  if (
    membershipState === 'enrolled' &&
    operationalState !== 'archived' &&
    !isAdmin
  ) {
    return {
      type: 'secondary',
      label: 'Leave',
      action: 'leave'
    };
  }

  // Applied users can withdraw
  if (membershipState === 'applied') {
    return {
      type: 'secondary',
      label: 'Withdraw',
      action: 'withdraw'
    };
  }

  // Invited users can decline
  if (membershipState === 'invited') {
    return {
      type: 'danger',
      label: 'Decline',
      action: 'decline'
    };
  }

  return null;
}
