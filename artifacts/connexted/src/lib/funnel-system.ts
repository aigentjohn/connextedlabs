/**
 * SIMPLIFIED FUNNEL SYSTEM
 * 
 * Split candidate: ~722 lines — consider extracting FunnelStateTransitions, FunnelNotifications, and FunnelHistory into separate modules.
 * 
 * 6 states representing manual admin actions:
 * - invited → applied → approved → enrolled → completed
 *                                         ↓
 *                                  not_completed
 * 
 * Key principle: States change ONLY through manual admin/user actions.
 * Engagement tracked via metrics, not states.
 */

import { supabase } from './supabase';
import { createFunnelNotification } from './funnel-notifications';
import { logError } from '@/lib/error-handler';

// =====================================================
// TYPES
// =====================================================

export type MemberState = 
  | 'invited' 
  | 'applied' 
  | 'approved' 
  | 'enrolled' 
  | 'completed' 
  | 'not_completed';

export type StateCategory = 'entry' | 'active' | 'exit';

export type ExitReason =
  | 'withdrawn_by_user'
  | 'removed_by_admin'
  | 'payment_failure'
  | 'no_show'
  | 'conduct_violation'
  | 'transferred'
  | 'other';

export type PaymentStatus =
  | 'not_required'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'comped'
  | 'refunded';

export type ParticipantRole = 'member' | 'host' | 'admin';

export interface MemberStateInfo {
  id: MemberState;
  label: string;
  category: StateCategory;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
}

export interface StateHistoryEntry {
  from_state: MemberState | null;
  to_state: MemberState;
  changed_at: string;
  changed_by: string;
  reason: string;
  auto: boolean;
}

export interface Participant {
  id: string;
  
  // Entity (one of these)
  program_id?: string;
  circle_id?: string;
  container_id?: string;
  
  user_id: string;
  role: ParticipantRole;
  
  // Current state
  current_state: MemberState;
  previous_state?: MemberState;
  state_changed_at: string;
  state_changed_by?: string;
  state_change_reason?: string;
  state_change_auto: boolean;
  state_history: StateHistoryEntry[];
  
  // Entry tracking
  invited_by?: string;
  invited_at?: string;
  invitation_code?: string;
  invite_data?: any;
  
  applied_at?: string;
  application_data?: any;
  
  approved_at?: string;
  approved_by?: string;
  
  enrolled_at?: string;
  enrolled_by?: string;
  
  // Exit tracking
  completed_at?: string;
  exited_at?: string;
  exit_reason?: ExitReason;
  exit_notes?: string;
  exited_by?: string;
  
  // Payment
  payment_status: PaymentStatus;
  payment_amount?: number;
  payment_method?: string;
  payment_data?: any;
  
  // Engagement metrics (auto-updated, NOT states)
  sessions_expected: number;
  sessions_attended: number;
  attendance_rate: number;
  consecutive_absences: number;
  last_session_attended_at?: string;
  last_activity_at?: string;
  days_since_last_activity?: number;
  engagement_score: number;
  
  // Admin tools
  admin_notes?: string;
  tags: string[];
  
  created_at: string;
  updated_at: string;
  
  // Joined user data
  user?: {
    first_name?: string;
    last_name?: string;
    email: string;
    avatar_url?: string;
  };
}

export interface FunnelColumn {
  state: MemberState;
  label: string;
  color: string;
  count: number;
  participants: Participant[];
}

export interface FunnelSummary {
  program_id?: string;
  circle_id?: string;
  program_name?: string;
  circle_name?: string;
  current_state: MemberState;
  state_label: string;
  state_color: string;
  state_category: StateCategory;
  count: number;
  avg_attendance_rate?: number;
  payment_issues_count?: number;
  waitlisted_count?: number;
}

// =====================================================
// CONSTANTS
// =====================================================

