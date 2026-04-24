/**
 * MyContentSection Component
 *
 * User's owned content: Documents, Books, Decks, Lists, Libraries, etc.
 */

import { Link, useLocation } from 'react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Library,
  FileText,
  BookOpen,
  Layers,
  CheckSquare,
  FolderKanban,
  Star,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MyContentSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  myReviewCount: number;
}

export function MyContentSection({
  isExpanded,
  onToggle,
  myReviewCount,
}: MyContentSectionProps) {
  const location = useLocation();

  return (
    <div className="mb-1.5">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
          isExpanded && 'bg-gray-50'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <Library className="w-4 h-4 text-green-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">MY CONTENT</span>
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          <SideLink to="/my-content/audit" icon={ClipboardList} pathname={location.pathname} match="startsWith">Content Audit</SideLink>
          <SideLink to="/my-documents" icon={FileText} pathname={location.pathname}>My Documents</SideLink>
          <SideLink to="/books" icon={BookOpen} pathname={location.pathname}>My Books</SideLink>
          <SideLink to="/decks" icon={Layers} pathname={location.pathname} activeClass="bg-purple-50 text-purple-700">My Decks</SideLink>
          <SideLink to="/checklists" icon={CheckSquare} pathname={location.pathname}>My Lists</SideLink>
          <SideLink to="/libraries" icon={Library} pathname={location.pathname}>My Libraries</SideLink>
          <SideLink to="/my-contents" icon={FolderKanban} pathname={location.pathname}>My Links</SideLink>

          <Link
            to="/my-reviews"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
              location.pathname === '/my-reviews' && 'bg-indigo-50 text-indigo-700'
            )}
          >
            <Star className="w-4 h-4" />
            <span>My Reviews</span>
            {myReviewCount > 0 && (
              <span className="text-xs text-gray-500">({myReviewCount})</span>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}

function SideLink({
  to,
  icon: Icon,
  pathname,
  children,
  match = 'exact',
  activeClass = 'bg-indigo-50 text-indigo-700',
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  children: ReactNode;
  match?: 'exact' | 'startsWith';
  activeClass?: string;
}) {
  const isActive = match === 'exact' ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
        isActive && activeClass
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </Link>
  );
}