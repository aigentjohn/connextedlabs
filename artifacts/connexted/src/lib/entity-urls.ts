/**
 * Entity URL utility — single source of truth for building shareable URLs
 * for any content or container type on the platform.
 *
 * Each entity's URL uses whatever identifier (slug or UUID) its route expects.
 */

export type EntityType =
  | 'book'
  | 'episode'
  | 'playlist'
  | 'magazine'
  | 'deck'
  | 'blog'
  | 'document'
  | 'topic'
  | 'thread'
  | 'review'
  | 'build'
  | 'pitch'
  | 'table'
  | 'library'
  | 'checklist'
  | 'elevator'
  | 'meeting'
  | 'meetup'
  | 'standup';

/**
 * Maps entity types to their URL path prefix.
 * Most follow the pattern /{plural}/:id, but some have special paths.
 */
const ENTITY_PATH_MAP: Record<EntityType, string> = {
  book: 'books',
  episode: 'episodes',
  playlist: 'playlists',
  magazine: 'magazines',
  deck: 'decks',
  blog: 'blogs',
  document: 'documents',
  topic: 'topics',
  thread: 'forums',
  review: 'reviews',
  build: 'builds',
  pitch: 'pitches',
  table: 'tables',
  library: 'libraries',
  checklist: 'checklists',
  elevator: 'elevators',
  meeting: 'meetings',
  meetup: 'meetups',
  standup: 'standups',
};

/** Human-readable labels for entity types */
const ENTITY_LABELS: Record<EntityType, string> = {
  book: 'Book',
  episode: 'Episode',
  playlist: 'Playlist',
  magazine: 'Magazine',
  deck: 'Deck',
  blog: 'Blog Post',
  document: 'Document',
  topic: 'Topic',
  thread: 'Discussion',
  review: 'Review',
  build: 'Build',
  pitch: 'Pitch',
  table: 'Table',
  library: 'Library',
  checklist: 'List',
  elevator: 'Elevator',
  meeting: 'Meeting',
  meetup: 'Meetup',
  standup: 'Standup',
};

/**
 * Build the relative path for an entity.
 */
export function getEntityPath(entityType: EntityType, entityIdOrSlug: string): string {
  const prefix = ENTITY_PATH_MAP[entityType];
  if (!prefix) {
    console.warn('Unknown entity type: ' + entityType);
    return '/' + entityType + 's/' + entityIdOrSlug;
  }
  return '/' + prefix + '/' + entityIdOrSlug;
}

/**
 * Build the full shareable URL for an entity.
 */
export function getEntityUrl(entityType: EntityType, entityIdOrSlug: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return baseUrl + getEntityPath(entityType, entityIdOrSlug);
}

/**
 * Get the human-readable label for an entity type.
 */
export function getEntityLabel(entityType: EntityType): string {
  return ENTITY_LABELS[entityType] || entityType;
}

/**
 * Parse a platform URL to extract entity type and ID/slug.
 * Returns null if the URL is not a recognized entity URL.
 */
export function parseEntityUrl(url: string): { entityType: EntityType; entityIdOrSlug: string } | null {
  try {
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname;

    for (const [entityType, pathPrefix] of Object.entries(ENTITY_PATH_MAP)) {
      const match = pathname.match(new RegExp('^\\/' + pathPrefix + '\\/([^/]+)$'));
      if (match) {
        return { entityType: entityType as EntityType, entityIdOrSlug: match[1] };
      }
    }
    return null;
  } catch (_err) {
    return null;
  }
}
