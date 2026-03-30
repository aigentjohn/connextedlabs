import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ArrowRight, Lock, CheckCircle2, Clock } from 'lucide-react';

interface JourneyProgress {
  journey_id: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface Journey {
  id: string;
  program_id: string;
  title: string;
  description: string;
  order_index: number;
  status: 'not-started' | 'in-progress' | 'completed';
  start_date: string | null;
  finish_date: string | null;
}

interface JourneyCardsViewProps {
  journeys: Journey[];
  journeyProgress: Record<string, JourneyProgress>;
  onSelectJourney: (journeyId: string) => void;
  overallProgress: number;
  completedJourneys: number;
  totalJourneys: number;
}

export function JourneyCardsView({
  journeys,
  journeyProgress,
  onSelectJourney,
  overallProgress,
  completedJourneys,
  totalJourneys,
}: JourneyCardsViewProps) {
  
  const getJourneyStatusIcon = (journey: Journey, progress: JourneyProgress | undefined) => {
    if (progress?.status === 'completed' || journey.status === 'completed') {
      return <CheckCircle2 className="w-6 h-6 text-green-600" />;
    }
    if (progress?.status === 'in_progress' || journey.status === 'in-progress') {
      return <Clock className="w-6 h-6 text-blue-600" />;
    }
    // Check if previous journey is not completed (locked)
    if (journey.order_index > 0) {
      const previousJourney = journeys.find(j => j.order_index === journey.order_index - 1);
      const previousProgress = previousJourney ? journeyProgress[previousJourney.id] : null;
      if (previousProgress && previousProgress.status !== 'completed' && previousJourney?.status !== 'completed') {
        return <Lock className="w-6 h-6 text-gray-400" />;
      }
    }
    return <Clock className="w-6 h-6 text-gray-400" />;
  };

  const isJourneyLocked = (journey: Journey) => {
    if (journey.order_index === 0) return false; // First journey is always unlocked
    const previousJourney = journeys.find(j => j.order_index === journey.order_index - 1);
    if (!previousJourney) return false;
    const previousProgress = journeyProgress[previousJourney.id];
    return previousProgress?.status !== 'completed' && previousJourney.status !== 'completed';
  };

  const getJourneyEmoji = (index: number) => {
    const emojis = ['🎯', '💡', '✅', '🏗️', '🚀', '🎨', '📊', '🔬'];
    return emojis[index % emojis.length];
  };

  return (
    <div className="py-8">
      {/* Overall Progress */}
      <div className="mb-8 p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-indigo-900">
            Your Journey Progress
          </h2>
          <span className="text-sm font-semibold text-indigo-700">
            {completedJourneys} / {totalJourneys} Journeys • {overallProgress}%
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-3">
          <div 
            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Journey Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {journeys.map((journey, index) => {
          const progress = journeyProgress[journey.id];
          const isLocked = isJourneyLocked(journey);
          const isCompleted = progress?.status === 'completed' || journey.status === 'completed';
          const isInProgress = progress?.status === 'in_progress' || journey.status === 'in-progress';
          const completionPercentage = progress?.completion_percentage || 0;

          return (
            <Card 
              key={journey.id}
              className={`relative transition-all duration-200 ${
                isLocked 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:shadow-lg cursor-pointer'
              } ${
                isCompleted ? 'border-green-300 bg-green-50/50' : 
                isInProgress ? 'border-blue-300 bg-blue-50/50' : 
                'border-gray-200'
              }`}
              onClick={() => !isLocked && onSelectJourney(journey.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getJourneyEmoji(index)}</span>
                    <div>
                      <CardTitle className="text-xl">{journey.title}</CardTitle>
                      {journey.start_date && journey.finish_date && (
                        <CardDescription className="text-xs mt-1">
                          {new Date(journey.start_date).toLocaleDateString()} - {new Date(journey.finish_date).toLocaleDateString()}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {getJourneyStatusIcon(journey, progress)}
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {journey.description || 'Explore this journey to unlock new skills and knowledge'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Progress Bar */}
                {!isLocked && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">
                        Progress
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        {progress?.completed_items || 0} of {progress?.total_items || 0} items • {Math.round(completionPercentage)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-green-600' : 
                          isInProgress ? 'bg-blue-600' : 
                          'bg-gray-400'
                        }`}
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  {isLocked ? (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      Locked
                    </Badge>
                  ) : isCompleted ? (
                    <Badge className="text-xs bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  ) : isInProgress ? (
                    <Badge className="text-xs bg-blue-600">
                      <Clock className="w-3 h-3 mr-1" />
                      In Progress
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Not Started
                    </Badge>
                  )}

                  {!isLocked && (
                    <Button 
                      size="sm" 
                      variant={isInProgress ? 'default' : 'outline'}
                      className="ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJourney(journey.id);
                      }}
                    >
                      {isInProgress ? 'Continue' : 'Open'}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {journeys.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Journeys Yet</h3>
          <p className="text-gray-600">
            This program doesn't have any journeys set up yet.
          </p>
        </div>
      )}
    </div>
  );
}