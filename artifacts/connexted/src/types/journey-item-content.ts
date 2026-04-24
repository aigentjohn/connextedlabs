/**
 * Journey Item Content Schemas
 *
 * These types define the `content` block inside each exported/imported
 * journey item. They are the contract between the platform's import/export
 * pipeline and any external tool that generates or consumes journey JSON.
 *
 * BOUNDARY
 * --------
 * The platform is responsible for:
 *   - Exporting: reading from the DB → populating these content blocks
 *   - Importing: accepting these content blocks → writing to the DB
 *
 * External tools are responsible for:
 *   - Authoring/generating the content that fills these blocks
 *
 * PLACEHOLDER RULE
 * ----------------
 * A journey item with NO `content` key (or `content: undefined`) is a
 * placeholder — the journey slot exists but no source content has been
 * created yet. On import this produces a `journey_items` row with
 * `item_id = null`. On export this occurs when `item_id` is null or the
 * source record cannot be found.
 *
 * SOURCE TABLE MAP
 * ----------------
 * item_type    → DB table
 * ---------------------
 * document     → documents
 * resource     → documents   (alias for document)
 * episode      → episodes
 * book         → books       (+ chapters sub-table)
 * deck         → decks       (+ deck_cards sub-table)
 * checklist    → checklists  (+ checklist_items sub-table)
 * playlist     → playlists
 * shelf        → libraries
 * magazine     → magazines
 * page         → pages
 * build        → builds
 * pitch        → pitches
 * table        → tables
 * elevator     → elevators
 * standup      → standups
 * meetup       → meetups
 * sprint       → sprints
 * event        → events
 * discussion   → forum_threads
 */

// ============================================================================
// CONTENT TYPES (rich / text-based)
// ============================================================================

export interface DocumentContent {
  /** Markdown or plain-text body */
  body?: string;
  /** External URL (Google Doc, PDF, etc.) */
  url?: string;
  /** Determines how the item is rendered */
  media_type?: 'document' | 'video' | 'audio' | 'quiz' | 'assignment';
  video_url?: string;
  video_provider?: string;  // 'youtube' | 'vimeo' | 'loom' etc.
  duration_minutes?: number | null;
}

/** `resource` is an alias for `document` — same shape, same DB table */
export type ResourceContent = DocumentContent;

export interface EpisodeContent {
  video_url?: string;
  video_platform?: string;  // 'youtube' | 'vimeo' | 'loom' etc.
  /** Duration in seconds */
  duration?: number | null;
}

export interface BookContent {
  category?: string;
  chapters?: Array<{
    title: string;
    content?: string;
    order_index?: number;
  }>;
}

export interface DeckContent {
  cards?: Array<{
    front: string;
    back: string;
    order_index?: number;
  }>;
}

export interface ChecklistContent {
  checklist_items?: Array<{
    title: string;
    description?: string;
    order_index?: number;
    is_required?: boolean;
  }>;
}

// ============================================================================
// COLLECTION TYPES (named containers with a slug)
// ============================================================================

export interface PlaylistContent {
  name?: string;
  slug?: string;
}

export interface ShelfContent {
  name?: string;
  slug?: string;
}

export interface MagazineContent {
  name?: string;
  slug?: string;
}

export interface PageContent {
  /** Full markdown body stored inline in the `pages` table */
  body: string;
  description?: string;
  tags?: string[];
}

// ============================================================================
// COMMUNITY CONTAINER TYPES (named, slugged, visibility-controlled)
// These map to their own DB tables and are created fresh on import.
// ============================================================================

interface BaseContainerContent {
  name?: string;
  slug?: string;
  visibility?: 'public' | 'member' | 'unlisted' | 'private';
  tags?: string[];
}

export interface BuildContent extends BaseContainerContent {}

export interface PitchContent extends BaseContainerContent {
  long_description?: string;
  access_level?: string;
}

export interface TableContent extends BaseContainerContent {}

export interface ElevatorContent extends BaseContainerContent {}

export interface StandupContent extends BaseContainerContent {
  questions?: string[];
}

export interface MeetupContent extends BaseContainerContent {}

