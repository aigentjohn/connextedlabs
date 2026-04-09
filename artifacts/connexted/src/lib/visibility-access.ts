/**
 * visibility-access.ts — Single source of truth for container/content access rules.
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────
 * All container types share the same three fields:
 *   visibility  : 'public' | 'member' | 'unlisted' | 'private'
 *   member_ids  : string[]
 *   admin_ids   : string[]
 *
 * The VISIBILITY_RULES config below controls two behavioural knobs
 * per container type.  Changing a knob here propagates everywhere
 * automatically — no component edits needed.
 *
 * KNOBS
 * ─────────────────────────────────────────────────────────────────
 * unlistedPassesListFilter
 *   true  → 'unlisted' records appear in browse lists (anyone with the
 *            URL can also view the detail page)
 *   false → 'unlisted' records are hidden from lists but viewable by
 *            direct URL (detail page still passes)
 *
 * memberRequiresTier
 *   false → 'member' visibility means the user must be in member_ids
 *            (standard container behaviour)
 *   true  → 'member' visibility means the user's membership_tier must
 *            be non-free (content / program behaviour)
 *
 * NAMING RULES (do not change)
 * ─────────────────────────────────────────────────────────────────
 * - Visibility canonical values: 'public' | 'member' | 'unlisted' | 'private'
 * - Field name is always `visibility` on every table
 * - `member` is the mid-tier value (NOT 'members-only' or 'community')
 * - `pricing_type: 'members-only'` is intentionally kept as-is (enrollment cost, not visibility)
 */

import type { Role, MembershipTier } from '@/lib/constants/roles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Visibility = 'public' | 'member' | 'unlisted' | 'private';

export interface AccessRecord {
  visibility?: Visibility | string | null;
  member_ids?: string[] | null;
  admin_ids?: string[] | null;
  created_by?: string | null;
}

export interface AccessProfile {
  id: string;
  role: Role;
  membership_tier: MembershipTier;
}

// ─── Per-type rule config ─────────────────────────────────────────────────────

interface VisibilityRule {
  /** Does 'unlisted' show up in list/browse pages? (always viewable via direct URL) */
  unlistedPassesListFilter: boolean;
  /** Does 'member' check membership_tier instead of member_ids? */
  memberRequiresTier: boolean;
}

/**
 * Edit this table to change behaviour for any container or content type.
 * Key is the DB table name (plural). Falls back to 'default' if not found.
 */
export const VISIBILITY_RULES: Record<string, VisibilityRule> = {
  // ── Default (covers most containers) ──────────────────────────
  // 'unlisted' shown in lists; 'member' requires member_ids entry
  default:    { unlistedPassesListFilter: true,  memberRequiresTier: false },

  // ── Containers with same-as-default rules (explicit for clarity) ──
  tables:     { unlistedPassesListFilter: true,  memberRequiresTier: false },
  elevators:  { unlistedPassesListFilter: true,  memberRequiresTier: false },
  meetings:   { unlistedPassesListFilter: true,  memberRequiresTier: false },
  meetups:    { unlistedPassesListFilter: true,  memberRequiresTier: false },
  standups:   { unlistedPassesListFilter: true,  memberRequiresTier: false },
  sprints:    { unlistedPassesListFilter: true,  memberRequiresTier: false },
  libraries:  { unlistedPassesListFilter: true,  memberRequiresTier: false },
  playlists:  { unlistedPassesListFilter: true,  memberRequiresTier: false },
  checklists: { unlistedPassesListFilter: true,  memberRequiresTier: false },
  prompts:    { unlistedPassesListFilter: true,  memberRequiresTier: false },
  circles:    { unlistedPassesListFilter: true,  memberRequiresTier: false },
  surveys:     { unlistedPassesListFilter: true,  memberRequiresTier: false },
  quizzes:     { unlistedPassesListFilter: true,  memberRequiresTier: false },
  assessments: { unlistedPassesListFilter: true,  memberRequiresTier: false },

  // ── Containers where 'unlisted' should NOT appear in browse lists ──
  // (e.g. builds/pitches are typically shared by direct link)
  builds:     { unlistedPassesListFilter: false, memberRequiresTier: false },
  pitches:    { unlistedPassesListFilter: false, memberRequiresTier: false },

  // ── Content types — 'member' means paid tier, not member_ids ──
  documents:  { unlistedPassesListFilter: false, memberRequiresTier: true  },
  events:     { unlistedPassesListFilter: false, memberRequiresTier: true  },
  posts:      { unlistedPassesListFilter: false, memberRequiresTier: true  },
  episodes:   { unlistedPassesListFilter: false, memberRequiresTier: true  },
  blogs:      { unlistedPassesListFilter: false, memberRequiresTier: true  },
  books:      { unlistedPassesListFilter: false, memberRequiresTier: true  },
  decks:      { unlistedPassesListFilter: false, memberRequiresTier: true  },
  reviews:    { unlistedPassesListFilter: false, memberRequiresTier: true  },
};

