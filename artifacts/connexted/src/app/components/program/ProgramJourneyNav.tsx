import { useState, useEffect } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/app/components/ui/utils';
import { CheckCircle2, Zap, Circle as CircleIcon } from 'lucide-react';

interface Journey {
  id: string;
  title: string;
  order_index: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface JourneyProgress {
  journey_id: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface ProgramJourneyNavProps {
  journeys: Journey[];
  selectedJourneyId: string | null;
  onSelectJourney: (journeyId: string) => void;
  currentJourneyProgress?: JourneyProgress | null;
  isAdmin?: boolean;
}

export default function ProgramJourneyNav({
  journeys,
  selectedJourneyId,
  onSelectJourney,
  currentJourneyProgress,
  isAdmin = false,
}: ProgramJourneyNavProps) {
  const [journeyProgresses, setJourneyProgresses] = useState<Record<string, JourneyProgress>>({});

  // Sort journeys by order_index
  const sortedJourneys = [...journeys].sort((a, b) => a.order_index - b.order_index);

  // Get icon for journey status
  const getJourneyIcon = (journey: Journey) => {
    const progress = journeyProgresses[journey.id];
    
    if (progress?.status === 'completed' || journey.status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    
    if (progress?.status === 'in_progress' || journey.status === 'in-progress') {
      return <Zap className="w-4 h-4 text-yellow-600" />;
    }
    
    return <CircleIcon className="w-4 h-4 text-gray-400" />;
  };

  // Get badge variant for journey
  const getJourneyBadgeVariant = (journey: Journey) => {
    const progress = journeyProgresses[journey.id];
    
    if (progress?.status === 'completed' || journey.status === 'completed') {
      return 'default';
    }
    
    if (progress?.status === 'in_progress' || journey.status === 'in-progress') {
      return 'secondary';
    }
    
    return 'outline';
  };

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Journey Label */}
        <div className="mb-2 sm:mb-3">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Journeys
          </h3>
        </div>

        {/* Journey Tabs - Horizontal Scrollable */}
        <div className="relative -mx-4 sm:mx-0">
          <div className="flex items-center gap-2 overflow-x-auto px-4 sm:px-0 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {sortedJourneys.map((journey, index) => {
              const progress = journeyProgresses[journey.id];
              const isSelected = selectedJourneyId === journey.id;
              const isCurrent = journey.status === 'in-progress' || progress?.status === 'in_progress';

              return (
                <button
                  key={journey.id}
                  onClick={() => onSelectJourney(journey.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border-2 transition-all whitespace-nowrap flex-shrink-0 text-sm',
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                    isCurrent && !isSelected && 'ring-2 ring-yellow-400 ring-offset-2'
                  )}
                >
                  {/* Icon */}
                  {getJourneyIcon(journey)}

                  {/* Journey Title */}
                  <span className="font-medium text-xs sm:text-sm">
                    {isAdmin && <span className="text-gray-400 mr-1 hidden sm:inline">{index + 1}.</span>}
                    {journey.title}
                  </span>

                  {/* Progress Badge (only if has progress) - Hide on very small screens */}
                  {progress && progress.total_items > 0 && (
                    <Badge 
                      variant={getJourneyBadgeVariant(journey)} 
                      className="ml-1 text-xs hidden xs:inline-block"
                    >
                      {progress.completion_percentage}%
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar for Selected Journey */}
        {selectedJourneyId && currentJourneyProgress && currentJourneyProgress.total_items > 0 && (
          <div className="mt-3 sm:mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-600">
                <span className="hidden sm:inline">{currentJourneyProgress.completed_items} of {currentJourneyProgress.total_items} completed</span>
                <span className="sm:hidden">{currentJourneyProgress.completed_items}/{currentJourneyProgress.total_items}</span>
              </span>
              <span className="font-semibold text-indigo-600">
                {currentJourneyProgress.completion_percentage}%
              </span>
            </div>
            <Progress 
              value={currentJourneyProgress.completion_percentage} 
              className="h-1.5 sm:h-2"
            />
          </div>
        )}

        {/* Empty State for Selected Journey */}
        {selectedJourneyId && (!currentJourneyProgress || currentJourneyProgress.total_items === 0) && (
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 italic">
            {isAdmin ? 'No items in this journey yet. Add content to get started.' : 'No content available in this journey yet.'}
          </div>
        )}
      </div>
    </div>
  );
}