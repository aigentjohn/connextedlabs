import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ContainerState {
  id: string;
  container_type: string;
  container_id: string;
  state: 'hidden' | 'active' | 'paused' | 'frozen' | 'suspended' | 'archived';
  state_reason?: string;
  state_changed_at?: string;
  state_changed_by?: string;
  // Paused config
  paused_allow_new_joins?: boolean;
  paused_resume_date?: string;
  paused_admins_can_override?: boolean;
  // Frozen config
  frozen_public_view?: boolean;
  frozen_members_can_post?: boolean;
  frozen_show_enrollment_closed?: boolean;
  frozen_guest_message?: string;
  frozen_allow_waitlist?: boolean;
  // Suspended config
  suspended_show_reason_to_members?: boolean;
  suspended_public_message?: string;
  suspended_internal_notes?: string;
  suspended_until?: string;
  // Archived config
  archived_completion_date?: string;
  archived_alumni_access?: boolean;
  archived_show_in_list?: boolean;
}

export interface ContainerStatePermissions {
  canView: boolean;
  canPost: boolean;
  canJoin: boolean;
  isHidden: boolean;
  isActive: boolean;
  isPaused: boolean;
  isFrozen: boolean;
  isSuspended: boolean;
  isArchived: boolean;
}

export function useContainerState(containerType: string, containerId: string, userId?: string) {
  const [state, setState] = useState<ContainerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissions, setPermissions] = useState<ContainerStatePermissions>({
    canView: true,
    canPost: true,
    canJoin: true,
    isHidden: false,
    isActive: true,
    isPaused: false,
    isFrozen: false,
    isSuspended: false,
    isArchived: false,
  });

  useEffect(() => {
    loadState();
  }, [containerType, containerId]);

  const loadState = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch container state
      const { data, error: stateError } = await supabase
        .from('container_states')
        .select('*')
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .single();

      if (stateError && stateError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected for new containers)
        // PGRST205 = table not found (migration not applied yet)
        if (stateError.code === 'PGRST205') {
          console.warn('Container states table not found - feature not yet enabled');
          // Default to active state with full permissions
          const defaultState = {
            container_type: containerType,
            container_id: containerId,
            state: 'active' as const,
          };
          setState(defaultState as ContainerState);
          const perms = await calculatePermissions(defaultState);
          setPermissions(perms);
          setLoading(false);
          return;
        }
        throw stateError;
      }

      const containerState = data || {
        container_type: containerType,
        container_id: containerId,
        state: 'active' as const,
      };

      setState(containerState as ContainerState);

      // Calculate permissions
      const perms = await calculatePermissions(containerState);
      setPermissions(perms);
    } catch (err) {
      console.error('Error loading container state:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePermissions = async (containerState: any): Promise<ContainerStatePermissions> => {
    const currentState = containerState?.state || 'active';
    
    // Base permissions object
    const perms: ContainerStatePermissions = {
      canView: false,
      canPost: false,
      canJoin: false,
      isHidden: currentState === 'hidden',
      isActive: currentState === 'active',
      isPaused: currentState === 'paused',
      isFrozen: currentState === 'frozen',
      isSuspended: currentState === 'suspended',
      isArchived: currentState === 'archived',
    };

    // Check if user is admin or member
    let isAdmin = false;
    let isMember = false;
    let isPlatformAdmin = false;

    if (userId) {
      // Check platform admin
      const { data: userData } = await supabase
        .from('users')
        .select('is_platform_admin')
        .eq('id', userId)
        .single();
      
      isPlatformAdmin = userData?.is_platform_admin || false;

      // Check container admin
      const { data: adminData } = await supabase
        .from('container_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .single();
      
      isAdmin = !!adminData;

      // Check membership
      const { data: memberData } = await supabase
        .from('container_memberships')
        .select('status')
        .eq('user_id', userId)
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .single();
      
      isMember = memberData?.status === 'active';
    }

    // State-based permissions
    switch (currentState) {
      case 'hidden':
        perms.canView = isAdmin;
        perms.canPost = isAdmin;
        perms.canJoin = false;
        break;

      case 'active':
        perms.canView = isMember || isAdmin || isPlatformAdmin;
        perms.canPost = isMember || isAdmin;
        perms.canJoin = true;
        break;

      case 'paused':
        perms.canView = isMember || isAdmin || isPlatformAdmin;
        perms.canPost = isAdmin && (containerState?.paused_admins_can_override !== false);
        perms.canJoin = containerState?.paused_allow_new_joins || false;
        break;

      case 'frozen':
        perms.canView = containerState?.frozen_public_view !== false ? true : (isMember || isAdmin);
        perms.canPost = (isMember && containerState?.frozen_members_can_post) || isAdmin;
        perms.canJoin = false;
        break;

      case 'suspended':
        perms.canView = isPlatformAdmin;
        perms.canPost = false;
        perms.canJoin = false;
        break;

      case 'archived':
        perms.canView = (isMember && containerState?.archived_alumni_access !== false) || isAdmin;
        perms.canPost = isAdmin;
        perms.canJoin = false;
        break;
    }

    return perms;
  };

  const refresh = () => {
    loadState();
  };

  return {
    state,
    permissions,
    loading,
    error,
    refresh,
  };
}