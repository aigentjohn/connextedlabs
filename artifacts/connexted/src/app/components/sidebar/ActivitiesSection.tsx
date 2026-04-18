/**
 * ActivitiesSection Component
 *
 * COMMON ACTIVITIES — all container types (collaborative spaces / aggregators).
 *
 * Classification rule:
 *   Containers HOLD other things or have members/participants.
 *   - Playlists contain Episodes → container
 *   - Magazines contain Blogs   → container
 *   - Builds, Pitches, Checklists, Prompts → collaborative workspaces → containers
 *
 * Source of truth: /src/lib/taxonomy.ts › CONTAINER_TAXONOMY
 */

import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { ContainerAccordion } from './ContainerAccordion';
import { CONTAINER_TAXONOMY } from '@/lib/taxonomy';

// Per-key overrides that can't live in TaxonomyEntry (UI-only concerns)
const CONTAINER_OVERRIDES: Record<string, {
  iconColor?: string;
  itemPathKey?: 'slug' | 'id';
  getItemName?: (item: any) => string;
}> = {
  prompts:    { iconColor: 'text-purple-600', getItemName: (item) => item.name || item.title },
  magazines:  { itemPathKey: 'id' },
  checklists: { itemPathKey: 'id' },
};

interface ActivitiesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  /** Map from container key to items array, e.g. { elevators: [...], tables: [...] } */
  containerItems: Record<string, any[]>;
}

export function ActivitiesSection({
  isExpanded,
  onToggle,
  expandedSections,
  toggleSection,
  containerItems,
}: ActivitiesSectionProps) {
  const totalContainers = CONTAINER_TAXONOMY.reduce(
    (sum, entry) => sum + (containerItems[entry.key]?.length || 0),
    0
  );

  if (totalContainers === 0) return null;

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
        <Zap className="w-4 h-4 text-yellow-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">COMMON CONTAINERS</span>
        <span className="text-xs text-gray-500">({totalContainers})</span>
      </button>

      {isExpanded && (
        <div className="ml-3 mt-0.5 space-y-0.5">
          {[...CONTAINER_TAXONOMY]
            .sort((a, b) => a.labelPlural.localeCompare(b.labelPlural))
            .map((entry) => {
              const items = containerItems[entry.key] || [];
              if (items.length === 0) return null;

              const sectionKey = `activity-container-${entry.key}`;
              const overrides = CONTAINER_OVERRIDES[entry.key] ?? {};

              return (
                <ContainerAccordion
                  key={entry.key}
                  sectionKey={sectionKey}
                  basePath={entry.path}
                  icon={entry.icon}
                  label={entry.labelPlural}
                  items={items}
                  isExpanded={expandedSections[sectionKey] || false}
                  onToggle={() => toggleSection(sectionKey)}
                  itemPathKey={overrides.itemPathKey}
                  getItemName={overrides.getItemName}
                  iconColor={overrides.iconColor}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}