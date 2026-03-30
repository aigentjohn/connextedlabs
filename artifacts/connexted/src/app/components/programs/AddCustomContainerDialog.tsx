import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Info, Plus, Package, MessageSquare, Rocket, Calendar, MapPin, Zap, BookOpen, CheckSquare, Target } from 'lucide-react';
import { useNavigate } from 'react-router';

interface Journey {
  id: string;
  title: string;
  order_index: number;
}

interface AddCustomContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
  journeys: Journey[];
}

type ContainerType = 
  | 'builds'
  | 'tables'
  | 'pitches'
  | 'meetings'
  | 'meetups'
  | 'standups'
  | 'elevators'
  | 'sprints';

interface ContainerTypeInfo {
  type: ContainerType;
  label: string;
  icon: React.ReactNode;
  description: string;
  createRoute: string;
}

const CONTAINER_TYPES: ContainerTypeInfo[] = [
  {
    type: 'builds',
    label: 'Build (Project)',
    icon: <Package className="w-4 h-4" />,
    description: 'Collaborative project workspace',
    createRoute: '/builds/new'
  },
  {
    type: 'tables',
    label: 'Table (Discussion)',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'Discussion space for specific topics',
    createRoute: '/tables/new'
  },
  {
    type: 'pitches',
    label: 'Pitch (Presentation)',
    icon: <Rocket className="w-4 h-4" />,
    description: 'Present ideas and get feedback',
    createRoute: '/pitches/create'
  },
  {
    type: 'meetings',
    label: 'Meeting (Recurring)',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Recurring meeting or session',
    createRoute: '/meetings/create'
  },
  {
    type: 'meetups',
    label: 'Meetup (External)',
    icon: <MapPin className="w-4 h-4" />,
    description: 'External event or meetup',
    createRoute: '/meetups/create'
  },
  {
    type: 'standups',
    label: 'Standup (Daily Check-in)',
    icon: <Zap className="w-4 h-4" />,
    description: 'Daily or regular check-ins',
    createRoute: '/standups/create'
  },
  {
    type: 'elevators',
    label: 'Elevator (Quick Intro)',
    icon: <BookOpen className="w-4 h-4" />,
    description: 'Speed networking or quick intros',
    createRoute: '/elevators/create'
  },
  {
    type: 'sprints',
    label: 'Sprint (Time-boxed Work)',
    icon: <Target className="w-4 h-4" />,
    description: 'Focused sprint or challenge',
    createRoute: '/sprints/create'
  }
];

export default function AddCustomContainerDialog({
  open,
  onOpenChange,
  programId,
  programName,
  journeys
}: AddCustomContainerDialogProps) {
  const navigate = useNavigate();
  const [selectedContainerType, setSelectedContainerType] = useState<ContainerType | ''>('');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');

  const handleContinue = () => {
    if (!selectedContainerType) {
      return;
    }

    const containerInfo = CONTAINER_TYPES.find(c => c.type === selectedContainerType);
    if (!containerInfo) return;

    // Store context in localStorage for the create page to pick up
    localStorage.setItem('program_context', JSON.stringify({
      program_id: programId,
      program_journey_id: selectedJourneyId || null,
      program_name: programName,
      journey_title: journeys.find(j => j.id === selectedJourneyId)?.title || null,
      is_custom_addition: true, // Mark as custom (not from template)
      added_after_program_start: true
    }));

    // Navigate to the container creation page
    navigate(containerInfo.createRoute);
    onOpenChange(false);
  };

  const selectedType = CONTAINER_TYPES.find(c => c.type === selectedContainerType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Custom Container
          </DialogTitle>
          <DialogDescription>
            Add a container to "{programName}" that wasn't in the original template. This gives you flexibility to respond to participant needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Container Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="container-type">
              Container Type <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedContainerType} onValueChange={(value) => setSelectedContainerType(value as ContainerType)}>
              <SelectTrigger id="container-type">
                <SelectValue placeholder="Choose container type..." />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((containerType) => (
                  <SelectItem key={containerType.type} value={containerType.type}>
                    <div className="flex items-center gap-2">
                      {containerType.icon}
                      <span>{containerType.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedType.description}
              </p>
            )}
          </div>

          {/* Journey Assignment (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="journey">Journey Assignment (Optional)</Label>
            <Select value={selectedJourneyId} onValueChange={setSelectedJourneyId}>
              <SelectTrigger id="journey">
                <SelectValue placeholder="Not assigned to a specific journey" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Not assigned to a journey</SelectItem>
                {journeys
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((journey) => (
                    <SelectItem key={journey.id} value={journey.id}>
                      {journey.order_index + 1}. {journey.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Optionally assign this container to a specific journey within the program
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              After clicking Continue, you'll be taken to the container creation form where you can add details, set dates, and configure the container.
            </AlertDescription>
          </Alert>

          {/* Preview of what happens next */}
          {selectedType && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Next Steps:</p>
              <ol className="text-sm text-gray-600 space-y-1 ml-4 list-decimal">
                <li>Create your {selectedType.label.toLowerCase()}</li>
                <li>It will be automatically linked to this program</li>
                {selectedJourneyId && <li>It will appear in the selected journey</li>}
                <li>Program members will see it immediately</li>
              </ol>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleContinue}
            disabled={!selectedContainerType}
          >
            Continue to Create Container →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
