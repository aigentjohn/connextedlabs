import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  BookOpen, 
  Download, 
  Upload,
  Save,
  Eye,
  FileText,
  HelpCircle,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function DocumentationManager() {
  const [welcomeContent, setWelcomeContent] = useState('');
  const [helpContent, setHelpContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('welcome');

  useEffect(() => {
    loadDocumentation();
  }, []);

  const loadDocumentation = async () => {
    setLoading(true);
    try {
      const [welcomeResponse, helpResponse] = await Promise.all([
        fetch('/WELCOME.md'),
        fetch('/HELP.md')
      ]);
      
      const welcomeText = await welcomeResponse.text();
      const helpText = await helpResponse.text();
      
      setWelcomeContent(welcomeText);
      setHelpContent(helpText);
      toast.success('Documentation loaded successfully');
    } catch (error) {
      console.error('Error loading documentation:', error);
      toast.error('Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: 'welcome' | 'help') => {
    setSaving(true);
    try {
      const content = type === 'welcome' ? welcomeContent : helpContent;
      const filename = type === 'welcome' ? 'WELCOME.md' : 'HELP.md';
      
      // In a real application, you would save this to a backend or file system
      // For now, we'll just trigger a download
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${filename} saved successfully`);
    } catch (error) {
      console.error('Error saving documentation:', error);
      toast.error('Failed to save documentation');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = (type: 'welcome' | 'help') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          if (type === 'welcome') {
            setWelcomeContent(text);
          } else {
            setHelpContent(text);
          }
          toast.success(`${file.name} imported successfully`);
        } catch (error) {
          console.error('Error importing file:', error);
          toast.error('Failed to import file');
        }
      }
    };
    input.click();
  };

  const handleExport = (type: 'welcome' | 'help') => {
    const content = type === 'welcome' ? welcomeContent : helpContent;
    const filename = type === 'welcome' ? 'WELCOME.md' : 'HELP.md';
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`${filename} exported successfully`);
  };

  const handlePreview = (type: 'welcome' | 'help') => {
    const url = type === 'welcome' ? '/help/welcome' : '/help/help';
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading documentation...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Documentation Manager' }
        ]} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage platform documentation for onboarding and help
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Platform Admin Only
        </Badge>
      </div>

      {/* Instructions Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">Managing Platform Documentation</h3>
              <p className="text-sm text-blue-800">
                <strong>WELCOME</strong> documentation is shown to new users during onboarding and provides a quick start guide.
                <br />
                <strong>HELP</strong> documentation is comprehensive and includes detailed feature explanations, troubleshooting, and FAQs.
              </p>
              <div className="flex gap-2 mt-3">
                <div className="flex items-center gap-1 text-xs text-blue-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Supports Markdown formatting</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Import/Export as .md files</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Live preview available</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="welcome">
            <BookOpen className="w-4 h-4 mr-2" />
            Welcome Guide
          </TabsTrigger>
          <TabsTrigger value="help">
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Documentation
          </TabsTrigger>
        </TabsList>

        {/* Welcome Tab */}
        <TabsContent value="welcome" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  Welcome Guide Editor
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleImport('welcome')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport('welcome')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePreview('welcome')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleSave('welcome')}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={welcomeContent}
                onChange={(e) => setWelcomeContent(e.target.value)}
                className="w-full h-[600px] p-4 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter welcome documentation in Markdown format..."
              />
              <div className="mt-3 text-xs text-gray-500">
                <strong>Tip:</strong> Use Markdown formatting. Supports headings (#), lists, links, code blocks, and more.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  Help Documentation Editor
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleImport('help')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport('help')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePreview('help')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleSave('help')}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={helpContent}
                onChange={(e) => setHelpContent(e.target.value)}
                className="w-full h-[600px] p-4 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter help documentation in Markdown format..."
              />
              <div className="mt-3 text-xs text-gray-500">
                <strong>Tip:</strong> This is comprehensive documentation. Include detailed feature explanations, troubleshooting, and FAQs.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Welcome Guide</p>
                <p className="text-2xl font-bold mt-1">
                  {welcomeContent.split('\n').length} lines
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {welcomeContent.length} characters
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Help Documentation</p>
                <p className="text-2xl font-bold mt-1">
                  {helpContent.split('\n').length} lines
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {helpContent.length} characters
                </p>
              </div>
              <HelpCircle className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
