/**
 * Participant State Management API
 * 
 * Centralized functions for managing participant states across programs and circles.
 * Includes state changes, history tracking, and auto-suggestions.
 */
// Split candidate: ~767 lines — consider splitting into participant-state-transitions.ts, participant-state-history.ts, and participant-state-suggestions.ts.

import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================

export interface MemberState {
  id: string;
  name: string;
  category: 'access' | 'engagement' | 'exit';
  description: string;
  color: string;
  icon?: string;
  sort_order: number;
}

export interface Participant {
  id: string;
  program_id?: string;
  circle_id?: string;
  user_id: string;
  current_state: string;
  previous_state?: string;
  state_changed_at: string;
  state_changed_by?: string;
  state_change_reason?: string;
  state_change_auto: boolean;
  state_history: StateHistoryEntry[];
  total_sessions_expected: number;
  total_sessions_attended: number;
  attendance_rate: number;
  consecutive_absences: number;
  last_session_attended_at?: string;
  last_activity_at: string;
  application_data?: any;
  invite_data?: any;
  admin_notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  state?: MemberState;
}

export interface StateHistoryEntry {
  from_state: string | null;
  to_state: string;
  changed_at: string;
  changed_by?: string;
  reason: string;
  auto: boolean;
}

export interface StateSuggestion {
  participant_id: string;
  user_id: string;
  current_state: string;
  suggested_state: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface FunnelConfiguration {
  id: string;
  program_id?: string;
  circle_id?: string;
  enabled_states: string[];
  auto_suggestions?: {
    attendance_based?: {
      at_risk_threshold?: number;
      inactive_threshold?: number;
      active_threshold?: number;
    };
    time_based?: {
      new_member_days?: number;
      inactive_days?: number;
    };
  };
  created_at: string;
  updated_at: string;
}

// =====================================================
// MEMBER STATES
// =====================================================

/**
 * Get all available member states
 */
export async function getAllMemberStates(): Promise<MemberState[]> {
  try {
    const { data, error } = await supabase
      .from('member_states')
      .select('*')
      .order('sort_order');
    
    if (error) {
      console.error('Error loading states:', error);
      // Return default states if table doesn't exist
      return getDefaultMemberStates();
    }
    return data || getDefaultMemberStates();
  } catch (error) {
    console.error('Error loading states:', error);
    return getDefaultMemberStates();
  }
}

/**
 * Get default member states (fallback when table doesn't exist)
 */
function getDefaultMemberStates(): MemberState[] {
  return [
    {
      id: 'invited',
      name: 'Invited',
      category: 'access',
      description: 'User has been invited',
      color: '#8B5CF6',
      icon: 'Mail',
      sort_order: 1
    },
    {
      id: 'applied',
      name: 'Applied',
      category: 'access',
      description: 'User has applied',
      color: '#3B82F6',
      icon: 'FileText',
      sort_order: 2
    },
    {
      id: 'approved',
      name: 'Approved',
      category: 'access',
      description: 'Application approved',
      color: '#10B981',
      icon: 'CheckCircle',
      sort_order: 3
    },
    {
      id: 'enrolled',
      name: 'Enrolled',
      category: 'engagement',
      description: 'Active participant',
      color: '#059669',
      icon: 'UserCheck',
      sort_order: 4
    },
    {
      id: 'completed',
      name: 'Completed',
      category: 'exit',
      description: 'Successfully completed',
      color: '#6366F1',
      icon: 'Award',
      sort_order: 5
    },
    {
      id: 'not_completed',
      name: 'Not Completed',
      category: 'exit',
      description: 'Did not complete',
      color: '#EF4444',
      icon: 'XCircle',
      sort_order: 6
    }
  ];
}

/**
 * Get member states by category
 */
export async function getMemberStatesByCategory(category: 'access' | 'engagement' | 'exit'): Promise<MemberState[]> {
  const { data, error } = await supabase
    .from('member_states')
    .select('*')
    .eq('category', category)
    .order('sort_order');
  
  if (error) throw error;
  return data || [];
}

/**
 * Get a single member state by ID
 */
export async function getMemberState(stateId: string): Promise<MemberState | null> {
  const { data, error } = await supabase
    .from('member_states')
    .select('*')
    .eq('id', stateId)
    .single();
  
  if (error) throw error;
  return data;
}

// =====================================================
// FUNNEL CONFIGURATION
// =====================================================

/**
 * Get funnel configuration for a program
 */
export async function getProgramFunnelConfig(programId: string): Promise<FunnelConfiguration | null> {
  const { data, error } = await supabase
    .from('funnel_configurations')
    .select('*')
    .eq('program_id', programId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get funnel configuration for a circle
 */
export async function getCircleFunnelConfig(circleId: string): Promise<FunnelConfiguration | null> {
  const { data, error } = await supabase
    .from('funnel_configurations')
    .select('*')
    .eq('circle_id', circleId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update funnel configuration
 */
export async function updateFunnelConfig(
  configId: string,
  updates: Partial<FunnelConfiguration>
): Promise<FunnelConfiguration> {
  const { data, error } = await supabase
    .from('funnel_configurations')
    .update(updates)
    .eq('id', configId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create funnel configuration
 */
export async function createFunnelConfig(
  config: Omit<FunnelConfiguration, 'id' | 'created_at' | 'updated_at'>
): Promise<FunnelConfiguration> {
  const { data, error } = await supabase
    .from('funnel_configurations')
    .insert(config)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// =====================================================
// PARTICIPANTS
// =====================================================

/**
 * Get all participants for a program
 */
export async function getProgramParticipants(programId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      user:users!participants_user_id_fkey(id, name, email, avatar_url),
      state:member_states!participants_current_state_fkey(*)
    `)
    .eq('program_id', programId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get all participants for a circle
 */
export async function getCircleParticipants(circleId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      user:users!participants_user_id_fkey(id, name, email, avatar_url),
      state:member_states!participants_current_state_fkey(*)
    `)
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get participants by state
 */
export async function getParticipantsByState(
  programId: string | null,
  circleId: string | null,
  stateId: string
): Promise<Participant[]> {
  let query = supabase
    .from('participants')
    .select(`
      *,
      user:users!participants_user_id_fkey(id, name, email, avatar_url),
      state:member_states!participants_current_state_fkey(*)
    `)
    .eq('current_state', stateId);
  
  if (programId) query = query.eq('program_id', programId);
  if (circleId) query = query.eq('circle_id', circleId);
  
  const { data, error } = await query.order('state_changed_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get a single participant
 */
export async function getParticipant(participantId: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      user:users!participants_user_id_fkey(id, name, email, avatar_url),
      state:member_states!participants_current_state_fkey(*)
    `)
    .eq('id', participantId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get participant for a specific user in a program/circle
 */
export async function getUserParticipant(
  userId: string,
  programId?: string,
  circleId?: string
): Promise<Participant | null> {
  let query = supabase
    .from('participants')
    .select(`
      *,
      user:users!participants_user_id_fkey(id, name, email, avatar_url),
      state:member_states!participants_current_state_fkey(*)
    `)
    .eq('user_id', userId);
  
  if (programId) query = query.eq('program_id', programId);
  if (circleId) query = query.eq('circle_id', circleId);
  
  const { data, error } = await query.maybeSingle();
  
  if (error) throw error;
  return data;
}

// =====================================================
// STATE MANAGEMENT
// =====================================================

/**
 * Change a participant's state (with audit trail)
 */
export async function changeParticipantState(
  participantId: string,
  newState: string,
  changedBy: string,
  reason: string,
  auto: boolean = false
): Promise<void> {
  const { error } = await supabase.rpc('change_participant_state', {
    p_participant_id: participantId,
    p_new_state: newState,
    p_changed_by: changedBy,
    p_reason: reason,
    p_auto: auto
  });
  
  if (error) throw error;

  // Create notification for the member about their state change
  if (!auto) { // Only notify on manual admin changes
    await createStateChangeNotification(participantId, newState, changedBy);
  }
}

/**
 * Bulk change participant states
 */
export async function bulkChangeParticipantStates(
  participantIds: string[],
  newState: string,
  changedBy: string,
  reason: string
): Promise<void> {
  // Execute in parallel
  await Promise.all(
    participantIds.map(id => 
      changeParticipantState(id, newState, changedBy, reason, false)
    )
  );
}

/**
 * Get state change history for a participant
 */
export async function getParticipantStateHistory(participantId: string): Promise<StateHistoryEntry[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('state_history')
    .eq('id', participantId)
    .single();
  
  if (error) throw error;
  return (data?.state_history || []) as StateHistoryEntry[];
}

// =====================================================
// STATE SUGGESTIONS
// =====================================================

/**
 * Get suggested state changes for a program
 */
export async function getProgramStateSuggestions(programId: string): Promise<StateSuggestion[]> {
  try {
    const { data, error } = await supabase.rpc('get_state_suggestions', {
      p_program_id: programId,
      p_circle_id: null
    });
    
    if (error) {
      console.error('Error loading suggestions:', error);
      return []; // Return empty array instead of throwing
    }
    return data || [];
  } catch (error) {
    console.error('Error loading suggestions:', error);
    return [];
  }
}

/**
 * Get suggested state changes for a circle
 */
export async function getCircleStateSuggestions(circleId: string): Promise<StateSuggestion[]> {
  try {
    const { data, error } = await supabase.rpc('get_state_suggestions', {
      p_program_id: null,
      p_circle_id: circleId
    });
    
    if (error) {
      console.error('Error loading suggestions:', error);
      return []; // Return empty array instead of throwing
    }
    return data || [];
  } catch (error) {
    console.error('Error loading suggestions:', error);
    return [];
  }
}

// =====================================================
// STATISTICS & ANALYTICS
// =====================================================

/**
 * Get state distribution summary for a program
 */
export async function getProgramStateSummary(programId: string): Promise<{
  state: string;
  state_name: string;
  state_color: string;
  state_category: string;
  count: number;
}[]> {
  const { data, error } = await supabase
    .from('program_state_summary')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order');
  
  if (error) throw error;
  return data || [];
}

/**
 * Get state distribution summary for a circle
 */
export async function getCircleStateSummary(circleId: string): Promise<{
  state: string;
  state_name: string;
  state_color: string;
  state_category: string;
  count: number;
}[]> {
  const { data, error } = await supabase
    .from('circle_state_summary')
    .select('*')
    .eq('circle_id', circleId);
  
  if (error) throw error;
  return data || [];
}

/**
 * Get engagement metrics for participants
 */
export async function getEngagementMetrics(programId?: string, circleId?: string): Promise<{
  total_participants: number;
  avg_attendance_rate: number;
  active_count: number;
  at_risk_count: number;
  inactive_count: number;
}> {
  let query = supabase.from('participants').select('*');
  
  if (programId) query = query.eq('program_id', programId);
  if (circleId) query = query.eq('circle_id', circleId);
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  const participants = data || [];
  const total = participants.length;
  const avgAttendance = total > 0 
    ? participants.reduce((sum, p) => sum + (p.attendance_rate || 0), 0) / total 
    : 0;
  
  return {
    total_participants: total,
    avg_attendance_rate: avgAttendance,
    active_count: participants.filter(p => p.current_state === 'active').length,
    at_risk_count: participants.filter(p => p.current_state === 'at_risk').length,
    inactive_count: participants.filter(p => p.current_state === 'inactive').length
  };
}

// =====================================================
// CREATE PARTICIPANTS
// =====================================================

/**
 * Create a new participant (when someone applies or is invited)
 */
export async function createParticipant(participant: {
  program_id?: string;
  circle_id?: string;
  user_id: string;
  current_state: string;
  state_change_reason?: string;
  application_data?: any;
  invite_data?: any;
}): Promise<Participant> {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      ...participant,
      state_history: [{
        from_state: null,
        to_state: participant.current_state,
        changed_at: new Date().toISOString(),
        changed_by: participant.user_id,
        reason: participant.state_change_reason || 'Initial state',
        auto: false
      }]
    })
    .select(`
      *,
      user:users!participants_user_id_fkey(id, name, email, avatar_url),
      state:member_states!participants_current_state_fkey(*)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

// =====================================================
// NOTIFICATIONS
// =====================================================

/**
 * Create a notification when an admin changes a member's state
 */
async function createStateChangeNotification(
  participantId: string,
  newStateId: string,
  changedBy: string
): Promise<void> {
  try {
    // Get participant details
    const participant = await getParticipant(participantId);
    if (!participant) return;

    // Get the new state details
    const newState = await getMemberState(newStateId);
    if (!newState) return;

    // Get container details (program or circle)
    let containerName = '';
    let containerType: 'program' | 'circle' = 'program';
    let containerSlug = '';

    if (participant.program_id) {
      const { data: program } = await supabase
        .from('programs')
        .select('name, slug')
        .eq('id', participant.program_id)
        .single();
      
      if (program) {
        containerName = program.name;
        containerSlug = program.slug;
        containerType = 'program';
      }
    } else if (participant.circle_id) {
      const { data: circle } = await supabase
        .from('circles')
        .select('name, id')
        .eq('id', participant.circle_id)
        .single();
      
      if (circle) {
        containerName = circle.name;
        containerSlug = circle.id;
        containerType = 'circle';
      }
    }

    // Generate notification message based on state
    const messages: Record<string, { title: string; message: string; link?: string }> = {
      'approved': {
        title: `You've been approved for ${containerName}!`,
        message: `Great news! Your application has been approved. Complete your enrollment to get started.`,
        link: containerType === 'program' ? `/programs/${containerSlug}/enroll` : `/circles/${containerSlug}`
      },
      'enrolled': {
        title: `Welcome to ${containerName}!`,
        message: `You're now enrolled. RSVP for your first session to confirm your attendance.`,
        link: containerType === 'program' ? `/programs/${containerSlug}` : `/circles/${containerSlug}`
      },
      'active': {
        title: `You're active in ${containerName}`,
        message: `Great work! You're actively participating. Keep it up!`,
        link: containerType === 'program' ? `/programs/${containerSlug}` : `/circles/${containerSlug}`
      },
      'at_risk': {
        title: `We miss you in ${containerName}`,
        message: `You've been less active recently. Reach out if you need support!`,
        link: containerType === 'program' ? `/programs/${containerSlug}` : `/circles/${containerSlug}`
      },
      'waitlisted': {
        title: `You're on the waitlist for ${containerName}`,
        message: `We'll notify you if a spot opens up!`
      },
      'rejected': {
        title: `Update about ${containerName}`,
        message: `We're unable to accept your application at this time. We encourage you to apply again in the future.`
      },
      'completed': {
        title: `Congratulations! You've completed ${containerName}`,
        message: `Well done! Check out other programs or stay connected.`,
        link: '/programs'
      },
      'invited': {
        title: `You've been invited to ${containerName}`,
        message: `Accept your invitation to join!`,
        link: containerType === 'program' ? `/programs/${containerSlug}/accept` : `/circles/${containerSlug}/accept`
      },
      'new_member': {
        title: `Welcome to ${containerName}!`,
        message: `Introduce yourself and start participating!`,
        link: containerType === 'program' ? `/programs/${containerSlug}` : `/circles/${containerSlug}`
      },
      'engaged': {
        title: `You're highly engaged in ${containerName}!`,
        message: `Awesome work! You're making meaningful contributions.`,
        link: containerType === 'program' ? `/programs/${containerSlug}` : `/circles/${containerSlug}`
      },
      'inactive': {
        title: `We miss you in ${containerName}`,
        message: `It's been a while. Catch up on what's new!`,
        link: containerType === 'program' ? `/programs/${containerSlug}` : `/circles/${containerSlug}`
      }
    };

    const notificationContent = messages[newStateId] || {
      title: `Status update for ${containerName}`,
      message: `Your status has been updated to: ${newState.name}`,
      link: containerType === 'program' ? `/programs/${containerSlug}` : `/circles/${containerSlug}`
    };

    // Create the notification
    await supabase.from('notifications').insert({
      user_id: participant.user_id,
      title: notificationContent.title,
      message: notificationContent.message,
      link: notificationContent.link,
      type: 'state_change',
      read: false
    });

    // Set notification flag on user
    await supabase
      .from('users')
      .update({ has_new_notifications: true })
      .eq('id', participant.user_id);

  } catch (error) {
    // Log error but don't fail the state change
    console.error('Error creating state change notification:', error);
  }
}

/**
 * Get member state for a specific user in a container
 */
export async function getMemberStateForUser(
  containerId: string,
  userId: string,
  containerType: 'program' | 'circle'
): Promise<{ state: MemberState; participant: Participant } | null> {
  const participant = containerType === 'program'
    ? await getUserParticipant(userId, containerId, undefined)
    : await getUserParticipant(userId, undefined, containerId);

  if (!participant || !participant.state) return null;

  return {
    state: participant.state,
    participant
  };
}