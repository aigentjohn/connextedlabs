/**
 * Container State Badge Utilities
 * 
 * Provides badge components and utilities for displaying container states
 */

import { Badge } from '@/app/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  PlayCircle, 
  PauseCircle, 
  Snowflake, 
  Ban, 
  Archive, 
  Sparkles, 
  AlertTriangle,
  Clock,
  Calendar,
  Mail,
  CheckCircle,
  UserCheck,
  DoorOpen,
  Lock,
  Hourglass
} from 'lucide-react';
import type { OperationalState, LifecycleState, MembershipState, AccessType } from './container-cta-logic';

interface BadgeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  description?: string;
}

/**
 * Get badge config for operational state
 */
export function getOperationalStateBadge(state: OperationalState): BadgeConfig {
  switch (state) {
    case 'hidden':
      return {
        label: 'Hidden',
        icon: EyeOff,
        className: 'bg-gray-100 text-gray-700 border-gray-300',
        description: 'Not visible to members (prep mode)'
      };
    case 'active':
      return {
        label: 'Active',
        icon: PlayCircle,
        className: 'bg-green-100 text-green-700 border-green-300',
        description: 'Normal operations'
      };
    case 'paused':
      return {
        label: 'Paused',
        icon: PauseCircle,
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        description: 'Temporary break'
      };
    case 'frozen':
      return {
        label: 'Frozen',
        icon: Snowflake,
        className: 'bg-blue-100 text-blue-700 border-blue-300',
        description: 'Enrollment closed'
      };
    case 'suspended':
      return {
        label: 'Suspended',
        icon: Ban,
        className: 'bg-red-100 text-red-700 border-red-300',
        description: 'Temporarily locked'
      };
    case 'archived':
      return {
        label: 'Archived',
        icon: Archive,
        className: 'bg-gray-100 text-gray-600 border-gray-300',
        description: 'Completed/Historical'
      };
    default:
      return {
        label: state,
        icon: Eye,
        className: 'bg-gray-100 text-gray-600 border-gray-300'
      };
  }
}

/**
 * Get badge config for lifecycle state
 */
export function getLifecycleStateBadge(state: LifecycleState): BadgeConfig {
  switch (state) {
    case 'idea':
      return {
        label: 'Idea',
        icon: Clock,
        className: 'bg-purple-100 text-purple-700 border-purple-300',
        description: 'In planning'
      };
    case 'created':
      return {
        label: 'Created',
        icon: Clock,
        className: 'bg-blue-100 text-blue-700 border-blue-300',
        description: 'Just created'
      };
    case 'released':
      return {
        label: 'Released',
        icon: PlayCircle,
        className: 'bg-teal-100 text-teal-700 border-teal-300',
        description: 'Visible, awaiting members'
      };
    case 'active':
      return {
        label: 'Active',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-700 border-green-300',
        description: 'Has members'
      };
    case 'engaged':
      return {
        label: 'Engaged',
        icon: Sparkles,
        className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        description: 'Thriving community'
      };
    case 'stale':
      return {
        label: 'Needs Activity',
        icon: AlertTriangle,
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        description: 'No recent activity'
      };
    default:
      return {
        label: state,
        icon: Eye,
        className: 'bg-gray-100 text-gray-600 border-gray-300'
      };
  }
}

/**
 * Get badge config for membership state
 */
export function getMembershipStateBadge(state: MembershipState): BadgeConfig | null {
  if (!state) return null;

  switch (state) {
    case 'invited':
      return {
        label: 'Invited',
        icon: Mail,
        className: 'bg-blue-100 text-blue-700 border-blue-300',
        description: "You're invited to join"
      };
    case 'applied':
      return {
        label: 'Applied',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        description: 'Application pending review'
      };
    case 'approved':
      return {
        label: 'Approved',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-700 border-green-300',
        description: 'Approved! Complete enrollment'
      };
    case 'enrolled':
      return {
        label: 'Enrolled',
        icon: UserCheck,
        className: 'bg-purple-100 text-purple-700 border-purple-300',
        description: "You're an active member"
      };
    case 'completed':
      return {
        label: 'Completed',
        icon: CheckCircle,
        className: 'bg-teal-100 text-teal-700 border-teal-300',
        description: 'You completed this'
      };
    case 'not_completed':
      return {
        label: 'Left Early',
        icon: Archive,
        className: 'bg-gray-100 text-gray-600 border-gray-300',
        description: 'You left before completion'
      };
    default:
      return null;
  }
}

