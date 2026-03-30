import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Lock, PlayCircle, PauseCircle, Snowflake, Ban, Archive, AlertCircle, X } from 'lucide-react';

interface ContainerState {
  id: string;
  container_type: string;
  container_id: string;
  state: 'hidden' | 'active' | 'paused' | 'frozen' | 'suspended' | 'archived';
  state_reason?: string;
  paused_resume_date?: string;
  frozen_guest_message?: string;
  frozen_show_enrollment_closed?: boolean;
  suspended_show_reason_to_members?: boolean;
  suspended_public_message?: string;
  archived_completion_date?: string;
}

interface Props {
  containerType: string;
  containerId: string;
  isAdmin?: boolean;
  isMember?: boolean;
  className?: string;
}

const STATE_CONFIG = {
  hidden: {
    icon: Lock,
    variant: 'default' as const,
    showToMembers: false,
    showToAdmins: true,
    defaultMessage: 'This container is in preparation mode and not yet visible to members.',
  },
  active: {
    icon: PlayCircle,
    variant: 'default' as const,
    showToMembers: false,
    showToAdmins: false,
    defaultMessage: '',
  },
  paused: {
    icon: PauseCircle,
    variant: 'default' as const,
    showToMembers: true,
    showToAdmins: true,
    defaultMessage: 'This container is temporarily paused. You can view content but cannot post.',
  },
  frozen: {
    icon: Snowflake,
    variant: 'default' as const,
    showToMembers: true,
    showToAdmins: true,
    defaultMessage: 'Enrollment is closed. No new members can join at this time.',
  },
  suspended: {
    icon: Ban,
    variant: 'destructive' as const,
    showToMembers: true,
    showToAdmins: true,
    defaultMessage: 'This container is temporarily unavailable.',
  },
  archived: {
    icon: Archive,
    variant: 'default' as const,
    showToMembers: true,
    showToAdmins: true,
    defaultMessage: 'This container has been archived and is now read-only.',
  },
};

export function ContainerStateBanner({ containerType, containerId, isAdmin, isMember, className }: Props) {
  const [containerState, setContainerState] = useState<ContainerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadContainerState();
  }, [containerType, containerId]);

  const loadContainerState = async () => {
    try {
      const { data, error } = await supabase
        .from('container_states')
        .select('*')
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected for new containers)
        // PGRST205 = table not found (migration not applied yet)
        if (error.code === 'PGRST205') {
          console.warn('Container states table not found - feature not yet enabled');
          setLoading(false);
          return;
        }
        throw error;
      }

      setContainerState(data);
    } catch (err) {
      console.error('Error loading container state:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!containerState) return null;
  if (containerState.state === 'active') return null;
  if (dismissed) return null;

  const config = STATE_CONFIG[containerState.state];
  
  // Determine if banner should show
  const shouldShow = isAdmin ? config.showToAdmins : config.showToMembers;
  if (!shouldShow) return null;

  const Icon = config.icon;

  // Determine message
  let message = containerState.state_reason || config.defaultMessage;
  
  if (containerState.state === 'frozen' && containerState.frozen_guest_message && !isMember) {
    message = containerState.frozen_guest_message;
  } else if (containerState.state === 'suspended' && containerState.suspended_public_message) {
    message = containerState.suspended_public_message;
  }

  // Add date info if available
  let dateInfo = '';
  if (containerState.state === 'paused' && containerState.paused_resume_date) {
    const resumeDate = new Date(containerState.paused_resume_date);
    dateInfo = ` Resumes ${resumeDate.toLocaleDateString()}.`;
  } else if (containerState.state === 'archived' && containerState.archived_completion_date) {
    const completionDate = new Date(containerState.archived_completion_date);
    dateInfo = ` Completed ${completionDate.toLocaleDateString()}.`;
  }

  const getBgColor = () => {
    switch (containerState.state) {
      case 'hidden': return 'bg-gray-100 border-gray-300';
      case 'paused': return 'bg-yellow-50 border-yellow-300';
      case 'frozen': return 'bg-blue-50 border-blue-300';
      case 'suspended': return 'bg-red-50 border-red-300';
      case 'archived': return 'bg-purple-50 border-purple-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getTextColor = () => {
    switch (containerState.state) {
      case 'hidden': return 'text-gray-800';
      case 'paused': return 'text-yellow-900';
      case 'frozen': return 'text-blue-900';
      case 'suspended': return 'text-red-900';
      case 'archived': return 'text-purple-900';
      default: return 'text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (containerState.state) {
      case 'hidden': return 'text-gray-600';
      case 'paused': return 'text-yellow-600';
      case 'frozen': return 'text-blue-600';
      case 'suspended': return 'text-red-600';
      case 'archived': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`${getBgColor()} border rounded-lg p-4 ${className || ''}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${getIconColor()} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${getTextColor()} capitalize`}>
              {containerState.state}
            </span>
            {isAdmin && (
              <Badge variant="outline" className="text-xs">
                Admin View
              </Badge>
            )}
          </div>
          <p className={`text-sm ${getTextColor()}`}>
            {message}{dateInfo}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`${getTextColor()} hover:opacity-70 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface AccessGateProps {
  containerType: string;
  containerId: string;
  isAdmin?: boolean;
  isMember?: boolean;
  isPlatformAdmin?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ContainerAccessGate({
  containerType,
  containerId,
  isAdmin,
  isMember,
  isPlatformAdmin,
  children,
  fallback,
}: AccessGateProps) {
  const [containerState, setContainerState] = useState<ContainerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [containerType, containerId, isAdmin, isMember, isPlatformAdmin]);

  const checkAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('container_states')
        .select('*')
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected for new containers)
        // PGRST205 = table not found (migration not applied yet)
        if (error.code === 'PGRST205') {
          console.warn('Container states table not found - feature not yet enabled');
          setHasAccess(true); // Default to allowing access if feature not enabled
          setLoading(false);
          return;
        }
        throw error;
      }

      const state = data?.state || 'active';
      setContainerState(data);

      // Access rules by state
      switch (state) {
        case 'hidden':
          setHasAccess(isAdmin || isPlatformAdmin || false);
          break;
        case 'active':
          setHasAccess(true);
          break;
        case 'paused':
          setHasAccess(isMember || isAdmin || isPlatformAdmin || false);
          break;
        case 'frozen':
          // Check frozen_public_view setting
          const allowPublicView = data?.frozen_public_view !== false;
          setHasAccess(allowPublicView || isMember || isAdmin || isPlatformAdmin || false);
          break;
        case 'suspended':
          setHasAccess(isPlatformAdmin || false);
          break;
        case 'archived':
          setHasAccess(isMember || isAdmin || isPlatformAdmin || false);
          break;
        default:
          setHasAccess(true);
      }
    } catch (err) {
      console.error('Error checking access:', err);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;

    const state = containerState?.state || 'unknown';
    const Icon = STATE_CONFIG[state as keyof typeof STATE_CONFIG]?.icon || AlertCircle;

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Icon className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h3>
        <p className="text-gray-600 text-center max-w-md">
          {state === 'hidden' && 'This container is not yet available.'}
          {state === 'suspended' && 'This container is temporarily unavailable.'}
          {state === 'frozen' && 'This container is closed to new members.'}
          {state === 'archived' && 'This container has been archived and is only accessible to members.'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}