/**
 * Enrollment Bridge Service
 * 
 * Creates BOTH access_tickets (new system) AND legacy enrollment records
 * (course_enrollments / program_members) in a single operation.
 * 
 * WHY:
 * - The access_tickets system is the target (unified, analytics, referrals)
 * - But frontend pages still check legacy tables (course_enrollments, program_members)
 * - Until ALL frontend pages are migrated, we need both records
 * 
 * USAGE:
 * - Free course enrollment → enrollmentBridge.enrollInCourse()
 * - Free program join → enrollmentBridge.enrollInProgram()
 * - Code redemption → enrollmentBridge.redeemCode()
 * - All three create ticket + legacy record together
 * 
 * WHEN TO REMOVE:
 * - Once CoursePlayerPage, MyCoursesPage, etc. all check access_tickets
 *   instead of course_enrollments, the legacy inserts can be dropped.
 */

import { supabase } from '@/lib/supabase';
import { accessTicketService, type ContainerType, type AcquisitionSource, type TicketType } from './accessTicketService';

// ============================================================================
// COURSE ENROLLMENT (free/direct)
// ============================================================================

export async function enrollInCourse(params: {
  userId: string;
  courseId: string;
  acquisitionSource?: AcquisitionSource;
  acquisitionContext?: Record<string, any>;
  ticketType?: TicketType;
  pricePaidCents?: number;
  originalPriceCents?: number;
  paymentTransactionId?: string;
  referralCode?: string;
}): Promise<{ ticketId: string; enrollmentId: string }> {
  const {
    userId,
    courseId,
    acquisitionSource = 'direct_enrollment',
    acquisitionContext = {},
    ticketType = 'free',
    pricePaidCents = 0,
    originalPriceCents = 0,
    paymentTransactionId,
    referralCode,
  } = params;

  // 1. Create access_ticket (new system)
  let ticketId: string;
  try {
    const ticket = await accessTicketService.createTicket({
      userId,
      containerType: 'course',
      containerId: courseId,
      acquisitionSource,
      acquisitionContext,
      ticketType,
      pricePaidCents,
      originalPriceCents,
      paymentTransactionId,
      referralCode,
    });
    ticketId = ticket.id;
  } catch (err: any) {
    // If ticket already exists (duplicate), that's OK — fetch existing
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      const existing = await accessTicketService.getUserTicket(userId, 'course', courseId);
      if (existing) {
        ticketId = existing.id;
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  // 2. Create legacy course_enrollment (bridge)
  let enrollmentId: string = '';
  try {
    const paymentStatus = ticketType === 'free' ? 'free' 
      : ticketType === 'scholarship' ? 'free'
      : paymentTransactionId ? 'paid' : 'pending';

    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .insert({
        course_id: courseId,
        user_id: userId,
        enrolled_at: new Date().toISOString(),
        payment_status: paymentStatus,
        payment_amount_cents: pricePaidCents,
        progress_percentage: 0,
        completed_journeys: 0,
      })
      .select('id')
      .single();

    if (error) {
      // Duplicate is fine (user already enrolled via another path)
      if (error.code === '23505') {
        console.log('Legacy course_enrollment already exists, skipping');
        const { data: existing } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', userId)
          .single();
        enrollmentId = existing?.id || '';
      } else {
        console.error('Failed to create legacy course_enrollment:', error);
        // Don't throw — ticket was created successfully, legacy is best-effort
      }
    } else {
      enrollmentId = enrollment?.id || '';
    }
  } catch (err) {
    console.error('Legacy course_enrollment bridge error:', err);
    // Non-fatal — ticket is the source of truth
  }

  return { ticketId, enrollmentId };
}

// ============================================================================
// PROGRAM ENROLLMENT (free/direct)
// ============================================================================

export async function enrollInProgram(params: {
  userId: string;
  programId: string;
  role?: 'member' | 'facilitator' | 'admin';
  status?: 'enrolled' | 'applied' | 'waitlist';
  acquisitionSource?: AcquisitionSource;
  acquisitionContext?: Record<string, any>;
  ticketType?: TicketType;
  pricePaidCents?: number;
  originalPriceCents?: number;
  paymentTransactionId?: string;
  referralCode?: string;
}): Promise<{ ticketId: string; membershipId: string }> {
  const {
    userId,
    programId,
    role = 'member',
    status = 'enrolled',
    acquisitionSource = 'direct_enrollment',
    acquisitionContext = {},
    ticketType = 'free',
    pricePaidCents = 0,
    originalPriceCents = 0,
    paymentTransactionId,
    referralCode,
  } = params;

  // 1. Create access_ticket (new system)
  let ticketId: string;
  try {
    const ticket = await accessTicketService.createTicket({
      userId,
      containerType: 'program',
      containerId: programId,
      acquisitionSource,
      acquisitionContext,
      ticketType,
      pricePaidCents,
      originalPriceCents,
      paymentTransactionId,
      referralCode,
    });
    ticketId = ticket.id;
  } catch (err: any) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      const existing = await accessTicketService.getUserTicket(userId, 'program', programId);
      if (existing) {
        ticketId = existing.id;
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  // 2. Create legacy program_member (bridge)
  let membershipId: string = '';
  try {
    const insertData: any = {
      program_id: programId,
      user_id: userId,
      role,
      status,
    };

    if (status === 'enrolled') {
      insertData.enrolled_at = new Date().toISOString();
    }

    const { data: membership, error } = await supabase
      .from('program_members')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log('Legacy program_member already exists, skipping');
        const { data: existing } = await supabase
          .from('program_members')
          .select('id')
          .eq('program_id', programId)
          .eq('user_id', userId)
          .single();
        membershipId = existing?.id || '';
      } else {
        console.error('Failed to create legacy program_member:', error);
      }
    } else {
      membershipId = membership?.id || '';
    }
  } catch (err) {
    console.error('Legacy program_member bridge error:', err);
  }

  return { ticketId, membershipId };
}

// ============================================================================
// GENERIC CONTAINER ENROLLMENT
// ============================================================================

export async function enrollInContainer(params: {
  userId: string;
  containerType: ContainerType;
  containerId: string;
  acquisitionSource?: AcquisitionSource;
  acquisitionContext?: Record<string, any>;
  ticketType?: TicketType;
  pricePaidCents?: number;
  originalPriceCents?: number;
  paymentTransactionId?: string;
  referralCode?: string;
}): Promise<{ ticketId: string }> {
  const { containerType, containerId, userId, ...rest } = params;

  // Route to specific bridge functions for course/program (they need legacy records)
  if (containerType === 'course') {
    const result = await enrollInCourse({ userId, courseId: containerId, ...rest });
    return { ticketId: result.ticketId };
  }

  if (containerType === 'program') {
    const result = await enrollInProgram({ userId, programId: containerId, ...rest });
    return { ticketId: result.ticketId };
  }

  // For other container types, just create the ticket
  const ticket = await accessTicketService.createTicket({
    userId,
    containerType,
    containerId,
    acquisitionSource: rest.acquisitionSource || 'direct_enrollment',
    acquisitionContext: rest.acquisitionContext || {},
    ticketType: rest.ticketType || 'free',
    pricePaidCents: rest.pricePaidCents,
    originalPriceCents: rest.originalPriceCents,
    paymentTransactionId: rest.paymentTransactionId,
    referralCode: rest.referralCode,
  });

  return { ticketId: ticket.id };
}

// ============================================================================
// MARKETPLACE OFFERING ENROLLMENT (ticket-only — no legacy table)
// ============================================================================

/**
 * Grant access to a marketplace offering.
 *
 * Offerings have no legacy enrollment table, so this is ticket-only from
 * the start.  `checkAccess` will find the ticket directly without a fallback.
 */
export async function enrollInOffering(params: {
  userId: string;
  offeringId: string;
  acquisitionSource?: AcquisitionSource;
  acquisitionContext?: Record<string, any>;
  ticketType?: TicketType;
  pricePaidCents?: number;
  originalPriceCents?: number;
  paymentTransactionId?: string;
  referralCode?: string;
}): Promise<{ ticketId: string }> {
  const {
    userId,
    offeringId,
    acquisitionSource = 'admin_grant',
    acquisitionContext = {},
    ticketType = 'free',
    pricePaidCents = 0,
    originalPriceCents = 0,
    paymentTransactionId,
    referralCode,
  } = params;

  let ticketId: string;
  try {
    const ticket = await accessTicketService.createTicket({
      userId,
      containerType: 'marketplace_offering',
      containerId: offeringId,
      acquisitionSource,
      acquisitionContext,
      ticketType,
      pricePaidCents,
      originalPriceCents,
      paymentTransactionId,
      referralCode,
    });
    ticketId = ticket.id;
  } catch (err: any) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      const existing = await accessTicketService.getUserTicket(userId, 'marketplace_offering', offeringId);
      if (existing) {
        ticketId = existing.id;
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  return { ticketId };
}

// ============================================================================
// CODE REDEMPTION (with legacy bridge)
// ============================================================================

export async function redeemCodeWithBridge(params: {
  code: string;
  userId: string;
}): Promise<{
  ticketId: string;
  containerType: string;
  containerId: string;
}> {
  const { code, userId } = params;

  // 1. Validate the code first
  const { data: codeData, error: validateError } = await supabase
    .from('redemption_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('status', 'active')
    .single();

  if (validateError || !codeData) {
    throw new Error('Invalid or expired code');
  }

  // Check expiration
  if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
    throw new Error('This code has expired');
  }

  // Check redemption limit
  if (codeData.max_redemptions && codeData.redemption_count >= codeData.max_redemptions) {
    throw new Error('This code has reached its maximum redemptions');
  }

  const containerType = codeData.container_type as ContainerType;
  const containerId = codeData.container_id;

  // 2. Determine ticket type from code source
  const ticketTypeMap: Record<string, TicketType> = {
    scholarship: 'scholarship',
    partner: 'promotional',
    promo: 'promotional',
    gift_card: 'gifted',
    bulk_purchase: 'paid',
    contest: 'gifted',
  };
  const ticketType = ticketTypeMap[codeData.source] || 'promotional';

  // 3. Create ticket + legacy record via bridge
  const result = await enrollInContainer({
    userId,
    containerType,
    containerId,
    acquisitionSource: 'scholarship', // All code redemptions map to this
    acquisitionContext: {
      redemption_code: code.trim().toUpperCase(),
      redemption_code_id: codeData.id,
      redemption_source: codeData.source,
      notes: codeData.notes,
    },
    ticketType,
  });

  // 4. Update redemption code status
  const updateData: any = {
    redemption_count: (codeData.redemption_count || 0) + 1,
    updated_at: new Date().toISOString(),
  };

  // If single-use code, mark as redeemed
  if (codeData.max_redemptions === 1) {
    updateData.status = 'redeemed';
    updateData.redeemed_by = userId;
    updateData.redeemed_at = new Date().toISOString();
  }

  await supabase
    .from('redemption_codes')
    .update(updateData)
    .eq('id', codeData.id);

  return {
    ticketId: result.ticketId,
    containerType,
    containerId,
  };
}

// ============================================================================
// ACCESS CHECK (unified — checks ticket first, falls back to legacy)
// ============================================================================

export async function checkAccess(params: {
  userId: string;
  containerType: ContainerType;
  containerId: string;
}): Promise<{
  hasAccess: boolean;
  source: 'ticket' | 'legacy' | 'none';
  ticketId?: string;
  legacyId?: string;
}> {
  const { userId, containerType, containerId } = params;

  // 1. Check access_tickets first (source of truth)
  try {
    const ticket = await accessTicketService.getUserTicket(userId, containerType, containerId);
    if (ticket && ticket.status === 'active' && 
        (!ticket.expires_at || new Date(ticket.expires_at) > new Date())) {
      return { hasAccess: true, source: 'ticket', ticketId: ticket.id };
    }

    // Also check bundle access
    const bundleAccess = await accessTicketService.hasBundleAccess(userId, containerType, containerId);
    if (bundleAccess) {
      return { hasAccess: true, source: 'ticket' };
    }
  } catch (err) {
    console.error('Ticket access check error:', err);
  }

  // 2. Fallback to legacy tables
  if (containerType === 'course') {
    const { data } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', containerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      // Backfill: create a ticket for this legacy enrollment
      try {
        await enrollInCourse({
          userId,
          courseId: containerId,
          acquisitionSource: 'direct_enrollment',
          ticketType: 'free',
        });
      } catch (backfillErr) {
        // Non-fatal — they still have access via legacy
        console.log('Backfill ticket creation skipped (may already exist)');
      }
      return { hasAccess: true, source: 'legacy', legacyId: data.id };
    }
  }

  if (containerType === 'program') {
    const { data } = await supabase
      .from('program_members')
      .select('id, status')
      .eq('program_id', containerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (data && (data.status === 'enrolled' || data.status === 'active' || data.status === 'completed')) {
      try {
        await enrollInProgram({
          userId,
          programId: containerId,
          acquisitionSource: 'direct_enrollment',
          ticketType: 'free',
        });
      } catch (backfillErr) {
        console.log('Backfill ticket creation skipped (may already exist)');
      }
      return { hasAccess: true, source: 'legacy', legacyId: data.id };
    }
  }

  return { hasAccess: false, source: 'none' };
}