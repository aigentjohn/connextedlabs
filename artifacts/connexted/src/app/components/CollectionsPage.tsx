import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { 
  Rocket,
  BookOpen,
  Users,
  Target,
  FlaskConical,
  Briefcase,
  BookMarked,
  Calendar,
  Search,
  Plus,
  ArrowRight,
  Clock,
  UserCircle,
} from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';

interface CollectionTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  duration: string;
  teamSize: string;
  sections: number;
  containerTypes: string[];
  color: string;
  popular?: boolean;
}

const COLLECTION_TEMPLATES: CollectionTemplate[] = [
  {
    id: 'innovation-journey',
    name: 'Innovation Journey',
    icon: Rocket,
    tagline: 'From idea to impact',
    description: 'Take your innovation from concept to launch through six strategic phases: prototype, validation, refinement, execution, presentation, and stakeholder engagement.',
    duration: '3-6 months',
    teamSize: '1-12 people',
    sections: 6,
    containerTypes: ['Build', 'Elevator', 'Table', 'Standup', 'Pitch', 'Meeting'],
    color: 'blue',
    popular: true,
  },
  {
    id: 'learning-program',
    name: 'Learning Program',
    icon: BookOpen,
    tagline: 'Master skills together',
    description: 'Run a structured learning program with courses, study groups, mentorship, and final projects. Perfect for education and professional development.',
    duration: '4-12 weeks',
    teamSize: '10-50 students',
    sections: 5,
    containerTypes: ['Courses', 'Portfolio', 'Table', 'Elevator', 'Pitch'],
    color: 'purple',
  },
  {
    id: 'accelerator',
    name: 'Accelerator Program',
    icon: Rocket,
    tagline: 'Launch your cohort',
    description: 'Run a startup accelerator with mentor sessions, cohort standups, demo day, and investor meetings. Support multiple companies through a structured program.',
    duration: '3 months',
    teamSize: '8-15 startups',
    sections: 6,
    containerTypes: ['Table', 'Standup', 'Pitch', 'Meeting', 'Build'],
    color: 'orange',
    popular: true,
  },
  {
    id: 'community-hub',
    name: 'Community Hub',
    icon: Users,
    tagline: 'Build lasting connections',
    description: 'Create an ongoing community with discussions, events, knowledge sharing, and member showcases. Perfect for professional networks and interest groups.',
    duration: 'Ongoing',
    teamSize: '50+ members',
    sections: 4,
    containerTypes: ['Forums', 'Meetups', 'Libraries', 'Moments'],
    color: 'green',
  },
  {
    id: 'project-team',
    name: 'Project Team',
    icon: Target,
    tagline: 'Execute together',
    description: 'Coordinate a team to complete a specific project with task tracking, daily standups, planning meetings, and deliverables.',
    duration: '4-12 weeks',
    teamSize: '3-10 people',
    sections: 5,
    containerTypes: ['Table', 'Standup', 'Meeting', 'Build'],
    color: 'indigo',
  },
  {
    id: 'research',
    name: 'Research Initiative',
    icon: FlaskConical,
    tagline: 'Discover and publish',
    description: 'Conduct research from hypothesis to publication with workspace for analysis, peer review sessions, and presentations.',
    duration: '6-18 months',
    teamSize: '2-8 researchers',
    sections: 6,
    containerTypes: ['Build', 'Table', 'Libraries', 'Pitch', 'Meeting'],
    color: 'cyan',
  },
  {
    id: 'client-work',
    name: 'Client Engagement',
    icon: Briefcase,
    tagline: 'Deliver value',
    description: 'Manage client relationships with check-ins, working sessions, deliverables, and formal meetings. Track project progress and maintain clear communication.',
    duration: 'Project-based',
    teamSize: '2-6 people',
    sections: 5,
    containerTypes: ['Elevator', 'Table', 'Meeting', 'Build'],
    color: 'slate',
  },
  {
    id: 'book-club',
    name: 'Study Group',
    icon: BookMarked,
    tagline: 'Learn through discussion',
    description: 'Read and discuss together with structured sessions, shared notes, and deep conversations about books, papers, or topics.',
    duration: '4-8 weeks',
    teamSize: '5-12 people',
    sections: 4,
    containerTypes: ['Table', 'Meeting', 'Libraries'],
    color: 'amber',
  },
];

