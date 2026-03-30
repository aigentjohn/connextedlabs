/**
 * Universal Access Ticket Service
 * 
 * ONE service for ALL platform offerings:
 * - Courses (self-paced learning)
 * - Programs (cohort-based)
 * - Bundles (multiple items)
 * 
 * PLATFORM ADVANTAGE:
 * ✅ Reusable code across all offerings
 * ✅ Unified analytics
 * ✅ Referral tracking everywhere
 * ✅ Single source of truth
 * 
 * @module services/accessTicketService
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if a Supabase error means the table doesn't exist yet.
 * PGRST205 = "Could not find the table" (migration not applied).
 * When true, callers should return empty/null — the legacy fallback tables
 * will supply data until access_tickets is created.
 */
function isTableMissing(error: any): boolean {
  return error?.code === 'PGRST205';
}

/**
 * Generate a referral code for a ticket.
 * Format: REF_{first8_of_user}_{TYPE}_{first4_of_container}
 */
function generateReferralCode(
  userId: string,
  containerType: string,
  containerId: string | null | undefined
): string {
  const userPart = userId.substring(0, 8).toUpperCase();
  if (containerType === 'bundle') {
    return `REF_${userPart}_BUNDLE`;
  }
  const containerPart = (containerId || '').substring(0, 4).toUpperCase();
  return `REF_${userPart}_${containerType.toUpperCase()}_${containerPart}`;
}

// ============================================================================
// TYPES
// ============================================================================

export type ContainerType =
  | 'course'
  | 'program'
  | 'bundle';

export type AcquisitionSource = 
  | 'marketplace_purchase'
  | 'direct_enrollment'
  | 'referral'
  | 'invitation'
  | 'membership_benefit'
  | 'scholarship'
  | 'bundle'
  | 'waitlist_conversion'
  | 'admin_grant'
  | 'gift'
  | 'campaign'
  | 'promotion';

export type TicketType = 
  | 'paid'
  | 'free'
  | 'trial'
  | 'scholarship'
  | 'membership_included'
  | 'gifted'
  | 'promotional';

export type TicketStatus =
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'expired'
  | 'revoked';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'waived';

export interface BundleItem {
  type: ContainerType;
  id: string;
}

