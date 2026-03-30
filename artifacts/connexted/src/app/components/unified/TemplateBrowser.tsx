import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { LayoutTemplate, Check } from 'lucide-react';
import { useState } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  itemCount: number;
}

const SAMPLE_TEMPLATES: Template[] = [
  { id: 't1', name: 'Course Introduction', description: 'Standard welcome sequence for new students.', itemCount: 3 },
  { id: 't2', name: 'Assessment Module', description: 'Quiz-heavy module with review materials.', itemCount: 5 },
  { id: 't3', name: 'Workshop Series', description: 'Video lectures followed by discussion prompts.', itemCount: 4 },
];

interface TemplateBrowserProps {
  onSelect: (templateId: string) => void;
  selectedTemplateId?: string;
}

export function TemplateBrowser({ onSelect, selectedTemplateId }: TemplateBrowserProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SAMPLE_TEMPLATES.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all hover:border-primary ${selectedTemplateId === template.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
            onClick={() => onSelect(template.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                {selectedTemplateId === template.id && (
                  <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {template.description}
              </p>
              <div className="flex items-center text-xs text-muted-foreground">
                <Badge variant="secondary" className="mr-2">
                  {template.itemCount} Items
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant={selectedTemplateId === template.id ? "default" : "outline"} 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(template.id);
                }}
              >
                {selectedTemplateId === template.id ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Selected
                  </>
                ) : (
                  "Select Template"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
