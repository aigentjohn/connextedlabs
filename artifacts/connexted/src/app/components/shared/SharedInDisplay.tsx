import { Badge } from '@/app/components/ui/badge';
import { Share2, Users } from 'lucide-react';
import { Link } from 'react-router';

interface ShareLocation {
  containerType: 'circle' | 'program' | 'meetup' | 'table';
  containerId: string;
  containerName: string;
  containerSlug: string;
  sharesCount: number;
  lastSharedAt: string;
}

interface SharedInDisplayProps {
  contentType: string;
  contentId: string;
  shareLocations: ShareLocation[];
}

export function SharedInDisplay({
  contentType,
  contentId,
  shareLocations,
}: SharedInDisplayProps) {
  if (!shareLocations || shareLocations.length === 0) {
    return null;
  }

  // Group by container type
  const circles = shareLocations.filter(s => s.containerType === 'circle');
  const programs = shareLocations.filter(s => s.containerType === 'program');
  const meetups = shareLocations.filter(s => s.containerType === 'meetup');
  const tables = shareLocations.filter(s => s.containerType === 'table');

  const totalShares = shareLocations.reduce((sum, s) => sum + s.sharesCount, 0);

  return (
    <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
      <div className="flex items-center gap-2">
        <Share2 className="w-4 h-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">
          Shared in {shareLocations.length} {shareLocations.length === 1 ? 'place' : 'places'}
          <span className="text-muted-foreground font-normal ml-1">
            ({totalShares} {totalShares === 1 ? 'share' : 'shares'} total)
          </span>
        </h4>
      </div>

      {/* Circles */}
      {circles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Circles
          </p>
          <div className="flex flex-wrap gap-2">
            {circles.map((location) => (
              <Link
                key={location.containerId}
                to={`/circles/${location.containerSlug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors"
              >
                <Users className="w-3 h-3" />
                <span>{location.containerName}</span>
                {location.sharesCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({location.sharesCount})
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Programs */}
      {programs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Programs
          </p>
          <div className="flex flex-wrap gap-2">
            {programs.map((location) => (
              <Link
                key={location.containerId}
                to={`/programs/${location.containerSlug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors"
              >
                <span>{location.containerName}</span>
                {location.sharesCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({location.sharesCount})
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Meetups */}
      {meetups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Meetups
          </p>
          <div className="flex flex-wrap gap-2">
            {meetups.map((location) => (
              <Link
                key={location.containerId}
                to={`/meetups/${location.containerSlug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors"
              >
                <span>{location.containerName}</span>
                {location.sharesCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({location.sharesCount})
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      {tables.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tables
          </p>
          <div className="flex flex-wrap gap-2">
            {tables.map((location) => (
              <Link
                key={location.containerId}
                to={`/tables/${location.containerSlug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-accent rounded-md text-sm transition-colors"
              >
                <span>{location.containerName}</span>
                {location.sharesCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({location.sharesCount})
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}