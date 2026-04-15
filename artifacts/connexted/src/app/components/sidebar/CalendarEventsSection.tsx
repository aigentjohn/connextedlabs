import { Link, useLocation } from 'react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CalendarDays,
  CalendarCheck,
  Ticket,
  Users,
  MapPin,
  Video,
  Calendar,
  Layers,
  Settings,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface CalendarEventsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  eventCount: number;
  meetingCount: number;
  meetupCount: number;
}

export function CalendarEventsSection({
  isExpanded,
  onToggle,
  eventCount,
  meetingCount,
  meetupCount,
}: CalendarEventsSectionProps) {
  const location = useLocation();

  const totalCount = eventCount + meetingCount + meetupCount;

  return (
    <div className="mb-1.5">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
          isExpanded && 'bg-gray-50'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <CalendarDays className="w-4 h-4 text-blue-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">CALENDAR & EVENTS</span>
        {totalCount > 0 && <span className="text-xs text-gray-500">({totalCount})</span>}
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          <SideLink to="/calendar" icon={Calendar} pathname={location.pathname}>My Calendar</SideLink>
          <SideLink to="/my-calendar-admin" icon={Settings} pathname={location.pathname} match="startsWith">Calendar Admin</SideLink>
          <SideLink to="/events" icon={CalendarCheck} pathname={location.pathname} count={eventCount} match="startsWith">Open Events</SideLink>
          <SideLink to="/ticketed-events" icon={Ticket} pathname={location.pathname} match="startsWith">Ticketed Events</SideLink>
          <SideLink to="/meetings" icon={Video} pathname={location.pathname} count={meetingCount} match="startsWith">Meetings</SideLink>
          <SideLink to="/meetups" icon={Users} pathname={location.pathname} count={meetupCount} match="startsWith">Meetups</SideLink>
          <SideLink to="/my-sessions" icon={CalendarDays} pathname={location.pathname} match="startsWith">Sessions</SideLink>
          <SideLink to="/event-companions" icon={Layers} pathname={location.pathname} match="startsWith">Event Companions</SideLink>
          <SideLink to="/profile/venues" icon={MapPin} pathname={location.pathname}>Venues</SideLink>
        </div>
      )}
    </div>
  );
}

function SideLink({
  to,
  icon: Icon,
  pathname,
  children,
  count,
  match = 'exact',
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  children: ReactNode;
  count?: number;
  match?: 'exact' | 'startsWith';
}) {
  const isActive = match === 'exact' ? pathname === to : pathname.startsWith(to);

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
      {count !== undefined && count > 0 && <span className="text-xs text-gray-500">({count})</span>}
    </Link>
  );
}
