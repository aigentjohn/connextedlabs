/**
 * Container Permission Helpers
 * 
 * Determines what users can do with containers (events, meetings, tables, etc.) based on:
 * - Their platform role (member, host, moderator, admin, coordinator, manager, super)
 * - Their assignment to the container (admin_ids, host_ids, member_ids)
 * - Their role in parent circle/program
 */

import { ROLES, hasRoleLevel } from '@/lib/constants/roles';

export interface User {
  id: string;
  role: string;
}

export interface Container {
  id: string;
  created_by?: string;
  admin_ids?: string[];
  host_ids?: string[];
  member_ids?: string[];
  visibility?: 'public' | 'members-only' | 'private';
}

export interface Circle {
  id: string;
  admin_ids?: string[];
  moderator_ids?: string[];
  host_ids?: string[];
}

export interface Program {
  id: string;
  manager_ids?: string[];
  coordinator_ids?: string[];
}

/**
 * Check if user can view a container
 */
export function canViewContainer(user: User, container: Container): boolean {
  // Super users can view all containers
  if (user.role === ROLES.SUPER) {
    return true;
  }

  // Public containers are visible to all
  if (container.visibility === 'public') {
    return true;
  }

  // Creator can view
  if (container.created_by === user.id) {
    return true;
  }

  // Container admins can view
  if (container.admin_ids?.includes(user.id)) {
    return true;
  }

  // Container hosts can view
  if (container.host_ids?.includes(user.id)) {
    return true;
  }

  // Container members can view
  if (container.member_ids?.includes(user.id)) {
    return true;
  }

  // Members-only containers visible to authenticated users
  if (container.visibility === 'members-only') {
    return true;
  }

  return false;
}

/**
 * Check if user can create containers
 */
export function canCreateContainer(user: User): boolean {
  // Must have at least host role level
  return hasRoleLevel(user.role as any, ROLES.HOST);
}

/**
 * Check if user can admin a container (manage settings, delete)
 */
export function canAdminContainer(
  user: User,
  container: Container,
  circle?: Circle,
  program?: Program
): boolean {
  // Super users can admin all containers
  if (user.role === ROLES.SUPER) {
    return true;
  }

  // Creator can admin
  if (container.created_by === user.id) {
    return true;
  }

  // Container admins can admin
  if (container.admin_ids?.includes(user.id)) {
    return true;
  }

  // Circle admins can admin containers in their circles
  if (circle?.admin_ids?.includes(user.id)) {
    return true;
  }

  // Program managers can admin containers in their programs
  if (program?.manager_ids?.includes(user.id)) {
    return true;
  }

  // Platform admins can admin all containers
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  return false;
}

/**
 * Check if user can host a container (manage but not delete)
 */
export function canHostContainer(
  user: User,
  container: Container,
  circle?: Circle
): boolean {
  // All admin rights include host rights
  if (canAdminContainer(user, container, circle)) {
    return true;
  }

  // Container hosts can host
  if (container.host_ids?.includes(user.id)) {
    return true;
  }

  // Circle moderators can host containers in their circles
  if (
    circle &&
    user.role === ROLES.MODERATOR &&
    circle.moderator_ids?.includes(user.id)
  ) {
    return true;
  }

  // Circle hosts can host containers in their circles
  if (circle?.host_ids?.includes(user.id)) {
    return true;
  }

  return false;
}

/**
 * Check if user can modify container settings
 */
export function canModifyContainerSettings(
  user: User,
  container: Container,
  circle?: Circle,
  program?: Program
): boolean {
  // Only admins and hosts can modify settings
  return canHostContainer(user, container, circle);
}

/**
 * Check if user can delete a container
 */
export function canDeleteContainer(
  user: User,
  container: Container,
  circle?: Circle,
  program?: Program
): boolean {
  // Only admins can delete (hosts cannot)
  return canAdminContainer(user, container, circle, program);
}

/**
 * Check if user can manage container members (add/remove)
 */
export function canManageContainerMembers(
  user: User,
  container: Container,
  circle?: Circle,
  program?: Program
): boolean {
  // Coordinators and higher can manage members
  if (
    program &&
    user.role === ROLES.COORDINATOR &&
    program.coordinator_ids?.includes(user.id)
  ) {
    return true;
  }

  // Hosts and admins can manage members
  return canHostContainer(user, container, circle);
}

/**
 * Check if user can moderate container content (delete inappropriate posts)
 */
export function canModerateContainer(
  user: User,
  container: Container,
  circle?: Circle,
  program?: Program
): boolean {
  // Moderators and higher can moderate
  if (
    circle &&
    user.role === ROLES.MODERATOR &&
    circle.moderator_ids?.includes(user.id)
  ) {
    return true;
  }

  // Coordinators can moderate containers in their programs
  if (
    program &&
    user.role === ROLES.COORDINATOR &&
    program.coordinator_ids?.includes(user.id)
  ) {
    return true;
  }

  // Hosts and admins can moderate
  return canHostContainer(user, container, circle);
}

/**
 * Get user's role within a container
 */
export function getContainerRole(
  user: User,
  container: Container
): 'admin' | 'host' | 'member' | null {
  if (
    container.admin_ids?.includes(user.id) ||
    container.created_by === user.id
  ) {
    return 'admin';
  }

  if (container.host_ids?.includes(user.id)) {
    return 'host';
  }

  if (container.member_ids?.includes(user.id)) {
    return 'member';
  }

  return null;
}
