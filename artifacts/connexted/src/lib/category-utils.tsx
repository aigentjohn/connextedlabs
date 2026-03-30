import { FileText, FileSpreadsheet, Presentation, BookOpen, FileCode, Newspaper, Shield, FolderOpen } from 'lucide-react';

// Document category options
export const DOCUMENT_CATEGORIES = [
  'guide',
  'template',
  'resource',
  'presentation',
  'spreadsheet',
  'whitepaper',
  'policy',
  'tutorial',
  'article',
  'case-study',
  'other',
] as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

// Format category for display (capitalize)
export function formatCategory(category: string): string {
  if (!category) return 'Other';
  
  // Handle hyphenated categories
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get color classes for category badges
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    guide: 'bg-blue-100 text-blue-800 border-blue-200',
    template: 'bg-purple-100 text-purple-800 border-purple-200',
    resource: 'bg-green-100 text-green-800 border-green-200',
    tutorial: 'bg-orange-100 text-orange-800 border-orange-200',
    presentation: 'bg-pink-100 text-pink-800 border-pink-200',
    spreadsheet: 'bg-teal-100 text-teal-800 border-teal-200',
    whitepaper: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    policy: 'bg-gray-100 text-gray-800 border-gray-200',
    article: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'case-study': 'bg-amber-100 text-amber-800 border-amber-200',
    other: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  
  return colors[category.toLowerCase()] || colors.other;
}

// Get icon for category
export function getCategoryIcon(category: string) {
  const icons: Record<string, any> = {
    guide: BookOpen,
    template: FileCode,
    resource: FolderOpen,
    tutorial: FileText,
    presentation: Presentation,
    spreadsheet: FileSpreadsheet,
    whitepaper: Newspaper,
    policy: Shield,
    article: Newspaper,
    'case-study': FileText,
    other: FileText,
  };
  
  const IconComponent = icons[category.toLowerCase()] || icons.other;
  return IconComponent;
}

// Get emoji for category (for backwards compatibility)
export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    guide: '📘',
    template: '📝',
    resource: '📦',
    tutorial: '🎓',
    presentation: '📊',
    spreadsheet: '📈',
    whitepaper: '📄',
    policy: '⚖️',
    article: '📰',
    'case-study': '💼',
    other: '📄',
  };
  
  return emojis[category.toLowerCase()] || emojis.other;
}
