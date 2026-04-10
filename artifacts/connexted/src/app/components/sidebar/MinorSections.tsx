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
  LayoutGrid,
  Settings,
  Building2,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { CONTENT_TAXONOMY } from '@/lib/taxonomy';

// ─── SPONSORS ────────────────────────────────────────────────────────────────

interface SponsorsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  sponsorCount: number;
  myMemberships: any[];
  isPlatformAdmin: boolean;
  allSponsors: any[];
}

export function SponsorsSection({
  isExpanded, onToggle, sponsorCount, isPlatformAdmin, allSponsors, myMemberships,
}: SponsorsSectionProps) {
  const location = useLocation();

  const canManageSponsor = (sponsorId: string) => {
    if (isPlatformAdmin) return true;
    const membership = myMemberships.find((m: any) => m.sponsor_id === sponsorId);
    return membership && ['owner', 'admin', 'director'].includes(membership.role);
  };

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
        <div className="ml-3 mt-0.5 space-y-0.5">

          {/* View All */}
          <Link
            to="/sponsors"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
              location.pathname === '/sponsors' && 'bg-indigo-50 text-indigo-700'
            )}
          >
            <Star className="w-4 h-4 text-yellow-500" />
            <span>View All Sponsors</span>
          </Link>

          {/* All sponsors — visible to everyone */}
          {allSponsors.map((s: any) => {
            const isActive = location.pathname.startsWith(`/sponsors/${s.slug}`);
            const canManage = canManageSponsor(s.id);
            return (
              <div key={s.id}>
                <Link
                  to={`/sponsors/${s.slug}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                    isActive && 'bg-indigo-50 text-indigo-700'
                  )}
                >
                  <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="flex-1 truncate">{s.name}</span>
                </Link>
                <div className="ml-6 space-y-0.5 pb-0.5">
                  <Link
                    to={`/sponsors/${s.slug}/companion`}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1 text-xs rounded-lg hover:bg-gray-100 transition-colors text-gray-600',
                      location.pathname === `/sponsors/${s.slug}/companion` && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    Companion
                  </Link>
                  {canManage && (
                    <Link
                      to={`/sponsor/${s.slug}/manage`}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1 text-xs rounded-lg hover:bg-gray-100 transition-colors text-gray-600',
                        location.pathname === `/sponsor/${s.slug}/manage` && 'bg-indigo-50 text-indigo-700'
                      )}
                    >
                      <Settings className="w-3 h-3" />
                      Manage
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

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

// ─── COMPANIES ───────────────────────────────────────────────────────────────

interface CompaniesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  myCompanies: any[];
  isPlatformAdmin: boolean;
}

export function CompaniesSection({ isExpanded, onToggle, myCompanies, isPlatformAdmin }: CompaniesSectionProps) {
  const location = useLocation();

  if (myCompanies.length === 0 && !isPlatformAdmin) return null;

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
        <Briefcase className="w-4 h-4 text-indigo-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">MY COMPANIES</span>
        {myCompanies.length > 0 && <span className="text-xs text-gray-500">({myCompanies.length})</span>}
      </button>

      {isExpanded && (
        <div className="ml-3 mt-0.5 space-y-0.5">
          {/* Browse all companies */}
          <Link
            to="/markets/all-companies"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
              location.pathname === '/markets/all-companies' && 'bg-indigo-50 text-indigo-700'
            )}
          >
            <Building2 className="w-4 h-4 text-gray-400" />
            <span>All Companies</span>
          </Link>

          {myCompanies.map((c: any) => {
            const isActive = location.pathname.startsWith(`/markets/companies/${c.slug}`);
            const isOwner = c.owner_user_id !== undefined; // always true if we got it
            return (
              <div key={c.id}>
                <Link
                  to={`/markets/companies/${c.slug}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                    isActive && 'bg-indigo-50 text-indigo-700'
                  )}
                >
                  <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="flex-1 truncate">{c.name}</span>
                </Link>
                <div className="ml-6 space-y-0.5 pb-0.5">
                  <Link
                    to={`/markets/companies/${c.slug}/companion`}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1 text-xs rounded-lg hover:bg-gray-100 transition-colors text-gray-600',
                      location.pathname === `/markets/companies/${c.slug}/companion` && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    Companion
                  </Link>
                  <Link
                    to={`/markets/edit-company/${c.id}`}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1 text-xs rounded-lg hover:bg-gray-100 transition-colors text-gray-600',
                      location.pathname === `/markets/edit-company/${c.id}` && 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <Settings className="w-3 h-3" />
                    Manage
                  </Link>
                </div>
              </div>
            );
          })}

          {myCompanies.length === 0 && (
            <div className="px-3 py-1.5 text-sm text-gray-500 italic">No companies yet</div>
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