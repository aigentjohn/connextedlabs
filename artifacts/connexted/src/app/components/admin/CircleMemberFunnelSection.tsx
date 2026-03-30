import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Users, Settings, TrendingUp, Eye, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ParticipantStateCard } from '@/app/components/participants/ParticipantStateCard';
import { StateSuggestionsCard } from '@/app/components/participants/StateSuggestionsCard';
import { 
  MemberState,
  getAllMemberStates,
  getCircleFunnelConfig,
  getEngagementMetrics,
  Participant
} from '@/lib/participant-states';

interface CircleMemberFunnelSectionProps {
  circle: {
    id: string;
    name: string;
  };
  currentUserId: string;
  onViewMembers?: (circleId: string, stateId: string, members: Participant[]) => void;
}

export function CircleMemberFunnelSection({ 
  circle, 
  currentUserId,
  onViewMembers
}: CircleMemberFunnelSectionProps) {
  const [allStates, setAllStates] = useState<MemberState[]>([]);
  const [enabledStates, setEnabledStates] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, [circle.id]);

  async function loadData() {
    try {
      setIsLoading(true);
      
      // Load all states
      const states = await getAllMemberStates();
      setAllStates(states);
      
      // Load funnel configuration
      const config = await getCircleFunnelConfig(circle.id);
      if (config) {
        setEnabledStates(config.enabled_states);
      } else {
        // Default states for circles if no config exists
        setEnabledStates(['enrolled', 'new', 'active', 'occasional', 'inactive', 'alumni']);
      }
      
      // Load metrics
      const metricsData = await getEngagementMetrics(undefined, circle.id);
      setMetrics(metricsData);
      
    } catch (error) {
      console.error('Error loading circle funnel data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewMembers = (stateId: string, members: Participant[]) => {
    if (onViewMembers) {
      onViewMembers(circle.id, stateId, members);
    }
  };

  const enabledStateObjects = allStates.filter(s => enabledStates.includes(s.id));
  
  // Group states by category
  const engagementStates = enabledStateObjects.filter(s => s.category === 'engagement');
  const hasEnabledStates = enabledStateObjects.length > 0;

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading member funnel...
      </div>
    );
  }

  if (!hasEnabledStates) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50 text-center">
        <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 mb-4">
          No member funnel configured for this circle yet
        </p>
        <Link to={`/admin/circles/${circle.id}/funnel-config`}>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Configure Funnel
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900">{circle.name}</h3>
              <p className="text-sm text-gray-600">
                {metrics ? `${metrics.total_participants} members • ${metrics.avg_attendance_rate.toFixed(0)}% avg attendance` : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/admin/circles/${circle.id}/funnel-config`} onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                Configure
              </Button>
            </Link>
            <Link to={`/admin/circles/${circle.id}/members`} onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                View All
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              <ArrowRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-2xl font-bold text-gray-900">{metrics.total_participants}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-700">Active</div>
                <div className="text-2xl font-bold text-green-900">{metrics.active_count}</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-700">At Risk</div>
                <div className="text-2xl font-bold text-orange-900">{metrics.at_risk_count}</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-700">Inactive</div>
                <div className="text-2xl font-bold text-red-900">{metrics.inactive_count}</div>
              </div>
            </div>
          )}

          {/* Auto-Suggestions */}
          <StateSuggestionsCard
            circleId={circle.id}
            currentUserId={currentUserId}
            onRefresh={loadData}
          />

          {/* Member States */}
          {engagementStates.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Member Engagement</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {engagementStates.map(state => (
                  <ParticipantStateCard
                    key={state.id}
                    circleId={circle.id}
                    state={state}
                    onViewMembers={handleViewMembers}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
