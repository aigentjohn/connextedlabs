/**
 * visibility-access.ts — Single source of truth for container/content access rules.
 *
 * TWO-LEVEL CONTENT ACCESS CHECK
 * ─────────────────────────────────────────────────────────────────
 * Content types (blogs, episodes, documents, posts, books, decks, reviews)
 * go through TWO sequential gates before a user can view them:
 *
 *   Gate 1 — Class gate (platform admin controls via the permissions matrix):
 *     profile.permitted_types.includes(contentType)
 *     If this fails the user cannot access the content regardless of visibility.
 *
 *   Gate 2 — Visibility check (applied only when gate 1 passes):
 *     public   → anyone (who passed gate 1) can view
 *     premium  → TODO Phase 2: check journey/course enrollment (stub returns false)
 *     private  → creator only
 *
 * CONTAINER TYPES (tables, elevators, meetings, pitches, builds, standups,
 *                  sprints, meetups, playlists, libraries, checklists)
 * These do NOT go through the class gate.  Visibility works as:
 *     public   → anyone can view
 *     member   → user must be in member_ids
 *     private  → creator/admin only
 *
 * NAMING RULES (do not change)
 * ─────────────────────────────────────────────────────────────────
 * - Visibility canonical values for content:   'public' | 'premium' | 'private'
 * - Visibility canonical values for containers:'public' | 'member'  | 'private'
 * - Field name is always `visibility` on every table
 * - `member` is the container mid-tier value (NOT 'members-only' or 'community')
 * - `premium` is the content mid-tier value (gated behind journey enrollment)
 * - `pricing_type: 'members-only'` is intentionally kept as-is (enrollment cost,
 *   not visibility)
 */

import type { Role } from '@/lib/constants/roles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Visibility = 'public' | 'member' | 'premium' | 'private';

export interface AccessRecord {
  visibility?: Visibility | string | null;
  member_ids?: string[] | null;
  admin_ids?: string[] | null;
  created_by?: string | null;
}

export interface AccessProfile {
  id: string;
  role: Role;
  /**
   * Platform feature access level (1–10).
   * Stored on the user record; drives which nav items and containers are visible.
   */
  user_class: number;
  /**
   * All type codes this user's class can access, loaded from user_class_permissions.
   * Covers both container types (tables, meetings, …) and content types
   * (documents, episodes, books, …).
   * Populated from userPermissions.permitted_types in auth-context.
   * Use this for the content class gate — do NOT use membership_tier.
   */
  permitted_types: string[];
}

// ─── Per-type rule config ─────────────────────────────────────────────────────

interface VisibilityRule {
  /**
   * true  → this is a content type; the two-level access check applies:
   *         first check permitted_types (class gate), then check visibility.
   * false → this is a container type; only visibility + member_ids are checked.
   */
  isContent: boolean;
}

/**
 * Edit this table to change behaviour for any container or content type.
 * Key is the DB table name (plural). Falls back to 'default' if not found.
 */
export const VISIBILITY_RULES: Record<string, VisibilityRule> = {
  // ── Default (covers most containers) ──────────────────────────
  default:    { isContent: false },

  // ── Containers (explicit for clarity) ─────────────────────────
  tables:     { isContent: false },
  elevators:  { isContent: false },
  meetings:   { isContent: false },
  meetups:    { isContent: false },
  standups:   { isContent: false },
  sprints:    { isContent: false },
  libraries:  { isContent: false },
  playlists:  { isContent: false },
  checklists: { isContent: false },
  prompts:    { isContent: false },
  circles:    { isContent: false },
  builds:     { isContent: false },
  pitches:    { isContent: false },

  // ── Content types — two-level access applies ───────────────────
  documents:  { isContent: true },
  events:     { isContent: true },
  posts:      { isContent: true },
  episodes:   { isContent: true },
  blogs:      { isContent: true },
  books:      { isContent: true },
  decks:      { isContent: true },
  reviews:    { isContent: true },
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

  if (rule.isContent) {
    // Gate 1 — class gate: does this user's class allow this content type?
    if (!profile.permitted_types.includes(containerType)) return false;

    // Gate 2 — visibility check
    switch (vis) {
      case 'public':  return true;
      case 'premium': return false; // TODO Phase 2: check journey enrollment
      case 'private': return false;
      default:        return false;
    }
  }

  // Container path
  const isMember = record.member_ids?.includes(profile.id) ?? false;

  switch (vis) {
    case 'public':  return true;
    case 'member':  return isMember;
    case 'private': return false;
    default:        return false;
  }
}

/**
 * filterByVisibility — used in list/browse pages.
 * Returns only the records this profile is allowed to see in a list context.
 *
 * For content types: applies the two-level check (class gate + visibility).
 * For container types: applies public/member/private rules using member_ids.
 *
 * @param records        Array of container/content records
 * @param profile        The current user's profile
 * @param containerType  DB table name, e.g. 'tables', 'builds', 'episodes'
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

    if (rule.isContent) {
      // Gate 1 — class gate
      if (!profile.permitted_types.includes(containerType)) return false;

      // Gate 2 — visibility check
      switch (vis) {
        case 'public':  return true;
        case 'premium': return false; // TODO Phase 2: check journey enrollment
        case 'private': return false;
        default:        return false;
      }
    }

    // Container path
    const isMember = record.member_ids?.includes(profile.id) ?? false;

    switch (vis) {
      case 'public':  return true;
      case 'member':  return isMember;
      case 'private': return false;
      default:        return false;
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