export const MEMBER_STATES: Record<MemberState, { label: string; color: string; icon: string; category: StateCategory }> = {
  invited: { label: 'Invited', color: 'blue', icon: 'mail', category: 'entry' },
  applied: { label: 'Applied', color: 'purple', icon: 'file-text', category: 'entry' },
  approved: { label: 'Approved', color: 'yellow', icon: 'check-circle', category: 'entry' },
  enrolled: { label: 'Enrolled', color: 'green', icon: 'user-check', category: 'active' },
  completed: { label: 'Completed', color: 'purple', icon: 'graduation-cap', category: 'exit' },
  not_completed: { label: 'Not Completed', color: 'red', icon: 'x-circle', category: 'exit' },
};

export const EXIT_REASONS: Record<ExitReason, string> = {
  withdrawn_by_user: 'Withdrawn by User',
  removed_by_admin: 'Removed by Admin',
  payment_failure: 'Payment Failure',
  no_show: 'No Show / No Engagement',
  conduct_violation: 'Conduct Violation',
  transferred: 'Transferred',
  other: 'Other',
};

// =====================================================
// STATE TRANSITION ACTIONS
// =====================================================

/**
 * Get allowed actions for a given state
 * Returns { up, down } where each is { label, state, action }
 */
export function getAllowedActions(currentState: MemberState): {
  up?: { label: string; state: MemberState; action: string };
  down?: { label: string; state: MemberState; action: string };
} {
  const actions: Record<MemberState, { up?: any; down?: any }> = {
    invited: {
      down: {
        label: '↓ Cancel Invite',
        state: 'not_completed' as MemberState,
        action: 'cancel_invite',
      },
    },
    applied: {
      up: {
        label: '↑ Approve',
        state: 'approved' as MemberState,
        action: 'approve',
      },
      down: {
        label: '↓ Reject',
        state: 'not_completed' as MemberState,
        action: 'reject',
      },
    },
    approved: {
      up: {
        label: '↑ Enroll',
        state: 'enrolled' as MemberState,
        action: 'enroll',
      },
      down: {
        label: '↓ Reject',
        state: 'not_completed' as MemberState,
        action: 'reject',
      },
    },
    enrolled: {
      up: {
        label: '↑ Mark Done',
        state: 'completed' as MemberState,
        action: 'mark_completed',
      },
      down: {
        label: '↓ Remove',
        state: 'not_completed' as MemberState,
        action: 'remove',
      },
    },
    completed: {
      // End state - no actions
    },
    not_completed: {
      // End state - no actions (could add re-enroll if needed)
    },
  };

  return actions[currentState] || {};
}

// =====================================================
// API FUNCTIONS
// =====================================================

/**
 * Get funnel summary for a program or circle
 */
export async function getFunnelSummary(
  entityType: 'program' | 'circle',
  entityId: string
): Promise<FunnelSummary[]> {
  const view = entityType === 'program' ? 'program_funnel_summary' : 'circle_funnel_summary';
  const idColumn = entityType === 'program' ? 'program_id' : 'circle_id';

  const { data, error } = await supabase
    .from(view)
    .select('*')
    .eq(idColumn, entityId)
    .order('current_state');

  if (error) throw error;
  return data || [];
}

/**
 * Get participants by state
 */
