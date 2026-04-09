/**
 * Tier Limits & Access Control
 * 
 * Utilities for checking user subscription tiers and enforcing limits
 * on circles, containers, and program access.
 */
// Split candidate: ~576 lines — consider separating tier-check helpers, tier-limit constants, and upgrade-prompt utilities into sub-modules.

import { supabase } from './supabase';
import { logError } from '@/lib/error-handler';

// ============================================================
// TYPES
// ============================================================

export interface TierLimits {
  maxCircles: number;
  maxContainers: number;
  maxAdminCircles: number;
  maxAdminContainers: number;
  canPurchasePrograms: boolean;
  canHostContainers: boolean;
  canCreateCircles: boolean;
  canModerate: boolean;
  tierName: string;
  tierNumber: number;
}

export interface AccessCheckResult {
  canAccess: boolean;
  reason?: string;
  requiresUpgrade?: boolean;
  requiresPayment?: boolean;
  currentCount?: number;
  maxAllowed?: number;
}

export interface ProgramAccessResult extends AccessCheckResult {
  alreadyPurchased?: boolean;
  isFree?: boolean;
  price?: number;
}

// ============================================================
// TIER LIMITS
// ============================================================

/**
 * Get user's current tier limits
 */
export async function getUserTierLimits(userId: string): Promise<TierLimits | null> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        tier_id,
        membership_tiers (
          tier_number,
          tier_name,
          max_circles,
          max_containers,
          max_admin_circles,
          max_admin_containers,
          can_purchase_programs,
          can_host_containers,
          can_create_circles,
          can_moderate
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('payment_status', ['paid', 'trial'])
      .single();

    if (error || !data) {
      logError('Error fetching tier limits:', error, { component: 'tier-limits' });
      return null;
    }

    const tier = data.membership_tiers as any;

    return {
      maxCircles: tier.max_circles,
      maxContainers: tier.max_containers,
      maxAdminCircles: tier.max_admin_circles,
      maxAdminContainers: tier.max_admin_containers,
      canPurchasePrograms: tier.can_purchase_programs,
      canHostContainers: tier.can_host_containers,
      canCreateCircles: tier.can_create_circles,
      canModerate: tier.can_moderate,
      tierName: tier.tier_name,
      tierNumber: tier.tier_number,
    };
  } catch (error) {
    logError('Error in getUserTierLimits:', error, { component: 'tier-limits' });
    return null;
  }
}

/**
 * Check if user has unlimited access (tier 9-10)
 */
export async function hasUnlimitedAccess(userId: string): Promise<boolean> {
  const limits = await getUserTierLimits(userId);
  return limits ? limits.tierNumber >= 9 : false;
}

/**
 * Check if user is platform admin (bypasses all limits)
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  return data?.role === 'super';
}

// ============================================================
// CIRCLE ACCESS
// ============================================================

/**
 * Check if user can join a circle
 */
export async function canJoinCircle(userId: string): Promise<AccessCheckResult> {
  // Platform admins bypass all limits
  if (await isPlatformAdmin(userId)) {
    return { canAccess: true };
  }

  // Get tier limits
  const limits = await getUserTierLimits(userId);
  
  if (!limits) {
    return {
      canAccess: false,
      reason: 'No active subscription. Please contact admin to set up your account.',
      requiresUpgrade: true,
    };
  }

  // Check for unlimited
  if (limits.maxCircles === -1) {
    return { canAccess: true };
  }

  // Count current circle memberships
  const { count, error } = await supabase
    .from('user_circle_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    logError('Error counting circles:', error, { component: 'tier-limits' });
    return {
      canAccess: false,
      reason: 'Error checking circle limit',
    };
  }

  const currentCount = count || 0;

  if (currentCount >= limits.maxCircles) {
    return {
      canAccess: false,
      reason: `You've reached your limit of ${limits.maxCircles} ${limits.maxCircles === 1 ? 'circle' : 'circles'} on the ${limits.tierName} plan.`,
      requiresUpgrade: true,
      currentCount,
      maxAllowed: limits.maxCircles,
    };
  }

  return { canAccess: true, currentCount, maxAllowed: limits.maxCircles };
}

/**
 * Get user's circle usage stats
 */