export interface SprintContent extends BaseContainerContent {
  goal?: string;
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// LIVE / ASYNC ITEM TYPES
// ============================================================================

export interface EventContent {
  /** start_date is the only field exported for events */
  start_date?: string;
  end_date?: string;
  location?: string;
  location_type?: 'in-person' | 'virtual' | 'hybrid';
  meeting_url?: string;
}

export interface DiscussionContent {
  /** The opening post body */
  body?: string;
}

// ============================================================================
// DISCRIMINATED UNION — the full content block for any item type
// ============================================================================

export type JourneyItemContent =
  | DocumentContent
  | ResourceContent
  | EpisodeContent
  | BookContent
  | DeckContent
  | ChecklistContent
  | PlaylistContent
  | ShelfContent
  | MagazineContent
  | PageContent
  | BuildContent
  | PitchContent
  | TableContent
  | ElevatorContent
  | StandupContent
  | MeetupContent
  | SprintContent
  | EventContent
  | DiscussionContent;

// ============================================================================
// JOURNEY ITEM — the unit inside a journey's `items` array
// ============================================================================

export type JourneyItemType =
  | 'document'
  | 'resource'
  | 'episode'
  | 'book'
  | 'deck'
  | 'checklist'
  | 'playlist'
  | 'shelf'
  | 'magazine'
  | 'page'
  | 'build'
  | 'pitch'
  | 'table'
  | 'elevator'
  | 'standup'
  | 'meetup'
  | 'sprint'
  | 'event'
  | 'discussion';

export interface JourneyItem {
  item_type: JourneyItemType;
  title: string;
  description?: string;
  order_index?: number;
  is_published?: boolean;
  estimated_time?: number | null;   // minutes
  /**
   * Content block for this item.
   * ABSENT (undefined) = placeholder — no source record exists yet.
   * PRESENT            = real content — will be created on import.
   */
  content?: JourneyItemContent;
}

// ============================================================================
// JOURNEY — second-level structure, shared by courses and programs
// ============================================================================

export interface JourneyExport {
  title: string;
  description?: string;
  order_index?: number;
  status?: 'not-started' | 'in-progress' | 'completed';
  start_date?: string | null;
  finish_date?: string | null;
  /** Unified item list. All item types go here. */
  items: JourneyItem[];
  /** @deprecated Legacy field kept for backwards compatibility. Always [] on new exports. */
  containers?: unknown[];
}

// ============================================================================
// TOP-LEVEL EXPORT SHAPES
// ============================================================================

export interface ExportMetadata {
  version: '1.0';
  exportedAt: string;        // ISO 8601
  exportedBy: string;        // user ID
  exportType: 'course' | 'program';
  platform: 'connexted-labs';
}

export interface CourseExportSchema {
  metadata: ExportMetadata;
  course: {
    title: string;
    slug: string;
    description?: string;
    instructor_name?: string;
    instructor_bio?: string;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    pricing_type?: 'free' | 'paid' | 'members-only';
    price_cents?: number;
    currency?: string;
    category?: string;
    tags?: string[];
    learning_objectives?: string[];
    requirements?: string[];
    duration_hours?: number;
    total_lessons?: number;
    preview_video_url?: string;
    convertkit_product_id?: string;
  };
  journeys: JourneyExport[];
}

export interface ProgramExportSchema {
  metadata: ExportMetadata;
  program: {
    name: string;
    slug: string;
    description?: string;
    template_id?: string;
    status?: 'not-started' | 'in-progress' | 'completed';
    visibility?: 'public' | 'member' | 'unlisted' | 'private';
    pricing_type?: 'free' | 'paid' | 'members-only';
    enrollment_status?: 'open' | 'closed' | 'invite-only';
    program_overview?: string;
    learning_outcomes?: string[];
    prerequisites?: string[];
    cover_image?: string;
  };
  circle?: {
    name: string;
    slug?: string;
    description?: string;
    visibility?: 'public' | 'member' | 'unlisted' | 'private';
    join_type?: 'open' | 'request' | 'invite-only';
    tags?: string[];
    mission?: string;
  } | null;
  journeys: JourneyExport[];
}
