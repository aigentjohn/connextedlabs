// Helper configurations for all journey item types
import {
  FileText, BookOpen, Presentation, Library, PlayCircle,
  Hammer, Users, TrendingUp, Calendar, CalendarClock, Handshake, MessageSquare,
  Table as TableIcon, ExternalLink, Video, CheckSquare, StickyNote,
  BarChart2, PenLine, ClipboardList, HelpCircle, CalendarDays,
  type LucideIcon
} from 'lucide-react';

export type JourneyItemType =
  | 'document' | 'book' | 'deck' | 'shelf' | 'playlist'
  | 'build' | 'pitch' | 'table' | 'elevator' | 'standup' | 'meetup' | 'sprint'
  | 'magazine' | 'episode' | 'checklist' | 'page'
  | 'event' | 'discussion' | 'resource' | 'container'
  | 'poll' | 'reflection' | 'assignment' | 'faq' | 'schedule_picker';

export interface JourneyItemTypeConfig {
  icon: LucideIcon;
  label: string;
  labelPlural: string;
  category: 'content' | 'container' | 'other' | 'interactive';
  tableName: string;
  description: string;
}

export const JOURNEY_ITEM_TYPES: Record<JourneyItemType, JourneyItemTypeConfig> = {
  // CONTENT TYPES (user-created content)
  document: {
    icon: FileText,
    label: 'Document',
    labelPlural: 'Documents',
    category: 'content',
    tableName: 'documents',
    description: 'Text documents, tutorials, guides'
  },
  book: {
    icon: BookOpen,
    label: 'Book',
    labelPlural: 'Books',
    category: 'content',
    tableName: 'books',
    description: 'Multi-page books or long-form content'
  },
  magazine: {
    icon: BookOpen,
    label: 'Magazine',
    labelPlural: 'Magazines',
    category: 'content',
    tableName: 'magazines',
    description: 'Periodical publications and collections'
  },
  episode: {
    icon: Video,
    label: 'Episode',
    labelPlural: 'Episodes',
    category: 'content',
    tableName: 'episodes',
    description: 'Video episodes and show content'
  },
  deck: {
    icon: Presentation,
    label: 'Deck',
    labelPlural: 'Decks',
    category: 'content',
    tableName: 'decks',
    description: 'Slide decks, flashcards, FAQs'
  },
  shelf: {
    icon: Library,
    label: 'Library',
    labelPlural: 'Libraries',
    category: 'content',
    tableName: 'libraries',
    description: 'Curated collections of documents'
  },
  playlist: {
    icon: PlayCircle,
    label: 'Playlist',
    labelPlural: 'Playlists',
    category: 'content',
    tableName: 'playlists',
    description: 'Video playlists and lessons'
  },
  page: {
    icon: StickyNote,
    label: 'Page',
    labelPlural: 'Pages',
    category: 'content',
    tableName: 'pages',
    description: 'Lightweight inline markdown page for courses and cohorts'
  },

  // CONTAINER TYPES (group activities)
  checklist: {
    icon: CheckSquare,
    label: 'List',
    labelPlural: 'Lists',
    category: 'container',
    tableName: 'checklists',
    description: 'Task lists and progress tracking'
  },
  build: {
    icon: Hammer,
    label: 'Build',
    labelPlural: 'Builds',
    category: 'container',
    tableName: 'builds',
    description: 'Tutorials, project builds'
  },
  pitch: {
    icon: Presentation,
    label: 'Pitch',
    labelPlural: 'Pitches',
    category: 'container',
    tableName: 'pitches',
    description: 'Pitch presentations and competitions'
  },
  table: {
    icon: TableIcon,
    label: 'Table',
    labelPlural: 'Tables',
    category: 'container',
    tableName: 'tables',
    description: 'Document tables and resource libraries'
  },
  elevator: {
    icon: TrendingUp,
    label: 'Elevator',
    labelPlural: 'Elevators',
    category: 'container',
    tableName: 'elevators',
    description: 'Quick intro activities'
  },
  standup: {
    icon: MessageSquare,
    label: 'Standup',
    labelPlural: 'Standups',
    category: 'container',
    tableName: 'standups',
    description: 'Daily/weekly check-ins'
  },
  meetup: {
    icon: Handshake,
    label: 'Meetup',
    labelPlural: 'Meetups',
    category: 'container',
    tableName: 'meetups',
    description: 'Networking events'
  },
  sprint: {
    icon: CalendarClock,
    label: 'Sprint',
    labelPlural: 'Sprints',
    category: 'container',
    tableName: 'sprints',
    description: 'Time-boxed challenges'
  },

  // OTHER TYPES
  event: {
    icon: Calendar,
    label: 'Event',
    labelPlural: 'Events',
    category: 'other',
    tableName: 'events',
    description: 'Calendar events and sessions'
  },
  discussion: {
    icon: MessageSquare,
    label: 'Discussion',
    labelPlural: 'Discussions',
    category: 'other',
    tableName: 'discussions',
    description: 'Forum discussions and Q&A'
  },
  resource: {
    icon: ExternalLink,
    label: 'Resource',
    labelPlural: 'Resources',
    category: 'other',
    tableName: 'resources',
    description: 'External links and resources'
  },

  // LEGACY (deprecated)
  container: {
    icon: Users,
    label: 'Container (Generic)',
    labelPlural: 'Containers (Generic)',
    category: 'container',
    tableName: '',
    description: 'Legacy - use specific container type instead'
  },

  // INTERACTIVE TYPES (journey-only, created inline in the journey builder)
  poll: {
    icon: BarChart2,
    label: 'Poll',
    labelPlural: 'Polls',
    category: 'interactive',
    tableName: 'surveys',
    description: 'Single-question vote with live results'
  },
  reflection: {
    icon: PenLine,
    label: 'Reflection',
    labelPlural: 'Reflections',
    category: 'interactive',
    tableName: 'reflections',
    description: 'Private journaling prompt for learners'
  },
  assignment: {
    icon: ClipboardList,
    label: 'Assignment',
    labelPlural: 'Assignments',
    category: 'interactive',
    tableName: 'assignments',
    description: 'Structured submission with optional feedback'
  },
  faq: {
    icon: HelpCircle,
    label: 'FAQ',
    labelPlural: 'FAQs',
    category: 'interactive',
    tableName: 'faqs',
    description: 'Curated Q&A accordion'
  },
  schedule_picker: {
    icon: CalendarDays,
    label: 'Schedule Picker',
    labelPlural: 'Schedule Pickers',
    category: 'interactive',
    tableName: 'schedule_polls',
    description: 'Doodle-style availability grid'
  },
};

// Helper to get items by category
export function getItemTypesByCategory(category: 'content' | 'container' | 'other' | 'interactive'): JourneyItemType[] {
  return Object.entries(JOURNEY_ITEM_TYPES)
    .filter(([_, config]) => config.category === category && _ !== 'container')
    .map(([type]) => type as JourneyItemType);
}

// Helper to get config
export function getItemTypeConfig(type: JourneyItemType): JourneyItemTypeConfig {
  return JOURNEY_ITEM_TYPES[type];
}
