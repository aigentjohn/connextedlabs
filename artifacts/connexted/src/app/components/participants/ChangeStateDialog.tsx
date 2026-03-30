import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { MemberState, Participant, changeParticipantState, getAllMemberStates } from '@/lib/participant-states';
import { StateBadge } from './StateBadge';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';

interface ChangeStateDialogProps {
  participant: Participant | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentUserId: string;
  enabledStates?: string[]; // Filter to only show these states
}

export function ChangeStateDialog({
  participant,
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  enabledStates
}: ChangeStateDialogProps) {
  const [selectedState, setSelectedState] = useState<string>('');
  const [reason, setReason] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
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
    if (isOpen && participant) {
      setSelectedState('');
      setReason('');
      setSendNotification(true);
    }
  }, [isOpen, participant]);

  const handleSubmit = async () => {
    if (!participant || !selectedState || !reason.trim()) {
      toast.error('Please select a state and provide a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await changeParticipantState(
        participant.id,
        selectedState,
        currentUserId,
        reason,
        false // Not auto-generated
      );

      toast.success('Member state updated successfully');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error changing state:', error);
      toast.error('Failed to change member state');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!participant) return null;

  const currentState = availableStates.find(s => s.id === participant.current_state);
  const newState = availableStates.find(s => s.id === selectedState);
  
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
          <DialogTitle>Change Member State</DialogTitle>
          <DialogDescription>
            Update the state for {participant.user?.name || 'this member'} with full audit trail
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current State */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Current State:</div>
            <div className="flex items-center gap-3">
              {currentState && <StateBadge state={currentState} size="lg" />}
              {selectedState && (
                <>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  {newState && <StateBadge state={newState} size="lg" />}
                </>
              )}
            </div>
          </div>

          {/* Member Info */}
          <div className="flex items-center gap-3">
            {participant.user?.avatar_url && (
              <img 
                src={participant.user.avatar_url} 
                alt={participant.user.name}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <div className="font-medium">{participant.user?.name}</div>
              <div className="text-sm text-gray-600">{participant.user?.email}</div>
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
                Select New State:
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
                          disabled={state.id === participant.current_state}
                          className={`
                            p-3 rounded-lg border-2 text-left transition-all
                            ${state.id === selectedState 
                              ? 'border-blue-500 bg-blue-50' 
                              : state.id === participant.current_state
                                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                        >
                          <StateBadge state={state} size="sm" />
                          <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                            {state.description}
                          </div>
                          {state.id === participant.current_state && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              (Current state)
                            </div>
                          )}
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
            <label htmlFor="state-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Change <span className="text-red-500">*</span>
            </label>
            <textarea
              id="state-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you changing this member's state? (This will be recorded in the audit trail)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              This reason will be visible in the member's state history and audit trail
            </div>
          </div>

          {/* Options */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">
                  Send notification email to member
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  Notify the member about their state change (Coming Soon)
                </div>
              </div>
            </label>
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
                  Updating...
                </>
              ) : (
                'Update State'
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
