import { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import CompletionCheckbox from './CompletionCheckbox';
import { cn } from '@/app/components/ui/utils';
import {
  FileText,
  Video,
  Link as LinkIcon,
  MessageCircle,
  Calendar,
  Table as TableIcon,
  ArrowUpCircle,
  Users,
  Zap,
  ExternalLink,
  Eye,
  BookOpen,
  Presentation,
  Library,
  Box,
  Mic,
  Coffee,
  Target,
} from 'lucide-react';

export interface JourneyCardProps {
  itemId: string;
  journeyId: string;
  itemType: 'document' | 'book' | 'deck' | 'shelf' | 'table' | 'elevator' | 'pitch' | 'build' | 'standup' | 'meetup' | 'sprint' | 'event' | 'discussion' | 'resource' | 'container';
  title: string;
  description?: string;
  icon?: ReactNode;
  metadata?: string | string[];
  isCompleted: boolean;
  orderIndex?: number;
  onToggleCompletion: (itemId: string, journeyId: string, completed: boolean) => Promise<void>;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  showOrderIndex?: boolean;
}

// Get default icon based on item type
export const getDefaultIcon = (itemType: string, containerType?: string) => {
  switch (itemType) {
    // Content types
    case 'document':
      return <FileText className="w-5 h-5 text-blue-600" />;
    case 'book':
      return <BookOpen className="w-5 h-5 text-amber-600" />;
    case 'deck':
      return <Presentation className="w-5 h-5 text-purple-600" />;
    case 'shelf':
      return <Library className="w-5 h-5 text-indigo-600" />;
    
    // Container types
    case 'table':
      return <TableIcon className="w-5 h-5 text-indigo-600" />;
    case 'elevator':
      return <ArrowUpCircle className="w-5 h-5 text-pink-600" />;
    case 'pitch':
      return <Mic className="w-5 h-5 text-rose-600" />;
    case 'build':
      return <Box className="w-5 h-5 text-cyan-600" />;
    case 'standup':
      return <Users className="w-5 h-5 text-teal-600" />;
    case 'meetup':
      return <Coffee className="w-5 h-5 text-emerald-600" />;
    case 'sprint':
      return <Target className="w-5 h-5 text-orange-600" />;
    
    // Other types
    case 'event':
      return <Calendar className="w-5 h-5 text-green-600" />;
    case 'discussion':
      return <MessageCircle className="w-5 h-5 text-orange-600" />;
    case 'resource':
      return <LinkIcon className="w-5 h-5 text-purple-600" />;
    
    // Legacy container type
    case 'container':
      if (containerType === 'table') return <TableIcon className="w-5 h-5 text-indigo-600" />;
      if (containerType === 'elevator') return <ArrowUpCircle className="w-5 h-5 text-pink-600" />;
      if (containerType === 'standup') return <Users className="w-5 h-5 text-teal-600" />;
      if (containerType === 'meetup') return <Users className="w-5 h-5 text-emerald-600" />;
      return <Zap className="w-5 h-5 text-yellow-600" />;
    
    default:
      return <FileText className="w-5 h-5 text-gray-600" />;
  }
};

export default function JourneyCard({
  itemId,
  journeyId,
  itemType,
  title,
  description,
  icon,
  metadata,
  isCompleted,
  orderIndex,
  onToggleCompletion,
  primaryAction,
  secondaryAction,
  showOrderIndex = false,
}: JourneyCardProps) {
  const displayIcon = icon || getDefaultIcon(itemType);

  return (
    <Card className={cn(
      'hover:shadow-lg transition-all duration-200 relative',
      isCompleted && 'ring-2 ring-green-200'
    )}>
      {/* Order Index Badge (Admin View) */}
      {showOrderIndex && orderIndex !== undefined && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="outline" className="text-xs bg-white">
            #{orderIndex + 1}
          </Badge>
        </div>
      )}

      <CardContent className="p-5">
        {/* Header with Icon and Completion */}
        <div className="flex items-start gap-3 mb-3">
          {/* Icon */}
          <div className={cn(
            'flex-shrink-0 p-2.5 rounded-lg',
            isCompleted ? 'bg-green-50' : 'bg-gray-50'
          )}>
            {displayIcon}
          </div>

          {/* Completion Checkbox */}
          <div className="ml-auto flex-shrink-0">
            <CompletionCheckbox
              itemId={itemId}
              journeyId={journeyId}
              isCompleted={isCompleted}
              onToggle={onToggleCompletion}
              size="md"
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3 min-h-[2.5rem]">
            {description}
          </p>
        )}

        {/* Metadata */}
        {metadata && (
          <div className="flex flex-wrap gap-2 mb-3 min-h-[1.5rem]">
            {Array.isArray(metadata) ? (
              metadata.map((item, idx) => (
                <span key={idx} className="text-xs text-gray-500">
                  {item}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">{metadata}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {primaryAction && (
            primaryAction.href ? (
              <Link to={primaryAction.href} className="flex-1">
                <Button
                  variant={primaryAction.variant || 'default'}
                  size="sm"
                  className="w-full"
                >
                  {primaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={primaryAction.variant || 'default'}
                size="sm"
                className="flex-1"
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link to={secondaryAction.href}>
                <Button variant="outline" size="sm">
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}