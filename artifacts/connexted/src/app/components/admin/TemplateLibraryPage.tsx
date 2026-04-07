// Split candidate: ~427 lines — consider extracting TemplateCard, TemplateEditModal, and TemplatePromptPreview into sub-components.
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  FileText, 
  Download, 
  Upload, 
  Edit, 
  Save, 
  X, 
  Copy, 
  Check,
  FileJson,
  Sparkles,
  BookOpen,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  generateTableTemplate,
  generatePitchTemplate,
  generateBuildTemplate,
  generateMeetingTemplate,
  generateStandupTemplate,
  generateMeetupTemplate,
  generateElevatorTemplate,
  generateLibraryTemplate,
  generateChecklistTemplate,
  generateSprintTemplate,
  generateAIPrompt
} from '@/lib/json-template-generator';

type ContainerType = 'tables' | 'pitches' | 'builds' | 'meetings' | 'standups' | 'meetups' | 'elevators' | 'libraries' | 'checklists' | 'sprints';

interface ContainerInfo {
  name: string;
  icon: React.ReactNode;
  description: string;
  generator: () => any;
}

const CONTAINER_TYPES: Record<ContainerType, ContainerInfo> = {
  tables: {
    name: 'Tables',
    icon: <Database className="w-5 h-5" />,
    description: 'Collaborative tables with custom columns',
    generator: generateTableTemplate
  },
  pitches: {
    name: 'Pitches',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Startup and project pitches',
    generator: generatePitchTemplate
  },
  builds: {
    name: 'Builds',
    icon: <FileText className="w-5 h-5" />,
    description: 'Project builds with phases and tasks',
    generator: generateBuildTemplate
  },
  meetings: {
    name: 'Meetings',
    icon: <FileText className="w-5 h-5" />,
    description: 'Scheduled meetings with agendas',
    generator: generateMeetingTemplate
  },
  standups: {
    name: 'Standups',
    icon: <FileText className="w-5 h-5" />,
    description: 'Team standup meetings',
    generator: generateStandupTemplate
  },
  meetups: {
    name: 'Meetups',
    icon: <FileText className="w-5 h-5" />,
    description: 'Community meetups and events',
    generator: generateMeetupTemplate
  },
  elevators: {
    name: 'Elevators',
    icon: <FileText className="w-5 h-5" />,
    description: 'Elevator pitch challenges',
    generator: generateElevatorTemplate
  },
  libraries: {
    name: 'Libraries',
    icon: <BookOpen className="w-5 h-5" />,
    description: 'Resource libraries and collections',
    generator: generateLibraryTemplate
  },
  checklists: {
    name: 'Lists',
    icon: <FileText className="w-5 h-5" />,
    description: 'Process lists and workflows',
    generator: generateChecklistTemplate
  },
  sprints: {
    name: 'Sprints',
    icon: <FileText className="w-5 h-5" />,
    description: 'Sprint planning and tracking',
    generator: generateSprintTemplate
  }
};

