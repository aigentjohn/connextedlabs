import { Eye, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

interface ViewCountBadgeProps {
  viewCount?: number;
  uniqueViewers?: number;
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
}

export function ViewCountBadge({ 
  viewCount = 0, 
  uniqueViewers, 
  showIcon = true,
  variant = 'secondary' 
}: ViewCountBadgeProps) {
  if (viewCount === 0) return null;

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {showIcon && <Eye className="w-3 h-3" />}
      {viewCount.toLocaleString()} {viewCount === 1 ? 'view' : 'views'}
      {uniqueViewers !== undefined && uniqueViewers > 0 && (
        <>
          <span className="mx-1">•</span>
          <Users className="w-3 h-3" />
          {uniqueViewers}
        </>
      )}
    </Badge>
  );
}

interface TrendingBadgeProps {
  viewsLast7Days?: number;
  viewsLast30Days?: number;
}

export function TrendingBadge({ 
  viewsLast7Days = 0, 
  viewsLast30Days = 0 
}: TrendingBadgeProps) {
  // Trending if >30% of views in last week
  const isTrending = viewsLast30Days > 0 && (viewsLast7Days / viewsLast30Days) > 0.3;
  
  if (!isTrending) return null;
  
  return (
    <Badge className="flex items-center gap-1 bg-orange-500 text-white border-orange-600">
      <TrendingUp className="w-3 h-3" />
      Trending
    </Badge>
  );
}

interface UniqueViewersBadgeProps {
  uniqueViewers?: number;
  showIcon?: boolean;
}

export function UniqueViewersBadge({ 
  uniqueViewers = 0,
  showIcon = true 
}: UniqueViewersBadgeProps) {
  if (uniqueViewers === 0) return null;

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      {showIcon && <Users className="w-3 h-3" />}
      {uniqueViewers} {uniqueViewers === 1 ? 'viewer' : 'viewers'}
    </Badge>
  );
}
