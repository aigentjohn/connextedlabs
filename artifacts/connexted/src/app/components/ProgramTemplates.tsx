import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { ProgramTemplate, PROGRAM_TEMPLATES } from '@/data/program-templates';
import { Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface ProgramTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onProgramCreated?: (programId: string, slug: string) => void; // Pass both ID and slug
}

export function ProgramTemplatePicker({ isOpen, onClose, onProgramCreated }: ProgramTemplatePickerProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
  const [programName, setProgramName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showBlankForm, setShowBlankForm] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [blankProgramData, setBlankProgramData] = useState({
    name: '',
    description: '',
    circleName: '',
    circleDescription: '',
    pricingType: 'free' as 'free' | 'paid' | 'members-only',
    priceCents: 0,
    convertkitProductId: '',
  });

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'coaching', label: 'Coaching' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'community', label: 'Community' },
    { value: 'accelerator', label: 'Accelerator' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'professional', label: 'Professional' },
  ];

  const filteredTemplates =
    selectedCategory === 'all'
      ? PROGRAM_TEMPLATES
      : PROGRAM_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleSelectTemplate = (template: ProgramTemplate) => {
    setSelectedTemplate(template);
    setProgramName(template.name); // Pre-fill with template name
  };

  const handleCreateProgram = async () => {
    if (!selectedTemplate || !profile) return;

    setCreating(true);
    let createdCircleId: string | null = null;
    try {
      // Generate slug from program name + unique suffix to prevent collisions
      const suffix = Date.now().toString(36);
      const base = programName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const slug = `${base}-${suffix}`;
      
      // Create circle for the program (ONE circle for all journeys)
      const circleSlug = `${slug}-${selectedTemplate.circle.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .insert({
          community_id: profile.community_id,
          name: selectedTemplate.circle.name,
          description: selectedTemplate.circle.description,
          slug: circleSlug,
          access_type: selectedTemplate.circle.access_type || 'invite',
          image: selectedTemplate.circle.image || null,
          admin_ids: [profile.id],
          member_ids: [profile.id],
        })
        .select()
        .single();

      if (circleError) throw circleError;
      createdCircleId = circle.id;

      // Create program instance
      const { data: program, error: programError } = await supabase
        .from('programs')
        .insert({
          community_id: profile.community_id,
          name: programName,
          description: selectedTemplate.description,
          slug,
          template_id: selectedTemplate.id,
          admin_ids: [profile.id],
          member_ids: [],
          status: 'not-started',
          created_by: profile.id,
          visibility: 'members-only',
          tags: tags,
        })
        .select()
        .single();

      if (programError) throw programError;
      if (!program) throw new Error('Program creation failed - no data returned');

      // Create journeys (without circles - they use the program's circle)
      const journeysToInsert = selectedTemplate.journeys.map((journey, index) => ({
        program_id: program.id,
        title: journey.title,
        description: journey.description,
        order_index: index,
        status: 'not-started' as const,
        start_date: journey.startDate || null,
        finish_date: journey.finishDate || null,
        containers_template: journey.containers, // Store container templates as JSONB
      }));

      const { error: journeysError } = await supabase
        .from('program_journeys')
        .insert(journeysToInsert);

      if (journeysError) throw journeysError;

      // Link topics if any selected
      if (topicIds.length > 0) {
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/link`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: profile.id,
                entityType: 'program',
                entityId: program.id,
                topicIds: topicIds,
              }),
            }
          );
        } catch (error) {
          console.error('Error linking topics:', error);
        }
      }

      toast.success(`Program "${programName}" created successfully with ${journeysToInsert.length} journeys!`);
      
      // Reset state
      setSelectedTemplate(null);
      setProgramName('');
      setTopicIds([]);
      
      // Notify parent and close
      if (onProgramCreated) {
        onProgramCreated(program.id, slug);
      }
      onClose();
    } catch (error) {
      console.error('Error creating program:', error);
      if (createdCircleId) {
        await supabase.from('circles').delete().eq('id', createdCircleId);
      }
      toast.error('Failed to create program');
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setProgramName('');
  };

  const handleCreateBlankProgram = async () => {
    if (!profile) return;

    setCreating(true);
    let createdCircleId: string | null = null;
    try {
      // Generate slug from program name + unique suffix to prevent collisions
      const suffix = Date.now().toString(36);
      const base = blankProgramData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const slug = `${base}-${suffix}`;
      
      // Create circle for the program (ONE circle for all journeys)
      const circleSlug = `${slug}-${blankProgramData.circleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .insert({
          community_id: profile.community_id,
          name: blankProgramData.circleName,
          description: blankProgramData.circleDescription,
          slug: circleSlug,
          access_type: 'invite',
          image: null,
          admin_ids: [profile.id],
          member_ids: [profile.id],
        })
        .select()
        .single();

      if (circleError) throw circleError;
      createdCircleId = circle.id;

      // Create program instance
      const { data: program, error: programError } = await supabase
        .from('programs')
        .insert({
          community_id: profile.community_id,
          name: blankProgramData.name,
          description: blankProgramData.description,
          slug,
          template_id: null,
          admin_ids: [profile.id],
          member_ids: [],
          status: 'not-started',
          created_by: profile.id,
          visibility: 'members-only',
          tags: tags,
        })
        .select()
        .single();

      if (programError) throw programError;
      if (!program) throw new Error('Program creation failed - no data returned');

      // Link topics if any selected
      if (topicIds.length > 0) {
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/link`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: profile.id,
                entityType: 'program',
                entityId: program.id,
                topicIds: topicIds,
              }),
            }
          );
        } catch (error) {
          console.error('Error linking topics:', error);
        }
      }

      toast.success(`Program "${blankProgramData.name}" created successfully!`);
      
      // Reset state
      setBlankProgramData({
        name: '',
        description: '',
        circleName: '',
        circleDescription: '',
        pricingType: 'free' as 'free' | 'paid' | 'members-only',
        priceCents: 0,
        convertkitProductId: '',
      });
      setShowBlankForm(false);
      setTopicIds([]);
      
      // Notify parent and close
      if (onProgramCreated) {
        onProgramCreated(program.id, slug);
      }
      onClose();
    } catch (error) {
      console.error('Error creating program:', error);
      if (createdCircleId) {
        await supabase.from('circles').delete().eq('id', createdCircleId);
      }
      toast.error('Failed to create program');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {showBlankForm ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Create Custom Program</DialogTitle>
              <DialogDescription>
                Build a program from scratch with your own structure
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Program Name Input */}
              <div className="space-y-2">
                <Label htmlFor="blank-program-name">Program Name *</Label>
                <Input
                  id="blank-program-name"
                  value={blankProgramData.name}
                  onChange={(e) => setBlankProgramData({ ...blankProgramData, name: e.target.value })}
                  placeholder="e.g., Innovation Program Fall 2024"
                />
              </div>

              {/* Program Description Input */}
              <div className="space-y-2">
                <Label htmlFor="blank-program-description">Program Description</Label>
                <Input
                  id="blank-program-description"
                  value={blankProgramData.description}
                  onChange={(e) => setBlankProgramData({ ...blankProgramData, description: e.target.value })}
                  placeholder="Brief overview of your program"
                />
              </div>

              {/* Circle Name Input */}
              <div className="space-y-2">
                <Label htmlFor="blank-circle-name">Circle Name *</Label>
                <Input
                  id="blank-circle-name"
                  value={blankProgramData.circleName}
                  onChange={(e) => setBlankProgramData({ ...blankProgramData, circleName: e.target.value })}
                  placeholder="e.g., Innovation Community"
                />
                <p className="text-xs text-gray-500">
                  A circle will be created for your program members to collaborate
                </p>
              </div>

              {/* Circle Description Input */}
              <div className="space-y-2">
                <Label htmlFor="blank-circle-description">Circle Description</Label>
                <Input
                  id="blank-circle-description"
                  value={blankProgramData.circleDescription}
                  onChange={(e) => setBlankProgramData({ ...blankProgramData, circleDescription: e.target.value })}
                  placeholder="Brief description of the circle"
                />
              </div>

              {/* Topics Selection */}
              <div className="space-y-2">
                <Label>Topics (Who/Why)</Label>
                <TopicSelector
                  value={topicIds}
                  onChange={setTopicIds}
                  maxTopics={5}
                  placeholder="Select topics..."
                />
              </div>

              {/* Tags Selection */}
              <div className="space-y-2">
                <Label>Tags (What/How)</Label>
                <TagSelector
                  value={tags}
                  onChange={setTags}
                  contentType="course" // mapping program to course type for now as closest
                  title={blankProgramData.name}
                  description={blankProgramData.description}
                  placeholder="Add tags..."
                />
              </div>

              {/* Info Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> After creating your program, you can add journeys and containers through the Program Setup page.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setShowBlankForm(false)} disabled={creating}>
                Back to Templates
              </Button>
              <Button 
                onClick={handleCreateBlankProgram} 
                disabled={!blankProgramData.name.trim() || !blankProgramData.circleName.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Program'
                )}
              </Button>
            </div>
          </>
        ) : !selectedTemplate ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Choose a Program Template</DialogTitle>
              <DialogDescription>
                Select a pre-built program template to get started quickly, or create a custom program from scratch.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid grid-cols-7 w-full">
                {categories.map((cat) => (
                  <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400 group"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-2xl`}
                            >
                              {template.icon}
                            </div>
                            <div>
                              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                                {template.name}
                              </CardTitle>
                              <Badge variant="outline" className="mt-1 capitalize text-xs">
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <CardDescription className="text-sm leading-relaxed">
                          {template.description}
                        </CardDescription>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{template.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{template.journeys.length} journeys</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>
                              {template.journeys.reduce((acc, s) => acc + s.containers.length, 0)} containers
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </Tabs>

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Want full control? Start with a blank program.
              </p>
              <Button variant="outline" onClick={() => setShowBlankForm(true)}>
                Create Blank Program
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Create Program from Template</DialogTitle>
              <DialogDescription>
                Customize your program name and details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Template Preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${selectedTemplate.color} flex items-center justify-center text-2xl`}
                    >
                      {selectedTemplate.icon}
                    </div>
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Program Name Input */}
              <div className="space-y-2">
                <Label htmlFor="program-name">Program Name</Label>
                <Input
                  id="program-name"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="Enter a name for your program"
                />
                <p className="text-xs text-gray-500">
                  This will be the title of your program instance (e.g., "Innovation Program Fall 2024")
                </p>
              </div>

              {/* Program Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">This program includes:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {selectedTemplate.journeys.length} journeys to guide your progress</li>
                  <li>• {selectedTemplate.journeys.reduce((acc, s) => acc + s.containers.length, 0)} container templates</li>
                  <li>• Estimated duration: {selectedTemplate.duration}</li>
                </ul>
              </div>

              {/* Topics Selection */}
              <div className="space-y-2">
                <Label>Topics (Who/Why)</Label>
                <TopicSelector
                  value={topicIds}
                  onChange={setTopicIds}
                  maxTopics={5}
                  placeholder="Select topics..."
                />
              </div>

              {/* Tags Selection */}
              <div className="space-y-2">
                <Label>Tags (What/How)</Label>
                <TagSelector
                  value={tags}
                  onChange={setTags}
                  contentType="course"
                  title={programName}
                  description={selectedTemplate.description}
                  placeholder="Add tags..."
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={handleBack} disabled={creating}>
                Back
              </Button>
              <Button 
                onClick={handleCreateProgram} 
                disabled={!programName.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Program'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Program Card Component for listing pages
interface ProgramCardProps {
  template: ProgramTemplate;
  programInstance?: any; // The actual program instance from database
  progress?: number;
  onClick?: () => void;
}

export function ProgramCard({ template, programInstance, progress = 0, onClick }: ProgramCardProps) {
  const totalContainers = template.journeys.reduce((acc, s) => acc + s.containers.length, 0);
  const displayName = programInstance?.name || template.name;
  const displayStatus = programInstance?.status;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400 group"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={`w-16 h-16 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-3xl flex-shrink-0`}
          >
            {template.icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
              {displayName}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {template.category}
              </Badge>
              {displayStatus && (
                <Badge 
                  variant={displayStatus === 'completed' ? 'default' : 'secondary'}
                  className={
                    displayStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    displayStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }
                >
                  {displayStatus.replace('-', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm leading-relaxed line-clamp-2">
          {template.description}
        </CardDescription>

        {progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{template.duration}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{template.journeys.length} journeys</span>
            <span>{totalContainers} containers</span>
          </div>
        </div>

        <Button className="w-full group-hover:bg-blue-600" onClick={onClick}>
          {progress > 0 ? 'Continue Program' : programInstance ? 'View Program' : 'Start Program'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}