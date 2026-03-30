import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { StateBadge } from './StateBadge';
import { ChangeStateDialog } from './ChangeStateDialog';
import { 
  StateSuggestion, 
  Participant,
  getProgramStateSuggestions, 
  getCircleStateSuggestions,
  getParticipant,
  getAllMemberStates,
  MemberState
} from '@/lib/participant-states';
import { Loader2, AlertTriangle, TrendingDown, Clock, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface StateSuggestionsCardProps {
  programId?: string;
  circleId?: string;
  currentUserId: string;
  onRefresh?: () => void;
}

export function StateSuggestionsCard({ 
  programId, 
  circleId,
  currentUserId,
  onRefresh
}: StateSuggestionsCardProps) {
  const [suggestions, setSuggestions] = useState<StateSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [states, setStates] = useState<Map<string, MemberState>>(new Map());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  // For change state dialog
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadSuggestions();
    loadStates();
  }, [programId, circleId]);

  async function loadSuggestions() {
    try {
      setIsLoading(true);
      let data: StateSuggestion[] = [];
      
      if (programId) {
        data = await getProgramStateSuggestions(programId);
      } else if (circleId) {
        data = await getCircleStateSuggestions(circleId);
      }
      
      setSuggestions(data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load state suggestions');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStates() {
    try {
      const statesData = await getAllMemberStates();
      const statesMap = new Map<string, MemberState>();
      statesData.forEach(state => statesMap.set(state.id, state));
      setStates(statesMap);
    } catch (error) {
      console.error('Error loading states:', error);
    }
  }

  const handleApplySuggestion = async (suggestion: StateSuggestion) => {
    try {
      const participant = await getParticipant(suggestion.participant_id);
      if (participant) {
        setSelectedParticipant(participant);
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error loading participant:', error);
      toast.error('Failed to load participant details');
    }
  };

  const handleDismiss = (participantId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, participantId]));
  };

  const handleSuccess = () => {
    loadSuggestions();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(
    s => !dismissedSuggestions.has(s.participant_id)
  );

  // Group by severity
  const highPriority = visibleSuggestions.filter(s => s.severity === 'high');
  const mediumPriority = visibleSuggestions.filter(s => s.severity === 'medium');
  const lowPriority = visibleSuggestions.filter(s => s.severity === 'low');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Suggested State Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Suggested State Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No state changes suggested at this time</div>
            <div className="text-xs mt-1">All members are appropriately categorized</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderSuggestion = (suggestion: StateSuggestion) => {
    const currentState = states.get(suggestion.current_state);
    const suggestedState = states.get(suggestion.suggested_state);
    
    const severityConfig = {
      high: {
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600'
      },
      medium: {
        icon: TrendingDown,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600'
      },
      low: {
        icon: Clock,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600'
      }
    };

    const config = severityConfig[suggestion.severity as keyof typeof severityConfig];
    const Icon = config.icon;

    return (
      <div
        key={suggestion.participant_id}
        className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
          
          <div className="flex-1 min-w-0">
            {/* State change preview */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {currentState && <StateBadge state={currentState} size="sm" />}
              <ArrowRight className="w-4 h-4 text-gray-400" />
              {suggestedState && <StateBadge state={suggestedState} size="sm" />}
            </div>
            
            {/* Reason */}
            <div className="text-sm text-gray-700 mb-3">
              {suggestion.reason}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleApplySuggestion(suggestion)}
                className="text-xs"
              >
                Review & Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(suggestion.participant_id)}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Suggested State Changes
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {visibleSuggestions.length} suggestion{visibleSuggestions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* High Priority */}
            {highPriority.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  High Priority ({highPriority.length})
                </div>
                <div className="space-y-2">
                  {highPriority.map(renderSuggestion)}
                </div>
              </div>
            )}
            
            {/* Medium Priority */}
            {mediumPriority.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Medium Priority ({mediumPriority.length})
                </div>
                <div className="space-y-2">
                  {mediumPriority.map(renderSuggestion)}
                </div>
              </div>
            )}
            
            {/* Low Priority */}
            {lowPriority.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Low Priority ({lowPriority.length})
                </div>
                <div className="space-y-2">
                  {lowPriority.map(renderSuggestion)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change State Dialog */}
      <ChangeStateDialog
        participant={selectedParticipant}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedParticipant(null);
        }}
        onSuccess={handleSuccess}
        currentUserId={currentUserId}
      />
    </>
  );
}
