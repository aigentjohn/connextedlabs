/**
 * MyTeamSection Component
 *
 * Collaborative team tools: Sprints, Standups, and Surveys/Quizzes/Assessments.
 * Admins also see a "Create Survey" shortcut.
 */

import { Link, useLocation } from 'react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Users,
  CalendarClock,
  MessageSquare,
  ClipboardList,
  Plus,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MyTeamSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
}

export function MyTeamSection({ isExpanded, onToggle, isAdmin }: MyTeamSectionProps) {
  const location = useLocation();

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
        <Users className="w-4 h-4 text-sky-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">MY TEAM</span>
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          <TeamLink to="/sprints" icon={CalendarClock} pathname={location.pathname}>
            Sprints
          </TeamLink>
          <TeamLink to="/standups" icon={MessageSquare} pathname={location.pathname}>
            Standups
          </TeamLink>
          <TeamLink to="/surveys" icon={ClipboardList} pathname={location.pathname}>
            Surveys &amp; Quizzes
          </TeamLink>
          {isAdmin && (
            <TeamLink to="/surveys/create" icon={Plus} pathname={location.pathname} activeColor="text-rose-700 bg-rose-50">
              Create Survey
            </TeamLink>
          )}
        </div>
      )}
    </div>
  );
}

function TeamLink({
  to,
  icon: Icon,
  pathname,
  children,
  activeColor = 'bg-indigo-50 text-indigo-700',
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  children: ReactNode;
  activeColor?: string;
}) {
  const isActive = pathname === to || pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
        isActive && activeColor
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </Link>
  );
}
