import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { initializeFromConfig, getExampleConfig, InitializationConfig } from '@/lib/initializer';
import { toast } from 'sonner';
import { FileJson, Rocket, Download, Upload, CheckCircle } from 'lucide-react';

interface InitializerPageProps {
  onInitialized: (communityId: string) => void;
}

export default function InitializerPage({ onInitialized }: InitializerPageProps) {
  const [configText, setConfigText] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoadExample = () => {
    const exampleConfig = getExampleConfig();
    setConfigText(JSON.stringify(exampleConfig, null, 2));
    toast.success('Example configuration loaded');
  };

  const handleDownloadExample = () => {
    const exampleConfig = getExampleConfig();
    const blob = new Blob([JSON.stringify(exampleConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'community-config-example.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Example configuration downloaded');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setConfigText(content);
      toast.success('Configuration file loaded');
    };
    reader.readAsText(file);
  };

  const handleInitialize = () => {
    if (!configText.trim()) {
      toast.error('Please provide a configuration');
      return;
    }

    setIsProcessing(true);

    try {
      const config: InitializationConfig = JSON.parse(configText);
      const result = initializeFromConfig(config);

      if (result.success && result.communityId) {
        toast.success(result.message);
        setTimeout(() => {
          onInitialized(result.communityId!);
        }, 1500);
      } else {
        toast.error(result.message);
        setIsProcessing(false);
      }
    } catch (error) {
      toast.error('Invalid JSON configuration');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Rocket className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Community Initializer</h1>
          <p className="text-gray-600 text-lg">
            Automate your community setup with JSON configuration
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Initialize Your CONNEXTED LABS Platform</CardTitle>
            <CardDescription>
              Upload a JSON configuration file to automatically create your community, circles, users, courses, events, and posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Config
                </TabsTrigger>
                <TabsTrigger value="guide">
                  <FileJson className="w-4 h-4 mr-2" />
                  Configuration Guide
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 mt-6">
                {/* File Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Configuration File
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                {/* JSON Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Configuration JSON
                    </label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleLoadExample}>
                        <FileJson className="w-4 h-4 mr-2" />
                        Load Example
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadExample}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Example
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                    placeholder="Paste your JSON configuration here or upload a file..."
                    className="font-mono text-sm min-h-[400px]"
                  />
                </div>

                {/* Initialize Button */}
                <Button
                  onClick={handleInitialize}
                  disabled={isProcessing || !configText.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Initialize Community
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="guide" className="mt-6">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold mb-4">Configuration Structure</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Required Fields
                      </h4>
                      <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                        <li><code>community</code> - Community details (name, slug, description)</li>
                        <li><code>initializer</code> - Admin user credentials</li>
                      </ul>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Optional Fields (Automated Creation)
                      </h4>
                      <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                        <li><code>users[]</code> - Additional users to create</li>
                        <li><code>circles[]</code> - Interest-based circles/communities</li>
                        <li><code>events[]</code> - Calendar events (platform-wide or circle-specific)</li>
                        <li><code>courses[]</code> - Training courses with modules</li>
                        <li><code>posts[]</code> - Initial posts in circles</li>
                      </ul>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-2">Event Features</h4>
                      <p className="text-sm text-purple-800 mb-2">
                        Events support both platform-wide and circle-specific announcements:
                      </p>
                      <ul className="list-disc list-inside text-sm text-purple-800 space-y-1">
                        <li>Virtual events with external links (Zoom, Teams, Meet)</li>
                        <li>In-person events with location details</li>
                        <li>Event types: meeting, workshop, social, training, webinar</li>
                        <li>RSVP and attendance tracking</li>
                        <li>Platform-wide calendar and circle-level calendars</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Multi-Tenant Support</h4>
                      <p className="text-sm text-gray-700">
                        Each configuration creates a separate community instance with its own:
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mt-2">
                        <li>Isolated user base and authentication</li>
                        <li>Independent circles and content</li>
                        <li>Custom branding and theme colors</li>
                        <li>Separate event calendars</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">Example Structure</h4>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "community": {
    "name": "Tech Leaders",
    "slug": "tech-leaders",
    "description": "A community for tech leaders"
  },
  "initializer": {
    "name": "Admin",
    "email": "admin@example.com",
    "password": "secure-password"
  },
  "circles": [
    {
      "name": "AI & Machine Learning",
      "description": "AI discussions",
      "topics": ["AI", "ML"],
      "accessType": "open"
    }
  ],
  "events": [
    {
      "title": "AI Workshop",
      "description": "Learn about LLMs",
      "eventType": "workshop",
      "startDate": "2026-02-15T14:00:00Z",
      "endDate": "2026-02-15T16:00:00Z",
      "location": "Virtual",
      "isVirtual": true,
      "externalLink": "https://zoom.us/j/example",
      "externalPlatform": "zoom"
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}