export async function getCircleUsageStats(userId: string) {
  const limits = await getUserTierLimits(userId);
  
  const { count } = await supabase
    .from('user_circle_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    current: count || 0,
    max: limits?.maxCircles || 0,
    unlimited: limits?.maxCircles === -1,
    percentage: limits?.maxCircles && limits.maxCircles > 0
      ? Math.round(((count || 0) / limits.maxCircles) * 100)
      : 0,
  };
}

// ============================================================
// CONTAINER ACCESS
// ============================================================

/**
 * Check if user can join a container
 * Note: Program containers don't count against limits
 */
export async function canJoinContainer(
  userId: string,
  containerId: string,
  containerType: string
): Promise<AccessCheckResult> {
  // Platform admins bypass all limits
  if (await isPlatformAdmin(userId)) {
    return { canAccess: true };
  }

  // Check if container belongs to a program
  const isProgramContainer = await checkIfProgramContainer(containerId, containerType);
  
  if (isProgramContainer.isProgram) {
    // Program containers require program access, not tier limits
    return checkProgramContainerAccess(userId, isProgramContainer.programId!);
  }

  // Standalone container - check tier limits
  const limits = await getUserTierLimits(userId);
  
  if (!limits) {
    return {
      canAccess: false,
      reason: 'No active subscription. Please contact admin to set up your account.',
      requiresUpgrade: true,
    };
  }

  // Check for unlimited
  if (limits.maxContainers === -1) {
    return { canAccess: true };
  }

  // Count standalone containers (exclude program containers)
  const { count, error } = await supabase
    .from('user_container_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_program_container', false);

  if (error) {
    logError('Error counting containers:', error, { component: 'tier-limits' });
    return {
      canAccess: false,
      reason: 'Error checking container limit',
    };
  }

  const currentCount = count || 0;

  if (currentCount >= limits.maxContainers) {
    return {
      canAccess: false,
      reason: `You've reached your limit of ${limits.maxContainers} ${limits.maxContainers === 1 ? 'container' : 'containers'} on the ${limits.tierName} plan.`,
      requiresUpgrade: true,
      currentCount,
      maxAllowed: limits.maxContainers,
    };
  }

  return { canAccess: true, currentCount, maxAllowed: limits.maxContainers };
}

/**
 * Get user's container usage stats (standalone only)
 */
export async function getContainerUsageStats(userId: string) {
  const limits = await getUserTierLimits(userId);
  
  const { count } = await supabase
    .from('user_container_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_program_container', false);

  return {
    current: count || 0,
    max: limits?.maxContainers || 0,
    unlimited: limits?.maxContainers === -1,
    percentage: limits?.maxContainers && limits.maxContainers > 0
      ? Math.round(((count || 0) / limits.maxContainers) * 100)
      : 0,
  };
}

/**
 * Check if a container belongs to a program
 */
async function checkIfProgramContainer(containerId: string, containerType: string): Promise<{
  isProgram: boolean;
  programId?: string;
}> {
  // Map container types to table names
  const tableMap: Record<string, string> = {
    table: 'tables',
    build: 'builds',
    elevator: 'elevators',
    meeting: 'meetings',
    pitch: 'pitches',
    standup: 'standups',
    meetup: 'meetups',
    sprint: 'sprints',
    checklist: 'checklists',
  };

  const tableName = tableMap[containerType.toLowerCase()];
  if (!tableName) {
    return { isProgram: false };
  }

  const { data } = await supabase
    .from(tableName)
    .select('program_id')
    .eq('id', containerId)
    .single();

  return {
    isProgram: !!data?.program_id,
    programId: data?.program_id,
  };
}

/**
 * Check if user has access to a program container
 */
async function checkProgramContainerAccess(
  userId: string,
  programId: string
): Promise<AccessCheckResult> {
  // Check if user has purchased/enrolled in the program
  const { data: purchase } = await supabase
    .from('program_purchases')
    .select('access_granted, payment_status, expires_at')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .single();

  if (!purchase) {
    return {
      canAccess: false,
      reason: 'You must purchase this program to access its containers.',
      requiresPayment: true,
    };
  }

  if (!purchase.access_granted) {
    return {
      canAccess: false,
      reason: 'Your program access is pending. Please contact program admin.',
    };
  }

  // Check expiration
  if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
    return {
      canAccess: false,
      reason: 'Your program access has expired.',
      requiresPayment: true,
    };
  }

  return { canAccess: true };
}

// ============================================================
// PROGRAM PURCHASE
// ============================================================

/**
 * Check if user can purchase a program
 */
