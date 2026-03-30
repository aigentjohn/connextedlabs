/**
 * Template System Types
 * 
 * Comprehensive type definitions for importing/exporting programs,
 * circles, journeys, and containers with full content support.
 */

// ==========================================
// CONTENT TYPES (for full backups)
// ==========================================

export interface PostContent {
  content: string;
  author_email: string;
  created_at: string;
  likes_count?: number;
  image_url?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
}

export interface DocumentContent {
  title: string;
  description?: string;
  url: string;
  author_email: string;
  created_at: string;
  category?: string;
  tags?: string[];
  favorites_count?: number;
  views?: number;
}

export interface ReviewContent {
  title: string;
  description?: string;
  link_url?: string;
  author_email: string;
  created_at: string;
  rating?: number;
  tags?: string[];
}

export interface EventContent {
  title: string;
  description?: string;
  event_type?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  location_type?: 'in-person' | 'virtual' | 'hybrid';
  meeting_url?: string;
  max_attendees?: number;
  attendee_emails?: string[];
  created_at: string;
}

export interface ForumThreadContent {
  title: string;
  body: string;
  author_email: string;
  created_at: string;
  tags?: string[];
  likes_count?: number;
  is_pinned?: boolean;
  replies?: {
    body: string;
    author_email: string;
    created_at: string;
    likes_count?: number;
  }[];
}

export interface StandupResponseContent {
  user_email: string;
  response_date: string;
  yesterday?: string;
  today?: string;
  blockers?: string;
  created_at: string;
}

export interface PitchSubmissionContent {
  title: string;
  pitch_text: string;
  author_email: string;
  submitted_at: string;
  status?: string;
  video_url?: string;
  deck_url?: string;
}

export interface MemberData {
  email: string;
  role: 'admin' | 'member';
  status?: 'enrolled' | 'completed' | 'dropped';
  joined_at?: string;
}

// ==========================================
// CONTAINER TEMPLATES (with optional content)
// ==========================================

export interface BaseContainerTemplate {
  type: string;
  name: string;
  description?: string;
  slug?: string; // Optional - will be auto-generated if not provided
  visibility?: 'public' | 'members-only' | 'private';
  cover_image?: string;
  tags?: string[];
  
  // Full content (only populated when exporting with level: 'full')
  posts?: PostContent[];
  documents?: DocumentContent[];
  reviews?: ReviewContent[];
}

export interface TableTemplate extends BaseContainerTemplate {
  type: 'tables';
}

export interface ElevatorTemplate extends BaseContainerTemplate {
  type: 'elevators';
  pitches?: PitchSubmissionContent[];
}

export interface MeetingTemplate extends BaseContainerTemplate {
  type: 'meetings';
  event_id?: string;
  events?: EventContent[];
  forum_threads?: ForumThreadContent[];
}

export interface PitchTemplate extends BaseContainerTemplate {
  type: 'pitches';
  long_description?: string;
  image?: string;
  access_level?: 'public' | 'member' | 'premium';
  pitches?: PitchSubmissionContent[];
}

export interface BuildTemplate extends BaseContainerTemplate {
  type: 'builds';
  document_ids?: string[];
}

export interface StandupTemplate extends BaseContainerTemplate {
  type: 'standups';
  post_ids?: string[];
  responses?: StandupResponseContent[];
}

export interface MeetupTemplate extends BaseContainerTemplate {
  type: 'meetups';
  event_ids?: string[];
  forum_thread_ids?: string[];
  events?: EventContent[];
  forum_threads?: ForumThreadContent[];
}

export type ContainerTemplate = 
  | TableTemplate 
  | ElevatorTemplate 
  | MeetingTemplate 
  | PitchTemplate 
  | BuildTemplate 
  | StandupTemplate 
  | MeetupTemplate;

// ==========================================
// CIRCLE TEMPLATE
// ==========================================

export interface CircleTemplate {
  name: string;
  description?: string;
  slug?: string; // Optional - will be auto-generated if not provided
  visibility?: 'public' | 'private';
  join_type?: 'open' | 'request' | 'invite-only';
  cover_image?: string;
  tags?: string[];
  rules?: string;
  mission?: string;
  custom_fields?: Record<string, any>;
}

// ==========================================
// JOURNEY TEMPLATE
// ==========================================

/**
 * A content or container item within a journey.
 * Shared equally between programs and courses — the same item types
 * are available in both. The item_type determines which source table
 * the content lives in (see JOURNEY_ITEM_TYPES in journey-item-types.ts).
 */
export interface JourneyContentItem {
  item_type: 'document' | 'episode' | 'book' | 'deck' | 'checklist'
    | 'playlist' | 'shelf' | 'magazine'
    | 'build' | 'pitch' | 'table' | 'elevator' | 'standup' | 'meetup' | 'sprint'
    | 'event' | 'discussion' | 'resource';
  title: string;
  description?: string;
  order_index?: number; // Auto-assigned if not provided
  is_published?: boolean;
  estimated_time?: number; // Minutes

