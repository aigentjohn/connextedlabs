/**
 * useBadges Hook
 * 
 * React hook for managing badges in components.
 */

import { useState, useEffect } from 'react';
import {
  getBadgeTypes,
  getUserBadges,
  getCompanyBadges,
  issueBadge,
  revokeBadge,
  hasUserBadge,
  hasCompanyBadge,
  type BadgeType,
  type UserBadge,
  type CompanyBadge,
  type IssueBadgeParams,
} from '@/services/badgeService';

/**
 * Hook for loading badge types
 */
export function useBadgeTypes() {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadBadgeTypes();
  }, []);

  async function loadBadgeTypes() {
    try {
      setLoading(true);
      const types = await getBadgeTypes();
      setBadgeTypes(types);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return {
    badgeTypes,
    loading,
    error,
    reload: loadBadgeTypes,
  };
}

/**
 * Hook for loading user badges
 */
export function useUserBadges(userId: string | null, includePrivate = false) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setBadges([]);
      setLoading(false);
      return;
    }

    loadBadges();
  }, [userId, includePrivate]);

  async function loadBadges() {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await getUserBadges(userId, includePrivate);
      setBadges(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return {
    badges,
    loading,
    error,
    reload: loadBadges,
  };
}

/**
 * Hook for loading company badges
 */
export function useCompanyBadges(companyId: string | null, includePrivate = false) {
  const [badges, setBadges] = useState<CompanyBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setBadges([]);
      setLoading(false);
      return;
    }

    loadBadges();
  }, [companyId, includePrivate]);

  async function loadBadges() {
    if (!companyId) return;

    try {
      setLoading(true);
      const data = await getCompanyBadges(companyId, includePrivate);
      setBadges(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return {
    badges,
    loading,
    error,
    reload: loadBadges,
  };
}

/**
 * Hook for badge management actions
 */
export function useBadgeActions() {
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function issue(params: IssueBadgeParams) {
    try {
      setIssuing(true);
      setError(null);
      const badgeId = await issueBadge(params);
      return badgeId;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIssuing(false);
    }
  }

  async function revoke(
    badgeTypeSlug: string,
    recipientType: 'user' | 'company',
    recipientId: string
  ) {
    try {
      setRevoking(true);
      setError(null);
      const success = await revokeBadge(badgeTypeSlug, recipientType, recipientId);
      return success;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setRevoking(false);
    }
  }

  return {
    issue,
    revoke,
    issuing,
    revoking,
    error,
  };
}

/**
 * Hook for checking if user/company has a specific badge
 */
export function useHasBadge(
  recipientType: 'user' | 'company',
  recipientId: string | null,
  badgeTypeSlug: string
) {
  const [hasBadge, setHasBadge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!recipientId || !badgeTypeSlug) {
      setHasBadge(false);
      setLoading(false);
      return;
    }

    checkBadge();
  }, [recipientType, recipientId, badgeTypeSlug]);

  async function checkBadge() {
    if (!recipientId || !badgeTypeSlug) return;

    try {
      setLoading(true);
      const result = recipientType === 'user'
        ? await hasUserBadge(recipientId, badgeTypeSlug)
        : await hasCompanyBadge(recipientId, badgeTypeSlug);
      setHasBadge(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return {
    hasBadge,
    loading,
    error,
    reload: checkBadge,
  };
}