export async function canPurchaseProgram(
  userId: string,
  programId: string
): Promise<ProgramAccessResult> {
  // Get program details
  const { data: program } = await supabase
    .from('programs')
    .select('is_paid, payment_required, price_cents, allow_free_enrollment')
    .eq('id', programId)
    .single();

  if (!program) {
    return {
      canAccess: false,
      reason: 'Program not found',
    };
  }

  // Check if program is free
  if (!program.is_paid || !program.payment_required) {
    return {
      canAccess: true,
      isFree: true,
    };
  }

  // Check if already purchased
  const { data: purchase } = await supabase
    .from('program_purchases')
    .select('access_granted, payment_status')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .single();

  if (purchase?.access_granted) {
    return {
      canAccess: false,
      reason: 'You are already enrolled in this program',
      alreadyPurchased: true,
    };
  }

  // Check if user's tier allows program purchases
  const limits = await getUserTierLimits(userId);

  if (!limits) {
    return {
      canAccess: false,
      reason: 'No active subscription. Please contact admin to set up your account.',
      requiresUpgrade: true,
    };
  }

  if (!limits.canPurchasePrograms) {
    return {
      canAccess: false,
      reason: `Upgrade to Starter tier or higher to purchase programs. (Current: ${limits.tierName})`,
      requiresUpgrade: true,
    };
  }

  return {
    canAccess: true,
    requiresPayment: true,
    price: program.price_cents,
  };
}

// ============================================================
// ADMIN CAPABILITIES
// ============================================================

/**
 * Check if user can create/admin circles
 */
export async function canCreateCircle(userId: string): Promise<AccessCheckResult> {
  if (await isPlatformAdmin(userId)) {
    return { canAccess: true };
  }

  const limits = await getUserTierLimits(userId);
  
  if (!limits) {
    return {
      canAccess: false,
      reason: 'No active subscription',
      requiresUpgrade: true,
    };
  }

  if (!limits.canCreateCircles) {
    return {
      canAccess: false,
      reason: `Upgrade to ${limits.tierNumber < 3 ? 'Starter' : 'higher tier'} to create circles`,
      requiresUpgrade: true,
    };
  }

  // Check admin circle limit
  if (limits.maxAdminCircles === -1) {
    return { canAccess: true };
  }

  // Count circles where user is admin
  const { data: circles } = await supabase
    .from('circles')
    .select('id, admin_ids')
    .contains('admin_ids', [userId]);

  const currentCount = circles?.length || 0;

  if (currentCount >= limits.maxAdminCircles) {
    return {
      canAccess: false,
      reason: `You've reached your limit of ${limits.maxAdminCircles} admin ${limits.maxAdminCircles === 1 ? 'circle' : 'circles'}`,
      requiresUpgrade: true,
      currentCount,
      maxAllowed: limits.maxAdminCircles,
    };
  }

  return { canAccess: true, currentCount, maxAllowed: limits.maxAdminCircles };
}

/**
 * Check if user can host containers
 */
export async function canHostContainer(userId: string): Promise<AccessCheckResult> {
  if (await isPlatformAdmin(userId)) {
    return { canAccess: true };
  }

  const limits = await getUserTierLimits(userId);
  
  if (!limits) {
    return {
      canAccess: false,
      reason: 'No active subscription',
      requiresUpgrade: true,
    };
  }

  if (!limits.canHostContainers) {
    return {
      canAccess: false,
      reason: 'Upgrade to Member tier or higher to host containers',
      requiresUpgrade: true,
    };
  }

  return { canAccess: true };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format tier limit display (handle unlimited)
 */
export function formatTierLimit(value: number): string {
  return value === -1 ? 'Unlimited' : value.toString();
}

/**
 * Get upgrade suggestion based on current tier
 */
export async function getUpgradeSuggestion(userId: string): Promise<string | null> {
  const limits = await getUserTierLimits(userId);
  
  if (!limits) return null;

  if (limits.tierNumber >= 9) {
    return null; // Already at top tier
  }

  const nextTierNumber = limits.tierNumber + 1;
  
  const { data: nextTier } = await supabase
    .from('membership_tiers')
    .select('tier_name')
    .eq('tier_number', nextTierNumber)
    .single();

  return nextTier?.tier_name || null;
}

/**
 * Get all tier limits for display
 */
export async function getAllTiers() {
  const { data } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  return data || [];
}
