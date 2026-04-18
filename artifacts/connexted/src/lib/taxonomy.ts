/**
 * taxonomy.ts — Single source of truth for the Connexted content/container split.
 *
 * RULE: Containers HOLD other things or have members/participants.
 *       Content is atomic/standalone — individual artefacts that get created and browsed.
 *
 * CONTAINERS (COMMON ACTIVITIES sidebar, Activities header dropdown)
 * ─────────────────────────────────────────────────────────────────
 * These are collaborative spaces users JOIN or that AGGREGATE other items:
 *   - Playlists   → contain Episodes
 *   - Magazines   → contain Blogs
 *   - Builds      → project workspace
 *   - Pitches     → pitch workspace
 *   - Checklists  → contain checklist items / tasks
 *   - Elevators, Tables, Meetings, Meetups, Sprints, Standups
 *
 * NOT containers here: Circles (own sidebar section), Programs/Courses (MY GROWTH).
 *
 * CONTENT (COMMON CONTENT sidebar)
 * ─────────────────────────────────────────────────────────────────
 * Standalone platform-level artefacts. Shown under COMMON CONTENT.
 *
 * NOT included: Posts (feed), Forums, Events — these are elements OF circles,
 * not independent content types. They exist within circle contexts.
 *
 * Episodes and Blogs are standalone content artefacts.
 * Their containers (Playlists → Episodes, Magazines → Blogs) live in CONTAINER_TAXONOMY.
 *
 * IMPORTANT NAMING RULES (do not change)
 * ─────────────────────────────────────────────────────────────────
 * - `circle` code identifier must never be renamed (UI says "group").
 * - DB `users` uses name / email / avatar.
 * - DB `notifications` uses link_url / link_type / link_id / actor_id.
 * - DB `episodes` uses `duration`.
 * - DB `posts` and `forum_threads` have NO likes or comments columns.
 */

import type { LucideIcon } from 'lucide-react';
import {
  // Containers
  TrendingUp,
  Table,
  Calendar,
  Handshake,
  CalendarClock,
  MessageSquare,
  ListVideo,
  BookCopy,
  Hammer,
  Presentation,
  CheckSquare,
  // Content
  PenTool,
  Video,
  FileText,
  BookOpen,
  Layers,
  Star,
  Calendar,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaxonomyEntry {
  /** Plural key — matches DB table name and URL segment (e.g. 'tables', 'builds') */
  key: string;
  label: string;
  labelPlural: string;
  icon: LucideIcon;
  /** Route prefix for the browse page */
  path: string;
}

// ─── CONTAINERS ──────────────────────────────────────────────────────────────
// Collaborative spaces / aggregators. Shown under COMMON ACTIVITIES.
// Order determines sidebar rendering order (matches original ActivitiesSection order).

export const CONTAINER_TAXONOMY: TaxonomyEntry[] = [
  { key: 'elevators',  label: 'Elevator',  labelPlural: 'Elevators',  icon: TrendingUp,    path: '/elevators'  },
  { key: 'tables',     label: 'Table',     labelPlural: 'Tables',     icon: Table,         path: '/tables'     },
  { key: 'builds',     label: 'Build',     labelPlural: 'Builds',     icon: Hammer,        path: '/builds'     },
  { key: 'pitches',    label: 'Pitch',     labelPlural: 'Pitches',    icon: Presentation,  path: '/pitches'    },
  { key: 'standups',   label: 'Standup',   labelPlural: 'Standups',   icon: MessageSquare, path: '/standups'   },
  { key: 'sprints',    label: 'Sprint',    labelPlural: 'Sprints',    icon: CalendarClock, path: '/sprints'    },
  { key: 'magazines',  label: 'Magazine',  labelPlural: 'Magazines',  icon: BookCopy,      path: '/magazines'  }, // containers of blogs
  { key: 'playlists',  label: 'Playlist',  labelPlural: 'Playlists',  icon: ListVideo,     path: '/playlists'  }, // containers of episodes
  { key: 'checklists', label: 'List',      labelPlural: 'Lists',       icon: CheckSquare,   path: '/checklists' },
  { key: 'meetings',   label: 'Meeting',   labelPlural: 'Meetings',   icon: Calendar,      path: '/meetings'   },
  { key: 'meetups',    label: 'Meetup',    labelPlural: 'Meetups',    icon: Handshake,     path: '/meetups'    },
];

/** Plural keys of all container types */
export const CONTAINER_KEYS = CONTAINER_TAXONOMY.map((t) => t.key) as readonly string[];

// ─── CONTENT ─────────────────────────────────────────────────────────────────
// Standalone platform-level artefacts. Shown under COMMON CONTENT.
//
// NOT included: Posts (feed), Forums — these are elements OF circles,
// not independent content types. They exist within circle contexts.
//
// Episodes and Blogs are standalone content artefacts.
// Their containers (Playlists → Episodes, Magazines → Blogs) live in CONTAINER_TAXONOMY.
//
// Events are platform-level content: they exist independently of any circle
// and are discoverable by tag and topic.

export const CONTENT_TAXONOMY: TaxonomyEntry[] = [
  { key: 'blogs',     label: 'Blog',     labelPlural: 'Blogs',     icon: PenTool,       path: '/blogs'     },
  { key: 'episodes',  label: 'Episode',  labelPlural: 'Episodes',  icon: Video,         path: '/episodes'  },
  { key: 'documents', label: 'Document', labelPlural: 'Documents', icon: FileText,      path: '/documents' },
  { key: 'books',     label: 'Book',     labelPlural: 'Books',     icon: BookOpen,      path: '/books'     },
  { key: 'decks',     label: 'Deck',     labelPlural: 'Decks',     icon: Layers,        path: '/decks'     },
  { key: 'reviews',   label: 'Review',   labelPlural: 'Reviews',   icon: Star,          path: '/reviews'   },
  { key: 'events',    label: 'Event',    labelPlural: 'Events',    icon: Calendar,      path: '/events'    },
];

/** Plural keys of all content types */
export const CONTENT_KEYS = CONTENT_TAXONOMY.map((t) => t.key) as readonly string[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getContainerEntry(key: string): TaxonomyEntry | undefined {
  return CONTAINER_TAXONOMY.find((t) => t.key === key);
}

export function getContentEntry(key: string): TaxonomyEntry | undefined {
  return CONTENT_TAXONOMY.find((t) => t.key === key);
}

export function isContainerType(key: string): boolean {
  return CONTAINER_KEYS.includes(key);
}

export function isContentType(key: string): boolean {
  return CONTENT_KEYS.includes(key);
}