  // Content-type-specific fields (only include what's relevant)
  content?: {
    // Documents
    body?: string;              // Markdown/text content
    url?: string;               // Document URL (Google Docs, etc.)
    media_type?: 'document' | 'video' | 'audio' | 'quiz' | 'assignment';
    video_url?: string;         // For video documents or episodes
    video_provider?: string;    // Documents: 'youtube', 'vimeo', etc.
    video_platform?: string;    // Episodes: 'youtube', 'vimeo', 'loom'
    duration_minutes?: number;  // Documents
    duration?: number;          // Episodes (seconds or minutes depending on table)

    // Books — nested chapters
    category?: string;
    chapters?: Array<{
      title: string;
      content?: string;
      order_index?: number;
    }>;

    // Decks — nested cards
    cards?: Array<{
      front: string;
      back: string;
      order_index?: number;
    }>;

    // Checklists — nested items
    checklist_items?: Array<{
      title: string;
      description?: string;
      order_index?: number;
      is_required?: boolean;
    }>;

    // Containers (builds, pitches, tables, etc.) — general fields
    name?: string;              // Container tables use 'name' not 'title'
    slug?: string;
    visibility?: string;
    tags?: string[];

    // Pitch-specific
    long_description?: string;
    access_level?: string;

    // Standup-specific
    questions?: string[];

    // Sprint-specific
    goal?: string;
    start_date?: string;
    end_date?: string;
  };
}

export interface JourneyTemplate {
  title: string;
  description?: string;
  order_index?: number; // Optional - will be auto-assigned if not provided
  status?: 'not-started' | 'in-progress' | 'completed';
  start_date?: string | null;
  finish_date?: string | null;
  containers: ContainerTemplate[];       // Legacy: container-only items (existing templates)
  items?: JourneyContentItem[];          // Unified: all item types (content + containers)
}

// ==========================================
// PROGRAM TEMPLATE (with optional members and full content)
// ==========================================

export interface ProgramTemplate {
  // Metadata
  version?: string; // Template version for backwards compatibility
  created_at?: string;
  exported_by?: string;
  export_level?: 'structure' | 'full'; // Indicates what level this was exported at
  
  // Program Info
  program: {
    name: string;
    description?: string;
    slug?: string; // Optional - will be auto-generated if not provided
    template_id: string;
    status?: 'not-started' | 'in-progress' | 'completed';
  };
  
  // Circle (required - every program has a community)
  circle: CircleTemplate;
  
  // Journeys (workflow phases)
  journeys: JourneyTemplate[];
  
  // Members (only populated when exporting with level: 'full')
  members?: MemberData[];
}

// ==========================================
// COURSE TEMPLATE
// ==========================================

/**
 * Course template for import/export.
 * Uses the same JourneyTemplate (and JourneyContentItem) as programs,
 * since journey items are shared building blocks.
 */
export interface CourseTemplate {
  // Metadata
  version?: string;
  created_at?: string;
  exported_by?: string;
  export_level?: 'structure' | 'full';

  // Course Info
  course: {
    title: string;
    description?: string;
    slug?: string;                // Auto-generated if not provided
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

  // Journeys (same structure as programs — shared building blocks)
  journeys: JourneyTemplate[];
}

// ==========================================
// GRANULAR TEMPLATES (for importing individual components)
// ==========================================

export interface CircleOnlyTemplate {
  type: 'circle';
  circle: CircleTemplate;
}

export interface ContainerOnlyTemplate {
  type: 'container';
  container: ContainerTemplate;
}

export interface JourneyOnlyTemplate {
  type: 'journey';
  journey: JourneyTemplate;
}

export type GranularTemplate = 
  | CircleOnlyTemplate 
  | ContainerOnlyTemplate 
  | JourneyOnlyTemplate;

// ==========================================
// IMPORT RESULTS
// ==========================================

export interface ImportedContainer {
  id: string;
  type: string;
  name: string;
  slug: string;
}

export interface ImportedJourney {
  id: string;
  title: string;
  containers: ImportedContainer[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    program?: {
      id: string;
      name: string;
      slug: string;
    };
    circle?: {
      id: string;
      name: string;
      slug: string;
    };
    journeys?: ImportedJourney[];
  };
  errors?: string[];
}

// ==========================================
// EXPORT OPTIONS
// ==========================================

export type ExportLevel = 'structure' | 'full';

export interface ExportOptions {
  level?: ExportLevel; // 'structure' (default) or 'full' (with all content)
  includeContainers?: boolean; // Default true
  includeCircle?: boolean; // Default true
  includeMetadata?: boolean; // Default true
  includeMembers?: boolean; // Only used when level is 'full'
}

// ==========================================
// IMPORT OPTIONS
// ==========================================

export interface ImportOptions {
  // Slug handling
  customSlug?: string; // Override program slug
  autoGenerateSlug?: boolean; // Auto-generate if conflict (default: true)
  
  // User mapping (for full imports with content)
  assignAllContentToImporter?: boolean; // Assign all content to importing user (default: true)
  preserveTimestamps?: boolean; // Keep original created_at dates (default: true)
  
  // Member handling (for full imports)
  importMembers?: boolean; // Import members from backup (default: false)
  makeImporterAdmin?: boolean; // Add importer as admin (default: true)
}