import { Link } from 'react-router';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  path?: string; // Alias for href — many pages use this
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Set to false to suppress the auto-prepended Home link */
  showHome?: boolean;
}

export default function Breadcrumbs({ items = [], showHome = true }: BreadcrumbsProps) {
  // Auto-prepend Home unless disabled or already present
  const firstIsHome = items.length > 0 && items[0].label.toLowerCase() === 'home';
  const allItems: BreadcrumbItem[] = showHome && !firstIsHome
    ? [{ label: 'Home', href: '/home' }, ...items]
    : items;

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const link = item.href || item.path;
          const isLast = index === allItems.length - 1;
          return (
            <li key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />}
              {link && !isLast ? (
                <Link to={link} className="text-gray-500 hover:text-gray-900 text-sm font-medium flex items-center gap-1">
                  {item.label === 'Home' && <Home className="w-3.5 h-3.5" />}
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 text-sm font-medium" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}