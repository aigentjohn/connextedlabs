import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { 
  Target,
  MessageSquare,
  Users,
  Zap,
  Presentation,
  Briefcase,
  Rocket,
  Lightbulb,
  BookOpen,
  TrendingUp,
  Heart,
  Hammer,
} from 'lucide-react';

export interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'coaching' | 'leadership' | 'community' | 'accelerator' | 'custom';
  icon: any;
  containers: Array<{
    type: 'builds' | 'elevators' | 'tables' | 'standups' | 'pitches' | 'meetings';
    name: string;
  }>;
}

export const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  // Coaching Journey Templates
  {
    id: 'onboarding',
    name: 'Client Onboarding',
    description: 'Welcome new coaching clients with introductions and goal setting',
    category: 'coaching',
    icon: Heart,
    containers: [
      { type: 'elevators', name: 'Member Introductions' },
      { type: 'tables', name: 'Goal Tracking Board' },
    ],
  },
  {
    id: 'group-session',
    name: 'Group Coaching Session',
    description: 'Structured group coaching with hot seats and peer feedback',
    category: 'coaching',
    icon: Users,
    containers: [
      { type: 'standups', name: 'Weekly Check-ins' },
      { type: 'meetings', name: 'Group Coaching Session' },
      { type: 'builds', name: 'Action Plans' },
    ],
  },
  {
    id: 'accountability',
    name: 'Accountability Sprint',
    description: 'Focused accountability period with daily check-ins',
    category: 'coaching',
    icon: Target,
    containers: [
      { type: 'standups', name: 'Daily Accountability' },
      { type: 'tables', name: 'Progress Dashboard' },
    ],
  },
  {
    id: 'celebration',
    name: 'Celebration & Graduation',
    description: 'Celebrate achievements and plan forward',
    category: 'coaching',
    icon: Rocket,
    containers: [
      { type: 'pitches', name: 'Transformation Stories' },
      { type: 'meetings', name: 'Graduation Ceremony' },
      { type: 'tables', name: 'Forward Plan' },
    ],
  },

  // Leadership Journey Templates
  {
    id: 'assessment',
    name: 'Leadership Assessment',
    description: 'Complete assessments and gather 360 feedback',
    category: 'leadership',
    icon: Lightbulb,
    containers: [
      { type: 'tables', name: 'Assessment Results' },
      { type: 'elevators', name: 'Leadership Vision Statements' },
      { type: 'builds', name: 'Development Plan' },
    ],
  },
  {
    id: 'skills-workshop',
    name: 'Skills Workshop Series',
    description: 'Multi-week skill building with practice assignments',
    category: 'leadership',
    icon: BookOpen,
    containers: [
      { type: 'meetings', name: 'Workshop Sessions' },
      { type: 'standups', name: 'Practice Reflections' },
      { type: 'builds', name: 'Skills Playbook' },
    ],
  },
  {
    id: 'applied-project',
    name: 'Applied Leadership Project',
    description: 'Lead a real initiative with coaching support',
    category: 'leadership',
    icon: Briefcase,
    containers: [
      { type: 'builds', name: 'Project Documentation' },
      { type: 'standups', name: 'Project Updates' },
      { type: 'pitches', name: 'Impact Presentation' },
    ],
  },

  // Community Journey Templates
  {
    id: 'community-launch',
    name: 'Community Launch',
    description: 'Launch a new community with welcome events',
    category: 'community',
    icon: Zap,
    containers: [
      { type: 'elevators', name: 'Member Introductions' },
      { type: 'meetings', name: 'Welcome Event' },
      { type: 'tables', name: 'Community Resources' },
    ],
  },
  {
    id: 'member-showcase',
    name: 'Member Showcase',
    description: 'Let members present their work and expertise',
    category: 'community',
    icon: Presentation,
    containers: [
      { type: 'pitches', name: 'Member Presentations' },
      { type: 'meetings', name: 'Showcase Event' },
    ],
  },

  // Accelerator Journey Templates
  {
    id: 'validation',
    name: 'Idea Validation',
    description: 'Validate your idea through customer discovery',
    category: 'accelerator',
    icon: MessageSquare,
    containers: [
      { type: 'builds', name: 'Customer Discovery Notes' },
      { type: 'elevators', name: 'Founder Introductions' },
      { type: 'tables', name: 'Market Research' },
    ],
  },
  {
    id: 'pitch-prep',
    name: 'Pitch Preparation',
    description: 'Prepare and practice your pitch',
    category: 'accelerator',
    icon: TrendingUp,
    containers: [
      { type: 'builds', name: 'Pitch Deck' },
      { type: 'pitches', name: 'Pitch Practice' },
      { type: 'meetings', name: 'Mentor Feedback' },
    ],
  },

  // Custom/Blank
  {
    id: 'blank',
    name: 'Blank Journey',
    description: 'Start with an empty journey',
    category: 'custom',
    icon: Hammer,
    containers: [],
  },
];

interface JourneyTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: JourneyTemplate) => void;
}

export function JourneyTemplatePicker({ isOpen, onClose, onSelectTemplate }: JourneyTemplatePickerProps) {
  const categories = [
    { id: 'coaching', name: 'Coaching', color: 'bg-indigo-100 text-indigo-700' },
    { id: 'leadership', name: 'Leadership', color: 'bg-amber-100 text-amber-700' },
    { id: 'community', name: 'Community', color: 'bg-green-100 text-green-700' },
    { id: 'accelerator', name: 'Accelerator', color: 'bg-blue-100 text-blue-700' },
    { id: 'custom', name: 'Custom', color: 'bg-gray-100 text-gray-700' },
  ];

  const handleSelectTemplate = (template: JourneyTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Journey Template</DialogTitle>
          <DialogDescription>
            Select a pre-built journey template or start with a blank journey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => {
            const templatesInCategory = JOURNEY_TEMPLATES.filter(
              (t) => t.category === category.id
            );

            if (templatesInCategory.length === 0) return null;

            return (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={category.color}>{category.name}</Badge>
                  <span className="text-sm text-gray-500">
                    {templatesInCategory.length} template{templatesInCategory.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templatesInCategory.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                            </div>
                          </div>
                          <CardDescription className="text-sm">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xs text-gray-600">
                            {template.containers.length > 0 ? (
                              <>
                                <span className="font-medium">Includes:</span>
                                <div className="mt-1 space-y-1">
                                  {template.containers.slice(0, 3).map((c, idx) => (
                                    <div key={idx} className="text-gray-500">
                                      • {c.name}
                                    </div>
                                  ))}
                                  {template.containers.length > 3 && (
                                    <div className="text-gray-400">
                                      + {template.containers.length - 3} more
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400">Empty journey - add your own containers</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}