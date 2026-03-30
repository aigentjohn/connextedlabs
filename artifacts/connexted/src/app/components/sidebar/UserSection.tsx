/**
 * UserSection Component
 *
 * Identity & utilities: Home, Notifications, Profile, Calendar, Venues, Help.
 */

import { Link, useLocation } from 'react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  User,
  Home,
  Bell,
  UserCircle,
  Calendar,
  MapPin,
  HelpCircle,
  Briefcase,
  Activity,
  CreditCard,
  Ticket,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/components/ui/utils';
import { formatMembershipTier } from '@/lib/user-class-utils';

interface UserSectionProps {
  profile: any;
  isExpanded: boolean;
  onToggle: () => void;
  ticketCount?: number;
}

export function UserSection({ profile, isExpanded, onToggle, ticketCount }: UserSectionProps) {
  const location = useLocation();

  return (
    <div className="mb-1.5">
      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>
        <Link
          to="/"
          className={cn(
            'flex-1 flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
            location.pathname === '/' && 'bg-indigo-50'
          )}
        >
          <User className="w-4 h-4 text-indigo-600" />
          <span className="flex-1 text-left font-semibold text-gray-900">USER</span>
          {profile && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {formatMembershipTier(profile.membership_tier || 'free')}
            </Badge>
          )}
        </Link>
      </div>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          <NavLink to="/" icon={Home} pathname={location.pathname}>My Home</NavLink>
          <NavLink to="/notifications" icon={Bell} pathname={location.pathname}>Notifications</NavLink>
          <NavLink to="/my-tickets" icon={Ticket} pathname={location.pathname} match="startsWith" matchPath="/my-tickets" count={ticketCount}>My Tickets</NavLink>
          <NavLink to="/my-basics" icon={UserCircle} pathname={location.pathname} match="startsWith" matchPath="/my-basics">My Basics</NavLink>
          <NavLink to="/my-professional" icon={Briefcase} pathname={location.pathname} match="startsWith" matchPath="/my-professional">My Professional</NavLink>
          <NavLink to="/my-engagement" icon={Activity} pathname={location.pathname} match="startsWith" matchPath="/my-engagement">My Engagement</NavLink>
          <NavLink to="/my-account" icon={CreditCard} pathname={location.pathname} match="startsWith" matchPath="/my-account">My Account</NavLink>
          <NavLink to="/calendar" icon={Calendar} pathname={location.pathname}>My Calendar</NavLink>
          <NavLink to="/profile/venues" icon={MapPin} pathname={location.pathname}>My Venues</NavLink>
          <NavLink to="/help/welcome" icon={HelpCircle} pathname={location.pathname} match="startsWith" matchPath="/help">Help & Docs</NavLink>
        </div>
      )}
    </div>
  );
}

/** Lightweight nav link with active state detection */
function NavLink({
  to,
  icon: Icon,
  pathname,
  children,
  match = 'exact',
  matchPath,
  count,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  children: ReactNode;
  match?: 'exact' | 'startsWith' | 'includes';
  matchPath?: string;
  count?: number;
}) {
  const target = matchPath || to;
  const isActive =
    match === 'exact'
      ? pathname === target
      : match === 'startsWith'
        ? pathname.startsWith(target)
        : pathname.includes(target);

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
        isActive && 'bg-indigo-50 text-indigo-700'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1">{children}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
    </Link>
  );
}