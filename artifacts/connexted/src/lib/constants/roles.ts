/**
 * Role System Constants
 * 
 * Defines the platform role hierarchy and permission levels.
 * 
 * ROLE HIERARCHY (authority level):
 * MEMBER → HOST → MODERATOR → ADMIN → COORDINATOR → MANAGER → SUPER
 * 
 * SCOPE LEVELS:
 * - MEMBER: Access only
 * - HOST: Container-level admin
 * - MODERATOR: Circle-level moderation (assigned via circles.moderator_ids)
 * - ADMIN: Circle-level administration
 * - COORDINATOR: Program-level coordination (assigned via programs.coordinator_ids)
 * - MANAGER: Program-level administration
 * - SUPER: Platform-level administration
 */

export const ROLES = {
  MEMBER: 'member',
  HOST: 'host',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  COORDINATOR: 'coordinator',
  MANAGER: 'manager',
  SUPER: 'super',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Role hierarchy levels (higher number = more authority)
 * Used for permission checks and role comparisons
 */
export const ROLE_LEVELS = {
  member: 0,
  host: 1,
  moderator: 2,
  admin: 3,
  coordinator: 4,
  manager: 5,
  super: 6,
} as const;

/**
 * Check if user has required role level or higher
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user meets or exceeds required role level
 */
export function hasRoleLevel(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

/**
 * Check if user is a platform admin (super)
 */
export function isPlatformAdmin(role: Role): boolean {
  return role === ROLES.SUPER;
}

/**
 * Check if user can manage programs
 */
export function canManagePrograms(role: Role): boolean {
  return hasRoleLevel(role, ROLES.MANAGER);
}

/**
 * Check if user can coordinate programs
 */
export function canCoordinatePrograms(role: Role): boolean {
  return hasRoleLevel(role, ROLES.COORDINATOR);
}

/**
 * Check if user can admin circles
 */
export function canAdminCircles(role: Role): boolean {
  return hasRoleLevel(role, ROLES.ADMIN);
}

/**
 * Check if user can moderate content
 */
export function canModerateContent(role: Role): boolean {
  return hasRoleLevel(role, ROLES.MODERATOR);
}

/**
 * Check if user can admin containers
 */
export function canAdminContainers(role: Role): boolean {
  return hasRoleLevel(role, ROLES.HOST);
}

/**
 * Check if user can access platform admin features (super only)
 */
export function canAccessPlatformAdmin(role: Role): boolean {
  return isPlatformAdmin(role);
}

/**
 * Check if user can manage circles (admin or higher)
 */
export function canManageCircles(role: Role): boolean {
  return hasRoleLevel(role, ROLES.ADMIN);
}

/**
 * Get display information for a role
 */
export function getRoleDisplay(role: Role): {
  label: string;
  color: string;
  description: string;
} {
  const roleDisplayMap = {
    member: {
      label: 'Member',
      color: 'gray',
      description: 'Can participate in circles and containers',
    },
    host: {
      label: 'Host',
      color: 'blue',
      description: 'Can host and admin containers',
    },
    moderator: {
      label: 'Moderator',
      color: 'purple',
      description: 'Can moderate content in assigned circles',
    },
    admin: {
      label: 'Admin',
      color: 'green',
      description: 'Can administer circles and manage members',
    },
    coordinator: {
      label: 'Coordinator',
      color: 'orange',
      description: 'Can coordinate programs and manage members',
    },
    manager: {
      label: 'Manager',
      color: 'red',
      description: 'Can manage programs and modify settings',
    },
    super: {
      label: 'Super Admin',
      color: 'black',
      description: 'Platform administrator with full access',
    },
  };

  return roleDisplayMap[role];
}

/**
 * Get all available roles for display/selection
 */
export function getAllRoles(): Role[] {
  return [
    ROLES.MEMBER,
    ROLES.HOST,
    ROLES.MODERATOR,
    ROLES.ADMIN,
    ROLES.COORDINATOR,
    ROLES.MANAGER,
    ROLES.SUPER,
  ];
}

/**
 * Membership tier constants
 * Note: These control capacity limits (HOW MUCH you can do)
 * while roles control authority (WHAT you can do)
 */
export const MEMBERSHIP_TIERS = {
  FREE: 'free',
  MEMBER: 'member',
  PREMIUM: 'premium',
  UNLIMITED: 'unlimited',
} as const;

export type MembershipTier = typeof MEMBERSHIP_TIERS[keyof typeof MEMBERSHIP_TIERS];