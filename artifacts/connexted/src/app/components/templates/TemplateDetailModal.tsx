import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { copyToClipboard } from '@/lib/clipboard-utils';
import {
  Download,
  Copy,
  Eye,
  FileJson,
  Layers,
  Users,
  Box,
  CheckCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ProgramTemplate, ContainerTemplate } from '@/types/templates';
import type { CourseTemplate } from '@/types/templates';
import { downloadJSON } from '@/lib/json-schemas';
import { toast } from 'sonner';

interface TemplateDetailModalProps {
  template: ProgramTemplate | ContainerTemplate | CourseTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDetailModal({ template, open, onOpenChange }: TemplateDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'json' | 'ai-prompt'>('overview');
  const [copied, setCopied] = useState(false);

  const isProgramTemplate = 'program' in template && 'circle' in template;
  const isCourseTemplate = 'course' in template && !('circle' in template);
  const jsonString = JSON.stringify(template, null, 2);

  // Resolve display fields from union type
  const templateTitle = isProgramTemplate
    ? (template as ProgramTemplate).program.name
    : isCourseTemplate
    ? (template as CourseTemplate).course.title
    : (template as ContainerTemplate).name;
  const templateDescription = isProgramTemplate
    ? (template as ProgramTemplate).program.description
    : isCourseTemplate
    ? (template as CourseTemplate).course.description
    : (template as ContainerTemplate).description;

  // Generate AI-friendly prompt
  const aiPrompt = generateAIPrompt(template);

  const handleDownload = () => {
    const filename = isProgramTemplate
      ? `program-${(template as ProgramTemplate).program.template_id}-${new Date().toISOString().split('T')[0]}.json`
      : isCourseTemplate
      ? `course-${((template as CourseTemplate).course.title || 'template').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
      : `container-${(template as ContainerTemplate).type}-${new Date().toISOString().split('T')[0]}.json`;
    
    downloadJSON(template, filename);
    toast.success('Template downloaded successfully');
  };

  const handleCopy = async (content: string, label: string) => {
    try {
      await copyToClipboard(content);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {templateTitle}
              </DialogTitle>
              <p className="text-gray-600 mt-2">
                {templateDescription}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(jsonString, 'JSON')}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
              <Button size="sm" onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <Eye className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="ai-prompt" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Prompt
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {isProgramTemplate ? (
              <ProgramTemplateOverview template={template as ProgramTemplate} />
            ) : isCourseTemplate ? (
              <CourseTemplateOverview template={template as CourseTemplate} />
            ) : (
              <ContainerTemplateOverview template={template as ContainerTemplate} />
            )}
          </TabsContent>

          {/* JSON Tab */}
          <TabsContent value="json" className="space-y-4 mt-6">
            <Alert>
              <FileJson className="w-4 h-4" />
              <AlertDescription>
                This is the complete JSON structure for this template. You can copy it, download it,
                or use it with the Import feature to create this structure in your platform.
              </AlertDescription>
            </Alert>

            <div className="relative">
              <Textarea
                value={jsonString}
                readOnly
                className="font-mono text-xs min-h-[500px] bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(jsonString, 'JSON')}
                className="absolute top-2 right-2 gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download JSON File
              </Button>
            </div>
          </TabsContent>

          {/* AI Prompt Tab */}
          <TabsContent value="ai-prompt" className="space-y-4 mt-6">
            <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-gray-800">
                <strong>Use this template with AI:</strong> Copy this prompt and paste it into your AI
                tool (ChatGPT, Claude, etc.) along with your specific requirements. The AI will help you
                customize this template to your needs, then you can import the result back into the platform.
              </AlertDescription>
            </Alert>

            <div className="relative">
              <Textarea
                value={aiPrompt}
                readOnly
                className="min-h-[400px] bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(aiPrompt, 'AI Prompt')}
                className="absolute top-2 right-2 gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Prompt
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                How to use this prompt:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Copy the AI prompt above</li>
                <li>Paste it into your preferred AI tool (ChatGPT, Claude, etc.)</li>
                <li>Add your specific requirements and modifications</li>
                <li>Ask the AI to generate a customized JSON template</li>
                <li>Copy the resulting JSON</li>
                <li>Use the Import feature in the platform to create your customized structure</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Program Template Overview
function ProgramTemplateOverview({ template }: { template: ProgramTemplate }) {
  return (
    <div className="space-y-6">
      {/* Program Info */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Layers className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Program Structure</h3>
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Journeys"
                value={template.journeys.length}
                icon={Layers}
              />
              <StatCard
                label="Containers"
                value={template.journeys.reduce((sum, j) => sum + j.containers.length, 0)}
                icon={Box}
              />
              <StatCard
                label="Version"
                value={template.version || '1.0'}
                icon={CheckCircle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Circle Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Community Circle
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700">Name</div>
            <div className="text-gray-900">{template.circle.name}</div>
          </div>
          {template.circle.description && (
            <div>
              <div className="text-sm font-medium text-gray-700">Description</div>
              <div className="text-gray-900">{template.circle.description}</div>
            </div>
          )}
          {template.circle.mission && (
            <div>
              <div className="text-sm font-medium text-gray-700">Mission</div>
              <div className="text-gray-900">{template.circle.mission}</div>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <div className="text-sm font-medium text-gray-700">Settings:</div>
            <Badge variant="secondary">{template.circle.visibility || 'public'}</Badge>
            <Badge variant="secondary">{template.circle.join_type || 'open'}</Badge>
          </div>
          {template.circle.tags && template.circle.tags.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Tags</div>
              <div className="flex flex-wrap gap-1">
                {template.circle.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Journeys */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Journeys & Containers
        </h3>
        <div className="space-y-4">
          {template.journeys.map((journey, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {idx + 1}. {journey.title}
                  </h4>
                  {journey.description && (
                    <p className="text-sm text-gray-600 mt-1">{journey.description}</p>
                  )}
                </div>
                <Badge variant="secondary">{journey.containers.length} containers</Badge>
              </div>
              <div className="space-y-2 mt-3">
                {journey.containers.map((container, cIdx) => (
                  <div
                    key={cIdx}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-md"
                  >
                    <Box className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">
                          {container.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {container.type}
                        </Badge>
                      </div>
                      {container.description && (
                        <p className="text-xs text-gray-600 mt-1">{container.description}</p>
                      )}
                      {container.tags && container.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {container.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Course Template Overview
function CourseTemplateOverview({ template }: { template: CourseTemplate }) {
  const ct = template as CourseTemplate;
  const totalItems = ct.journeys.reduce((sum, j) => sum + (j.items?.length || 0) + j.containers.length, 0);

  return (
    <div className="space-y-6">
      {/* Course Info Header */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Layers className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Structure</h3>
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="Journeys"
                value={template.journeys.length}
                icon={Layers}
              />
              <StatCard
                label="Content Items"
                value={totalItems}
                icon={Box}
              />
              <StatCard
                label="Difficulty"
                value={template.course.difficulty_level || 'N/A'}
                icon={CheckCircle}
              />
              <StatCard
                label="Lessons"
                value={template.course.total_lessons || 0}
                icon={CheckCircle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Course Meta */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {template.course.category && (
            <div>
              <div className="text-sm font-medium text-gray-700">Category</div>
              <Badge variant="secondary" className="mt-1 capitalize">{template.course.category}</Badge>
            </div>
          )}
          {template.course.pricing_type && (
            <div>
              <div className="text-sm font-medium text-gray-700">Pricing</div>
              <Badge variant="secondary" className="mt-1 capitalize">{template.course.pricing_type}</Badge>
            </div>
          )}
          {template.course.duration_hours && (
            <div>
              <div className="text-sm font-medium text-gray-700">Duration</div>
              <div className="text-gray-900 mt-1 text-sm">{template.course.duration_hours} hours</div>
            </div>
          )}
          {template.version && (
            <div>
              <div className="text-sm font-medium text-gray-700">Version</div>
              <div className="text-gray-900 mt-1 text-sm">{template.version}</div>
            </div>
          )}
        </div>
      </div>

      {/* Learning Objectives */}
      {template.course.learning_objectives && template.course.learning_objectives.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Learning Objectives
          </h3>
          <ul className="space-y-2">
            {template.course.learning_objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requirements */}
      {template.course.requirements && template.course.requirements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {template.course.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {template.course.tags && template.course.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {template.course.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Journeys & Content */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Modules & Content
        </h3>
        <div className="space-y-4">
          {template.journeys.map((journey, idx) => {
            const itemCount = (journey.items?.length || 0) + journey.containers.length;
            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {idx + 1}. {journey.title}
                    </h4>
                    {journey.description && (
                      <p className="text-sm text-gray-600 mt-1">{journey.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary">{itemCount} items</Badge>
                </div>
                {/* Content items */}
                {journey.items && journey.items.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {journey.items.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-md"
                      >
                        <Box className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              {item.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {item.item_type}
                            </Badge>
                            {item.estimated_time && (
                              <span className="text-xs text-gray-500">{item.estimated_time} min</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Containers */}
                {journey.containers.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {journey.containers.map((container, cIdx) => (
                      <div
                        key={cIdx}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-md"
                      >
                        <Box className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              {container.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {container.type}
                            </Badge>
                          </div>
                          {container.description && (
                            <p className="text-xs text-gray-600 mt-1">{container.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Container Template Overview
function ContainerTemplateOverview({ template }: { template: ContainerTemplate }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Box className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Container Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Type</div>
                <Badge variant="secondary" className="mt-1">
                  {template.type}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Visibility</div>
                <Badge variant="secondary" className="mt-1">
                  {template.visibility || 'member'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {template.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
          <p className="text-gray-900">{template.description}</p>
        </div>
      )}

      {template.tags && template.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: any;
}) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-500" />
        <div className="text-xs font-medium text-gray-600">{label}</div>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

// Generate AI-friendly prompt
function generateAIPrompt(template: ProgramTemplate | ContainerTemplate | CourseTemplate): string {
  const isProgramTemplate = 'program' in template && 'circle' in template;
  const isCourseTemplate = 'course' in template && !('circle' in template);

  if (isProgramTemplate) {
    return `I'm using the CONNEXTED LABS platform and want to create a custom program based on this template.

TEMPLATE: ${template.program.name}
DESCRIPTION: ${template.program.description}

CURRENT STRUCTURE:
- Circle: ${template.circle.name}
- Journeys: ${template.journeys.length}
- Total Containers: ${template.journeys.reduce((sum, j) => sum + j.containers.length, 0)}

JOURNEYS:
${template.journeys.map((j, idx) => `${idx + 1}. ${j.title} (${j.containers.length} containers)`).join('\n')}

MY REQUIREMENTS:
[Describe what you want to customize - e.g., "I want to create a program for X audience about Y topic with Z goals"]

Please help me:
1. Customize this template structure for my specific needs
2. Suggest appropriate journey names and descriptions
3. Recommend container types and configurations
4. Generate a complete JSON template I can import into the platform

The JSON should follow the same structure as this template:
\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\`

Please provide the customized JSON with my specific requirements incorporated.`;
  } else if (isCourseTemplate) {
    const ct = template as CourseTemplate;
    const totalItems = ct.journeys.reduce((sum, j) => sum + (j.items?.length || 0) + j.containers.length, 0);
    return `I'm using the CONNEXTED LABS platform and want to create a custom course based on this template.

TEMPLATE: ${ct.course.title}
CATEGORY: ${ct.course.category || 'General'}
DIFFICULTY: ${ct.course.difficulty_level || 'beginner'}
DESCRIPTION: ${ct.course.description || ''}

CURRENT STRUCTURE:
- Journeys (Modules): ${ct.journeys.length}
- Total Content Items: ${totalItems}
- Total Lessons: ${ct.course.total_lessons || totalItems}
- Duration: ${ct.course.duration_hours || 'N/A'} hours

MODULES:
${ct.journeys.map((j, idx) => `${idx + 1}. ${j.title} (${(j.items?.length || 0)} items)`).join('\n')}

MY REQUIREMENTS:
[Describe what you want to customize - e.g., "I want to create a course for X audience about Y topic"]

Please help me:
1. Customize this course template for my specific needs
2. Suggest appropriate module names, descriptions, and content items
3. Generate a complete JSON template I can import into the platform

The JSON should follow this structure:
\`\`\`json
${JSON.stringify(ct, null, 2)}
\`\`\`

Please provide the customized JSON.`;
  } else {
    return `I'm using the CONNEXTED LABS platform and want to create a custom container based on this template.

TEMPLATE: ${template.name}
TYPE: ${template.type}
DESCRIPTION: ${template.description}

MY REQUIREMENTS:
[Describe what you want to customize]

Please help me:
1. Customize this container template for my specific needs
2. Suggest appropriate settings and configurations
3. Generate a complete JSON template I can import

The JSON should follow this structure:
\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\`

Please provide the customized JSON.`;
  }
}