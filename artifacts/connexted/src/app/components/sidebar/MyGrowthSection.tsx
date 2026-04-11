/**
 * MyGrowthSection Component
 *
 * Bundles learning, achievement, discovery, and active profile tools:
 * Courses, Programs, Growth pathways, Badges, Moments, Portfolio,
 * Discover Content, and Explore Activities.
 */

import { Link, useLocation } from 'react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  GraduationCap,
  FolderKanban,
  Award,
  Zap,
  Briefcase,
  Compass,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MyGrowthSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  profileId?: string;
}

export function MyGrowthSection({ isExpanded, onToggle, profileId }: MyGrowthSectionProps) {
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
        <TrendingUp className="w-4 h-4 text-emerald-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">MY GROWTH</span>
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {/* Learning */}
          <GrowthLink to="/my-courses" icon={GraduationCap} pathname={location.pathname}>
            My Courses
          </GrowthLink>
          <GrowthLink to="/my-programs" icon={FolderKanban} pathname={location.pathname}>
            My Programs
          </GrowthLink>

          {/* Achievement */}
          <GrowthLink to="/browse-pathways" icon={Compass} pathname={location.pathname}>
            Browse Pathways
          </GrowthLink>
          <GrowthLink to="/my-growth" icon={TrendingUp} pathname={location.pathname}>
            My Pathways
          </GrowthLink>
          <GrowthLink to="/profile/badges" icon={Award} pathname={location.pathname}>
            My Badges
          </GrowthLink>

          {/* Active Profile */}
          <GrowthLink
            to={profileId ? `/moments/${profileId}` : '/moments'}
            icon={Zap}
            pathname={location.pathname}
            match="includes"
            matchPath="/moments"
          >
            My Moments
          </GrowthLink>
          <GrowthLink
            to={profileId ? `/portfolio/${profileId}` : '/portfolio'}
            icon={Briefcase}
            pathname={location.pathname}
            match="includes"
            matchPath="/portfolio"
          >
            My Portfolio
          </GrowthLink>
        </div>
      )}
    </div>
  );
}

/** Lightweight nav link with active state detection */
function GrowthLink({
  to,
  icon: Icon,
  pathname,
  children,
  match = 'exact',
  matchPath,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  children: ReactNode;
  match?: 'exact' | 'startsWith' | 'includes';
  matchPath?: string;
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
      <span>{children}</span>
    </Link>
  );
}