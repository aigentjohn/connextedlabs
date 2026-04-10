// Split candidate: ~402 lines — consider extracting CircleStatsCards, CircleMembersPreview, and CircleRecentActivity into sub-components.
import { useState, useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router';
import { 
  Users, Settings, Calendar, TrendingUp, 
  AlertCircle, Eye, Plus, CalendarCheck, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/lib/uuid-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ParticipantStateCard } from '@/app/components/participants/ParticipantStateCard';
import { StateSuggestionsCard } from '@/app/components/participants/StateSuggestionsCard';
import { ChangeStateDialog } from '@/app/components/participants/ChangeStateDialog';
import { BulkStateChange } from '@/app/components/participants/BulkStateChange';
import { 
  Participant, 
  MemberState,
  getCircleParticipants,
  getCircleFunnelConfig,
  getAllMemberStates,
  getEngagementMetrics
} from '@/lib/participant-states';

interface Circle {
  id: string;
  name: string;
  description: string;
  access_type: string;
  member_ids: string[];
  admin_ids: string[];
}

export function CircleAdminDashboard() {
  const { circleId } = useParams<{ circleId: string }>();
  const { profile } = useAuth();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [enabledStates, setEnabledStates] = useState<string[]>([]);
  const [allStates, setAllStates] = useState<MemberState[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // For viewing members in a state
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [viewMembersDialogOpen, setViewMembersDialogOpen] = useState(false);
  
  // For change state dialog
  const [participantToChange, setParticipantToChange] = useState<Participant | null>(null);
  const [changeStateDialogOpen, setChangeStateDialogOpen] = useState(false);
  
  // For bulk change
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkChangeDialogOpen, setBulkChangeDialogOpen] = useState(false);

  useEffect(() => {
    if (circleId && profile && isValidUUID(circleId)) {
      loadData();
    }
  }, [circleId, profile]);

  // Validate circleId AFTER all hooks are called
  if (!circleId || !isValidUUID(circleId)) {
    return <Navigate to="/platform-admin/circles" replace />;
  }

  async function loadData() {
    if (!circleId) return;

    try {
      setIsLoading(true);

      // Load circle (critical — fail if this errors)
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select('*')
        .eq('id', circleId)
        .single();

      if (circleError) throw circleError;
      setCircle(circleData);

      // Load supporting data — failures here are non-critical
      const [config, states, participantsData, metricsData] = await Promise.allSettled([
        getCircleFunnelConfig(circleId),
        getAllMemberStates(),
        getCircleParticipants(circleId),
        getEngagementMetrics(undefined, circleId),
      ]);

      if (config.status === 'fulfilled' && config.value) {
        setEnabledStates(config.value.enabled_states);
      }
      if (states.status === 'fulfilled') {
        setAllStates(states.value);
      }
      if (participantsData.status === 'fulfilled') {
        setParticipants(participantsData.value);
      } else {
        console.warn('Could not load participants (table may not exist yet):', participantsData.reason);
      }
      if (metricsData.status === 'fulfilled') {
        setMetrics(metricsData.value);
      }

    } catch (error) {
      console.error('Error loading circle data:', error);
      toast.error('Failed to load circle data');
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewMembers = (stateId: string, members: Participant[]) => {
    setSelectedState(stateId);
    setSelectedParticipants(members);
    setViewMembersDialogOpen(true);
  };

  const handleChangeState = (participant: Participant) => {
    setParticipantToChange(participant);
    setChangeStateDialogOpen(true);
  };

  const handleBulkChange = () => {
    const selected = participants.filter(p => selectedForBulk.has(p.id));
    if (selected.length === 0) {
      toast.error('No members selected');
      return;
    }
    setBulkChangeDialogOpen(true);
  };

  const toggleBulkSelect = (participantId: string) => {
    setSelectedForBulk(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  if (!circleId || !profile) {
    return <div>Loading...</div>;
  }

  const enabledStateObjects = allStates.filter(s => enabledStates.includes(s.id));
  
  // Group states by category
  const accessStates = enabledStateObjects.filter(s => s.category === 'access');
  const engagementStates = enabledStateObjects.filter(s => s.category === 'engagement');
  const exitStates = enabledStateObjects.filter(s => s.category === 'exit');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Circles', href: '/circles' },
            { label: circle?.name || 'Circle' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {circle?.name}
            </h1>
            <p className="text-gray-600">{circle?.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/admin/circles/${circleId}/funnel-config`}>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configure Funnel
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.total_participants}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{metrics.active_count}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  At Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{metrics.at_risk_count}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Avg Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.avg_attendance_rate.toFixed(0)}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Auto-Suggestions */}
        {profile && (
          <div className="mb-8">
            <StateSuggestionsCard
              circleId={circleId}
              currentUserId={profile.id}
              onRefresh={loadData}
            />
          </div>
        )}

        {/* Member States - Access & Enrollment */}
        {accessStates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Access & Enrollment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {accessStates.map(state => (
                <ParticipantStateCard
                  key={state.id}
                  circleId={circleId}
                  state={state}
                  onViewMembers={handleViewMembers}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Member States - Engagement */}
        {engagementStates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Engagement Levels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {engagementStates.map(state => (
                <ParticipantStateCard
                  key={state.id}
                  circleId={circleId}
                  state={state}
                  onViewMembers={handleViewMembers}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Member States - Exit */}
        {exitStates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Exit States
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {exitStates.map(state => (
                <ParticipantStateCard
                  key={state.id}
                  circleId={circleId}
                  state={state}
                  onViewMembers={handleViewMembers}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Members Dialog */}
      {viewMembersDialogOpen && selectedParticipants && profile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Members ({selectedParticipants.length})
                </h2>
                <div className="flex items-center gap-2">
                  {selectedForBulk.size > 0 && (
                    <Button onClick={handleBulkChange}>
                      Change {selectedForBulk.size} State{selectedForBulk.size > 1 ? 's' : ''}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setViewMembersDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-2">
                {selectedParticipants.map(participant => (
                  <div 
                    key={participant.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedForBulk.has(participant.id)}
                      onChange={() => toggleBulkSelect(participant.id)}
                      className="h-4 w-4"
                    />
                    {participant.user?.avatar_url && (
                      <img 
                        src={participant.user.avatar_url} 
                        alt={participant.user.name}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{participant.user?.name}</div>
                      <div className="text-sm text-gray-600">{participant.user?.email}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {participant.attendance_rate.toFixed(0)}% attendance
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChangeState(participant)}
                    >
                      Change State
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change State Dialog */}
      {profile && (
        <ChangeStateDialog
          participant={participantToChange}
          isOpen={changeStateDialogOpen}
          onClose={() => {
            setChangeStateDialogOpen(false);
            setParticipantToChange(null);
          }}
          onSuccess={loadData}
          currentUserId={profile.id}
          enabledStates={enabledStates}
        />
      )}

      {/* Bulk Change Dialog */}
      {profile && (
        <BulkStateChange
          participants={participants.filter(p => selectedForBulk.has(p.id))}
          isOpen={bulkChangeDialogOpen}
          onClose={() => {
            setBulkChangeDialogOpen(false);
            setSelectedForBulk(new Set());
          }}
          onSuccess={() => {
            loadData();
            setSelectedForBulk(new Set());
          }}
          currentUserId={profile.id}
          enabledStates={enabledStates}
        />
      )}
    </div>
  );
}