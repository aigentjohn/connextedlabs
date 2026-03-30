/**
 * Universal Access Ticket Hook
 * 
 * ONE hook for checking access to ANY platform offering!
 * Works for courses, programs, circles, bundles, events - EVERYTHING!
 * 
 * PLATFORM ADVANTAGE:
 * ✅ Same hook everywhere (learn once, use everywhere)
 * ✅ Consistent loading/error states
 * ✅ Automatic refetching
 * ✅ Bundle access detection
 * 
 * @example
 * // Check course access
 * const { hasAccess, ticket, isLoading } = useAccessTicket('course', courseId);
 * 
 * @example
 * // Check program access
 * const { hasAccess, ticket, isLoading } = useAccessTicket('program', programId);
 * 
 * @example
 * // Check circle access
 * const { hasAccess, ticket, isLoading } = useAccessTicket('circle', circleId);
 */

import { useEffect, useState } from 'react';
import { 
  accessTicketService, 
  type AccessTicket,
  type ContainerType
} from '@/services/accessTicketService';
import { useAuth } from '@/hooks/useAuth';

interface UseAccessTicketResult {
  hasAccess: boolean;
  ticket: AccessTicket | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasBundleAccess: boolean;
}

/**
 * Universal hook for checking access to ANY container type
 * 
 * @param containerType - Type of container (course, program, circle, etc.)
 * @param containerId - ID of the container
 * @returns Access state and ticket details
 */
export function useAccessTicket(
  containerType: ContainerType | undefined,
  containerId: string | undefined
): UseAccessTicketResult {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [hasBundleAccess, setHasBundleAccess] = useState(false);
  const [ticket, setTicket] = useState<AccessTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkAccess = async () => {
    if (!user || !containerType || !containerId) {
      setHasAccess(false);
      setHasBundleAccess(false);
      setTicket(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's ticket for this container
      const userTicket = await accessTicketService.getUserTicket(
        user.id, 
        containerType, 
        containerId
      );
      
      setTicket(userTicket);
      
      // Check direct access
      const directAccess = 
        !!userTicket && 
        userTicket.status === 'active' &&
        (!userTicket.expires_at || new Date(userTicket.expires_at) > new Date());
      
      setHasAccess(directAccess);

      // Also check bundle access (if no direct access)
      if (!directAccess) {
        const bundleAccess = await accessTicketService.hasBundleAccess(
          user.id,
          containerType,
          containerId
        );
        setHasBundleAccess(bundleAccess);
      } else {
        setHasBundleAccess(false);
      }
    } catch (err) {
      console.error('Failed to check access:', err);
      setError(err as Error);
      setHasAccess(false);
      setHasBundleAccess(false);
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [user, containerType, containerId]);

  return {
    hasAccess: hasAccess || hasBundleAccess,
    ticket,
    isLoading,
    error,
    refetch: checkAccess,
    hasBundleAccess,
  };
}

/**
 * Hook to get all active tickets for current user
 * 
 * Perfect for "My Learning" page!
 * Returns ALL active tickets across ALL container types.
 * 
 * @returns All active tickets
 * 
 * @example
 * const { tickets, isLoading } = useUserActiveTickets();
 * // tickets includes courses, programs, circles, bundles, etc.
 */
export function useUserActiveTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<AccessTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTickets = async () => {
    if (!user) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const activeTickets = await accessTicketService.getUserActiveTickets(user.id);
      setTickets(activeTickets);
    } catch (err) {
      console.error('Failed to fetch active tickets:', err);
      setError(err as Error);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchTickets,
  };
}

/**
 * Hook to get user's tickets by container type
 * 
 * @param containerType - Type of container to filter by
 * @returns Tickets of specified type
 * 
 * @example
 * // Get all user's courses
 * const { tickets: courses } = useUserTicketsByType('course');
 * 
 * @example
 * // Get all user's programs
 * const { tickets: programs } = useUserTicketsByType('program');
 */
export function useUserTicketsByType(containerType: ContainerType | undefined) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<AccessTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTickets = async () => {
    if (!user || !containerType) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const typeTickets = await accessTicketService.getUserTicketsByType(
        user.id,
        containerType
      );
      setTickets(typeTickets);
    } catch (err) {
      console.error('Failed to fetch tickets by type:', err);
      setError(err as Error);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user, containerType]);

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchTickets,
  };
}

/**
 * Hook to get referral stats for a ticket
 * 
 * @param containerType - Type of container
 * @param containerId - Container ID
 * @returns Referral statistics
 * 
 * @example
 * const { stats, isLoading } = useReferralStats('course', courseId);
 * // stats.referralCode, stats.conversions, stats.earnings
 */
export function useReferralStats(
  containerType: ContainerType | undefined,
  containerId: string | undefined
) {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    referralCode: string;
    clicks: number;
    conversions: number;
    earnings: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    if (!user || !containerType || !containerId) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const referralStats = await accessTicketService.getReferralStats(
        user.id,
        containerType,
        containerId
      );
      setStats(referralStats);
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
      setError(err as Error);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user, containerType, containerId]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook to get user's total referral earnings across ALL tickets
 * 
 * Perfect for referral dashboard!
 * 
 * @returns Total earnings and breakdown by type
 * 
 * @example
 * const { totalEarnings, totalConversions, byType } = useUserReferralEarnings();
 * // totalEarnings: $1,250
 * // byType: { course: { earnings: 400 }, program: { earnings: 750 }, ... }
 */
export function useUserReferralEarnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<{
    totalEarnings: number;
    totalConversions: number;
    totalClicks: number;
    byType: Record<string, { earnings: number; conversions: number; clicks: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEarnings = async () => {
    if (!user) {
      setEarnings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const userEarnings = await accessTicketService.getUserReferralEarnings(user.id);
      setEarnings(userEarnings);
    } catch (err) {
      console.error('Failed to fetch referral earnings:', err);
      setError(err as Error);
      setEarnings(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [user]);

  return {
    ...earnings,
    isLoading,
    error,
    refetch: fetchEarnings,
  };
}
