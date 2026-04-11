/**
 * Shared companion item type registry
 *
 * All companion implementations (circle, company, event, sponsor) import
 * from here. Adding a new supported content type means adding one entry
 * to this array — every companion picks it up automatically.
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
} from 'lucide-react';

export interface CompanionItemType {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Supabase table name — empty string for generated types like qr_code */
  table: string;
  /** Column used as the display name */
  nameField: string;
  /** Column used to build the route link (id or slug) */
  slugField: string;
  /** Base route prefix, e.g. '/documents' */
  route: string;
  /** If true, visible to circle guests (non-members) */
  guestVisible?: boolean;
}

export const COMPANION_ITEM_TYPES: CompanionItemType[] = [
  {
    value: 'elevator',
    label: 'Elevator',
    icon: Mic,
    table: 'elevators',
    nameField: 'name',
    slugField: 'slug',
    route: '/elevators',
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
    guestVisible: false,
  },
  {
    value: 'checklist',
    label: 'Checklist',
    icon: CheckSquare,
    table: 'checklists',
    nameField: 'name',
    slugField: 'slug',
    route: '/checklists',
    guestVisible: false,
  },
  {
    value: 'episode',
    label: 'Episode',
    icon: Headphones,
    table: 'episodes',
    nameField: 'title',
    slugField: 'id',
    route: '/episodes',
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
    guestVisible: true,
  },
  {
    value: 'playlist',
    label: 'Playlist',
    icon: Layers,
    table: 'playlists',
    nameField: 'name',
    slugField: 'slug',
    route: '/playlists',
    guestVisible: true,
  },
  {
    value: 'pathway',
    label: 'Pathway',
    icon: ListChecks,
    table: 'pathways',
    nameField: 'title',
    slugField: 'slug',
    route: '/pathways',
    guestVisible: true,
  },
  {
    value: 'qr_code',
    label: 'QR Code',
    icon: QrCode,
    table: '',
    nameField: '',
    slugField: '',
    route: '',
    guestVisible: true,
  },
];

/** Look up a type config by value */
export function getCompanionItemType(value: string): CompanionItemType | undefined {
  return COMPANION_ITEM_TYPES.find(t => t.value === value);
}

/** Types that have a real backing table (excludes generated types like qr_code) */
export const RESOLVABLE_ITEM_TYPES = COMPANION_ITEM_TYPES.filter(t => t.table !== '');
