import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  FileJson, 
  Search, 
  Download, 
  Copy, 
  Sparkles,
  Box,
  Circle,
  Layers,
  ArrowLeft,
  BookOpen,
  Lightbulb,
  Target,
  Users,
  Rocket,
  ShieldAlert
} from 'lucide-react';
import { 
  PROGRAM_TEMPLATE_LIST,
} from '@/data/program-template-exports';
import { 
  COURSE_TEMPLATE_LIST,
} from '@/data/course-template-exports';
import { ProgramTemplate } from '@/types/templates';
import type { CourseTemplate } from '@/types/templates';
import { TemplateDetailModal } from '@/app/components/templates/TemplateDetailModal';
import { ContainerTemplatesList } from '@/app/components/templates/ContainerTemplatesList';
import { TemplateUsageGuide } from '@/app/components/templates/TemplateUsageGuide';

type TemplateCategory = 'all' | 'programs' | 'courses' | 'containers' | 'circles';

const categoryIcons: Record<TemplateCategory, any> = {
  all: Layers,
  programs: Rocket,
  courses: BookOpen,
  containers: Box,
  circles: Users,
};

const categoryDescriptions: Record<TemplateCategory, string> = {
  all: 'Browse all available templates',
  programs: 'Complete program templates with journeys and containers',
  courses: 'Course templates with modules, lessons, and content items',
  containers: 'Individual container templates for specific use cases',
  circles: 'Community circle templates with predefined settings',
};

export function TemplatesLibraryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | CourseTemplate | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Platform Admin Only - Restrict access
  const isPlatformAdmin = profile?.role === 'super';

  // If not platform admin, show unauthorized message
  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Access Restricted</CardTitle>
            </div>
            <CardDescription className="text-red-800">
              The Template Library is currently restricted to Platform Administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-4">
              This feature is in testing and will be made available to additional roles in the future.
            </p>
            <Button
              onClick={() => navigate('/home')}
              variant="outline"
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter templates based on search and category
  const filteredTemplates = PROGRAM_TEMPLATE_LIST.filter((template) => {
    const matchesSearch = 
      template.program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.program.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.program.template_id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Filter course templates based on search
  const filteredCourseTemplates = COURSE_TEMPLATE_LIST.filter((template) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      template.course.title.toLowerCase().includes(q) ||
      template.course.description?.toLowerCase().includes(q) ||
      template.course.category?.toLowerCase().includes(q) ||
      template.course.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleViewTemplate = (template: ProgramTemplate | CourseTemplate) => {
    setSelectedTemplate(template);
    setDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Template Library</h1>
              </div>
              <p className="text-gray-600 max-w-2xl">
                Pre-built templates to rapidly create programs, circles, and containers. 
                Export templates to use with AI tools, or import directly into your platform.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates by name, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as TemplateCategory)}>
          <TabsList className="mb-6">
            {(['all', 'programs', 'courses', 'containers', 'circles'] as TemplateCategory[]).map((category) => {
              const Icon = categoryIcons[category];
              return (
                <TabsTrigger key={category} value={category} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* All Templates */}
          <TabsContent value="all" className="space-y-6">
            {/* Usage Guide */}
            <TemplateUsageGuide />
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Program Templates</h2>
              <ProgramTemplatesGrid
                templates={filteredTemplates}
                onViewTemplate={handleViewTemplate}
              />
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Templates</h2>
              <CourseTemplatesGrid
                templates={filteredCourseTemplates}
                onViewTemplate={handleViewTemplate}
              />
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Container Templates</h2>
              <ContainerTemplatesList />
            </section>
          </TabsContent>

          {/* Program Templates */}
          <TabsContent value="programs" className="space-y-6">
            <InfoCard
              title="Program Templates"
              description={categoryDescriptions.programs}
              icon={Rocket}
            />
            <ProgramTemplatesGrid
              templates={filteredTemplates}
              onViewTemplate={handleViewTemplate}
            />
          </TabsContent>

          {/* Course Templates */}
          <TabsContent value="courses" className="space-y-6">
            <InfoCard
              title="Course Templates"
              description={categoryDescriptions.courses}
              icon={BookOpen}
            />
            <CourseTemplatesGrid
              templates={filteredCourseTemplates}
              onViewTemplate={handleViewTemplate}
            />
          </TabsContent>

          {/* Container Templates */}
          <TabsContent value="containers" className="space-y-6">
            <InfoCard
              title="Container Templates"
              description={categoryDescriptions.containers}
              icon={Box}
            />
            <ContainerTemplatesList />
          </TabsContent>

          {/* Circle Templates */}
          <TabsContent value="circles" className="space-y-6">
            <InfoCard
              title="Circle Templates"
              description="Circle templates are included within program templates. Create a program to automatically set up a circle."
              icon={Users}
            />
            <div className="text-center py-12 text-gray-500">
              <Circle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Circle templates are part of program templates.</p>
              <p className="text-sm mt-2">Switch to the Programs tab to browse complete templates.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      )}
    </div>
  );
}

// Program Templates Grid Component
function ProgramTemplatesGrid({
  templates,
  onViewTemplate,
}: {
  templates: ProgramTemplate[];
  onViewTemplate: (template: ProgramTemplate) => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No templates found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <ProgramTemplateCard
          key={template.program.template_id}
          template={template}
          onView={() => onViewTemplate(template)}
        />
      ))}
    </div>
  );
}

