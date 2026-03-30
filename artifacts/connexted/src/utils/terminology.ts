/**
 * Terminology Helper
 * 
 * Provides consistent terminology across the platform for different entity types.
 * This allows us to use appropriate language without changing database schema.
 * 
 * Hierarchy:
 * - Container → USERS (use tools)
 * - Circle → MEMBERS (belong to communities)
 * - Program → ATTENDERS (enroll in structured programs)
 */

export type EntityType = 'container' | 'circle' | 'program';
export type ActionType = 'join' | 'joined' | 'leave';

/**
 * Terminology configuration for all entity types
 */
export const terminology = {
  // Participant terminology
  participant: {
    container: { 
      singular: 'User', 
      plural: 'Users',
      lowercase: { singular: 'user', plural: 'users' }
    },
    circle: { 
      singular: 'Member', 
      plural: 'Members',
      lowercase: { singular: 'member', plural: 'members' }
    },
    program: { 
      singular: 'Attender', 
      plural: 'Attenders',
      lowercase: { singular: 'attender', plural: 'attenders' }
    },
  },
  
  // Leader terminology
  leader: {
    container: { 
      singular: 'Host', 
      plural: 'Hosts',
      lowercase: { singular: 'host', plural: 'hosts' }
    },
    circle: { 
      singular: 'Leader', 
      plural: 'Leaders',
      lowercase: { singular: 'leader', plural: 'leaders' }
    },
    program: { 
      singular: 'Facilitator', 
      plural: 'Facilitators',
      lowercase: { singular: 'facilitator', plural: 'facilitators' }
    },
  },
  
  // Owner terminology (same for all entity types)
  owner: { 
    singular: 'Owner', 
    plural: 'Owners',
    lowercase: { singular: 'owner', plural: 'owners' }
  },
  
  // Action button labels
  action: {
    container: { 
      join: 'Use This', 
      joined: 'Using', 
      leave: 'Stop Using' 
    },
    circle: { 
      join: 'Join', 
      joined: 'Member', 
      leave: 'Leave' 
    },
    program: { 
      join: 'Enroll', 
      joined: 'Attending', 
      leave: 'Withdraw' 
    },
  },
  
  // Status badges
  status: {
    container: {
      member: 'User',
      admin: 'Owner',
      host: 'Host',
    },
    circle: {
      member: 'Member',
      admin: 'Owner',
      leader: 'Leader',
    },
    program: {
      member: 'Attender',
      admin: 'Owner',
      facilitator: 'Facilitator',
    },
  }
} as const;

/**
 * Get participant label for an entity type
 * @param type - The entity type
 * @param plural - Whether to return plural form (default: false)
 * @param lowercase - Whether to return lowercase form (default: false)
 * @returns The appropriate participant label
 */
export function getParticipantLabel(
  type: EntityType, 
  plural: boolean = false, 
  lowercase: boolean = false
): string {
  const term = terminology.participant[type];
  if (lowercase) {
    return plural ? term.lowercase.plural : term.lowercase.singular;
  }
  return plural ? term.plural : term.singular;
}

/**
 * Get leader label for an entity type
 * @param type - The entity type
 * @param plural - Whether to return plural form (default: false)
 * @param lowercase - Whether to return lowercase form (default: false)
 * @returns The appropriate leader label
 */
export function getLeaderLabel(
  type: EntityType, 
  plural: boolean = false,
  lowercase: boolean = false
): string {
  const term = terminology.leader[type];
  if (lowercase) {
    return plural ? term.lowercase.plural : term.lowercase.singular;
  }
  return plural ? term.plural : term.singular;
}

/**
 * Get owner label
 * @param plural - Whether to return plural form (default: false)
 * @param lowercase - Whether to return lowercase form (default: false)
 * @returns The owner label
 */
export function getOwnerLabel(
  plural: boolean = false,
  lowercase: boolean = false
): string {
  if (lowercase) {
    return plural ? terminology.owner.lowercase.plural : terminology.owner.lowercase.singular;
  }
  return plural ? terminology.owner.plural : terminology.owner.singular;
}

/**
 * Get action label for buttons
 * @param type - The entity type
 * @param action - The action type
 * @returns The appropriate action label
 */
export function getActionLabel(type: EntityType, action: ActionType): string {
  return terminology.action[type][action];
}

/**
 * Get status badge label
 * @param type - The entity type
 * @param role - The role type ('member' | 'admin' | 'host' | 'leader' | 'facilitator')
 * @returns The appropriate status label
 */
export function getStatusLabel(
  type: EntityType, 
  role: 'member' | 'admin' | 'host' | 'leader' | 'facilitator'
): string {
  const statusMap = terminology.status[type];
  
  // Map generic roles to specific terminology
  if (role === 'host' || role === 'leader' || role === 'facilitator') {
    if (type === 'container') return statusMap.host;
    if (type === 'circle') return statusMap.leader;
    if (type === 'program') return statusMap.facilitator;
  }
  
  if (role === 'admin') return statusMap.admin;
  return statusMap.member;
}

/**
 * Format a count with the appropriate participant label
 * @param type - The entity type
 * @param count - The count number
 * @param lowercase - Whether to use lowercase (default: true for counts)
 * @returns Formatted string like "12 users" or "1 member"
 */
export function formatParticipantCount(
  type: EntityType, 
  count: number,
  lowercase: boolean = true
): string {
  const label = getParticipantLabel(type, count !== 1, lowercase);
  return `${count} ${label}`;
}

/**
 * Get the appropriate field name for participants in database
 * (This is for documentation - we still use member_ids in database)
 */
export function getParticipantFieldName(type: EntityType): string {
  // Note: In database, we still use 'member_ids' for all entity types
  // This function is for documentation/reference only
  return 'member_ids';
}

/**
 * Examples of usage:
 * 
 * Container:
 *   getParticipantLabel('container') => 'User'
 *   getParticipantLabel('container', true) => 'Users'
 *   getParticipantLabel('container', true, true) => 'users'
 *   formatParticipantCount('container', 5) => '5 users'
 *   getActionLabel('container', 'join') => 'Use This'
 * 
 * Circle:
 *   getParticipantLabel('circle') => 'Member'
 *   getParticipantLabel('circle', true) => 'Members'
 *   formatParticipantCount('circle', 12) => '12 members'
 *   getActionLabel('circle', 'joined') => 'Member'
 * 
 * Program:
 *   getParticipantLabel('program') => 'Attender'
 *   getParticipantLabel('program', true) => 'Attenders'
 *   formatParticipantCount('program', 23) => '23 attenders'
 *   getActionLabel('program', 'join') => 'Enroll'
 */
