/**
 * SetupSection Component
 *
 * Admin navigation: My Admin, Circle Admin, Program Admin, Platform Admin, etc.
 * Only renders for users with admin-level access.
 */

import { Link, useLocation } from 'react-router';
import {
  ChevronDown,
  ChevronRight,
  Settings,
  Shield,
  Users,
  FolderKanban,
  GraduationCap,
  Compass,
  Library,
  Store,
  Building2,
  Ticket,
  Award,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/components/ui/utils';
import { formatRole } from '@/lib/user-class-utils';

interface SetupSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  profile: any;
  hasRole: (requiredRole: string) => boolean;
  adminCounts: {
    circles: number;
    programs: number;
    tables: number;
    elevators: number;
    meetings: number;
    pitches: number;
    builds: number;
    standups: number;
    meetups: number;
    sprints: number;
  };
}

export function SetupSection({
  isExpanded,
  onToggle,
  profile,
  hasRole,
  adminCounts,
}: SetupSectionProps) {
  const location = useLocation();

  const hasAnyAdminAccess =
    hasRole('admin') ||
    adminCounts.circles > 0 ||
    adminCounts.tables > 0 ||
    adminCounts.elevators > 0 ||
    adminCounts.meetings > 0 ||
    adminCounts.pitches > 0 ||
    adminCounts.builds > 0 ||
    adminCounts.standups > 0 ||
    adminCounts.meetups > 0 ||
    adminCounts.sprints > 0 ||
    adminCounts.programs > 0;

  if (!hasAnyAdminAccess) return null;

  const containerAdminTotal =
    adminCounts.tables +
    adminCounts.elevators +
    adminCounts.meetings +
    adminCounts.pitches +
    adminCounts.builds +
    adminCounts.standups +
    adminCounts.meetups +
    adminCounts.sprints;

  const showMyAdmin =
    profile?.role === 'admin' ||
    profile?.role === 'super' ||
    containerAdminTotal > 0;

  const showCircleAdmin =
    profile?.role === 'admin' ||
    profile?.role === 'super' ||
    adminCounts.circles > 0;

  const showProgramAdmin =
    profile?.role === 'admin' ||
    profile?.role === 'super' ||
    adminCounts.circles > 0 ||
    adminCounts.programs > 0;

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
        <Settings className="w-4 h-4 text-gray-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">SETUP</span>
        {profile && (
          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
            {formatRole(profile.role)}
          </Badge>
        )}
      </button>

      {isExpanded && (
        <div className="ml-3 mt-1 space-y-0.5">
          {/* My Admin */}
          {showMyAdmin && (
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname === '/admin' && 'bg-orange-50 text-orange-700'
              )}
            >
              <Settings className="w-4 h-4 text-orange-600" />
              <span className="flex-1">My Admin</span>
              <span className="text-xs text-gray-500">({containerAdminTotal})</span>
            </Link>
          )}

          {/* Circle Admin */}
          {showCircleAdmin && (
            <Link
              to="/circle-admin"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname.startsWith('/circle-admin') && 'bg-indigo-50 text-indigo-700'
              )}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="flex-1">Circle Admin</span>
              {adminCounts.circles > 0 && (
                <span className="text-xs text-gray-500">({adminCounts.circles})</span>
              )}
            </Link>
          )}

          {/* Program Admin */}
          {showProgramAdmin && (
            <Link
              to="/program-admin"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname.startsWith('/program-admin') && 'bg-blue-50 text-blue-700'
              )}
            >
              <FolderKanban className="w-4 h-4 text-blue-600" />
              <span className="flex-1">Program Admin</span>
            </Link>
          )}

          {/* Course Admin */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin/courses"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname.startsWith('/platform-admin/courses') && 'bg-purple-50 text-purple-700'
              )}
            >
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span className="flex-1">Course Admin</span>
            </Link>
          )}

          {/* Pathways Admin */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin/pathways"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname === '/platform-admin/pathways' && 'bg-indigo-50 text-indigo-700'
              )}
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              <span className="flex-1">Pathways Admin</span>
            </Link>
          )}

          {/* Badge Admin */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin/badge-admin"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname.startsWith('/platform-admin/badge-admin') && 'bg-yellow-50 text-yellow-700'
              )}
            >
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="flex-1">Badge Admin</span>
            </Link>
          )}

          {/* Ticket Admin */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin/ticket-templates"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                (location.pathname.startsWith('/platform-admin/ticket-templates') || location.pathname.startsWith('/platform-admin/ticket-inventory')) && 'bg-emerald-50 text-emerald-700'
              )}
            >
              <Ticket className="w-4 h-4 text-emerald-600" />
              <span className="flex-1">Ticket Admin</span>
            </Link>
          )}

          {/* Kit Commerce */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin/kit-commerce"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname.startsWith('/platform-admin/kit-commerce') && 'bg-green-50 text-green-700'
              )}
            >
              <Store className="w-4 h-4 text-green-600" />
              <span className="flex-1">Kit Commerce</span>
            </Link>
          )}

          {/* Platform Admin */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname.startsWith('/platform-admin') && !location.pathname.includes('/pathways') && !location.pathname.includes('/courses') && !location.pathname.includes('/ticket') && 'bg-purple-50 text-purple-700'
              )}
            >
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="flex-1">Platform Admin</span>
            </Link>
          )}

          {/* Link Library Admin - Super admins only */}
          {profile?.role === 'super' && (
            <Link
              to="/platform-admin/links"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname.startsWith('/platform-admin/links') && 'bg-emerald-50 text-emerald-700'
              )}
            >
              <Library className="w-4 h-4 text-emerald-600" />
              <span className="flex-1">Link Library</span>
            </Link>
          )}

          {/* Market Admin */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin/markets"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname === '/platform-admin/markets' && 'bg-purple-50 text-purple-700'
              )}
            >
              <Store className="w-4 h-4 text-purple-600" />
              <span className="flex-1">Market Admin</span>
            </Link>
          )}

          {/* Companies Admin */}
          {hasRole('admin') && (
            <Link
              to="/platform-admin/companies"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname === '/platform-admin/companies' && 'bg-purple-50 text-purple-700'
              )}
            >
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="flex-1">Companies Admin</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}