import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { MemberState, Participant, bulkChangeParticipantStates, getAllMemberStates } from '@/lib/participant-states';
import { StateBadge } from './StateBadge';
import { toast } from 'sonner';
import { Loader2, Users, AlertCircle } from 'lucide-react';

interface BulkStateChangeProps {
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentUserId: string;
  enabledStates?: string[];
}

export function BulkStateChange({
  participants,
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  enabledStates
}: BulkStateChangeProps) {
  const [selectedState, setSelectedState] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableStates, setAvailableStates] = useState<MemberState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available states
  useEffect(() => {
    async function loadStates() {
      try {
        const states = await getAllMemberStates();
        
        // Filter by enabled states if provided
        const filtered = enabledStates 
          ? states.filter(s => enabledStates.includes(s.id))
          : states;
        
        setAvailableStates(filtered);
      } catch (error) {
        console.error('Error loading states:', error);
        toast.error('Failed to load available states');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isOpen) {
      loadStates();
    }
  }, [isOpen, enabledStates]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedState('');
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedState || !reason.trim()) {
      toast.error('Please select a state and provide a reason');
      return;
    }

    if (participants.length === 0) {
      toast.error('No participants selected');
      return;
    }

    setIsSubmitting(true);
    try {
      const participantIds = participants.map(p => p.id);
      
      await bulkChangeParticipantStates(
        participantIds,
        selectedState,
        currentUserId,
        reason
      );

      toast.success(`Successfully updated ${participants.length} member${participants.length > 1 ? 's' : ''}`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error changing states:', error);
      toast.error('Failed to change member states');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique current states
  const currentStates = Array.from(new Set(participants.map(p => p.current_state)))
    .map(stateId => availableStates.find(s => s.id === stateId))
    .filter(Boolean) as MemberState[];

  const selectedStateObj = availableStates.find(s => s.id === selectedState);

  // Group states by category
  const statesByCategory = availableStates.reduce((acc, state) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Change Member States
          </DialogTitle>
          <DialogDescription>
            Update the state for {participants.length} selected member{participants.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-yellow-900 text-sm">
                Bulk State Change
              </div>
              <div className="text-sm text-yellow-800 mt-1">
                This will change the state for all {participants.length} selected members. 
                This action will be recorded in each member's audit trail.
              </div>
            </div>
          </div>

          {/* Current States Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Current States ({participants.length} members):
            </div>
            <div className="flex flex-wrap gap-2">
              {currentStates.map(state => (
                <div key={state.id} className="flex items-center gap-2">
                  <StateBadge state={state} size="sm" />
                  <span className="text-xs text-gray-600">
                    ({participants.filter(p => p.current_state === state.id).length})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Members Preview */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              Selected Members:
            </div>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
              {participants.slice(0, 10).map(participant => (
                <div 
                  key={participant.id} 
                  className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0"
                >
                  {participant.user?.avatar_url && (
                    <img 
                      src={participant.user.avatar_url} 
                      alt={participant.user.name}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {participant.user?.name}
                    </div>
                  </div>
                  {participant.state && (
                    <StateBadge state={participant.state} size="sm" />
                  )}
                </div>
              ))}
              {participants.length > 10 && (
                <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50">
                  + {participants.length - 10} more members
                </div>
              )}
            </div>
          </div>

          {/* State Selection */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Change All To:
              </label>
              
              <div className="space-y-4">
                {Object.entries(statesByCategory).map(([category, states]) => (
                  <div key={category}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {states.map(state => (
                        <button
                          key={state.id}
                          type="button"
                          onClick={() => setSelectedState(state.id)}
                          className={`
                            p-3 rounded-lg border-2 text-left transition-all
                            ${state.id === selectedState 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                        >
                          <StateBadge state={state} size="sm" />
                          <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                            {state.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason (Required) */}
          <div>
            <label htmlFor="bulk-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Bulk Change <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bulk-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you changing these members' states? (This will be recorded in all audit trails)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              This reason will be visible in all affected members' state histories
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!selectedState || !reason.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating {participants.length} members...
                </>
              ) : (
                `Update ${participants.length} Member${participants.length > 1 ? 's' : ''}`
              )}
            </Button>
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
