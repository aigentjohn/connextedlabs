/**
 * Minor Sidebar Sections
 *
 * Sponsors, Common Circles, and Common Content sections.
 *
 * COMMON CONTENT = standalone platform-level artefacts:
 *   Blogs, Episodes, Documents, Books, Decks, Reviews
 *
 * NOT here: Posts (feed), Forums, Events — these are circle-scoped elements.
 * NOT here: Playlists (→ Episodes), Magazines (→ Blogs) — containers, live in COMMON ACTIVITIES.
 *
 * Source of truth: /src/lib/taxonomy.ts › CONTENT_TAXONOMY
 */

import { Link, useLocation } from 'react-router';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Star,
  Users2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { CONTENT_TAXONOMY } from '@/lib/taxonomy';

// ─── SPONSORS ────────────────────────────────────────────────────────────────

interface SponsorsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  sponsorCount: number;
}

export function SponsorsSection({ isExpanded, onToggle, sponsorCount }: SponsorsSectionProps) {
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
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        <Sparkles className="w-4 h-4 text-yellow-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">SPONSORS</span>
        <span className="text-xs text-gray-500">({sponsorCount})</span>
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          <Link
            to="/sponsors"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
              location.pathname === '/sponsors' && 'bg-indigo-50 text-indigo-700'
            )}
          >
            <Star className="w-4 h-4 text-yellow-500" />
            <span>View All Sponsors</span>
            <span className="text-xs text-gray-500">({sponsorCount})</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── CIRCLES ─────────────────────────────────────────────────────────────────

interface CirclesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  circles: any[];
}

export function CirclesSection({ isExpanded, onToggle, circles }: CirclesSectionProps) {
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
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        <Users2 className="w-4 h-4 text-indigo-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">COMMON CIRCLES</span>
        {circles.length > 0 && <span className="text-xs text-gray-500">({circles.length})</span>}
      </button>

      {isExpanded && (
        <div className="ml-3 mt-1 space-y-0.5">
          {circles.map((circle: any) => (
            <Link
              key={circle.id}
              to={`/circles/${circle.id}`}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname === `/circles/${circle.id}` && 'bg-indigo-50 text-indigo-700'
              )}
            >
              <span className="flex-1 truncate">
                {circle.is_open_circle ? '📢 ' : ''}{circle.name}
              </span>
            </Link>
          ))}

          {circles.length === 0 && (
            <div className="px-3 py-1.5 text-sm text-gray-500 italic">No circles yet</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CONTENT — standalone artefacts ──────────────────────────────────────────

interface ContentSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  getActivityCount: (activityType: string) => number;
}

export function ContentSection({ isExpanded, onToggle, getActivityCount }: ContentSectionProps) {
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
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        <MessageSquare className="w-4 h-4 text-orange-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">COMMON CONTENT</span>
      </button>

      {isExpanded && (
        <div className="ml-3 mt-1 space-y-0.5">
          {[...CONTENT_TAXONOMY]
            .sort((a, b) => a.labelPlural.localeCompare(b.labelPlural))
            .map((entry) => {
              const Icon = entry.icon;
              const count = getActivityCount(entry.key);
              const isActive =
                location.pathname === entry.path ||
                location.pathname.startsWith(entry.path + '/');

              return (
                <Link
                  key={entry.key}
                  to={entry.path}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                    isActive && 'bg-indigo-50 text-indigo-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{entry.labelPlural}</span>
                  {count > 0 && <span className="text-xs text-gray-500">({count})</span>}
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}