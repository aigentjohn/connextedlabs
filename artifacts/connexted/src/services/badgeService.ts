/**
 * Badge Service
 * 
 * Manages badge types and badge issuance for users and companies.
 * Future-compatible with Open Badges 3.0 standard.
 * 
 * @module badgeService
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type BadgeCategory = 
  | 'completion'    // Course/program completion
  | 'endorsement'   // Sponsor endorsements
  | 'skill'         // Skill certifications
  | 'verification'  // Identity/credential verification
  | 'achievement'   // Platform achievements
  | 'membership';   // Community membership status

export type BadgeIssuerType = 
  | 'platform'      // Platform-issued
  | 'sponsor'       // Sponsor-issued
  | 'program'       // Program-specific
  | 'course'        // Course-specific
  | 'admin';        // Admin-issued

export type BadgeLevel = 
  | 'supported' 
  | 'recommended' 
  | 'highly_recommended';

export interface BadgeType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: BadgeCategory;
  badge_image_url: string | null;
  badge_color: string;
  issuer_type: BadgeIssuerType;
  issuer_id: string | null;
  auto_issue: boolean;
  auto_issue_criteria: any | null;
  assignable_to: string[];
  open_badge_template: any | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  recipient_user_id: string | null;
  endorsed_company_id: string | null;
  badge_type_id: string | null;
  badge_recipient_type: 'user' | 'company';
  issued_by_user_id: string | null;
  issued_by_system: boolean;
  issued_for_program_id: string | null;
  issued_for_course_id: string | null;
  issuer_message: string | null;
  badge_level: BadgeLevel | null;
  evidence_url: string | null;
  is_public: boolean;
  display_on_profile: boolean;
  open_badge_json: any | null;
  verification_url: string | null;
  external_badge_url: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  // Joined data
  badge_type?: BadgeType;
  issuer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CompanyBadge {
  id: string;
  company_id: string;
  badge_type_id: string;
  issued_by_user_id: string | null;
  issued_by_system: boolean;
  issued_for_program_id: string | null;
  issuer_message: string | null;
  evidence_url: string | null;
  is_public: boolean;
  display_on_profile: boolean;
  open_badge_json: any | null;
  verification_url: string | null;
  external_badge_url: string | null;
  issued_at: string;
  expires_at: string | null;
  // Joined data
  badge_type?: BadgeType;
  issuer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface IssueBadgeParams {
  badgeTypeSlug: string;
  recipientType: 'user' | 'company';
  recipientId: string;
  issuedByUserId?: string;
  issuedBySystem?: boolean;
  issuerMessage?: string;
  evidenceUrl?: string;
  programId?: string;
  courseId?: string;
  badgeLevel?: BadgeLevel;
  isPublic?: boolean;
}

// ============================================================================
// BADGE TYPES
// ============================================================================

/**
 * Get all active badge types
 */