export async function getParticipantsByState(
  entityType: 'program' | 'circle',
  entityId: string,
  state?: MemberState
): Promise<Participant[]> {
  const entityColumn = entityType === 'program' ? 'program_id' : 'circle_id';

  let query = supabase
    .from('participants')
    .select(`
      *,
      user:users!inner (
        first_name,
        last_name,
        email,
        avatar_url
      )
    `)
    .eq(entityColumn, entityId);

  if (state) {
    query = query.eq('current_state', state);
  }

  query = query.order('state_changed_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get participants needing attention (enrolled with concerning metrics)
 */
export async function getParticipantsNeedingAttention(
  entityType: 'program' | 'circle',
  entityId: string
): Promise<Participant[]> {
  const entityColumn = entityType === 'program' ? 'program_id' : 'circle_id';

  const { data, error } = await supabase
    .from('participants_needing_attention')
    .select('*')
    .eq(entityColumn, entityId);

  if (error) throw error;
  return data || [];
}

/**
 * Transition participant state (generic)
 */
export async function transitionParticipantState(
  participantId: string,
  newState: MemberState,
  adminId: string,
  reason?: string,
  exitReason?: ExitReason,
  exitNotes?: string
): Promise<void> {
  const { error } = await supabase.rpc('transition_participant_state', {
    p_participant_id: participantId,
    p_new_state: newState,
    p_admin_id: adminId,
    p_reason: reason,
    p_exit_reason: exitReason,
    p_exit_notes: exitNotes,
  });

  if (error) throw error;

  // Create notification for user
  try {
    const { data: participant } = await supabase
      .from('participants')
      .select(`
        user_id,
        program_id,
        circle_id,
        program:programs(name),
        circle:circles(name)
      `)
      .eq('id', participantId)
      .single();

    if (participant) {
      await createFunnelNotification({
        userId: participant.user_id,
        participantId,
        newState,
        programId: participant.program_id,
        circleId: participant.circle_id,
        programName: participant.program?.name,
        circleName: participant.circle?.name,
        adminId,
        reason,
      });
    }
  } catch (notifError) {
    logError('Error creating notification:', notifError, { component: 'funnel-system' });
    // Don't fail the whole operation if notification fails
  }
}

/**
 * Approve application
 */
export async function approveApplication(
  participantId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc('approve_application', {
    p_participant_id: participantId,
    p_admin_id: adminId,
    p_notes: notes,
  });

  if (error) throw error;

  // Create notification
  try {
    const { data: participant } = await supabase
      .from('participants')
      .select(`
        user_id,
        program_id,
        circle_id,
        program:programs(name),
        circle:circles(name)
      `)
      .eq('id', participantId)
      .single();

    if (participant) {
      await createFunnelNotification({
        userId: participant.user_id,
        participantId,
        newState: 'approved',
        programId: participant.program_id,
        circleId: participant.circle_id,
        programName: participant.program?.name,
        circleName: participant.circle?.name,
        adminId,
        reason: notes,
      });
    }
  } catch (notifError) {
    logError('Error creating notification:', notifError, { component: 'funnel-system' });
  }
}

/**
 * Enroll member
 */
export async function enrollMember(
  participantId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc('enroll_member', {
    p_participant_id: participantId,
    p_admin_id: adminId,
    p_notes: notes,
  });

  if (error) throw error;

  // Create notification
  try {
    const { data: participant } = await supabase
      .from('participants')
      .select(`
        user_id,
        program_id,
        circle_id,
        program:programs(name),
        circle:circles(name)
      `)
      .eq('id', participantId)
      .single();

    if (participant) {
      await createFunnelNotification({
        userId: participant.user_id,
        participantId,
        newState: 'enrolled',
        programId: participant.program_id,
        circleId: participant.circle_id,
        programName: participant.program?.name,
        circleName: participant.circle?.name,
        adminId,
        reason: notes,
      });
    }
  } catch (notifError) {
    logError('Error creating notification:', notifError, { component: 'funnel-system' });
  }
}

/**
 * Mark as completed
 */
export async function markCompleted(
  participantId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc('mark_completed', {
    p_participant_id: participantId,
    p_admin_id: adminId,
    p_notes: notes,
  });

  if (error) throw error;

  // Create notification
  try {
    const { data: participant } = await supabase
      .from('participants')
      .select(`
        user_id,
        program_id,
        circle_id,
        program:programs(name),
        circle:circles(name)
      `)
      .eq('id', participantId)
      .single();

    if (participant) {
      await createFunnelNotification({
        userId: participant.user_id,
        participantId,
        newState: 'completed',
        programId: participant.program_id,
        circleId: participant.circle_id,
        programName: participant.program?.name,
        circleName: participant.circle?.name,
        adminId,
        reason: notes,
      });
    }
  } catch (notifError) {
    logError('Error creating notification:', notifError, { component: 'funnel-system' });
  }
}

/**
 * Remove member
 */
export async function removeMember(
  participantId: string,
  adminId: string,
  exitReason: ExitReason,
  exitNotes?: string
): Promise<void> {
  const { error } = await supabase.rpc('remove_member', {
    p_participant_id: participantId,
    p_admin_id: adminId,
    p_exit_reason: exitReason,
    p_exit_notes: exitNotes,
  });

  if (error) throw error;

  // Create notification
  try {
    const { data: participant } = await supabase
      .from('participants')
      .select(`
        user_id,
        program_id,
        circle_id,
        program:programs(name),
        circle:circles(name)
      `)
      .eq('id', participantId)
      .single();

    if (participant) {
      await createFunnelNotification({
        userId: participant.user_id,
        participantId,
        newState: 'not_completed',
        programId: participant.program_id,
        circleId: participant.circle_id,
        programName: participant.program?.name,
        circleName: participant.circle?.name,
        adminId,
        reason: exitNotes,
      });
    }
  } catch (notifError) {
    logError('Error creating notification:', notifError, { component: 'funnel-system' });
  }
}

/**
 * Reject application
 */
export async function rejectApplication(
  participantId: string,
  adminId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc('reject_application', {
    p_participant_id: participantId,
    p_admin_id: adminId,
    p_reason: reason,
  });

  if (error) throw error;

  // Create notification
  try {
    const { data: participant } = await supabase
      .from('participants')
      .select(`
        user_id,
        program_id,
        circle_id,
        program:programs(name),
        circle:circles(name)
      `)
      .eq('id', participantId)
      .single();

    if (participant) {
      await createFunnelNotification({
        userId: participant.user_id,
        participantId,
        newState: 'not_completed',
        programId: participant.program_id,
        circleId: participant.circle_id,
        programName: participant.program?.name,
        circleName: participant.circle?.name,
        adminId,
        reason,
      });
    }
  } catch (notifError) {
    logError('Error creating notification:', notifError, { component: 'funnel-system' });
  }
}

/**
 * Bulk state transition
 */
export async function bulkTransitionState(
  participantIds: string[],
  newState: MemberState,
  adminId: string,
  reason?: string,
  exitReason?: ExitReason,
  exitNotes?: string
): Promise<void> {
  // Execute transitions in parallel
  await Promise.all(
    participantIds.map((id) =>
      transitionParticipantState(id, newState, adminId, reason, exitReason, exitNotes)
    )
  );
}

/**
 * Add tag to participant
 */
export async function addParticipantTag(
  participantId: string,
  tag: string
): Promise<void> {
  const { data: participant } = await supabase
    .from('participants')
    .select('tags')
    .eq('id', participantId)
    .single();

  if (!participant) throw new Error('Participant not found');

  const tags = participant.tags || [];
  if (!tags.includes(tag)) {
    tags.push(tag);
    
    const { error } = await supabase
      .from('participants')
      .update({ tags })
      .eq('id', participantId);

    if (error) throw error;
  }
}

/**
 * Remove tag from participant
 */
export async function removeParticipantTag(
  participantId: string,
  tag: string
): Promise<void> {
  const { data: participant } = await supabase
    .from('participants')
    .select('tags')
    .eq('id', participantId)
    .single();

  if (!participant) throw new Error('Participant not found');

  const tags = (participant.tags || []).filter((t: string) => t !== tag);
  
  const { error } = await supabase
    .from('participants')
    .update({ tags })
    .eq('id', participantId);

  if (error) throw error;
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  participantId: string,
  status: PaymentStatus,
  amount?: number,
  method?: string,
  data?: any
): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update({
      payment_status: status,
      payment_amount: amount,
      payment_method: method,
      payment_data: data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId);

  if (error) throw error;
}