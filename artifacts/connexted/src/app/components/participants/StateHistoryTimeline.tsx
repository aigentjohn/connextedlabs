import { useState, useEffect } from 'react';
import { StateHistoryEntry, getParticipantStateHistory, getAllMemberStates, MemberState } from '@/lib/participant-states';
import { StateBadge } from './StateBadge';
import { formatDistanceToNow } from 'date-fns';
import { Clock, User, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface StateHistoryTimelineProps {
  participantId: string;
  maxItems?: number;
  showExpand?: boolean;
}

export function StateHistoryTimeline({ 
  participantId, 
  maxItems = 5,
  showExpand = true 
}: StateHistoryTimelineProps) {
  const [history, setHistory] = useState<StateHistoryEntry[]>([]);
  const [states, setStates] = useState<Map<string, MemberState>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const [historyData, statesData] = await Promise.all([
          getParticipantStateHistory(participantId),
          getAllMemberStates()
        ]);
        
        setHistory(historyData);
        
        const statesMap = new Map<string, MemberState>();
        statesData.forEach(state => statesMap.set(state.id, state));
        setStates(statesMap);
      } catch (error) {
        console.error('Error loading state history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [participantId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <div className="text-sm">No state history available</div>
      </div>
    );
  }

  // Show limited items or all based on expand state
  const displayedHistory = isExpanded ? history : history.slice(0, maxItems);
  const hasMore = history.length > maxItems;

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gray-200" />
        
        {/* History entries */}
        <div className="space-y-4">
          {displayedHistory.map((entry, index) => {
            const toState = states.get(entry.to_state);
            const fromState = entry.from_state ? states.get(entry.from_state) : null;
            
            return (
              <div key={index} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative flex-shrink-0">
                  <div className={`
                    w-9 h-9 rounded-full border-2 flex items-center justify-center
                    ${entry.auto 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white border-gray-300'
                    }
                  `}>
                    {entry.auto ? (
                      <Bot className="w-4 h-4 text-blue-600" />
                    ) : (
                      <User className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Entry content */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
                  {/* State change */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {fromState && (
                      <>
                        <StateBadge state={fromState} size="sm" />
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    {toState && <StateBadge state={toState} size="sm" />}
                  </div>

                  {/* Reason */}
                  <div className="text-sm text-gray-700 mb-3">
                    {entry.reason}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                    </div>
                    
                    {entry.auto ? (
                      <div className="flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        Auto-suggestion
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Manual change
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand/Collapse */}
      {showExpand && hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show {history.length - maxItems} More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
