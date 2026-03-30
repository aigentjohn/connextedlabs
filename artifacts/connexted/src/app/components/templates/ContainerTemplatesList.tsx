import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { copyToClipboard } from '@/lib/clipboard-utils';
import {
  Table,
  MessageSquare,
  Presentation,
  Hammer,
  Calendar,
  Users as UsersIcon,
  BarChart,
  Target,
} from 'lucide-react';
import { ContainerTemplate } from '@/types/templates';

// Container type definitions with examples
const containerTypes: Array<{
  type: string;
  icon: any;
  label: string;
  description: string;
  examples: ContainerTemplate[];
}> = [
  {
    type: 'tables',
    icon: Table,
    label: 'Tables',
    description: 'Shared resource libraries for documents, links, and curated content',
    examples: [
      {
        type: 'tables',
        name: 'Resource Library',
        description: 'Curated collection of valuable resources and references',
        visibility: 'member',
        tags: ['resources', 'library', 'references'],
      },
      {
        type: 'tables',
        name: 'Market Research Hub',
        description: 'Competitive analysis, market data, and industry insights',
        visibility: 'member',
        tags: ['research', 'market', 'data'],
      },
      {
        type: 'tables',
        name: 'Best Practices Collection',
        description: 'Community-curated best practices and lessons learned',
        visibility: 'public',
        tags: ['best-practices', 'learning', 'community'],
      },
    ],
  },
  {
    type: 'elevators',
    icon: MessageSquare,
    label: 'Elevators',
    description: 'Quick introductions and elevator pitches for networking',
    examples: [
      {
        type: 'elevators',
        name: 'Member Introductions',
        description: 'Introduce yourself and your work to the community',
        visibility: 'member',
        tags: ['introductions', 'networking'],
      },
      {
        type: 'elevators',
        name: 'Project Showcases',
        description: 'Quick pitches of projects you\'re working on',
        visibility: 'public',
        tags: ['projects', 'showcase'],
      },
      {
        type: 'elevators',
        name: 'Expertise Directory',
        description: 'Share your expertise and what you can help others with',
        visibility: 'member',
        tags: ['expertise', 'skills', 'mentorship'],
      },
    ],
  },
  {
    type: 'pitches',
    icon: Presentation,
    label: 'Pitches',
    description: 'Formal pitch submissions with feedback and evaluation',
    examples: [
      {
        type: 'pitches',
        name: 'Demo Day Pitches',
        description: 'Final pitches for program culmination and investor presentations',
        long_description: 'Submit your polished pitch deck and video for Demo Day. Receive feedback from mentors and prepare for investor meetings.',
        access_level: 'public',
        visibility: 'public',
        tags: ['demo-day', 'investors', 'pitch'],
      },
      {
        type: 'pitches',
        name: 'Mid-Program Review',
        description: 'Interim pitches to show progress and get feedback',
        long_description: 'Share your current progress and pivot decisions with the cohort.',
        access_level: 'member',
        visibility: 'member',
        tags: ['progress', 'feedback', 'iteration'],
      },
      {
        type: 'pitches',
        name: 'Concept Validation',
        description: 'Early-stage idea pitches for validation and direction',
        access_level: 'member',
        visibility: 'member',
        tags: ['validation', 'early-stage', 'concept'],
      },
    ],
  },
  {
    type: 'builds',
    icon: Hammer,
    label: 'Builds',
    description: 'Project workspaces for collaborative building and documentation',
    examples: [
      {
        type: 'builds',
        name: 'Product Development',
        description: 'Document your product development journey and milestones',
        visibility: 'member',
        tags: ['product', 'development', 'mvp'],
      },
      {
        type: 'builds',
        name: 'Marketing Campaign',
        description: 'Plan and execute marketing campaigns collaboratively',
        visibility: 'member',
        tags: ['marketing', 'campaign', 'strategy'],
      },
      {
        type: 'builds',
        name: 'Technical Architecture',
        description: 'Document technical decisions and system architecture',
        visibility: 'private',
        tags: ['technical', 'architecture', 'engineering'],
      },
    ],
  },
  {
    type: 'standups',
    icon: BarChart,
    label: 'Standups',
    description: 'Regular progress updates and accountability check-ins',
    examples: [
      {
        type: 'standups',
        name: 'Weekly Progress',
        description: "Share what you accomplished, what's next, and any blockers",
        visibility: 'member',
        tags: ['weekly', 'updates', 'accountability'],
      },
      {
        type: 'standups',
        name: 'Daily Standup',
        description: 'Quick daily check-ins for fast-paced teams',
        visibility: 'member',
        tags: ['daily', 'standup', 'agile'],
      },
      {
        type: 'standups',
        name: 'Sprint Retrospective',
        description: 'Reflect on sprint progress and identify improvements',
        visibility: 'member',
        tags: ['retrospective', 'sprint', 'reflection'],
      },
    ],
  },
  {
    type: 'meetings',
    icon: Calendar,
    label: 'Meetings',
    description: 'Scheduled meetings with agendas and discussion threads',
    examples: [
      {
        type: 'meetings',
        name: 'Office Hours',
        description: 'Regular office hours for mentor guidance and Q&A',
        visibility: 'member',
        tags: ['mentorship', 'office-hours', 'q&a'],
      },
      {
        type: 'meetings',
        name: 'All-Hands Meeting',
        description: 'Monthly community gatherings for updates and announcements',
        visibility: 'member',
        tags: ['all-hands', 'community', 'updates'],
      },
      {
        type: 'meetings',
        name: 'Working Sessions',
        description: 'Co-working sessions for focused collaborative work',
        visibility: 'member',
        tags: ['co-working', 'collaboration', 'focus'],
      },
    ],
  },
  {
    type: 'meetups',
    icon: UsersIcon,
    label: 'Meetups',
    description: 'Social events and community gatherings',
    examples: [
      {
        type: 'meetups',
        name: 'Welcome Kickoff',
        description: 'Onboarding event for new cohort members',
        visibility: 'member',
        tags: ['onboarding', 'welcome', 'kickoff'],
      },
      {
        type: 'meetups',
        name: 'Networking Happy Hour',
        description: 'Casual social gathering for community building',
        visibility: 'public',
        tags: ['networking', 'social', 'community'],
      },
      {
        type: 'meetups',
        name: 'Demo Day Event',
        description: 'Final showcase event for pitches and celebration',
        visibility: 'public',
        tags: ['demo-day', 'showcase', 'celebration'],
      },
    ],
  },
  {
    type: 'sprints',
    icon: Target,
    label: 'Sprints',
    description: 'Time-boxed challenges and focused work periods',
    examples: [
      {
        type: 'sprints',
        name: 'MVP Sprint',
        description: '2-week intensive sprint to build your minimum viable product',
        visibility: 'member',
        tags: ['mvp', 'sprint', 'building'],
      },
      {
        type: 'sprints',
        name: 'Customer Discovery Sprint',
        description: '1-week sprint to conduct customer interviews and validate assumptions',
        visibility: 'member',
        tags: ['customer-discovery', 'validation', 'research'],
      },
      {
        type: 'sprints',
        name: 'Launch Preparation Sprint',
        description: 'Final push to prepare marketing materials and launch plan',
        visibility: 'member',
        tags: ['launch', 'marketing', 'preparation'],
      },
    ],
  },
];

export function ContainerTemplatesList() {
  return (
    <div className="space-y-6">
      {containerTypes.map((containerType) => (
        <Card key={containerType.type}>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <containerType.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{containerType.label}</CardTitle>
                <CardDescription>{containerType.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {containerType.examples.map((example, idx) => (
                <ContainerExampleCard
                  key={idx}
                  template={example}
                  containerType={containerType.type}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ContainerExampleCard({
  template,
  containerType,
}: {
  template: ContainerTemplate;
  containerType: string;
}) {
  const handleCopyTemplate = () => {
    const jsonString = JSON.stringify(template, null, 2);
    copyToClipboard(jsonString);
    // Toast notification would go here
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900">{template.name}</h4>
            <Badge variant="outline" className="text-xs">
              {template.visibility || 'member'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyTemplate}
          className="ml-4 flex-shrink-0"
        >
          Copy JSON
        </Button>
      </div>
    </div>
  );
}