export interface AccessTicket {
  id: string;
  user_id: string;
  container_type: ContainerType;
  container_id: string | null;
  bundle_items: BundleItem[];
  acquisition_source: AcquisitionSource;
  acquisition_context: Record<string, any>;
  ticket_type: TicketType;
  original_price_cents: number;
  price_paid_cents: number;
  discount_applied_cents: number;
  discount_reason: string | null;
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_transaction_id: string | null;
  payment_completed_at: string | null;
  status: TicketStatus;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  total_access_count: number;
  progress_percentage: number;
  progress_data: Record<string, any>;
  granted_at: string;
  activated_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  referral_code: string | null;
  referral_clicks: number;
  referral_conversions: number;
  referral_earnings_cents: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketParams {
  userId: string;
  containerType: ContainerType;
  containerId?: string;
  bundleItems?: BundleItem[];
  acquisitionSource: AcquisitionSource;
  acquisitionContext?: Record<string, any>;
  ticketType?: TicketType;
  pricePaidCents?: number;
  originalPriceCents?: number;
  paymentTransactionId?: string;
  referralCode?: string;
}

export interface UpdateProgressParams {
  userId: string;
  containerType: ContainerType;
  containerId: string;
  progressPercentage: number;
  progressData?: Record<string, any>;
}

export interface Analytics {
  total: number;
  active: number;
  completed: number;
  totalRevenue: number;
  bySource: Record<string, SourceStats>;
  byType?: Record<string, TypeStats>;
}

export interface SourceStats {
  count: number;
  paid: number;
  revenue: number;
  avgProgress: number;
  completions: number;
}

export interface TypeStats {
  count: number;
  revenue: number;
  avgProgress: number;
  completions: number;
}

export interface ReferralStats {
  referralCode: string;
  clicks: number;
  conversions: number;
  earnings: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export const accessTicketService = {
  /**
   * Create access ticket (universal enrollment!)
   * 
   * Works for courses, programs, bundles, events - EVERYTHING!
   * 
   * @param params - Enrollment parameters
   * @returns Created ticket
   * 
   * @example
   * // Enroll in course
   * await accessTicketService.createTicket({
   *   userId: 'user-123',
   *   containerType: 'course',
   *   containerId: 'course-456',
   *   acquisitionSource: 'marketplace_purchase',
   *   pricePaidCents: 9900
   * });
   * 
   * @example
   * // Create bundle ticket
   * await accessTicketService.createTicket({
   *   userId: 'user-123',
   *   containerType: 'bundle',
   *   bundleItems: [
   *     { type: 'course', id: 'course-1' },
   *     { type: 'program', id: 'program-1' }
   *   ],
   *   acquisitionSource: 'marketplace_purchase',
   *   pricePaidCents: 29900
   * });
   */
  async createTicket(params: CreateTicketParams): Promise<AccessTicket> {
    // Replicate the logic from the create_access_ticket RPC function
    // using a direct table insert (the RPC may not be deployed).

    const ticketType = params.ticketType || 'paid';
    const pricePaid = params.pricePaidCents ?? 0;
    const originalPrice = params.originalPriceCents ?? 0;

    // Calculate discount
    let discountCents = 0;
    let discountReason: string | null = null;
    if (originalPrice > 0) {
      discountCents = Math.max(originalPrice - pricePaid, 0);
      if (params.referralCode) {
        discountReason = 'referral_10pct';
      } else if (discountCents > 0) {
        discountReason = 'discount_applied';
      }
    }

    // Determine payment status
    let paymentStatus: string;
    const waivableTypes = ['free', 'scholarship', 'membership_included', 'gifted', 'promotional'];
    if (waivableTypes.includes(ticketType)) {
      paymentStatus = 'waived';
    } else if (params.paymentTransactionId) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'pending';
    }

    // Determine payment method
    let paymentMethod: string | null = null;
    const methodTypes = ['scholarship', 'membership_included', 'gifted'];
    if (methodTypes.includes(ticketType)) {
      paymentMethod = ticketType;
    } else if (params.paymentTransactionId) {
      paymentMethod = 'convertkit';
    }

    const now = new Date().toISOString();
    const isPaidOrWaived = paymentStatus === 'paid' || paymentStatus === 'waived';

    const referralCode = generateReferralCode(
      params.userId,
      params.containerType,
      params.containerId
    );

    const insertPayload = {
      user_id: params.userId,
      container_type: params.containerType,
      container_id: params.containerId || null,
      bundle_items: params.bundleItems || [],
      acquisition_source: params.acquisitionSource,
      acquisition_context: params.acquisitionContext || {},
      ticket_type: ticketType,
      original_price_cents: originalPrice,
      price_paid_cents: pricePaid,
      discount_applied_cents: discountCents,
      discount_reason: discountReason,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      payment_transaction_id: params.paymentTransactionId || null,
      payment_completed_at: paymentStatus === 'paid' ? now : null,
      status: 'active' as const,
      activated_at: isPaidOrWaived ? now : null,
      referral_code: referralCode,
    };

    // Attempt insert; on conflict (user already has a ticket for this container),
    // try to reactivate cancelled/expired tickets instead.
    const { data: ticket, error } = await supabase
      .from('access_tickets')
      .upsert(insertPayload, {
        onConflict: 'user_id,container_type,container_id',
      })
      .select()
      .single();

    if (error) {
      if (isTableMissing(error)) {
        // Table hasn't been created yet — return a stub ticket so callers
        // (enrollmentBridge, useProgramMembership, etc.) continue working
        // with legacy tables.  Same graceful-fallback pattern as every
        // read method in this service.
        console.debug('[accessTicketService] access_tickets table not found — returning stub (migration pending)');
        return {
          id: `stub-${Date.now()}`,
          user_id: params.userId,
          container_type: params.containerType,
          container_id: params.containerId || null,
          bundle_items: params.bundleItems || [],
          acquisition_source: params.acquisitionSource,
          acquisition_context: params.acquisitionContext || {},
          ticket_type: ticketType,
          original_price_cents: originalPrice,
          price_paid_cents: pricePaid,
          discount_applied_cents: discountCents,
          discount_reason: discountReason,
          payment_status: paymentStatus as PaymentStatus,
          payment_method: paymentMethod,
          payment_transaction_id: params.paymentTransactionId || null,
          payment_completed_at: isPaidOrWaived ? now : null,
          status: 'active' as TicketStatus,
          first_accessed_at: null,
          last_accessed_at: null,
          total_access_count: 0,
          progress_percentage: 0,
          progress_data: {},
          granted_at: now,
          activated_at: isPaidOrWaived ? now : null,
          expires_at: null,
          completed_at: null,
          cancelled_at: null,
          referral_code: referralCode,
          referral_clicks: 0,
          referral_conversions: 0,
          referral_earnings_cents: 0,
          metadata: {},
          created_at: now,
          updated_at: now,
        } as AccessTicket;
      }
      console.error('Failed to create access ticket:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    // If a referral code was provided, credit the referrer
    if (params.referralCode) {
      try {
        // Find the referrer's ticket by their referral code
        const { data: referrer } = await supabase
          .from('access_tickets')
          .select('id, referral_conversions, referral_earnings_cents')
          .eq('referral_code', params.referralCode)
          .single();

        if (referrer) {
          await supabase
            .from('access_tickets')
            .update({
              referral_conversions: (referrer.referral_conversions || 0) + 1,
              referral_earnings_cents: (referrer.referral_earnings_cents || 0) + discountCents,
              updated_at: now,
            })
            .eq('id', referrer.id);
        }
      } catch (refErr) {
        console.error('Failed to credit referrer (non-critical):', refErr);
      }
    }

    return ticket;
  },

  /**
   * Check if user has access to container
   * 
   * Universal! Works for ANY container type.
   * 
   * @param userId - User ID
   * @param containerType - Type of container
   * @param containerId - Container ID
   * @returns true if user has valid active ticket
   */
  async hasAccess(
    userId: string, 
    containerType: ContainerType, 
    containerId: string
  ): Promise<boolean> {
    // Direct query replaces the has_access RPC (may not be deployed).
    const { data, error } = await supabase
      .from('access_tickets')
      .select('id')
      .eq('user_id', userId)
      .eq('container_type', containerType)
      .eq('container_id', containerId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      if (isTableMissing(error)) return false;
      console.error('Failed to check access:', error);
      return false;
    }

    return !!data;
  },

  /**
   * Check if user has access via bundle
   * 
   * @param userId - User ID
   * @param containerType - Type of container
   * @param containerId - Container ID
   * @returns true if user has bundle that includes this container
   */
  async hasBundleAccess(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<boolean> {
    try {
      // Query active bundle tickets for this user
      const { data, error } = await supabase
        .from('access_tickets')
        .select('bundle_items')
        .eq('user_id', userId)
        .eq('container_type', 'bundle')
        .eq('status', 'active');

      if (error) {
        if (isTableMissing(error)) return false;
        console.error('Failed to check bundle access:', error);
        return false;
      }

      if (!data || data.length === 0) return false;

      // Check if any bundle's items contain the target container
      const now = new Date();
      return data.some((ticket: any) => {
        const items = ticket.bundle_items as Array<{ type: string; id: string }> | null;
        if (!items || !Array.isArray(items)) return false;
        return items.some(
          (item) => item.type === containerType && item.id === containerId
        );
      });
    } catch (err) {
      console.error('Failed to check bundle access:', err);
      return false;
    }
  },

  /**
   * Get user's ticket for container
   * 
   * @param userId - User ID
   * @param containerType - Type of container
   * @param containerId - Container ID
   * @returns Ticket or null if not found
   */
  async getUserTicket(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<AccessTicket | null> {
    const { data, error } = await supabase
      .from('access_tickets')
      .select('*')
      .eq('user_id', userId)
      .eq('container_type', containerType)
      .eq('container_id', containerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || isTableMissing(error)) {
        return null;
      }
      console.error('Failed to fetch user ticket:', error);
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }

    return data;
  },

  /**
   * Get all active tickets for user (My Learning page!)
   * 
   * Returns ALL active tickets across ALL container types.
   * Perfect for unified dashboard!
   * 
   * @param userId - User ID
   * @returns Array of tickets
   */
  async getUserActiveTickets(userId: string): Promise<AccessTicket[]> {
    const { data, error } = await supabase
      .from('access_tickets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('last_accessed_at', { ascending: false, nullsFirst: false });

    if (error) {
      if (isTableMissing(error)) return [];
      console.error('Failed to fetch user active tickets:', error);
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get user's tickets by container type
   * 
   * @param userId - User ID
   * @param containerType - Type of container
   * @returns Array of tickets
   */
  async getUserTicketsByType(
    userId: string,
    containerType: ContainerType
  ): Promise<AccessTicket[]> {
    const { data, error } = await supabase
      .from('access_tickets')
      .select('*')
      .eq('user_id', userId)
      .eq('container_type', containerType)
      .eq('status', 'active')
      .order('last_accessed_at', { ascending: false, nullsFirst: false });

    if (error) {
      if (isTableMissing(error)) return [];
      console.error('Failed to fetch user tickets by type:', error);
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Update ticket progress
   * 
   * Works for courses and programs.
   * 
   * @param params - Progress update parameters
   * @returns true if updated successfully
   */
  async updateProgress(params: UpdateProgressParams): Promise<boolean> {
    // Direct update replaces the update_ticket_progress RPC (may not be deployed).
    const updatePayload: Record<string, any> = {
      progress_percentage: params.progressPercentage,
      updated_at: new Date().toISOString(),
    };

    if (params.progressData) {
      updatePayload.progress_data = params.progressData;
    }

    // Mark as completed if 100%
    if (params.progressPercentage >= 100) {
      updatePayload.status = 'completed';
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('access_tickets')
      .update(updatePayload)
      .eq('user_id', params.userId)
      .eq('container_type', params.containerType)
      .eq('container_id', params.containerId)
      .eq('status', 'active')
      .select('id');

    if (error) {
      if (isTableMissing(error)) return false;
      console.error('Failed to update ticket progress:', error);
      throw new Error(`Failed to update progress: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  },

  /**
   * Record access (updates last_accessed_at and access count)
   * 
   * @param userId - User ID
   * @param containerType - Type of container
   * @param containerId - Container ID
   */
  async recordAccess(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<void> {
    // Two-step: read current values then update (supabase.raw is not available).
    try {
      const { data: ticket, error: readErr } = await supabase
        .from('access_tickets')
        .select('id, total_access_count, first_accessed_at')
        .eq('user_id', userId)
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .eq('status', 'active')
        .maybeSingle();

      if (readErr || !ticket) {
        if (readErr && !isTableMissing(readErr)) {
          console.error('Failed to read ticket for access recording:', readErr);
        }
        return;
      }

      const now = new Date().toISOString();
      await supabase
        .from('access_tickets')
        .update({
          last_accessed_at: now,
          total_access_count: (ticket.total_access_count || 0) + 1,
          first_accessed_at: ticket.first_accessed_at || now,
        })
        .eq('id', ticket.id);
    } catch (err) {
      console.error('Failed to record access (non-critical):', err);
    }
  },

  /**
   * Get referral stats for user's ticket
   * 
   * @param userId - User ID
   * @param containerType - Type of container
   * @param containerId - Container ID
   * @returns Referral statistics
   */
  async getReferralStats(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<ReferralStats | null> {
    const { data, error } = await supabase
      .from('access_tickets')
      .select('referral_code, referral_clicks, referral_conversions, referral_earnings_cents')
      .eq('user_id', userId)
      .eq('container_type', containerType)
      .eq('container_id', containerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || isTableMissing(error)) return null;
      console.error('Failed to fetch referral stats:', error);
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }

    return {
      referralCode: data.referral_code || '',
      clicks: data.referral_clicks,
      conversions: data.referral_conversions,
      earnings: data.referral_earnings_cents,
    };
  },

  /**
   * Get analytics for container (ALL sources!)
   * 
   * Perfect for admin dashboard!
   * 
   * @param containerType - Type of container
   * @param containerId - Container ID
   * @returns Analytics broken down by source
   */
  async getContainerAnalytics(
    containerType: ContainerType,
    containerId: string
  ): Promise<Analytics> {
    const { data: tickets, error } = await supabase
      .from('access_tickets')
      .select('*')
      .eq('container_type', containerType)
      .eq('container_id', containerId);

    if (error) {
      if (isTableMissing(error)) return { total: 0, active: 0, completed: 0, totalRevenue: 0, bySource: {} };
      console.error('Failed to fetch container analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }

    const bySource: Record<string, SourceStats> = {};

    tickets?.forEach((ticket) => {
      const source = ticket.acquisition_source;
      
      if (!bySource[source]) {
        bySource[source] = {
          count: 0,
          paid: 0,
          revenue: 0,
          avgProgress: 0,
          completions: 0,
        };
      }

      bySource[source].count++;
      if (ticket.ticket_type === 'paid') bySource[source].paid++;
      bySource[source].revenue += ticket.price_paid_cents || 0;
      bySource[source].avgProgress += ticket.progress_percentage || 0;
      if (ticket.status === 'completed') bySource[source].completions++;
    });

    // Calculate averages
    Object.keys(bySource).forEach((source) => {
      bySource[source].avgProgress = Math.round(
        bySource[source].avgProgress / bySource[source].count
      );
    });

    return {
      total: tickets?.length || 0,
      active: tickets?.filter((t) => t.status === 'active').length || 0,
      completed: tickets?.filter((t) => t.status === 'completed').length || 0,
      totalRevenue: tickets?.reduce((sum, t) => sum + (t.price_paid_cents || 0), 0) || 0,
      bySource,
    };
  },

  /**
   * Get platform-wide analytics (ALL container types!)
   * 
   * Perfect for super admin dashboard!
   * Shows breakdown by container type AND source.
   * 
   * @returns Platform-wide analytics
   */
  async getPlatformAnalytics(): Promise<Analytics> {
    const { data: tickets, error } = await supabase
      .from('access_tickets')
      .select('*');

    if (error) {
      if (isTableMissing(error)) return { total: 0, active: 0, completed: 0, totalRevenue: 0, bySource: {}, byType: {} };
      console.error('Failed to fetch platform analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }

    const bySource: Record<string, SourceStats> = {};
    const byType: Record<string, TypeStats> = {};

    tickets?.forEach((ticket) => {
      const source = ticket.acquisition_source;
      const type = ticket.container_type;
      
      // By source
      if (!bySource[source]) {
        bySource[source] = {
          count: 0,
          paid: 0,
          revenue: 0,
          avgProgress: 0,
          completions: 0,
        };
      }
      bySource[source].count++;
      if (ticket.ticket_type === 'paid') bySource[source].paid++;
      bySource[source].revenue += ticket.price_paid_cents || 0;
      bySource[source].avgProgress += ticket.progress_percentage || 0;
      if (ticket.status === 'completed') bySource[source].completions++;

      // By type
      if (!byType[type]) {
        byType[type] = {
          count: 0,
          revenue: 0,
          avgProgress: 0,
          completions: 0,
        };
      }
      byType[type].count++;
      byType[type].revenue += ticket.price_paid_cents || 0;
      byType[type].avgProgress += ticket.progress_percentage || 0;
      if (ticket.status === 'completed') byType[type].completions++;
    });

    // Calculate averages
    Object.keys(bySource).forEach((source) => {
      bySource[source].avgProgress = Math.round(
        bySource[source].avgProgress / bySource[source].count
      );
    });
    Object.keys(byType).forEach((type) => {
      byType[type].avgProgress = Math.round(
        byType[type].avgProgress / byType[type].count
      );
    });

    return {
      total: tickets?.length || 0,
      active: tickets?.filter((t) => t.status === 'active').length || 0,
      completed: tickets?.filter((t) => t.status === 'completed').length || 0,
      totalRevenue: tickets?.reduce((sum, t) => sum + (t.price_paid_cents || 0), 0) || 0,
      bySource,
      byType,
    };
  },

  /**
   * Cancel ticket (user cancellation)
   * 
   * @param userId - User ID
   * @param containerType - Type of container
   * @param containerId - Container ID
   * @returns true if cancelled
   */
  async cancelTicket(
    userId: string,
    containerType: ContainerType,
    containerId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('access_tickets')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('container_type', containerType)
      .eq('container_id', containerId)
      .eq('status', 'active')
      .select();

    if (error) {
      if (isTableMissing(error)) return false;
      console.error('Failed to cancel ticket:', error);
      throw new Error(`Failed to cancel: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  },

  /**
   * Get top referrers (works across ALL container types!)
   * 
   * @param containerType - Optional: filter by type
   * @param containerId - Optional: filter by container
   * @param limit - Max results
   * @returns Top referrers by earnings
   */
  async getTopReferrers(
    containerType?: ContainerType,
    containerId?: string,
    limit: number = 10
  ): Promise<any[]> {
    let query = supabase
      .from('access_tickets')
      .select(`
        user_id,
        container_type,
        referral_code,
        referral_clicks,
        referral_conversions,
        referral_earnings_cents,
        user:users(display_name, email, avatar_url)
      `)
      .gt('referral_conversions', 0)
      .order('referral_earnings_cents', { ascending: false })
      .limit(limit);

    if (containerType) {
      query = query.eq('container_type', containerType);
    }
    if (containerId) {
      query = query.eq('container_id', containerId);
    }

    const { data, error } = await query;

    if (error) {
      if (isTableMissing(error)) return [];
      console.error('Failed to fetch top referrers:', error);
      throw new Error(`Failed to fetch referrers: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Validate referral code
   * 
   * @param referralCode - Referral code to validate
   * @returns Ticket if code is valid, null otherwise
   */
  async validateReferralCode(referralCode: string): Promise<AccessTicket | null> {
    const { data, error } = await supabase
      .from('access_tickets')
      .select('*')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116' || isTableMissing(error)) return null;
      console.error('Failed to validate referral code:', error);
      return null;
    }

    return data;
  },

  /**
   * Track referral click
   * 
   * @param referralCode - Referral code
   */
  async trackReferralClick(referralCode: string): Promise<void> {
    // Two-step: read then update (supabase.raw is not available).
    try {
      const { data: ticket, error: readErr } = await supabase
        .from('access_tickets')
        .select('id, referral_clicks')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (readErr || !ticket) {
        if (readErr && !isTableMissing(readErr)) {
          console.error('Failed to read ticket for referral click:', readErr);
        }
        return;
      }

      await supabase
        .from('access_tickets')
        .update({
          referral_clicks: (ticket.referral_clicks || 0) + 1,
        })
        .eq('id', ticket.id);
    } catch (err) {
      console.error('Failed to track referral click (non-critical):', err);
    }
  },

  /**
   * Get user's total referral earnings (across ALL tickets!)
   * 
   * Perfect for referral dashboard!
   * 
   * @param userId - User ID
   * @returns Total earnings and breakdown
   */
  async getUserReferralEarnings(userId: string): Promise<{
    totalEarnings: number;
    totalConversions: number;
    totalClicks: number;
    byType: Record<string, { earnings: number; conversions: number; clicks: number }>;
  }> {
    const { data: tickets, error } = await supabase
      .from('access_tickets')
      .select('*')
      .eq('user_id', userId)
      .gt('referral_conversions', 0);

    if (error) {
      if (isTableMissing(error)) return { totalEarnings: 0, totalConversions: 0, totalClicks: 0, byType: {} };
      console.error('Failed to fetch user referral earnings:', error);
      throw new Error(`Failed to fetch earnings: ${error.message}`);
    }

    const byType: Record<string, { earnings: number; conversions: number; clicks: number }> = {};
    let totalEarnings = 0;
    let totalConversions = 0;
    let totalClicks = 0;

    tickets?.forEach((ticket) => {
      const type = ticket.container_type;
      
      if (!byType[type]) {
        byType[type] = { earnings: 0, conversions: 0, clicks: 0 };
      }

      byType[type].earnings += ticket.referral_earnings_cents;
      byType[type].conversions += ticket.referral_conversions;
      byType[type].clicks += ticket.referral_clicks;

      totalEarnings += ticket.referral_earnings_cents;
      totalConversions += ticket.referral_conversions;
      totalClicks += ticket.referral_clicks;
    });

    return {
      totalEarnings,
      totalConversions,
      totalClicks,
      byType,
    };
  },
};