// Course Templates Grid Component
function CourseTemplatesGrid({
  templates,
  onViewTemplate,
}: {
  templates: CourseTemplate[];
  onViewTemplate: (template: CourseTemplate) => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No course templates found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template, idx) => (
        <CourseTemplateCard
          key={template.course.slug || template.course.title || idx}
          template={template}
          onView={() => onViewTemplate(template)}
        />
      ))}
    </div>
  );
}

// Program Template Card Component
function ProgramTemplateCard({
  template,
  onView,
}: {
  template: ProgramTemplate;
  onView: () => void;
}) {
  const totalItems = template.journeys.reduce(
    (sum, j) => sum + (j.items?.length || 0) + j.containers.length,
    0
  );

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <Badge variant="secondary" className="text-xs">
            {template.journeys.length} {template.journeys.length === 1 ? 'Journey' : 'Journeys'}
          </Badge>
        </div>
        <CardTitle className="text-lg">{template.program.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {template.program.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Content Count */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Layers className="w-4 h-4" />
            <span>{totalItems} Content Items</span>
          </div>

          {/* Circle Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span className="truncate">{template.circle.name}</span>
          </div>

          {/* Tags */}
          {template.circle.tags && template.circle.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.circle.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.circle.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.circle.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <Button className="w-full mt-4" onClick={onView}>
            View Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Course Template Card Component
function CourseTemplateCard({
  template,
  onView,
}: {
  template: CourseTemplate;
  onView: () => void;
}) {
  const totalItems = template.journeys.reduce(
    (sum, j) => sum + (j.items?.length || 0) + j.containers.length,
    0
  );

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex gap-1">
            {template.course.difficulty_level && (
              <Badge variant="outline" className="text-xs capitalize">
                {template.course.difficulty_level}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {template.journeys.length} {template.journeys.length === 1 ? 'Module' : 'Modules'}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg">{template.course.title}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {template.course.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Content Count */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Layers className="w-4 h-4" />
            <span>{totalItems} Content Items</span>
          </div>

          {/* Duration / Lessons */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {template.course.total_lessons && (
              <span>{template.course.total_lessons} Lessons</span>
            )}
            {template.course.duration_hours && (
              <span>{template.course.duration_hours}h duration</span>
            )}
          </div>

          {/* Pricing */}
          {template.course.pricing_type && (
            <Badge variant="outline" className="text-xs capitalize">
              {template.course.pricing_type}
            </Badge>
          )}

          {/* Tags */}
          {template.course.tags && template.course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.course.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.course.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.course.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <Button className="w-full mt-4" onClick={onView}>
            View Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Info Card Component
function InfoCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-gray-700 mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default TemplatesLibraryPage;