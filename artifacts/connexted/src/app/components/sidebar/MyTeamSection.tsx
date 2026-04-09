/**
 * MyTeamSection Component
 *
 * Collaborative team tools: Sprints, Standups, Surveys, Quizzes, Assessments.
 * Admins see a "Create" shortcut beneath each of the three survey-type entries.
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
  Brain,
  BarChart3,
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
          {/* Sprints */}
          <TeamLink to="/sprints" icon={CalendarClock} pathname={location.pathname}>
            Sprints
          </TeamLink>

          {/* Standups */}
          <TeamLink to="/standups" icon={MessageSquare} pathname={location.pathname}>
            Standups
          </TeamLink>

          {/* Surveys */}
          <TeamLink to="/surveys" icon={ClipboardList} pathname={location.pathname}>
            Surveys
          </TeamLink>
          {isAdmin && (
            <AdminLink to="/surveys/create" pathname={location.pathname}>
              + New Survey
            </AdminLink>
          )}

          {/* Quizzes */}
          <TeamLink to="/quizzes" icon={Brain} pathname={location.pathname}>
            Quizzes
          </TeamLink>
          {isAdmin && (
            <AdminLink to="/quizzes/create" pathname={location.pathname}>
              + New Quiz
            </AdminLink>
          )}

          {/* Assessments */}
          <TeamLink to="/assessments" icon={BarChart3} pathname={location.pathname}>
            Assessments
          </TeamLink>
          {isAdmin && (
            <AdminLink to="/assessments/create" pathname={location.pathname}>
              + New Assessment
            </AdminLink>
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
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  children: ReactNode;
}) {
  // Active if on the browse page or any sub-page, but not on a sibling's sub-page
  const isActive = pathname === to || (
    pathname.startsWith(to + '/') &&
    !pathname.startsWith(to + '/create') // don't highlight browse when on create
  );

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
        isActive && 'bg-indigo-50 text-indigo-700'
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </Link>
  );
}

function AdminLink({ to, pathname, children }: { to: string; pathname: string; children: ReactNode }) {
  const isActive = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-1.5 pl-9 pr-3 py-1 text-xs rounded-lg hover:bg-gray-100 transition-colors text-gray-500',
        isActive && 'bg-rose-50 text-rose-600'
      )}
    >
      <Plus className="w-3 h-3" />
      <span>{children}</span>
    </Link>
  );
}
