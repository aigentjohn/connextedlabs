// Split candidate: ~577 lines — consider extracting StateTransitionTable, ScheduledActionsPanel, and BulkStateChangeForm into sub-components.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { AlertCircle, Lock, PlayCircle, PauseCircle, Snowflake, Ban, Archive, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface ContainerState {
  id: string;
  container_type: string;
  container_id: string;
  state: 'hidden' | 'active' | 'paused' | 'frozen' | 'suspended' | 'archived';
  state_reason?: string;
  state_changed_at?: string;
  state_changed_by?: string;
  // Paused config
  paused_allow_new_joins?: boolean;
  paused_resume_date?: string;
  paused_admins_can_override?: boolean;
  // Frozen config
  frozen_public_view?: boolean;
  frozen_members_can_post?: boolean;
  frozen_show_enrollment_closed?: boolean;
  frozen_guest_message?: string;
  frozen_allow_waitlist?: boolean;
  // Suspended config
  suspended_show_reason_to_members?: boolean;
  suspended_public_message?: string;
  suspended_internal_notes?: string;
  suspended_until?: string;
  // Archived config
  archived_completion_date?: string;
  archived_alumni_access?: boolean;
  archived_show_in_list?: boolean;
}

interface Props {
  containerType: string;
  containerId: string;
  containerName: string;
  onStateChange?: (newState: string) => void;
}

const STATE_INFO = {
  hidden: {
    icon: Lock,
    label: 'Hidden',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Invisible to members. Only admins can access (staging/prep mode).',
  },
  active: {
    icon: PlayCircle,
    label: 'Active',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Normal operations. All members can participate.',
  },
  paused: {
    icon: PauseCircle,
    label: 'Paused',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    description: 'Members can view but cannot post (seasonal breaks).',
  },
  frozen: {
    icon: Snowflake,
    label: 'Frozen',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Visible to everyone. No new members can join (closed enrollment).',
  },
  suspended: {
    icon: Ban,
    label: 'Suspended',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    description: 'Locked. Only platform admins can access (violations/emergencies).',
  },
  archived: {
    icon: Archive,
    label: 'Archived',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Completed. Members can view but not post (historical).',
  },
};