/**
 * Get badge config for access type
 */
export function getAccessTypeBadge(accessType: AccessType): BadgeConfig | null {
  if (!accessType) return null;

  switch (accessType) {
    case 'open':
      return {
        label: 'Open to Join',
        icon: DoorOpen,
        className: 'bg-green-100 text-green-700 border-green-300',
        description: 'Anyone can join freely'
      };
    case 'request':
      return {
        label: 'Request to Join',
        icon: Mail,
        className: 'bg-blue-100 text-blue-700 border-blue-300',
        description: 'Requires approval'
      };
    case 'invite':
      return {
        label: 'Invite Only',
        icon: Lock,
        className: 'bg-purple-100 text-purple-700 border-purple-300',
        description: 'Admin invitation required'
      };
    default:
      return null;
  }
}

/**
 * Get expiration badge
 */
export function getExpirationBadge(
  expiresAt: string | null,
  isPermanent: boolean,
  scheduledArchiveAt?: string | null
): BadgeConfig | null {
  if (isPermanent) {
    return {
      label: 'Permanent',
      icon: CheckCircle,
      className: 'bg-blue-100 text-blue-700 border-blue-300',
      description: 'No expiration date'
    };
  }

  // Check scheduled archive first
  if (scheduledArchiveAt) {
    const daysUntil = Math.ceil(
      (new Date(scheduledArchiveAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= 0) {
      return {
        label: 'Scheduled to Archive',
        icon: Archive,
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        description: 'Past scheduled archive date'
      };
    } else if (daysUntil <= 7) {
      return {
        label: `Ends in ${daysUntil}d`,
        icon: Calendar,
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        description: 'Ending soon'
      };
    } else if (daysUntil <= 30) {
      return {
        label: `Ends in ${Math.ceil(daysUntil / 7)}w`,
        icon: Calendar,
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        description: 'Ending this month'
      };
    }
  }

  // Check expiration
  if (expiresAt) {
    const daysUntil = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= 0) {
      return {
        label: 'Expired',
        icon: AlertTriangle,
        className: 'bg-red-100 text-red-700 border-red-300',
        description: 'Content may be outdated'
      };
    } else if (daysUntil <= 30) {
      return {
        label: `Expires in ${daysUntil}d`,
        icon: Hourglass,
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        description: 'Expiring soon'
      };
    }
  }

  return null;
}

/**
 * Scheduled release badge
 */
export function getScheduledReleaseBadge(scheduledReleaseAt: string | null): BadgeConfig | null {
  if (!scheduledReleaseAt) return null;

  const daysUntil = Math.ceil(
    (new Date(scheduledReleaseAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil <= 0) {
    return null; // Already released or past schedule
  }

  if (daysUntil <= 7) {
    return {
      label: `Opens in ${daysUntil}d`,
      icon: Calendar,
      className: 'bg-blue-100 text-blue-700 border-blue-300',
      description: 'Opening soon'
    };
  } else if (daysUntil <= 30) {
    return {
      label: `Opens in ${Math.ceil(daysUntil / 7)}w`,
      icon: Calendar,
      className: 'bg-blue-100 text-blue-700 border-blue-300',
      description: 'Opening this month'
    };
  } else {
    return {
      label: 'Coming Soon',
      icon: Calendar,
      className: 'bg-blue-100 text-blue-700 border-blue-300',
      description: `Opens ${new Date(scheduledReleaseAt).toLocaleDateString()}`
    };
  }
}

/**
 * Render a state badge component
 */
export function StateBadge({ config }: { config: BadgeConfig | null }) {
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 ${config.className}`}
      title={config.description}
    >
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}
