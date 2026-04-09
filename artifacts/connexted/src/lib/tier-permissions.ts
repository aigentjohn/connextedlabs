/**
 * Membership Tier Permissions Utilities
 * 
 * Helper functions to check user permissions based on their membership tier.
 * This system controls access to market features (company creation, offerings, market placement).
 * 
 * Market access is now fully dynamic — tiers store an array of market IDs they can access,
 * sourced from the admin-defined `markets` table. No hardcoded market names or slugs.
 */

import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-handler';

export interface TierPermissions {
  tier_id: string;
  tier_name: string;
  tier_order: number;
  description: string;
  // Market permissions
  can_create_company: boolean;
  max_companies: number;
  max_offerings_per_company: number;
  // Dynamic market access — array of market IDs (UUIDs) this tier can place offerings into
  accessible_market_ids: string[];
  // Feature flags
  can_feature_offerings: boolean;
  can_view_analytics: boolean;
}

/** Lightweight market info used for display alongside permissions */
export interface MarketInfo {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_active: boolean;
}

export interface MarketAccessCheck {
  canCreateCompany: boolean;
  canCreateOffering: boolean;
  canAccessMarket: (marketIdOrSlug: string) => boolean;
  canFeatureOfferings: boolean;
  canViewAnalytics: boolean;
  maxCompanies: number;
  maxOfferingsPerCompany: number;
  currentCompanyCount: number;
  currentOfferingCount: number;
  remainingCompanies: number;
  remainingOfferings: number;
  /** Market IDs this tier can access */
  accessibleMarketIds: string[];
  /** Resolved market names for display */
  accessibleMarketNames: string[];
  blockers: string[];
}

/**
 * Fetch all defined markets (lightweight, for permission UI & resolution)
 */
