import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { StateBadge } from './StateBadge';
import { MemberState, Participant, getParticipantsByState, getProgramFunnelConfig, getCircleFunnelConfig } from '@/lib/participant-states';
import { Loader2, Eye, Users as UsersIcon } from 'lucide-react';

interface ParticipantStateCardProps {
  programId?: string;
  circleId?: string;
  state: MemberState;
  onViewMembers?: (state: string, members: Participant[]) => void;
  compact?: boolean;
}

export function ParticipantStateCard({ 
  programId, 
  circleId, 
  state,
  onViewMembers,
  compact = false
}: ParticipantStateCardProps) {
  const [count, setCount] = useState<number>(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Check if this state is enabled in the funnel config
        if (programId) {
          const config = await getProgramFunnelConfig(programId);
          if (config && !config.enabled_states.includes(state.id)) {
            setIsEnabled(false);
            setIsLoading(false);
            return;
          }
        } else if (circleId) {
          const config = await getCircleFunnelConfig(circleId);
          if (config && !config.enabled_states.includes(state.id)) {
            setIsEnabled(false);
            setIsLoading(false);
            return;
          }
        }

        // Load participants in this state
        const data = await getParticipantsByState(
          programId || null,
          circleId || null,
          state.id
        );
        
        setParticipants(data);
        setCount(data.length);
      } catch (error) {
        console.error('Error loading participant state:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [programId, circleId, state.id]);

  if (!isEnabled) {
    return null; // Don't show disabled states
  }

  const handleViewClick = () => {
    if (onViewMembers) {
      onViewMembers(state.id, participants);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleViewClick}
        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <StateBadge state={state} size="sm" />
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <span className="text-2xl font-bold text-gray-900">{count}</span>
          )}
        </div>
        <div className="text-xs text-gray-600 line-clamp-1">
          {state.description}
        </div>
      </button>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <StateBadge state={state} />
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : (
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold text-gray-900">{count}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {state.description}
        </p>
        
        {count > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewClick}
            className="w-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Members
          </Button>
        )}
        
        {count === 0 && (
          <div className="text-xs text-gray-500 text-center py-2">
            No members in this state
          </div>
        )}
      </CardContent>
    </Card>
  );
}