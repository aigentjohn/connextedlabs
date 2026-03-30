/**
 * PageHeader — standardized page header component
 *
 * Normalizes the header pattern across all sidebar-navigable pages:
 *   Breadcrumbs (with auto-Home) > Icon + Title (+ Badge) | Actions
 *   Description
 *
 * Modeled after the CirclesPage / TablesPage / PlaylistsPage pattern,
 * which uses the CONTAINER_TYPES config for icon box styling.
 *
 * Usage:
 *   <PageHeader
 *     breadcrumbs={[{ label: 'Circles' }]}
 *     icon={Users}
 *     iconBg="bg-blue-100"
 *     iconColor="text-blue-600"
 *     title="Discover Circles"
 *     description="Find and join communities that match your interests"
 *     actions={<Button>Create Circle</Button>}
 *   />
 *
 * Or with a CONTAINER_TYPES config shortcut:
 *   const config = CONTAINER_TYPES.circles;
 *   <PageHeader
 *     breadcrumbs={[{ label: 'Circles' }]}
 *     icon={config.icon}
 *     iconBg={config.color}
 *     iconColor={config.iconColor}
 *     title="Discover Circles"
 *     description="..."
 *   />
 */

import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  path?: string;
}

export interface PageHeaderProps {
  /** Breadcrumb trail (Home is auto-prepended by the Breadcrumbs component) */
  breadcrumbs: BreadcrumbItem[];

  /** Optional Lucide icon displayed in a rounded box to the left of the title */
  icon?: LucideIcon;
  /** Tailwind bg class for the icon box, e.g. 'bg-blue-100' */
  iconBg?: string;
  /** Tailwind text-color class for the icon, e.g. 'text-blue-600' */
  iconColor?: string;

  /** Page title (rendered as h1) */
  title: string;

  /** Optional inline badge rendered next to the title (e.g. unread count) */
  badge?: ReactNode;

  /** Description text or ReactNode below the title */
  description?: ReactNode;

  /** Right-aligned action slot (CTA buttons, dialogs, etc.) */
  actions?: ReactNode;

  /** Pass false to suppress the auto-prepended Home breadcrumb */
  showHome?: boolean;
}

export function PageHeader({
  breadcrumbs,
  icon: Icon,
  iconBg = 'bg-gray-100',
  iconColor = 'text-gray-600',
  title,
  badge,
  description,
  actions,
  showHome = true,
}: PageHeaderProps) {
  return (
    <>
      <Breadcrumbs items={breadcrumbs} showHome={showHome} />

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {Icon && (
              <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-gray-600 mt-1">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}