export function ContainerStateManager({ containerType, containerId, containerName, onStateChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [currentState, setCurrentState] = useState<ContainerState | null>(null);
  const [selectedState, setSelectedState] = useState<string>('active');
  const [stateReason, setStateReason] = useState('');
  
  // Paused config
  const [pausedAllowNewJoins, setPausedAllowNewJoins] = useState(false);
  const [pausedResumeDate, setPausedResumeDate] = useState('');
  const [pausedAdminsCanOverride, setPausedAdminsCanOverride] = useState(true);
  
  // Frozen config
  const [frozenPublicView, setFrozenPublicView] = useState(true);
  const [frozenMembersCanPost, setFrozenMembersCanPost] = useState(false);
  const [frozenShowEnrollmentClosed, setFrozenShowEnrollmentClosed] = useState(true);
  const [frozenGuestMessage, setFrozenGuestMessage] = useState('');
  const [frozenAllowWaitlist, setFrozenAllowWaitlist] = useState(false);
  
  // Suspended config
  const [suspendedShowReason, setSuspendedShowReason] = useState(false);
  const [suspendedPublicMessage, setSuspendedPublicMessage] = useState('');
  const [suspendedInternalNotes, setSuspendedInternalNotes] = useState('');
  const [suspendedUntil, setSuspendedUntil] = useState('');
  
  // Archived config
  const [archivedCompletionDate, setArchivedCompletionDate] = useState('');
  const [archivedAlumniAccess, setArchivedAlumniAccess] = useState(true);
  const [archivedShowInList, setArchivedShowInList] = useState(true);

  useEffect(() => {
    loadCurrentState();
  }, [containerType, containerId]);

  const loadCurrentState = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('container_states')
        .select('*')
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected for new containers)
        // PGRST205 = table not found (migration not applied yet)
        if (error.code === 'PGRST205') {
          console.warn('Container states table not found - feature not yet enabled');
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data) {
        setCurrentState(data);
        setSelectedState(data.state);
        setStateReason(data.state_reason || '');
        
        // Load paused config
        setPausedAllowNewJoins(data.paused_allow_new_joins || false);
        setPausedResumeDate(data.paused_resume_date || '');
        setPausedAdminsCanOverride(data.paused_admins_can_override !== false);
        
        // Load frozen config
        setFrozenPublicView(data.frozen_public_view !== false);
        setFrozenMembersCanPost(data.frozen_members_can_post || false);
        setFrozenShowEnrollmentClosed(data.frozen_show_enrollment_closed !== false);
        setFrozenGuestMessage(data.frozen_guest_message || '');
        setFrozenAllowWaitlist(data.frozen_allow_waitlist || false);
        
        // Load suspended config
        setSuspendedShowReason(data.suspended_show_reason_to_members || false);
        setSuspendedPublicMessage(data.suspended_public_message || '');
        setSuspendedInternalNotes(data.suspended_internal_notes || '');
        setSuspendedUntil(data.suspended_until || '');
        
        // Load archived config
        setArchivedCompletionDate(data.archived_completion_date || '');
        setArchivedAlumniAccess(data.archived_alumni_access !== false);
        setArchivedShowInList(data.archived_show_in_list !== false);
      } else {
        // Default to active if no state exists
        setSelectedState('active');
      }
    } catch (err: any) {
      console.error('Error loading container state:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const stateData: any = {
        container_type: containerType,
        container_id: containerId,
        state: selectedState,
        state_reason: stateReason || null,
        state_changed_at: new Date().toISOString(),
        state_changed_by: user.id,
        updated_at: new Date().toISOString(),
      };

      // Add state-specific config
      if (selectedState === 'paused') {
        stateData.paused_allow_new_joins = pausedAllowNewJoins;
        stateData.paused_resume_date = pausedResumeDate || null;
        stateData.paused_admins_can_override = pausedAdminsCanOverride;
      } else if (selectedState === 'frozen') {
        stateData.frozen_public_view = frozenPublicView;
        stateData.frozen_members_can_post = frozenMembersCanPost;
        stateData.frozen_show_enrollment_closed = frozenShowEnrollmentClosed;
        stateData.frozen_guest_message = frozenGuestMessage || null;
        stateData.frozen_allow_waitlist = frozenAllowWaitlist;
      } else if (selectedState === 'suspended') {
        stateData.suspended_show_reason_to_members = suspendedShowReason;
        stateData.suspended_public_message = suspendedPublicMessage || null;
        stateData.suspended_internal_notes = suspendedInternalNotes || null;
        stateData.suspended_until = suspendedUntil || null;
      } else if (selectedState === 'archived') {
        stateData.archived_completion_date = archivedCompletionDate || null;
        stateData.archived_alumni_access = archivedAlumniAccess;
        stateData.archived_show_in_list = archivedShowInList;
      }

      // Upsert (insert or update)
      const { error } = await supabase
        .from('container_states')
        .upsert(stateData, {
          onConflict: 'container_type,container_id',
        });

      if (error) throw error;

      // Create notification for members (if state changed)
      if (currentState && currentState.state !== selectedState) {
        await createStateChangeNotification(currentState.state, selectedState);
      }

      setSuccess(true);
      await loadCurrentState();
      
      if (onStateChange) {
        onStateChange(selectedState);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving container state:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createStateChangeNotification = async (oldState: string, newState: string) => {
    try {
      // Get all active members of this container
      const { data: members } = await supabase
        .from('container_memberships')
        .select('user_id')
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .eq('status', 'active');

      if (!members || members.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();

      // Create notification for each member
      const notifications = members.map(member => ({
        user_id: member.user_id,
        type: 'container.state_changed',
        title: `${containerName} is now ${STATE_INFO[newState as keyof typeof STATE_INFO].label}`,
        message: stateReason || STATE_INFO[newState as keyof typeof STATE_INFO].description,
        link: `/${containerType}s/${containerId}`,
        created_by: user?.id,
        created_at: new Date().toISOString(),
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (err) {
      console.error('Error creating notifications:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-500">Loading container state...</div>
        </CardContent>
      </Card>
    );
  }

  const currentStateInfo = STATE_INFO[selectedState as keyof typeof STATE_INFO];
  const CurrentIcon = currentStateInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Container State Management</CardTitle>
        <CardDescription>
          Control visibility and access for {containerName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Container state updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Current State Display */}
        <div className={`flex items-center gap-3 p-4 rounded-lg ${currentStateInfo.bgColor}`}>
          <CurrentIcon className={`w-6 h-6 ${currentStateInfo.color}`} />
          <div>
            <div className="font-semibold">Current State: {currentStateInfo.label}</div>
            <div className="text-sm text-gray-600">{currentStateInfo.description}</div>
          </div>
        </div>

        {/* State Selector */}
        <div className="space-y-3">
          <Label>Change State To:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(STATE_INFO).map(([key, info]) => {
              const Icon = info.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedState(key)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    selectedState === key
                      ? `border-${info.color.replace('text-', '')} ${info.bgColor}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${info.color}`} />
                  <div className="flex-1">
                    <div className="font-medium">{info.label}</div>
                    <div className="text-xs text-gray-600">{info.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Textarea
            value={stateReason}
            onChange={(e) => setStateReason(e.target.value)}
            placeholder="e.g., 'Winter break', 'Registration closed', 'Under review'"
            rows={2}
          />
        </div>

        {/* State-Specific Configuration */}
        {selectedState === 'paused' && (
          <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-900">Paused State Options</h4>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pausedAllowNewJoins}
                onChange={(e) => setPausedAllowNewJoins(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Allow new members to join during pause</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pausedAdminsCanOverride}
                onChange={(e) => setPausedAdminsCanOverride(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Admins can override and post</span>
            </label>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Auto-resume on (optional)
              </Label>
              <input
                type="datetime-local"
                value={pausedResumeDate}
                onChange={(e) => setPausedResumeDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        )}

        {selectedState === 'frozen' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900">Frozen State Options</h4>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={frozenPublicView}
                onChange={(e) => setFrozenPublicView(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Allow non-members (guests) to view content</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={frozenMembersCanPost}
                onChange={(e) => setFrozenMembersCanPost(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Current members can still post</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={frozenShowEnrollmentClosed}
                onChange={(e) => setFrozenShowEnrollmentClosed(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Show "Registration Closed" message</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={frozenAllowWaitlist}
                onChange={(e) => setFrozenAllowWaitlist(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Allow waitlist signups</span>
            </label>

            <div className="space-y-2">
              <Label>Custom message to non-members (optional)</Label>
              <Textarea
                value={frozenGuestMessage}
                onChange={(e) => setFrozenGuestMessage(e.target.value)}
                placeholder="e.g., 'This program is full. Applications open again in Fall 2026'"
                rows={2}
              />
            </div>
          </div>
        )}

        {selectedState === 'suspended' && (
          <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-900">Suspended State Options</h4>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={suspendedShowReason}
                onChange={(e) => setSuspendedShowReason(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Show reason to members</span>
            </label>

            <div className="space-y-2">
              <Label>Public message to members</Label>
              <Textarea
                value={suspendedPublicMessage}
                onChange={(e) => setSuspendedPublicMessage(e.target.value)}
                placeholder="e.g., 'This container is temporarily unavailable for maintenance'"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Internal notes (admin-only)</Label>
              <Textarea
                value={suspendedInternalNotes}
                onChange={(e) => setSuspendedInternalNotes(e.target.value)}
                placeholder="e.g., 'Investigating policy violation reported on 1/26/25'"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Suspended until (optional)
              </Label>
              <input
                type="datetime-local"
                value={suspendedUntil}
                onChange={(e) => setSuspendedUntil(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        )}

        {selectedState === 'archived' && (
          <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-900">Archived State Options</h4>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={archivedAlumniAccess}
                onChange={(e) => setArchivedAlumniAccess(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Alumni/members can view archived content</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={archivedShowInList}
                onChange={(e) => setArchivedShowInList(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Show in archive list</span>
            </label>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Completion date (optional)
              </Label>
              <input
                type="date"
                value={archivedCompletionDate}
                onChange={(e) => setArchivedCompletionDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || selectedState === currentState?.state}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Update State'}
          </Button>
          <Button
            variant="outline"
            onClick={loadCurrentState}
            disabled={saving}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}