export async function fetchAllMarkets(): Promise<MarketInfo[]> {
  try {
    const { data, error } = await supabase
      .from('markets')
      .select('id, name, slug, icon, color, is_active')
      .order('display_order');

    if (error) {
      console.warn('Error fetching markets for permissions:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    logError('Error fetching markets:', error, { component: 'tier-permissions' });
    return [];
  }
}

/**
 * Get tier permissions from database.
 * Handles backwards compatibility with legacy `can_access_discovery/launch/marketplace` columns
 * by converting them to `accessible_market_ids` if the new column isn't populated yet.
 */
export async function getTierPermissions(tierName: string): Promise<TierPermissions> {
  try {
    const { data, error } = await supabase
      .from('membership_tier_permissions')
      .select('*')
      .eq('tier_id', tierName)
      .single();

    if (error || !data) {
      console.warn(`Tier permissions not found for ${tierName}, using defaults`);
      return getDefaultTierPermissions(tierName);
    }

    return normalizeTierPermissions(data);
  } catch (error) {
    logError('Error fetching tier permissions:', error, { component: 'tier-permissions' });
    return getDefaultTierPermissions(tierName);
  }
}

/**
 * Normalize database row into TierPermissions.
 * Handles backwards compatibility: if `accessible_market_ids` is null/missing but
 * legacy boolean columns exist, we resolve slugs → IDs from the markets table.
 */
async function normalizeTierPermissions(data: any): Promise<TierPermissions> {
  // If new column is present and populated, use it directly
  if (data.accessible_market_ids && Array.isArray(data.accessible_market_ids) && data.accessible_market_ids.length > 0) {
    return {
      tier_id: data.tier_id,
      tier_name: data.tier_name,
      tier_order: data.tier_order,
      description: data.description || '',
      can_create_company: data.can_create_company ?? false,
      max_companies: data.max_companies ?? 0,
      max_offerings_per_company: data.max_offerings_per_company ?? 0,
      accessible_market_ids: data.accessible_market_ids,
      can_feature_offerings: data.can_feature_offerings ?? false,
      can_view_analytics: data.can_view_analytics ?? false,
    };
  }

  // Backwards compatibility: convert legacy booleans to market IDs
  const legacySlugs: string[] = [];
  if (data.can_access_discovery) legacySlugs.push('customer-discovery');
  if (data.can_access_launch) legacySlugs.push('launch');
  if (data.can_access_marketplace) legacySlugs.push('marketplace');

  let resolvedIds: string[] = [];
  if (legacySlugs.length > 0) {
    const allMarkets = await fetchAllMarkets();
    resolvedIds = allMarkets
      .filter(m => legacySlugs.includes(m.slug))
      .map(m => m.id);
  }

  return {
    tier_id: data.tier_id,
    tier_name: data.tier_name,
    tier_order: data.tier_order,
    description: data.description || '',
    can_create_company: data.can_create_company ?? false,
    max_companies: data.max_companies ?? 0,
    max_offerings_per_company: data.max_offerings_per_company ?? 0,
    accessible_market_ids: resolvedIds,
    can_feature_offerings: data.can_feature_offerings ?? false,
    can_view_analytics: data.can_view_analytics ?? false,
  };
}

/**
 * Default tier permissions (fallback if database table doesn't exist).
 * Defaults to NO market access — admin must explicitly grant it.
 */
function getDefaultTierPermissions(tierName: string): TierPermissions {
  const base: TierPermissions = {
    tier_id: tierName,
    tier_name: tierName.charAt(0).toUpperCase() + tierName.slice(1),
    tier_order: 1,
    description: '',
    can_create_company: false,
    max_companies: 0,
    max_offerings_per_company: 0,
    accessible_market_ids: [], // No market access by default — admin configures this
    can_feature_offerings: false,
    can_view_analytics: false,
  };

  // Sensible defaults per known tier name, but still no hardcoded market references
  if (tierName === 'free') {
    return {
      ...base,
      tier_order: 1,
      description: 'Browse and discover offerings',
    };
  }
  if (tierName === 'member') {
    return {
      ...base,
      tier_order: 2,
      description: 'Create a company and list offerings',
      can_create_company: true,
      max_companies: 1,
      max_offerings_per_company: 5,
    };
  }
  if (tierName === 'premium') {
    return {
      ...base,
      tier_order: 3,
      description: 'Full market access with analytics',
      can_create_company: true,
      max_companies: 3,
      max_offerings_per_company: -1, // unlimited
      can_feature_offerings: true,
      can_view_analytics: true,
    };
  }

  return base;
}

/**
 * Check if user can create a company and access markets based on their tier
 */
export async function checkMarketAccess(userId: string): Promise<MarketAccessCheck> {
  try {
    // Get user's membership tier
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('membership_tier')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const membershipTier = userData?.membership_tier || 'free';
    const permissions = await getTierPermissions(membershipTier);

    // Fetch all markets for slug resolution
    const allMarkets = await fetchAllMarkets();
    const marketIdToSlug = new Map(allMarkets.map(m => [m.id, m.slug]));
    const marketSlugToId = new Map(allMarkets.map(m => [m.slug, m.id]));

    // Get user's current company count
    const { data: companies, error: companyError } = await supabase
      .from('market_companies')
      .select('id')
      .eq('owner_user_id', userId);

    if (companyError) throw companyError;

    const currentCompanyCount = companies?.length || 0;

    // Get user's current offering count (across all their companies)
    let currentOfferingCount = 0;
    if (companies && companies.length > 0) {
      const companyIds = companies.map(c => c.id);
      const { data: offerings, error: offeringError } = await supabase
        .from('market_offerings')
        .select('id')
        .in('company_id', companyIds);

      if (!offeringError && offerings) {
        currentOfferingCount = offerings.length;
      }
    }

    // Calculate remaining allowances
    const remainingCompanies = permissions.max_companies === -1
      ? Infinity
      : Math.max(0, permissions.max_companies - currentCompanyCount);

    const remainingOfferings = permissions.max_offerings_per_company === -1
      ? Infinity
      : Math.max(0, permissions.max_offerings_per_company - currentOfferingCount);

    // Identify blockers
    const blockers: string[] = [];

    if (!permissions.can_create_company) {
      blockers.push('Your membership tier does not allow company creation');
    } else if (currentCompanyCount >= permissions.max_companies && permissions.max_companies !== -1) {
      blockers.push(`You have reached your limit of ${permissions.max_companies} ${permissions.max_companies === 1 ? 'company' : 'companies'}`);
    }

    // Resolve accessible market names for display
    const accessibleMarketNames = permissions.accessible_market_ids
      .map(id => allMarkets.find(m => m.id === id)?.name)
      .filter(Boolean) as string[];

    return {
      canCreateCompany: permissions.can_create_company &&
                       (permissions.max_companies === -1 || currentCompanyCount < permissions.max_companies),
      canCreateOffering: permissions.can_create_company &&
                        (permissions.max_offerings_per_company === -1 || currentOfferingCount < permissions.max_offerings_per_company),
      canAccessMarket: (marketIdOrSlug: string) => {
        // Check by ID first
        if (permissions.accessible_market_ids.includes(marketIdOrSlug)) return true;
        // Check by slug (resolve slug → ID)
        const resolvedId = marketSlugToId.get(marketIdOrSlug);
        if (resolvedId && permissions.accessible_market_ids.includes(resolvedId)) return true;
        return false;
      },
      canFeatureOfferings: permissions.can_feature_offerings,
      canViewAnalytics: permissions.can_view_analytics,
      maxCompanies: permissions.max_companies,
      maxOfferingsPerCompany: permissions.max_offerings_per_company,
      currentCompanyCount,
      currentOfferingCount,
      remainingCompanies: isFinite(remainingCompanies) ? remainingCompanies : -1,
      remainingOfferings: isFinite(remainingOfferings) ? remainingOfferings : -1,
      accessibleMarketIds: permissions.accessible_market_ids,
      accessibleMarketNames,
      blockers,
    };
  } catch (error) {
    logError('Error checking market access:', error, { component: 'tier-permissions' });

    // Return restrictive defaults on error
    return {
      canCreateCompany: false,
      canCreateOffering: false,
      canAccessMarket: () => false,
      canFeatureOfferings: false,
      canViewAnalytics: false,
      maxCompanies: 0,
      maxOfferingsPerCompany: 0,
      currentCompanyCount: 0,
      currentOfferingCount: 0,
      remainingCompanies: 0,
      remainingOfferings: 0,
      accessibleMarketIds: [],
      accessibleMarketNames: [],
      blockers: ['Error checking permissions. Please try again.'],
    };
  }
}

/**
 * Get a user-friendly upgrade message based on their current tier
 */
export function getUpgradeMessage(currentTier: string): string {
  const messages: { [key: string]: string } = {
    free: 'Upgrade your membership tier to create a company and showcase your offerings.',
    member: 'Upgrade to a higher tier for more companies, unlimited offerings, and access to additional markets.',
    premium: 'You have full access to all market features!',
  };

  return messages[currentTier] || messages.free;
}

/**
 * Format tier limits for display
 */
export function formatTierLimits(permissions: TierPermissions, marketNames?: string[]): string {
  const limits: string[] = [];

  if (permissions.can_create_company) {
    const companyLimit = permissions.max_companies === -1 ? 'unlimited' : permissions.max_companies;
    limits.push(`${companyLimit} ${permissions.max_companies === 1 ? 'company' : 'companies'}`);

    const offeringLimit = permissions.max_offerings_per_company === -1 ? 'unlimited' : permissions.max_offerings_per_company;
    limits.push(`${offeringLimit} offerings per company`);
  }

  if (marketNames && marketNames.length > 0) {
    limits.push(`Access to: ${marketNames.join(', ')}`);
  } else if (permissions.accessible_market_ids.length === 0) {
    limits.push('No market placement access');
  }

  return limits.join(' · ');
}