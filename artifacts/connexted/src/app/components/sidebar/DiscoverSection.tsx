/**
 * DiscoverSection Component
 *
 * Groups all content-finding tools in one place:
 *   Explore      — browse and join containers by type
 *   Topics       — browse the structured topic taxonomy
 *   Following    — activity feed from people + tag/topic subscriptions
 *   My Favorites — containers and content the user has bookmarked
 *
 * Search will be added here in Phase 3.
 */

import { Link, useLocation } from 'react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Sparkles,
  Tag,
  Hash,
  Star,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface DiscoverSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  favoritesCount?: number;
}

export function DiscoverSection({
  isExpanded,
  onToggle,
  favoritesCount,
}: DiscoverSectionProps) {
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
        <Compass className="w-4 h-4 text-sky-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">DISCOVER</span>
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          <DiscoverLink to="/explore" icon={Sparkles} pathname={location.pathname}>
            Explore
          </DiscoverLink>
          <DiscoverLink to="/topics" icon={Tag} pathname={location.pathname} match="startsWith">
            Topics
          </DiscoverLink>
          <DiscoverLink to="/discovery" icon={Hash} pathname={location.pathname} match="startsWith">
            Following Feed
          </DiscoverLink>
          <Link
            to="/my-content"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
              location.pathname === '/my-content' && 'bg-indigo-50 text-indigo-700'
            )}
          >
            <Star className="w-4 h-4" />
            <span>My Favorites</span>
            {favoritesCount !== undefined && favoritesCount > 0 && (
              <span className="text-xs text-gray-500">({favoritesCount})</span>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}

function DiscoverLink({
  to,
  icon: Icon,
  pathname,
  children,
  match = 'exact',
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  children: ReactNode;
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
      <span>{children}</span>
    </Link>
  );
}
