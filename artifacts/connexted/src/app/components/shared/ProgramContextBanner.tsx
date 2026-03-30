import { Link } from 'react-router';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, FolderKanban, X } from 'lucide-react';
import { ProgramContext } from '@/hooks/useProgramContext';

interface ProgramContextBannerProps {
  context?: ProgramContext | null;
  onClear?: () => void;
}

export function ProgramContextBanner({ context, onClear }: ProgramContextBannerProps) {
  // Don't render if no context is provided
  if (!context) {
    return null;
  }

  return (
    <Alert className="bg-blue-50 border-blue-200">
      <FolderKanban className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-blue-900">
            Creating as part of:
          </span>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            {context.program_name}
          </Badge>
          <span className="text-blue-700">→</span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {context.journey_title}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-700 hover:text-blue-900"
            onClick={onClear}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}