const COLOR_CLASSES: Record<string, { card: string; badge: string; icon: string }> = {
  blue: { card: 'border-blue-200 hover:border-blue-300', badge: 'bg-blue-100 text-blue-700', icon: 'bg-blue-100 text-blue-600' },
  purple: { card: 'border-purple-200 hover:border-purple-300', badge: 'bg-purple-100 text-purple-700', icon: 'bg-purple-100 text-purple-600' },
  orange: { card: 'border-orange-200 hover:border-orange-300', badge: 'bg-orange-100 text-orange-700', icon: 'bg-orange-100 text-orange-600' },
  green: { card: 'border-green-200 hover:border-green-300', badge: 'bg-green-100 text-green-700', icon: 'bg-green-100 text-green-600' },
  indigo: { card: 'border-indigo-200 hover:border-indigo-300', badge: 'bg-indigo-100 text-indigo-700', icon: 'bg-indigo-100 text-indigo-600' },
  cyan: { card: 'border-cyan-200 hover:border-cyan-300', badge: 'bg-cyan-100 text-cyan-700', icon: 'bg-cyan-100 text-cyan-600' },
  slate: { card: 'border-slate-200 hover:border-slate-300', badge: 'bg-slate-100 text-slate-700', icon: 'bg-slate-100 text-slate-600' },
  amber: { card: 'border-amber-200 hover:border-amber-300', badge: 'bg-amber-100 text-amber-700', icon: 'bg-amber-100 text-amber-600' },
};

export default function CollectionsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = COLLECTION_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tagline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCollection = (templateId: string) => {
    // For now, navigate to the detail page
    // In the future, this would create a new instance from template
    navigate(`/collections/${templateId}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'Collections' }]}
        icon={BookMarked}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title="Collections"
        description="Choose a collection template to guide your journey. Each collection bundles the right containers for your specific goal."
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Custom Collection
        </Button>
      </div>

      {/* Popular badge note */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          ⭐ Popular
        </Badge>
        <span>Most commonly used collection types</span>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          const colors = COLOR_CLASSES[template.color] || COLOR_CLASSES.blue;

          return (
            <Card
              key={template.id}
              className={`relative transition-all hover:shadow-lg cursor-pointer ${colors.card}`}
              onClick={() => handleCreateCollection(template.id)}
            >
              {template.popular && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    ⭐ Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl">{template.name}</CardTitle>
                    <CardDescription className="text-sm font-medium mt-1">
                      {template.tagline}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {template.description}
                </p>

                {/* Meta info */}
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{template.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCircle className="w-4 h-4" />
                    <span>{template.teamSize}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    <span>{template.sections} sections</span>
                  </div>
                </div>

                {/* Container types */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase">
                    Includes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.containerTypes.map((type) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className={`text-xs ${colors.badge}`}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Button className="w-full mt-2">
                  Create from this template
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No collections found
          </h3>
          <p className="text-gray-600 mb-4">
            Try a different search term or browse all templates
          </p>
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            Clear search
          </Button>
        </div>
      )}

      {/* Help section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Not sure which collection to choose?</CardTitle>
          <CardDescription>
            Collections are guided journeys that bundle the right containers for your goal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span><strong>Innovation Journey</strong> - Best for launching new products or projects</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span><strong>Accelerator</strong> - Best for running cohort-based programs</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span><strong>Community Hub</strong> - Best for ongoing communities and networks</span>
            </li>
          </ul>
          <div className="pt-2">
            <Button variant="outline" size="sm">
              View guide: Choosing the right collection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}