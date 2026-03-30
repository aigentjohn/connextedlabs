import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Plus } from 'lucide-react';
import ContainerCard from '@/app/components/shared/ContainerCard';

interface ContainerTemplate {
  type: string;
  name: string;
  status?: string;
}

interface ContainerInstance {
  id: string;
  type: string;
  name: string;
  slug: string;
  program_id?: string;
  program_journey_id?: string;
}

interface JourneyContainersSectionProps {
  templates: ContainerTemplate[];
  instances: ContainerInstance[];
  journeyTitle?: string;
  onCreateContainer?: (template: ContainerTemplate) => void;
  compact?: boolean;
}

export function JourneyContainersSection({
  templates,
  instances,
  journeyTitle,
  onCreateContainer,
  compact = false,
}: JourneyContainersSectionProps) {
  if (!templates || templates.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">
          Workflow Containers
        </div>
        <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
          <div className="text-sm text-gray-500 text-center">
            No containers defined for this journey
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        Workflow Containers ({templates.length} template{templates.length !== 1 ? 's' : ''}, {instances.length} created)
      </div>
      
      <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-4`}>
        {templates.map((template: ContainerTemplate, idx: number) => {
          // Check if this template container has been created
          const createdContainer = instances.find(c => 
            c.type === template.type && c.name === template.name
          );

          const containerLink = createdContainer 
            ? `/${createdContainer.type}/${createdContainer.slug || createdContainer.id}`
            : '#';

          const statusBadge = createdContainer
            ? { label: 'Created', color: 'bg-green-100 text-green-700' }
            : { label: 'Not Created', color: 'bg-gray-100 text-gray-600' };

          return (
            <div key={idx} className="relative">
              {createdContainer ? (
                <ContainerCard
                  id={createdContainer.id}
                  type={createdContainer.type}
                  name={createdContainer.name}
                  description={journeyTitle ? `Part of ${journeyTitle}` : undefined}
                  link={containerLink}
                  customBadge={statusBadge}
                  showJoinButton={false}
                />
              ) : (
                <Card 
                  className={`border-2 border-dashed border-gray-300 ${
                    onCreateContainer ? 'hover:border-blue-400 transition-colors cursor-pointer' : ''
                  }`}
                  onClick={() => onCreateContainer && onCreateContainer(template)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {template.type.replace('s', '')} • {onCreateContainer ? 'Click to create' : 'Not created'}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusBadge.color}>
                      {statusBadge.label}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
