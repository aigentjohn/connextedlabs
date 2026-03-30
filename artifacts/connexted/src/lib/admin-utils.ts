/**
 * Admin utility functions for checking platform admin access
 */

export interface UserProfile {
  id: string;
  role: string;
  [key: string]: any;
}

/**
 * Check if a user has platform admin access (admin or super role)
 */
export function isPlatformAdmin(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || profile.role === 'super';
}

/**
 * Check if a user has super admin access (highest level)
 */
export function isSuperAdmin(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.role === 'super';
}

/**
 * Check if a user has at least the specified role level
 * Role hierarchy: member → host → moderator → admin → coordinator → manager → super
 */
export function hasRoleLevel(
  profile: UserProfile | null | undefined,
  minRole: 'member' | 'host' | 'moderator' | 'admin' | 'coordinator' | 'manager' | 'super'
): boolean {
  if (!profile) return false;

  const roleHierarchy: Record<string, number> = {
    member: 1,
    host: 2,
    moderator: 3,
    admin: 4,
    coordinator: 5,
    manager: 6,
    super: 7,
  };

  const userRoleLevel = roleHierarchy[profile.role] || 0;
  const minRoleLevel = roleHierarchy[minRole] || 0;

  return userRoleLevel >= minRoleLevel;
}
