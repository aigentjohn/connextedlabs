import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { CheckCircle2, Loader2, Circle as CircleIcon, Calendar, CheckCircle } from 'lucide-react';
import { JourneyCircleSection } from './JourneyCircleSection';
import { JourneyContainersSection } from './JourneyContainersSection';

interface Journey {
  id: string;
  program_id: string;
  title: string;
  description: string;
  order_index: number;
  status: 'not-started' | 'in-progress' | 'completed';
  start_date: string | null;
  finish_date: string | null;
  circle_id: string | null;
  containers_template: any[];
  created_at: string;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  slug: string;
  member_ids: string[];
  image?: string;
  access_type?: string;
}

interface ContainerInstance {
  id: string;
  type: string;
  name: string;
  slug: string;
  program_id?: string;
  program_journey_id?: string;
}

interface JourneyCardProps {
  journey: Journey;
  circle: Circle | null;
  containers: ContainerInstance[];
  index?: number;
  isRecommendedNext?: boolean;
  isUpdating?: boolean;
  showConnectorLine?: boolean;
  onToggleComplete?: (journeyId: string, currentStatus: string) => void;
  onCreateContainer?: (journeyId: string, template: any) => void;
  compact?: boolean;
}

export function JourneyCard({
  journey,
  circle,
  containers,
  index,
  isRecommendedNext = false,
  isUpdating = false,
  showConnectorLine = false,
  onToggleComplete,
  onCreateContainer,
  compact = false,
}: JourneyCardProps) {
  const isCompleted = journey.status === 'completed';
  const isInProgress = journey.status === 'in-progress';
  const containerTemplates = journey.containers_template || [];

  return (
    <div className="relative">
      {/* Connector line */}
      {showConnectorLine && (
        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-200 -mb-6" />
      )}

      <Card className={`
        transition-all
        ${isRecommendedNext ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        ${isCompleted ? 'bg-gray-50' : ''}
      `}>
        <CardHeader>
          <div className="flex items-start gap-4">
            {/* Journey number & status */}
            {index !== undefined && (
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                ) : isInProgress ? (
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center relative">
                    <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                  </div>
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    isRecommendedNext ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CardTitle className="text-lg">{journey.title}</CardTitle>
                {isRecommendedNext && (
                  <Badge className="bg-blue-600">Recommended Next</Badge>
                )}
                {isInProgress && !isCompleted && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                    In Progress
                  </Badge>
                )}
                {isCompleted && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Complete
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm leading-relaxed">
                {journey.description}
              </CardDescription>
              {/* Date Range */}
              {(journey.start_date || journey.finish_date) && (
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {journey.start_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Start: {new Date(journey.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {journey.finish_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>End: {new Date(journey.finish_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Circle Section */}
          <JourneyCircleSection circle={circle} compact={compact} />

          {/* Containers Section */}
          <JourneyContainersSection
            templates={containerTemplates}
            instances={containers}
            journeyTitle={journey.title}
            onCreateContainer={onCreateContainer ? (template) => onCreateContainer(journey.id, template) : undefined}
            compact={compact}
          />

          {/* Journey actions */}
          {onToggleComplete && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => onToggleComplete(journey.id, journey.status)}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    {journey.status === 'completed' ? (
                      <>
                        <CircleIcon className="w-4 h-4 mr-2" />
                        Mark Incomplete
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Journey Complete
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
