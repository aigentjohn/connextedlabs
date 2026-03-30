// Split candidate: ~456 lines — consider extracting FunnelStageList, StageEditDialog, and FunnelPreviewFlow into sub-components.
import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { StateBadge } from '@/app/components/participants/StateBadge';
import { 
  MemberState, 
  FunnelConfiguration,
  getAllMemberStates,
  getProgramFunnelConfig,
  getCircleFunnelConfig,
  updateFunnelConfig,
  createFunnelConfig
} from '@/lib/participant-states';
import { toast } from 'sonner';
import { Loader2, Save, Info, Check } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface FunnelConfigurationPageProps {
  programId?: string;
  circleId?: string;
  programName?: string;
  circleName?: string;
}

export function FunnelConfigurationPage({ 
  programId: programIdProp, 
  circleId: circleIdProp,
  programName,
  circleName
}: FunnelConfigurationPageProps) {
  // Allow the component to be used both as a routed page (reads useParams)
  // and as an embedded component (receives props directly).
  const params = useParams<{ programId?: string; circleId?: string }>();
  const programId = programIdProp ?? params.programId;
  const circleId = circleIdProp ?? params.circleId;

  const [allStates, setAllStates] = useState<MemberState[]>([]);
  const [config, setConfig] = useState<FunnelConfiguration | null>(null);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-suggestion settings
  const [attendanceThresholds, setAttendanceThresholds] = useState({
    active: 70,
    at_risk: 40,
    inactive: 40
  });
  const [timeSettings, setTimeSettings] = useState({
    new_member_days: 14,
    inactive_days: 60
  });

  useEffect(() => {
    loadData();
  }, [programId, circleId]);

  async function loadData() {
    try {
      setIsLoading(true);
      
      // Load all available states
      const states = await getAllMemberStates();
      setAllStates(states);
      
      // Load existing configuration
      let existingConfig: FunnelConfiguration | null = null;
      if (programId) {
        existingConfig = await getProgramFunnelConfig(programId);
      } else if (circleId) {
        existingConfig = await getCircleFunnelConfig(circleId);
      }
      
      if (existingConfig) {
        setConfig(existingConfig);
        setSelectedStates(new Set(existingConfig.enabled_states));
        
        // Load auto-suggestion settings
        if (existingConfig.auto_suggestions?.attendance_based) {
          setAttendanceThresholds({
            active: existingConfig.auto_suggestions.attendance_based.active_threshold || 70,
            at_risk: existingConfig.auto_suggestions.attendance_based.at_risk_threshold || 40,
            inactive: existingConfig.auto_suggestions.attendance_based.inactive_threshold || 40
          });
        }
        if (existingConfig.auto_suggestions?.time_based) {
          setTimeSettings({
            new_member_days: existingConfig.auto_suggestions.time_based.new_member_days || 14,
            inactive_days: existingConfig.auto_suggestions.time_based.inactive_days || 60
          });
        }
      } else {
        // Set defaults based on type
        const defaults = programId
          ? ['applied', 'approved', 'enrolled', 'active', 'at_risk', 'inactive', 'graduated']
          : ['enrolled', 'new', 'active', 'occasional', 'inactive', 'alumni'];
        
        setSelectedStates(new Set(defaults));
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load funnel configuration');
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleState = (stateId: string) => {
    setSelectedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateId)) {
        newSet.delete(stateId);
      } else {
        newSet.add(stateId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (selectedStates.size === 0) {
      toast.error('Please select at least one state');
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        enabled_states: Array.from(selectedStates),
        auto_suggestions: {
          attendance_based: {
            active_threshold: attendanceThresholds.active / 100,
            at_risk_threshold: attendanceThresholds.at_risk / 100,
            inactive_threshold: attendanceThresholds.inactive / 100
          },
          time_based: {
            new_member_days: timeSettings.new_member_days,
            inactive_days: timeSettings.inactive_days
          }
        }
      };

      if (config) {
        // Update existing
        await updateFunnelConfig(config.id, configData);
        toast.success('Funnel configuration updated');
      } else {
        // Create new
        await createFunnelConfig({
          program_id: programId,
          circle_id: circleId,
          ...configData
        });
        toast.success('Funnel configuration created');
      }
      
      // Reload
      await loadData();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Group states by category
  const statesByCategory = allStates.reduce((acc, state) => {
    if (!acc[state.category]) {
      acc[state.category] = [];
    }
    acc[state.category].push(state);
    return acc;
  }, {} as Record<string, MemberState[]>);

  const categoryLabels = {
    access: 'Access & Enrollment',
    engagement: 'Engagement',
    exit: 'Exit'
  };

  const categoryDescriptions = {
    access: 'States for managing how members join and get approved',
    engagement: 'States for tracking active participation and engagement levels',
    exit: 'States for members who have completed or left the program/circle'
  };

  const entityName = programName || circleName || 'Funnel';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: entityName, href: programId ? `/admin/programs/${programId}` : `/admin/circles/${circleId}` },
            { label: 'Funnel Configuration' }
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configure Member Funnel
          </h1>
          <p className="text-gray-600">
            Choose which states to track for {entityName}. You can change these anytime.
          </p>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-blue-900 text-sm mb-1">
                  Flexible Member States
                </div>
                <div className="text-sm text-blue-800">
                  Select only the states that make sense for your workflow. You can manually move 
                  members between any enabled states at any time. Auto-suggestions are optional helpers, 
                  not enforced rules.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* State Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select States to Track</CardTitle>
            <CardDescription>
              Choose which member states you want to use. Only selected states will appear in your dashboards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(statesByCategory).map(([category, states]) => (
                <div key={category}>
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {states.map(state => (
                      <button
                        key={state.id}
                        onClick={() => handleToggleState(state.id)}
                        className={`
                          p-4 rounded-lg border-2 text-left transition-all
                          ${selectedStates.has(state.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <StateBadge state={state} />
                          {selectedStates.has(state.id) && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {state.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Suggestion Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Auto-Suggestion Settings (Optional)</CardTitle>
            <CardDescription>
              Configure thresholds for automatic state suggestions. These are helpers only - you always have final control.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Attendance-based */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Attendance-Based Suggestions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Active Threshold
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={attendanceThresholds.active}
                        onChange={(e) => setAttendanceThresholds(prev => ({
                          ...prev,
                          active: parseInt(e.target.value) || 0
                        }))}
                        min="0"
                        max="100"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">% attendance</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Suggest "Active" state
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      At Risk Threshold
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={attendanceThresholds.at_risk}
                        onChange={(e) => setAttendanceThresholds(prev => ({
                          ...prev,
                          at_risk: parseInt(e.target.value) || 0
                        }))}
                        min="0"
                        max="100"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">% attendance</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Suggest "At Risk" state
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inactive Threshold
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={attendanceThresholds.inactive}
                        onChange={(e) => setAttendanceThresholds(prev => ({
                          ...prev,
                          inactive: parseInt(e.target.value) || 0
                        }))}
                        min="0"
                        max="100"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">% attendance</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Suggest "Inactive" state (below this)
                    </p>
                  </div>
                </div>
              </div>

              {/* Time-based */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Time-Based Suggestions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Member Period
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={timeSettings.new_member_days}
                        onChange={(e) => setTimeSettings(prev => ({
                          ...prev,
                          new_member_days: parseInt(e.target.value) || 0
                        }))}
                        min="0"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      How long members are considered "new"
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inactive After
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={timeSettings.inactive_days}
                        onChange={(e) => setTimeSettings(prev => ({
                          ...prev,
                          inactive_days: parseInt(e.target.value) || 0
                        }))}
                        min="0"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Days of no activity before suggesting "Inactive"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedStates.size === 0}
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}