export async function getBadgeTypes(category?: BadgeCategory) {
  let query = supabase
    .from('badge_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as BadgeType[];
}

/**
 * Get badge type by slug
 */
export async function getBadgeType(slug: string) {
  const { data, error } = await supabase
    .from('badge_types')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return data as BadgeType;
}

/**
 * Create a new badge type (admin only)
 */
export async function createBadgeType(badgeType: Partial<BadgeType>) {
  const { data, error } = await supabase
    .from('badge_types')
    .insert([{
      name: badgeType.name,
      slug: badgeType.slug,
      description: badgeType.description,
      category: badgeType.category,
      badge_image_url: badgeType.badge_image_url,
      badge_color: badgeType.badge_color || '#3B82F6',
      issuer_type: badgeType.issuer_type,
      issuer_id: badgeType.issuer_id,
      auto_issue: badgeType.auto_issue || false,
      auto_issue_criteria: badgeType.auto_issue_criteria,
      assignable_to: badgeType.assignable_to || ['user', 'company'],
      is_active: badgeType.is_active !== false,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as BadgeType;
}

/**
 * Update badge type (admin only)
 */
export async function updateBadgeType(id: string, updates: Partial<BadgeType>) {
  const { data, error } = await supabase
    .from('badge_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BadgeType;
}

/**
 * Deactivate badge type (admin only)
 */
export async function deactivateBadgeType(id: string) {
  const { data, error } = await supabase
    .from('badge_types')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BadgeType;
}

// ============================================================================
// ISSUE BADGES
// ============================================================================

/**
 * Issue a badge to a user or company
 */
export async function issueBadge(params: IssueBadgeParams) {
  const {
    badgeTypeSlug,
    recipientType,
    recipientId,
    issuedByUserId,
    issuedBySystem = false,
    issuerMessage,
    evidenceUrl,
    programId,
    courseId,
    badgeLevel,
    isPublic = true,
  } = params;

  // Use the database function for issuing badges
  const { data, error } = await supabase.rpc('issue_badge', {
    p_badge_type_slug: badgeTypeSlug,
    p_recipient_type: recipientType,
    p_recipient_id: recipientId,
    p_issued_by_user_id: issuedByUserId || null,
    p_issued_by_system: issuedBySystem,
    p_issuer_message: issuerMessage || null,
    p_evidence_url: evidenceUrl || null,
    p_program_id: programId || null,
    p_course_id: courseId || null,
  });

  if (error) throw error;

  // If badge level is provided, update it
  if (badgeLevel && data) {
    const table = recipientType === 'user' ? 'user_badges' : 'company_badges';
    await supabase
      .from(table)
      .update({ 
        badge_level: badgeLevel,
        is_public: isPublic,
      })
      .eq('id', data);
  }

  return data as string; // Returns badge ID
}

/**
 * Revoke a badge from a user or company
 */
export async function revokeBadge(
  badgeTypeSlug: string,
  recipientType: 'user' | 'company',
  recipientId: string
) {
  const { data, error } = await supabase.rpc('revoke_badge', {
    p_badge_type_slug: badgeTypeSlug,
    p_recipient_type: recipientType,
    p_recipient_id: recipientId,
  });

  if (error) throw error;
  return data as boolean;
}

// ============================================================================
// GET BADGES
// ============================================================================

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string, includePrivate = false) {
  let query = supabase
    .from('user_badges')
    .select(`
      *,
      badge_type:badge_types(*),
      issuer:users!user_badges_issued_by_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false });

  if (!includePrivate) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as UserBadge[];
}

/**
 * Get all badges for a company
 */
export async function getCompanyBadges(companyId: string, includePrivate = false) {
  let query = supabase
    .from('company_badges')
    .select(`
      *,
      badge_type:badge_types(*),
      issuer:users!company_badges_issued_by_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('company_id', companyId)
    .order('issued_at', { ascending: false });

  if (!includePrivate) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as CompanyBadge[];
}

/**
 * Get badges issued by a specific sponsor
 */
export async function getBadgesIssuedBy(userId: string) {
  const { data: userBadges, error: userError } = await supabase
    .from('user_badges')
    .select(`
      *,
      badge_type:badge_types(*),
      recipient:users!user_badges_recipient_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('issued_by_user_id', userId)
    .order('created_at', { ascending: false });

  const { data: companyBadges, error: companyError } = await supabase
    .from('company_badges')
    .select(`
      *,
      badge_type:badge_types(*),
      company:market_companies(id, name, logo_url)
    `)
    .eq('issued_by_user_id', userId)
    .order('issued_at', { ascending: false });

  if (userError) throw userError;
  if (companyError) throw companyError;

  return {
    userBadges: userBadges as UserBadge[],
    companyBadges: companyBadges as CompanyBadge[],
  };
}

/**
 * Check if a user has a specific badge
 */
export async function hasUserBadge(userId: string, badgeTypeSlug: string) {
  const { data, error } = await supabase
    .from('user_badges')
    .select('id, badge_type:badge_types!inner(slug)')
    .eq('recipient_user_id', userId)
    .eq('badge_type.slug', badgeTypeSlug)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Check if a company has a specific badge
 */
export async function hasCompanyBadge(companyId: string, badgeTypeSlug: string) {
  const { data, error } = await supabase
    .from('company_badges')
    .select('id, badge_type:badge_types!inner(slug)')
    .eq('company_id', companyId)
    .eq('badge_type.slug', badgeTypeSlug)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ============================================================================
// AUTO-ISSUE BADGES
// ============================================================================

/**
 * Auto-issue course completion badge
 * 
 * Ready-to-call helper — wire into course completion handler when that event exists.
 * Usage: await issueCourseCompletionBadge(userId, courseId) from the course player completion callback.
 */
export async function issueCourseCompletionBadge(
  userId: string,
  courseId: string,
  evidenceUrl?: string
) {
  return issueBadge({
    badgeTypeSlug: 'course-graduate',
    recipientType: 'user',
    recipientId: userId,
    issuedBySystem: true,
    courseId,
    evidenceUrl,
  });
}

/**
 * Auto-issue program completion badge
 * 
 * Ready-to-call helper — wire into program completion handler when that event exists.
 * Usage: await issueProgramCompletionBadge(userId, programId) from the program graduation callback.
 */
export async function issueProgramCompletionBadge(
  userId: string,
  programId: string,
  evidenceUrl?: string
) {
  return issueBadge({
    badgeTypeSlug: 'program-graduate',
    recipientType: 'user',
    recipientId: userId,
    issuedBySystem: true,
    programId,
    evidenceUrl,
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get badge statistics for a user
 */
export async function getUserBadgeStats(userId: string) {
  const badges = await getUserBadges(userId, true);

  const stats = {
    total: badges.length,
    byCategory: {} as Record<BadgeCategory, number>,
    byIssuerType: {} as Record<BadgeIssuerType, number>,
    systemIssued: badges.filter(b => b.issued_by_system).length,
    sponsorIssued: badges.filter(b => !b.issued_by_system && b.issued_by_user_id).length,
  };

  badges.forEach(badge => {
    if (badge.badge_type) {
      stats.byCategory[badge.badge_type.category] = 
        (stats.byCategory[badge.badge_type.category] || 0) + 1;
      stats.byIssuerType[badge.badge_type.issuer_type] = 
        (stats.byIssuerType[badge.badge_type.issuer_type] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Get badge statistics for a company
 */
export async function getCompanyBadgeStats(companyId: string) {
  const badges = await getCompanyBadges(companyId, true);

  const stats = {
    total: badges.length,
    byCategory: {} as Record<BadgeCategory, number>,
    byIssuerType: {} as Record<BadgeIssuerType, number>,
    systemIssued: badges.filter(b => b.issued_by_system).length,
    sponsorIssued: badges.filter(b => !b.issued_by_system && b.issued_by_user_id).length,
  };

  badges.forEach(badge => {
    if (badge.badge_type) {
      stats.byCategory[badge.badge_type.category] = 
        (stats.byCategory[badge.badge_type.category] || 0) + 1;
      stats.byIssuerType[badge.badge_type.issuer_type] = 
        (stats.byIssuerType[badge.badge_type.issuer_type] || 0) + 1;
    }
  });

  return stats;
}