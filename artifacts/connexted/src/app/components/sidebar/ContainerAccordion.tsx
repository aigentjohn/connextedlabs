/**
 * ContainerAccordion Component
 *
 * Reusable accordion for sidebar container types (elevators, tables, builds, etc.).
 * Replaces 12 near-identical ~45-line blocks with a single configurable component.
 */

import { Link, useLocation } from 'react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { LucideIcon } from 'lucide-react';

interface ContainerAccordionProps {
  sectionKey: string;
  basePath: string;
  icon: LucideIcon;
  label: string;
  items: any[];
  isExpanded: boolean;
  onToggle: () => void;
  /** Which item field to use in the URL path (default: 'slug') */
  itemPathKey?: 'slug' | 'id';
  /** Custom name resolver (default: item.name) */
  getItemName?: (item: any) => string;
  /** Icon color class (default: 'text-gray-600') */
  iconColor?: string;
}

export function ContainerAccordion({
  sectionKey,
  basePath,
  icon: Icon,
  label,
  items,
  isExpanded,
  onToggle,
  itemPathKey = 'slug',
  getItemName = (item) => item.name,
  iconColor = 'text-gray-600',
}: ContainerAccordionProps) {
  const location = useLocation();

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>
        <Link
          to={basePath}
          className={cn(
            'flex-1 flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
            location.pathname === basePath && 'bg-indigo-50 text-indigo-700'
          )}
        >
          <Icon className={cn('w-4 h-4', iconColor)} />
          <span className="flex-1 text-left font-medium">{label}</span>
          <span className="text-xs text-gray-500">({items.length})</span>
        </Link>
      </div>
      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {items.map((item: any) => {
            const itemPath = `${basePath}/${item[itemPathKey]}`;
            return (
              <Link
                key={item.id}
                to={itemPath}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                  location.pathname === itemPath && 'bg-indigo-50 text-indigo-700'
                )}
              >
                <span className="flex-1 truncate text-xs">{getItemName(item)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
