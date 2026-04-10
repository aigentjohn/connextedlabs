import { Link, useLocation } from 'react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Briefcase,
  Building2,
  Users,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MyBusinessSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  ownedCount: number;
  memberCount: number;
}

export function MyBusinessSection({
  isExpanded,
  onToggle,
  ownedCount,
  memberCount,
}: MyBusinessSectionProps) {
  const location = useLocation();
  const totalCount = ownedCount + memberCount;

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
        <Briefcase className="w-4 h-4 text-indigo-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">MY BUSINESS</span>
        {totalCount > 0 && <span className="text-xs text-gray-500">({totalCount})</span>}
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          <SideLink to="/markets/all-companies" icon={Building2} pathname={location.pathname} match="startsWith">
            All Companies
          </SideLink>
          <SideLink to="/my-ventures" icon={Briefcase} pathname={location.pathname} count={ownedCount} match="startsWith">
            My Ventures
          </SideLink>
          <SideLink to="/my-companies" icon={Users} pathname={location.pathname} count={memberCount} match="startsWith">
            My Companies
          </SideLink>
          <SideLink to="/company-companions" icon={LayoutGrid} pathname={location.pathname} match="startsWith">
            Company Companions
          </SideLink>
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
      {count !== undefined && count > 0 && (
        <span className="text-xs text-gray-500">({count})</span>
      )}
    </Link>
  );
}
