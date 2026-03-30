/**
 * Document Templates Browser
 * 
 * Allows users to browse and download document templates
 * organized by category (Business Planning, Investor Relations, etc.)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Download, FileText, Briefcase, TrendingUp, Package, Megaphone, Settings } from 'lucide-react';
import { DOCUMENT_CATEGORIES, downloadDocumentTemplate } from '@/lib/json-template-generator';

const categoryIcons: Record<string, any> = {
  'Business Planning': Briefcase,
  'Investor Relations': TrendingUp,
  'Product Development': Package,
  'Marketing & Sales': Megaphone,
  'Operations': Settings,
};

export default function DocumentTemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0].name);

  const handleDownload = (categoryName: string, templateIndex: number) => {
    downloadDocumentTemplate(categoryName, templateIndex);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Document Templates</h1>
        <p className="text-gray-600">
          Ready-to-use document templates for business planning, investor relations, product development, and more
        </p>
      </div>

      {/* Categories */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
          {DOCUMENT_CATEGORIES.map((category) => {
            const Icon = categoryIcons[category.name] || FileText;
            return (
              <TabsTrigger
                key={category.name}
                value={category.name}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{category.name}</span>
                <span className="sm:hidden">{category.name.split(' ')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {DOCUMENT_CATEGORIES.map((category) => {
          const Icon = categoryIcons[category.name] || FileText;
          
          return (
            <TabsContent key={category.name} value={category.name} className="mt-6 space-y-6">
              {/* Category Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {category.name}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
              </Card>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.templates.map((template, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{template.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {template.description}
                          </CardDescription>
                        </div>
                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* Download Button */}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleDownload(category.name, index)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            How to Use These Templates
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ <strong>Click "Download Template"</strong> to get a markdown file (.md) on your computer</li>
            <li>✅ <strong>Open in any text editor</strong> - The templates are in markdown format, easy to edit</li>
            <li>✅ <strong>Fill in the sections</strong> - Replace placeholder text with your actual content</li>
            <li>✅ <strong>Customize as needed</strong> - Add or remove sections to fit your needs</li>
            <li>✅ <strong>Convert if needed</strong> - Use tools like Pandoc to convert to PDF, Word, or other formats</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
