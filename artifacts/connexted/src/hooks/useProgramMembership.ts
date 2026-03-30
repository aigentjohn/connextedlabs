// Split candidate: ~482 lines — consider extracting useIsProgramMember, useProgramMembers, and useJoinProgram into individual focused hooks.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { accessTicketService } from '@/services/accessTicketService';

export interface ProgramMember {
  id: string;
  program_id: string;
  user_id: string;
  status: string; // Member status (enrolled, completed, withdrawn, etc.)
  application_data?: any;
  application_submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  enrolled_at?: string;
  first_rsvp_at?: string;
  first_attended_at?: string;
  last_action_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramMemberWithUser extends ProgramMember {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

/**
 * Hook to check if current user is a member of a program
 */
export function useIsProgramMember(programId: string | undefined) {
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [membership, setMembership] = useState<ProgramMember | null>(null);

  useEffect(() => {
    if (!programId) {
      setIsLoading(false);
      return;
    }

    async function checkMembership() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsMember(false);
          setIsLoading(false);
          return;
        }

        // 1. Check legacy program_members first (still primary for membership details)
        const { data, error } = await supabase
          .from('program_members')
          .select('*')
          .eq('program_id', programId)
          .eq('user_id', user.id)
          .in('status', ['enrolled', 'active', 'completed'])
          .single();

        // Handle table not existing yet (PGRST205) or no row found (PGRST116)
        if (error && (error.code === 'PGRST116' || error.code === 'PGRST205')) {
          // No legacy record — check access_tickets as fallback
          try {
            const hasTicket = await accessTicketService.hasAccess(user.id, 'program', programId);
            if (hasTicket) {
              setIsMember(true);
              setMembership({ id: 'ticket-access', program_id: programId, user_id: user.id, status: 'enrolled' } as any);
            } else {
              setIsMember(false);
              setMembership(null);
            }
          } catch (ticketErr) {
            setIsMember(false);
            setMembership(null);
          }
        } else if (error) {
          // Non-critical error — treat as no membership
          setIsMember(false);
          setMembership(null);
        } else {
          setIsMember(!!data);
          setMembership(data);
        }
      } catch (error: any) {
        // Network errors (Failed to fetch) are expected when table doesn't exist — handle silently
        if (error?.message?.includes('Failed to fetch')) {
          // Silently treat as no membership
        } else {
          console.error('Error in checkMembership:', error);
        }
        setIsMember(false);
        setMembership(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkMembership();
  }, [programId]);

  return { isMember, membership, isLoading };
}

/**
 * Hook to get all members of a program
 */
export function useProgramMembers(programId: string | undefined) {
  const [members, setMembers] = useState<ProgramMemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!programId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('program_members')
        .select(`
          *,
          user:users (
            id,
            name,
            email,
            avatar
          )
        `)
        .eq('program_id', programId)
        .in('status', ['enrolled', 'completed'])
        .order('enrolled_at', { ascending: true });

      // Handle table not existing yet (PGRST205)
      if (fetchError && fetchError.code === 'PGRST205') {
        // Table doesn't exist - return empty array
        setMembers([]);
        setError(null);
      } else if (fetchError) {
        throw fetchError;
      } else {
        setMembers(data || []);
        setError(null);
      }
    } catch (err: any) {
      // Network errors (Failed to fetch) are expected when table doesn't exist
      if (err?.message?.includes('Failed to fetch')) {
        setMembers([]);
        setError(null);
      } else {
        console.error('Error fetching program members:', err);
        setError(err as Error);
        setMembers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, isLoading, error, refetch: fetchMembers };
}

/**
 * Hook to get current user's program memberships
 */
export function useMyProgramMemberships() {
  const [memberships, setMemberships] = useState<ProgramMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMemberships = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMemberships([]);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('program_members')
        .select('*')
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      // Handle table not existing yet (PGRST205)
      if (fetchError && fetchError.code === 'PGRST205') {
        // Table doesn't exist - return empty array
        setMemberships([]);
        setError(null);
      } else if (fetchError) {
        throw fetchError;
      } else {
        setMemberships(data || []);
        setError(null);
      }
    } catch (err: any) {
      // Network errors (Failed to fetch) are expected when table doesn't exist
      if (err?.message?.includes('Failed to fetch')) {
        setMemberships([]);
        setError(null);
      } else {
        console.error('Error fetching my program memberships:', err);
        setError(err as Error);
        setMemberships([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  return { memberships, isLoading, error, refetch: fetchMemberships };
}

/**
 * Hook to join a program
 */
export function useJoinProgram() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const joinProgram = useCallback(async (programId: string, accessType: 'open' | 'request' | 'invite' = 'open') => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to join a program');

      // Check access type
      if (accessType === 'invite') {
        throw new Error('This is an invite-only program. You must be invited by an admin.');
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('program_members')
        .select('id, status')
        .eq('program_id', programId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        if (existing.status === 'withdrawn' || existing.status === 'declined') {
          // Re-join/re-apply
          const newStatus = accessType === 'request' ? 'applied' : 'enrolled';
          const updateData: any = { 
            status: newStatus,
            updated_at: new Date().toISOString()
          };
          
          if (newStatus === 'applied') {
            updateData.application_submitted_at = new Date().toISOString();
          } else {
            updateData.enrolled_at = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from('program_members')
            .update(updateData)
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else if (existing.status === 'applied') {
          throw new Error('Your application is pending review');
        } else if (existing.status === 'enrolled' || existing.status === 'active' || existing.status === 'completed') {
          // User is already a member - return success silently instead of throwing error
          return { success: true, status: existing.status, alreadyMember: true };
        } else {
          throw new Error(`Cannot join - current status: ${existing.status}`);
        }
      } else {
        // Create new membership
        const newStatus = accessType === 'request' ? 'applied' : 'enrolled';
        const insertData: any = {
          program_id: programId,
          user_id: user.id,
          status: newStatus,
        };

        if (newStatus === 'applied') {
          insertData.application_submitted_at = new Date().toISOString();
        } else {
          insertData.enrolled_at = new Date().toISOString();
        }

        const { error: insertError } = await supabase
          .from('program_members')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Also create access_ticket (new unified system) for enrolled status
      const finalStatus = accessType === 'request' ? 'applied' : 'enrolled';
      if (finalStatus === 'enrolled') {
        try {
          await accessTicketService.createTicket({
            userId: user.id,
            containerType: 'program',
            containerId: programId,
            acquisitionSource: 'direct_enrollment',
            ticketType: 'free',
          });
        } catch (ticketErr: any) {
          // Duplicate ticket is fine; any other error is non-fatal
          if (!ticketErr.message?.includes('duplicate') && !ticketErr.message?.includes('unique')) {
            console.error('Failed to create access ticket (non-fatal):', ticketErr);
          }
        }
      }

      return { success: true, status: finalStatus };
    } catch (err) {
      console.error('Error joining program:', err);
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { joinProgram, isLoading, error };
}

/**
 * Hook to leave a program
 */
export function useLeaveProgram() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const leaveProgram = useCallback(async (programId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const { error: updateError } = await supabase
        .from('program_members')
        .update({
          status: 'withdrawn',
          updated_at: new Date().toISOString(),
        })
        .eq('program_id', programId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      console.error('Error leaving program:', err);
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { leaveProgram, isLoading, error };
}

/**
 * Hook to update member progress
 */
export function useUpdateMemberProgress() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateProgress = useCallback(async (
    programId: string,
    userId: string,
    progress: ProgramMember['progress']
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('program_members')
        .update({ progress })
        .eq('program_id', programId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      console.error('Error updating member progress:', err);
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateProgress, isLoading, error };
}

/**
 * Hook to update member role (admin only)
 */
export function useUpdateMemberRole() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateRole = useCallback(async (
    programId: string,
    userId: string,
    role: ProgramMember['role']
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('program_members')
        .update({ role })
        .eq('program_id', programId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      console.error('Error updating member role:', err);
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateRole, isLoading, error };
}

/**
 * Hook to remove a member (admin only)
 */
export function useRemoveProgramMember() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const removeMember = useCallback(async (programId: string, userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('program_members')
        .delete()
        .eq('program_id', programId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      return { success: true };
    } catch (err) {
      console.error('Error removing program member:', err);
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { removeMember, isLoading, error };
}