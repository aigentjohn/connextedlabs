import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { 
  Sparkles, 
  Download, 
  Upload, 
  Lightbulb, 
  CheckCircle,
  FileJson,
  ExternalLink 
} from 'lucide-react';

export function TemplateUsageGuide() {
  return (
    <div className="space-y-6">
      {/* Quick Start Guide */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">How to Use Templates with AI</CardTitle>
              <CardDescription className="text-gray-700 mt-1">
                Create custom programs and containers by combining our templates with AI tools
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <StepCard
              number={1}
              title="Browse & Select"
              description="Find a template that matches your needs (program, container, or circle)"
              icon={FileJson}
            />
            <StepCard
              number={2}
              title="Copy AI Prompt"
              description="Click on any template and switch to the 'AI Prompt' tab to copy the pre-formatted prompt"
              icon={Sparkles}
            />
            <StepCard
              number={3}
              title="Customize with AI"
              description="Paste into ChatGPT/Claude, add your requirements, and let AI customize the template"
              icon={Lightbulb}
            />
            <StepCard
              number={4}
              title="Import Result"
              description="Copy the AI-generated JSON and import it using the Import feature"
              icon={Upload}
            />
            <StepCard
              number={5}
              title="Ready to Use"
              description="Your customized program or container is now live and ready for members"
              icon={CheckCircle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <FeatureCard
          icon={Download}
          title="Export Templates"
          description="Download any template as JSON for backup or sharing with other admins"
          color="blue"
        />
        <FeatureCard
          icon={Upload}
          title="Import Templates"
          description="Import JSON templates to instantly create programs, circles, and containers"
          color="green"
        />
        <FeatureCard
          icon={Sparkles}
          title="AI-Powered Customization"
          description="Use AI tools to customize templates to your specific needs and requirements"
          color="purple"
        />
        <FeatureCard
          icon={FileJson}
          title="Schema Validation"
          description="Real-time validation ensures your JSON is correctly formatted before import"
          color="orange"
        />
      </div>

      {/* Template Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Template Categories</CardTitle>
          <CardDescription>
            Choose the right template type for your needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CategoryItem
            title="Program Templates"
            description="Complete program structures with circles, journeys, and containers for cohort-based experiences"
            examples={['Accelerators', 'Fellowships', 'Bootcamps', 'Learning Programs']}
          />
          <CategoryItem
            title="Container Templates"
            description="Individual workspaces for specific activities and content types"
            examples={['Resource Libraries', 'Pitch Decks', 'Build Projects', 'Weekly Standups']}
          />
          <CategoryItem
            title="Circle Templates"
            description="Community configurations embedded in program templates"
            examples={['Public Communities', 'Private Groups', 'Invite-Only Circles']}
          />
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Alert className="bg-blue-50 border-blue-200">
        <Lightbulb className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong className="block mb-2">Pro Tips:</strong>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Start with the closest matching template to save time</li>
            <li>Be specific when prompting AI - include your audience, goals, and timeline</li>
            <li>Test with unmodified templates first to understand the structure</li>
            <li>Export your customized templates to reuse them for similar programs</li>
            <li>Use tags consistently to make templates easier to discover</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold flex-shrink-0">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-purple-600" />
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: any;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
  };

  return (
    <Card className={`border-2 ${colorClasses[color]}`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-gray-700 text-sm mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function CategoryItem({
  title,
  description,
  examples,
}: {
  title: string;
  description: string;
  examples: string[];
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <div className="flex flex-wrap gap-1">
        {examples.map((example) => (
          <Badge key={example} variant="secondary" className="text-xs">
            {example}
          </Badge>
        ))}
      </div>
    </div>
  );
}
