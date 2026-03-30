/**
 * Circle Permission Helpers
 * 
 * Determines what users can do with circles based on:
 * - Their platform role (member, host, moderator, admin, coordinator, manager, super)
 * - Their assignment to the circle (admin_ids, moderator_ids, host_ids, member_ids)
 * - Their assignment to the parent program (if circle is in a program)
 */

import { ROLES, hasRoleLevel } from '@/lib/constants/roles';

export interface User {
  id: string;
  role: string;
}

export interface Circle {
  id: string;
  admin_ids?: string[];
  moderator_ids?: string[];
  host_ids?: string[];
  member_ids?: string[];
  access_type?: 'open' | 'request' | 'invite';
}

export interface Program {
  id: string;
  manager_ids?: string[];
  coordinator_ids?: string[];
}

/**
 * Check if user can view a circle
 */
export function canViewCircle(user: User, circle: Circle): boolean {
  // Super users and admins can view all circles
  if (user.role === ROLES.SUPER || user.role === ROLES.ADMIN) {
    return true;
  }

  // Open circles are visible to all
  if (circle.access_type === 'open') {
    return true;
  }

  // Circle admins can view
  if (circle.admin_ids?.includes(user.id)) {
    return true;
  }

  // Circle moderators can view
  if (circle.moderator_ids?.includes(user.id)) {
    return true;
  }

  // Circle hosts can view
  if (circle.host_ids?.includes(user.id)) {
    return true;
  }

  // Circle members can view
  if (circle.member_ids?.includes(user.id)) {
    return true;
  }

  return false;
}

/**
 * Check if user can admin a circle (manage settings, members)
 */
export function canAdminCircle(user: User, circle: Circle, program?: Program): boolean {
  // Super users can admin all circles
  if (user.role === ROLES.SUPER) {
    return true;
  }

  // Users with admin role can admin all circles
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  // Circle admins can admin their circles
  if (circle.admin_ids?.includes(user.id)) {
    return true;
  }

  // Program managers can admin circles in their programs
  if (program?.manager_ids?.includes(user.id)) {
    return true;
  }

  return false;
}

/**
 * Check if user can moderate circle content (delete inappropriate posts)
 * Note: Moderators can moderate but NOT manage circle settings/members
 */
export function canModerateCircle(
  user: User,
  circle: Circle,
  program?: Program
): boolean {
  // All admin rights include moderation rights
  if (canAdminCircle(user, circle, program)) {
    return true;
  }

  // Circle moderators can moderate
  if (
    user.role === ROLES.MODERATOR &&
    circle.moderator_ids?.includes(user.id)
  ) {
    return true;
  }

  // Program coordinators can moderate circles in their programs
  if (
    program &&
    user.role === ROLES.COORDINATOR &&
    program.coordinator_ids?.includes(user.id)
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can manage circle members (add/remove)
 */
export function canManageCircleMembers(
  user: User,
  circle: Circle,
  program?: Program
): boolean {
  // Only admins can manage members (moderators cannot)
  return canAdminCircle(user, circle, program);
}

/**
 * Check if user can modify circle settings
 */
export function canModifyCircleSettings(
  user: User,
  circle: Circle,
  program?: Program
): boolean {
  // Only admins can modify settings (moderators cannot)
  return canAdminCircle(user, circle, program);
}

/**
 * Check if user can host containers in a circle
 */
export function canHostInCircle(user: User, circle: Circle): boolean {
  // Must have at least host role level
  if (!hasRoleLevel(user.role as any, ROLES.HOST)) {
    return false;
  }

  // Circle admins, moderators, and hosts can host
  return (
    circle.admin_ids?.includes(user.id) ||
    circle.moderator_ids?.includes(user.id) ||
    circle.host_ids?.includes(user.id)
  );
}

/**
 * Check if user can delete content in a circle
 */
export function canDeleteCircleContent(
  user: User,
  circle: Circle,
  program?: Program,
  isOwnContent: boolean = false
): boolean {
  // Users can always delete their own content
  if (isOwnContent) {
    return true;
  }

  // Moderators and higher can delete content
  return canModerateCircle(user, circle, program);
}

/**
 * Get user's role within a circle
 */
export function getCircleRole(
  user: User,
  circle: Circle
): 'admin' | 'moderator' | 'host' | 'member' | null {
  if (circle.admin_ids?.includes(user.id)) {
    return 'admin';
  }

  if (circle.moderator_ids?.includes(user.id)) {
    return 'moderator';
  }

  if (circle.host_ids?.includes(user.id)) {
    return 'host';
  }

  if (circle.member_ids?.includes(user.id)) {
    return 'member';
  }

  return null;
}
