/**
 * Shared companion item type registry
 *
 * All companion surfaces (circle, company, sponsor, event, friend) import from here.
 * Adding a new platform content type means one entry; every companion that
 * lists it in `contexts` picks it up automatically.
 *
 * The `contexts` field is what differentiates each companion — it encodes
 * deliberate decisions about what belongs where:
 *
 *   circle   — community learning hub (broadest set)
 *   company  — business profile / thought leadership
 *   sponsor  — event sponsor showcase (focused, transactional)
 *   event    — live-event logistics (action-oriented, unique builtins)
 *   friend   — 1:1 shared space between two mutual friends
 *
 * Use `getTypesForContext('circle')` to get the filtered list for a surface.
 */

import type { ComponentType } from 'react';
import {
  Mic,
  Presentation,
  FileText,
  CheckSquare,
  Headphones,
  BookOpen,
  QrCode,
  BookMarked,
  Layers,
  ListChecks,
  LayoutGrid,
  Users,
} from 'lucide-react';

export type CompanionContext = 'circle' | 'company' | 'sponsor' | 'event' | 'friend';

export interface CompanionItemType {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Supabase table name — empty string for builtin types */
  table: string;
  /** Column used as the display name */
  nameField: string;
  /** Column used to build the route link (id or slug) */
  slugField: string;
  /** Base route prefix, e.g. '/documents' */
  route: string;
  /** Which companion surfaces this type appears on */
  contexts: CompanionContext[];
  /** If true, visible to circle guests (non-members) */
  guestVisible?: boolean;
  /**
   * If true, no backing DB table is queried for content —
   * the item renders via a dedicated built-in component
   * (e.g. QR code widget, live attendee list).
   */
  builtin?: boolean;
}

export const COMPANION_ITEM_TYPES: CompanionItemType[] = [

  // ── Universal (all companions) ────────────────────────────────────────────
  // Introductions, presentations, reference docs, and QR codes are useful
  // in every context — from a circle's start-here panel to an event table.

  {
    value: 'elevator',
    label: 'Elevator',
    icon: Mic,
    table: 'elevators',
    nameField: 'name',
    slugField: 'slug',
    route: '/elevators',
    contexts: ['circle', 'company', 'sponsor', 'event', 'friend'],
    guestVisible: true,
  },
  {
    value: 'pitch',
    label: 'Pitch',
    icon: Presentation,
    table: 'pitches',
    nameField: 'name',
    slugField: 'slug',
    route: '/pitches',
    contexts: ['circle', 'company', 'sponsor', 'event', 'friend'],
    guestVisible: true,
  },
  {
    value: 'document',
    label: 'Document',
    icon: FileText,
    table: 'documents',
    nameField: 'title',
    slugField: 'id',
    route: '/documents',
    contexts: ['circle', 'company', 'sponsor', 'event', 'friend'],
    guestVisible: false,
  },
  {
    value: 'qr_code',
    label: 'QR Code',
    icon: QrCode,
    table: '',
    nameField: '',
    slugField: '',
    route: '',
    contexts: ['circle', 'company', 'sponsor', 'event', 'friend'],
    guestVisible: true,
    builtin: true,
  },

  // ── Content / profile types (circle · company · sponsor) ─────────────────
  // Ongoing content consumption — episodes, reading lists, blog posts.
  // Not on event companions: events are time-bound, action-focused sessions,
  // not the right moment to hand someone a reading list.

  {
    value: 'episode',
    label: 'Episode',
    icon: Headphones,
    table: 'episodes',
    nameField: 'title',
    slugField: 'id',
    route: '/episodes',
    contexts: ['circle', 'company', 'sponsor', 'friend'],
    guestVisible: true,
  },
  {
    value: 'book',
    label: 'Book',
    icon: BookOpen,
    table: 'books',
    nameField: 'title',
    slugField: 'slug',
    route: '/books',
    contexts: ['circle', 'company', 'sponsor', 'friend'],
    guestVisible: true,
  },
  {
    value: 'blog',
    label: 'Blog',
    icon: BookMarked,
    table: 'blogs',
    nameField: 'title',
    slugField: 'slug',
    route: '/blogs',
    contexts: ['circle', 'company', 'sponsor', 'friend'],
    guestVisible: true,
  },

  // ── Curated learning (circle · company) ───────────────────────────────────
  // Playlists are ordered learning collections. Sponsors are typically
  // promotional / transactional — a playlist doesn't fit that tone.
  // Pathways are structured multi-step programs; the circle is their
  // natural home. Companies may surface a learning track they offer.
  // Events and sponsors don't run structured programs here.

  {
    value: 'playlist',
    label: 'Playlist',
    icon: Layers,
    table: 'playlists',
    nameField: 'name',
    slugField: 'slug',
    route: '/playlists',
    contexts: ['circle', 'company', 'friend'],
    guestVisible: true,
  },

  // ── Action / task types (circle · event) ─────────────────────────────────
  // Checklists are used for member action items in circles and for
  // pre/post-event logistics. Company and sponsor profile pages are
  // read-only showcases — they don't assign tasks to visitors.

  {
    value: 'checklist',
    label: 'Checklist',
    icon: CheckSquare,
    table: 'checklists',
    nameField: 'name',
    slugField: 'slug',
    route: '/checklists',
    contexts: ['circle', 'event'],
    guestVisible: false,
  },

  // ── Structured learning (circle only) ────────────────────────────────────
  // A pathway is a multi-step learning journey with progress tracking.
  // Circles are the natural container for structured programs; company,
  // sponsor, and event companions don't manage participant progression.

  {
    value: 'pathway',
    label: 'Pathway',
    icon: ListChecks,
    table: 'pathways',
    nameField: 'title',
    slugField: 'slug',
    route: '/pathways',
    contexts: ['circle'],
    guestVisible: true,
  },

  // ── Event-specific types ──────────────────────────────────────────────────
  // Tables are event working-group rooms (content type, not container).
  // Attendees is a builtin live check-in widget unique to events.

  {
    value: 'table',
    label: 'Table',
    icon: LayoutGrid,
    table: 'tables',
    nameField: 'name',
    slugField: 'slug',
    route: '/tables',
    contexts: ['event'],
    guestVisible: false,
  },
  {
    value: 'attendees',
    label: 'Attendees',
    icon: Users,
    table: '',
    nameField: '',
    slugField: '',
    route: '',
    contexts: ['event'],
    guestVisible: false,
    builtin: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/** All types available on a given companion surface */
export function getTypesForContext(context: CompanionContext): CompanionItemType[] {
  return COMPANION_ITEM_TYPES.filter(t => t.contexts.includes(context));
}

/** Look up a single type config by value */
export function getCompanionItemType(value: string): CompanionItemType | undefined {
  return COMPANION_ITEM_TYPES.find(t => t.value === value);
}

/** Types that have a real backing table (excludes builtins like qr_code, attendees) */
export const RESOLVABLE_ITEM_TYPES = COMPANION_ITEM_TYPES.filter(t => t.table !== '' && !t.builtin);
