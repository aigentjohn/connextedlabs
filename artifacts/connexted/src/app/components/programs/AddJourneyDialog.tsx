import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Loader2, Plus, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface Journey {
  id: string;
  title: string;
  order_index: number;
}

interface AddJourneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
  programStatus: 'not-started' | 'in-progress' | 'completed';
  existingJourneys: Journey[];
  onJourneyAdded: () => void;
}

type InsertPosition = 'end' | 'after' | 'before';

export default function AddJourneyDialog({
  open,
  onOpenChange,
  programId,
  programName,
  programStatus,
  existingJourneys,
  onJourneyAdded
}: AddJourneyDialogProps) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [insertPosition, setInsertPosition] = useState<InsertPosition>('end');
  const [insertAfterJourneyId, setInsertAfterJourneyId] = useState('');
  const [insertBeforeJourneyId, setInsertBeforeJourneyId] = useState('');
  const [notifyMembers, setNotifyMembers] = useState(true);
  const [markAsBonus, setMarkAsBonus] = useState(true);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInsertPosition('end');
    setInsertAfterJourneyId('');
    setInsertBeforeJourneyId('');
    setNotifyMembers(true);
    setMarkAsBonus(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a journey title');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate the order_index for the new journey
      let newOrderIndex = existingJourneys.length; // Default: append to end

      if (insertPosition === 'after' && insertAfterJourneyId) {
        const afterJourney = existingJourneys.find(j => j.id === insertAfterJourneyId);
        if (afterJourney) {
          newOrderIndex = afterJourney.order_index + 1;
        }
      } else if (insertPosition === 'before' && insertBeforeJourneyId) {
        const beforeJourney = existingJourneys.find(j => j.id === insertBeforeJourneyId);
        if (beforeJourney) {
          newOrderIndex = beforeJourney.order_index;
        }
      }

      // Step 1: Update order_index of subsequent journeys to make room
      if (insertPosition !== 'end') {
        const { error: reorderError } = await supabase
          .from('program_journeys')
          .update({ order_index: supabase.rpc('increment', { x: 1 }) })
          .eq('program_id', programId)
          .gte('order_index', newOrderIndex);

        if (reorderError) {
          console.error('Error reordering journeys:', reorderError);
          // Continue anyway - the UI will still work
        }
      }

      // Step 2: Insert the new journey
      const { data: newJourney, error: insertError } = await supabase
        .from('program_journeys')
        .insert({
          program_id: programId,
          title: title.trim(),
          description: description.trim() || null,
          order_index: newOrderIndex,
          status: 'not-started',
          is_bonus_content: markAsBonus,
          added_after_start: programStatus === 'in-progress',
          added_by: profile?.id,
          containers_template: [] // Empty - will add containers later
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Step 3: Log the change
      await supabase
        .from('program_change_log')
        .insert({
          program_id: programId,
          change_type: 'journey_added',
          changed_by: profile?.id,
          change_details: {
            journey_id: newJourney.id,
            journey_title: title.trim(),
            order_index: newOrderIndex,
            is_bonus: markAsBonus,
            added_during_status: programStatus
          }
        });

      // Step 4: Notify members (if requested)
      if (notifyMembers) {
        // Get all program members
        const { data: members } = await supabase
          .from('program_members')
          .select('user_id')
          .eq('program_id', programId)
          .neq('user_id', profile?.id); // Don't notify the person who added it

        if (members && members.length > 0) {
          // Create notifications for all members
          const notifications = members.map(member => ({
            user_id: member.user_id,
            type: 'program_update',
            title: `New Journey Added: ${title.trim()}`,
            message: `"${programName}" has been updated with new content: ${title.trim()}`,
            link: `/programs/${programId}`,
            created_at: new Date().toISOString()
          }));

          await supabase
            .from('notifications')
            .insert(notifications);
        }
      }

      toast.success(`Journey "${title.trim()}" added successfully!`);
      resetForm();
      onOpenChange(false);
      onJourneyAdded();

    } catch (error) {
      console.error('Error adding journey:', error);
      toast.error('Failed to add journey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Journey
          </DialogTitle>
          <DialogDescription>
            Extend "{programName}" with additional content. This journey will be available to all program members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Journey Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Journey Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Bonus Workshop: Advanced Pitching"
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what participants will learn or do in this journey..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {description.length}/500 characters
            </p>
          </div>

          {/* Insert Position */}
          <div className="space-y-3">
            <Label>Insert Position</Label>
            <RadioGroup value={insertPosition} onValueChange={(value) => setInsertPosition(value as InsertPosition)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="end" id="position-end" />
                <Label htmlFor="position-end" className="font-normal cursor-pointer">
                  At the end of the program
                </Label>
              </div>

              {existingJourneys.length > 0 && (
                <>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after" id="position-after" />
                    <Label htmlFor="position-after" className="font-normal cursor-pointer">
                      After a specific journey
                    </Label>
                  </div>

                  {insertPosition === 'after' && (
                    <div className="ml-6">
                      <Select value={insertAfterJourneyId} onValueChange={setInsertAfterJourneyId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select journey" />
                        </SelectTrigger>
                        <SelectContent>
                          {existingJourneys
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((journey) => (
                              <SelectItem key={journey.id} value={journey.id}>
                                {journey.order_index + 1}. {journey.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before" id="position-before" />
                    <Label htmlFor="position-before" className="font-normal cursor-pointer">
                      Before a specific journey
                    </Label>
                  </div>

                  {insertPosition === 'before' && (
                    <div className="ml-6">
                      <Select value={insertBeforeJourneyId} onValueChange={setInsertBeforeJourneyId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select journey" />
                        </SelectTrigger>
                        <SelectContent>
                          {existingJourneys
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((journey) => (
                              <SelectItem key={journey.id} value={journey.id}>
                                {journey.order_index + 1}. {journey.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t">
            <Label>Options</Label>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="mark-bonus"
                checked={markAsBonus}
                onCheckedChange={(checked) => setMarkAsBonus(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="mark-bonus"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Mark as bonus content
                </label>
                <p className="text-sm text-gray-500">
                  This journey will be labeled as optional/bonus content
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="notify"
                checked={notifyMembers}
                onCheckedChange={(checked) => setNotifyMembers(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="notify"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Notify program members
                </label>
                <p className="text-sm text-gray-500">
                  Send in-platform notification about the new content
                </p>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          {programStatus === 'in-progress' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This program is currently in-progress. The new journey will be immediately available to all participants.
              </AlertDescription>
            </Alert>
          )}

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Journey...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Journey
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