// ─── Core access helpers ──────────────────────────────────────────────────────

function getRule(containerType: string): VisibilityRule {
  return VISIBILITY_RULES[containerType] ?? VISIBILITY_RULES.default;
}

/**
 * canViewContainer — used in detail pages.
 * Returns true if this profile is allowed to see this specific record.
 *
 * @param profile        The current user's profile
 * @param record         The container/content record (needs visibility + member_ids)
 * @param containerType  DB table name, e.g. 'builds', 'tables', 'episodes'
 */
export function canViewContainer(
  profile: AccessProfile,
  record: AccessRecord,
  containerType = 'default',
): boolean {
  // Platform admins always have access
  if (profile.role === 'super' || profile.role === 'admin') return true;

  // Owners and admins always have access
  if (record.created_by === profile.id) return true;
  if (record.admin_ids?.includes(profile.id)) return true;

  const rule = getRule(containerType);
  const vis = (record.visibility ?? 'public') as Visibility;
  const isMember = record.member_ids?.includes(profile.id) ?? false;

  switch (vis) {
    case 'public':
      return true;

    case 'unlisted':
      // Unlisted is always viewable via direct URL (detail page)
      return true;

    case 'member':
      if (rule.memberRequiresTier) {
        return profile.membership_tier !== 'free';
      }
      return isMember;

    case 'private':
      return isMember;

    default:
      return false;
  }
}

/**
 * filterByVisibility — used in list/browse pages.
 * Returns only the records this profile is allowed to see in a list context.
 *
 * The key difference from canViewContainer: 'unlisted' records are hidden
 * from lists (controlled by unlistedPassesListFilter) but still accessible
 * by direct URL.
 *
 * @param records        Array of container/content records
 * @param profile        The current user's profile
 * @param containerType  DB table name, e.g. 'tables', 'builds'
 */
export function filterByVisibility<T extends AccessRecord>(
  records: T[],
  profile: AccessProfile,
  containerType = 'default',
): T[] {
  // Platform admins see everything
  if (profile.role === 'super' || profile.role === 'admin') return records;

  const rule = getRule(containerType);

  return records.filter((record) => {
    // Owners and admins always see their own records
    if (record.created_by === profile.id) return true;
    if (record.admin_ids?.includes(profile.id)) return true;

    const vis = (record.visibility ?? 'public') as Visibility;
    const isMember = record.member_ids?.includes(profile.id) ?? false;

    switch (vis) {
      case 'public':
        return true;

      case 'unlisted':
        // Config knob: show in lists or hide (still accessible via URL)
        return rule.unlistedPassesListFilter;

      case 'member':
        if (rule.memberRequiresTier) {
          return profile.membership_tier !== 'free';
        }
        return isMember;

      case 'private':
        return isMember;

      default:
        return false;
    }
  });
}

// ─── Discovery type list ──────────────────────────────────────────────────────

/**
 * DISCOVERABLE_CONTAINER_TYPES
 *
 * Container types that appear in ExplorePage and ExploreDialog.
 * Must have: name, description, visibility, member_ids, admin_ids.
 *
 * Excluded intentionally:
 *   - 'moments'    → posts table, different shape
 *   - 'magazines'  → uses is_public (boolean) not visibility field
 *   - 'programs'   → MY GROWTH section, own discovery page
 *   - 'courses'    → MY GROWTH section, own discovery page
 *   - 'circles'    → own sidebar section + CirclesPage
 */
export const DISCOVERABLE_CONTAINER_TYPES = [
  'tables',
  'elevators',
  'meetings',
  'pitches',
  'builds',
  'standups',
  'meetups',
  'sprints',
  'libraries',
  'playlists',
  'checklists',
] as const;

export type DiscoverableContainerType = typeof DISCOVERABLE_CONTAINER_TYPES[number];
