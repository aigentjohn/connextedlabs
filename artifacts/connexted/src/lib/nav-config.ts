/**
 * nav-config.ts — Single source of truth for which items appear in the
 * primary navigation per user class tier.
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────
 * Each entry declares:
 *   min_class   Minimum user_class required to see this item.
 *               0 = every logged-in user (home, news, circles, calendar).
 *               Roles 'admin' and 'super' bypass min_class and see everything.
 *   sort_order  Position in the nav. Fractional values preserve insertion
 *               order without renumbering neighbours.
 *
 * USER CLASS TIERS (as currently defined in migrations)
 * ─────────────────────────────────────────────────────────────────
 *   0   → all users (basic/guest)
 *   3   → member
 *   7   → premium
 *  10   → unlimited / all containers
 *
 * TO ADD A NEW NAV ITEM
 * ─────────────────────────────────────────────────────────────────
 * 1. Add one row here with the correct min_class and sort_order.
 * 2. Done — getDefaultContainers in auth-context derives from this table
 *    automatically.  No other files need editing for the fallback behaviour.
 *
 * NOTE: icon_name is a string key that matches a Lucide icon name.
 * The nav renderer maps it to the actual component at runtime.
 *
 * NAMING RULES (do not change)
 * ─────────────────────────────────────────────────────────────────
 * - `circle` code identifier must never be renamed (UI says "group").
 * - `member` (not 'members-only' or 'community') is the mid-tier visibility value.
 */

export interface NavItemConfig {
  type_code: string;
  display_name: string;
  icon_name: string;
  route_path: string;
  sort_order: number;
  /**
   * Minimum user_class to see this item.
   * 0 = every authenticated user.
   * Roles 'admin' and 'super' always see every item.
   */
  min_class: number;
}

/**
 * NAV_ITEMS_CONFIG
 *
 * Edit this table — and only this table — to change which containers
 * appear at which membership tier in the sidebar navigation fallback.
 *
 * The DB table `user_class_permissions` overrides this at runtime when
 * migrations have been applied; this list is the in-code fallback.
 */
export const NAV_ITEMS_CONFIG: NavItemConfig[] = [
  // ── Universal (all authenticated users) ───────────────────────
  { type_code: 'home',       display_name: 'Home',       icon_name: 'Home',          route_path: '/',           sort_order: 1,    min_class: 0  },
  { type_code: 'news',       display_name: 'News',       icon_name: 'Newspaper',     route_path: '/news',       sort_order: 2,    min_class: 0  },
  { type_code: 'circles',    display_name: 'Circles',    icon_name: 'Users',         route_path: '/circles',    sort_order: 3,    min_class: 0  },
  { type_code: 'calendar',   display_name: 'Calendar',   icon_name: 'Calendar',      route_path: '/calendar',   sort_order: 14,   min_class: 0  },

  // ── Member tier (class 3+) ────────────────────────────────────
  { type_code: 'tables',     display_name: 'Tables',     icon_name: 'Library',       route_path: '/tables',     sort_order: 4,    min_class: 3  },
  { type_code: 'meetings',   display_name: 'Meetings',   icon_name: 'Video',         route_path: '/meetings',   sort_order: 6,    min_class: 3  },
  { type_code: 'libraries',  display_name: 'Libraries',  icon_name: 'BookOpen',      route_path: '/libraries',  sort_order: 11,   min_class: 3  },
  { type_code: 'checklists', display_name: 'Checklists', icon_name: 'CheckSquare',   route_path: '/checklists', sort_order: 12,   min_class: 3  },

  // ── Premium tier (class 7+) ───────────────────────────────────
  { type_code: 'standups',   display_name: 'Standups',   icon_name: 'MessageSquare', route_path: '/standups',   sort_order: 9,    min_class: 7  },
  { type_code: 'sprints',    display_name: 'Sprints',    icon_name: 'Zap',           route_path: '/sprints',    sort_order: 13,   min_class: 7  },
  { type_code: 'prompts',    display_name: 'Prompts',    icon_name: 'Sparkles',      route_path: '/prompts',    sort_order: 13.5, min_class: 7  },

  // ── Unlimited tier (class 10+) ────────────────────────────────
  { type_code: 'elevators',  display_name: 'Elevators',  icon_name: 'TrendingUp',    route_path: '/elevators',  sort_order: 5,    min_class: 10 },
  { type_code: 'pitches',    display_name: 'Pitches',    icon_name: 'Presentation',  route_path: '/pitches',    sort_order: 7,    min_class: 10 },
  { type_code: 'builds',     display_name: 'Builds',     icon_name: 'Hammer',        route_path: '/builds',     sort_order: 8,    min_class: 10 },
  { type_code: 'meetups',    display_name: 'Meetups',    icon_name: 'Users2',        route_path: '/meetups',    sort_order: 10,   min_class: 10 },
  { type_code: 'magazines',  display_name: 'Magazines',  icon_name: 'BookCopy',      route_path: '/magazines',  sort_order: 10.1, min_class: 10 },
  { type_code: 'playlists',  display_name: 'Playlists',  icon_name: 'ListVideo',     route_path: '/playlists',  sort_order: 10.2, min_class: 10 },
];

/**
 * Derive the ContainerPermission list for a given user class + role.
 * Filters NAV_ITEMS_CONFIG by min_class threshold (admins bypass).
 * Returns items sorted by sort_order.
 */
export function getNavItemsForUser(
  userClass: number,
  role: string,
): NavItemConfig[] {
  const isAdmin = role === 'admin' || role === 'super';
  return NAV_ITEMS_CONFIG
    .filter(item => isAdmin || userClass >= item.min_class)
    .sort((a, b) => a.sort_order - b.sort_order);
}
