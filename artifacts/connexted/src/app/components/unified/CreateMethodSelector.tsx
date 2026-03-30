import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus, Copy, LayoutTemplate } from 'lucide-react';

interface CreateMethodSelectorProps {
  method: 'scratch' | 'template' | 'duplicate' | null;
  onSelect: (method: 'scratch' | 'template' | 'duplicate') => void;
}

export function CreateMethodSelector({ method, onSelect }: CreateMethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card 
        className={`cursor-pointer transition-all hover:border-primary ${method === 'scratch' ? 'border-primary ring-2 ring-primary/20' : ''}`}
        onClick={() => onSelect('scratch')}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Start from Scratch</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new empty playlist and add items manually
            </p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-all hover:border-primary ${method === 'template' ? 'border-primary ring-2 ring-primary/20' : ''}`}
        onClick={() => onSelect('template')}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Use a Template</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start with a pre-configured structure
            </p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-all hover:border-primary ${method === 'duplicate' ? 'border-primary ring-2 ring-primary/20' : ''}`}
        onClick={() => onSelect('duplicate')}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Duplicate Existing</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Copy content from one of your existing playlists
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
