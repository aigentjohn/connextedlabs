import {
  Users,
  Hammer,
  Table,
  TrendingUp,
  Calendar,
  Presentation,
  MessageSquare,
  CalendarClock,
  Handshake,
  Image as ImageIcon,
  BookOpen,
  ListVideo,
  BookCopy,
  Library,
  CheckSquare,
  Sparkles,
  ClipboardList,
  Brain,
  BarChart3,
  LucideIcon
} from 'lucide-react';

export type ContainerType =
  | 'circles'
  | 'playlists'
  | 'builds'
  | 'tables'
  | 'elevators'
  | 'meetings'
  | 'pitches'
  | 'standups'
  | 'sprints'
  | 'meetups'
  | 'moments'
  | 'books'
  | 'magazines'
  | 'libraries'
  | 'checklists'
  | 'prompts'
  | 'surveys'
  | 'quizzes'
  | 'assessments';

export interface ContainerTypeConfig {
  icon: LucideIcon;
  color: string;        // Background color class (e.g., 'bg-blue-100')
  iconColor: string;    // Icon/text color class (e.g., 'text-blue-600')
  label: string;        // Singular display name
  labelPlural: string;  // Plural display name
}

/**
 * Centralized container type configuration
 * Single source of truth for all container type icons, colors, and labels
 * Used in: ContainerCard, discovery pages, sidebar, admin sections, etc.
 */
export const CONTAINER_TYPES: Record<ContainerType, ContainerTypeConfig> = {
  circles: {
    icon: Users,
    color: 'bg-blue-100',
    iconColor: 'text-blue-600',
    label: 'Circle',
    labelPlural: 'Circles'
  },
  playlists: {
    icon: ListVideo,
    color: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    label: 'Playlist',
    labelPlural: 'Playlists'
  },
  builds: {
    icon: Hammer,
    color: 'bg-orange-100',
    iconColor: 'text-orange-600',
    label: 'Build',
    labelPlural: 'Builds'
  },
  tables: {
    icon: Table,
    color: 'bg-green-100',
    iconColor: 'text-green-600',
    label: 'Table',
    labelPlural: 'Tables'
  },
  elevators: {
    icon: TrendingUp,
    color: 'bg-purple-100',
    iconColor: 'text-purple-600',
    label: 'Elevator',
    labelPlural: 'Elevators'
  },
  meetings: {
    icon: Calendar,
    color: 'bg-blue-100',
    iconColor: 'text-blue-600',
    label: 'Meeting',
    labelPlural: 'Meetings'
  },
  pitches: {
    icon: Presentation,
    color: 'bg-purple-100',
    iconColor: 'text-purple-600',
    label: 'Pitch',
    labelPlural: 'Pitches'
  },
  standups: {
    icon: MessageSquare,
    color: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    label: 'Standup',
    labelPlural: 'Standups'
  },
  sprints: {
    icon: CalendarClock,
    color: 'bg-teal-100',
    iconColor: 'text-teal-600',
    label: 'Sprint',
    labelPlural: 'Sprints'
  },
  meetups: {
    icon: Handshake,
    color: 'bg-pink-100',
    iconColor: 'text-pink-600',
    label: 'Meetup',
    labelPlural: 'Meetups'
  },
  moments: {
    icon: ImageIcon,
    color: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    label: 'Moment',
    labelPlural: 'Moments'
  },
  books: {
    icon: BookOpen,
    color: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    label: 'Book',
    labelPlural: 'Books'
  },
  magazines: {
    icon: BookCopy,
    color: 'bg-fuchsia-100',
    iconColor: 'text-fuchsia-600',
    label: 'Magazine',
    labelPlural: 'Magazines'
  },
  libraries: {
    icon: Library,
    color: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    label: 'Library',
    labelPlural: 'Libraries'
  },
  checklists: {
    icon: CheckSquare,
    color: 'bg-lime-100',
    iconColor: 'text-lime-600',
    label: 'List',
    labelPlural: 'Lists'
  },
  prompts: {
    icon: Sparkles,
    color: 'bg-amber-100',
    iconColor: 'text-amber-600',
    label: 'Prompt',
    labelPlural: 'Prompts'
  },
  surveys: {
    icon: ClipboardList,
    color: 'bg-rose-100',
    iconColor: 'text-rose-600',
    label: 'Survey',
    labelPlural: 'Surveys'
  },
  quizzes: {
    icon: Brain,
    color: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    label: 'Quiz',
    labelPlural: 'Quizzes'
  },
  assessments: {
    icon: BarChart3,
    color: 'bg-amber-100',
    iconColor: 'text-amber-600',
    label: 'Assessment',
    labelPlural: 'Assessments'
  },
} as const;

/**
 * Helper function to get container type config
 */
export function getContainerConfig(type: ContainerType): ContainerTypeConfig {
  return CONTAINER_TYPES[type];
}