export default function TemplateLibraryPage() {
  const [selectedType, setSelectedType] = useState<ContainerType>('tables');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [copiedType, setCopiedType] = useState<ContainerType | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadContent, setUploadContent] = useState('');

  // Get current template and prompt
  const getTemplate = () => CONTAINER_TYPES[selectedType].generator();
  const getPrompt = () => generateAIPrompt(selectedType, getTemplate());

  // Handle copy to clipboard
  const handleCopyPrompt = (type: ContainerType) => {
    const template = CONTAINER_TYPES[type].generator();
    const prompt = generateAIPrompt(type, template);
    navigator.clipboard.writeText(prompt);
    setCopiedType(type);
    toast.success('Prompt copied to clipboard');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Handle download template
  const handleDownloadTemplate = (type: ContainerType) => {
    const template = CONTAINER_TYPES[type].generator();
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${type}-template.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Template downloaded');
  };

  // Handle download prompt as text file
  const handleDownloadPrompt = (type: ContainerType) => {
    const template = CONTAINER_TYPES[type].generator();
    const prompt = generateAIPrompt(type, template);
    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(prompt);
    const exportFileDefaultName = `${type}-ai-prompt.txt`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataStr);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('AI prompt downloaded');
  };

  // Handle download both (template + prompt)
  const handleDownloadBoth = (type: ContainerType) => {
    handleDownloadTemplate(type);
    setTimeout(() => handleDownloadPrompt(type), 100);
  };

  // Handle edit prompt
  const handleEditPrompt = () => {
    setCurrentPrompt(getPrompt());
    setEditingPrompt(true);
  };

  // Handle save edited prompt (Note: This just copies to clipboard as prompts are hardcoded)
  const handleSavePrompt = () => {
    navigator.clipboard.writeText(currentPrompt);
    toast.success('Updated prompt copied to clipboard. Note: To permanently update prompts, edit the json-template-generator.ts file.');
    setEditingPrompt(false);
  };

  // Handle upload prompts file
  const handleUploadPrompts = () => {
    try {
      const data = JSON.parse(uploadContent);
      // Validate structure
      if (typeof data === 'object' && data !== null) {
        toast.success('Prompts data validated. Copy this to json-template-generator.ts to apply changes.');
        console.log('Upload data:', data);
        setUploadDialogOpen(false);
        setUploadContent('');
      } else {
        toast.error('Invalid JSON structure');
      }
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  // Handle export all prompts
  const handleExportAllPrompts = () => {
    const allPrompts: Record<string, string> = {};
    Object.keys(CONTAINER_TYPES).forEach((type) => {
      const containerType = type as ContainerType;
      const template = CONTAINER_TYPES[containerType].generator();
      allPrompts[type] = generateAIPrompt(containerType, template);
    });
    
    const dataStr = JSON.stringify(allPrompts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'all-container-prompts.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('All prompts exported');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Template Library</h1>
          <p className="text-gray-600 mt-1">
            Manage JSON templates and AI prompts for all container types
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAllPrompts}>
            <Download className="w-4 h-4 mr-2" />
            Export All Prompts
          </Button>
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Prompts
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as ContainerType)}>
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 gap-2">
          {Object.entries(CONTAINER_TYPES).map(([key, info]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-2">
              {info.icon}
              <span className="hidden md:inline">{info.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CONTAINER_TYPES).map(([key, info]) => (
          <TabsContent key={key} value={key} className="space-y-6">
            {/* Container Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {info.icon}
                    <div>
                      <CardTitle>{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate(key as ContainerType)}>
                      <FileJson className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadPrompt(key as ContainerType)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Prompt
                    </Button>
                    <Button size="sm" onClick={() => handleDownloadBoth(key as ContainerType)}>
                      <Download className="w-4 h-4 mr-2" />
                      Both
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Template Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  JSON Template
                </CardTitle>
                <CardDescription>
                  Example JSON structure for {info.name.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-sm">{JSON.stringify(getTemplate(), null, 2)}</pre>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => handleDownloadTemplate(key as ContainerType)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Prompt */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Prompt
                    </CardTitle>
                    <CardDescription>
                      Copy this prompt to ChatGPT or Claude to generate custom {info.name.toLowerCase()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditPrompt}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopyPrompt(key as ContainerType)}
                    >
                      {copiedType === key ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button size="sm" onClick={() => handleDownloadPrompt(key as ContainerType)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{getPrompt()}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Prompt Dialog */}
      <Dialog open={editingPrompt} onOpenChange={setEditingPrompt}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AI Prompt</DialogTitle>
            <DialogDescription>
              Edit the AI prompt for {CONTAINER_TYPES[selectedType].name}. 
              Note: Changes are temporary. To make permanent changes, edit json-template-generator.ts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrompt(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSavePrompt}>
              <Save className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Prompts Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Prompts</DialogTitle>
            <DialogDescription>
              Upload a JSON file containing all container prompts. This will validate the structure.
              To apply changes, manually update json-template-generator.ts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="upload">Paste JSON Content</Label>
              <Textarea
                id="upload"
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder='{"tables": "# AI Prompt...", "pitches": "# AI Prompt...", ...}'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadPrompts}>
              <Upload className="w-4 h-4 mr-2" />
              Validate & Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
