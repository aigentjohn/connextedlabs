/**
 * Program Permission Helpers
 * 
 * Determines what users can do with programs based on:
 * - Their platform role (member, host, moderator, admin, coordinator, manager, super)
 * - Their assignment to the program (manager_ids, coordinator_ids, member_ids)
 * - Whether they created the program
 */

import { ROLES, hasRoleLevel } from '@/lib/constants/roles';

export interface User {
  id: string;
  role: string;
}

export interface Program {
  id: string;
  created_by?: string;
  manager_ids?: string[];
  coordinator_ids?: string[];
  member_ids?: string[];
  visibility?: 'public' | 'members-only' | 'private';
}

/**
 * Check if user can view a program
 */
export function canViewProgram(user: User, program: Program): boolean {
  // Super users and managers can view all programs
  if (user.role === ROLES.SUPER || user.role === ROLES.MANAGER) {
    return true;
  }

  // Public programs are visible to all
  if (program.visibility === 'public') {
    return true;
  }

  // Creator can view
  if (program.created_by === user.id) {
    return true;
  }

  // Program managers can view
  if (program.manager_ids?.includes(user.id)) {
    return true;
  }

  // Program coordinators can view
  if (program.coordinator_ids?.includes(user.id)) {
    return true;
  }

  // Program members can view
  if (program.member_ids?.includes(user.id)) {
    return true;
  }

  // Members-only programs visible to any authenticated user
  if (program.visibility === 'members-only') {
    return true;
  }

  return false;
}

/**
 * Check if user can create programs
 */
export function canCreateProgram(user: User): boolean {
  // Super users and managers can create programs
  return hasRoleLevel(user.role as any, ROLES.MANAGER);
}

/**
 * Check if user can manage a program (modify settings, delete)
 */
export function canManageProgram(user: User, program: Program): boolean {
  // Super users can manage all programs
  if (user.role === ROLES.SUPER) {
    return true;
  }

  // Users with manager role can manage all programs
  if (user.role === ROLES.MANAGER) {
    return true;
  }

  // Program managers can manage their programs
  if (program.manager_ids?.includes(user.id)) {
    return true;
  }

  // Creator can manage
  if (program.created_by === user.id) {
    return true;
  }

  return false;
}

/**
 * Check if user can coordinate a program (moderate content, manage members)
 * Note: Coordinators CANNOT modify program settings
 */
export function canCoordinateProgram(user: User, program: Program): boolean {
  // All manager rights include coordinator rights
  if (canManageProgram(user, program)) {
    return true;
  }

  // Users with coordinator role who are assigned to this program
  if (
    user.role === ROLES.COORDINATOR &&
    program.coordinator_ids?.includes(user.id)
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can moderate program content (delete inappropriate posts)
 */
export function canModerateProgram(user: User, program: Program): boolean {
  // Coordinators and higher can moderate
  return canCoordinateProgram(user, program);
}

/**
 * Check if user can add/remove program members
 */
export function canManageProgramMembers(user: User, program: Program): boolean {
  // Coordinators and higher can manage members
  return canCoordinateProgram(user, program);
}

/**
 * Check if user can modify program settings (name, description, visibility, etc)
 */
export function canModifyProgramSettings(user: User, program: Program): boolean {
  // Only managers can modify settings
  return canManageProgram(user, program);
}

/**
 * Check if user can delete a program
 */
export function canDeleteProgram(user: User, program: Program): boolean {
  // Only managers can delete programs
  return canManageProgram(user, program);
}

/**
 * Check if user can add coordinators to a program
 */
export function canManageProgramCoordinators(
  user: User,
  program: Program
): boolean {
  // Only managers can assign coordinators
  return canManageProgram(user, program);
}

/**
 * Get user's role within a program
 */
export function getProgramRole(
  user: User,
  program: Program
): 'manager' | 'coordinator' | 'member' | null {
  if (program.manager_ids?.includes(user.id) || program.created_by === user.id) {
    return 'manager';
  }

  if (program.coordinator_ids?.includes(user.id)) {
    return 'coordinator';
  }

  if (program.member_ids?.includes(user.id)) {
    return 'member';
  }

  return null;
}
